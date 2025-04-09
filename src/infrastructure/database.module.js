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

    if (!this._databaseModule?.enabled) {
      this._console.info('Module disabled', { namespace: this._namespace });
      return;
    }

    if (!this._databaseModule?.default) {
      this._console.error('No module default', { namespace: this._namespace });
      return;
    }

    if (!this._databaseModule?.provider) {
      this._dependencies.console?.error?.('No module provider specified', { namespace: this._namespace });
      return;
    }

    this.#loadAdapters();
    this.#getAdapterSettings();

    await this.#setupSelectedDataSource();

    this._console.success('Module Loaded', { namespace: this._namespace });
  }

  #loadAdapters() {
    try {
      this._moduleAdapters = require(`${this._dependencies.root}/src/adapters/data-sources/index`);
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  #getAdapterSettings() {
    try {
      this._adapterName = this._databaseModule?.default || '';
      this._adapterSettings = this._moduleAdapters.find(
        (dataSource) => dataSource.name === this._adapterName,
      );

      this._console.success(`Adapter: ${this._adapterName}`, { namespace: this._namespace });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  async #setupSelectedDataSource() {
    try {
      const DataSource = require(
        `${this._dependencies.root}/src/data-sources/${this._adapterSettings.path}`,
      );

      this._db.driver = this._dependencies[this._adapterSettings.customDependencyName];

      // Add current datasource as db to dependency injection
      this._dependencyInjector.core.add(this._db, 'db');

      this._db.transaction = new DataSource(this._dependencies);

      await this._db.transaction.setup();

      this._console.success('Database manager loaded', { namespace: this._namespace });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  get dataSource() {
    return this._db;
  }
}

module.exports = { DatabaseModule };
