# Adapters

Adapters are the communication layers of Link Loom. They allow the core runtime to interact with the outside world (HTTP requests, Events, Scheduled Tasks, Background Workers).

## The Adapter Pattern

An Adapter in Loom typically consists of:

1.  **Module**: Initializes the adapter (e.g., `ApiModule`).
2.  **Logic**: The actual implementation (e.g., Express Router).
3.  **Bridge**: Connects the implementation to the Dependency Graph.

## Available Adapters

| Adapter                       | Description                                                                               |
| :---------------------------- | :---------------------------------------------------------------------------------------- |
| **[HTTP](http.md)**           | Exposes a REST API using Express. Includes OpenAPI generation.                            |
| **[Events](events.md)**       | A powerful event system with internal Bus, Brokers (Socket.io), Producers, and Consumers. |
| **[Functions](functions.md)** | A serverless-like runtime for executing modular, isolated logic blocks.                   |
| **[Apps](apps.md)**           | Heavy-duty background workers running in Threads or Processes.                            |
