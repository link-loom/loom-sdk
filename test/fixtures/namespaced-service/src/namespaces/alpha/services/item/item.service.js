class AlphaItemService {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._utilities = dependencies.utilities;
    this._database = dependencies.database.default.adapter;
    this._tableName = 'item';
    this._databaseName = 'alpha-db';
  }

  async visible({ principal }) {
    return this._utilities.io.response.success({
      namespace: this._dependencies.namespace?.name,
      prefix: this._dependencies.namespace?.prefix,
      services: Object.keys(this._dependencies.services),
      marker: this._dependencies.DataTypesModule.getType('SharedNameModel')?.default?.marker,
      builtInType: this._dependencies.DataTypesModule.getType('string')?.name,
      principal: principal || null,
      hasGlobalExpress: typeof this._dependencies.express === 'function',
      spreadKeepsNamespace: { ...this._dependencies }.namespace?.name,
    });
  }

  async create({ params, principal }) {
    await this._database.create({
      tableName: this._tableName,
      databaseName: this._databaseName,
      entity: { name: params.name, created_by: principal.subject },
    });

    return this._utilities.io.response.success({ name: params.name });
  }
}

module.exports = AlphaItemService;
