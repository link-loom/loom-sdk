class StreamModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._path = dependencies.path;

    /* Assigments */
    this._namespace = '[Loom]::[Adapter]::[Streams]';
    this._instances = {};
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    this.#loadAndInstantiate();

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  #loadAndInstantiate() {
    let manifest;

    try {
      manifest = require(
        this._path.join(this._dependencies.root, 'src', 'streams', 'index'),
      );
    } catch {
      // No streams directory — module is a no-op
      return;
    }

    const entries = Object.entries(manifest);

    for (const [name, StreamClass] of entries) {
      try {
        this._instances[name] = new StreamClass(this._dependencies);

        this._console.info(`Stream loaded: ${name}`, {
          namespace: this._namespace,
        });
      } catch (error) {
        this._console.error(
          `Stream failed: ${name} — ${error.message}`,
          { namespace: this._namespace },
        );
      }
    }
  }

  /** Get all stream instances */
  get streams() {
    return this._instances;
  }

  /** Get a specific stream instance by name */
  stream(name) {
    return this._instances[name] || null;
  }
}

module.exports = { StreamModule };
