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
    this._namespace = '[Server]::[API]::[Module]';
    this._apiRoutes = this._express.Router();
    this._path = dependencies.path;
    this._multer = dependencies.multerModule;
    this._storage = {};
  }

  setup() {
    this._console.success('Loading', { namespace: this._namespace });

    this.#handleStorageConfig();

    this.#buildRoutes();

    this._console.success('Loaded', { namespace: this._namespace });
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
    this._apiRoutes[method](routePath, ...middlewares);
  }

  #handleStorageConfig() {
    this._storage = this._multer({
      limits: {
        fileSize: this._config?.behaviors?.storage?.settings?.maxFileSize, // 5MB by default
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

  #buildApiEndpoints() {
    const router = require(
      this._path.join(this._dependencies.root, 'src', 'routes', 'router'),
    );

    // Iterate over domain inside router file and try to build all API Rest routes
    for (const domainName in router) {
      if (Object.hasOwnProperty.call(router, domainName)) {
        const domain = router[domainName];

        domain.map((endpoint) => {
          try {
            const Route = require(
              this._path.join(this._dependencies.root, `src/${endpoint.route}`),
            );

            this.#handleHttpMethod({
              route: new Route(this._dependencies),
              domain: domainName,
              endpoint,
            });
          } catch (error) {
            this._console.error(
              `Endpoint failed: ${JSON.stringify(endpoint)}`,
              true,
            );
          }

          return endpoint;
        });
      }
    }

    // All API Rest endpoints are part of the root
    this._app.use('/', this._apiRoutes);
  }

  #buildDocs() {
    const baseModelPath = this._path.resolve(
      require.resolve('@link-loom/sdk/src/utils/models/base.model.js')
    );
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
      apis: ['src/routes/api/**/*.route.js', 'src/models/**/*.js', baseModelPath],
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
    this._apiRoutes.get('*', (_req, res) => {
      res
        .status(404)
        .send(
          'This API is not fully armed and operational... Try another valid route.',
        );
    });
  }
}

module.exports = { ApiModule };
