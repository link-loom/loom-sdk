# Core Modules

The `src/core` directory contains the kernel of Link Loom SDK. These modules are guaranteed to initialize **first**, before any infrastructure or adapters.

## The Modules

| Module                                     | Purpose                                                             |
| :----------------------------------------- | :------------------------------------------------------------------ |
| **[Dependencies](dependencies.module.md)** | The Registry and DI system. Loads internal and client libraries.    |
| **[Settings](settings.module.md)**         | Loads configuration and sets up the base HTTP server security.      |
| **[Console](console.module.md)**           | Standardized output, color-coded logging, and namespace management. |
| **[Utilities](utilities.module.md)**       | A toolbox of helpers (Encryption, IO, Validation, Generators).      |
| **[Data Types](data-types.module.md)**     | Schema definitions and type registry for the application.           |

## Initialization Order

When `loom.ignite()` is called, the initialization sequence is:

1.  `DependenciesModule`: Loads `package.json`, `node_modules`, `config/`.
2.  `ConsoleModule`: Initializes the logger so subsequent modules can log.
3.  `UtilitiesModule`: Prepares helpers (like Lang extensions).
4.  `SettingsModule`: Applies security headers and `cors` to the Express app.
5.  `DataTypesModule`: Loads schema definitions.

This order ensures that when your application logic starts, the environment is fully stable.
