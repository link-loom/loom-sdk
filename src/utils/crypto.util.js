class CryptoUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;

    /* Custom Properties */
    this._crypto = this._dependencies.crypto;

    /* Assigments */
    this._namespace = '[Loom]::[Utils]::[Security]';
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

  /**
   * Encrypts text using AES-256-GCM.
   * @private
   * @param {string} text - Text to encrypt.
   * @param {string} secret - 32-byte hex secret or 32-char string.
   */
  #encryptAes(text, secret) {
    if (!text || !secret) return null;
    const algorithm = 'aes-256-gcm';

    // Ensure secret is Buffer of correct length (32 bytes)
    // If hex string provided
    let key;
    if (typeof secret === 'string' && /^[0-9a-fA-F]{64}$/.test(secret)) {
      key = Buffer.from(secret, 'hex');
    } else {
      // Fallback or scrypt could be used, but keeping it simple: ensure 32 chars or pad/slice
      // Ideally user provides a stored 32-byte hex key.
      // For safety here we might hash the secret to get 32 bytes if it's a password
      key = this._crypto.createHash('sha256').update(secret).digest();
    }

    const iv = this._crypto.randomBytes(16);
    const cipher = this._crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      iv: iv.toString('hex'),
      content: encrypted,
      tag: authTag,
    };
  }

  /**
   * Decrypts object using AES-256-GCM.
   * @private
   * @param {object} encryptedObj - { iv, content, tag }
   * @param {string} secret - Key.
   */
  #decryptAes(encryptedObj, secret) {
    if (
      !encryptedObj ||
      !encryptedObj.iv ||
      !encryptedObj.content ||
      !encryptedObj.tag ||
      !secret
    )
      return null;
    const algorithm = 'aes-256-gcm';

    let key;
    if (typeof secret === 'string' && /^[0-9a-fA-F]{64}$/.test(secret)) {
      key = Buffer.from(secret, 'hex');
    } else {
      key = this._crypto.createHash('sha256').update(secret).digest();
    }

    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const authTag = Buffer.from(encryptedObj.tag, 'hex');

    const decipher = this._crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedObj.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  get crypto() {
    return {
      hmac: {
        generateSignature: this.#createHmacSignature.bind(this),
        signData: this.#generateSignedData.bind(this),
      },
      aes: {
        encrypt: this.#encryptAes.bind(this),
        decrypt: this.#decryptAes.bind(this),
      },
    };
  }
}

module.exports = CryptoUtil;
