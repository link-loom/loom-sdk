class ObservabilityModule {
  constructor({ dependencies, dependencyInjector }) {
    /* Base Properties */
    this._dependencyInjector = dependencyInjector;
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this._modules = this._dependencies.config?.behaviors;
    this._observabilityModule = this._modules?.observability || {};
    this._observabilityAdapter = null;

    /* Assigments */
    this._namespace = '[Observability]::[Module]';
  }

  async setup() {
    if (!this._observabilityModule?.enabled) {
      this._console.info('Observability module is disabled', {
        namespace: this._namespace,
      });
      return;
    }

    await this.#setupAdapter();
  }

  async #setupAdapter() {
    try {
      const observabilityProviderDefault = this._observabilityModule?.default || '';
      const observabilityProviders = observabilityBehavior?.providers || {};
      const observabilityProvider = observabilityProviders[observabilityProviderDefault] || {};

      if (!observabilityProvider?.settings) {
        this._console?.error?.('No observability settings specified', { namespace: this._namespace });
        return;
      }

      const ObservabilityProvider = require(`./observability-adapters/${observabilityProvider}.adapter`).default;
      this._observabilityAdapter = new ObservabilityProvider(this._dependencies, observabilityBehavior);
      await this._observabilityAdapter.setup?.();

      this._console?.success('Observability behavior loaded', { namespace: this._namespace });
    } catch (err) {
      this._console?.error?.(`Failed to load observability provider "${provider}"`, { namespace: this._namespace });
    }
  }

  get client() {
    return this._observabilityAdapter || {};
  }

  async capture(event) {
    this._console?.info?.(`Capturing event ${event?.title ?? event?.description ?? '...'}`, { namespace: this._namespace });
    return this._observabilityAdapter?.capture?.(event);
  }

  isEnabled() {
    return !!this._observabilityAdapter;
  }
}

module.exports = { ObservabilityModule };
