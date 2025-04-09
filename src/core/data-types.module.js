class DataTypesModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Loom]::[Data-Types]::[Module]';
    this._dataTypes = {};
    this._dynamicTypes = {};
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this._dataTypes = require(`../utils/data-types/definition.types`);

    this._console.success('Loaded', { namespace: this._namespace });
  }

  registerType({ name, instance = {} }) {
    this._dynamicTypes[name] = { name: name, default: instance };
    this._console.info(`Type '${name}' registered successfully.`, {
      namespace: this._namespace,
    });
  }

  getType(name) {
    return this._dynamicTypes[name] || this._dataTypes[name];
  }

  get types() {
    return { ...this._dataTypes, ...this._dynamicTypes };
  }
}

module.exports = { DataTypesModule };
