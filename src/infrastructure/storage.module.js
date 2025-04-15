class StorageModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._storageModule = this._modules?.storage || {};
    this._moduleAdapters = [];
    this._adapterName = '';
    this._adapterSettings = {};

    /* Assigments */
    this._namespace = '[Loom]::[Storage]::[Module]';
    this._storage = {};
    this._stg = {
      operation: {},
      driver: {},
    };
  }

  async setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    if (!this._storageModule?.settings?.enabled) {
      this._console.info('Module disabled', { namespace: this._namespace });
      return;
    }

    if (!this._storageModule?.settings?.default) {
      this._console.error('No module default', { namespace: this._namespace });
      return;
    }

    if (!this._storageModule?.providers) {
      this._dependencies.console?.error?.('No module provider specified', { namespace: this._namespace });
      return;
    }

    this.#loadAdapters();
    this.#getAdapterSettings();
    this.#setupSelectedStorageSource();

    this._console.success('Storage module loaded', { namespace: this._namespace });
  }

  #loadAdapters() {
    try {
      this._moduleAdapters = require(`${this._dependencies.root}/src/adapters/storage-source/index`);
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  #getAdapterSettings() {
    try {
      this._adapterName = this._storageModule?.settings?.default || '';
      this._adapterSettings = this._moduleAdapters.find(
        (dataSource) => dataSource.name === this._adapterName,
      );

      this._console.success(`Adapter: ${this._adapterName}`,{ namespace: this._namespace });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  #setupSelectedStorageSource() {
    try {
      const DataSource = require(
        `${this._dependencies.root}/src/storage-source/${this._adapterSettings.path}`,
      );

      this._stg.driver =
        this._dependencies[
        this._adapterSettings.customDependencyName
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
