class PushManager {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Server]::[Push]::[Manager]';
    this._push = {};
  }

  async setup() {
    this._console.success('Loading', { namespace: this._namespace });

    if (!this._dependencies.config.SETTINGS.USE_PUSH) {
      this._console.info('Manager is disabled', { namespace: this._namespace });
      return;
    }

    switch (this._dependencies.config.SETTINGS.PUSH_NAME) {
      case 'firebase':
        await this.firebaseConfig();
        break;
      default:
        break;
    }

    this._console.success('Loaded', { namespace: this._namespace });
  }

  async firebaseConfig() {
    try {
      this._push = this._dependencies.firebase.messaging();
    } catch (error) {
      console.log(error);
    }
  }

  get push() {
    return this._push;
  }
}

module.exports = { PushManager };
