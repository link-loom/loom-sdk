class FunctionsModule {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = dependencies.console;

    /* Custom Properties */
    this._moment = this._dependencies.moment;
    this._path = this._dependencies.path;

    /* Assigments */
    this._namespace = '[Loom]::[Functions]';
    this._cluster = require(
      this._path.join(this._dependencies.root, 'src/functions/index'),
    );
    this._functions = {
      cache: {},
      timed: {},
      startup: {},
    };

    this._console.success('Loading', { namespace: this._namespace });

    this.#createCache();
    this.#createTimed();
    this.#createStartup();

    this._console.success('Loaded', { namespace: this._namespace });
  }

  #createCache() {
    this._console.info('Initializing Cache Functions', {
      namespace: this._namespace,
    });

    // build all cache functions
    this._cluster.cache.map((functionDefinition) => {
      try {
        this._console.info(`Setting up ${functionDefinition.name} function`, {
          namespace: this._namespace,
        });

        /* Setup config */
        const functionName = functionDefinition.name;
        const pathname = this._path.join(
          this._dependencies.root,
          'src',
          functionDefinition.route,
        );
        const Function = require(pathname);

        /* Setup namespace */
        this._functions.cache[functionName] = new Function(this._dependencies);
      } catch (error) {
        this._console.error(
          `Function failed: ${JSON.stringify(functionDefinition)}`,
          { namespace: this._namespace },
        );
        this._console.log(error);
      }

      return functionDefinition;
    });
  }

  #createTimed() {
    this._console.info('Initializing Timed Functions', {
      namespace: this._namespace,
    });

    // build each timed routes
    this._cluster.timed.map((functionDefinition) => {
      try {
        this._console.info(`Setting up ${functionDefinition.name} function`, {
          namespace: this._namespace,
        });

        /* Setup config */
        const pathname = this._path.join(
          this._dependencies.root,
          'src',
          functionDefinition.route,
        );
        const functionName = functionDefinition.name;
        const Function = require(pathname);
        const seconds =
          this._moment(`${functionDefinition.startAt}`, 'hh:mm:ss').diff(
            this._moment(),
            'milliseconds',
          ) > 0
            ? /* Add the next ticket if has time remaining */
            this._moment(`${functionDefinition.startAt}`, 'hh:mm:ss').diff(
              this._moment(),
              'milliseconds',
            )
            : /* Add necesary time to next ticket */
            this._moment(`${functionDefinition.startAt}`, 'HH:mm:ss')
              .add(
                this._moment.duration(
                  +`${functionDefinition.intervalTime}`,
                  `${functionDefinition.intervalMeasure}`,
                ),
                `${functionDefinition.intervalMeasure}`,
              )
              .diff(this._moment(), 'milliseconds');

        /* Including in dependencies */
        this._functions.timed[functionName] = new Function(this._dependencies);

        if (seconds > 0) {
          setTimeout(() => {
            /* Setup next ticks */
            setInterval(
              () => {
                this._functions.timed[functionName].run.bind(
                  this._functions.timed[functionName],
                )();
              },
              this._moment
                .duration(
                  +`${functionDefinition.intervalTime}`,
                  `${functionDefinition.intervalMeasure}`,
                )
                .as('milliseconds'),
            );
          }, seconds);
        }
      } catch (error) {
        this._console.error(
          `Function failed: ${JSON.stringify(functionDefinition)}`,
          { namespace: this._namespace },
        );
        this._console.log(error);
      }

      return functionDefinition;
    });
  }

  #createStartup() {
    this._console.info('Initializing Startup Functions', {
      namespace: this._namespace,
    });

    // build each startup routes
    this._cluster.startup.map((functionDefinition) => {
      try {
        this._console.info(`Setting up ${functionDefinition.name} function`, {
          namespace: this._namespace,
        });

        /* Setup config */
        const pathname = this._path.join(
          this._dependencies.root,
          'src',
          functionDefinition.route,
        );
        const functionName = functionDefinition.name;
        const Function = require(pathname);

        /* Setup namespace */
        this._functions.startup[functionName] = new Function(
          this._dependencies,
        );

        this.#executeStartupFunction(functionDefinition);
      } catch (error) {
        this._console.error(
          `Function failed: ${JSON.stringify(functionDefinition)}`,
          { namespace: this._namespace },
        );
        this._console.log(error);
      }

      return functionDefinition;
    });
  }

  #executeStartupFunction(definition) {
    if (definition.executionMode === 'atTime') {
      this._functions.startup[definition.name].run();
    } else {
      if (this._dependencies.eventBus?.bus?.on) {
        this._dependencies.eventBus?.bus?.on('server::loaded', () => {
          this._functions.startup[definition.name].run();
        });
      }
    }
  }

  get definition() {
    return this._functions;
  }

  get cluster() {
    return this._cluster;
  }
}

module.exports = { FunctionsModule };
