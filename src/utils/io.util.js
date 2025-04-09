class IOUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Loom]::[Utils]::[IO]';
  }

  #getParameters(data) {
    if (!data) {
      return {};
    }

    let params = {};

    if (!this._utilities.validator.object.isEmpty(data.query)) {
      params = { ...params, ...data.query };
    }
    if (!this._utilities.validator.object.isEmpty(data.body)) {
      params = { ...params, ...data.body };
    }
    if (!this._utilities.validator.object.isEmpty(data.params)) {
      params = { ...params, ...data.params };
    }

    return params;
  }

  #throwError(message, { status } = {}) {
    if (message) {
      return {
        status: status || 500,
        success: false,
        message,
        result: null,
      };
    }

    return {
      status: status || 500,
      success: false,
      message: 'Something was wrong while you make this action',
      result: null,
    };
  }

  #throwSuccess(data, message, { status } = {}) {
    return {
      status: status || 200,
      success: true,
      message: message || 'Operation completed successfully',
      result: data || {},
    };
  }

  #cleanObjectData(rawObj) {
    if (rawObj && rawObj.formatted) {
      return rawObj.formatted;
    } else if (rawObj && rawObj.data) {
      return rawObj.data;
    } else {
      return null;
    }
  }

  get request() {
    return {
      getParameters: this.#getParameters.bind(this),
    };
  }

  get response() {
    return {
      success: this.#throwSuccess.bind(this),
      error: this.#throwError.bind(this),
      clean: this.#cleanObjectData.bind(this),
    };
  }
}

module.exports = IOUtil;
