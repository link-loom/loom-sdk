# Email Module

> **Namespace**: `[Loom]::[Email]::[Behavior]` > **Class**: `EmailModule`

The **Email Module** manages transactional email delivery. It can load adapters for services like SendGrid, SES, or SMTP.

## Configuration

```json
"email": {
  "settings": {
    "enabled": true,
    "default": "smtp"
  },
  "providers": {
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "auth": { "user": "...", "pass": "..." }
    }
  }
}
```

## Usage

```javascript
const mailer = deps.email.client;

await mailer.send({
  to: 'user@example.com',
  subject: 'Welcome',
  template: 'welcome_template',
  data: { name: 'John' },
});
```

_Note: The specific API methods (`send`, `sendTemplate`) depend on the implemented adapter._
