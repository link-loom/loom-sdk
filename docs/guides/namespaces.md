# Namespaces

A **namespace** is a module inside one Link Loom service with its own **routes, services and models** (and, if it declares them, **functions, workers, streams and events**), mounted under **its own URL prefix**. It is the modular-monolith pattern — Rails mountable engines, Django apps mounted with `include`, NestJS modules with `RouterModule`: one deployment, clear boundaries between modules, and the option to move one to its own deployment later without rewriting it.

Namespaces are **optional**. A service without namespaces works exactly as before.

## The default namespace

Your service's own `src/` tree (`src/routes`, `src/services`, `src/models`, `src/functions`, …) **is the default namespace**. It keeps its place and its behavior and is mounted at `/`. Nothing changes for existing services.

## Declaring namespaces

Namespaces are declared explicitly in `src/namespaces/index.js`. Nothing is discovered automatically.

```js
// src/namespaces/index.js
module.exports = [
  { name: 'catalog', root: 'namespaces/catalog', prefix: '/catalog' },
  { name: 'billing', root: 'namespaces/billing', prefix: '/billing' },
];
```

| Property | Required | Description |
| :------- | :------- | :---------- |
| `name` | Yes | Unique name. |
| `root` | Yes | Folder of the namespace, relative to `src/`. |
| `prefix` | No | URL prefix. You choose it: the SDK never adds `/api`, a version or any other segment. `''` mounts the namespace at `/`. Defaults to `/<name>`. |

Invalid entries (missing `name` or `root`) and duplicated names are skipped and logged.

### Per-environment overrides

Each environment's configuration can turn a namespace off or move it:

```json
{
  "namespaces": {
    "billing": { "enabled": false },
    "catalog": { "prefix": "/shop" }
  }
}
```

This is how the same image can be deployed with only one namespace active. The namespace also sees this section as `dependencies.namespace.config`.

## Folder layout

Each namespace repeats the layout of a Link Loom service, relative to its own folder:

```
src/
  routes/ services/ models/ functions/   ← default namespace (unchanged)
  namespaces/
    index.js                              ← registry
    billing/
      routes/router.js                    ← required to expose HTTP routes
      routes/api/invoice/invoice.routes.js
      routes/api/invoice/invoice.route.js
      services/index.js                   ← required
      services/invoice/invoice.service.js
      models/index.js                     ← required
      models/invoice/invoice.model.js
      functions/index.js                  ← optional
      workers/index.js                    ← optional
      streams/index.js                    ← optional
      events/index.js                     ← optional
```

Every `route` and `filename` inside a namespace (routes, functions, workers, events) is relative to the namespace folder, the same way they are relative to `src/` in the default namespace:

```js
// src/namespaces/billing/routes/api/invoice/invoice.routes.js
module.exports = {
  invoice: [
    { httpRoute: '/:queryselector', route: '/routes/api/invoice/invoice.route', handler: 'get', method: 'GET', auth: 'default' },
    { httpRoute: '/', route: '/routes/api/invoice/invoice.route', handler: 'create', method: 'POST', auth: 'default' },
  ],
};
// → GET /billing/invoice/:queryselector, POST /billing/invoice/
```

## What each namespace gets

Each namespace receives **its own dependencies object**: the namespace's own pieces, falling back to the service's global dependencies for everything else.

| Dependency | In a namespace |
| :--------- | :------------- |
| `services`, `models` | Only the namespace's own. |
| `functions`, `WorkersModule`, `streams` | The namespace's own, or empty if it declares none. |
| `DataTypesModule` | A scoped type registry: the namespace's models plus the built-in types and the default namespace's models. Two namespaces can declare models with the same class name. |
| `console` | Same API; every message is tagged `[Namespace]::[<name>]`. |
| `namespace` | `{ name, prefix, sourceRoot, config }`. |
| `express`, `httpServer`, `database`, `utilities`, `config`, `storage`, `observability`, `eventBus`, … | Global, shared. |

Namespaces never see each other's services or models. If one namespace needs another, call the other's HTTP API or expose an explicit facade from your service; do not reach into its services, models or database.

## Databases

The database provider is one for the whole service. **The database is chosen by each service, not by the registry**: next to its table (`this._tableName`), a service declares its database (`this._databaseName`) and passes it as an argument on every call. Providers accept `databaseName` on every method and fall back to their configured database when it is not given.

```js
class BillingInvoiceService {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._database = this._dependencies?.database?.default?.adapter;
    this._models = this._dependencies.models;
    this._tableName = 'invoice';
    this._databaseName = 'billing';
  }

  async create({ params, principal }) {
    // …guard clauses…
    const entity = new this._models.BillingInvoiceModel(params, this._dependencies);

    return this._database.create({
      tableName: this._tableName,
      databaseName: this._databaseName,
      entity: entity.get,
    });
  }
}
```

Services of the default namespace do not pass `databaseName` and keep using the configured database. Index declarations follow the same rule (`createIndexes({ tableName, databaseName, specs })`), typically from a startup function of the namespace.

## Route authentication

Authentication is declared **per route**, like `protected`:

- `protected: true` keeps working exactly as before.
- `auth: '<name>'` runs an authentication handler registered by the service.
- `auth: 'public'` (or no `auth`) leaves the route open.
- A route that names a handler that is not registered **fails closed**: it answers `500` instead of running without authentication.

Handlers are registered in `src/auth/index.js` (optional), shared by every namespace:

```js
// src/auth/index.js
module.exports = {
  default: require('./default/default.auth'),
};
```

A handler is a class built once with the service dependencies. `authenticate({ req, params, headers })` returns a Link Loom response: `success(principal)` lets the request through, and `error(message, { status })` rejects it (`401` if no status is given).

```js
class DefaultAuthHandler {
  constructor(dependencies) {
    this._utilities = dependencies.utilities;
    this._jwt = dependencies.jwt;
    this._secret = dependencies.config?.server?.secret;
  }

  async authenticate({ headers }) {
    const authorization = headers?.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      return this._utilities.io.response.error('Provide a bearer token', { status: 401 });
    }

    try {
      const claims = this._jwt.verify(authorization.slice('Bearer '.length), this._secret);
      return this._utilities.io.response.success({ subject: claims.sub, claims });
    } catch (error) {
      return this._utilities.io.response.error('Invalid or expired token', { status: 401 });
    }
  }
}
```

The route handler receives the principal next to the usual context:

```js
async create({ params, principal }) {
  const entityService = new this.EntityService(this._dependencies);
  return entityService.create({ params, principal });
}
```

The SDK knows nothing about any identity provider: the service that uses it writes its handlers.

## OpenAPI

Each namespace publishes its own document at `<prefix>/open-api.json` and its playground at `<prefix>/open-api.playground`, built from the namespace's `routes/api/**/*.route.js` and `models/**/*.js`. The document's server URL includes the prefix, so `@swagger` paths inside a namespace are written **relative to the prefix** (`/invoice/{queryselector}`, not `/billing/invoice/{queryselector}`). The default document stays at `/open-api.json`.

## Loading and failures

On boot, after the default namespace's models, services, streams, functions and workers, the SDK loads each enabled namespace in order and mounts its routes **before** the default router, so the default 404 never hides them. A namespace that fails to load (missing folder, a model or service that throws) is **disabled and logged**, and the service boots with the rest.

`dependencies.NamespacesModule` exposes the loaded namespaces: `namespaces` (list of `{ name, prefix, sourceRoot, dependencies }`) and `get(name)`.
