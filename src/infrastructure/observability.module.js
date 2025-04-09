class ObservabilityModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._observabilityModule = this._modules?.observability || {};
    this._defaultAdapter = null;

    /* Assigments */
    this._namespace = '[Loom]::[Observability]::[Module]';
  }

  async setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    if (!this._observabilityModule?.enabled) {
      this._console.info('Module disabled', { namespace: this._namespace });
      return;
    }

    if (!this._observabilityModule?.default) {
      this._console.error('No module default', { namespace: this._namespace });
      return;
    }

    if (!this._observabilityModule?.providers) {
      this._dependencies.console?.error?.('No module provider specified', { namespace: this._namespace });
      return;
    }

    this.#loadAdapters();
    await this.#setupDefaultAdapter();

    this._console.success('Module Loaded', { namespace: this._namespace });
  }

  #loadAdapters() {
    try {
      this._moduleAdapters = require(`${this._dependencies.root}/src/adapters/observability/index`);
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  async #setupDefaultAdapter() {
    this._adapterName = this._observabilityModule?.default || '';
    this._adapterSettings = this._moduleAdapters[this._adapterName]?.settings || {};

    this._console.success(`Default adapter: ${this._adapterName}`, { namespace: this._namespace });

    this._defaultAdapter = await this.loadAdapter({
      adapterName: this._adapterName,
      settings: this._adapterSettings,
    });
  }

  async loadAdapter({ adapterName, settings }) {
    try {
      if (!this._adapterSettings) {
        this._console?.error?.('No observability settings specified', { namespace: this._namespace });
        return;
      }

      const AdapterClass = require(`${this._dependencies.root}/src/adapters/observability/${adapterName}/${adapterName}.adapter`);
      const adapterInstance = new AdapterClass(this._dependencies);

      const driver = await adapterInstance.setup?.({ settings });

      this._console?.success('Observability module loaded', { namespace: this._namespace });

      return driver;
    } catch (error) {
      this._console?.error?.(`Failed to load observability adapter "${adapterName}"`, { namespace: this._namespace });
      console.error(error);
    }
  }

  get client() {
    return this._defaultAdapter || {};
  }
}

module.exports = { ObservabilityModule };
