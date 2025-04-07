class EventBrokerModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = this._dependencies.console;
    this._config = this._dependencies.config;

    /* Custom Properties */
    this._events = this._dependencies.events;
    this._socketModule = this._dependencies.socketModule;
    this._httpServer = this._dependencies.httpServer;

    /* Assigments */
    this._namespace = '[Server]::[Event System]::[Broker]';
    this._webSocketServer = {};
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    if (!this._config?.behaviors?.eventSystem?.broker) {
      this._console.info('Module is disabled', { namespace: this._namespace });
      return;
    }

    // Listening and setup socket
    this._webSocketServer = this._socketModule(this._httpServer, {
      cors: {
        origin: '*',
      },
    });

    this._console.success('Loaded', { namespace: this._namespace });
  }

  get webSocketServer() {
    return this._webSocketServer;
  }
}

module.exports = { EventBrokerModule };
