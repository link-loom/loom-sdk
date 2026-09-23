// In-memory database provider for tests: stores documents per database and table.
class MemoryAdapter {
  constructor(dependencies) {
    this._dependencies = dependencies;
    this._settings = {};
    this.store = {};
    this.calls = [];
  }

  async setup({ adapter }) {
    this._settings = adapter?.settings || {};
    return this;
  }

  #table(databaseName, tableName) {
    const database = databaseName || this._settings.dbName;
    this.store[database] = this.store[database] || {};
    this.store[database][tableName] = this.store[database][tableName] || [];
    return this.store[database][tableName];
  }

  async create({ tableName, entity, databaseName = '' } = {}) {
    this.calls.push({ method: 'create', tableName, databaseName: databaseName || this._settings.dbName });
    this.#table(databaseName, tableName).push(entity);
    return { acknowledged: true };
  }

  async getByFilters({ tableName, databaseName = '' } = {}) {
    this.calls.push({ method: 'getByFilters', tableName, databaseName: databaseName || this._settings.dbName });
    const items = this.#table(databaseName, tableName);
    return { items, totalItems: items.length };
  }
}

module.exports = MemoryAdapter;
