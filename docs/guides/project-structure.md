# Project Structure

When you create a project using `link-loom create`, you get a standardized directory structure designed for scalability.

## Root Directory

| File/Folder    | Purpose                                                            |
| :------------- | :----------------------------------------------------------------- |
| `app.js`       | **Entry Point**. Initializes `Loom` and calls `ignite()`.          |
| `config/`      | Configuration files (see [Configuration Guide](configuration.md)). |
| `src/`         | Source code for your business logic.                               |
| `package.json` | Dependencies and scripts (`npm run`, `npm run seed`).              |

## The entry Point (`app.js`)

This file is minimal by design. It transfers control to the SDK immediately.

```javascript
/* app.js */
const { Loom } = require('@link-loom/sdk');
const loom = new Loom({ root: __dirname }); // 'root' is crucial for finding config/

const main = async () => {
  // ignite() loads Core -> Infra -> Adapters
  const dependencies = await loom.ignite();

  // Server is now listening
  dependencies.console.success(
    `Server running on port ${dependencies.config.server.port}`,
  );
};

main();
```

## Source Directory (`src/`)

This is where you work.

| Path             | Description                                                                                |
| :--------------- | :----------------------------------------------------------------------------------------- |
| `src/routes/`    | **Router Definition**. `router.js` defines the API tree. Subfolders contain Route Classes. |
| `src/services/`  | **Business Logic**. Pure JS classes that handle data and logic. Agnostic of HTTP.          |
| `src/models/`    | **Data Models**. Mongoose/Sequelize definitions or JSDoc types.                            |
| `src/functions/` | **Modular Logic**. Scheduled tasks (Cron) or Startup scripts.                              |
| `src/consumers/` | **Event Handlers**. Listeners for the Event Bus.                                           |

## Separation of Concerns

- **Routes** handle HTTP (req, res, headers). They call Services.
- **Services** handle Rules (validation, calculation, decisions). They call Models/DB.
- **Models** handle Data (schema, queries).

This ensures that if you switch from HTTP to GraphQL or gRPC, your **Services** remain unchanged.
