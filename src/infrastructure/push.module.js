class PushModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Server]::[Push]::[Module]';
    this._push = {};
  }

  async setup() {
    this._console.success('Loading', { namespace: this._namespace });

    if (!this._dependencies?.config?.behaviors?.push?.enabled) {
      this._console.info('Push Behavior is disabled', { namespace: this._namespace });
      return;
    }

    switch (this._dependencies?.config?.behaviors?.push?.default) {
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

module.exports = { PushModule };
