# Functions Adapter Architecture

> **Namespace**: `[Loom]::[Functions]` > **Module**: `FunctionsModule`

The **Functions Adapter** implements a **Managed Execution Runtime** for discrete logic units. It abstracts the "Job Runner" aspect of a backend, providing a unified interface for scheduling, initialization, and volatile state management.

## 1. Execution Strategies (High Level)

The adapter orchestrates three distinct types of functions, each designed for a specific phase of the application lifecycle:

1.  **Timed Functions**: Recurring background tasks. They replace the need for an external `crontab` by using an internal javascript-native scheduler.
2.  **Startup Functions**: Boot-time logic. They execute exactly once when the application starts, either blocking the boot process or running asynchronously after the server is ready.
3.  **Cache Functions**: Volatile state containers. They act as in-memory singletons to store data that is expensive to compute but frequently accessed.

---

## 2. Strategy A: Timed Functions

### Architecture: Drift-Corrected Scheduler

The `FunctionsModule` implements a custom scheduling engine that runs entirely within the Node.js Event Loop. It does not spawn child processes (unless configured to do so via the Apps adapter), keeping overhead minimal.

**The Algorithm:**

1.  **Boot Phase**: It calculates the millisecond delta between `now()` and the next scheduled `startAt` time.
2.  **Alignment**: A `setTimeout` waits for this specific delta to align the execution window.
3.  **Interval Lock**: Upon the first execution, it switches to a `setInterval` to maintain the cadence.

### Pattern: The Runner Contract

Timed functions must expose a `run()` method. This method is the entry point for the scheduler.

```javascript
/* src/functions/timed/report.function.js */
class DailyReportFunction {
  constructor(deps) {
    this._email = deps.adapters.email;
  }

  async run() {
    // Logic executed at the specific interval
    await this._email.sendAdminReport();
  }
}
```

### Use Cases

- **Database Cleanup**: Delete soft-deleted records older than 30 days.
- **Batch Notifications**: Send "Daily Digest" emails to users at 9:00 AM.
- **Data Aggregation**: Recalculate dashboard statistics every hour.
- **Health Checks**: Ping external dependencies every 5 minutes to update status.

---

## 3. Strategy B: Startup Functions

### Architecture: Boot Phase Interceptors

Startup functions are pivotal for ensuring the application is "Ready for Traffic". They can operate in two modes defined by `executionType`:

- **`atTime` (Blocking)**: Runs synchronously during the module loading phase. The application **will not start** until these functions resolve. If they throw an error, the process crashes (Safety Logic).
- **`onServerLoaded` (Async/Event-Driven)**: Runs after the `server::loaded` event is emitted. The HTTP server is already up, making this safe for logic that requires the full stack to be active.

### Pattern: The Setup Script

Similar to Timed functions, they use the `run()` entry point, but it is called exactly once.

```javascript
/* src/functions/setup/check-env.function.js */
class EnvCheckFunction {
  constructor(deps) {
    this._config = deps.config;
  }

  async run() {
    if (!this._config.API_KEY) {
      throw new Error('FATAL: API_KEY is missing');
    }
  }
}
```

### Use Cases

- **Wait-for-Database**: Ensure DB connectivity before accepting requests (`atTime`).
- **Seeding**: Populate the database with default roles/users if empty (`onServerLoaded`).
- **Migrations**: Run schema migrations (`atTime`).
- **Cache Warming**: Pre-fetch configuration from a remote vault (`atTime`).

---

## 4. Strategy C: Cache Functions

### Architecture: The Repository Pattern (In-Memory)

Cache Functions are conceptually different; they are **Stateful Singletons**. While Timed and Startup functions are "Actions", Cache functions are "Stores".

They provide a structured way to hold **Global Volatile State** without polluting the `global` namespace or relying on "magic" variables. They are instantiated once and persist for the lifetime of the process.

### Pattern: Accessor Encapsulation

These functions typically expose getter and setter methods to control access to their internal state.

```javascript
/* src/functions/cache/features.cache.js */
class FeatureFlagsCache {
  constructor(deps) {
    this._flags = {};
  }

  get flags() {
    return this._flags;
  }

  set flags(newFlags) {
    this._flags = newFlags;
  }
}
```

**Consumption:**

```javascript
// In a Service
const flags = dependencies.functions.cache.FeatureFlagsCache.flags;
if (flags.NEW_UI_ENABLED) { ... }
```

### Use Cases

- **Configuration Caching**: Storing settings fetched from a remote API to avoid network latency on every request.
- **ML Model Hosting**: Loading a TensorFlow/ONNX model into memory once for fast inference.
- **Reference Data**: Storing a list of "Countries" or "Currencies" that rarely changes.
- **Throttling Counters**: Simple in-memory counters for rate limiting (per instance).

> **Note**: For distributed state across multiple instances, use the **Redis Adapter**. Cache Functions are strictly process-local.
