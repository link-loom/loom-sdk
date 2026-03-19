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

1.  **Storage (`multer`)**: Injected if `supportFile: true`.
2.  **Validator**: Injected if `protected: true`. Validates `ctx.params` against the Service Schema.
3.  **Handler**: The final execution wrapper that calls your Route Class.

```mermaid
graph LR
    Req[Request] --> Router
    Router -->|protected?| Validator
    Validator -->|valid| Handler
    Handler --> RouteClass
    RouteClass --> Service
    Service --> DB
```
