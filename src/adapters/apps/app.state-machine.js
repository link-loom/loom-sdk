// src/adapters/apps/app.state-machine.js

/**
 * ApplicationStateMachine
 * =======================
 * Deterministic, event-driven finite state machine (FSM) for a *single* App instance.
 * It orchestrates lifecycle transitions and delegates side-effects to the App hooks.
 *
 * Style & Conventions
 * -------------------
 * - Documentation in English (Link Loom standard).
 * - Clear class and symbol names (no cryptic abbreviations).
 * - No timers, no while-loops, no background ticks; transitions are command/event driven.
 *
 * States (per instance)
 * ---------------------
 *   INACTIVE           → Created & prepared; no active I/O.
 *   ACTIVE_FOREGROUND  → Fully active; foreground semantics.
 *   ACTIVE_BACKGROUND  → Active; background semantics.
 *   SUSPENDED          → I/O released; minimal footprint; rehydratable.
 *   TERMINATING        → Graceful teardown in progress.
 *   TERMINATED         → Final state; instance removed from manager.
 *   CRASHED            → Terminal fault during a hook/transition.
 *
 * Events (triggers)
 * -----------------
 *   CREATE                 → Bootstraps the instance (calls onCreate()).
 *   ACTIVATE_FOREGROUND    → Elevates to ACTIVE_FOREGROUND (calls onActivate('foreground')).
 *   ACTIVATE_BACKGROUND    → Elevates to ACTIVE_BACKGROUND (calls onActivate('background')).
 *   DEACTIVATE             → Drops ACTIVE_* → INACTIVE (calls onDeactivate()).
 *   SUSPEND                → Any non-terminal → SUSPENDED (calls onSuspend()).
 *   RESUME                 → SUSPENDED → INACTIVE (calls onResume()).
 *   STOP                   → Graceful termination (calls onTerminate() unless force).
 *   SIGNAL                 → Out-of-band signal passthrough (calls onSignal(sig)).
 *   FAIL                   → Forces CRASHED due to unrecoverable error.
 *
 * ASCII State Diagram
 * -------------------
 *
 *               +-----------------------------+
 *               |            CREATE           |
 *               v                             |
 *          +--------+   ACTIVATE_FOREGROUND   |
 *          |INACTIVE|-------------------------+-------------------+
 *          +--------+                          \                  |
 *             ^  ^                              \                 |
 *             |  | DEACTIVATE                    \ ACTIVATE_BG    |
 *     RESUME  |  |                                \               |
 *          +--+  |                                 v              |
 *          |     |                        +----------------+      |
 *          |     +------------------------|ACTIVE_FOREGROUND|<-----+
 *          |                              +----------------+      |
 *          | DEACTIVATE/                  ^          ^            |
 *          | SUSPEND                      |          |            |
 *          v                              |          |            |
 *     +-----------+                       |          |            |
 *     |SUSPENDED  |-----------------------+          |            |
 *     +-----------+           SUSPEND                |            |
 *          ^                                         |            |
 *          |                                         |            |
 *          |                                         |            |
 *          |                +----------------+       |            |
 *          +----------------|ACTIVE_BACKGROUND|------+            |
 *                           +----------------+                    |
 *                                   ^                             |
 *                                   |                             |
 *                                   +-----------------------------+
 *                                             DEACTIVATE
 *
 *   Any non-terminal --SUSPEND--> SUSPENDED
 *   Any non-terminal --STOP-----> TERMINATING --STOP--> TERMINATED
 *   Any non-terminal --FAIL-----> CRASHED
 *   SIGNAL does not change state; it just forwards to onSignal()
 *
 * Error Semantics
 * ---------------
 * - If any App hook throws, the FSM transitions to CRASHED.
 * - This module does NOT implement retries/backoff; that is a host policy concern.
 *
 * Integration Points
 * ------------------
 * - Constructed and owned by AppsModule per instance.
 * - AppsModule supplies `makeContext(phase, name, alias, options)` to build hook contexts.
 * - AppsModule persists `state/createdAt/lastTransitionAt` from this FSM as its single source of truth.
 */

const { EventEmitter } = require('node:events');

const ApplicationStates = Object.freeze({
  INACTIVE: 'INACTIVE',
  ACTIVE_FOREGROUND: 'ACTIVE_FOREGROUND',
  ACTIVE_BACKGROUND: 'ACTIVE_BACKGROUND',
  SUSPENDED: 'SUSPENDED',
  TERMINATING: 'TERMINATING',
  TERMINATED: 'TERMINATED',
  CRASHED: 'CRASHED',
});

const ApplicationEvents = Object.freeze({
  CREATE: 'CREATE',
  ACTIVATE_FOREGROUND: 'ACTIVATE_FOREGROUND',
  ACTIVATE_BACKGROUND: 'ACTIVATE_BACKGROUND',
  DEACTIVATE: 'DEACTIVATE',
  SUSPEND: 'SUSPEND',
  RESUME: 'RESUME',
  STOP: 'STOP',
  SIGNAL: 'SIGNAL',
  FAIL: 'FAIL',
});

/** Transition table: (from, on) → { to, effect(app, ctx) } */
const TRANSITIONS = new Map();

/** Helper to register a transition entry */
function T(from, on, to, effect) {
  TRANSITIONS.set(`${from ?? '∅'}::${on}`, { from, on, to, effect });
}

// Boot
T(null, ApplicationEvents.CREATE, ApplicationStates.INACTIVE, async (app, ctx) => {
  if (typeof app.onCreate === 'function') await app.onCreate(ctx);
});

// INACTIVE → ACTIVE_*
T(ApplicationStates.INACTIVE, ApplicationEvents.ACTIVATE_FOREGROUND, ApplicationStates.ACTIVE_FOREGROUND, async (app, ctx) => {
  if (typeof app.onActivate === 'function') await app.onActivate('foreground', ctx);
});
T(ApplicationStates.INACTIVE, ApplicationEvents.ACTIVATE_BACKGROUND, ApplicationStates.ACTIVE_BACKGROUND, async (app, ctx) => {
  if (typeof app.onActivate === 'function') await app.onActivate('background', ctx);
});

// ACTIVE_* → INACTIVE
for (const s of [ApplicationStates.ACTIVE_FOREGROUND, ApplicationStates.ACTIVE_BACKGROUND]) {
  T(s, ApplicationEvents.DEACTIVATE, ApplicationStates.INACTIVE, async (app, ctx) => {
    if (typeof app.onDeactivate === 'function') await app.onDeactivate(ctx);
  });
}

// Any non-terminal → SUSPENDED; SUSPENDED → INACTIVE
for (const s of [
  ApplicationStates.INACTIVE,
  ApplicationStates.ACTIVE_FOREGROUND,
  ApplicationStates.ACTIVE_BACKGROUND,
]) {
  T(s, ApplicationEvents.SUSPEND, ApplicationStates.SUSPENDED, async (app, ctx) => {
    if (typeof app.onSuspend === 'function') await app.onSuspend(ctx);
  });
}
T(ApplicationStates.SUSPENDED, ApplicationEvents.RESUME, ApplicationStates.INACTIVE, async (app, ctx) => {
  if (typeof app.onResume === 'function') await app.onResume(ctx);
});

// STOP lifecycle (two-step: TERMINATING → TERMINATED)
for (const s of [
  ApplicationStates.INACTIVE,
  ApplicationStates.ACTIVE_FOREGROUND,
  ApplicationStates.ACTIVE_BACKGROUND,
  ApplicationStates.SUSPENDED,
]) {
  T(s, ApplicationEvents.STOP, ApplicationStates.TERMINATING, async (app, ctx) => {
    const force = !!ctx?.options?.force;
    if (!force && typeof app.onTerminate === 'function') {
      await app.onTerminate(ctx);
    }
  });
}
T(ApplicationStates.TERMINATING, ApplicationEvents.STOP, ApplicationStates.TERMINATED, async (_app, _ctx) => { /* no-op */ });

// SIGNAL passthrough (no state change)
for (const s of [
  ApplicationStates.INACTIVE,
  ApplicationStates.ACTIVE_FOREGROUND,
  ApplicationStates.ACTIVE_BACKGROUND,
  ApplicationStates.SUSPENDED,
]) {
  T(s, ApplicationEvents.SIGNAL, s, async (app, ctx) => {
    const sig = ctx?.options?.sig || 'SIGHUP';
    if (typeof app.onSignal === 'function') await app.onSignal(sig, ctx);
  });
}

// FAIL → CRASHED (from any non-terminal)
for (const s of [
  ApplicationStates.INACTIVE,
  ApplicationStates.ACTIVE_FOREGROUND,
  ApplicationStates.ACTIVE_BACKGROUND,
  ApplicationStates.SUSPENDED,
  ApplicationStates.TERMINATING,
]) {
  T(s, ApplicationEvents.FAIL, ApplicationStates.CRASHED, async (_app, _ctx) => { /* no-op */ });
}

/**
 * ApplicationStateMachine
 * -----------------------
 * Orchestrates state transitions and invokes App hooks atomically per transition.
 */
class ApplicationStateMachine extends EventEmitter {
  /**
   * @param {object} params
   * @param {object} params.app                     - The concrete App instance (implements optional hooks).
   * @param {function(string,string,string,object):object} params.makeContext
   *        A function (phase, name, alias, options) => ctx, provided by AppsModule.
   * @param {Console} [params.logger=console]       - Logger with info/error.
   * @param {string} params.name                    - App name.
   * @param {string} params.alias                   - Instance alias.
   * @param {string|null} [params.state=null]       - Initial state (null before CREATE).
   */
  constructor({ app, makeContext, logger = console, name, alias, state = null }) {
    super();
    this.app = app;
    this.name = name;
    this.alias = alias;
    this.logger = logger;

    this.state = state; // null → before CREATE
    this.createdAt = Date.now();
    this.lastTransitionAt = Date.now();
  }

  /** Public helpers (semantic) */
  async create(options) { return this.transition(ApplicationEvents.CREATE, options); }
  async activateForeground(options) { return this.transition(ApplicationEvents.ACTIVATE_FOREGROUND, options); }
  async activateBackground(options) { return this.transition(ApplicationEvents.ACTIVATE_BACKGROUND, options); }
  async deactivate(options) { return this.transition(ApplicationEvents.DEACTIVATE, options); }
  async suspend(options) { return this.transition(ApplicationEvents.SUSPEND, options); }
  async resume(options) { return this.transition(ApplicationEvents.RESUME, options); }
  async stop(options) { return this.transition(ApplicationEvents.STOP, options); }
  async signal(sig, options) { return this.transition(ApplicationEvents.SIGNAL, { ...(options || {}), sig }); }
  async fail(options) { return this.transition(ApplicationEvents.FAIL, options); }

  /**
   * Core transition executor: validates (from,event), runs effect, updates state, emits audit.
   * @param {string} event
   * @param {object} [options]
   */
  async transition(event, options = {}) {
    const from = this.state;
    const key = `${from ?? '∅'}::${event}`;
    const entry = TRANSITIONS.get(key);

    // Allow TERMINATING --STOP--> TERMINATED as a second step
    if (!entry && from === ApplicationStates.TERMINATING && event === ApplicationEvents.STOP) {
      const last = TRANSITIONS.get(`${ApplicationStates.TERMINATING}::${ApplicationEvents.STOP}`);
      if (last) return this.#apply(last, options);
    }

    if (!entry) {
      throw new Error(`Invalid transition from "${from}" on "${event}"`);
    }
    return this.#apply(entry, options);
  }

  /** Internal entry apply with hook invocation and error → CRASHED semantics. */
  async #apply(entry, options) {
    const prev = this.state;
    const next = entry.to;
    const phase = inferPhase(entry.on);
    const ctx = this.#makeCtx(phase, options);

    try {
      if (entry.effect) {
        await entry.effect(this.app, ctx);
      }
      this.state = next;
      this.lastTransitionAt = Date.now();

      this.logger?.info?.(
        `[ApplicationStateMachine] ${this.name}:${this.alias} ${prev ?? '∅'} --${entry.on}→ ${next}`
      );
      this.emit('transition', { name: this.name, alias: this.alias, from: prev, on: entry.on, to: next, at: this.lastTransitionAt });
      return this.state;
    } catch (err) {
      // Any hook failure moves to CRASHED
      this.state = ApplicationStates.CRASHED;
      this.lastTransitionAt = Date.now();
      this.logger?.error?.(
        `[ApplicationStateMachine] ${this.name}:${this.alias} ${prev ?? '∅'} --${entry.on}→ CRASHED :: ${err?.message}`
      );
      this.emit('transition', { name: this.name, alias: this.alias, from: prev, on: entry.on, to: ApplicationStates.CRASHED, error: err });
      throw err;
    }
  }

  #makeCtx(phase, options) {
    // AppsModule provides the real context builder; keep signature stable.
    const makeContext = this._makeContext || this.makeContext;
    if (typeof makeContext === 'function') {
      return makeContext(phase, this.name, this.alias, options);
    }
    // Fallback minimal context (should not happen if wired correctly)
    return {
      phase,
      name: this.name,
      alias: this.alias,
      options: options || {},
      adapters: {},
      logger: console,
    };
  }

  /** Backward compatibility alias */
  get makeContext() { return this._makeContext; }
  set makeContext(fn) { this._makeContext = fn; }
}

/** Phase inference strictly for documentation/logging */
function inferPhase(event) {
  switch (event) {
    case ApplicationEvents.CREATE: return 'create';
    case ApplicationEvents.ACTIVATE_FOREGROUND:
    case ApplicationEvents.ACTIVATE_BACKGROUND: return 'activate';
    case ApplicationEvents.DEACTIVATE: return 'deactivate';
    case ApplicationEvents.SUSPEND: return 'suspend';
    case ApplicationEvents.RESUME: return 'resume';
    case ApplicationEvents.STOP: return 'terminate';
    case ApplicationEvents.SIGNAL: return 'signal';
    case ApplicationEvents.FAIL: return 'terminate';
    default: return 'unknown';
  }
}

module.exports = {
  ApplicationStateMachine,
  ApplicationStates,
  ApplicationEvents,
};
