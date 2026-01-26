# Getting Started with Link Loom SDK

Link Loom SDK helps you build structured, production-ready Node.js applications with a focus on modularity and governance.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher

## Installation

To install the SDK in an existing project:

```bash
npm install --save @link-loom/sdk
```

## CLI Tooling

For the best experience, use the Link Loom CLI to scaffold new services.

```bash
npm install -g @link-loom/cli
```

Create a new service:

```bash
link-loom create --name my-service
```

## "Hello World" - Basic Usage

If you prefer to start from scratch without the CLI, here is how to initialize the runtime.

### 1. Create `index.js`

```javascript
/* index.js */
const { Loom } = require('@link-loom/sdk');
const path = require('path');

// Initialize the Loom Runtime
// 'root' tells Loom where to look for 'config/' folders and relative paths
const loom = new Loom({
  root: __dirname,
  name: 'my-service', // Identify this instance
});

const main = async () => {
  try {
    // Ignite the engine
    const dependencies = await loom.ignite();

    // Access the standardized logger
    dependencies.console.success('Service is running!');
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
};

main();
```

### 2. Run it

```bash
node index.js
```

You should see formatted logs indicating that the `DependenciesModule`, `SettingsModule`, and other core modules have initialized.

## Next Steps

- Learn about the [Service Architecture](architecture/core-concepts.md).
- Connect via [HTTP](adapters/http.md).
- Build a full [Service](guides/building-services.md).
