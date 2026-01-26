# Database Module

> **Namespace**: `[Loom]::[Infrastructure]::[Module]::[Database]` > **Class**: `DatabaseModule`

The **Database Module** is responsible for establishing connections to data stores. It uses the **Adapter Pattern** to support multiple databases (Postgres, MongoDB, etc.) interchangeably.

## How it works

1.  **Read Config**: checks `config.modules.database`.
2.  **Load Adapter**: It dynamically requires `src/adapters/database/{name}/{name}.adapter.js`.
3.  **Setup**: It calls `adapter.setup(config)` and retrieves the driver instance.
4.  **Expose**: It exposes the driver via `dependencies.database.client`.

## Configuration Schema

```json
"database": {
  "settings": {
    "enabled": true,
    "default": "my-sql-connection"
  },
  "providers": {
    "my-sql-connection": {
      "host": "localhost",
      "user": "root",
      "password": "password",
      "database": "app_db"
    }
  }
}
```

## Usage

```javascript
class UserService {
  constructor(deps) {
    // raw driver (e.g., Sequelize instance, Mongo client)
    this.db = deps.database.client;
  }

  async findUser(id) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}
```
