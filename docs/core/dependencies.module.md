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
4.  **Config Interface Normalization**: When using Link Loom Cloud, the config object is wrapped to provide `.has()` and `.get()` methods compatible with the `node-config` interface.
5.  **Custom Dependencies**: It allows the client to inject arbitrary libraries via the `customDependencies` config array.

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

## Configuration Modes

The SDK supports two configuration modes. The mode is selected automatically based on environment variables.

### Mode A: Local Configuration (`node-config`)

Used when `LINKLOOM_CLOUD_SERVICE_URL` is **not set**. Configuration is loaded from local `config/*.json` files via the [`node-config`](https://www.npmjs.com/package/config) library.

```
config/
  default.json      # Base configuration
  local.json        # Local overrides (gitignored)
  production.json   # Production overrides (matched by NODE_ENV)
```

The `dependencies.config` object is a `node-config` instance with `.has()`, `.get()`, and `.util.toObject()` methods.

### Mode B: Link Loom Cloud

Used when `LINKLOOM_CLOUD_SERVICE_URL` **and** `LINKLOOM_CLOUD_API_KEY` are set. Configuration is fetched from the Link Loom Cloud API at startup.

| Environment Variable | Required | Description |
| :--- | :--- | :--- |
| `LINKLOOM_CLOUD_SERVICE_URL` | Yes | API endpoint for the configuration service |
| `LINKLOOM_CLOUD_API_KEY` | Yes | Bearer token for authentication |
| `LINKLOOM_CLOUD_ENVIRONMENT_NAME` | No | Environment filter (default: `'development'`) |

The fetched configuration is a plain JavaScript object. The SDK automatically wraps it with `.has()` and `.get()` methods so that all SDK modules (including the Workers module) work identically in both modes.

### Config Interface Guarantee

Regardless of the configuration mode, `dependencies.config` always supports:

```javascript
// Check if a key exists (supports dot-notation for nested paths)
dependencies.config.has('server.port');          // true/false
dependencies.config.has('WORKERS_ISOLATION');     // true/false

// Get a value (throws if not found)
dependencies.config.get('server.port');           // 3601
dependencies.config.get('modules.database');      // { settings: { ... } }

// Direct property access (always works)
dependencies.config.server.port;                  // 3601
```

This ensures that code using `config.has()` or `config.get()` works the same way whether the service is running locally with `node-config` or in production with Link Loom Cloud.

## Usage

You rarely interact with this module directly. It is used internally by the `Loom` class to construct the initial state.

However, you can access the full graph via the `Loom` instance:

```javascript
const loom = new Loom({ root: __dirname });
const dependencies = await loom.ignite();

// Access dependencies
const db = dependencies.database;

// Access config (works in both local and cloud mode)
const port = dependencies.config.get('server.port');
const hasDb = dependencies.config.has('modules.database');
```
