# Infrastructure Modules

The `src/infrastructure` directory contains modules that manage connections to external systems and resources. These modules act as **Abstract Loaders**—they don't implement the logic themselves (e.g., SQL queries), but instead load specific **Adapters** based on configuration.

## The Modules

| Module                                | Purpose                                              |
| :------------------------------------ | :--------------------------------------------------- |
| **[Database](database.md)**           | Manages database connections (SQL, NoSQL).           |
| **[Observability](observability.md)** | Handles metrics, tracing, and logging integrations.  |
| **[Storage](storage.md)**             | Manages file storage (Cloud S3, Local Disk).         |
| **[Email](email.md)**                 | Manages email delivery providers.                    |
| **[Push Notifications](push.md)**     | Manages push notification services (e.g., Firebase). |

## configuration Pattern

All infrastructure modules follow a similar configuration pattern in `config/default.json`:

```json
{
  "modules": {
    "database": {
      "settings": {
        "enabled": true,
        "default": "postgres"
      },
      "providers": {
        "postgres": { "host": "localhost", ... }
      }
    }
  }
}
```

The Module reads `settings.default`, finds the corresponding key in `providers`, and dynamically requires the correct Adapter from `src/adapters/database/<name>`.
