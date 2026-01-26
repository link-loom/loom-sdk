# Link Loom SDK Context for AI Agents

> **Role**: This document provides high-density context for LLMs to understand the Link Loom SDK architecture, ensuring accurate code generation and refactoring.

## 1. Architecture Invariants

1.  **Dependency Injection**: NEVER import singletons or global instances. ALWAYS use `dependencies` passed to the constructor.
    - _Right_: `this._console = dependencies.console;`
    - _Wrong_: `const logger = require('../utils/logger');`
2.  **Namespace Logging**: ALWAYS use `this._console` with a `namespace`.
    - `this._console.info('Msg', { namespace: '[Loom]::[MyModule]' })`
3.  **Adapter Pattern**: Business logic (Services) MUST NOT depend on Transport logic (HTTP/Socket).
4.  **Configuration**: Config is read-only from `dependencies.config`.

## 2. Directory Structure Map

- `src/core/`: The Kernel.
  - `dependencies.module.js`: DI Container.
  - `settings.module.js`: Server Config.
- `src/infrastructure/`: Abstract Loaders.
  - `database.module.js`, `storage.module.js`.
- `src/adapters/`: Transport Layers.
  - `http/`: `ApiModule`, Router, Middleware.
  - `events/`: `BusModule` (Internal), `BrokerModule` (Socket.io).
  - `apps/`: Worker Threads logic.
- `src/utils/`: Helpers.

## 3. Common Class Signatures

### Generic Module

```javascript
class MyModule {
  constructor(dependencies) {
    this._deps = dependencies;
    this._console = dependencies.console;
    this._namespace = '[Loom]::[MyModule]';
  }

  async setup() {
    this._console.success('Loaded', { namespace: this._namespace });
  }
}
```

### Route Handler

```javascript
class MyRoute {
  constructor(dependencies) { ... }

  async handle({ params, req, res }) {
    return { status: 200, data: {} };
  }
}
```

## 4. Key Dependencies available in `deps`

- `deps.console`: Logger.
- `deps.config`: Configuration object.
- `deps.utilities`: Access to `crypto`, `validator`, `generator`.
- `deps.database.client`: Raw DB Driver.
- `deps.eventBus.bus`: Internal EventEmitter.

---

**Instruction to Agent**: When generating code for this project, verify you are adhering to the `constructor(dependencies)` pattern and utilizing the standard `_console` logger.
