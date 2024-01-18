class ServiceManager {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Server]::[Service]::[Manager]';
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this.#loadServices();

    this._console.success('Loaded', { namespace: this._namespace });
  }

  #loadServices() {
    this._services = require(`${this._dependencies.root}/src/services/index`);
  }

  get services() {
    return this._services;
  }
}

module.exports = { ServiceManager };
