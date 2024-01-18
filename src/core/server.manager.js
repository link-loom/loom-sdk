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
    this._dalManager = {};
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

      await this.#setupDependencies();

      this.#setupConsole();

      this.#setupUtilities();

      this.#setupSettings();

      this.#setupEventBus();

      this.#setupDataTypes();

      await this.#setupDatabase();

      await this.#setupStorage();

      await this.#setupPushNotifications();

      this.#setupModels();

      this.#setupServices();

      this.#setupFunctions();

      this.#setupApi();

      this.#setupEventBroker();

      this.#setupEventProducer();

      this.#setupEventConsumer();

      this.#setupServer();

      this.#serverLoadedTrigger();

      this._dependenciesManager.core
        .get()
        .console.success('Loaded', { namespace: this._namespace });

      return this._dependenciesManager.core.get();
    } catch (error) {
      console.log(error);
      process.exit();
    }
  }

  async #setupDependencies() {
    const { DependenciesManager } = require('./dependencies.manager');
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
    const { UtilitiesManager } = require('./utilities.manager');
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
    const { SettingsManager } = require('./settings.manager');
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
    const { ConsoleManager } = require('./console.manager');
    this._consoleManager = new ConsoleManager(
      this._dependenciesManager.core.get(),
    );
    this._consoleManager.setup();

    this._dependenciesManager.core.add(this._consoleManager, 'console');
  }

  #setupEventBus() {
    const { BusManager } = require('./event-system/bus.manager');
    this._eventBusManager = new BusManager(
      this._dependenciesManager.core.get(),
    );
    this._eventBusManager.setup();

    this._dependenciesManager.core.add(this._eventBusManager, 'eventBus');
  }

  #setupModels() {
    const { ModelManager } = require('./model.manager');
    this._modelsManager = new ModelManager(
      this._dependenciesManager.core.get(),
    );
    this._modelsManager.setup();

    this._dependenciesManager.core.add(this._modelsManager, 'ModelsManager');
    this._dependenciesManager.core.add(this._modelsManager.models, 'models');
  }

  async #setupDataTypes() {
    const { DataTypesManager } = require('./data-types.manager');
    this._dalManager = new DataTypesManager(
      this._dependenciesManager.core.get(),
    );
    this._dalManager.setup();

    this._dependenciesManager.core.add(this._dalManager, 'DataTypesManager');
  }

  #setupDatabase() {
    const { DatabaseManager } = require('./database.manager');
    this._databaseManager = new DatabaseManager({
      dependencies: this._dependenciesManager.core.get(),
      dependencyInjector: this._dependenciesManager,
    });
    this._databaseManager.setup();

    this._dependenciesManager.core.add(
      this._databaseManager,
      'DatabaseManager',
    );

    return this._databaseManager;
  }

  #setupStorage() {
    const { StorageManager } = require('./storage.manager');
    const _storageManager = new StorageManager({
      dependencies: this._dependenciesManager.core.get(),
      dependencyInjector: this._dependenciesManager,
    });

    _storageManager.setup();
    this._dependenciesManager.core.add(_storageManager, 'StorageManager');
    return _storageManager;
  }

  async #setupPushNotifications() {
    const { PushManager } = require('./push.manager');
    this._pushManager = new PushManager(this._dependenciesManager.core.get());
    await this._pushManager.setup();

    this._dependenciesManager.core.add(
      this._pushManager.push,
      'PushNotificationManager',
    );
  }

  #setupServices() {
    const { ServiceManager } = require('./service.manager');
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
    const { ApiManager } = require('./api.manager');
    this._apiManager = new ApiManager(this._dependenciesManager.core.get());
    this._apiManager.setup();

    this._dependenciesManager.core.add(this._apiManager, 'ApiManager');
  }

  #setupFunctions() {
    const { FunctionsManager } = require('./functions.manager');
    this._functionsManager = new FunctionsManager(
      this._dependenciesManager.core.get(),
    );

    this._dependenciesManager.core.add(
      this._functionsManager,
      'FunctionsManager',
    );
    this._dependenciesManager.core.add(this._functionsManager, 'functions');
  }

  #setupEventBroker() {
    const { EventBrokerManager } = require('./event-system/broker.manager');
    this._eventBrokerManager = new EventBrokerManager(
      this._dependenciesManager.core.get(),
    );

    this._eventBrokerManager.setup();

    this._dependenciesManager.core.add(
      this._eventBrokerManager,
      'BrokerManager',
    );
    this._dependenciesManager.core.add(
      this._eventBrokerManager.webSocketServer,
      'webSocketServer',
    );
  }

  #setupEventProducer() {
    const { EventProducerManager } = require('./event-system/producer.manager');
    this._eventBrokerManager = new EventProducerManager(
      this._dependenciesManager.core.get(),
    );

    this._eventBrokerManager.setup();

    this._dependenciesManager.core.add(
      this._eventBrokerManager,
      'ProducerManager',
    );
  }

  #setupEventConsumer() {
    const { EventConsumerManager } = require('./event-system/consumer.manager');
    this._eventBrokerManager = new EventConsumerManager(
      this._dependenciesManager.core.get(),
    );
    this._eventBrokerManager.setup();

    this._dependenciesManager.core.add(
      this._eventBrokerManager,
      'ConsumerManager',
    );
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
