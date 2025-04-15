class PushModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._module = this._modules?.push || {};

    /* Assigments */
    this._namespace = '[Loom]::[Infrastructure]::[Module]::[Push]';
    this._push = {};
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

    this.#getAdapterSettings();
    switch (this._module?.default) {
      case 'firebase':
        await this.firebaseConfig();
        break;
      default:
        break;
    }

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  #getAdapterSettings() {
    try {
      this._adapterName = this._storageModule?.default || '';
      this._adapterSettings = this._moduleAdapters.find(
        (dataSource) => dataSource.name === this._adapterName,
      );

      this._console.success(`Adapter: ${this._adapterName}`, { namespace: this._namespace });
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
