# Architectural Adapters

**Adapters are not just connectors; they are architectural styles.**

In Link Loom, enabling an adapter does not just "add a feature"—it activates a specific **Architectural Pattern** within your runtime. This allows a single service to act as a REST API, an Event Worker, and a Cron Job runner simultaneously, while keeping the business logic agnostic of the execution mode.

---

## 1. REST Architecture (`[Loom]::[HTTP]`)

**Enables**: Synchronous, Request/Response communication.

The HTTP Adapter transforms your service into a web server. It is more than just an Express wrapper; it enforces a strict **Router-Controller-Service** separation.

- **Routing Tree**: Declarative route definitions (`router.js`) that map URLs to Class Methods.
- **OpenAPI Generation**: The runtime introspects your code to auto-generate Swagger specs and host a live playground.
- **Validation Layer**: Automatic input validation before your handler executes.

[**→ Read HTTP Documentation**](http.md)

---

## 2. Event-Driven Architecture (`[Loom]::[Events]`)

**Enables**: Asynchronous, Reactive communication.

The Events Adapter activates a **Pub/Sub Fabric** across your system. It supports two modes:

1.  **Internal Bus**: For decoupling modules within the same process (Observer Pattern).
2.  **External Broker**: Integrating with Distributed Message Queues (Socket.io, RabbitMQ, Kafka) for inter-service communication.

This enables **Fire-and-Forget** flows where a service emits an event ("UserSignedUp") and multiple consumers react independently (EmailService, AnalyticsService).

[**→ Read Events Documentation**](events.md)

---

## 3. Isolated Long-Run Apps Architecture (`[Loom]::[Apps]`)

**Enables**: Heavy-Duty, Background Processing.

The Apps Adapter provides **Thread-Based Isolation** (or Process-Based). It allows you to run long-lived, CPU-intensive tasks ("Apps") without blocking the main Event Loop of the orchestrator.

- **"The Guillotine"**: A strict memory management system that kills threads upon task completion to prevent leaks.
- **Sandboxing**: Apps run in a separate V8 Isolate, protecting the core runtime from crashes.
- **Use Cases**: Video processing, PDF generation, Data ingestion pipelines.

[**→ Read Apps Documentation**](apps.md)

---

## 4. Modular Execution Architecture (`[Loom]::[Functions]`)

**Enables**: Scheduled and On-Demand Logic.

The Functions Adapter brings **Serverless Semantics** into your monolith. It manages discrete units of logic that need specific execution triggers:

- **Timed Functions**: Replaces external Cron jobs. The runtime guarantees schedule execution.
- **Cache Functions**: High-performance, memoized logic units.
- **Startup Functions**: Boot-time logic hooks (e.g., Seeding, Cache warming).

[**→ Read Functions Documentation**](functions.md)
