class ObservabilityModule {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._namespace = '[Observability]::[Behavior]';
    this._behaviors = this._dependencies.config?.behaviors;
    this._observabilityAdapter = null;
  }

  async setup() {
    if (!this._behaviors?.observability || !this._behaviors?.observability?.enabled) {
      this._console.info('Observability behavior is disabled', {
        namespace: this._namespace,
      });
      return;
    }

    await this.#setupAdapter();
  }

  async #setupAdapter() {
    const observabilityBehavior = this._behaviors?.observability || {};
    const observabilityProviderDefault = observabilityBehavior?.default || '';
    const observabilityProviders = observabilityBehavior?.providers || {};
    const observabilityProvider = observabilityProviders[observabilityProviderDefault] || {};

    if (!observabilityProvider?.settings) {
      this._dependencies.console?.error?.('No observability settings specified', { namespace: this._namespace });
      return;
    }

    try {
      const ObservabilityProvider = require(`./observability-adapters/${observabilityProvider}.adapter`).default;
      this._observabilityAdapter = new ObservabilityProvider(this._dependencies, observabilityBehavior);
      await this._observabilityAdapter.setup?.();

      this._console.success('Observability behavior loaded', { namespace: this._namespace });
    } catch (err) {
      this._dependencies.console?.error?.(`Failed to load observability provider "${provider}"`, { namespace: this._namespace });
    }
  }

  get client() {
    return this._observabilityAdapter || {};
  }

  async capture(event) {
    this._dependencies.console?.info?.(`Capturing event ${event?.title ?? event?.description ?? '...'}`, { namespace: this._namespace });
    return this._observabilityAdapter?.capture?.(event);
  }

  isEnabled() {
    return !!this._observabilityAdapter;
  }
}

module.exports = { ObservabilityModule };
