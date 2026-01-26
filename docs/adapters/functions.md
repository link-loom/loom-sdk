# Functions Adapter

> **Namespace**: `[Loom]::[Functions]` > **Module**: `FunctionsModule`

The **Functions Adapter** allows you to run isolated pieces of logic, similar to AWS Lambda but running internally.

## Types of Functions

1.  **Cache**: Run on demand, results can be cached (conceptually).
2.  **Timed**: Run on a schedule (Interval or Cron-like).
3.  **Startup**: Run once when the application boots.

## Definition

Functions are defined in `src/functions/index.js`.

```javascript
// src/functions/index.js
module.exports = {
  startup: [
    {
      name: 'SeedDatabase',
      route: 'functions/seed.function.js',
      executionMode: 'onEvent', // or 'atTime'
    },
  ],
  timed: [
    {
      name: 'Cleanup',
      route: 'functions/cleanup.function.js',
      intervalTime: 1,
      intervalMeasure: 'hours',
      startAt: '00:00:00',
    },
  ],
};
```

## Implementation

```javascript
class SeedDatabaseFunction {
  constructor(deps) {
    this.db = deps.database.client;
  }

  async run() {
    // Write logic here
  }
}
```
