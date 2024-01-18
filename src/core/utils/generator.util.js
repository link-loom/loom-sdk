class GeneratorUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._crypto = this._dependencies.crypto;
    this._bcrypt = this._dependencies.bcrypt;
    this._jwt = this._dependencies.jwt;

    /* Assigments */
    this._namespace = '[Server]::[Utils]::[Generator]';
  }

  #idGenerator({ length, prefix }) {
    // Generate 256 random bytes and converted to hex to prevent failures on unscaped chars
    const buffer = this._crypto.randomBytes(256);
    const randomToken = buffer.toString('hex');
    // Generating of token
    return `${prefix || 'id-'}${randomToken.slice(0, length || 15)}`;
  }

  #generatePrivateKey(seed) {
    // Get a 32 bit hash from given seed
    const hashString = this._crypto
      .createHash('sha256')
      .update(seed || '', 'utf8')
      .digest('hex')
      .slice(0, 32);
    // Cast the string to a array buffer
    const hashBuffer = Uint8Array.from(hashString, (x) => x.charCodeAt(0));
    // Cast array buffer to array int
    return [...hashBuffer];
  }

  #stringToHash(payload) {
    if (!payload || typeof payload !== 'string') {
      return null;
    }

    return this._bcrypt.hashSync(payload, 8);
  }

  #generateJWTToken({ tokenizedData, payload, settings }) {
    try {
      if (!tokenizedData || !payload) {
        return null;
      }

      const token = this._jwt.sign(tokenizedData, settings.secret, {
        expiresIn: settings.expiresIn,
      });

      return {
        identity: tokenizedData.identity,
        auth: true,
        token,
        payload,
      };
    } catch (error) {
      this._console.error(error);
      return null;
    }
  }

  #generateNowTime() {
    return new Date();
  }

  #generateTimestamp() {
    return new Date().getTime() + '';
  }

  get generator() {
    return {
      id: this.#idGenerator.bind(this),
      privateKey: this.#generatePrivateKey.bind(this),
      hash: {
        fromString: this.#stringToHash.bind(this),
      },
      jwt: {
        token: this.#generateJWTToken.bind(this),
      },
      time: {
        now: this.#generateNowTime.bind(this),
        timestamp: this.#generateTimestamp.bind(this),
      },
    };
  }
}

module.exports = GeneratorUtil;
