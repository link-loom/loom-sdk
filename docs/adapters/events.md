# Events Adapter

> **Namespace**: `[Loom]::[Event System]::*`

The Events System in Loom is multi-layered, handling everything from internal node events to distributed messaging.

## Layers

### 1. The Internal Bus (`BusModule`)

A simple `EventEmitter` that runs within the same process.

- **Usage**: Decoupling modules (e.g., `server::loaded`).
- **Access**: `dependencies.eventBus.bus`.

### 2. The Broker (`BrokerModule`)

Manages **Socket.io** connections for real-time bidirectional communication.

- **Access**: `dependencies.webSocketServer`.

### 3. Producers & Consumers

Structure for publish/subscribe patterns.

- **Producer**: Emits an event (to the Bus or Broker).
- **Consumer**: Listens for an event and triggers a handler.

## Example: Consumer

```javascript
// src/consumers/user-created.consumer.js
class UserCreatedConsumer {
  constructor(deps) {
    this._bus = deps.eventBus.bus;
  }

  consume() {
    this._bus.on('user::created', (user) => {
      console.log('New user!', user.id);
    });
  }
}
```
