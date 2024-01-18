class DataTypesManager {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Server]::[DAL]::[Manager]';
    this._dataTypes = {};
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this._dataTypes = require(
      `${this._dependencies.root}/src/data-types/definition.types`,
    );

    this._console.success('Loaded', { namespace: this._namespace });
  }

  get types() {
    return this._dataTypes;
  }
}

module.exports = { DataTypesManager };
