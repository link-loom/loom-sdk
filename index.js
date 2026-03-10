const { Loom } = require('./src/loom.sdk');
const BaseModel = require('./src/utils/models/base.model');
const { Property } = require('./src/utils/models/property.model');
const { BaseWorker } = require('./src/utils/workers/base.worker');
const { WorkersModule } = require('./src/adapters/workers/workers.module');

module.exports = {
  Loom,
  BaseModel,
  Property,
  BaseWorker,
  WorkersModule,
  // Backward compatibility aliases
  BaseApp: BaseWorker,
  AppsModule: WorkersModule,
};
