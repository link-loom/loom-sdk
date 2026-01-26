# Link Loom SDK

[![GitHub license](https://img.shields.io/github/license/link-loom/loom-sdk.svg)](https://github.com/link-loom/loom-sdk/blob/master/LICENSE)
[![npm](https://img.shields.io/npm/v/npm.svg)](https://www.npmjs.com/package/@link-loom/sdk)

**The Runtime Orchestrator for Governed Node.js Ecosystems.**

Link Loom SDK is not just a framework; it is a **foundational runtime** designed to standardize how applications initialize, manage dependencies, and interact with the world. It provides a deterministic lifecycle, an explicit dependency graph, and a modular adapter system, enabling teams to build systems that are **auditable, predictable, and evolvable**.

Unlike generic web frameworks that focus on handling HTTP requests, Link Loom focuses on **operating the service itself**. It acts as the backbone for your architecture, allowing separate monoliths, microservices, and workers to share a single, governed runtime contract.

---

## 📚 Documentation Index

### 🚀 Getting Started

- [**Installation & Quick Start**](docs/getting-started.md)
- [**CLI Reference**](docs/cli/reference.md)
- [**Building Your First Service**](docs/guides/building-services.md)

### 📘 Usage Guides

- [**Project Structure**](docs/guides/project-structure.md) — Understanding the `loom-svc-js` template.
- [**Configuration Masterclass**](docs/guides/configuration.md) — Deep dive into `default.json`, modules, and providers.
- [**Environment Management**](docs/guides/environment-management.md) — Managing secrets with Local Config vs **Link Loom Cloud Vault**.
- [**Deployment Guide**](docs/guides/deployment.md) — Production setup, Docker, and optimization.

### 🏗 Architecture & Concepts

- [**Core Concepts**](docs/architecture/core-concepts.md) — The Runtime, Lifecycle State Machine, and DI.
- [**The Adapter Pattern**](docs/adapters/README.md) — How Loom communicates (HTTP, Events, Workers).
- [**LLM Context / AI Agents**](docs/llm-context.md) — Technical summary for AI coding assistants.

### 🧩 Core Modules

The kernel of the SDK.

- [**Dependencies (DI)**](docs/core/dependencies.module.md)
- [**Settings & Config**](docs/core/settings.module.md)
- [**Console & Logging**](docs/core/console.module.md)
- [**Data Types**](docs/core/data-types.module.md)
- [**Utilities**](docs/core/utilities.module.md)

### 🔌 Adapters

- [**HTTP / API**](docs/adapters/http.md)
- [**Events / Bus**](docs/adapters/events.md)
- [**Functions**](docs/adapters/functions.md)
- [**Apps (Threaded)**](docs/adapters/apps.md)

### 🛠 Infrastructure

- [**Database**](docs/infrastructure/database.md)
- [**Observability**](docs/infrastructure/observability.md)
- [**Storage**](docs/infrastructure/storage.md)
- [**Email**](docs/infrastructure/email.md)
- [**Push Notifications**](docs/infrastructure/push.md)

---

## Installation

```bash
npm install --save @link-loom/sdk
```

## Basic Usage

```javascript
/* constant { Loom } = require('@link-loom/sdk'); */
const loom = new Loom({ root: __dirname });

const main = async () => {
  const namespace = '[Service]';
  const dependencies = await loom.ignite();
};

main();
```

Visit:

- OpenAPI Playground: `http://localhost:3601/open-api.playground`
- API Specification: `http://localhost:3601/open-api.json`

---

## Architecture Overview

```
+---------------------------------------------------+
|                  Loom Runtime                     |
|---------------------------------------------------|
| Core Modules: Dependencies · Utilities · Settings |
| Adapters: HTTP · Events · Database · Functions    |
| Infrastructure: Logging · Observability · CLI     |
| Runtime: Lifecycle · Registry · Context           |
+---------------------------------------------------+
```

**Design Principles:**

1.  **Strict Lifecycle**: Deterministic startup sequence.
2.  **Explicit Dependencies**: No hidden globals; everything is injected.
3.  **Convention over Config**: Standardized structure for scaling.
4.  **Production Ready**: Built-in observability and governance hooks.

---

## Comparison

| Feature      | **Link Loom SDK**       | **Express/Fastify** | **NestJS**            |
| :----------- | :---------------------- | :------------------ | :-------------------- |
| **Role**     | Runtime Orchestrator    | Web Framework       | Application Framework |
| **Focus**    | Lifecycle & Governance  | HTTP Routing        | Structural Patterns   |
| **State**    | Managed (State Machine) | Stateless           | Stateless             |
| **Config**   | JSON + Cloud Vault      | Manual / Env        | Modules / Decorators  |
| **Use Case** | Enterprise Systems      | Microservices       | Complex APIs          |

---

## Contributing

1.  Use ESLint + Prettier.
2.  Follow Conventional Commits.
3.  Include tests and documentation.

## License

Licensed under the **Apache License 2.0**.

Link Loom SDK — _Build once, govern everywhere._
