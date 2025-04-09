class EncoderUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._aesjs = this._dependencies.aesjs;

    /* Assigments */
    this._namespace = '[Loom]::[Utils]::[Serializer]';
  }

  #serializerOjectToQueryString(obj, prefix) {
    if (obj && typeof obj === 'object') {
      const serializedArr = [];
      let objKey = {};

      for (objKey in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, objKey)) {
          const key = prefix ? prefix + '[' + objKey + ']' : objKey;
          const value = obj[objKey] || null;
          serializedArr.push(
            value !== null && typeof value === 'object'
              ? this.#serializerOjectToQueryString(value, key)
              : encodeURIComponent(key) + '=' + encodeURIComponent(value),
          );
        }
      }
      return serializedArr.join('&');
    }
  }

  #objectToQueryString(obj) {
    if (obj && typeof obj === 'object') {
      const result = this.#serializerOjectToQueryString(obj);
      return `?${result}`;
    } else {
      return '';
    }
  }

  #b64Encode(payload) {
    if (!payload) {
      return '';
    }

    payload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return Buffer.from(payload)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  #b64Decode(payload) {
    if (!payload) {
      return '';
    }

    payload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return Buffer.from(payload, 'base64').toString();
  }

  cypherObject(key, payload) {
    try {
      if (
        !payload ||
        (typeof payload !== 'object' && typeof payload !== 'string')
      ) {
        return null;
      }

      // Convert data to bytes
      const dataBytes = this._aesjs.utils.utf8.toBytes(JSON.stringify(payload));

      // Turns a block cipher into a stream cipher. It generates the next keystream
      // block by encrypting successive values of a "counter"
      const aesCTR = new this._aesjs.ModeOfOperation.ctr(
        key,
        new this._aesjs.Counter(5),
      );
      const encryptedBytes = aesCTR.encrypt(dataBytes);

      // convert bytes it to hex, is to handle in Key Vault Network
      const encryptedHex = this._aesjs.utils.hex.fromBytes(encryptedBytes);

      return encryptedHex;
    } catch (error) {
      this._console.error(error);
      return null;
    }
  }

  decipherObject(key, payload) {
    try {
      if (!payload || typeof payload !== 'string') {
        return null;
      }

      // When ready to decrypt the hex string, convert it back to bytes
      const encryptedBytes = this._aesjs.utils.hex.toBytes(payload);

      // The counter mode of operation maintains internal state, so to
      // decrypt a new instance must be instantiated.
      /* eslint new-cap: ["error", { "properties": false }] */
      const aesCtr = new this._aesjs.ModeOfOperation.ctr(
        key,
        new this._aesjs.Counter(5),
      );
      const decryptedBytes = aesCtr.decrypt(encryptedBytes);

      // Convert our bytes back into text
      const decryptedText = this._aesjs.utils.utf8.fromBytes(decryptedBytes);

      return JSON.parse(decryptedText);
    } catch (error) {
      this._console.error(error);
      return null;
    }
  }

  get encoder() {
    return {
      object: {
        toQueryString: this.#objectToQueryString.bind(this),
      },
      base64: {
        encode: this.#b64Encode.bind(this),
        decode: this.#b64Decode.bind(this),
      },
      crypto: {
        cypherObject: this.cypherObject.bind(this),
        decipherObject: this.decipherObject.bind(this),
      },
    };
  }
}

module.exports = EncoderUtil;
