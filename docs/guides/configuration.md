# Configuration Guide

Link Loom uses standardized JSON configuration files located in the `config/` directory (e.g., `default.json`).

## Structure

The configuration is divided into **Global Settings** and **Modules**.

```json
{
  "server": {
    "port": "3601",
    "name": "My Service",
    "version": "1.0.0"
  },
  "modules": {
    /* Module Definitions */
  }
}
```

## Configuring Modules

Every module (Infrastructure or Adapter) follows the same pattern:

1.  **`settings`**: General options (enabled, default provider).
2.  **`providers`**: Specific configurations for different drivers.

### Example: Database

To swap from MongoDB to Postgres, you change the `default` key.

```json
"database": {
  "settings": {
    "enabled": true,
    "default": "mongodb" // Change to 'postgres' to switch
  },
  "providers": {
    "mongodb": {
      "settings": { "connection": "mongodb://localhost:27017/mydb" }
    },
    "postgres": {
      "settings": { "host": "localhost", "user": "admin" }
    }
  }
}
```

### Example: Observability

Enable or disable specific providers like Sentry or Vectry.

```json
"observability": {
  "settings": {
    "enabled": true,
    "default": "vectry"
  },
  "providers": {
    "vectry": { "settings": { "apiKey": "..." } },
    "sentry": { "settings": { "dsn": "..." } }
  }
}
```

## Security

Global security settings can be toggled here.

```json
"security": {
  "jwtTokenLifetimeHours": 24
}
```

## Custom Dependencies

You can inject libraries into the Dependency Graph without modifying the SDK.

```json
"customDependencies": [
  {
    "name": "socketClient",
    "package": "socket.io-client"
  }
]
```

This will make `dependencies.socketClient` available in your code.
