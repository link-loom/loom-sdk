# HTTP Adapter

> **Namespace**: `[Loom]::[Adapter]::[HTTP]::*` > **Module**: `ApiModule`

The HTTP Adapter wraps `express` to provide a structured way to define REST APIs.

## Features

- **Automatic Routing**: Reads `src/routes/router.js` and builds the route tree.
- **OpenAPI / Swagger**: Auto-generates `swagger.json` and a UI playground from code and JSDoc.
- **Middleware**: Built-in validation, file upload handling (`multer`), and security.

## The Router Definition

API routes are defined in a JS object structure in `src/routes/router.js`.

```javascript
// src/routes/router.js
module.exports = {
  // Domain: "users"
  users: [
    {
      method: 'GET',
      httpRoute: '/:id',
      route: 'routes/users/get-user.route.js',
      handler: 'handle', // Function name in the class
      protected: true, // Requires Auth
    },
  ],
};
```

This generates `GET /users/:id`.

## The Route Class

Each endpoint maps to a Route Class.

```javascript
// src/routes/users/get-user.route.js
class GetUserRoute {
  constructor(dependencies) {
    this._db = dependencies.database.client;
  }

  async handle({ params, req, res }) {
    const user = await this._db.find(params.id);
    return { ok: true, data: user };
  }
}
```

## OpenAPI Playground

The adapter automatically serves Swagger UI at:

- `http://localhost:PORT/open-api.playground`
- `http://localhost:PORT/open-api.json`
