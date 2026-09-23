class DefaultProbeService {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._utilities = dependencies.utilities;
    this._database = dependencies.database.default.adapter;
    this._tableName = 'item';
  }

  async visible({ principal }) {
    return this._utilities.io.response.success({
      namespace: this._dependencies.namespace?.name || 'default',
      services: Object.keys(this._dependencies.services),
      marker: this._dependencies.DataTypesModule.getType('SharedNameModel')?.default?.marker,
      principal: principal || null,
    });
  }

  async create({ params }) {
    await this._database.create({ tableName: this._tableName, entity: { name: params.name } });
    return this._utilities.io.response.success({ name: params.name });
  }
}

module.exports = DefaultProbeService;
