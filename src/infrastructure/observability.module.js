class ObservabilityModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._module = this._modules?.observability || {};
    this._adapterName = '';
    this._adapter = {};
    this._adapterInstance = {};
    this._defaultClient = {};

    /* Assigments */
    this._namespace = '[Loom]::[Infrastructure]::[Module]::[Observability]';
  }

  async setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    if (!this._module?.settings?.enabled) {
      this._console.info('Module disabled', { namespace: this._namespace });
      return;
    }

    if (!this._module?.settings?.default) {
      this._console.error('No module default', { namespace: this._namespace });
      return;
    }

    if (!this._module?.providers) {
      this._dependencies.console?.error?.('No module provider specified', { namespace: this._namespace });
      return;
    }

    await this.#setupDefaultAdapter();

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  async #setupDefaultAdapter() {
    this._adapterName = this._module?.settings?.default || '';
    this._adapter = this._module?.providers[this._adapterName] || {};

    this._console.success(`Default adapter: ${this._adapterName}`, { namespace: this._namespace });

    this._defaultAdapter = await this.loadAdapter({
      adapterName: this._adapterName,
      adapter: this._adapter,
    });
  }

  async loadAdapter({ adapterName, adapter }) {
    try {
      if (!this._adapter) {
        this._console?.error?.('No observability adapter specified', { namespace: this._namespace });
        return;
      }

      const AdapterClass = require(`${this._dependencies.root}/src/adapters/observability/${adapterName}/${adapterName}.adapter`);
      this._adapterInstance = new AdapterClass(this._dependencies);

      const driver = await this._adapterInstance.setup({ adapter });

      return driver;
    } catch (error) {
      this._console?.error?.(`Failed to load observability adapter "${adapterName}"`, { namespace: this._namespace });
      console.error(error);
    }
  }

  get client() {
    return this._defaultAdapter || {};
  }

  get api() {
    return {
      default: {
        name: this._adapterName,
        client: this._defaultAdapter,
        settings: this._adapter,
        adapter: this._adapterInstance,
      },
      client: this.client,
      loadAdapter: this.loadAdapter
    }
  }
}

module.exports = { ObservabilityModule };
