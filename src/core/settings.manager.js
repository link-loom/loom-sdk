class SettingsManager {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = this._dependencies.console;
    this._utilities = this._dependencies.utilities;
    this._config = this._dependencies.config;

    /* Custom Properties */
    this._express = this._dependencies.express;
    this._httpServer = this._dependencies.httpServer;

    /* Assigments */
    this._namespace = '[Server]::[Settings]::[Manager]';
  }

  setup() {
    console.log(
      ` ${this._dependencies.colors.green(`${this._namespace}:`)} Loading`,
    );

    this.#setupServer();

    console.log(
      ` ${this._dependencies.colors.green(`${this._namespace}:`)} Loaded`,
    );
  }

  #setupServer() {
    this.#securityConfigs();
    this.#ioConfigs();

    console.log(
      ` ${this._dependencies.colors.green(
        `${this._namespace}:`,
      )} Configured server middlewares`,
    );
  }

  /**
   * Setup security configurations
   */
  #securityConfigs() {
    this._express.use(this._dependencies.helmet());
    this._express.disable('x-powered-by');
    this._express.use(this._dependencies.compress());

    this._express.use(this._dependencies.cors());
  }

  #ioConfigs() {
    // use body parser so we can get info from POST and/or URL parameters
    this._express.use(
      this._dependencies.bodyParser.urlencoded({ extended: true }),
    ); // support encoded bodies
    this._express.use(this._dependencies.bodyParser.json()); // support json encoded bodies
    this._express.use(this._dependencies.cookieParser());
  }

  listenServer() {
    const port = this._utilities.sanitizer.port(process.env.PORT || this._config.SERVER.PORT || 3500);

    if (!port) {
      this._console.error(
        'Failed to find a port for this app, please setup on PORT environment variable or default config file',
      );
      process.exit(0);
    }

    this._httpServer.listen(port);
  }
}

module.exports = { SettingsManager };
