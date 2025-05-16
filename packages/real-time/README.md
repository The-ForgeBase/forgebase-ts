# ForgeBase Real-Time

The ForgeBase Real-Time library provides powerful real-time communication capabilities for applications within the ForgeBase ecosystem. It enables bidirectional, event-based communication between clients and servers with support for WebSockets, SSE, and other real-time protocols.

## Purpose

This library simplifies the implementation of real-time features in your applications by providing a unified interface for various real-time communication methods. It handles connection management, event broadcasting, presence detection, and data synchronization, allowing developers to build interactive, collaborative applications with minimal effort.

## Core Features

- Authentication & Authorization: Fine-grained role, table, and namespace-level permissions.
- Database Integration: Compatibility with modern real-time databases like RethinkDB, SurrealDB, etc.
- Object Storage: Built-in support for object storage solutions.
- Extendability: Easy to add custom routes and extend functionality beyond the BaaS features.
- Real-time Features: Full real-time support for db, presence, etc.

## Why This Framework?

Our mission is to simplify backend development by providing a highly flexible, language-agnostic BaaS framework that developers can plug into their existing server setup. While we are 70% inspired by Pocketbase, we recognized its limitations—particularly its dependency on SQLite and its inability to scale horizontally. To overcome these challenges, we are building a better alternative that not only supports horizontal scaling but also integrates with more robust databases like PostgreSQL, SurrealDB, etc. This approach ensures that our framework is scalable, versatile, and suitable for a wide range of applications, from small projects to large, distributed systems.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
- [API Reference](#api-reference)
  - [RealTimeServer](#realtimeserver)
  - [RealTimeClient](#realtimeclient)
- [Building](#building)
- [Running Tests](#running-tests)

## Features

- Real-time communication
- WebSocket support
- Data synchronization
- Event broadcasting

## Installation

```bash
pnpm add @forgebase/real-time
```

## Basic Usage

### Server

```typescript
import { RealTimeServer } from '@forgebase/real-time';

const server = new RealTimeServer({
  port: 9001,
});

server.on('connection', (client) => {
  console.log('New client connected:', client.id);

  client.on('message', (message) => {
    console.log('Received message:', message);
  });

  client.on('disconnect', () => {
    console.log('Client disconnected:', client.id);
  });
});

server.start();
```

### Client

```typescript
import { RealTimeClient } from '@forgebase/real-time';

const client = new RealTimeClient({
  url: 'ws://localhost:9001',
});

client.on('connect', () => {
  console.log('Connected to server');

  client.send('Hello, server!');
});

client.on('message', (message) => {
  console.log('Received message:', message);
});

client.on('disconnect', () => {
  console.log('Disconnected from server');
});

client.connect();
```

## Configuration

The Real-Time library can be configured using the following options:

### Server Configuration

- `port`: The port on which the server will listen for incoming connections.

### Client Configuration

- `url`: The WebSocket URL of the server to connect to.

## API Reference

### RealTimeServer

The `RealTimeServer` class provides methods for managing WebSocket connections and broadcasting events.

### RealTimeClient

The `RealTimeClient` class provides methods for connecting to a WebSocket server and sending/receiving messages.

## Building

Run `nx build real-time` to build the library.

## Running Tests

Run `nx test real-time` to execute the unit tests via [Jest](https://jestjs.io).

## License

This project is licensed under the MIT License.
