// src/adapters/apps/apps.module.js
/**
 * AppsModule
 * ==========
 * OS-oriented in-process App runtime for Link Loom.
 *
 * What this is
 * ------------
 * A central orchestrator that manages the lifecycle of long-lived, in-process "Apps".
 * It exposes explicit commands (spawn/activate/deactivate/…/stop), hands a minimal OS-like
 * context to App hooks, and returns per-instance public APIs so that higher layers can
 * call business functions without touching lifecycle internals.
 *
 * Identity Model
 * --------------
 * - App (Class):    Business implementation (e.g., QrReaderApp).
 * - Instance:       A concrete execution of an App identified by an **alias** (string)
 *                   and a system-assigned **pid** (number). The pair (name, alias)
 *                   is unique within the process.
 * - Registry:       In-memory structure: Map<name, { AppClass, route?, autostart?, autostartMode?,
 *                   instances: Map<alias, AppInstance> }>.
 *
 * Instance Addressing & Indices
 * -----------------------------
 * This module maintains three O(1) indices to resolve instances quickly:
 * - _processIndex:       pid -> { name, alias }
 * - _instanceIndex:      `${name}:${alias}` -> pid
 * - _globalAliasIndex:   alias -> { name, alias }     // global convenience (may match multiple apps across time)
 *
 * Why three indices?
 * - By pid (process-like lookups): quick reverse resolution for ops triggered by numeric handles.
 * - By (name, alias): canonical identity inside AppsModule; used to disambiguate when
 *   several apps may reuse similar alias patterns.
 * - By alias (global): developer convenience for "just give me the alias". This allows
 *   terse calls like `getByAlias('worker-001')`, while still providing a stricter
 *   `getByNameAndAlias(name, alias)` when ambiguity is possible.
 *
 * Alias Policy
 * ------------
 * - If an alias is not provided on spawn, **the default alias equals the PID string**.
 *   This guarantees a globally unique, human-readable identifier without extra coordination.
 * - Apps can **rename** aliases at runtime via `getByAlias(...).setAlias(newAlias)` (or any
 *   equivalent handle). Renaming is atomic across all indices and validated for collisions:
 *     * unique per app (no duplicate alias for the same `name`)
 *     * unique globally (no duplicate in `_globalAliasIndex`)
 * - Auto-increment naming helpers (e.g., `autoAlias(name) -> name-001`) are still available
 *   if you prefer semantic aliases from the start.
 *
 * Lifecycle (per Instance)
 * ------------------------
 * States:
 *   - INACTIVE           → Created, prepared, no active IO; entry state after spawn().
 *   - ACTIVE_FOREGROUND  → Fully active; may hold listeners/servers, full priority (throttling is host concern).
 *   - ACTIVE_BACKGROUND  → Active but background semantics; lower priority (purely declarative here).
 *   - SUSPENDED          → IO released; rehydratable footprint.
 *   - TERMINATING        → Graceful teardown in progress.
 *   - TERMINATED         → Instance removed from registry; indices updated.
 *   - CRASHED            → Terminal fault during a hook/transition (no auto-restart here).
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
 * signal(name, alias?, sig, opts?)        Instance exists                     (no state change)  → onSignal(sig, ctx)?
 *
 * App Contract (Hooks & Public API)
 * ---------------------------------
 * Optional async hooks an App may implement:
 *   onCreate(ctx)                         → prepare lightweight state.
 *   onActivate(mode, ctx)                 → elevate to ACTIVE_*; open listeners/servers if required.
 *   onDeactivate(ctx)                     → reduce to INACTIVE; close activity while keeping prepared state.
 *   onSuspend(ctx)                        → release IO/resources; persist volatile state if needed.
 *   onResume(ctx)                         → rehydrate state; remains INACTIVE until explicitly activated.
 *   onTerminate(ctx)                      → final cleanup before removal.
 *   onSignal(sig, ctx)                    → handle out-of-band signals (e.g., SIGHUP).
 *
 * Public API (per Instance)
 * -------------------------
 *   get api(): object | () => object
 *     - Exposed to callers through `api(name, alias)` or convenience handles
 *       like `getByAlias(alias)` / `getByPid(pid)`.
 *     - MUST NOT mutate lifecycle directly—use AppsModule commands for that.
 *     - AppsModule returns the object as is (if function, it is invoked to obtain the object).
 *
 * Context (ctx) Provided to Hooks
 * -------------------------------
 *   {
 *     phase: 'create'|'activate'|'deactivate'|'suspend'|'resume'|'terminate'|'signal',
 *     name: string,           // app name
 *     alias: string,          // instance alias (default: String(pid))
 *     pid: number,            // stable numeric identifier for this instance
 *     options: object,        // command payload
 *     adapters: Dependencies, // Loom adapters: bus, http, db, storage, crypto, devices, ...
 *     logger: ConsoleLike     // unified logging interface from Loom
 *   }
 *
 * Public API of AppsModule
 * ------------------------
 *   register(name, AppClass, meta?)       → register the AppClass (meta: { autostart?, autostartMode? })
 *   spawn(name, alias?, opts?)            → create INACTIVE instance (+ onCreate)
 *   activate/background/foreground(...)   → move to ACTIVE_* (+ onActivate)
 *   deactivate(...)                       → ACTIVE_* → INACTIVE (+ onDeactivate)
 *   suspend/resume(...)                   → SUSPENDED <-> INACTIVE (+ onSuspend/onResume)
 *   stop(name, alias?, {force?})          → remove instance; cleanup indices; (+ onTerminate if not forced)
 *   signal(name, alias?, sig, opts?)      → dispatch system signal to App (no state change)
 *   status(name, alias?)                  → { name, alias, pid, state, createdAt, lastTransitionAt }
 *   list()                                → [{ name, instances: [{ alias, pid, state, ... }] }]
 *   api(name, alias?)                     → return instance public API (disambiguates when multiple aliases)
 *   call(name, alias, method, ...args)    → invoke a public API method by (name, alias)
 *   broadcast(name, method, ...args)      → invoke the API method across all instances of `name`
 *
 * Convenience Handles & PID Access
 * --------------------------------
 *   getByAlias(alias)                     → returns a Proxy of the public API (single match required)
 *   getByNameAndAlias(name, alias)        → returns a Proxy of the public API (explicit identity)
 *   getByPid(pid)                         → returns a Proxy of the public API (pid-based)
 *   getPid(name, alias)                   → returns the pid for (name, alias)
 *   statusByPid(pid)                      → status snapshot for pid
 *   callByPid(pid, method, ...args)       → invoke API method by pid
 *   stopByPid(pid, opts?)                 → stop instance by pid
 *
 * Chaining Alias Rename
 * ---------------------
 * Any API handle returned by `getByAlias(...)`, `getByNameAndAlias(...)`, or `getByPid(...)`
 * supports `setAlias(newAlias)` as a chainable utility:
 *   getByAlias('worker-001').setAlias('east-qr-01')
 *   getByPid(1042).setAlias('qr-cam-02')
 *
 * Boot & Autostart
 * ----------------
 * 1) Load manifest (if present) and register apps (route → require(AppClass)).
 * 2) For entries with autostart=true: spawn(name), then activate(name, <alias>, { mode: autostartMode || 'background' }).
 *    If no alias was passed to spawn, <alias> defaults to the pid string produced at creation time.
 *
 * Concurrency & Scaling
 * ---------------------
 * - Multiple instances per App are supported via aliases.
 * - Cross-process/node scaling is a deployment concern (PM2/containers/your orchestrator).
 * - Apps should avoid global mutable state if they plan to run multiple instances.
 *
 * Error & Crash Semantics
 * -----------------------
 * - If a hook throws, the instance may transition to CRASHED. This module does not auto-restart.
 * - Retry/backoff or resurrection policies should be enforced by the host/orchestrator layer.
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
     * - _processIndex: incremental counter: Unix-like (unique process)
     * - _instanceIndex: pid -> { name, alias }: app-level mapping
     * - _globalAliasIndex: `${name}:${alias}` -> pid: developer convenience
     */
    this._pidSeq = 1000;
    this._processIndex = new Map();
    this._instanceIndex = new Map();
    this._globalAliasIndex = new Map();

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
    } while (this._processIndex.has(this._pidSeq));
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
    if (!registryApp?.AppClass) {
      throw new Error(`App not found: ${name}`);
    }

    const pid = this.#nextPid();

    alias = (alias == null || alias === undefined) ? String(pid) : alias;

    if (registryApp.instances.has(alias)) {
      const pidExisting = this._instanceIndex.get(`${name}:${alias}`);
      return { alias, pid: pidExisting || null };
    }

    const app = new registryApp.AppClass(this._dependencies);

    const stateMachine = new ApplicationStateMachine({
      app,
      name,
      alias,
      state: null,
      logger: this._console,
      makeContext: (phase, n, a, options) => this.#context(phase, n, a, options, pid),
    });

    // Boot → INACTIVE
    await stateMachine.create(opts);

    const instance = {
      app,
      pid,
      stateMachine,
      get state() { return stateMachine.state; },
      get createdAt() { return stateMachine.createdAt; },
      get lastTransitionAt() { return stateMachine.lastTransitionAt; },
    };

    registryApp.instances.set(alias, instance);
    this._registry.set(name, registryApp);
    this._processIndex.set(pid, { name, alias });
    this._instanceIndex.set(`${name}:${alias}`, pid);

    this._globalAliasIndex.set(alias, { name, alias });

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
    const pid = this._instanceIndex.get(`${name}:${alias}`);
    if (pid) {
      this._instanceIndex.delete(`${name}:${alias}`);
      this._processIndex.delete(pid);
    }

    this._globalAliasIndex.delete(alias);

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
    const pid = this._instanceIndex.get(key);
    if (!pid) throw new Error(`No PID for ${key}`);
    return pid;
  }

  /**
   * Resolves structure by PID.
   * @private
   */
  #resolveByPid(pid) {
    const ref = this._processIndex.get(pid);
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

  getByAlias(alias) {
    const { name, alias: a, instance } = this.#resolveByAliasSingle(alias);
    return this.#makeApiHandle(name, a, instance);
  }

  getByPid(pid) {
    const { name, alias, instance } = this.#resolveByPid(pid);
    return this.#makeApiHandle(name, alias, instance);
  }

  getAliases(name) {
    const entry = this._registry.get(name);

    if (!entry) {
      return [];
    }

    return Array.from(entry.instances.keys());
  }
  listPids(name) {
    const entry = this._registry.get(name);

    if (!entry) {
      return [];
    }

    return Array.from(entry.instances.values()).map(i => i.pid);
  }

  // ADD: rename alias across all indexes and registry
  #renameAlias(name, oldAlias, newAlias) {
    if (!newAlias || typeof newAlias !== 'string') {
      throw new Error('newAlias must be a non-empty string');
    }
    if (newAlias === oldAlias) {
      const pidNoop = this._instanceIndex.get(`${name}:${oldAlias}`) || null;
      return { name, oldAlias, newAlias, pid: pidNoop, noop: true };
    }

    const entry = this._registry.get(name);
    if (!entry) throw new Error(`App not registered: ${name}`);

    const instance = entry.instances.get(oldAlias);
    if (!instance) throw new Error(`App instance not running: ${name}:${oldAlias}`);

    if (entry.instances.has(newAlias)) {
      throw new Error(`Alias already exists for app "${name}": ${newAlias}`);
    }
    if (this._globalAliasIndex.has(newAlias)) {
      throw new Error(`Alias is globally in use: ${newAlias}`);
    }

    const pid = this._instanceIndex.get(`${name}:${oldAlias}`);

    if (!pid) {
      throw new Error(`PID not found for ${name}:${oldAlias}`);
    }

    // Update registry map key
    entry.instances.delete(oldAlias);
    entry.instances.set(newAlias, instance);
    this._registry.set(name, entry);

    // Update reverse map (name:alias -> pid)
    this._instanceIndex.delete(`${name}:${oldAlias}`);
    this._instanceIndex.set(`${name}:${newAlias}`, pid);

    // Update pid -> { name, alias }
    const ref = this._processIndex.get(pid);
    if (ref) this._processIndex.set(pid, { name, alias: newAlias });

    // Update global alias index
    this._globalAliasIndex.delete(oldAlias);
    this._globalAliasIndex.set(newAlias, { name, alias: newAlias });

    this._console.success(`Renamed ${name}:${oldAlias} -> ${newAlias} [pid=${pid}]`, { namespace: this._namespace });

    return { name, oldAlias, newAlias, pid };
  }

  #makeApiHandle(name, alias, instance) {
    const raw = instance.app?.api;
    const api = (typeof raw === 'function') ? raw.call(instance.app) : (raw || {});
    const self = this;

    return new Proxy(api, {
      get(target, prop, receiver) {
        if (prop === 'setAlias') {
          // chaining: getByAlias(...).setAlias('new-alias')
          return function setAlias(newAlias) {
            return self.#renameAlias(name, alias, newAlias);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  #resolveByAliasSingle(alias) {
    const matches = this.#resolveByAlias(alias);
    if (matches.length !== 1) {
      throw new Error(`Alias "${alias}" is ambiguous across apps. Use getByNameAndAlias(name, alias).`);
    }
    return matches[0]; // { name, alias, instance }
  }

  getByNameAndAlias(name, alias) {
    const instance = this.#instance(name, alias);
    return this.#makeApiHandle(name, alias, instance);
  }

  #resolveByAlias(alias) {
    const matches = [];
    for (const [name, entry] of this._registry.entries()) {
      const inst = entry?.instances?.get(alias);
      if (inst) {
        matches.push({ name, alias, instance: inst });
      }
    }
    return matches;
  }
}

module.exports = { AppsModule };