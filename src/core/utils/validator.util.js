class ValidatorUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._config = this._dependencies.config;

    /* Custom Properties */
    this._bcrypt = this._dependencies.bcrypt;
    this._jwt = this._dependencies.jwt;

    /* Assigments */
    this._namespace = '[Server]::[Utils]::[Validator]';
  }

  #objectIsEmpty(obj) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return false;
      }
    }
    return true;
  }

  #hashIsValid(payload) {
    let passwordIsValid = false;

    if (payload && payload.receivedPassword && payload.hash) {
      passwordIsValid = this._bcrypt.compareSync(
        payload.receivedPassword,
        payload.hash,
      );
    }

    return passwordIsValid;
  }

  #validateToken(token) {
    return new Promise((resolve, reject) => {
      this._jwt.verify(
        token,
        this._dependencies.config.SERVER.SECRET,
        (err, decoded) => {
          if (err) {
            return reject(err);
          } else {
            resolve(decoded);
          }
        },
      );
    });
  }

  /**
   * Verifies if the provided signed data is valid by comparing it with an expected HMAC signature.
   *
   * @param {string} signedData - The signed data to verify. It should be in the format 'data_signature'.
   * @param {string} secret - The secret key used to generate the HMAC signature.
   * @returns {boolean} Returns true if the HMAC signature is valid, false otherwise.
   */
  #validateSignedData(signedData, secret) {
    const [data, providedSignature] = signedData.split('_');
    const expectedSignature = this._utilities.crypto.hmac.generateSignature(
      data,
      secret,
    );

    return providedSignature === expectedSignature;
  }

  async #validateApi(req, res, next) {
    try {
      // check header or url parameters or post parameters for token
      const encryptedToken =
        req.body.token || req.query.token || req.headers['x-access-token'];

      // exist token
      if (!encryptedToken) {
        // if there is no token return an error
        return res
          .status(403)
          .json(this._utilities.io.response.error('No token provided.'));
      }

      const decipherToken = this._utilities.encoder.crypto.decipherObject(
        this._config.SERVICES.API_MANAGER.SECRET,
        encryptedToken,
      );

      if (!decipherToken || !decipherToken.token) {
        return res
          .status(403)
          .json(
            this._utilities.io.response.error(
              'Malformed token. Try with a valid token',
            ),
          );
      }

      const decoded = await this.#validateToken(decipherToken.token);
      req.decodedToken = decoded;
      req.token = encryptedToken;

      next();
    } catch (error) {
      return res
        .status(403)
        .json(
          this._utilities.io.response.error('Failed to authenticate token.'),
        );
    }
  }

  #responseIsValid(property) {
    let isValid = false;

    if (property && property.success === true) {
      isValid = true;
    }

    return isValid;
  }

  get validator() {
    return {
      object: {
        isEmpty: this.#objectIsEmpty.bind(this),
      },
      hash: {
        isValid: this.#hashIsValid.bind(this),
      },
      jwt: {
        token: this.#validateToken.bind(this),
      },
      api: {
        endpoint: this.#validateApi.bind(this),
      },
      signedData: {
        isValid: this.#validateSignedData.bind(this),
      },
      response: this.#responseIsValid.bind(this),
    };
  }
}

module.exports = ValidatorUtil;
