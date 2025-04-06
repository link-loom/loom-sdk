class ObservabilityManager {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._namespace = '[Observability]::[Manager]';
    this._observabilityAdapter = null;
  }

  async setup() {
    const serverSettings = this._dependencies.config?.SETTINGS || {};
    const observabilitySettings = this._dependencies.config?.OBSERVABILITY || {};

    if (!serverSettings.USE_OBSERVABILITY) {
      this._console.info('Observability is disabled', {
        namespace: this._namespace,
      });
      return;
    }

    await this.#setupAdapter({ serverSettings, observabilitySettings });
  }

  async #setupAdapter({ serverSettings, observabilitySettings }) {
    const provider = serverSettings?.OBSERVABILITY_NAME || '';

    if (!provider) {
      this._dependencies.console?.info?.('No observability provider specified', { namespace: this._namespace });
      return;
    }

    if (!observabilitySettings) {
      this._dependencies.console?.info?.('No observability options specified', { namespace: this._namespace });
      return;
    }

    try {
      const ObservabilityProvider = require(`./observability-adapters/${provider}.adapter`).default;
      this._observabilityAdapter = new ObservabilityProvider(this._dependencies, observabilitySettings);
      await this._observabilityAdapter.setup?.();

      this._console.success('Observability manager loaded', { namespace: this._namespace });
    } catch (err) {
      this._dependencies.console?.error?.(`Failed to load observability provider "${provider}"`, { namespace: this._namespace });
    }
  }

  get client() {
    return this._observabilityAdapter || {};
  }

  async capture(event) {
    this._dependencies.console?.info?.(`Capturing event ${event?.title ?? event?.description ?? ''}`, { namespace: this._namespace });
    return this._observabilityAdapter?.capture?.(event);
  }

  isEnabled() {
    return !!this._observabilityAdapter;
  }
}

module.exports = { ObservabilityManager };
