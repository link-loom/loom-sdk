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
    this._authHandlers = {};
  }

  setup() {
    this._console.success('Loading module', { namespace: this._namespace });

    this.#handleStorageConfig();

    this.#loadAuthHandlers();

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
  #handleHttpMethod({ route, domain, endpoint, router }) {
    // Convert endpoint method to lower case.
    const method = endpoint.method.toLocaleLowerCase();

    // Construct the full route path.
    const routePath = `/${domain}${endpoint.httpRoute}`;

    // Select handler based on streaming flag.
    const routeHandler = endpoint.streaming
      ? (req, res) =>
          this.#handleStreamRoute({ route, domain, endpoint, req, res })
      : (req, res) => this.#handleRoute({ route, domain, endpoint, req, res });

    // An array to hold any middleware functions that need to be applied.
    const middlewares = [];

    // Body parsing per-route: each endpoint gets its own parser with configurable limit.
    const bodyLimit = endpoint.bodyLimit || '100kb';
    middlewares.push(this._dependencies.bodyParser.json({ limit: bodyLimit }));
    middlewares.push(
      this._dependencies.bodyParser.urlencoded({
        extended: true,
        limit: bodyLimit,
      }),
    );

    // If the component supports file uploads, add the file handling middleware.
    if (endpoint.supportFile) {
      middlewares.push(this._storage.single('file'));
    }

    // If the endpoint is protected, add the validation middleware.
    if (endpoint.protected) {
      middlewares.push(this._utilities.validator.api.endpoint);
    }

    // If the endpoint declares an authentication handler, add it.
    const authMiddleware = this.#buildAuthMiddleware(endpoint);
    if (authMiddleware) {
      middlewares.push(authMiddleware);
    }

    // Always add the main route handler as the last middleware.
    middlewares.push(routeHandler);

    // Register the route with all its middleware.
    router[method](routePath, ...middlewares);
  }

  /**
   * Loads the authentication handlers declared in `src/auth/index.js`
   * (optional): `{ '<name>': HandlerClass }`. Each handler is built once with
   * the service dependencies and exposes
   * `authenticate({ req, params, headers })`, which returns a Link Loom
   * response: `success(principal)` or `error(message, { status })`.
   */
  #loadAuthHandlers() {
    const registryPath = this._path.join(
      this._dependencies.root,
      'src',
      'auth',
      'index.js',
    );

    if (!require('fs').existsSync(registryPath)) {
      return;
    }

    const registry = require(registryPath);

    Object.keys(registry || {}).forEach((handlerName) => {
      try {
        const Handler = registry[handlerName];
        this._authHandlers[handlerName] = new Handler(this._dependencies);
      } catch (error) {
        this._console.error(
          `Authentication handler failed: ${handlerName} — ${error?.message}`,
          {
            namespace: this._namespace,
          },
        );
      }
    });
  }

  /**
   * `auth: 'public'` or no `auth` → no middleware. A handler that is not
   * registered fails closed: the route answers 500 instead of running open.
   */
  #buildAuthMiddleware(endpoint) {
    const handlerName = endpoint.auth;

    if (!handlerName || handlerName === 'public') {
      return null;
    }

    const handler = this._authHandlers[handlerName];

    if (!handler || typeof handler.authenticate !== 'function') {
      this._console.error(
        `Route ${endpoint.method} ${endpoint.httpRoute} uses an unregistered authentication handler: ${handlerName}`,
        {
          namespace: this._namespace,
        },
      );

      return (_req, res) => {
        res
          .status(500)
          .json(
            this._utilities.io.response.error(
              `Authentication handler "${handlerName}" is not registered`,
              { status: 500 },
            ),
          );
      };
    }

    return async (req, res, next) => {
      try {
        const params = this._utilities.io.request.getParameters(req);
        const authResponse = await handler.authenticate({
          req,
          params,
          headers: req.headers,
        });

        if (!authResponse?.success) {
          const status =
            authResponse?.status && authResponse.status !== 200
              ? authResponse.status
              : 401;
          res
            .status(status)
            .json(
              authResponse ||
                this._utilities.io.response.error('Unauthorized', { status }),
            );
          return;
        }

        req.principal = authResponse.result;
        next();
      } catch (error) {
        this._console.error(error, { namespace: this._namespace });
        res
          .status(401)
          .json(
            this._utilities.io.response.error('Unauthorized', { status: 401 }),
          );
      }
    };
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
      principal: req.principal,
    });

    // A handler that already wrote to the response (e.g. streamed a file with its own
    // headers) owns the transport; replying JSON on top would throw ERR_HTTP_HEADERS_SENT.
    if (res.headersSent) {
      return;
    }

    res.status(serviceResponse?.status || 200).json(serviceResponse);
  }

  /**
   * Handles SSE (Server-Sent Events) streaming routes.
   *
   * Creates an SSE stream via the sse utility and passes it to the route handler.
   * The handler controls the stream lifecycle — this method does NOT send a JSON response.
   */
  async #handleStreamRoute({ route, domain, endpoint, req, res }) {
    const params = this._utilities.io.request.getParameters(req);
    const headers = req.headers;
    const stream = this._utilities.sse.createStream(res);

    try {
      await route[endpoint.handler]({
        params,
        req,
        res,
        headers,
        stream,
        principal: req.principal,
      });
    } catch (error) {
      if (!stream.closed) {
        stream.send(
          { success: false, message: error?.message || 'Stream error' },
          { event: 'error' },
        );
        stream.close();
      }
    }
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
  #registerEndpoint({ domainPath, endpoint, context }) {
    try {
      const Route = require(
        this._path.join(context.sourceRoot, endpoint.route),
      );

      this.#handleHttpMethod({
        route: new Route(context.dependencies),
        domain: domainPath,
        endpoint,
        router: context.router,
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
  #walkRouterNode(node, domainSegments, context) {
    if (!node) return;

    // Case 1: leaf node is an array of endpoint definitions
    if (Array.isArray(node)) {
      const domainPath = domainSegments.join('/');

      node.forEach((endpoint) => {
        this.#registerEndpoint({ domainPath, endpoint, context });
      });

      return;
    }

    // Case 2: node is a plain object → go deeper into the tree
    if (typeof node === 'object') {
      Object.keys(node).forEach((key) => {
        if (!Object.hasOwnProperty.call(node, key)) return;

        const child = node[key];
        const nextSegments = [...domainSegments, key];

        this.#walkRouterNode(child, nextSegments, context);
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
  #buildApiEndpoints(context) {
    const router = require(
      this._path.join(context.sourceRoot, 'routes', 'router'),
    );

    // Iterate over each root key in the router and walk the tree.
    Object.keys(router).forEach((rootKey) => {
      if (!Object.hasOwnProperty.call(router, rootKey)) return;

      const node = router[rootKey];

      // Start recursion with the root key as the first domain segment.
      this.#walkRouterNode(node, [rootKey], context);
    });
  }

  /**
   * Mounts every loaded namespace on its own prefix, with its own router,
   * dependencies and OpenAPI document. Namespaces are mounted before the
   * default router so its 404 catch-all never hides them.
   */
  #buildNamespaces() {
    const namespaces = this._dependencies.NamespacesModule?.namespaces || [];

    namespaces.forEach((namespaceContext) => {
      const routerPath = this._path.join(
        namespaceContext.sourceRoot,
        'routes',
        'router.js',
      );

      if (!require('fs').existsSync(routerPath)) {
        this._console.info(
          `Namespace without routes: ${namespaceContext.name}`,
          { namespace: this._namespace },
        );
        return;
      }

      try {
        const namespaceRouter = this._express.Router();

        this.#buildApiEndpoints({
          sourceRoot: namespaceContext.sourceRoot,
          dependencies: namespaceContext.dependencies,
          router: namespaceRouter,
        });

        this.#buildDocs({
          mountPath: namespaceContext.prefix,
          apis: [
            this._path.join(
              namespaceContext.sourceRoot,
              'routes',
              'api',
              '**',
              '*.route.js',
            ),
            this._path.join(
              namespaceContext.sourceRoot,
              'models',
              '**',
              '*.js',
            ),
          ],
          title: `${this._config?.server?.name || 'Link Loom API'} · ${namespaceContext.name}`,
        });

        this._app.use(namespaceContext.prefix || '/', namespaceRouter);
      } catch (error) {
        this._console.error(
          `Namespace routes failed: ${namespaceContext.name} — ${error?.message}`,
          {
            namespace: this._namespace,
          },
        );
      }
    });
  }

  /**
   * Builds OpenAPI docs for the current service.
   *
   * It tries to resolve the SDK base model using the package name
   * (normal dependency usage) and falls back to a local path when
   * running directly from the SDK repository.
   */
  #buildDocs({ mountPath = '', apis, title } = {}) {
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

    const documentTitle =
      title || this._config?.server?.name || 'Link Loom API';

    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: documentTitle,
          version: this._config?.server?.version || '1.0.0',
        },
        servers: [
          {
            url: `http://localhost:${this._config?.server?.port || 8080}${mountPath}`,
            description: this._config?.server?.id || '',
          },
        ],
      },
      apis: [
        ...(apis || ['src/routes/api/**/*.route.js', 'src/models/**/*.js']),
        baseModelPath,
      ],
      customSiteTitle: documentTitle,
    };

    const specs = this._swaggerJsdoc(options);
    const uiOptions = {
      customSiteTitle: `${documentTitle} - ${this._config?.server?.version}`,
    };

    // serveFiles keeps one UI per document; the global `serve` would share state.
    this._app.use(
      `${mountPath}/open-api.playground`,
      this._swaggerUi.serveFiles(specs, uiOptions),
      this._swaggerUi.setup(specs, uiOptions),
    );

    this._app.get(`${mountPath}/open-api.json`, (_, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
  }

  #buildRoutes() {
    this.#buildDocs();

    this.#buildNamespaces();

    // Default namespace: the service's own src/ tree, mounted at the root path.
    this.#buildApiEndpoints({
      sourceRoot: this._path.join(this._dependencies.root, 'src'),
      dependencies: this._dependencies,
      router: this._router,
    });

    this._app.use('/', this._router);

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
