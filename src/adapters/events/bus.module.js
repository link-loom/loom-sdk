class BusModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = this._dependencies.console;
    this._config = this._dependencies.config;

    /* Custom Properties */
    this._events = this._dependencies.events;

    /* Assigments */
    this._namespace = '[Loom]::[Event System]::[Bus]';
    this._bus = {};
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    if (!this._config?.settings?.eventSystem?.internalBusModule) {
      this._console.info('Module is disabled', { namespace: this._namespace });
      return;
    }

    this._bus = new this._events.EventEmitter();

    this._bus.emit('server::event-bus::loaded');

    this._console.success('Loaded', { namespace: this._namespace });
  }

  get bus() {
    return this._bus;
  }
}

module.exports = { BusModule };
