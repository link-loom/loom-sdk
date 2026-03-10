// src/adapters/workers/worker.state-machine.js

/**
 * WorkerStateMachine
 * ==================
 * Deterministic, event-driven finite state machine (FSM) for a *single* Worker instance.
 * It orchestrates lifecycle transitions and delegates side-effects to the Worker hooks.
 *
 * Style & Conventions
 * -------------------
 * - Documentation in English (Link Loom standard).
 * - Clear class and symbol names (no cryptic abbreviations).
 * - No timers, no while-loops, no background ticks; transitions are command/event driven.
 *
 * States (per instance)
 * ---------------------
 *   INACTIVE           -> Created & prepared; no active I/O.
 *   ACTIVE_FOREGROUND  -> Fully active; foreground semantics.
 *   ACTIVE_BACKGROUND  -> Active; background semantics.
 *   SUSPENDED          -> I/O released; minimal footprint; rehydratable.
 *   TERMINATING        -> Graceful teardown in progress.
 *   TERMINATED         -> Final state; instance removed from manager.
 *   CRASHED            -> Terminal fault during a hook/transition.
 *
 * Events (triggers)
 * -----------------
 *   CREATE                 -> Bootstraps the instance (calls onCreate()).
 *   ACTIVATE_FOREGROUND    -> Elevates to ACTIVE_FOREGROUND (calls onActivate('foreground')).
 *   ACTIVATE_BACKGROUND    -> Elevates to ACTIVE_BACKGROUND (calls onActivate('background')).
 *   DEACTIVATE             -> Drops ACTIVE_* -> INACTIVE (calls onDeactivate()).
 *   SUSPEND                -> Any non-terminal -> SUSPENDED (calls onSuspend()).
 *   RESUME                 -> SUSPENDED -> INACTIVE (calls onResume()).
 *   STOP                   -> Graceful termination (calls onTerminate() unless force).
 *   SIGNAL                 -> Out-of-band signal passthrough (calls onSignal(sig)).
 *   FAIL                   -> Forces CRASHED due to unrecoverable error.
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
 * - If any Worker hook throws, the FSM transitions to CRASHED.
 * - This module does NOT implement retries/backoff; that is a host policy concern.
 *
 * Integration Points
 * ------------------
 * - Constructed and owned by WorkersModule per instance.
 * - WorkersModule supplies `makeContext(phase, name, alias, options)` to build hook contexts.
 * - WorkersModule persists `state/createdAt/lastTransitionAt` from this FSM as its single source of truth.
 */

const { EventEmitter } = require('node:events');

const WorkerStates = Object.freeze({
  INACTIVE: 'INACTIVE',
  ACTIVE_FOREGROUND: 'ACTIVE_FOREGROUND',
  ACTIVE_BACKGROUND: 'ACTIVE_BACKGROUND',
  SUSPENDED: 'SUSPENDED',
  TERMINATING: 'TERMINATING',
  TERMINATED: 'TERMINATED',
  CRASHED: 'CRASHED',
});

const WorkerEvents = Object.freeze({
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

/** Transition table: (from, on) -> { to, effect(app, ctx) } */
const TRANSITIONS = new Map();

/** Helper to register a transition entry */
function T(from, on, to, effect) {
  TRANSITIONS.set(`${from ?? '∅'}::${on}`, { from, on, to, effect });
}

// Boot
T(
  null,
  WorkerEvents.CREATE,
  WorkerStates.INACTIVE,
  async (app, ctx) => {
    if (typeof app.onCreate === 'function') await app.onCreate(ctx);
  },
);

// INACTIVE -> ACTIVE_*
T(
  WorkerStates.INACTIVE,
  WorkerEvents.ACTIVATE_FOREGROUND,
  WorkerStates.ACTIVE_FOREGROUND,
  async (app, ctx) => {
    if (typeof app.onActivate === 'function')
      await app.onActivate('foreground', ctx);
  },
);
T(
  WorkerStates.INACTIVE,
  WorkerEvents.ACTIVATE_BACKGROUND,
  WorkerStates.ACTIVE_BACKGROUND,
  async (app, ctx) => {
    if (typeof app.onActivate === 'function')
      await app.onActivate('background', ctx);
  },
);

// ACTIVE_* -> INACTIVE
for (const s of [
  WorkerStates.ACTIVE_FOREGROUND,
  WorkerStates.ACTIVE_BACKGROUND,
]) {
  T(
    s,
    WorkerEvents.DEACTIVATE,
    WorkerStates.INACTIVE,
    async (app, ctx) => {
      if (typeof app.onDeactivate === 'function') await app.onDeactivate(ctx);
    },
  );
}

// Any non-terminal -> SUSPENDED; SUSPENDED -> INACTIVE
for (const s of [
  WorkerStates.INACTIVE,
  WorkerStates.ACTIVE_FOREGROUND,
  WorkerStates.ACTIVE_BACKGROUND,
]) {
  T(
    s,
    WorkerEvents.SUSPEND,
    WorkerStates.SUSPENDED,
    async (app, ctx) => {
      if (typeof app.onSuspend === 'function') await app.onSuspend(ctx);
    },
  );
}
T(
  WorkerStates.SUSPENDED,
  WorkerEvents.RESUME,
  WorkerStates.INACTIVE,
  async (app, ctx) => {
    if (typeof app.onResume === 'function') await app.onResume(ctx);
  },
);

// STOP lifecycle (two-step: TERMINATING -> TERMINATED)
for (const s of [
  WorkerStates.INACTIVE,
  WorkerStates.ACTIVE_FOREGROUND,
  WorkerStates.ACTIVE_BACKGROUND,
  WorkerStates.SUSPENDED,
]) {
  T(
    s,
    WorkerEvents.STOP,
    WorkerStates.TERMINATING,
    async (app, ctx) => {
      const force = !!ctx?.options?.force;
      if (!force && typeof app.onTerminate === 'function') {
        await app.onTerminate(ctx);
      }
    },
  );
}
T(
  WorkerStates.TERMINATING,
  WorkerEvents.STOP,
  WorkerStates.TERMINATED,
  async (_app, _ctx) => {
    /* no-op */
  },
);

// SIGNAL passthrough (no state change)
for (const s of [
  WorkerStates.INACTIVE,
  WorkerStates.ACTIVE_FOREGROUND,
  WorkerStates.ACTIVE_BACKGROUND,
  WorkerStates.SUSPENDED,
]) {
  T(s, WorkerEvents.SIGNAL, s, async (app, ctx) => {
    const sig = ctx?.options?.sig || 'SIGHUP';
    if (typeof app.onSignal === 'function') await app.onSignal(sig, ctx);
  });
}

// FAIL -> CRASHED (from any non-terminal)
for (const s of [
  WorkerStates.INACTIVE,
  WorkerStates.ACTIVE_FOREGROUND,
  WorkerStates.ACTIVE_BACKGROUND,
  WorkerStates.SUSPENDED,
  WorkerStates.TERMINATING,
]) {
  T(
    s,
    WorkerEvents.FAIL,
    WorkerStates.CRASHED,
    async (_app, _ctx) => {
      /* no-op */
    },
  );
}

/**
 * WorkerStateMachine
 * ------------------
 * Orchestrates state transitions and invokes Worker hooks atomically per transition.
 */
class WorkerStateMachine extends EventEmitter {
  /**
   * @param {object} params
   * @param {object} params.app                     - The concrete Worker instance (implements optional hooks).
   * @param {function(string,string,string,object):object} params.makeContext
   *        A function (phase, name, alias, options) => ctx, provided by WorkersModule.
   * @param {Console} [params.logger=console]       - Logger with info/error.
   * @param {string} params.name                    - Worker name.
   * @param {string} params.alias                   - Instance alias.
   * @param {string|null} [params.state=null]       - Initial state (null before CREATE).
   */
  constructor(dependencies) {
    super();

    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this.app = dependencies.app;
    this.name = dependencies.name;
    this.alias = dependencies.alias;

    this.state = dependencies.state; // null -> before CREATE
    this.createdAt = Date.now();
    this.lastTransitionAt = Date.now();

    /* Assigments */
    this._namespace = `[Loom]::[Workers]::[${this._name}:${this._alias}]`;
  }

  /** Public helpers (semantic) */
  async create(options) {
    return this.transition(WorkerEvents.CREATE, options);
  }
  async activateForeground(options) {
    return this.transition(WorkerEvents.ACTIVATE_FOREGROUND, options);
  }
  async activateBackground(options) {
    return this.transition(WorkerEvents.ACTIVATE_BACKGROUND, options);
  }
  async deactivate(options) {
    return this.transition(WorkerEvents.DEACTIVATE, options);
  }
  async suspend(options) {
    return this.transition(WorkerEvents.SUSPEND, options);
  }
  async resume(options) {
    return this.transition(WorkerEvents.RESUME, options);
  }
  async stop(options) {
    return this.transition(WorkerEvents.STOP, options);
  }
  async signal(sig, options) {
    return this.transition(WorkerEvents.SIGNAL, {
      ...(options || {}),
      sig,
    });
  }
  async fail(options) {
    return this.transition(WorkerEvents.FAIL, options);
  }

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
    if (
      !entry &&
      from === WorkerStates.TERMINATING &&
      event === WorkerEvents.STOP
    ) {
      const last = TRANSITIONS.get(
        `${WorkerStates.TERMINATING}::${WorkerEvents.STOP}`,
      );
      if (last) return this.#apply(last, options);
    }

    if (!entry) {
      throw new Error(`Invalid transition from "${from}" on "${event}"`);
    }
    return this.#apply(entry, options);
  }

  /** Internal entry apply with hook invocation and error -> CRASHED semantics. */
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
        `[WorkerStateMachine] ${this.name}:${this.alias} ${prev ?? '∅'} --${entry.on}-> ${next}`,
        { namespace: this._namespace },
      );
      this.emit('transition', {
        name: this.name,
        alias: this.alias,
        from: prev,
        on: entry.on,
        to: next,
        at: this.lastTransitionAt,
      });
      return this.state;
    } catch (err) {
      // Any hook failure moves to CRASHED
      this.state = WorkerStates.CRASHED;
      this.lastTransitionAt = Date.now();
      this.logger?.error?.(
        `[WorkerStateMachine] ${this.name}:${this.alias} ${prev ?? '∅'} --${entry.on}-> CRASHED :: ${err?.message}`,
        { namespace: this._namespace },
      );
      this.emit('transition', {
        name: this.name,
        alias: this.alias,
        from: prev,
        on: entry.on,
        to: WorkerStates.CRASHED,
        error: err,
      });
      throw err;
    }
  }

  #makeCtx(phase, options) {
    // WorkersModule provides the real context builder; keep signature stable.
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
  get makeContext() {
    return this._makeContext;
  }
  set makeContext(fn) {
    this._makeContext = fn;
  }
}

/** Phase inference strictly for documentation/logging */
function inferPhase(event) {
  switch (event) {
    case WorkerEvents.CREATE:
      return 'create';
    case WorkerEvents.ACTIVATE_FOREGROUND:
    case WorkerEvents.ACTIVATE_BACKGROUND:
      return 'activate';
    case WorkerEvents.DEACTIVATE:
      return 'deactivate';
    case WorkerEvents.SUSPEND:
      return 'suspend';
    case WorkerEvents.RESUME:
      return 'resume';
    case WorkerEvents.STOP:
      return 'terminate';
    case WorkerEvents.SIGNAL:
      return 'signal';
    case WorkerEvents.FAIL:
      return 'terminate';
    default:
      return 'unknown';
  }
}

module.exports = {
  WorkerStateMachine,
  WorkerStates,
  WorkerEvents,
  // Backward compatibility aliases
  ApplicationStateMachine: WorkerStateMachine,
  ApplicationStates: WorkerStates,
  ApplicationEvents: WorkerEvents,
};
