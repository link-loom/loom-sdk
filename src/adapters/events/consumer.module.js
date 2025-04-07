class EventConsumerModule {
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
    this._consumer = {};
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this.#connectToBroker();

    this._console.success('Loaded', { namespace: this._namespace });
  }

  async #connectToBroker() {
    if (!this._config?.settings?.eventSystem?.listenConsumerEvents) {
      this._console.info('Module is disabled', { namespace: this._namespace });
      return;
    }

    this._consumer = this._websocketClientModule.connect(
      this._config?.services?.broker?.uri || '',
      {
        reconnect: true,
      },
    );

    this.#registerEvents();
  }

  #registerEvents() {
    this._consumer.on('connect', (data) => {
      this._console.success(
        `connected to broker: ${this._config?.services?.broker?.uri || ''}`,
        { namespace: this._namespace },
      );
      this._console.success(`id: ${this.id}`, { namespace: this._namespace });

      this.#registerDynamicEvents({ consumer: this._consumer });
    });

    this._consumer.on('disconnect', () => {
      this._console.success(
        `disconnected from broker: ${this._config?.services?.broker?.uri || ''}`,
        { namespace: this._namespace },
      );
    });
  }

  #registerDynamicEvents({ consumer }) {
    this._eventSystemDefinition = require(
      `${this._dependencies.root}/src/events/index`,
    );

    this.#subscribeTopics({ consumer });

    // build each api routes
    this._eventSystemDefinition.consumer.events.map((eventDefinition) => {
      try {
        this._console.info(
          `Initializing ${eventDefinition.name}${eventDefinition.command} event`,
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
  }

  #subscribeTopics({ consumer }) {
    this._console.success(`Subscribing to topics from ${consumer.id}`, {
      namespace: this._namespace,
    });

    consumer.join(
      this._eventSystemDefinition.broker.topics.map((topic) => topic.name),
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

    this._eventSystemDefinition.consumer.events.find(
      (event) => event.name === name,
    );
  }

  get definition() {
    return this._eventSystemDefinition.producer;
  }

  get producer() {
    return this._consumer;
  }

  get id() {
    return this._consumer.id;
  }
}

module.exports = { EventConsumerModule };
