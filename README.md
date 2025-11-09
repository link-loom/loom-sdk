# Link Loom SDK

**A modular runtime framework for building governed, extensible, and production-ready systems in Node.js.**

Link Loom SDK provides a unified runtime architecture designed for teams that require structure, reliability, and long-term maintainability in distributed environments.  
It offers a deterministic application lifecycle, dependency graph resolution, and modular extensibility through adapters—enabling developers to build systems that are both auditable and evolvable over time.

Unlike generic web frameworks, Link Loom is not focused solely on HTTP. It acts as a **runtime orchestrator**, standardizing how services initialize, communicate, and operate under controlled conditions.  
Its architecture allows monoliths and microservices alike to share the same runtime contract, providing consistency across projects, teams, and environments.

Built with production governance in mind, Link Loom emphasizes **clarity over convention**, **traceability over velocity**, and **architecture over syntax sugar**.  
It is suited for organizations that demand precise control of their operational stack—where lifecycle integrity, event observability, and modular interoperability are as critical as performance.



## What Link Loom Is — and What It Is Not

Link Loom is **not** a web framework, **not** a layer on top of Express, and **not** a clone of Nest or Next.js.  
It is a **runtime SDK** — a foundation designed to make applications predictable, composable, and production-ready from day one.

Most frameworks define how to *serve requests*.  
Loom defines how a *system lives*: how it initializes, wires its dependencies, manages its lifecycle, and exposes its capabilities through adapters that can connect to any transport layer — HTTP, events, queues, or internal processes.

While Express focuses on routing, and Nest focuses on structure for APIs, Link Loom focuses on **runtime orchestration and modular governance**.  
It provides a neutral execution environment where each part of your system — HTTP endpoints, workers, background apps, or event consumers — runs under the same deterministic lifecycle.

You can think of Loom as the missing layer *beneath* frameworks:  
a **coherent runtime substrate** that brings order to configuration, dependency management, adapters, observability, and initialization, without forcing any specific programming style.

---

### Why It Exists

Link Loom was initially designed as a practical toolkit to **build projects fast but correctly** — giving developers structure and order without the usual friction of corporate frameworks.  
Over time, it evolved into a **foundational SDK** capable of supporting entire ecosystems, where multiple systems coexist under shared conventions, lifecycle rules, and operational standards.

It is now used as a **backbone framework** — not to replace application logic, but to provide the scaffolding that keeps large systems coherent as they grow.  
Every service built on Loom benefits from the same predictable startup, dependency resolution, and observability model — whether it’s a lightweight prototype or a critical enterprise workload.

In short:
- Link Loom provides **the architecture beneath architectures**.  
- It accelerates delivery like a framework, but governs execution like a platform.  
- It is designed for developers who move fast, but refuse to sacrifice long-term integrity.
- Link Loom enables **enterprise level production-ready architecture**.

> Build once, scale with control, and keep full ownership of your stack.

---

## Key Features

### Modular Runtime
Link Loom’s core runtime provides an explicit dependency graph that connects modules, adapters, and services through a well-defined lifecycle.  
Modules are initialized deterministically and communicate via dependency injection, not global state.

### Lifecycle Management
A built-in **Application State Machine** governs every process: create, activate, deactivate, suspend, resume, and terminate.  
This makes instance orchestration predictable, traceable, and auditable in any environment.

### Dependency Injection & Configuration
Every module receives a unified dependency context that includes configuration, utilities, logging, and data type registries.  
Supports both **local JSON configuration** and **environment-driven overrides** for regulated deployments.

### Adapter Architecture
Loom introduces an **adapter pattern** for extending its runtime:
- **HTTP Adapter:** route discovery, OpenAPI generation, integrated Swagger playground  
- **Events Adapter:** internal bus with producer/consumer semantics  
- **Database Adapter:** pluggable data layer (PostgreSQL, MongoDB, etc.)  
- **Functions Adapter:** function-oriented modular execution  
- **Apps Adapter:** in-process orchestration for long-lived workloads

Adapters can be added, replaced, or composed without modifying the core runtime.

### Data & Model Layer
Provides a **Data Type Registry** and a reflection-based model system to declare entities and schemas consistently across services.  
Designed for type safety, schema reuse, and contextual validation.

### Observability & Governance
Includes a centralized logging interface with namespaces, context-based diagnostics, and consistent console output.  
All modules emit structured logs that can be routed to external observability stacks.

### CLI Tooling
Includes a dedicated CLI for scaffolding, introspection, and runtime operations:
```bash
npm install -g @link-loom/cli
link-loom create --name my-service
````

### Extensibility

Loom is designed to be unopinionated yet structured.

It can serve as a standalone service runtime or as the backbone for complex ecosystems that require modular growth, plugin development, and distributed execution.

---

## Installation

```bash
npm install --save @link-loom/sdk
```

---

## Basic Usage

```bash
const { Loom } = require('@link-loom/sdk');
const loom = new Loom({ root: __dirname });

const main = async () => {
  const namespace = '[Service]';
  const dependencies = await loom.ignite();
};

main();
```

Visit:

* OpenAPI Playground: `http://localhost:3601/open-api.playground`
* API Specification: `http://localhost:3601/open-api.json`

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

Design Principles:

* Deterministic startup sequence
* Explicit dependency graph
* Zero hidden globals
* Convention-driven extensibility
* Production-ready observability hooks

---

## Comparison to Existing Frameworks

| Aspect / Feature | **Link Loom SDK** | **NestJS** | **Fastify** | **Express** | **Moleculer** | **Temporal** |
|------------------|-------------------|-------------|--------------|--------------|----------------|---------------|
| **Core Purpose** | Modular runtime SDK for system orchestration and dependency governance | Web application framework with DI and decorators | High-performance HTTP server | Minimal web routing library | Microservices framework with service schema | Workflow orchestration engine |
| **Ecosystem Level** | Infrastructure layer (beneath frameworks) | Application layer | HTTP transport layer | HTTP transport layer | Distributed services layer | Workflow runtime layer |
| **Architecture Model** | Adapter-based runtime with pluggable modules | MVC / decorator-based | Plugin-based | Middleware stack | Service schema & broker | Task and state machines |
| **Primary Abstraction** | Runtime orchestration and lifecycle control | Controllers, providers, modules | Routes and hooks | Middleware chain | Services and brokers | Workflows and activities |
| **Lifecycle Management** | Deterministic Application State Machine | Implicit (module initialization) | None | None | Worker lifecycle | Workflow state machine |
| **Dependency Management** | Centralized dependency graph and runtime injection context | Decorator-based DI container | Basic instance sharing | Manual | Built-in container | External dependency management |
| **Event & Async Design** | Native Event Bus and Broker layer | Optional (RxJS integration) | Plugin-based | None | Native (AMQP, NATS, MQTT) | Native workflow queues |
| **Configuration System** | Local/Remote with provider injection and environment mapping | Environment + decorators | Env schema | Manual configuration | Config schema per service | External config and workflow definitions |
| **Extensibility** | Adapters (HTTP, Events, Database, Functions, Apps) | Modules and providers | Plugins | Middleware | Services and mixins | Workflows and activities |
| **Observability & Governance** | Integrated logging, namespaced runtime console, deterministic boot tracing | Plugin or third-party | Plugin-based | Manual | Built-in metrics | Centralized monitoring |
| **Scope of Use** | Foundational runtime for multi-system ecosystems | Web and API applications | HTTP services | Basic APIs | Distributed backends | Long-running workflows |
| **Performance Target** | I/O-optimized modular runtime | HTTP-centric | Extremely high | Moderate | Depends on broker latency | Depends on workflow persistence |
| **Language** | TypeScript / JavaScript | TypeScript | TypeScript / JavaScript | JavaScript | JavaScript | Go / TypeScript / Java |
| **License** | MIT | MIT | MIT | MIT | MIT | Apache-2.0 |

---

### Position Summary

| Category | Description |
|-----------|--------------|
| **Domain** | Execution and orchestration layer between frameworks and infrastructure. |
| **Design Goal** | Provide structure, determinism, and governance for heterogeneous Node.js systems. |
| **Use Cases** | Rapid prototyping with production structure, enterprise backbones, and ecosystem runtimes. |
| **Complementarity** | Can coexist *with* Express, Nest, or Fastify by providing lifecycle, dependency, and runtime control beneath them. |

---

## Contributing

1. Use ESLint + Prettier (`npm run lint`, `npm run format`)
2. Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard
3. Keep adapters independent and context-aware
4. Include tests and documentation

---

## License

Licensed under the **MIT License** — see the `LICENSE` file for details.

---

**Link Loom SDK** — a neutral, open, and auditable runtime for structured Node.js applications.

