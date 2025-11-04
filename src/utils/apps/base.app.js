/**
 * BaseApp
 * =======
 * Lightweight base class for Link Loom Apps.
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
 * ApplicationStateMachine will call:
 *   - onCreate(ctx)      -> logs + setup(ctx)
 *   - onActivate(mode)   -> logs + (foreground/background)
 *   - onDeactivate(ctx)  -> logs + deactivate(ctx)
 *   - onSuspend(ctx)     -> logs + suspend(ctx)
 *   - onResume(ctx)      -> logs + resume(ctx)
 *   - onTerminate(ctx)   -> logs + terminate(ctx)
 *   - onSignal(sig,ctx)  -> logs + handleSignal(sig, ctx)
 */

class BaseApp {
    constructor(dependencies) {
        // Base Properties (Loom convention)
        this._dependencies = dependencies;
        this._utilities = this._dependencies.utilities;
        this._console = this._dependencies.console;
        this._services = this._dependencies.services;

        // Namespace (default to class name if not provided)
        this._namespace = this.constructor.namespace || `[App]::[${this.constructor.name}]`;

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
    async setup(_ctx) { }
    async activateForeground(_ctx) { }
    async activateBackground(_ctx) { }
    async deactivate(_ctx) { }
    async suspend(_ctx) { }
    async resume(_ctx) { }
    async terminate(_ctx) { }
    async handleSignal(_sig, _ctx) { }

    // -------------------------
    // FSM Hook Adapters
    // (do not override; override the virtuals above)
    // -------------------------
    async onCreate(ctx) {
        this._console.info('onCreate:start', { namespace: this._namespace, ctx });
        await this.setup(ctx);
        this._console.success('onCreate:done', { namespace: this._namespace });
    }

    async onActivate(mode, ctx) {
        this._console.info('onActivate:start', { namespace: this._namespace, mode, ctx });
        if (mode === 'foreground') {
            await this.activateForeground(ctx);
        } else {
            await this.activateBackground(ctx);
        }
        this._console.success('onActivate:done', { namespace: this._namespace, mode });
    }

    async onDeactivate(ctx) {
        this._console.info('onDeactivate:start', { namespace: this._namespace, ctx });
        await this.deactivate(ctx);
        this._console.success('onDeactivate:done', { namespace: this._namespace });
    }

    async onSuspend(ctx) {
        this._console.info('onSuspend:start', { namespace: this._namespace, ctx });
        await this.suspend(ctx);
        this._console.success('onSuspend:done', { namespace: this._namespace });
    }

    async onResume(ctx) {
        this._console.info('onResume:start', { namespace: this._namespace, ctx });
        await this.resume(ctx);
        this._console.success('onResume:done', { namespace: this._namespace });
    }

    async onTerminate(ctx) {
        this._console.info('onTerminate:start', { namespace: this._namespace, ctx });
        await this.terminate(ctx);
        this._console.success('onTerminate:done', { namespace: this._namespace });
    }

    async onSignal(sig, ctx) {
        this._console.info('onSignal', { namespace: this._namespace, sig, ctx });
        await this.handleSignal(sig, ctx);
    }
}

module.exports = { BaseApp };
