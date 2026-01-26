# Push Module

> **Namespace**: `[Loom]::[Infrastructure]::[Module]::[Push]` > **Class**: `PushModule`

The **Push Module** handles sending push notifications to mobile devices. It natively supports Firebase Cloud Messaging (FCM).

## Configuration

```json
"push": {
  "settings": {
    "enabled": true,
    "default": "firebase"
  }
}
```

## Usage

Access the underlying provider client:

```javascript
const fcm = deps.pushNotification.push;

await fcm.send({
  token: 'device_token',
  notification: {
    title: 'Hello',
    body: 'World',
  },
});
```
