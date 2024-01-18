class EventProducerManager {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._path = this._dependencies.path;
    this._config = this._dependencies.config;
    this._websocketServer = this._dependencies.webSocketServer;
    this._websocketClientModule = this._dependencies.websocketClientModule;

    /* Assigments */
    this._namespace = '[Server]::[Event System]::[Producer]';
    this._eventSystemDefinition = {};
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this.#registerEvents();

    this._console.success('Loaded', { namespace: this._namespace });
  }

  #registerEvents() {
    if (!this._config.SETTINGS.EVENT_SYSTEM.LISTEN_PRODUCER_EVENTS_ENABLED) {
      this._console.info('Manager is disabled', { namespace: this._namespace });
      return;
    }

    this._websocketServer.on('connection', (socket) => {
      this._console.success(`[${socket.id}]: Consumer connected`, {
        namespace: this._namespace,
      });

      this.#registerDynamicEvents(socket);
    });
  }

  #registerDynamicEvents(consumer) {
    this._eventSystemDefinition = require(
      `${this._dependencies.root}/src/events/index`,
    );

    this.#subscribeTopics({ consumer });

    // build each api routes
    this._eventSystemDefinition.producer.events.map((eventDefinition) => {
      try {
        this._console.info(
          `[${consumer.id}]: Initializing ${eventDefinition.name}${eventDefinition.command} event`,
          { namespace: this._namespace },
        );

        /* Initialize event in websocket provider */
        consumer.on(eventDefinition.name + eventDefinition.command, (data) => {
          if (!data) {
            data = {};
          }

          this.#executeEvent({
            eventSettings: eventDefinition,
            data,
            consumer,
          });
        });
      } catch (error) {
        this._console.error(
          `Component failed: ${JSON.stringify(eventDefinition)}`,
          true,
          { namespace: this._namespace },
        );
        this._console.error(error, { namespace: this._namespace });
      }

      return eventDefinition;
    });

    consumer.on('disconnect', () => {
      this._console.success(`Consumer disconnected ${consumer.id}`, {
        namespace: this._namespace,
      });
    });
  }

  #subscribeTopics({ consumer }) {
    this._console.success(`[${consumer.id}]: Subscribing to topics`, {
      namespace: this._namespace,
    });

    consumer.join(
      this._eventSystemDefinition.producer.topics.map((topic) => topic.name),
    );

    this._console.success(
      `[${consumer.id}]: Topics subscribed ${[...consumer.rooms].join(', ')}`,
      { namespace: this._namespace },
    );
  }

  #executeEvent({ eventSettings, data, consumer }) {
    if (!eventSettings || !eventSettings.filename) {
      return;
    }

    /* Setup config */
    const pathname = this._path.join(
      this._dependencies.root,
      'src',
      eventSettings.filename,
    );

    /* Setup event */
    const Event = require(pathname);
    const event = new Event(this._dependencies, { socket: consumer });

    event.execute({
      settings: eventSettings,
      payload: {
        context: data.context || {
          event: {
            name: eventSettings.name,
          },
          socket: {
            id: consumer.id,
          },
          topics: eventSettings.topics,
        },
        command: data.command || '',
        values: data.values || {},
      },
    });
  }

  getEventDefinitionByName(name) {
    if (!name) {
      return;
    }

    return this._eventSystemDefinition.producer.events.find(
      (event) => event.name === name,
    );
  }

  get definition() {
    return this._eventSystemDefinition.broker;
  }
}

module.exports = { EventProducerManager };
