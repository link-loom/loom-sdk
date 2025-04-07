class EmailModule {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._namespace = '[Email]::[Behavior]';
    this._behaviors = this._dependencies.config?.behaviors;
    this._emailAdapter = null;
  }

  async setup() {
    if (!this._behaviors?.email || !this._behaviors?.email?.enabled) {
      this._console.info('Email is disabled', {
        namespace: this._namespace,
      });
      return;
    }

    await this.#setupAdapter();
  }

  async #setupAdapter() {
    const observabilityBehaviorDefault = this._behaviors?.email || {};
    const observabilityProvider = this._behaviors?.email?.provider || '';

    if (!observabilityBehavior.enabled) {
      this._dependencies.console?.info?.('No email behavior enabled', { namespace: this._namespace });
      return;
    }

    if (!observabilityProvider) {
      this._dependencies.console?.error?.('No email settings specified', { namespace: this._namespace });
      return;
    }

    try {
      const ObservabilityProvider = require(`./email-adapters/${observabilityProvider}.adapter`).default;
      this._emailAdapter = new ObservabilityProvider(this._dependencies, observabilityBehavior);
      await this._emailAdapter.setup?.();

      this._console.success('Email behavior loaded', { namespace: this._namespace });
    } catch (err) {
      this._dependencies.console?.error?.(`Failed to load email provider "${provider}"`, { namespace: this._namespace });
    }
  }

  get client() {
    return this._emailAdapter || {};
  }

  isEnabled() {
    return !!this._emailAdapter;
  }
}

module.exports = { EmailModule };
