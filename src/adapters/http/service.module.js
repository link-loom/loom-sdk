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
    this._services = require(
      this._dependencies.path.join(this.#sourceRoot, 'services', 'index'),
    );
  }

  get #sourceRoot() {
    return (
      this._dependencies.namespace?.sourceRoot ||
      this._dependencies.path.join(this._dependencies.root, 'src')
    );
  }

  get services() {
    return this._services;
  }
}

module.exports = { ServiceModule };
