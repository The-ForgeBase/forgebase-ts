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

### Running Applications

To run the development server for an application:

```sh
npx nx serve <app-name>
```

For example, to run the Studio application:

```sh
npx nx serve studio
```

To build an application for production:

```sh
npx nx build <app-name>
```

### Development Workflow

#### Adding New Libraries

To generate a new library:

```sh
npx nx g @nx/node:lib my-new-lib
```

#### Adding New Applications

To generate a new application:

```sh
npx nx g @nx/node:app my-new-app
```

#### Running Tests

To run tests for a specific project:

```sh
npx nx test <project-name>
```

To run tests for all projects:

```sh
npx nx run-many -t test
```

#### Linting

To lint a specific project:

```sh
npx nx lint <project-name>
```

## Supported Frameworks

ForgeBase is designed to work with multiple backend frameworks, including:

- NestJS
- Express
- Fastify
- Hono
- And more!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Useful Links

- [Learn more about Nx](https://nx.dev/nx-api/node)
- [Nx on CI](https://nx.dev/ci/intro/ci-with-nx)
- [Releasing Packages with Nx](https://nx.dev/features/manage-releases)
- [Nx Plugins](https://nx.dev/concepts/nx-plugins)

## Community

- [Discord](https://go.nx.dev/community)
- [Follow Nx on Twitter](https://twitter.com/nxdevtools)
- [Nx on LinkedIn](https://www.linkedin.com/company/nrwl)
- [Nx YouTube Channel](https://www.youtube.com/@nxdevtools)

## License

MIT
