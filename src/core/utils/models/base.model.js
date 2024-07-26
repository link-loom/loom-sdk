const { Property } = require('./property.model');

/**
 * @swagger
 * components:
 *   schemas:
 *     Response:
 *       type: object
 *       required:
 *         - status
 *         - success
 *         - message
 *         - result
 *       properties:
 *         status:
 *           type: number
 *           description: Is the HTTP status code
 *         success:
 *           type: boolean
 *           description: Define if response was failed or success
 *         message:
 *           type: string
 *           description: The server error message
 *         result:
 *           type: object
 *           description: Is the result object as DTO
 *       example:
 *         status: 500
 *         success: false
 *         message: Something was wrong while you make this action
 *         result: {}
 */
class ModelBase {
  #dependencies;
  #utilities;
  #dataTypesManager;

  static defaultStatuses = {
    deleted: { id: -1, name: 'deleted', title: 'Deleted' },
    inactive: { id: 0, name: 'inactive', title: 'Inactive' },
    active: { id: 1, name: 'active', title: 'Active' },
    pending: { id: 2, name: 'pending', title: 'Pending' },
  };

  constructor(dependencies) {
    if (!dependencies) {
      throw new Error('Required dependencies to build this entity');
    }
    this.#dependencies = dependencies;
    this.#utilities = this.#dependencies.utilities;
    this.#dataTypesManager = this.#dependencies.DataTypesManager;
  }

  get dependencies() {
    return this.#dependencies;
  }

  get utilities() {
    return this.#utilities;
  }

  get types() {
    return this.#dataTypesManager.types;
  }

  get timestamp() {
    return this.#utilities.generator.time.timestamp();
  }

  get getPropertiesAsCommas() {
    return Object.keys(this.get).join();
  }

  get getPropertiesAsBindings() {
    const keys = Object.keys(this.get);

    return keys.map((key, index) => `$${index + 1}`).join();
  }

  get getValuesAsArray() {
    return Object.values(this.get.value).join();
  }

  get getPropertiesAsAssignment() {
    let keys = Object.keys(this.get);
    keys = keys.filter((key) => this.get[key].value);
    return keys.map((key) => `${key}=${this.get[key].value}`).join();
  }

  getPropertyAsReference({ namespace, property }) {
    return `REFERENCES "${namespace}"."${this.get[property].reference.table}" ("${this.get[property].reference.property}")`;
  }

  /**
   * Initializes the base properties of the model.
   * @param {object} args - The arguments to initialize the properties.
   * @param {string} args.id - The ID of the model.
   * @param {string} args.user_id - The ID of the user making the modification.
   * @param {string} [args.status] - The status of the model.
   */
  initializeBaseProperties(args) {
    const statuses = this.constructor.statuses;

    this.last_modification = new Property({ value: this.timestamp, type: this.types.timestamp });
    this.id = new Property({ value: args.id, type: this.types.bigserial, isPK: true });
    this.date_creation = new Property({ value: this.timestamp, type: this.types.timestamp });
    this.last_user_modification = new Property({ value: args.user_id, type: this.types.object });
    this.status = new Property({ value: args.status || statuses.active, type: this.types.object });
  }

  setBaseProperties(baseProperties) {
    this.id = baseProperties.id;
    this.date_creation = baseProperties.date_creation;
    this.last_modification = baseProperties.last_modification;
    this.last_user_modification = baseProperties.last_user_modification;
    this.status = baseProperties.status;

    return this;
  }
}

module.exports = ModelBase;
