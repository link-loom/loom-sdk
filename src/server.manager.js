class ServerManager {
  constructor(args) {
    /* Base Properties */
    this._args = args;
    this._dependenciesManager = {};

    /* Assigments */
    this._utilitiesManager = {};
    this._settingsManager = {};
    this._consoleManager = {};
    this._eventBusManager = {};
    this._modelsManager = {};
    this._dataTypesManager = {};
    this._authManager = {};
    this._databaseManager = {};
    this._pushManager = {};
    this._serviceManager = {};
    this._apiManager = {};
    this._functionsManager = {};
    this._eventBrokerManager = {};
    this._eventBrokerManager = {};
    this._namespace = '[Server]::[Manager]';
  }

  async load() {
    try {
      console.log(` ${this._namespace}: Loading`);

      await this.#setupCoreModules();
      await this.#setupInfrastructureModules();
      await this.#setupAdapterModules();

      this._dependenciesManager.core
        .get()
        .console.success('Loaded', { namespace: this._namespace });

      return this._dependenciesManager.core.get();
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
    const { DependenciesManager } = require('./core/dependencies.manager');
    this._dependenciesManager = new DependenciesManager(this._args);
    const isSetupSuccessful = await this._dependenciesManager.setup();

    if (!isSetupSuccessful) {
      process.exit();
    }

    this._dependenciesManager.core.add(
      this._dependenciesManager,
      'DependenciesManager',
    );
  }

  #setupUtilities() {
    const { UtilitiesManager } = require('./core/utilities.manager');
    this._utilitiesManager = new UtilitiesManager(
      this._dependenciesManager.core.get(),
    );
    this._utilitiesManager.setup();

    this._dependenciesManager.core.add(
      this._utilitiesManager,
      'UtilitiesManager',
    );
    this._dependenciesManager.core.add(this._utilitiesManager, 'utilities');
  }

  #setupSettings() {
    const { SettingsManager } = require('./core/settings.manager');
    this._settingsManager = new SettingsManager(
      this._dependenciesManager.core.get(),
    );
    this._settingsManager.setup();

    this._dependenciesManager.core.add(
      this._settingsManager,
      'SettingsManager',
    );
  }

  #setupConsole() {
    const { ConsoleManager } = require('./core/console.manager');
    this._consoleManager = new ConsoleManager(
      this._dependenciesManager.core.get(),
    );
    this._consoleManager.setup();

    this._dependenciesManager.core.add(this._consoleManager, 'console');
  }

  async #setupDataTypes() {
    const { DataTypesManager } = require('./core/data-types.manager');
    this._dataTypesManager = new DataTypesManager(
      this._dependenciesManager.core.get(),
    );
    this._dataTypesManager.setup();

    this._dependenciesManager.core.add(
      this._dataTypesManager,
      'DataTypesManager',
    );
  }

  #setupEventBus() {
    const { BusManager } = require('./adapters/events/bus.manager');
    this._eventBusManager = new BusManager(
      this._dependenciesManager.core.get(),
    );
    this._eventBusManager.setup();

    this._dependenciesManager.core.add(this._eventBusManager, 'eventBus');
  }

  #setupServices() {
    const { ServiceManager } = require('./adapters/http/service.manager');
    this._serviceManager = new ServiceManager(
      this._dependenciesManager.core.get(),
    );
    this._serviceManager.setup();

    this._dependenciesManager.core.add(this._serviceManager, 'ServiceManager');
    this._dependenciesManager.core.add(
      this._serviceManager.services,
      'services',
    );
  }

  #setupApi() {
    const { ApiManager } = require('./adapters/http/api.manager');
    this._apiManager = new ApiManager(this._dependenciesManager.core.get());
    this._apiManager.setup();

    this._dependenciesManager.core.add(this._apiManager, 'ApiManager');
  }

  #setupFunctions() {
    const { FunctionsManager } = require('./adapters/functions/functions.manager');
    this._functionsManager = new FunctionsManager(
      this._dependenciesManager.core.get(),
    );

    this._dependenciesManager.core.add(this._functionsManager, 'FunctionsManager');
    this._dependenciesManager.core.add(this._functionsManager, 'functions');
  }

  #setupModels() {
    const { ModelManager } = require('./adapters/http/model.manager');
    this._modelsManager = new ModelManager(
      this._dependenciesManager.core.get(),
    );
    this._modelsManager.setup();

    this._dependenciesManager.core.add(this._modelsManager, 'ModelsManager');
    this._dependenciesManager.core.add(this._modelsManager.models, 'models');
  }

  #setupEventBroker() {
    const { EventBrokerManager } = require('./adapters/events/broker.manager');
    this._eventBrokerManager = new EventBrokerManager(
      this._dependenciesManager.core.get(),
    );

    this._eventBrokerManager.setup();

    this._dependenciesManager.core.add(this._eventBrokerManager, 'BrokerManager');
    this._dependenciesManager.core.add(this._eventBrokerManager.webSocketServer, 'webSocketServer');
  }

  #setupEventProducer() {
    const { EventProducerManager } = require('./adapters/events/producer.manager');
    this._eventBrokerManager = new EventProducerManager(
      this._dependenciesManager.core.get(),
    );

    this._eventBrokerManager.setup();

    this._dependenciesManager.core.add(this._eventBrokerManager, 'ProducerManager');
  }

  #setupEventConsumer() {
    const { EventConsumerManager } = require('./adapters/events/consumer.manager');
    this._eventBrokerManager = new EventConsumerManager(
      this._dependenciesManager.core.get(),
    );
    this._eventBrokerManager.setup();

    this._dependenciesManager.core.add(this._eventBrokerManager, 'ConsumerManager');
  }

  async #setupDatabase() {
    const { DatabaseManager } = require('./infrastructure/database.manager');

    this._databaseManager = new DatabaseManager({
      dependencies: this._dependenciesManager.core.get(),
      dependencyInjector: this._dependenciesManager,
    });

    await this._databaseManager.setup();

    this._dependenciesManager.core.add(
      this._databaseManager,
      'DatabaseManager',
    );

    return this._databaseManager;
  }

  #setupStorage() {
    const { StorageManager } = require('./infrastructure/storage.manager');
    const _storageManager = new StorageManager({
      dependencies: this._dependenciesManager.core.get(),
      dependencyInjector: this._dependenciesManager,
    });

    _storageManager.setup();
    this._dependenciesManager.core.add(_storageManager, 'StorageManager');
    return _storageManager;
  }

  async #setupPushNotifications() {
    const { PushManager } = require('./infrastructure/push.manager');
    this._pushManager = new PushManager(this._dependenciesManager.core.get());
    await this._pushManager.setup();

    this._dependenciesManager.core.add(
      this._pushManager.push,
      'PushNotificationManager',
    );
  }

  #setupObservability() {
    const { ObservabilityManager } = require('./infrastructure/observability.manager');
    this._observabilityManager = new ObservabilityManager(
      this._dependenciesManager.core.get(),
    );
    this._observabilityManager.setup();

    this._dependenciesManager.core.add(this._observabilityManager, 'ObservabilityManager');
    this._dependenciesManager.core.add(this._observabilityManager, 'observability');
  }

  #setupServer() {
    this._settingsManager.listenServer();
  }

  #serverLoadedTrigger() {
    this._dependenciesManager.core.get().eventBus.bus.emit('server::loaded');
  }

  get settings() {
    return this._settingsManager;
  }
}

module.exports = { ServerManager };
