# Settings Module

> **Namespace**: `[Loom]::[Core]::[Settings]` > **Class**: `SettingsModule`

The **Settings Module** is responsible for applying configuration to the underlying HTTP server and normalizing environment variables.

## Responsibilities

1.  **Security Defaults**: Applies `helmet` headers, disables `x-powered-by`, and sets up `cors`.
2.  **Body Parsing**: Configures `body-parser` for JSON and URL-encoded bodies with configurable size limits.
3.  **Server Listen**: The `listenServer()` method (called by Loom) actually binds the HTTP server to a port.
4.  **Port Resolution**: Determines the port from `process.env.PORT` -> `config.server.port` -> `8080`.

## Configuration

You can control this module via your project's `config/default.json`:

```json
{
  "server": {
    "port": 3000,
    "bodyParserLimit": "1mb"
  }
}
```

## Body Parser Limit

By default, the body-parser middleware accepts payloads up to **100KB**. For services that need to handle larger payloads (e.g., webhook endpoints receiving email content, file metadata, or large JSON documents), you can increase this limit at two levels:

### Global Limit

The global limit applies to **all routes** in the service. It is resolved in the following order of priority:

1. `BODY_PARSER_LIMIT` environment variable
2. `server.bodyParserLimit` in `config/default.json`
3. `'100kb'` (default)

**Via environment variable:**
```bash
BODY_PARSER_LIMIT=1mb node app.js
```

**Via config file:**
```json
{
  "server": {
    "bodyParserLimit": "1mb"
  }
}
```

Accepted format: any value supported by the [bytes](https://www.npmjs.com/package/bytes) library (`'100kb'`, `'1mb'`, `'5mb'`, etc.).

### Per-Route Limit

For finer control, individual routes can override the global limit using the `bodyLimit` property in their route definition. This is the recommended approach when only specific endpoints need larger payloads — it keeps the rest of the API protected by the smaller default.

See [HTTP Adapter > Per-Route Body Limit](../adapters/http.md#6-per-route-body-limit) for details and examples.

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
