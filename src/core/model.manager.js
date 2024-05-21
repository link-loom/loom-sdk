class ModelManager {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this._dataTypesManager = this._dependencies.DataTypesManager;

    /* Assigments */
    this._namespace = '[Server]::[Model]::[Manager]';
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this._models = require(`${this._dependencies.root}/src/models/index`);
    this.#registerModelsAsTypes();

    this._console.success('Loaded', { namespace: this._namespace });
  }

  // Registers all models as types, assigns an empty object on instantiation failure
  #registerModelsAsTypes() {
    Object.keys(this._models).forEach((modelName) => {
      let defaultInstance;

      try {
        const Model = this._models[modelName];
        defaultInstance = new Model({}, this._dependencies);
      } catch (error) {
        this._console.error(
          `Failed to instantiate ${modelName}: ${error.message}`,
        );
        defaultInstance = {}; // Assigns an empty object if there is an error
      }

      this._dataTypesManager.registerType({
        name: modelName,
        instance: defaultInstance,
      });
    });
    this._console.info('All models registered as types successfully.');
  }

  get models() {
    return this._models;
  }
}

module.exports = { ModelManager };
