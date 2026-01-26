# Core Concepts

Link Loom SDK is built on a few specific architectural principles that differentiate it from standard web frameworks.

## 1. The Runtime (`Loom`)

At the heart of every application is the `Loom` class. Unlike frameworks that are just "libraries you call", Loom is a **Runtime Host**.

When you run `loom.ignite()`, it takes over the process lifecycle:

1.  **Bootstraps Core Modules**: Sets up DI, Logging, Settings.
2.  **Initializes Infrastructure**: Connects to DBs, Storage, etc (lazily or eagerly).
3.  **Loads Adapters**: Spins up HTTP servers, Event Buses, Workers.
4.  **Signal Handling**: Intercepts `SIGINT`/`SIGTERM` to ensure graceful shutdown of all modules.

This means you don't manually wire up `app.listen()` or `db.connect()` in random places. You declare them as modules, and the Runtime orchestrates them.

## 2. Dependency Injection (DI)

Loom uses a centralized **Dependency Graph** passed to every module.

- **No Global State**: You (almost) never import singletons from files.
- **Context Injection**: Every class receives a `dependencies` object in its constructor.

### Example

```javascript
// BAD (Standard Node.js pattern)
const logger = require('./utils/logger');
const config = require('./config');

class MyService {
  doWork() {
    logger.info(config.get('myKey'));
  }
}
```

```javascript
// GOOD (Loom Pattern)
class MyService {
  constructor(dependencies) {
    this._console = dependencies.console; // Injected Logger
    this._settings = dependencies.settings; // Injected Config
  }

  doWork() {
    this._console.info(this._settings.get('myKey'));
  }
}
```

This makes testing easier (you can mock `dependencies`) and ensures that every part of the system shares the same context (e.g., Request ID tracing).

## 3. The Lifecycle

Every component in Loom follows a predictable lifecycle, managed by the Runtime.

1.  **Setup / Constructor**: Wiring dependencies. No side effects.
2.  **Ignite / Setup()**: Async initialization. DB connections, verifying configs.
3.  **Active**: The system is running (Serving requests, consuming events).
4.  **Terminate**: Graceful teardown. Closing sockets, flushing logs.

## 4. Adapters

Loom separates **Business Logic** from **Transport Layers**.

- **Business Logic** lives in `Services`, `Models`, and `Functions`.
- **Transport** is handled by `Adapters` (HTTP, Events, etc.).

A `UserService` doesn't know about HTTP. It just creates a user.
The `ApiModule` (HTTP Adapter) calls `UserService` to handle a `POST /users` request.
The `ConsumerModule` (Events Adapter) calls `UserService` to handle a `user_signup` event.

This allows your core logic to be reused across API, Background Jobs, and Event Streams without change.
