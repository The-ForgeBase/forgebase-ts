# @ForgeApi

@ForgeApi is a powerful and flexible Backend-as-a-Service (BaaS) solution that provides a complete set of tools for building modern web and mobile applications. It offers authentication, database management, and storage services out of the box, with an easy-to-use API for seamless integration into your projects.

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [API Reference](#api-reference)
   - [Authentication](#authentication)
   - [Database](#database)
   - [Storage](#storage)
   - [Schema Management](#schema-management)
4. [Middleware](#middleware)
5. [Integration Examples](#integration-examples)
<!-- 6. [Dependencies](#dependencies) -->

## Installation

To install @ForgeApi, use your preferred package manager:

```bash
npm install @forgeapi
```

## Configuration

@ForgeApi can be configured with various options. Here's an example of how to initialize and configure the API:

```ts
import { forgeApi } from "@forgeapi";

const api = forgeApi({
  prefix: "/api",
  auth: {
    enabled: true,
    exclude: ["/auth/login", "/auth/register"],
  },
  services: {
    storage: {
      provider: "local",
    },
    db: {
      provider: "sqlite",
      realtime: true,
      enforceRls: true,
    },
  },
});
```

## API Reference

### Authentication

#### Register a new user

```curl
POST /auth/register HTTP/1.1
Content-Type: application/json

{
  "username": "johndoe",
  "email": "johndoe@example.com",
  "password": "password123"
}
```

#### Login with existing credentials

```curl
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Database

#### Create a new record

```curl
POST /db/users HTTP/1.1
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
    "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Query records

```curl
GET /db/:collection?filter[name]=John&sort=-createdAt&limit=10
Authorization: Bearer <token>
```

response:

```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2023-05-20T12:00:00Z"
  }
]
```

#### Get a single record

```curl
GET /db/:collection/:id
Authorization: Bearer <token>
```

response:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2023-05-20T12:00:00Z"
}
```

#### Update a record

```curl
PUT /db/:collection/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "data": {
    "name": "John Smith"
  }
}
```

#### Delete a record

```curl
DELETE /db/:collection/:id
Authorization: Bearer <token>
```

### Storage

#### Upload a file

```curl
POST /storage/files HTTP/1.1
Content-Type: multipart/form-data
Authorization: Bearer <token>

[file content]
```

#### Download a file

```curl
GET /storage/files/:filename HTTP/1.1
Authorization: Bearer <token>
```

### Schema Management

#### Create a new schema

```curl
POST /db/schemas HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>
```

## Middleware

@ForgeApi supports middleware for custom request processing. Here's an example of how to add middleware:

```ts
api.use(async (ctx, next) => {
  console.log(`Request received: ${ctx.req.method} ${ctx.req.path}`);
  await next();
  console.log(`Response sent: ${ctx.res.status}`);
});
```

### Integration Examples

@ForgeApi can be integrated with various frameworks and libraries, such as Express, Fastify, Hono, e.t.c. Here are some examples:

#### Express

```ts
import express from "express";
import { forgeApi, ExpressAdapter } from "@forgeapi";

const app = express();
const api = forgeApi();

app.use("/api", (req, res) => {
  const adapter = new ExpressAdapter(req, res);

  api.handle(adapter);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

#### Fastify

```ts
import fastify from "fastify";
import { forgeApi, FastifyAdapter } from "@forgeapi";

const app = fastify();
const api = forgeApi();

app.register(async (server, opts) => {
  await server.register(require("fastify-cors"));
  await server.register(require("fastify-multipart"));

  const adapter = new FastifyAdapter(server.request, server.response);

  api.handle(adapter);
  server.get("/api/*", (req, res) => {
    res.send(adapter.response);
  });
  server.listen(3000, "0.0.0.0", (err, address) => {
    if (err) throw err;
    console.log(`Server listening on ${address}`);
  });
  return api;
```

#### Hono

```ts
import { forgeApi, HonoAdapter } from "@forgeapi";
import { createServer } from "hono";

const app = createServer();
const api = forgeApi();

app.use("/api", (req, res) => {
  const adapter = new HonoAdapter(req, res);
  api.handle(adapter);
});
```
