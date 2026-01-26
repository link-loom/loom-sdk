# Apps Architecture

> **Status**: Stable
> **Isolation**: Threaded (Default) / Process (Opt-in)
> **Module**: `[Loom]::[Apps]`

## Overview

The **"Ephemeral" Apps** system is a runtime within Link Loom designed to safely execute untrusted or resource-intensive business logic. It provides **"Bare-Metal" Isolation** by running each App instance in a dedicated Execution Unit (Worker Thread) separate from the Main Event Loop.

This architecture ensures:

1.  **Reliability**: A crash in an App does not crash the host.
2.  **Responsiveness**: CPU-bound tasks do not block the Orchestrator's I/O.
3.  **Sanitation**: Memory is fully reclaimed after every execution ("The Guillotine").

---

## 1. Architectural Model

The system follows a **Proxy-Worker** pattern.

```mermaid
graph TD
    subgraph "Main Process (Orchestrator)"
        AM[AppsModule]
        PROXY[ThreadedAppProxy]
        SM[State Machine]
    end

    subgraph "Worker Thread (V8 Isolate)"
        W_ENTRY[app.worker.js]
        ACTUAL_APP[User App Instance]
    end

    AM -->|Spawn| PROXY
    PROXY --"postMessage(cmd)"--> W_ENTRY
    W_ENTRY -->|Requires| ACTUAL_APP
    W_ENTRY --"postMessage(result)"--> PROXY
    SM --"Controls"--> PROXY
```

### Components

- **AppsModule**: The kernel that manages the registry and lifecycle. It decides _how_ to spawn an app (Threaded vs In-Process) based on configuration.
- **ThreadedAppProxy**: A "Twin" object living in the Main Thread. It creates the Worker and facilitates all communication. It looks and acts like a local App instance.
- **app.worker.js**: The bootstrap script running inside the thread. It reconstructs a minimal environment (mocked Console, Config) and loads the actual App code.

---

## 2. Threading Model & Isolation

We utilize **Node.js Worker Threads** (`worker_threads`), which provide a unique blend of isolation and performance.

| Feature           | In-Process (Legacy) | Threaded (Current/Default)               | Child Process             |
| :---------------- | :------------------ | :--------------------------------------- | :------------------------ |
| **Memory**        | Shared Heap         | **Isolated V8 Heap**                     | Isolated Process Memory   |
| **Variables**     | Shared              | **Private**                              | Private                   |
| **Communication** | Direct Call         | `postMessage` (Structured Clone)         | IPC / Pipes               |
| **Crash Safety**  | **None**            | **High** (Thread death != Process death) | **High**                  |
| **Startup Cost**  | ~0ms                | ~50ms (V8 Isolate boot)                  | ~200ms+ (OS Process boot) |

### "The Guillotine" (Memory Reclamation)

The primary mechanism for memory management is **Forceful Termination**.

1.  When an App completes or is stopped, the Proxy calls `worker.terminate()`.
2.  This instructs V8 to immediately halt execution in that Isolate.
3.  **Result**: The OS reclaims 100% of the memory allocated by that thread. No garbage is left behind. This makes it impossible for ephemeral apps to leak memory over time.

---

## 3. Data Race Prevention

Asynchronous communication introduces the risk of **Race Conditions** (e.g., sending a `stop` command before `activate` returns).

We mitigate this using a **Correlation ID Protocol**:

1.  **Request**: Proxy generates a monotonic `messageId` (e.g., `seq=42`).
2.  **Pending Map**: Proxy stores `{ 42: { resolve, reject } }` in a Map.
3.  **Execution**: Worker receives `{ id: 42, cmd: '...' }`.
4.  **Response**: Worker replies `{ id: 42, type: 'result', ... }`.
5.  **Resolution**: Proxy looks up `42` in the Map and resolves the specific Promise.

> **Safety**: Even if multiple commands are in flight, their responses never get mixed up.

---

## 4. Lifecycle States

An App moves through a strict State Machine (`ApplicationStateMachine`).

- **∅ (Void)**: Does not exist.
- **INACTIVE**: Loaded in memory (Worker Started), but idle. `onCreate()` called.
- **ACTIVE_BACKGROUND**: Performing work. `onActivate()` running.
- **TERMINATING**: Shutdown sequence initiated. `onTerminate()` called.
- **TERMINATED**: Worker killed via Guillotine. References dropped.

---

## 5. Configuration

Isolation is **Enabled by Default**.

To opt-out (force legacy behavior for debugging), set `APPS_ISOLATION` in your project config:

```json
{
  "APPS_ISOLATION": "process"
}
```

---

## 6. Developer Guide

To create a compatible App, no special changes are needed. Write standard Loom Apps:

```javascript
class MyApp {
  constructor(deps) {
    this.logger = deps.console;
  }

  async onActivate(ctx) {
    // CPU Intensive work here is SAFE
    this.logger.info('Working...');
  }
}
module.exports = MyApp;
```

**Restriction**: You cannot access variables from the Main Process (e.g., `global.server`). You must rely on the passed `ctx` and `config`.
