class AlphaItemRoute {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this.EntityService = dependencies.services.AlphaItemService;
  }

  async visible({ principal }) {
    return new this.EntityService(this._dependencies).visible({ principal });
  }

  async create({ params, principal }) {
    return new this.EntityService(this._dependencies).create({ params, principal });
  }
}

module.exports = AlphaItemRoute;
