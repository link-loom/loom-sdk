class DatabaseModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this._datasources = [];
    this._currentDataSourceName = '';
    this._currentDataSourceConfig = {};

    /* Assigments */
    this._namespace = '[Server]::[Database]::[Module]';
    this._db = {
      transaction: {},
      driver: {},
      client: {},
    };
  }

  async setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this.#loadDataSources();

    if (!this._dependencies?.config?.behaviors?.database?.enabled) {
      this._console.info('Database is disabled', {
        namespace: this._namespace,
      });
      return;
    }

    this.#getCurrentDataSource();
    await this.#setupSelectedDataSource();

    this._console.success('Loaded', { namespace: this._namespace });
  }

  #loadDataSources() {
    try {
      this._datasources = require(
        `${this._dependencies.root}/src/data-sources/index`,
      );
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  #getCurrentDataSource() {
    try {
      this._currentDataSourceName =
        this._dependencies?.config?.behaviors?.database?.default || '';
      this._currentDataSourceConfig = this._datasources.find(
        (dataSource) => dataSource.name === this._currentDataSourceName,
      );

      this._console.success(
        `Current Data Source: ${this._currentDataSourceName}`,
        { namespace: this._namespace },
      );
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  async #setupSelectedDataSource() {
    try {
      const DataSource = require(
        `${this._dependencies.root}/src/data-sources/${this._currentDataSourceConfig.path}`,
      );

      this._db.driver =
        this._dependencies[this._currentDataSourceConfig.customDependencyName];

      // Add current datasource as db to dependency injection
      this._dependencyInjector.core.add(this._db, 'db');

      this._db.transaction = new DataSource(this._dependencies);

      await this._db.transaction.setup();

      this._console.success('Database manager loaded', {
        namespace: this._namespace,
      });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  get dataSource() {
    return this._db;
  }
}

module.exports = { DatabaseModule };
