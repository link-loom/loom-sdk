# Link Loom Lifecycle & System Events

> **Status**: Stable
> **Context**: Global

Understanding the "Heartbeat" of a Link Loom application is critical for advanced orchestration. This document details the specific boot sequence, the modules order, and the **System Events** you can hook into.

## 1. The Boot Sequence (`ignite()`)

When you call `loom.ignite()`, the engine follows a strict, deterministic initialization path. This ensures that dependencies are always available for the next layer.

### Phase A: Core Kernel (Synchronous)

_These modules are required for the "Brain" of the application to exist._

1.  **DependenciesModule**: Creates the DI container.
2.  **ConsoleModule**: Initializes the unified logger.
3.  **UtilitiesModule**: Loads internal toolkits (`Validator`, `Crypto`, `Generator`, `IO`). **Does not load generic libs like lodash.**
4.  **SettingsModule**: Loads `config/default.json` and Envars.
5.  **DataTypesModule**: Loads system constants.

### Phase B: Infrastructure (Async)

_These modules connect to the outside world._

6.  **DatabaseModule**: Connects to Mongo/SQL. **Blocks if connection fails.**
7.  **StorageModule**: Connects to S3/GCS.
8.  **PushModule**: Connects to FCM/APNS.
9.  **ObservabilityModule**: Connects to **Vectry** (Tracing) and **Sentry** (Error Tracking).

### Phase C: Adapters (The "Limbs")

_These modules enable business logic._

10. **BusModule**: Creates the `EventEmitter` (Internal Layer 1).
    - _Event_: `server::event-bus::loaded`
11. **ModelsModule**: Loads **Data Models** (`src/models/`). These are Domain Classes that wrap schemas, ensuring business logic stays close to data.
12. **ServicesModule**: Instantiates Business Services.
13. **FunctionsModule**:
    - Runs `startup` functions (Type: `atTime`).
    - Schedules `timed` functions (Cron).
    - Hydrates `cache` functions.
14. **AppsModule**: Spawns **Long-Run Processes**. These are persistent execution units (in-thread or isolated) for heavy workloads.
15. **ApiModule**: Builds the HTTP Router and Middleware pipeline.

### Phase D: The Event Mesh (Layer 2)

_These modules enable distributed communication._

16. **BrokerModule**: Connects to the Real-Time Mesh via **WebSockets (Socket.io)**.
17. **ProducerModule**: Registers output topics.
18. **ConsumerModule**: Subscribes to input queues.

### Phase E: Ignition

19. **Server Listen**: The Express app starts listening on port (e.g., 8080).
20. **Trigger**: `server::loaded`.

---

## 2. System Events

The **Internal Bus** (`dependencies.eventBus.bus`) emits specific signals during the lifecycle. You can subscribe to these in your **Consumers** or **Services**.

| Event Name                  | Emitter     | Timing                  | Payload | Use Case                                                                            |
| :-------------------------- | :---------- | :---------------------- | :------ | :---------------------------------------------------------------------------------- |
| `server::event-bus::loaded` | `BusModule` | Early Boot (Phase C)    | `void`  | Attaching listeners _before_ other modules load.                                    |
| `server::loaded`            | `Loom`      | Post-Ignition (Phase E) | `void`  | **The "Ready" Signal**. Safe to start logic, run migrations, or send "Boot" emails. |
| `server::stopping`          | `Process`   | SIGINT/SIGTERM          | `void`  | **Graceful Shutdown**. Close sockets, flush logs, stop workers.                     |

---

## 3. Hooking into the Lifecycle

### Method A: Startup Functions

The recommended way to run code at boot.

```javascript
/* src/functions/setup/notifications.function.js */
module.exports = {
  name: 'BootNotify',
  route: 'functions/setup/notify.js',
  executionType: 'onServerLoaded', // Waits for Phase E
};
```

### Method B: Ad-Hoc Listeners

For deep system integrations, you can grab the bus directly.

```javascript
/* src/services/my.service.js */
class MyService {
  constructor(deps) {
    // Dangerous: This runs in Phase C.
    // Database is ready, but HTTP/Broker might not be.
    deps.eventBus.bus.on('server::loaded', () => {
      console.log('I am ready now!');
    });
  }
}
```

## 4. Graceful Shutdown

Loom handles `SIGINT` (Ctrl+C) and `SIGTERM` (Docker Stop) automatically.

1.  Catches the signal.
2.  Logs `Received SIGTERM, terminating...`.
3.  Triggers `performance.onTerminate()` (if enabled) to flush APM metrics.
4.  Calls `process.exit(0)`.

> **Note**: The **Apps Adapter** has its own "Guillotine" lifecycle that hooks into this process to kill Worker Threads instantly.
