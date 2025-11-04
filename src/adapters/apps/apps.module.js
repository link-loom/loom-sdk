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

    /**
     * Registry: name -> { AppClass?, route?, autostart?, autostartMode?, instances: Map<alias, Instance> }
     * Instance: { app, pid, stateMachine, getters }
     */
    this._registry = new Map();

    /**
     * PID indexes
     * -----------
     * - _pidSeq: incremental counter Unix style (unique process)
     * - _pidMap: pid -> { name, alias }
     * - _revMap: `${name}:${alias}` -> pid
     */
    this._pidSeq = 1000;
    this._pidMap = new Map();
    this._revMap = new Map();

    /**
     * Auto-incremental alias per app
     * name -> counter (generate worker-001, worker-002, ...)
     */
    this._aliasSeq = new Map();
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    this.#loadManifest();
    this.#loadClassesFromRoutes();
    this.#autostartIfAny();

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  // ---------------------------
  // Registry (read-only view)
  // ---------------------------

  /**
   * Returns a read-only snapshot of the registry with pid por instancia.
   * @returns {Array<{name:string, route?:string, hasClass:boolean, autostart:boolean, autostartMode?:string, instances:Array<{alias:string, pid:number}>}>}
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
        instances: Array.from((appRegistryEntry.instances || new Map()).entries())
          .map(([alias, inst]) => ({ alias, pid: inst?.pid || null })),
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
   * Automatically generates an alias if one is not provided. One counter per app.
   */
  autoAlias(name) {
    const n = (this._aliasSeq.get(name) || 0) + 1;
    this._aliasSeq.set(name, n);
    return `${name}-${String(n).padStart(3, '0')}`;
  }

  /**
   * Generates a unique PID per process.
   */
  #nextPid() {
    do {
      this._pidSeq += 1;
    } while (this._pidMap.has(this._pidSeq));
    return this._pidSeq;
  }

  /**
   * Create an INACTIVE instance per App.
   * Returns { alias, pid }.
   * @param {string} name
   * @param {string|null} [alias=null]  // if null -> autogenerated
   * @param {object} [opts]
   */
  async spawn(name, alias = null, opts = {}) {
    const registryApp = this._registry.get(name);
    if (!registryApp?.AppClass) throw new Error(`App not found: ${name}`);

    // Auto-generated alias if it doesn't arrive
    alias = alias || this.autoAlias(name);

    if (registryApp.instances.has(alias)) {
      // It already exists: we return existing identifiers
      const pidExisting = this._revMap.get(`${name}:${alias}`);
      return { alias, pid: pidExisting || null };
    }

    const app = new registryApp.AppClass(this._dependencies);
    const pid = this.#nextPid();

    // Wire the state machine
    const stateMachine = new ApplicationStateMachine({
      app,
      name,
      alias,
      state: null, // before CREATE
      logger: this._console,
      makeContext: (phase, n, a, options) => this.#context(phase, n, a, options, pid),
    });

    // Boot → INACTIVE (calls onCreate if present)
    await stateMachine.create(opts);

    const instance = {
      app,
      pid,
      stateMachine,
      get state() { return stateMachine.state; },
      get createdAt() { return stateMachine.createdAt; },
      get lastTransitionAt() { return stateMachine.lastTransitionAt; },
    };

    // Register in memory
    registryApp.instances.set(alias, instance);
    this._registry.set(name, registryApp);

    // Index PID<->(name,alias)
    this._pidMap.set(pid, { name, alias });
    this._revMap.set(`${name}:${alias}`, pid);

    this._console.success(`Spawned ${name}:${alias} [pid=${pid}] -> ${instance.state}`, { namespace: this._namespace });
    return { alias, pid };
  }

  /**
   * Activate an instance in foreground/background.
   * @param {string} name
   * @param {string} [alias]
   * @param {{mode?: 'foreground'|'background', reason?:string}} [opts]
   */
  async activate(name, alias = 'default', opts = {}) {
    const mode = opts.mode === 'background' ? 'background' : 'foreground';
    const instance = this.#instance(name, alias);

    if (mode === 'foreground') {
      await instance.stateMachine.activateForeground(opts);
    } else {
      await instance.stateMachine.activateBackground(opts);
    }

    this._console.success(
      `Activated ${name}:${alias} [pid=${instance.pid}] -> ${instance.state}`,
      { namespace: this._namespace }
    );
  }

  /**
   * Moves an ACTIVE instance to INACTIVE.
   */
  async deactivate(name, alias = 'default', opts = {}) {
    const instance = this.#instance(name, alias);

    await instance.stateMachine.deactivate(opts);

    this._console.success(
      `Deactivated ${name}:${alias} [pid=${instance.pid}] -> ${instance.state}`,
      { namespace: this._namespace }
    );
  }

  /**
   * Suspends an instance (must release IO).
   */
  async suspend(name, alias = 'default', opts = {}) {
    const instance = this.#instance(name, alias);

    if (instance.state !== 'SUSPENDED') {
      await instance.stateMachine.suspend(opts);
    }

    this._console.success(
      `Suspended ${name}:${alias} [pid=${instance.pid}] -> ${instance.state}`,
      { namespace: this._namespace }
    );
  }

  /**
   * Resumes a suspended instance to INACTIVE.
   */
  async resume(name, alias = 'default', opts = {}) {
    const instance = this.#instance(name, alias);

    await instance.stateMachine.resume(opts);

    this._console.success(
      `Resumed ${name}:${alias} [pid=${instance.pid}] -> ${instance.state}`,
      { namespace: this._namespace }
    );
  }

  /**
   * Terminates an instance. If `force:true`, drops the reference even if the App has no onTerminate().
   * Otherwise, calls app.onTerminate(ctx) if provided.
   */
  async stop(name, alias = 'default', opts = {}) {
    const { force = false } = opts;
    const appRegistry = this._registry.get(name);
    if (!appRegistry) return;

    const instance = appRegistry.instances.get(alias);
    if (!instance) return;

    // → TERMINATING
    await instance.stateMachine.stop({ force });

    // → TERMINATED
    await instance.stateMachine.stop();

    // drop reference after TERMINATED
    appRegistry.instances.delete(alias);
    this._registry.set(name, appRegistry);

    // Clean PID
    const pid = this._revMap.get(`${name}:${alias}`);
    if (pid) {
      this._revMap.delete(`${name}:${alias}`);
      this._pidMap.delete(pid);
    }

    this._console.success(`Stopped ${name}:${alias} [pid=${pid}] -> TERMINATED`, { namespace: this._namespace });
  }

  /**
   * Sends a signal to the App (if it implements onSignal()).
   * It does not change state.
   */
  async signal(name, alias = 'default', sig = 'SIGHUP', opts = {}) {
    const instance = this.#instance(name, alias);

    // no state change by design
    await instance.stateMachine.signal(sig, opts);
  }

  // ---------------------------
  // Conveniences / helpers
  // ---------------------------
  async start(name, opts = {}) {
    return this.spawn(name, 'default', opts);
  }

  async background(name, alias = 'default', opts = {}) {
    return this.activate(name, alias, { ...opts, mode: 'background' });
  }

  async foreground(name, alias = 'default', opts = {}) {
    return this.activate(name, alias, { ...opts, mode: 'foreground' });
  }

  /**
   * Returns a status snapshot for one instance (by alias).
   */
  status(name, alias = 'default') {
    const instance = this.#instance(name, alias);

    return {
      name,
      alias,
      pid: instance.pid,
      state: instance.state,
      createdAt: instance.createdAt,
      lastTransitionAt: instance.lastTransitionAt,
    };
  }

  /**
   * Lists running instances grouped by app (includes pid).
   */
  list() {
    const output = [];

    for (const [name, appRegistryEntry] of this._registry.entries()) {
      const instances = [];
      for (const [alias, inst] of appRegistryEntry.instances.entries()) {
        instances.push({
          alias,
          pid: inst.pid,
          state: inst.state,
          createdAt: inst.createdAt,
          lastTransitionAt: inst.lastTransitionAt,
        });
      }
      output.push({ name, instances });
    }

    return output;
  }

  /**
   * Returns the public API object defined by the App (by alias).
   * If there are multiple instances and you don't pass aliases → throws an error (disambiguation).
   */
  api(name, alias = undefined) {
    const entry = this._registry.get(name);
    if (!entry) throw new Error(`App not registered: ${name}`);

    const aliases = Array.from(entry.instances.keys());
    if (aliases.length === 0) throw new Error(`No instances running for: ${name}`);

    let targetAlias = alias;
    if (!targetAlias) {
      if (aliases.length === 1) targetAlias = aliases[0];
      else throw new Error(`Multiple instances for "${name}". Use alias or pid. Available: ${aliases.join(', ')}`);
    }

    const instance = entry.instances.get(targetAlias);
    if (!instance) throw new Error(`App instance not running: ${name}:${targetAlias}`);

    const raw = instance.app?.api;
    return (typeof raw === 'function') ? raw.call(instance.app) : (raw || {});
  }

  /**
   * Invoke a public API method by alias.
   */
  call(name, alias, method, ...args) {
    const api = this.api(name, alias);
    const fn = api?.[method];
    if (typeof fn !== 'function') {
      throw new Error(`API method not found: ${name}:${alias} :: ${method}()`);
    }
    return fn(...args);
  }

  /**
   * Broadcast: invokes an API method on all instances of an App.
   * Returns [{ alias, pid, ok, value?, error? }]
   */
  broadcast(name, method, ...args) {
    const entry = this._registry.get(name);
    if (!entry) throw new Error(`App not registered: ${name}`);

    const results = [];
    for (const [alias, inst] of entry.instances.entries()) {
      try {
        const api = this.api(name, alias);
        const fn = api?.[method];
        if (typeof fn !== 'function') throw new Error(`API method not found: ${method}()`);
        const value = fn(...args);
        results.push({ alias, pid: inst.pid, ok: true, value });
      } catch (err) {
        results.push({ alias, pid: inst.pid, ok: false, error: err?.message || String(err) });
      }
    }
    return results;
  }

  // ---------------------------
  // PID-based accessors
  // ---------------------------

  /**
   * Gets PID by (name, alias).
   */
  getPid(name, alias) {
    const key = `${name}:${alias}`;
    const pid = this._revMap.get(key);
    if (!pid) throw new Error(`No PID for ${key}`);
    return pid;
  }

  /**
   * Resolves structure by PID.
   * @private
   */
  #resolveByPid(pid) {
    const ref = this._pidMap.get(pid);
    if (!ref) throw new Error(`PID not found: ${pid}`);
    const appRegistry = this._registry.get(ref.name);
    const instance = appRegistry?.instances?.get(ref.alias);
    if (!instance) throw new Error(`Instance not found for PID ${pid} (${ref.name}:${ref.alias})`);
    return { ...ref, instance };
  }

  /**
   * Returns API by PID.
   */
  apiByPid(pid) {
    const { instance } = this.#resolveByPid(pid);
    const raw = instance.app?.api;
    return (typeof raw === 'function') ? raw.call(instance.app) : (raw || {});
  }

  /**
   * Invoke API method by PID.
   */
  callByPid(pid, method, ...args) {
    const api = this.apiByPid(pid);
    const fn = api?.[method];
    if (typeof fn !== 'function') {
      throw new Error(`API method not found: pid=${pid} :: ${method}()`);
    }
    return fn(...args);
  }

  /**
   * Status per PID.
   */
  statusByPid(pid) {
    const { name, alias, instance } = this.#resolveByPid(pid);
    return {
      name,
      alias,
      pid,
      state: instance.state,
      createdAt: instance.createdAt,
      lastTransitionAt: instance.lastTransitionAt,
    };
  }

  /**
   * Stop per PID.
   */
  async stopByPid(pid, opts = {}) {
    const { name, alias } = this.#resolveByPid(pid);
    return this.stop(name, alias, opts);
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

        const { alias } = await this.spawn(name); // autogenera alias
        await this.activate(name, alias, { mode, reason: 'autostart' });
      } catch (err) {
        this._console.error(`Autostart failed for ${name} -> ${err?.message}`, { namespace: this._namespace });
      }
    }
  }

  #context(phase, name, alias, opts, pid) {
    // Minimal context that resembles OS syscalls (no timers).
    return {
      phase,
      name,
      alias,
      pid, // ← PID available on all hooks
      options: opts || {},
      adapters: this._dependencies, // access to IO providers, crypto, db, bus, http, etc.
      logger: this._dependencies.console, // consistent logging
    };
  }
}

module.exports = { AppsModule };