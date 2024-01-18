class ModelManager {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Server]::[Model]::[Manager]';
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this._models = require(`${this._dependencies.root}/src/models/index`);

    this._console.success('Loaded', { namespace: this._namespace });
  }

  get models() {
    return this._models;
  }
}

module.exports = { ModelManager };
