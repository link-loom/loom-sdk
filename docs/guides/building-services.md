# Building Services

This guide walks you through creating a complete functionality in Link Loom SDK, from data model to API endpoint.

## Scenario

We want to build a **Product Catalog**. We need to:

1.  Define a `Product` type.
2.  Create a `ProductService` to handle logic.
3.  Expose a `GET /products` API endpoint.

---

## Step 1: Define the Data Model

While not strictly required, defining a type helps with validation and documentation.

**File**: `src/utils/data-types/definition.types.js` (or dynamically registered)

```javascript
/* Not covered in this simplified guide, but recommended for advanced use */
```

---

## Step 2: Create the Service

The Service contains the **Business Logic**. It should be transport-agnostic (it doesn't know about HTTP req/res objects).

**File**: `src/services/products/product.service.js`

```javascript
class ProductService {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._console = dependencies.console;
    // Assuming a database client is available
    this._db = dependencies.database.api.client;

    this._namespace = '[Service]::[Product]';
  }

  async listProducts({ limit = 10 }) {
    this._console.info(`Listing ${limit} products`, {
      namespace: this._namespace,
    });

    // Mock DB Call
    return [
      { id: 1, name: 'Loom T-Shirt', price: 25.0 },
      { id: 2, name: 'Loom Mug', price: 12.5 },
    ].slice(0, limit);
  }
}

module.exports = ProductService;
```

**Register the Service**:
Add it to `src/services/index.js` (if your setup requires manual registration) or ensure your `ServiceModule` scans it.

---

## Step 3: Create the Route

The Route handles the **HTTP specifics**: parsing params, validating headers, and calling the Service.

**File**: `src/routes/products/list-products.route.js`

```javascript
class ListProductsRoute {
  constructor(dependencies) {
    this._productService =
      new (require('../../services/products/product.service'))(dependencies);
  }

  /**
   * @param {Object} ctx
   * @param {Object} ctx.req - Express Request
   * @param {Object} ctx.res - Express Response
   * @param {Object} ctx.params - Merged query and path params
   */
  async handle({ params }) {
    try {
      const products = await this._productService.listProducts({
        limit: params.limit,
      });

      return {
        status: 200,
        ok: true,
        data: products,
      };
    } catch (error) {
      return {
        status: 500,
        ok: false,
        error: error.message,
      };
    }
  }
}

module.exports = ListProductsRoute;
```

---

## Step 4: Register the Route

Map the route to a URL in `src/routes/router.js`.

**File**: `src/routes/router.js`

```javascript
module.exports = {
  // Domain "shop"
  shop: {
    // Sub-domain "products"
    products: [
      {
        method: 'GET',
        httpRoute: '/', // Result: GET /shop/products/
        route: 'routes/products/list-products.route.js',
        handler: 'handle',
        protected: false,
      },
    ],
  },
};
```

---

## Step 5: Test It

Start your server and visit:
`http://localhost:8080/shop/products?limit=5`

You should see the JSON response.
