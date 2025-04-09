class EventBrokerModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = this._dependencies.console;
    this._config = this._dependencies.config;
    this._modules = this._dependencies?.config?.modules || {};

    /* Custom Properties */
    this._events = this._dependencies.events;
    this._socketModule = this._dependencies.socketModule;
    this._httpServer = this._dependencies.httpServer;

    /* Assigments */
    this._namespace = '[Loom]::[Event System]::[Broker]';
    this._webSocketServer = {};
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    if (!this._modules?.eventSystem?.broker) {
      this._console.info('Event System module is disabled', { namespace: this._namespace });
      return;
    }

    // Listening and setup socket
    this._webSocketServer = this._socketModule(this._httpServer, {
      cors: {
        origin: '*',
      },
    });

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  get webSocketServer() {
    return this._webSocketServer;
  }
}

module.exports = { EventBrokerModule };
