# Environment Management

Link Loom SDK supports two primary methods for managing environment variables and configuration: **Local Configuration** and **Link Loom Cloud (SaaS)**.

## 1. Local Configuration (Development)

In a typical development setup, configuration is loaded from the `config/` directory using the `node-config` approach.

- **File**: `config/default.json` (or `local.json`, `production.json`)
- **Mechanism**: The `DependenciesModule` reads this file during startup.

### Overrides via `.env`

You can override specific values using standard environment variables if your code accesses `process.env`. However, deeply nested config values in `default.json` are best managed within the JSON file itself for structure.

## 2. Link Loom Cloud (SaaS Mode)

For enterprise or distributed environments, Link Loom can fetch its configuration dynamically from the **Link Loom Cloud Vault** at runtime. This allows you to manage secrets (API Keys, DB Credentials) centrally without redeploying code.

### Activation

To enable this mode, you must set two environment variables in your deployment (e.g., Docker, Kubernetes, or .env):

```bash
LINKLOOM_CLOUD_SERVICE_URL=https://api.linkloom.io/app-environment
LINKLOOM_CLOUD_API_KEY=your-service-api-key
LINKLOOM_CLOUD_ENVIRONMENT_NAME=production  # Optional (defaults to 'development')
```

### How it Works

1.  **Detection**: When `loom.ignite()` starts, the `DependenciesModule` checks for `LINKLOOM_CLOUD_SERVICE_URL`.
2.  **Fetch**: If present, it sends an HTTP GET request to the Vault service.
    - URL: `${LINKLOOM_CLOUD_SERVICE_URL}/?environment_type=${ENVIRONMENT_NAME}`
    - Header: `Authorization: Bearer ${LINKLOOM_CLOUD_API_KEY}`
3.  **Injection**: The returned JSON object **completely replaces** the local `dependencies.config` object.

### Priority Rule

> **SaaS Configuration > Local Configuration**

If SaaS mode is active and successful, the local `config/default.json` is ignored (or overwritten). If the fetch fails, the system logs an error and may fallback to local config or exit, depending on severity.

## Best Practices

- **Local**: Use `default.json` for structure and non-sensitive defaults.
- **Production**: Use Link Loom Cloud for sensitive credentials (DB passwords, Stripe keys) so they are never committed to Git.
