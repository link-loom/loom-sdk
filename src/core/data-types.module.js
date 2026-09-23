class DataTypesModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Loom]::[Core]::[Data-Types]';
    this._dataTypes = {};
    this._dynamicTypes = {};
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    this._dataTypes = require(`../utils/data-types/definition.types`);

    this._console.success('Module loaded', { namespace: this._namespace });
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

  /**
   * Creates a type registry for a namespace. Types registered in the scope
   * stay in the scope; lookups fall back to this registry, so a namespace
   * sees the built-in types and the default namespace models, and two
   * namespaces can declare models with the same class name.
   */
  createScope({ namespace } = {}) {
    return new ScopedDataTypes({ parent: this, namespace });
  }
}

class ScopedDataTypes {
  constructor({ parent, namespace }) {
    /* Base Properties */
    this._parent = parent;
    this._console = parent._console;

    /* Assigments */
    this._namespace = namespace || '[Loom]::[Core]::[Data-Types]::[Scope]';
    this._dynamicTypes = {};
  }

  setup() {}

  registerType({ name, instance = {} }) {
    this._dynamicTypes[name] = { name: name, default: instance };
    this._console.info(`Type '${name}' registered successfully.`, {
      namespace: this._namespace,
    });
  }

  getType(name) {
    return this._dynamicTypes[name] || this._parent.getType(name);
  }

  get types() {
    return { ...this._parent.types, ...this._dynamicTypes };
  }
}

module.exports = { DataTypesModule, ScopedDataTypes };
