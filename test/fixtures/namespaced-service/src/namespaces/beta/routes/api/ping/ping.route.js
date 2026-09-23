class BetaPingRoute {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._utilities = dependencies.utilities;
  }

  async ping() {
    return this._utilities.io.response.success({
      namespace: this._dependencies.namespace?.name,
      marker: this._dependencies.DataTypesModule.getType('SharedNameModel')?.default?.marker,
      services: Object.keys(this._dependencies.services),
    });
  }
}

module.exports = BetaPingRoute;
