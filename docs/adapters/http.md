# HTTP Adapter Architecture

> **Namespace**: `[Loom]::[Adapter]::[HTTP]` > **Module**: `ApiModule` > **Dependencies**: `express`

The **HTTP Adapter** implements a **Controller-Service Separation** pattern. It transforms the web server from a collection of callback functions into a structured, class-based handling system.

## 1. The Declarative Router (`src/routes/router.js`)

Routing in Link Loom is **static and centralized**. You do not define routes inside controllers. Instead, the `router.js` file acts as the "Switchboard" for the entire application.

### Implementation Pattern

```javascript
/* src/routes/router.js */
const systemRoutes = require('./api/system/system.routes');

const router = {
  ...systemRoutes, // Spread domain-specific route files

  // Direct Definition
  hello: [
    {
      method: 'GET',
      httpRoute: '/ping', // URL: /hello/ping
      route: 'routes/api/hello.route', // Physical File
      handler: 'ping', // Class Method
      protected: false, // Middleware Flag
    },
  ],
};
```

**Architectural Benefit**:

- **Visibility**: You can see every endpoint in the system in one file.
- **Portability**: The router definition is JSON-serializable, allowing for easy export or static analysis.

## 2. The Route Class (Controller)

Each "Route" file is actually a **Controller Class**. It is instantiated **per request** (or as a singleton depending on DI scope, though logically treated as stateless).

### Class Contract

```javascript
/* src/routes/api/hello.route.js */
class HelloRoute {
  constructor(dependencies) {
    this._services = dependencies.services;
    this.EntityService = this._services.HelloService;
  }

  /**
   * @param {Object} ctx - The Unified Request Context
   * @param {Object} ctx.params - Merged body, query, and route params
   * @param {Object} ctx.req - Original Express Request
   * @param {Object} ctx.res - Original Express Response
   */
  async ping(ctx) {
    // 1. Unwrap Context
    // 2. Delegate to Business Logic (Service)
    const entityService = new this.EntityService(this._dependencies);
    return entityService.ping(ctx);
  }
}
```

**Why this pattern?**

- **Decoupling**: The Controller (`HelloRoute`) knows about HTTP (`ctx`), but the Service (`HelloService`) does not.
- **Testability**: You can unit test the `ping` method by mocking `ctx`.

## 3. The Unified Request Context (`ctx`)

The `ApiModule` abstracts the raw Express `req` object into a cleaner `ctx` object to prevent massive function signatures.

| Property      | Source                                | Description                                                                |
| :------------ | :------------------------------------ | :------------------------------------------------------------------------- |
| `ctx.params`  | `req.body`, `req.query`, `req.params` | All input data merged into one object. **Validated** if `protected: true`. |
| `ctx.headers` | `req.headers`                         | Raw headers.                                                               |
| `ctx.req`     | `req`                                 | Fallback for low-level access (streaming, etc).                            |
| `ctx.res`     | `res`                                 | Fallback for custom responses (redirects, files).                          |

## 4. Streaming Routes (SSE)

For real-time server-to-client push, add `streaming: true` to a route config. The handler receives a `stream` object in its context instead of returning a JSON response.

```javascript
{
  method: 'GET',
  httpRoute: '/live',
  route: 'routes/api/events/events.route',
  handler: 'stream',
  protected: false,
  streaming: true,  // ← Activates SSE mode
}
```

[**→ Read SSE Documentation**](sse.md)

## 5. Middleware Pipeline

The pipeline is constructed dynamically for every endpoint:

1.  **Body Limit (`body-parser`)**: Injected if `bodyLimit` is set. Overrides the global body-parser limit for this route only.
2.  **Storage (`multer`)**: Injected if `supportFile: true`.
3.  **Validator**: Injected if `protected: true`. Validates `ctx.params` against the Service Schema.
4.  **Handler**: The final execution wrapper that calls your Route Class.

```mermaid
graph LR
    Req[Request] --> Router
    Router -->|bodyLimit?| BodyParser[Body Parser Override]
    BodyParser -->|supportFile?| Multer
    Multer -->|protected?| Validator
    Validator -->|valid| Handler
    Handler --> RouteClass
    RouteClass --> Service
    Service --> DB
```

## 6. Per-Route Body Limit

By default, all routes share the global body-parser limit (100KB unless configured otherwise via `BODY_PARSER_LIMIT` env var or `server.bodyParserLimit` config). Some endpoints — such as webhook receivers or data import APIs — may need to accept larger payloads.

Instead of increasing the global limit (which would expose all routes to large payloads), you can set a **per-route limit** using the `bodyLimit` property:

```javascript
{
  method: 'POST',
  httpRoute: '/trigger/webhooks/:mode/:bindingId',
  route: 'routes/api/webhooks/webhook.route',
  handler: 'handleWebhook',
  protected: false,
  bodyLimit: '5mb',  // Only this route accepts up to 5MB
}
```

### How It Works

When `bodyLimit` is set on a route, the SDK injects a dedicated `body-parser` middleware **before** the route handler. This middleware parses the request body with the specified limit, overriding the global parser for that specific route.

The global parser still applies to all other routes — they remain protected by the default limit.

### Route Definition Properties

| Property      | Type      | Required | Default   | Description                                           |
| :------------ | :-------- | :------- | :-------- | :---------------------------------------------------- |
| `method`      | `string`  | Yes      | —         | HTTP method (`GET`, `POST`, `PATCH`, `DELETE`)        |
| `httpRoute`   | `string`  | Yes      | —         | Express route path (supports `:params`)               |
| `route`       | `string`  | Yes      | —         | Path to the Route class file                          |
| `handler`     | `string`  | Yes      | —         | Method name to invoke on the Route class              |
| `protected`   | `boolean` | Yes      | —         | Whether JWT validation middleware is applied           |
| `supportFile` | `boolean` | No       | `false`   | Enables `multer` file upload middleware               |
| `streaming`   | `boolean` | No       | `false`   | Enables SSE mode ([docs](sse.md))                    |
| `bodyLimit`   | `string`  | No       | _(global)_ | Max body size for this route (`'1mb'`, `'5mb'`, etc.) |

### When to Use Per-Route Limits

| Scenario | Recommendation |
| :--- | :--- |
| Webhook endpoints receiving external payloads (emails, events) | `bodyLimit: '5mb'` |
| File metadata or batch import APIs | `bodyLimit: '2mb'` |
| Standard CRUD endpoints | No `bodyLimit` needed (use global default) |
| Public-facing APIs with untrusted input | Keep the default `100kb` |

### Example: Webhook Receiver for Email Processing

```javascript
// src/routes/api/workflow/triggers.routes.js
module.exports = {
  'workflow-orchestration': [
    {
      method: 'POST',
      httpRoute: '/trigger/webhooks/:mode/:flowDefinitionId',
      route: 'routes/api/workflow/triggers/webhook.route',
      handler: 'handleWebhook',
      protected: false,
      bodyLimit: '5mb',  // Email payloads can exceed 100KB
    },
    {
      method: 'GET',
      httpRoute: '/trigger/webhooks/:bindingId/status',
      route: 'routes/api/workflow/triggers/webhook.route',
      handler: 'getStatus',
      protected: true,
      // No bodyLimit — uses global default (GET has no body anyway)
    },
  ],
};
```
