# Utilities Module

> **Namespace**: `[Loom]::[Core]::[Utilities]` > **Class**: `UtilitiesModule`

The **Utilities Module** aggregates a powerful suite of helper libraries into a single accessible object `dependencies.utilities`.

## Sub-Utilities

| Accessor                | Source            | Purpose                               |
| :---------------------- | :---------------- | :------------------------------------ |
| `utilities.generator`   | `GeneratorUtil`   | Generate UUIDs, Random Strings.       |
| `utilities.crypto`      | `CryptoUtil`      | AES encryption, Hashing (bcrypt).     |
| `utilities.validator`   | `ValidatorUtil`   | Validate emails, required fields.     |
| `utilities.sanitizer`   | `SanitizerUtil`   | Clean inputs (e.g., normalize ports). |
| `utilities.encoder`     | `EncoderUtil`     | Base64, Hex encoding.                 |
| `utilities.io`          | `IOUtil`          | File system helpers.                  |
| `utilities.event`       | `EventUtil`       | Event helpers.                        |
| `utilities.performance` | `PerformanceUtil` | Measure execution time and resources. |

## Usage Example

```javascript
class AuthService {
  constructor(deps) {
    this._utils = deps.utilities;
  }

  async hashPassword(password) {
    // Access Crypto Utility
    return await this._utils.crypto.hash(password);
  }

  generateToken() {
    // Access Generator Utility
    return this._utils.generator.token(32);
  }
}
```

## Performance Utility

The `PerformanceUtil` is automatically hooked into the `Loom` termination signal. It reports total execution time and resource usage when the application shuts down.
