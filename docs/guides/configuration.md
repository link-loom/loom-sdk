# Configuration Guide

Link Loom uses standardized JSON configuration files located in the `config/` directory (e.g., `default.json`).

## Structure

The configuration is divided into **Global Settings** and **Modules**.

```json
{
  "server": {
    "port": "3601",
    "name": "My Service",
    "version": "1.0.0",
    "bodyParserLimit": "100kb"
  },
  "modules": {
    /* Module Definitions */
  }
}
```

## Server Settings

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `port` | `string` | `"8080"` | Port to listen on (overridden by `PORT` env var) |
| `name` | `string` | — | Service name (used in logs and OpenAPI docs) |
| `version` | `string` | — | Service version |
| `id` | `string` | — | Service identifier |
| `secret` | `string` | — | JWT signing secret |
| `bodyParserLimit` | `string` | `"100kb"` | Max request body size (overridden by `BODY_PARSER_LIMIT` env var). Accepts values like `'100kb'`, `'1mb'`, `'5mb'`. Individual routes can override this with the `bodyLimit` route property — see [HTTP Adapter docs](../adapters/http.md#6-per-route-body-limit). |

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
