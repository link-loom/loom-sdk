class TokenAuthHandler {
  constructor(dependencies) {
    this._utilities = dependencies.utilities;
  }

  async authenticate({ headers }) {
    if (headers['x-token'] !== 'good') {
      return this._utilities.io.response.error('Invalid token', { status: 401 });
    }

    return this._utilities.io.response.success({ subject: 'tester' });
  }
}

module.exports = { token: TokenAuthHandler };
