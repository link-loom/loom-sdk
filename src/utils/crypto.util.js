class CryptoUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;

    /* Custom Properties */
    this._crypto = this._dependencies.crypto;

    /* Assigments */
    this._namespace = '[Server]::[Utils]::[Security]';
  }

  /**
   * Signs any given data using a secret key with HMAC SHA256.
   *
   * @private
   * @param {string} data - The data to be signed.
   * @param {string} secret - The secret key used for signing.
   * @returns {string} The HMAC SHA256 signature of the data.
   */
  #createHmacSignature(data, secret) {
    return this._crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '') // remove '+'
      .replace(/\//g, '') // remove '/'
      .replace(/=+$/, ''); // remove '=' at the end
  }

  /**
   * Generates a string of specified length and its HMAC SHA256 signature.
   *
   * This method creates a new random string, signs it using the `#createHmacSignature` method, and
   * returns the combined result in the format "string_signature".
   *
   * @private
   * @param {string} secret - The secret key used for signing the string.
   * @returns {string} The generated string concatenated with its HMAC SHA256 signature, separated by an underscore.
   */
  #generateSignedData(secret) {
    const randomString = this.#generateRandomBase64String(16);
    const signature = this.#createHmacSignature(randomString, secret);

    return `${randomString}_${signature}`;
  }

  /**
   * Generates a random Base64 encoded string of a specified length.
   *
   * @private
   * @param {number} length - The length of the random string.
   * @returns {string} A random Base64 encoded string.
   */
  #generateRandomBase64String(length) {
    const randomData = this._crypto.randomBytes(length);

    return randomData
      .toString('base64')
      .replace(/\+/g, '') // remove '+'
      .replace(/\//g, '') // remove '/'
      .replace(/=+$/, ''); // remove '=' at the end
  }

  get crypto() {
    return {
      hmac: {
        generateSignature: this.#createHmacSignature.bind(this),
        signData: this.#generateSignedData.bind(this),
      },
    };
  }
}

module.exports = CryptoUtil;
