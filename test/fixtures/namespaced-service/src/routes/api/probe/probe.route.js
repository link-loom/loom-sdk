class DefaultProbeRoute {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this.EntityService = dependencies.services.DefaultProbeService;
  }

  async visible({ principal }) {
    return new this.EntityService(this._dependencies).visible({ principal });
  }

  async create({ params }) {
    return new this.EntityService(this._dependencies).create({ params });
  }
}

module.exports = DefaultProbeRoute;
