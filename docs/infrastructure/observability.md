# Observability Module

> **Namespace**: `[Loom]::[Infrastructure]::[Module]::[Observability]` > **Class**: `ObservabilityModule`

The **Observability Module** provides hooks for Application Performance Monitoring (APM) and Tracing.

## Purpose

To abstract away specific vendor implementations (Datadog, NewRelic, Prometheus) so that the application code remains vendor-neutral.

## Configuration

```json
"observability": {
  "settings": {
    "enabled": true,
    "default": "datadog"
  },
  "providers": {
    "datadog": { "apiKey": "..." }
  }
}
```

## API

The exposed client `dependencies.observability.client` matches the interface of the chosen adapter.

```javascript
dependencies.observability.client.trace('request_start', { path: '/api' });
```
