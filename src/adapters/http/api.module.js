class ApiModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;
    this._utilities = dependencies.utilities;

    /* Custom Properties */
    this._config = dependencies.config;
    this._app = dependencies.express;
    this._express = dependencies.expressModule;
    this._swaggerJsdoc = dependencies.swaggerJsdoc;
    this._swaggerUi = dependencies.swaggerUi;

    /* Assigments */
    this._namespace = '[Loom]::[Adapter]::[HTTP]::[API]';
    this._router = this._express.Router();
    this._path = dependencies.path;
    this._multer = dependencies.multerModule;
    this._storage = {};
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    this.#handleStorageConfig();

    this.#buildRoutes();

    this._console.success('Module loaded', { namespace: this._namespace });
  }

  /**
   * Handles the HTTP method for a given route, domain, and endpoint.
   *
   * This function takes in details about the route, domain, and endpoint, and
   * sets up the appropriate route handler with any necessary middleware
   * based on the properties of the endpoint and component.
   *
   * @param {Object} args - The arguments object.
   * @param {Object} args.route - Information about the route.
   * @param {string} args.domain - The domain for the route.
   * @param {Object} args.endpoint - Information about the endpoint including its method, httpRoute, and whether it's protected.
   * @returns {void}
   */
  #handleHttpMethod({ route, domain, endpoint }) {
    // Convert endpoint method to lower case.
    const method = endpoint.method.toLocaleLowerCase();

    // Construct the full route path.
    const routePath = `/${domain}${endpoint.httpRoute}`;

    // Define the main route handler function.
    const routeHandler = (req, res) =>
      this.#handleRoute({ route, domain, endpoint, req, res });

    // An array to hold any middleware functions that need to be applied.
    const middlewares = [];

    // If the component supports file uploads, add the file handling middleware.
    if (endpoint.supportFile) {
      middlewares.push(this._storage.single('file'));
    }

    // If the endpoint is protected, add the validation middleware.
    if (endpoint.protected) {
      middlewares.push(this._utilities.validator.api.endpoint);
    }

    // Always add the main route handler as the last middleware.
    middlewares.push(routeHandler);

    // Register the route with all its middleware.
    this._router[method](routePath, ...middlewares);
  }

  #handleStorageConfig() {
    this._storage = this._multer({
      limits: {
        fileSize: this._config?.modules?.storage?.settings?.maxFileSize, // 5MB by default
      },
      storage: this._multer.memoryStorage(),
    });
  }

  async #handleRoute({ route, domain, endpoint, req, res }) {
    const params = this._utilities.io.request.getParameters(req);
    const headers = req.headers;

    const serviceResponse = await route[endpoint.handler]({
      params,
      req,
      res,
      headers,
    });

    res.status(serviceResponse?.status || 200).json(serviceResponse);
  }

  /**
   * Registers a single endpoint for a given domain path.
   *
   * This helper centralizes the "require + handleHttpMethod" logic so it
   * can be reused by both flat and nested router definitions.
   *
   * @private
   * @param {Object} args
   * @param {string} args.domainPath - Joined domain segments, e.g. "finance/transactions".
   * @param {Object} args.endpoint   - Endpoint definition from the router tree.
   */
  #registerEndpoint({ domainPath, endpoint }) {
    try {
      const Route = require(
        this._path.join(this._dependencies.root, `src/${endpoint.route}`),
      );

      this.#handleHttpMethod({
        route: new Route(this._dependencies),
        domain: domainPath,
        endpoint,
      });
    } catch (error) {
      this._console.error(
        `Endpoint failed: ${JSON.stringify({
          domain: domainPath,
          endpoint,
          error: error?.message,
        })}`,
        true,
      );
    }
  }

  /**
   * Walks a router node recursively and registers its endpoints.
   *
   * It supports:
   * - flat structures: { communication: [ ... ] }
   * - nested structures: { finance: { transactions: { auditing: [ ... ] } } }
   *
   * @private
   * @param {*} node - Current node in the router tree (object or array).
   * @param {string[]} domainSegments - Accumulated domain segments.
   */
  #walkRouterNode(node, domainSegments = []) {
    if (!node) return;

    // Case 1: leaf node is an array of endpoint definitions
    if (Array.isArray(node)) {
      const domainPath = domainSegments.join('/');

      node.forEach((endpoint) => {
        this.#registerEndpoint({ domainPath, endpoint });
      });

      return;
    }

    // Case 2: node is a plain object → go deeper into the tree
    if (typeof node === 'object') {
      Object.keys(node).forEach((key) => {
        if (!Object.hasOwnProperty.call(node, key)) return;

        const child = node[key];
        const nextSegments = [...domainSegments, key];

        this.#walkRouterNode(child, nextSegments);
      });

      return;
    }

    // Case 3: unsupported type (string, number, etc.) → log a warning
    this._console.warn?.(
      `Unsupported router node type at "${domainSegments.join('/')}": ${typeof node}`,
    );
  }

  /**
   * Builds all API endpoints declared in `src/routes/router.js`.
   *
   * This implementation supports both:
   * - flat domains: { communication: [ ... ] }
   * - nested domains: { finance: { transactions: { auditing: [ ... ] } } }
   *
   * The final HTTP path is built by joining domain segments with `/`
   * and appending `endpoint.httpRoute`. For example:
   *   domainSegments = ['finance', 'transactions', 'auditing']
   *   endpoint.httpRoute = '/accounting-lock/list'
   *   → /finance/transactions/auditing/accounting-lock/list
   */
  #buildApiEndpoints() {
    const router = require(
      this._path.join(this._dependencies.root, 'src', 'routes', 'router'),
    );

    // Iterate over each root key in the router and walk the tree.
    Object.keys(router).forEach((rootKey) => {
      if (!Object.hasOwnProperty.call(router, rootKey)) return;

      const node = router[rootKey];

      // Start recursion with the root key as the first domain segment.
      this.#walkRouterNode(node, [rootKey]);
    });

    // All API REST endpoints are mounted under the root path.
    this._app.use('/', this._router);
  }

  /**
   * Builds OpenAPI docs for the current service.
   *
   * It tries to resolve the SDK base model using the package name
   * (normal dependency usage) and falls back to a local path when
   * running directly from the SDK repository.
   */
  #buildDocs() {
    let baseModelPath;

    try {
      // Normal case: SDK installed as dependency in node_modules
      baseModelPath = this._path.resolve(
        require.resolve('@link-loom/sdk/src/utils/models/base.model.js'),
      );
    } catch (error) {
      // Local dev case: running directly from the SDK repo
      baseModelPath = this._path.resolve(
        this._path.join(
          __dirname,
          '..',
          '..',
          'utils',
          'models',
          'base.model.js',
        ),
      );

      this._console.warn?.(
        '[HTTP::API] Falling back to local base.model.js path for OpenAPI docs: ' +
          baseModelPath,
      );
    }

    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: this._config?.server?.name || 'Link Loom API',
          version: this._config?.server?.version || '1.0.0',
        },
        servers: [
          {
            url: `http://localhost:${this._config?.server?.port || 8080}`,
            description: this._config?.server?.id || '',
          },
        ],
      },
      apis: [
        'src/routes/api/**/*.route.js',
        'src/models/**/*.js',
        baseModelPath,
      ],
      customSiteTitle: this._config?.server?.name || 'Link Loom API',
    };

    const specs = this._swaggerJsdoc(options);

    this._app.use(
      '/open-api.playground',
      this._swaggerUi.serve,
      this._swaggerUi.setup(specs, {
        customSiteTitle: `${this._config?.server?.name} - ${this._config?.server?.version}`,
      }),
    );

    this._app.get('/open-api.json', (_, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
  }

  #buildRoutes() {
    this.#buildDocs();

    this.#buildApiEndpoints();

    // Something else route response a 404 error
    this._router.get('{*splat}', (_req, res) => {
      res
        .status(404)
        .send(
          'This API is not fully armed and operational... Try another valid route.',
        );
    });
  }
}

module.exports = { ApiModule };
