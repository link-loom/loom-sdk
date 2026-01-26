# Data Types Module

> **Namespace**: `[Loom]::[Core]::[Data-Types]` > **Class**: `DataTypesModule`

The **Data Types Module** serves as a runtime registry for entities and schemas.

## Purpose

1.  **Central Registry**: Stores definitions for system types.
2.  **Dynamic Registration**: Allows modules to register new types at runtime via `registerType()`.

## API

### `registerType({ name, instance })`

Registers a new type in the system.

```javascript
dependencies.dataTypes.registerType({
  name: 'User',
  instance: new UserSchema(),
});
```

### `getType(name)`

Retrieves a registered type.

```javascript
const UserType = dependencies.dataTypes.getType('User');
```

## Built-in Types

It loads base definitions from `utils/data-types/definition.types`. (Note: The specific built-in types depend on the SDK version).
