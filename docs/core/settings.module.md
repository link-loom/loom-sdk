# Settings Module

> **Namespace**: `[Loom]::[Core]::[Settings]` > **Class**: `SettingsModule`

The **Settings Module** is responsible for applying configuration to the underlying HTTP server and normalizing environment variables.

## Responsibilities

1.  **Security Defaults**: Applies `helmet` headers, disables `x-powered-by`, and sets up `cors`.
2.  **Body Parsing**: Configures `body-parser` for JSON and URL-encoded bodies.
3.  **Server Listen**: The `listenServer()` method (called by Loom) actually binds the HTTP server to a port.
4.  **Port Resolution**: Determines the port from `process.env.PORT` -> `config.server.port` -> `8080`.

## Configuration

You can control this module via your project's `config/default.json`:

```json
{
  "server": {
    "port": 3000
  }
}
```

## Lifecycle (Startup)

1.  `Loom` calls `settings.setup()`.
2.  `setup()` applies middleware to the `express` instance found in `dependencies.express`.
3.  Later, `Loom` calls `settings.listenServer()`, which starts the `httpServer`.

## Accessing Settings

In your own services, you can access the configuration object via `dependencies.config`:

```javascript
class MyService {
  constructor(deps) {
    this.config = deps.config;
  }

  getApiKey() {
    return this.config.myExternalService.apiKey;
  }
}
```
