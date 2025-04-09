class StorageModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this._storageSources = [];
    this._currentStorageSourceName = '';
    this._currentStorageSourceConfig = {};

    /* Assigments */
    this._namespace = '[Loom]::[Storage]::[Module]';
    this._storage = {};
    this._stg = {
      operation: {},
      driver: {},
    };
  }

  async setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this.#loadStorageSources();

    if (!this._dependencies?.config?.behaviors?.storage?.enabled) {
      this._console.info('No storage behavior enabled', { namespace: this._namespace });
      return;
    }

    if (!this._dependencies?.config?.behaviors?.storage?.default) {
      this._console.error('No storage settings specified', { namespace: this._namespace });
      return;
    }

    this.#getCurrentStorageSource();
    this.#setupSelectedStorageSource();

    this._console.success('Storage behavior loaded', { namespace: this._namespace });
  }

  #loadStorageSources() {
    try {
      this._storageSources = require(
        `${this._dependencies.root}/src/storage-source/index`,
      );
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  #getCurrentStorageSource() {
    try {
      this._currentStorageSourceName =
        this._dependencies?.config?.behaviors?.storage?.default || '';
      this._currentStorageSourceConfig = this._storageSources.find(
        (dataSource) => dataSource.name === this._currentStorageSourceName,
      );

      this._console.success(
        `Current Storage Source: ${this._currentStorageSourceName}`,
        { namespace: this._namespace },
      );
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  #setupSelectedStorageSource() {
    try {
      const DataSource = require(
        `${this._dependencies.root}/src/storage-source/${this._currentStorageSourceConfig.path}`,
      );

      this._stg.driver =
        this._dependencies[
        this._currentStorageSourceConfig.customDependencyName
        ];

      this._dependencyInjector.core.add(this._stg, 'storage');

      this._stg.operation = new DataSource(this._dependencies);

      this._stg.operation.setup();

      this._console.success('Storage manager loaded', {
        namespace: this._namespace,
      });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  get storage() {
    return this._stg;
  }
}

module.exports = { StorageModule };
