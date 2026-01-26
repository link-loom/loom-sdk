# Dependencies Module

> **Namespace**: `[Loom]::[Core]::[Dependencies]` > **Class**: `DependenciesModule`

The **Dependencies Module** is the first module to load. It is responsible for building the **Dependency Injection (DI) Context** that will be passed to every other part of the system.

## Responsibilities

1.  **Library Resolution**: It requires standard Node.js libs (`http`, `events`) and SDK dependencies (`express`, `socket.io`).
2.  **Client Resolution**: It intelligently looks into the **Client's** `package.json` (the project using the SDK) to find libraries like `nodemailer` or `socket.io-client`.
3.  **Environment Loading**: It loads configuration from:
    - Local `config/` files (using `node-config`).
    - Link Loom Cloud (if `LINKLOOM_CLOUD_SERVICE_URL` is set).
    - `.env` files.
4.  **Custom Dependencies**: It allows the client to inject arbitrary libraries via the `customDependencies` config array.

## The Dependency Object

When fully loaded, the `dependencies` object contains:

```javascript
{
  root: "/path/to/project",
  config: { ... },          // The loaded configuration
  console: { ... },         // The ConsoleModule instance
  utilities: { ... },       // The UtilitiesModule instance

  // Infrastructure
  express: ...,             // The Express Application instance
  httpServer: ...,          // The raw Node.js HTTP Server
  socketModule: ...,        // socket.io library

  // Libraries
  moment: ...,
  crypto: ...,
  axios: ...,
  // ... and many more
}
```

## Usage

You rarely interact with this module directly. It is used internally by the `Loom` class to construct the initial state.

However, you can access the full graph via the `Loom` instance:

```javascript
const loom = new Loom({ root: __dirname });
const dependencies = await loom.ignite();

// Access dependencies
const db = dependencies.database;
```
