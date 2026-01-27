# Functions Adapter Architecture

> **Namespace**: `[Loom]::[Functions]` > **Module**: `FunctionsModule`

The **Functions Adapter** implements a **Managed Execution Environment** for scripts. It abstracts the "Job Runner" aspect of a backend, handling scheduling (`Cron`), caching (`Memoization`), and initialization (`Boot Scripts`).

## 1. The Function Contract (`run`)

Every function in Loom is a class with a single public entry point: `run()`.

```javascript
/* src/functions/timed/cleanup.function.js */
class CleanupFunction {
  constructor(dependencies) {
    this._db = dependencies.database;
  }

  // The Scheduler calls this method automatically
  async run() {
    await this._db.logs.deleteOld({ days: 30 });
  }
}
```

## 2. Scheduling Manifest (`src/functions/index.js`)

The `index.js` file is the **Control Plane**. It dictates _when_ and _how_ functions run.

```javascript
module.exports = {
  // TYPE A: Timed (Cron replacement)
  timed: [
    {
      name: 'DailyCleanup',
      route: '/functions/timed/cleanup.function',
      // Runs every 24 hours, starting at midnight
      startAt: '00:00:00',
      intervalTime: '24',
      intervalMeasure: 'hours',
    },
  ],

  // TYPE B: Startup (Boot logic)
  startup: [
    {
      name: 'DatabaseSeeder',
      route: '/functions/setup/seed.function',
      // Mode: 'atTime' (Blocking) or 'onServerLoaded' (Event-Driven)
      executionType: 'onServerLoaded',
    },
  ],
};
```

## 3. Execution Strategies

### Strategy: Drift-Corrected Polling (For `timed`)

The adapter does not rely on `cron` syntax. It uses a **Drift-Corrected Calculator**:

1.  Calculates `ms` until `startAt`.
2.  Sets a `setTimeout`.
3.  On execution, sets a `setInterval` for `intervalTime`.

> **Architectural Note**: This keeps the scheduler completely within the Node.js process, avoiding external OS dependencies like `crontab`.

### Strategy: Event-Driven Boot (For `startup`)

- **`onServerLoaded`**: The function subscribes to the `server::loaded` event. This ensures that DB connections and HTTP routes are fully active before the script runs (e.g., for self-health checks).
- **`atTime`**: Runs synchronously during the module load phase. Used for blocking requirements (e.g., verifying Environment Variables).

## 4. Use Cases

| Function Type | Best For...                                   | Architecture Analog           |
| :------------ | :-------------------------------------------- | :---------------------------- |
| **Timed**     | Report generation, DB cleanup, Email batches. | AWS Lambda (Scheduled) / Cron |
| **Startup**   | Seeding, Migration checks, Cache warming.     | K8s InitContainers            |
| **Cache**     | Fetching static config, loading ML models.    | Singleton Services            |
