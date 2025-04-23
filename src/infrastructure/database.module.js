class DatabaseModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._module = this._modules?.database || {};
    this._adapterName = '';
    this._adapter = {};
    this._adapterInstance = {};
    this._defaultClient = {};

    /* Assigments */
    this._namespace = '[Loom]::[Infrastructure]::[Module]::[Database]';
    this._db = {
      transaction: {},
      driver: {},
      client: {},
    };
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
    try {
      this._adapterName = this._module?.settings?.default || '';
      this._adapter = this._module?.providers[this._adapterName] || {};

      this._console.success(`Default adapter: ${this._adapterName}`, { namespace: this._namespace });

      this._defaultClient = await this.loadAdapter({
        adapterName: this._adapterName,
        adapter: this._adapter,
      });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  async loadAdapter({ adapterName, adapter }) {
    try {
      const AdapterClass = require(`${this._dependencies.root}/src/adapters/database/${adapterName}/${adapterName}.adapter`);
      this._adapterInstance = new AdapterClass(this._dependencies);

      const driver = await this._adapterInstance.setup({ adapter });

      return driver;
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  get client() {
    return this._defaultClient || {};
  }

  get api() {
    return {
      default: {
        name: this._adapterName,
        client: this._defaultClient,
        settings: this._adapter,
        adapter: this._adapterInstance,
      },
      client: this.client,
      loadAdapter: this.loadAdapter
    }
  }

  get dataSource() {
    return this._db;
  }
}

module.exports = { DatabaseModule };
