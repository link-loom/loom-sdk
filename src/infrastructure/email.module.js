class EmailModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._module = this._modules?.email || {};
    this._adapterName = '';
    this._adapterSettings = {};
    this._adapterInstance = {};
    this._defaultClient = {};

    /* Assigments */
    this._namespace = '[Loom]::[Email]::[Behavior]';
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

    this.#loadAdapters();
    await this.#setupDefaultAdapter();

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  #loadAdapters() {
    try {
      this._moduleAdapters = require(`${this._dependencies.root}/src/adapters/email/index`);
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });
    }
  }

  async #setupDefaultAdapter() {
    try {
      this._adapterName = this._module?.settings?.default || '';
      this._adapterSettings = this._module?.providers[this._adapterName] || {};

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
      if (!this._adapterSettings) {
        this._console?.error?.('No email settings specified', { namespace: this._namespace });
        return;
      }

      const AdapterClass = require(`${this._dependencies.root}/src/adapters/email/${adapterName}/${adapterName}.adapter`);
      this._adapterInstance = new AdapterClass(this._dependencies);

      const driver = await this._adapterInstance.setup({ settings });

      this._console?.success('Module loaded', { namespace: this._namespace });

      return driver;
    } catch (error) {
      this._console?.error?.(`Failed to load email adapter "${adapterName}"`, { namespace: this._namespace });
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
        adapter: this._adapterInstance,
      },
      loadAdapter: this.loadAdapter
    }
  }
}

module.exports = { EmailModule };
