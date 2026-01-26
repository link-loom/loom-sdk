# Storage Module

> **Namespace**: `[Loom]::[Infrastructure]::[Module]::[Storage]` > **Class**: `StorageModule`

The **Storage Module** handles file uploads and downloads. It supports switching between local filesystem storage (for dev) and cloud storage (S3, GCS) without code changes.

## Configuration

```json
"storage": {
  "settings": {
    "enabled": true,
    "default": "s3"
  },
  "providers": {
    "s3": { "bucket": "my-bucket", "region": "us-east-1" },
    "local": { "root": "/tmp/uploads" }
  }
}
```

## Usage

```javascript
const storage = deps.storage.client;

// Upload
await storage.upload({
  file: myFileBuffer,
  path: 'avatars/user_1.png',
});

// Download
const file = await storage.download('avatars/user_1.png');
```
