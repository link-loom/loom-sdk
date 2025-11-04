// src/adapters/apps/apps.module.js
/**
 * AppsModule
 * ==========
 * OS-oriented App runtime for Link Loom.
 *
 * Role
 * ----
 * Central orchestrator that manages the lifecycle of in-process Apps (long-lived workloads)
 * through explicit commands. It loads App classes (via manifest or programmatic registration),
 * creates instances (aliases), drives lifecycle transitions, exposes per-instance public APIs,
 * and dispatches OS-style signals to Apps.
 *
 * Identity Model
 * --------------
 * - App (Class): Business implementation (e.g., QrReaderApp).
 * - Instance (Alias): Concrete execution of an App (e.g., "qr_reader:default", "qr_reader:cam_02").
 * - Registry (In-Memory): Map<name, { AppClass, route, autostart, autostartMode, instances: Map<alias, AppInstance> }>
 * - Manifest (Optional): src/apps/index.js → [{ name, route, autostart?, autostartMode? }]
 *
 * Lifecycle (per Instance)
 * ------------------------
 * States:
 *   - INACTIVE           → Created, prepared, no active IO; entry state after spawn().
 *   - ACTIVE_FOREGROUND  → Fully active; can open streams/servers and use adapters with full priority.
 *   - ACTIVE_BACKGROUND  → Active in background mode; semantically active, typically lower priority
 *                          (actual throttling is a host concern; AppsModule only records the mode).
 *   - SUSPENDED          → IO released; instance is rehydratable; minimal footprint.
 *   - TERMINATING        → Graceful teardown in progress.
 *   - TERMINATED         → Instance removed from manager; no references remain.
 *   - CRASHED            → Terminal fault during a hook/transition; removed or left for inspection
 *                          according to host policy (AppsModule does not auto-restart).
 *
 * Transitions (Command-Driven)
 * ----------------------------
 * Command                                 Precondition                        Postcondition / Hook
 * ---------------------------------------------------------------------------------------------------------------
 * spawn(name, alias?, opts?)              App registered                      INACTIVE            + onCreate(ctx)?
 * activate(name, alias?, {mode})          INACTIVE | ACTIVE_*                 ACTIVE_*            + onActivate(mode, ctx)?
 * background(name, alias?)                INACTIVE | ACTIVE_*                 ACTIVE_BACKGROUND   + onActivate('background', ctx)?
 * foreground(name, alias?)                INACTIVE | ACTIVE_*                 ACTIVE_FOREGROUND   + onActivate('foreground', ctx)?
 * deactivate(name, alias?)                ACTIVE_*                            INACTIVE            + onDeactivate(ctx)?
 * suspend(name, alias?)                   Any (except TERMINATED)             SUSPENDED           + onSuspend(ctx)?
 * resume(name, alias?)                    SUSPENDED                           INACTIVE            + onResume(ctx)?
 * stop(name, alias?, {force?})            Any (if exists)                     TERMINATED          + onTerminate(ctx)? (skipped if force)
 * signal(name, alias?, sig, opts?)        Instance exists                     (no state change required) → onSignal(sig, ctx)?
 *
 * Orchestration Responsibilities
 * ------------------------------
 * - Validate preconditions and drive transitions on command.
 * - Invoke App hooks (if present) and, upon completion, update the instance state and timestamps.
 * - Maintain the registry, instance maps, and expose public APIs via api(name, alias).
 * - Dispatch signals with signal(name, alias, sig).
 * - Perform autostart at boot: spawn() + activate() using manifest { autostart, autostartMode }.
 *
 * What AppsModule Does NOT Do
 * ---------------------------
 * - It does not spawn threads/timers to “babysit” Apps.
 * - It does not implement resource heuristics (CPU/Memory) nor retry/backoff policies.
 * - It does not keep the process alive artificially; Apps/adapters must hold real OS handles if needed.
 *
 * App Contract (Hooks & Public API)
 * ---------------------------------
 * Optional hooks an App may implement (all async):
 *   onCreate(ctx)                         → called by spawn(); prepare lightweight state.
 *   onActivate(mode, ctx)                 → elevate to ACTIVE_*; open listeners/servers if required.
 *   onDeactivate(ctx)                     → reduce to INACTIVE; close activity but keep prepared.
 *   onSuspend(ctx)                        → release IO/resources; prepare for rehydration.
 *   onResume(ctx)                         → rehydrate state; remain INACTIVE until explicitly activated.
 *   onTerminate(ctx)                      → final cleanup before removal.
 *   onSignal(sig, ctx)                    → handle out-of-band system signals (e.g., SIGHUP).
 *
 * Public API (per instance):
 *   get api(): object | () => object      → returns a plain object of functions (already bound if needed).
 *                                           AppsModule returns this object via api(name, alias).
 *                                           Public API should not mutate lifecycle state directly—use AppsModule commands.
 *
 * Context (ctx) Provided to Hooks
 * -------------------------------
 *   {
 *     phase: 'create'|'activate'|'deactivate'|'suspend'|'resume'|'terminate'|'signal',
 *     name: string,                       // app name
 *     alias: string,                      // instance alias
 *     options: object,                    // command payload
 *     adapters: Dependencies,             // Loom adapters: bus, http, db, storage, crypto, devices, ...
 *     logger: ConsoleLike                 // unified logging interface from Loom
 *   }
 *
 * Public API of AppsModule
 * ------------------------
 *   register(name, AppClass, meta?)       → add AppClass to registry (meta: { autostart?, autostartMode? })
 *   spawn(name, alias?, opts?)            → create INACTIVE instance (+ onCreate)
 *   activate(name, alias?, {mode})        → move to ACTIVE_FOREGROUND/BACKGROUND (+ onActivate)
 *   background(name, alias?)              → sugar for activate(..., {mode:'background'})
 *   foreground(name, alias?)              → sugar for activate(..., {mode:'foreground'})
 *   deactivate(name, alias?)              → move ACTIVE_* → INACTIVE (+ onDeactivate)
 *   suspend(name, alias?)                 → move → SUSPENDED (+ onSuspend)
 *   resume(name, alias?)                  → SUSPENDED → INACTIVE (+ onResume)
 *   stop(name, alias?, {force?})          → remove instance; optional graceful onTerminate
 *   signal(name, alias?, sig, opts?)      → dispatch system signal to App
 *   status(name, alias?)                  → { state, createdAt, lastTransitionAt }
 *   list()                                → [{ name, instances: string[] }]
 *   api(name, alias?)                     → returns the App’s public API object for that instance
 *
 * Boot & Autostart
 * ----------------
 * 1) Load manifest (if present) and register apps (route → require(AppClass)).
 * 2) For entries with autostart=true: spawn(name), then activate(name, 'default', { mode: autostartMode || 'background' }).
 *
 * Concurrency & Scaling
 * ---------------------
 * - Multiple instances per App are supported via aliases.
 * - Cross-process or cross-node scaling is delegated to the deployment layer (PM2, containers, orchestration outside Loom).
 * - Apps should avoid global mutable state if they plan to run multiple instances.
 *
 * Error & Crash Semantics
 * -----------------------
 * - If a hook throws, the instance transitions to CRASHED and is removed (or left for inspection) according to host policy.
 * - Auto-restart/backoff is a host concern; AppsModule is intentionally policy-agnostic.
 */
const {
  ApplicationStateMachine,
  ApplicationStates,
  ApplicationEvents,
} = require('./app.state-machine');

class AppsModule {
  /**
   * @param {object} dependencies - Loom dependencies (console, path, config, adapters, etc.)
   *                                Must include { console, path, root } at minimum.
   */
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this._path = dependencies.path;
    this._root = dependencies.root;

    /* Assigments */
    this._namespace = '[Loom]::[Apps]';

    /** @type {Map<string, {name:string, route?:string, AppClass?:Function, autostart?:boolean, autostartMode?:'foreground'|'background', instances: Map<string, any>}>} */
    this._registry = new Map();
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });
    this.#loadManifest(); // optional (src/apps/index.js)
    this.#loadClassesFromRoutes();
    this.#autostartIfAny();
    this._console.success('Module loaded', { namespace: this._namespace });
  }

  // ---------------------------
  // Registry (read-only view)
  // ---------------------------

  /**
   * Returns a read-only snapshot of the registry.
   * @returns {Array<{name:string, route?:string, hasClass:boolean, autostart:boolean, autostartMode?:string, instances:string[]}>}
   */
  get registry() {
    const output = [];

    for (const [name, appRegistryEntry] of this._registry.entries()) {
      output.push({
        name,
        route: appRegistryEntry.route || null,
        hasClass: !!appRegistryEntry.AppClass,
        autostart: !!appRegistryEntry.autostart,
        autostartMode: appRegistryEntry.autostartMode || null,
        instances: Array.from((appRegistryEntry.instances || new Map()).keys()),
      });
    }
    return output;
  }

  // ---------------------------
  // Registration
  // ---------------------------

  /**
   * Registers an App class programmatically.
   * @param {string} name
   * @param {Function} AppClass
   * @param {{autostart?:boolean, autostartMode?:'foreground'|'background'}} [meta]
   */
  register(name, AppClass, meta = {}) {
    if (!name || !AppClass) {
      throw new Error('register(name, AppClass) requires valid arguments');
    }

    const entry = this._registry.get(name) || { name, instances: new Map() };
    entry.AppClass = AppClass;

    if (typeof meta.autostart === 'boolean') {
      entry.autostart = meta.autostart;
    }

    if (meta.autostartMode === 'foreground' || meta.autostartMode === 'background') {
      entry.autostartMode = meta.autostartMode;
    }

    if (!entry.instances) {
      entry.instances = new Map();
    }

    this._registry.set(name, entry);
    this._console.info(`Registered app: ${name}`, { namespace: this._namespace });
  }

  // ---------------------------
  // Lifecycle commands
  // ---------------------------

  /**
   * Creates an INACTIVE instance for an App.
   * Calls app.onCreate(ctx) if implemented.
   * @param {string} name
   * @param {string} [alias='default']
   * @param {object} [opts]
   */
  async spawn(name, alias = 'default', opts = {}) {
    const registryApp = this._registry.get(name);
    if (!registryApp?.AppClass) throw new Error(`App not found: ${name}`);
    if (registryApp.instances.has(alias)) return;

    const app = new registryApp.AppClass(this._dependencies);

    // Wire the state machine
    const stateMachine = new ApplicationStateMachine({
      app,
      name,
      alias,
      state: null, // before CREATE
      logger: this._console,
      makeContext: (phase, n, a, options) => this.#context(phase, n, a, options),
    });

    // Boot → INACTIVE (calls onCreate if present)
    await stateMachine.create(opts);

    const instance = {
      app,
      stateMachine,
      get state() { return stateMachine.state; },
      get createdAt() { return stateMachine.createdAt; },
      get lastTransitionAt() { return stateMachine.lastTransitionAt; },
    };

    registryApp.instances.set(alias, instance);
    this._registry.set(name, registryApp);

    this._console.success(`Spawned ${name}:${alias} -> ${instance.state}`, { namespace: this._namespace });
  }

  /**
   * Activates an instance in foreground/background.
   * Calls app.onActivate(mode, ctx) if implemented.
   * @param {string} name
   * @param {string} [alias='default']
   * @param {{mode?: 'foreground'|'background', reason?:string}} [opts]
   */
  async activate(name, alias = 'default', opts = {}) {
    const mode = opts.mode === 'background' ? 'background' : 'foreground';
    const instance = this.#instance(name, alias);

    if (mode === 'foreground') {
      await instance.stateMachine.activateForeground(opts);
    }
    else {
      await instance.stateMachine.activateBackground(opts);
    }

    this._console.success(`Activated ${name}:${alias} -> ${instance.state}`, { namespace: this._namespace });
  }

  /**
   * Moves an ACTIVE instance to INACTIVE.
   * Calls app.onDeactivate(ctx) if implemented.
   */
  async deactivate(name, alias = 'default', opts = {}) {
    const instance = this.#instance(name, alias);

    await instance.stateMachine.deactivate(opts);

    this._console.success(`Deactivated ${name}:${alias} -> ${instance.state}`, { namespace: this._namespace });
  }

  /**
   * Suspends an instance (must release IO). No timers involved.
   * Calls app.onSuspend(ctx) if implemented.
   */
  async suspend(name, alias = 'default', opts = {}) {
    const instance = this.#instance(name, alias);

    if (instance.state !== 'SUSPENDED') {
      await instance.stateMachine.suspend(opts);
    }

    this._console.success(`Suspended ${name}:${alias} -> ${instance.state}`, { namespace: this._namespace });
  }

  /**
   * Resumes a suspended instance to INACTIVE.
   * Calls app.onResume(ctx) if implemented.
   */
  async resume(name, alias = 'default', opts = {}) {
    const instance = this.#instance(name, alias);

    await instance.stateMachine.resume(opts);

    this._console.success(`Resumed ${name}:${alias} -> ${instance.state}`, { namespace: this._namespace });
  }

  /**
   * Terminates an instance. If `force:true`, drops the reference even if the App has no onTerminate().
   * Otherwise, calls app.onTerminate(ctx) if provided.
   */
  async stop(name, alias = 'default', opts = {}) {
    const { force = false } = opts;
    const appRegistry = this._registry.get(name);

    if (!appRegistry) {
      return;
    }

    const instance = appRegistry.instances.get(alias);

    if (!instance) {
      return;
    }

    // → TERMINATING
    await instance.stateMachine.stop({ force });

    // → TERMINATED
    await instance.stateMachine.stop();

    // drop reference after TERMINATED
    appRegistry.instances.delete(alias);
    this._registry.set(name, appRegistry);

    this._console.success(`Stopped ${name}:${alias} -> TERMINATED`, { namespace: this._namespace });
  }

  /**
   * Sends a signal to the App (if it implements onSignal()).
   * No timers. Pure event-driven interaction.
   */
  async signal(name, alias = 'default', sig = 'SIGHUP', opts = {}) {
    const instance = this.#instance(name, alias);

    // no state change by design
    await instance.stateMachine.signal(sig, opts);
  }

  // Convenience sugar
  async start(name, opts = {}) {
    return this.spawn(name, 'default', opts);
  }

  async background(name, alias = 'default', opts = {}) {
    return this.activate(name, alias, { ...opts, mode: 'background' });
  }
  
  async foreground(name, alias = 'default', opts = {}) {
    return this.activate(name, alias, { ...opts, mode: 'foreground' });
  }

  // ---------------------------
  // Introspection
  // ---------------------------

  /**
   * Returns a status snapshot for one instance.
   */
  status(name, alias = 'default') {
    const instance = this.#instance(name, alias);

    return {
      name,
      alias,
      state: instance.state,
      createdAt: instance.createdAt,
      lastTransitionAt: instance.lastTransitionAt,
    };
  }

  /**
   * Lists running instances grouped by app.
   */
  list() {
    const output = [];

    for (const [name, appRegistryEntry] of this._registry.entries()) {
      output.push({ name, instances: Array.from(appRegistryEntry.instances.keys()) });
    }

    return output;
  }

  /**
   * Returns the public API object defined by the App.
   * No deep-bind: the App is responsible for binding when exposing functions.
   */
  api(name, alias = 'default') {
    const instance = this.#instance(name, alias);
    const raw = instance.app?.api;

    return (typeof raw === 'function') ? raw.call(instance.app) : (raw || {});
  }

  // ---------------------------
  // Internals
  // ---------------------------

  #instance(name, alias = 'default') {
    const appRegistry = this._registry.get(name);
    const instance = appRegistry?.instances?.get(alias);

    if (!instance) {
      throw new Error(`App instance not running: ${name}:${alias}`);
    }

    return instance;
  }

  #loadManifest() {
    try {
      const manifestPath = this._path.join(this._root, 'src', 'apps', 'index');
      const appDefinitions = require(manifestPath);
      const appList = Array.isArray(appDefinitions) ? appDefinitions : (appDefinitions?.cache || []);

      for (const appDefinition of appList) {
        if (!appDefinition?.name) {
          continue;
        }
        const entry = this._registry.get(appDefinition.name) || { name: appDefinition.name, instances: new Map() };

        entry.route = appDefinition.route || entry.route;
        entry.autostart = !!appDefinition.autostart;

        if (appDefinition.autostartMode === 'foreground' || appDefinition.autostartMode === 'background') {
          entry.autostartMode = appDefinition.autostartMode;
        }

        this._registry.set(appDefinition.name, entry);
      }

      this._console.info('Apps manifest loaded', { namespace: this._namespace });
    } catch {
      this._console.info('No Apps manifest found (optional)', { namespace: this._namespace });
    }
  }

  #loadClassesFromRoutes() {
    for (const [name, appRegistryEntry] of this._registry.entries()) {
      try {
        if (appRegistryEntry.AppClass || !appRegistryEntry.route) {
          continue;
        }

        const pathname = this._path.join(this._root, 'src', appRegistryEntry.route);
        // eslint-disable-next-line import/no-dynamic-require, global-require
        const AppClass = require(pathname);

        appRegistryEntry.AppClass = AppClass;
        this._registry.set(name, appRegistryEntry);

        this._console.info(`Loaded AppClass for ${name}`, { namespace: this._namespace });
      } catch (err) {
        this._console.error(`Failed loading AppClass for ${name} from "${appRegistryEntry.route}"`, { namespace: this._namespace });
        this._console.log(err);
      }
    }
  }

  async #autostartIfAny() {
    for (const [name, appRegistryEntry] of this._registry.entries()) {
      try {
        if (!appRegistryEntry.autostart || !appRegistryEntry.AppClass) {
          continue;
        }

        const mode = appRegistryEntry.autostartMode || 'background';

        await this.spawn(name);
        await this.activate(name, 'default', { mode, reason: 'autostart' });
      } catch (err) {
        this._console.error(`Autostart failed for ${name} -> ${err?.message}`, { namespace: this._namespace });
      }
    }
  }

  #context(phase, name, alias, opts) {
    // Minimal context that resembles OS syscalls (no timers).
    return {
      phase,
      name,
      alias,
      options: opts || {},
      adapters: this._dependencies,       // access to IO providers, crypto, db, bus, http, etc.
      logger: this._dependencies.console, // consistent logging
    };
  }
}

module.exports = { AppsModule };
