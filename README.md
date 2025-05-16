# ForgeBase TypeScript

<p align="center">
  <img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="100" alt="Nx logo">
</p>

## Overview

ForgeBase is an open-source Backend as a Service (BaaS) framework designed to provide backend functionality for a variety of backend frameworks across multiple languages. This TypeScript implementation uses [Nx](https://nx.dev) as a monorepo management tool to organize the codebase into multiple libraries and applications.

## Purpose

Our mission is to simplify backend development by providing a highly flexible, language-agnostic BaaS framework that developers can plug into their existing server setup. While we are 70% inspired by Pocketbase, we recognized its limitations—particularly its dependency on SQLite and its inability to scale horizontally. To overcome these challenges, we are building a better alternative that supports horizontal scaling and integrates with more robust databases like PostgreSQL, SurrealDB, etc.

## Core Features

- **Authentication & Authorization**: Fine-grained role, table, and namespace-level permissions
- **Database Integration**: Compatibility with modern real-time databases like RethinkDB, SurrealDB, etc.
- **Object Storage**: Built-in support for object storage solutions
- **Extendability**: Easy to add custom routes and extend functionality beyond the BaaS features
- **Real-time Features**: Full real-time support for database, presence, etc.

## Project Structure

This monorepo is organized into two main directories:

### Libraries (`libs/`)

- **[Auth](libs/auth/README.md)**: A flexible authentication library providing multiple authentication strategies and framework adapters
- **[API](libs/api/README.md)**: Provides API functionalities and integrations
- **[Common](libs/common/README.md)**: Common utilities and shared code used across the project
- **[Database](libs/database/README.md)**: Database management and integration
- **[Real-Time](libs/real-time/README.md)**: Real-time communication and updates
- **[Storage](libs/storage/README.md)**: Storage management and integration
- **[Studio UI Utils](libs/studio-ui-utils/README.md)**: UI utilities for the Studio application
- **[Studio UI](libs/studio-ui/README.md)**: UI components for the Studio application

### Applications (`apps/`)

- **[Studio](apps/studio/README.md)**: Admin UI for managing ForgeBase instances
- **[Docs](apps/docs/)**: Documentation site
- **[Nest Test](apps/nest-test/)**: NestJS integration example
- **[Hono Test](apps/hono-test/)**: Hono integration example
- **[Web App](apps/web-app/)**: Example web application

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- pnpm

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/The-ForgeBase/forgebase-ts.git
   cd forgebase-ts
   ```

2. Install dependencies:
   ```sh
   pnpm install
   ```

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo
pnpm dev
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)
