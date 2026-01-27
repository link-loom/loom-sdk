# Link Loom SDK

[![GitHub license](https://img.shields.io/github/license/link-loom/loom-sdk.svg)](https://github.com/link-loom/loom-sdk/blob/master/LICENSE)
[![npm](https://img.shields.io/npm/v/npm.svg)](https://www.npmjs.com/package/@link-loom/sdk)

**The Runtime Orchestrator for Node.js Ecosystems.**

Link Loom SDK is a **runtime foundation** designed to standardize application initialization, dependency resolution, and operational lifecycle. It provides a deterministic execution environment where modules, services, and adapters coexist under a strict architectural contract.

This is not merely a web framework. Link Loom operates as the **Application Backbone**, enabling disjointed systems—monoliths, distributed microservices, and dedicated workers—to share a unified operational signature.

---

## Documentation Index

### Getting Started

- [**Installation & Quick Start**](docs/getting-started.md)
- [**CLI Reference**](docs/cli/reference.md)
- [**Building Your First Service**](docs/guides/building-services.md)

### Usage Guides

- [**Project Structure**](docs/guides/project-structure.md) — Analysis of the `loom-svc-js` template.
- [**Configuration Strategies**](docs/guides/configuration.md) — Module provisioning and `default.json` schema.
- [**Environment Management**](docs/guides/environment-management.md) — Local Injection vs **Link Loom Cloud Vault** Runtime Fetch.
- [**Deployment Standards**](docs/guides/deployment.md) — Production optimization, Containerization, and Process Management.

### Architecture & Concepts

- [**Core Concepts**](docs/architecture/core-concepts.md) — The Runtime Engine, Lifecycle State Machine, and Dependency Graph.
- [**Architectural Adapters**](docs/adapters/README.md) — Enabling Event-Driven, Isolated, and Modular architectures.
- [**LLM Context / AI Agents**](docs/llm-context.md) — Technical definitions for AI coding assistants.

### Core Modules

The Runtime Kernel.

- [**Dependencies (DI)**](docs/core/dependencies.module.md)
- [**Settings & Config**](docs/core/settings.module.md)
- [**Console & Logging**](docs/core/console.module.md)
- [**Data Types**](docs/core/data-types.module.md)
- [**Utilities**](docs/core/utilities.module.md)

### Adapter Architectures

- [**HTTP / REST Architecture**](docs/adapters/http.md)
- [**Event-Driven Architecture / Bus**](docs/adapters/events.md)
- [**Modular Serverless Functions**](docs/adapters/functions.md)
- [**Isolated Long-Run Apps**](docs/adapters/apps.md)

### Infrastructure Abstractions

- [**Database**](docs/infrastructure/database.md)
- [**Observability**](docs/infrastructure/observability.md)
- [**Storage**](docs/infrastructure/storage.md)
- [**Email**](docs/infrastructure/email.md)
- [**Push Notifications**](docs/infrastructure/push.md)

---

## Technical Overview

Link Loom fundamentally shifts the focus from **Request Handling** to **System Handling**.

### 1. The Runtime Engine

Loom instantiates a **Finite State Machine** that governs the application life from `BOOT` to `SHUTDOWN`. This ensures that database connections, message brokers, and background threads are initialized in a guaranteed order before any traffic is accepted.

### 2. The Dependency Graph

Unlike frameworks relying on decorators or implicit module imports, Loom constructs an **Explicit Dependency Graph**. All system capabilities (Logger, Config, DB Driver, Event Bus) are injected into a unified Context Object (`dependencies`), which is passed downstream to every service and route.

### 3. Architectural Enablers (Adapters)

Adapters in Loom are not simple wrappers; they are architectural primitives.

- **Apps Adapter**: Provides **Thread-based Isolation** for CPU-intensive tasks, decoupling them from the main event loop.
- **Events Adapter**: Establishes a **Pub/Sub Fabric** across the system, enabling decoupled, reactive architectures.
- **Functions Adapter**: Implements a **Serverless-like Runtime** within the application for scheduled (Cron) or on-demand modular logic.

---

## Installation

```bash
npm install --save @link-loom/sdk
```

## Basic Usage

```javascript
/* const { Loom } = require('@link-loom/sdk'); */
const loom = new Loom({ root: __dirname });

const main = async () => {
  /* The ignite() method triggers the bootstrap sequence */
  const dependencies = await loom.ignite();

  dependencies.console.info('Runtime Active');
};

main();
```

---

## Contributing

1.  Use ESLint + Prettier.
2.  Follow Conventional Commits.
3.  Include unit tests and architectural documentation.

## License

Licensed under the **Apache License 2.0**.

**Link Loom SDK** — _Deterministic Runtime Orchestration._
