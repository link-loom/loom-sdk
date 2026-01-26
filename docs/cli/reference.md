# CLI Reference

The Link Loom CLI (`@link-loom/cli`) is the primary tool for scaffolding new services based on the official templates.

## Installation

```bash
npm install -g @link-loom/cli
```

## Commands

### `create`

Creates a new project based on the Link Loom boilerplate (`loom-svc-js`).

**Usage**:

```bash
link-loom create --name [project-name]
```

**Options**:

| Option   | Alias | Type      | Description                                             |
| :------- | :---- | :-------- | :------------------------------------------------------ |
| `--name` | `-n`  | `string`  | **Required**. The name of the project folder to create. |
| `--help` | `-h`  | `boolean` | Show help.                                              |

**What it does**:

1.  Downloads the latest `loom-svc-js` template.
2.  Replaces `%LOOM%` placeholders with your project name.
3.  Initializes a fresh git repository.
4.  Prepares the directory structure.

**Example**:

```bash
link-loom create --name payment-service
cd payment-service
npm install
npm run
```
