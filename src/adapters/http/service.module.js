class ServiceModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Loom]::[Adapter]::[HTTP]::[Service]';
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    this.#loadServices();

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  #loadServices() {
    this._services = require(`${this._dependencies.root}/src/services/index`);
  }

  get services() {
    return this._services;
  }
}

module.exports = { ServiceModule };
