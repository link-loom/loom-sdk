# Deployment Guide

Deploying a Link Loom service is straightforward because it is a standard Node.js application.

## Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **Process Manager**: PM2, Docker, or Kubernetes.

## Environment Variables

Ensure these variables are set in your production environment:

| Variable           | Description                                  |
| :----------------- | :------------------------------------------- |
| `NODE_ENV`         | Set to `production` to enable optimizations. |
| `PORT`             | The HTTP port to listen on (default: 8080).  |
| `LINKLOOM_CLOUD_*` | (Optional) If using SaaS configuration.      |

## Docker Support

A standard `Dockerfile` for a Link Loom service:

```dockerfile
# Base Image
FROM node:18-alpine

# Workspace
WORKDIR /usr/src/app

# Install Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy Source
COPY . .

# Expose Port
EXPOSE 8080

# Start Command
CMD [ "npm", "start" ]
```

## Production Flags

When running with `NODE_ENV=production`:

- **Logs**: The `ConsoleModule` may reduce verbosity (depending on config).
- **Performance**: Express middleware (like `compression`) are active to handle load.
- **Memory**: The "Guillotine" (in Threaded App mode) ensures threads are effectively killed to prevent leaks.

## Health Checks

Loom services do not have a built-in `/health` endpoint by default unless you create one, but the HTTP Adapter will return 404 for unknown routes. It is recommended to add a simple route for orchestrators:

```javascript
/* src/routes/health.route.js */
class HealthRoute {
  handle() {
    return { status: 'UP' };
  }
}
```
