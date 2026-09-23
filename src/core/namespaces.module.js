const fs = require('fs');

/**
 * Namespaces: optional modules inside one Link Loom service, each one with its
 * own routes, services, models and, when it declares them, functions, workers,
 * streams and events.
 *
 * - The default namespace is the service's own `src/` tree and is never touched
 *   by this module.
 * - Extra namespaces are declared explicitly in `src/namespaces/index.js`;
 *   nothing is discovered automatically.
 * - Each namespace receives its own dependencies object: a Proxy that returns
 *   the namespace's own pieces and falls back to the global dependencies for
 *   everything else (express, server, database provider, utilities, storage…).
 * - A namespace that fails to load is disabled and logged; the service keeps
 *   booting with the rest.
 *
 * Registry entry: `{ name, root, prefix? }`
 * - name:   unique namespace name.
 * - root:   folder of the namespace, relative to `src/`.
 * - prefix: URL prefix chosen by the developer ('' mounts at '/'). Defaults to `/<name>`.
 *
 * Per-environment overrides: `config.namespaces.<name> = { enabled?, prefix? }`.
 */
class NamespacesModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this._path = dependencies.path;
    this._config = dependencies.config;

    /* Assigments */
    this._namespace = '[Loom]::[Core]::[Namespaces]';
    this._namespaces = [];
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    const definitions = this.#readRegistry();

    for (const definition of definitions) {
      this.#loadNamespace(definition);
    }

    this._console.success(
      `Module loaded (${this._namespaces.length} namespace(s))`,
      { namespace: this._namespace },
    );
  }

  /**
   * Event producers and consumers need the socket broker, which boots after the
   * API. Loom calls this once the global event modules are ready.
   */
  setupEvents() {
    for (const namespaceContext of this._namespaces) {
      this.#loadNamespaceEvents(namespaceContext);
    }
  }

  get namespaces() {
    return this._namespaces;
  }

  get(name) {
    return (
      this._namespaces.find(
        (namespaceContext) => namespaceContext.name === name,
      ) || null
    );
  }

  #readRegistry() {
    const registryPath = this._path.join(
      this._dependencies.root,
      'src',
      'namespaces',
      'index.js',
    );

    if (!fs.existsSync(registryPath)) {
      this._console.info('No namespaces registry found (optional)', {
        namespace: this._namespace,
      });
      return [];
    }

    const registry = require(registryPath);

    if (!Array.isArray(registry)) {
      this._console.error(
        'src/namespaces/index.js must export an array of namespaces',
        {
          namespace: this._namespace,
        },
      );
      return [];
    }

    const seenNames = new Set();

    return registry.filter((definition) => {
      if (!definition?.name || !definition?.root) {
        this._console.error(
          `Invalid namespace definition: ${JSON.stringify(definition)}`,
          {
            namespace: this._namespace,
          },
        );
        return false;
      }

      if (seenNames.has(definition.name)) {
        this._console.error(`Duplicated namespace name: ${definition.name}`, {
          namespace: this._namespace,
        });
        return false;
      }

      seenNames.add(definition.name);
      return true;
    });
  }

  #loadNamespace(definition) {
    const overrides = this._config?.namespaces?.[definition.name] || {};

    if (overrides.enabled === false) {
      this._console.info(
        `Namespace disabled by configuration: ${definition.name}`,
        {
          namespace: this._namespace,
        },
      );
      return;
    }

    const namespaceTag = `[Namespace]::[${definition.name}]`;

    try {
      const sourceRoot = this._path.resolve(
        this._path.join(this._dependencies.root, 'src', definition.root),
      );

      if (!fs.existsSync(sourceRoot)) {
        throw new Error(`Folder not found: ${sourceRoot}`);
      }

      const localDependencies = {
        namespace: {
          name: definition.name,
          prefix: this.#normalizePrefix(
            overrides.prefix ?? definition.prefix ?? `/${definition.name}`,
          ),
          sourceRoot,
          config: overrides,
        },
        console: this.#createScopedConsole(namespaceTag),
        DataTypesModule: this._dependencies.DataTypesModule.createScope({
          namespace: namespaceTag,
        }),
        functions: null,
        FunctionsModule: null,
        WorkersModule: null,
        streams: {},
        StreamModule: null,
      };

      const namespaceDependencies =
        this.#createScopedDependencies(localDependencies);

      this.#loadModels({ namespaceDependencies, localDependencies });
      this.#loadServices({ namespaceDependencies, localDependencies });
      this.#loadStreams({
        namespaceDependencies,
        localDependencies,
        sourceRoot,
      });
      this.#loadFunctions({
        namespaceDependencies,
        localDependencies,
        sourceRoot,
      });
      this.#loadWorkers({
        namespaceDependencies,
        localDependencies,
        sourceRoot,
      });

      this._namespaces.push({
        name: definition.name,
        prefix: localDependencies.namespace.prefix,
        sourceRoot,
        dependencies: namespaceDependencies,
      });

      this._console.success(
        `Namespace loaded: ${definition.name} → ${localDependencies.namespace.prefix || '/'}`,
        {
          namespace: this._namespace,
        },
      );
    } catch (error) {
      this._console.error(
        `Namespace disabled because it failed to load: ${definition.name} — ${error?.message}`,
        {
          namespace: this._namespace,
        },
      );
    }
  }

  #loadModels({ namespaceDependencies, localDependencies }) {
    const { ModelModule } = require('../adapters/http/model.module');
    const modelModule = new ModelModule(namespaceDependencies);
    modelModule.setup();

    localDependencies.ModelsModule = modelModule;
    localDependencies.models = modelModule.models;
  }

  #loadServices({ namespaceDependencies, localDependencies }) {
    const { ServiceModule } = require('../adapters/http/service.module');
    const serviceModule = new ServiceModule(namespaceDependencies);
    serviceModule.setup();

    localDependencies.ServiceModule = serviceModule;
    localDependencies.services = serviceModule.services;
  }

  #loadStreams({ namespaceDependencies, localDependencies, sourceRoot }) {
    if (!this.#hasIndex(sourceRoot, 'streams')) {
      return;
    }

    const { StreamModule } = require('../adapters/streams/stream.module');
    const streamModule = new StreamModule(namespaceDependencies);
    streamModule.setup();

    localDependencies.StreamModule = streamModule;
    localDependencies.streams = streamModule.streams;
  }

  #loadFunctions({ namespaceDependencies, localDependencies, sourceRoot }) {
    if (!this.#hasIndex(sourceRoot, 'functions')) {
      return;
    }

    const {
      FunctionsModule,
    } = require('../adapters/functions/functions.module');
    const functionsModule = new FunctionsModule(namespaceDependencies);

    localDependencies.FunctionsModule = functionsModule;
    localDependencies.functions = functionsModule;
  }

  #loadWorkers({ namespaceDependencies, localDependencies, sourceRoot }) {
    if (!this.#hasIndex(sourceRoot, 'workers')) {
      return;
    }

    const { WorkersModule } = require('../adapters/workers/workers.module');
    const workersModule = new WorkersModule(namespaceDependencies);
    workersModule.setup();

    localDependencies.WorkersModule = workersModule;
  }

  #loadNamespaceEvents(namespaceContext) {
    if (!this.#hasIndex(namespaceContext.sourceRoot, 'events')) {
      return;
    }

    try {
      const {
        EventProducerModule,
      } = require('../adapters/events/producer.module');
      const {
        EventConsumerModule,
      } = require('../adapters/events/consumer.module');

      new EventProducerModule(namespaceContext.dependencies).setup();
      new EventConsumerModule(namespaceContext.dependencies).setup();
    } catch (error) {
      this._console.error(
        `Events failed for namespace ${namespaceContext.name} — ${error?.message}`,
        {
          namespace: this._namespace,
        },
      );
    }
  }

  #hasIndex(sourceRoot, folder) {
    return fs.existsSync(this._path.join(sourceRoot, folder, 'index.js'));
  }

  #normalizePrefix(prefix) {
    const trimmed = `${prefix || ''}`.trim().replace(/\/+$/, '');

    if (!trimmed) {
      return '';
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  /**
   * Returns the namespace's own dependency when it has one, and the global one
   * otherwise. Writes stay in the namespace. Spreading the proxy (as workers
   * do) keeps the namespace's own values.
   */
  #createScopedDependencies(localDependencies) {
    const globalDependencies = this._dependencies;
    const hasLocal = (property) =>
      Object.prototype.hasOwnProperty.call(localDependencies, property);

    return new Proxy(globalDependencies, {
      get: (target, property) =>
        hasLocal(property) ? localDependencies[property] : target[property],
      set: (_target, property, value) => {
        localDependencies[property] = value;
        return true;
      },
      has: (target, property) => hasLocal(property) || property in target,
      ownKeys: (target) => [
        ...new Set([
          ...Reflect.ownKeys(target),
          ...Reflect.ownKeys(localDependencies),
        ]),
      ],
      getOwnPropertyDescriptor: (target, property) => {
        if (hasLocal(property)) {
          return {
            value: localDependencies[property],
            writable: true,
            enumerable: true,
            configurable: true,
          };
        }

        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
  }

  /**
   * Same interface as the global console, with the namespace tag prepended to
   * every message's namespace or title.
   */
  #createScopedConsole(namespaceTag) {
    const baseConsole = this._console;
    const methods = ['code', 'log', 'error', 'info', 'warning', 'success'];
    const scopedConsole = {};

    for (const method of methods) {
      scopedConsole[method] = (body, args) => {
        const options = args && typeof args === 'object' ? args : {};
        const scopedOptions = { ...options };

        if (options.title) {
          scopedOptions.title = `${namespaceTag}::${options.title}`;
        } else {
          scopedOptions.namespace = options.namespace
            ? `${namespaceTag}::${options.namespace}`
            : namespaceTag;
        }

        return baseConsole[method](body, scopedOptions);
      };
    }

    return scopedConsole;
  }
}

module.exports = { NamespacesModule };
