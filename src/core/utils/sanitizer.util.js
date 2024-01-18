class SanitizerUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Server]::[Utils]::[Sanitizer]';
  }

  #sanitizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) return val;
    if (port >= 0) return port;

    return false;
  }

  get sanitizer() {
    return {
      port: this.#sanitizePort.bind(this),
    };
  }
}

module.exports = SanitizerUtil;
