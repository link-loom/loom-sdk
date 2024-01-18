class EventUtil {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._websocketServer = this._dependencies.webSocketServer;
  }

  /**
   * Emit message to topic inside payload.context.topics if not send to all
   * @param {*} params
   */
  #producerEmitToTopics({ settings, payload }) {
    this._websocketServer = this._dependencies.webSocketServer;

    if (!payload || !payload.context) {
      return this._utilities.io.response.error();
    }

    if (!payload.context.topics || !payload.context.topics.length) {
      return this._utilities.io.response.error();
    }

    for (const topic of payload.context.topics) {
      console.log(`${settings.name + payload.command}[${topic}]`);

      if (this._websocketServer) {
        this._websocketServer
          .to(topic)
          .emit(settings.name + payload.command, payload);
      }
    }
  }

  #producerEmit({ websocketServer, settings, payload }) {
    this.#producerEmitToTopics({ websocketServer, settings, payload });
  }

  get producer() {
    return {
      emit: this.#producerEmit.bind(this),
      topic: {
        emit: this.#producerEmitToTopics.bind(this),
      },
    };
  }
}

module.exports = EventUtil;
