class Loom {
  constructor(args) {
    /* Base Properties */
    this._args = args;
    this._dependenciesModule = {};

    /* Assigments */
    this._utilitiesModule = {};
    this._settingsModule = {};
    this._consoleModule = {};
    this._eventBusModule = {};
    this._modelsModule = {};
    this._dataTypesModule = {};
    this._authModule = {};
    this._databaseModule = {};
    this._pushModule = {};
    this._serviceModule = {};
    this._apiModule = {};
    this._functionsModule = {};
    this._eventBrokerModule = {};
    this._eventBrokerModule = {};
    this._namespace = '[Loom]';
  }

  async ignite() {
    try {
      console.log(` ${this._namespace}: Loading`);

      await this.#setupCoreModules();
      await this.#setupInfrastructureModules();
      await this.#setupAdapterModules();

      this._dependenciesModule.core
        .get()
        .console.success('Loaded', { namespace: this._namespace });

      return this._dependenciesModule.core.get();
    } catch (error) {
      console.log(error);
      process.exit();
    }
  }

  async #setupCoreModules() {
    await this.#setupDependencies();

    this.#setupConsole();

    this.#setupUtilities();

    this.#setupSettings();

    this.#setupDataTypes();
  }

  async #setupInfrastructureModules() {
    await this.#setupDatabase();

    await this.#setupStorage();

    await this.#setupPushNotifications();

    this.#setupObservability();
  }

  async #setupAdapterModules() {
    this.#setupEventBus();

    this.#setupModels();

    this.#setupServices();

    this.#setupFunctions();

    this.#setupApi();

    this.#setupEventBroker();

    this.#setupEventProducer();

    this.#setupEventConsumer();

    this.#setupServer();

    this.#serverLoadedTrigger();
  }

  async #setupDependencies() {
    const { DependenciesModule } = require('./core/dependencies.module');
    this._dependenciesModule = new DependenciesModule(this._args);
    const isSetupSuccessful = await this._dependenciesModule.setup();

    if (!isSetupSuccessful) {
      process.exit();
    }

    this._dependenciesModule.core.add(
      this._dependenciesModule,
      'DependenciesModule',
    );
  }

  #setupUtilities() {
    const { UtilitiesModule } = require('./core/utilities.module');
    this._utilitiesModule = new UtilitiesModule(
      this._dependenciesModule.core.get(),
    );
    this._utilitiesModule.setup();

    this._dependenciesModule.core.add(
      this._utilitiesModule,
      'UtilitiesModule',
    );
    this._dependenciesModule.core.add(this._utilitiesModule, 'utilities');
  }

  #setupSettings() {
    const { SettingsModule } = require('./core/settings.module');
    this._settingsModule = new SettingsModule(
      this._dependenciesModule.core.get(),
    );
    this._settingsModule.setup();

    this._dependenciesModule.core.add(
      this._settingsModule,
      'SettingsModule',
    );
  }

  #setupConsole() {
    const { ConsoleModule } = require('./core/console.module');
    this._consoleModule = new ConsoleModule(
      this._dependenciesModule.core.get(),
    );
    this._consoleModule.setup();

    this._dependenciesModule.core.add(this._consoleModule, 'console');
  }

  async #setupDataTypes() {
    const { DataTypesModule } = require('./core/data-types.module');
    this._dataTypesModule = new DataTypesModule(
      this._dependenciesModule.core.get(),
    );
    this._dataTypesModule.setup();

    this._dependenciesModule.core.add(
      this._dataTypesModule,
      'DataTypesModule',
    );
  }

  #setupEventBus() {
    const { BusModule } = require('./adapters/events/bus.module');
    this._eventBusModule = new BusModule(
      this._dependenciesModule.core.get(),
    );
    this._eventBusModule.setup();

    this._dependenciesModule.core.add(this._eventBusModule, 'eventBus');
  }

  #setupServices() {
    const { ServiceModule } = require('./adapters/http/service.module');
    this._serviceModule = new ServiceModule(
      this._dependenciesModule.core.get(),
    );
    this._serviceModule.setup();

    this._dependenciesModule.core.add(this._serviceModule, 'ServiceModule');
    this._dependenciesModule.core.add(
      this._serviceModule.services,
      'services',
    );
  }

  #setupApi() {
    const { ApiModule } = require('./adapters/http/api.module');
    this._apiModule = new ApiModule(this._dependenciesModule.core.get());
    this._apiModule.setup();

    this._dependenciesModule.core.add(this._apiModule, 'ApiModule');
  }

  #setupFunctions() {
    const { FunctionsModule } = require('./adapters/functions/functions.module');
    this._functionsModule = new FunctionsModule(
      this._dependenciesModule.core.get(),
    );

    this._dependenciesModule.core.add(this._functionsModule, 'FunctionsModule');
    this._dependenciesModule.core.add(this._functionsModule, 'functions');
  }

  #setupModels() {
    const { ModelModule } = require('./adapters/http/model.module');
    this._modelsModule = new ModelModule(
      this._dependenciesModule.core.get(),
    );
    this._modelsModule.setup();

    this._dependenciesModule.core.add(this._modelsModule, 'ModelsModule');
    this._dependenciesModule.core.add(this._modelsModule.models, 'models');
  }

  #setupEventBroker() {
    const { EventBrokerModule } = require('./adapters/events/broker.module');
    this._eventBrokerModule = new EventBrokerModule(
      this._dependenciesModule.core.get(),
    );

    this._eventBrokerModule.setup();

    this._dependenciesModule.core.add(this._eventBrokerModule, 'BrokerModule');
    this._dependenciesModule.core.add(this._eventBrokerModule.webSocketServer, 'webSocketServer');
  }

  #setupEventProducer() {
    const { EventProducerModule } = require('./adapters/events/producer.module');
    this._eventBrokerModule = new EventProducerModule(
      this._dependenciesModule.core.get(),
    );

    this._eventBrokerModule.setup();

    this._dependenciesModule.core.add(this._eventBrokerModule, 'ProducerModule');
  }

  #setupEventConsumer() {
    const { EventConsumerModule } = require('./adapters/events/consumer.module');
    this._eventBrokerModule = new EventConsumerModule(
      this._dependenciesModule.core.get(),
    );
    this._eventBrokerModule.setup();

    this._dependenciesModule.core.add(this._eventBrokerModule, 'ConsumerModule');
  }

  async #setupDatabase() {
    const { DatabaseModule } = require('./infrastructure/database.module');

    this._databaseModule = new DatabaseModule({
      dependencies: this._dependenciesModule.core.get(),
      dependencyInjector: this._dependenciesModule,
    });

    await this._databaseModule.setup();

    this._dependenciesModule.core.add(this._databaseModule, 'DatabaseModule');

    return this._databaseModule;
  }

  #setupStorage() {
    const { StorageModule } = require('./infrastructure/storage.module');
    const _storageModule = new StorageModule({
      dependencies: this._dependenciesModule.core.get(),
      dependencyInjector: this._dependenciesModule,
    });

    _storageModule.setup();
    this._dependenciesModule.core.add(_storageModule, 'StorageModule');
    return _storageModule;
  }

  async #setupPushNotifications() {
    const { PushModule } = require('./infrastructure/push.module');
    this._pushModule = new PushModule(this._dependenciesModule.core.get());
    await this._pushModule.setup();

    this._dependenciesModule.core.add(
      this._pushModule.push,
      'PushNotificationModule',
    );
  }

  #setupObservability() {
    const { ObservabilityModule } = require('./infrastructure/observability.module');
    this._observabilityModule = new ObservabilityModule({
      dependencies: this._dependenciesModule.core.get(),
      dependencyInjector: this._dependenciesModule,
    });
    this._observabilityModule.setup();

    this._dependenciesModule.core.add(this._observabilityModule, 'ObservabilityModule');
  }

  #setupServer() {
    this._settingsModule.listenServer();
  }

  #serverLoadedTrigger() {
    const dependencies = this._dependenciesModule.core.get() || {};

    if (dependencies?.eventBus?.bus?.emit) {
      dependencies?.eventBus?.bus?.emit('server::loaded');
    }
  }

  get settings() {
    return this._settingsModule;
  }
}

module.exports = { Loom };
