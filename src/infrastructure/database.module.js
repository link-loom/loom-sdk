class DatabaseModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._databaseModule = this._modules?.database || {};
    this._moduleAdapters = [];
    this._adapterName = '';
    this._adapterSettings = {};

    /* Assigments */
    this._namespace = '[Loom]::[Database]::[Module]';
    this._db = {
      transaction: {},
      driver: {},
      client: {},
    };
  }

  async setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    if (!this._databaseModule?.settings?.enabled) {
      this._console.info('Module disabled', { namespace: this._namespace });
      return;
    }

    if (!this._databaseModule?.settings?.default) {
      this._console.error('No module default', { namespace: this._namespace });
      return;
    }

    if (!this._databaseModule?.providers) {
      this._dependencies.console?.error?.('No module provider specified', { namespace: this._namespace });
      return;
    }

    this.#loadAdapters();
    await this.#setupDefaultAdapter();

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  #loadAdapters() {
    try {
      this._moduleAdapters = require(`${this._dependencies.root}/src/adapters/database/index`);
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  async #setupDefaultAdapter() {
    try {
      const module = this._databaseModule || {};
      this._adapterName = module?.settings?.default || '';
      this._adapterSettings = this._moduleAdapters[this._adapterName]?.settings || {};

      this._console.success(`Default adapter: ${this._adapterName}`, { namespace: this._namespace });

      this._defaultAdapter = await this.loadAdapter({
        adapterName: this._adapterName,
        settings: this._adapterSettings,
      });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  async loadAdapter({ adapterName, settings }) {
    try {
      const AdapterClass = require(`${this._dependencies.root}/src/adapters/data-sources/${adapterName}/${adapterName}.adapter`);
      this._db.transaction = new AdapterClass(this._dependencies);

      const driver = await this._db.transaction.setup({ settings });

      return driver;
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
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
        settings: this._adapterSettings,
      },
      client,
      loadAdapter: this.loadAdapter
    }
  }

  get dataSource() {
    return this._db;
  }
}

module.exports = { DatabaseModule };
