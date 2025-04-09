class PushModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._pushModule = this._modules?.push || {};

    /* Assigments */
    this._namespace = '[Loom]::[Push]::[Module]';
    this._push = {};
  }

  async setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    if (!this._pushModule?.enabled) {
      this._console.info('Module disabled', { namespace: this._namespace });
      return;
    }

    if (!this._pushModule?.default) {
      this._console.error('No module default', { namespace: this._namespace });
      return;
    }

    if (!this._pushModule?.provider) {
      this._dependencies.console?.error?.('No module provider specified', { namespace: this._namespace });
      return;
    }

    this.#loadAdapters();
    this.#getAdapterSettings();
    switch (this._pushModule?.default) {
      case 'firebase':
        await this.firebaseConfig();
        break;
      default:
        break;
    }

    this._console.success('Module Loaded', { namespace: this._namespace });
  }

  #loadAdapters() {
    try {
      this._moduleAdapters = require(`${this._dependencies.root}/src/adapters/push-notification/index`);
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  #getAdapterSettings() {
    try {
      this._adapterName = this._storageModule?.default || '';
      this._adapterSettings = this._moduleAdapters.find(
        (dataSource) => dataSource.name === this._adapterName,
      );

      this._console.success(`Adapter: ${this._adapterName}`,{ namespace: this._namespace });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  async firebaseConfig() {
    try {
      this._push = this._dependencies.firebase.messaging();
    } catch (error) {
      console.log(error);
    }
  }

  get push() {
    return this._push;
  }
}

module.exports = { PushModule };
