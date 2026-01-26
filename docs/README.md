# Link Loom SDK Documentation

Welcome to the official documentation for **Link Loom SDK**, the modular runtime framework for building governed, extensible systems in Node.js.

## Philosophy

Link Loom is not just a framework; it's a **runtime orchestrator**. It standardizes how services initialize, manage dependencies, and communicate, providing a stable foundation for complex ecosystems.

## Navigation

### 🚀 Getting Started

- [Installation & Quick Start](getting-started.md)
- [Building Your First Service](guides/building-services.md)
- [CLI Reference](cli/reference.md)

### 📘 Usage Guides

- [Project Structure](guides/project-structure.md) - Understanding the template.
- [Configuration](guides/configuration.md) - Configuring modules and providers.
- [Environment Management](guides/environment-management.md) - Local vs SaaS (Vault).
- [Deployment](guides/deployment.md) - Production setup.

### 🏗 Architecture

- [Core Concepts](architecture/core-concepts.md) - Understanding the Runtime, Lifecycle, and Dependency Injection.
- [Adapters System](adapters/README.md) - How Loom communicates with the outside world.

### 🧩 Core Modules

The kernel of the SDK.

- [Overview](core/README.md)
- [Dependencies (DI)](core/dependencies.module.md)
- [Settings & Config](core/settings.module.md)
- [Console & Logging](core/console.module.md)
- [Data Types & Validation](core/data-types.module.md)
- [Utilities](core/utilities.module.md)

### 🔌 Adapters

Detailed guides on official adapters.

- [HTTP / API](adapters/http.md)
- [Events / Bus](adapters/events.md)
- [Functions](adapters/functions.md)
- [Apps (Threaded/Process)](adapters/apps.md)

### 🛠 Infrastructure

Abstractions for system resources.

- [Database](infrastructure/database.md)
- [Observability](infrastructure/observability.md)
- [Storage](infrastructure/storage.md)
- [Email](infrastructure/email.md)
- [Push Notifications](infrastructure/push.md)

### 🤖 For AI Agents

- [LLM Context](llm-context.md) - A dense technical summary for Large Language Models.
