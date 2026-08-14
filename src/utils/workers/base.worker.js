/**
 * BaseWorker
 * ==========
 * Lightweight base class for Link Loom Workers.
 *
 * Design
 * ------
 * - Keeps Loom dependency naming:
 *     this._dependencies, this._utilities, this._console, this._services, this._namespace
 * - Emits consistent pre/post logs using ConsoleModule (no extra wrappers).
 * - Exposes a virtual surface to override:
 *     setup, activateForeground, activateBackground, deactivate, suspend, resume, terminate, handleSignal
 * - Provides a simple public API mechanism via registerApi()/buildApi().
 *
 * FSM Integration
 * ---------------
 * WorkerStateMachine will call:
 *   - onCreate(ctx)      -> logs + setup(ctx)
 *   - onActivate(mode)   -> logs + (foreground/background)
 *   - onDeactivate(ctx)  -> logs + deactivate(ctx)
 *   - onSuspend(ctx)     -> logs + suspend(ctx)
 *   - onResume(ctx)      -> logs + resume(ctx)
 *   - onTerminate(ctx)   -> logs + terminate(ctx)
 *   - onSignal(sig,ctx)  -> logs + handleSignal(sig, ctx)
 *
 * API Contract
 * ------------
 * - Input: `ctx.options` contains the payload.
 * - Output: `activateBackground` should return a DTO `{ ok: boolean, data: any, errors?: any[] }`.
 *           Threaded Workers will automatically append `performance` metrics to this DTO.
 */

class BaseWorker {
  constructor(dependencies) {
    // Base Properties (Loom convention)
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._console = this._dependencies.console;
    this._services = this._dependencies.services;

    // Namespace (default to class name if not provided)
    this._namespace =
      this.constructor.namespace || `[Worker]::[${this.constructor.name}]`;

    // Public API holder
    this._api = null;
  }

  // -------------------------
  // Public API helpers
  // -------------------------
  registerApi(apiObject) {
    this._api = apiObject && typeof apiObject === 'object' ? apiObject : null;
    return this._api;
  }

  buildApi() {
    // Subclasses may override
    return {};
  }

  get api() {
    if (!this._api) this._api = this.buildApi();
    return this._api || {};
  }

  // -------------------------
  // Virtual lifecycle methods
  // -------------------------
  async setup(_ctx) {}
  async activateForeground(_ctx) {}
  async activateBackground(_ctx) {}
  async deactivate(_ctx) {}
  async suspend(_ctx) {}
  async resume(_ctx) {}
  async terminate(_ctx) {}
  async handleSignal(_sig, _ctx) {}

  // -------------------------
  // Defensive lifecycle logging
  // -------------------------
  // A lifecycle log must NEVER crash the worker. These adapters run OUTSIDE the
  // worker's own try/catch (which lives inside activateBackground), so if a
  // console call throws — e.g. serializing `ctx` (payload/options/adapters) with
  // circular refs or unserializable values, or a misconfigured console — that
  // throw escapes the hook and forces the FSM to CRASHED, masking the real
  // outcome even when activateBackground already succeeded. Swallow logging
  // errors so only genuine hook failures can affect state.
  #safeLog(level, message, meta) {
    try {
      this._console?.[level]?.(message, meta);
    } catch (_logError) {
      // The structured logger failed (e.g. a non-serializable ctx). Fall back to
      // a plain console so the event stays visible instead of vanishing. A plain
      // string console.log cannot throw, so no extra guard is needed.
      if (message) {
        // eslint-disable-next-line no-console
        console.log(`[${this._namespace}] ${level}: ${message}`);
      }
    }
  }

  // -------------------------
  // FSM Hook Adapters
  // (do not override; override the virtuals above)
  // -------------------------
  async onCreate(ctx) {
    this.#safeLog('info', 'onCreate:start', { namespace: this._namespace, ctx });
    await this.setup(ctx);
    this.#safeLog('success', 'onCreate:done', { namespace: this._namespace });
  }

  async onActivate(mode, ctx) {
    this.#safeLog('info', 'onActivate:start', {
      namespace: this._namespace,
      mode,
      ctx,
    });
    if (mode === 'foreground') {
      await this.activateForeground(ctx);
    } else {
      await this.activateBackground(ctx);
    }
    this.#safeLog('success', 'onActivate:done', {
      namespace: this._namespace,
      mode,
    });
  }

  async onDeactivate(ctx) {
    this.#safeLog('info', 'onDeactivate:start', {
      namespace: this._namespace,
      ctx,
    });
    await this.deactivate(ctx);
    this.#safeLog('success', 'onDeactivate:done', {
      namespace: this._namespace,
    });
  }

  async onSuspend(ctx) {
    this.#safeLog('info', 'onSuspend:start', { namespace: this._namespace, ctx });
    await this.suspend(ctx);
    this.#safeLog('success', 'onSuspend:done', { namespace: this._namespace });
  }

  async onResume(ctx) {
    this.#safeLog('info', 'onResume:start', { namespace: this._namespace, ctx });
    await this.resume(ctx);
    this.#safeLog('success', 'onResume:done', { namespace: this._namespace });
  }

  async onTerminate(ctx) {
    this.#safeLog('info', 'onTerminate:start', {
      namespace: this._namespace,
      ctx,
    });
    await this.terminate(ctx);
    this.#safeLog('success', 'onTerminate:done', {
      namespace: this._namespace,
    });
  }

  async onSignal(sig, ctx) {
    this.#safeLog('info', 'onSignal', { namespace: this._namespace, sig, ctx });
    await this.handleSignal(sig, ctx);
  }
}

module.exports = { BaseWorker };
