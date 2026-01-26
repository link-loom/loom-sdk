# Console Module

> **Namespace**: `[Loom]::[Core]::[Console]` > **Class**: `ConsoleModule`

The **Console Module** provides a standardized, color-coded logging interface. It replaces raw `console.log` calls to ensure consistent formatting across the application.

## Key Features

- **Namespaces**: Every log includes `[Namespace]` to identify the source (e.g., `[Loom]::[Http]`).
- **Color Coding**: Success (Green), Info (Cyan), Warning (Yellow), Error (Red).
- **JSON Support**: Automatically detects and formats JSON objects.

## API Reference

All methods accept a `body` (message or object) and an optional `args` object `{ namespace: string }`.

### `success(body, args)`

Prints a green success message.

```javascript
deps.console.success('Connected to DB', { namespace: this._namespace });
```

### `info(body, args)`

Prints a cyan info message.

```javascript
deps.console.info('Processing request...', { namespace: this._namespace });
```

### `warning(body, args)`

Prints a yellow warning.

```javascript
deps.console.warning('Retrying connection...', { namespace: this._namespace });
```

### `error(body, args)`

Prints a red error message.

```javascript
deps.console.error(errorObject, { namespace: this._namespace });
```

### `log(body, args)`

Standard log without specific color coding.

## Usage in Services

Always use the injected `console` instead of the global one.

```javascript
class UserService {
  constructor(deps) {
    this._console = deps.console;
    this._namespace = '[UserModule]';
  }

  createUser() {
    this._console.info('Creating user', { namespace: this._namespace });
  }
}
```
