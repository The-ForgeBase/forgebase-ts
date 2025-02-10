# Studio Application

The Studio application is a part of the ForgeBase project. It provides a user interface for managing various aspects of the system, including authentication, database management, and more.

## Purpose of the Project

The BaaS Framework is an open-source Backend as a Service (BaaS) framework designed to provide backend functionality for a variety of backend frameworks across multiple languages, including but not limited to:

- Go
- TypeScript
- Rust
- PHP
- Deno
- Node.js
- and more!

## Core Features

- Authentication & Authorization: Fine-grained role, table, and namespace-level permissions.
- Database Integration: Compatibility with modern real-time databases like RethinkDB, SurrealDB, etc.
- Object Storage: Built-in support for object storage solutions.
- Extendability: Easy to add custom routes and extend functionality beyond the BaaS features.
- Real-time Features: Full real-time support for db, presence, etc.

## Why This Framework?

Our mission is to simplify backend development by providing a highly flexible, language-agnostic BaaS framework that developers can plug into their existing server setup. While we are 70% inspired by Pocketbase, we recognized its limitations—particularly its dependency on SQLite and its inability to scale horizontally. To overcome these challenges, we are building a better alternative that not only supports horizontal scaling but also integrates with more robust databases like PostgreSQL, SurrealDB, etc. This approach ensures that our framework is scalable, versatile, and suitable for a wide range of applications, from small projects to large, distributed systems.

## Features

- User authentication and authorization
- Database management
- Real-time updates
- Storage management
- UI utilities

## Installation

To install the Studio application, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/The-ForgeBase/forgebase-ts.git
   ```

2. Navigate to the `apps/studio` directory:
   ```bash
   cd forgebase-ts/apps/studio
   ```

3. Install the dependencies:
   ```bash
   pnpm install
   ```

## Usage

To start the Studio application, run the following command:
```bash
pnpm dev
```

This will start the development server, and you can access the application at `http://localhost:3000`.

## Configuration

The Studio application can be configured using environment variables. Create a `.env` file in the `apps/studio` directory and add the necessary configuration options. For example:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Components

The Studio application consists of several components, including:

- **AppSidebar**: The main sidebar for navigation.
- **CreateTableForm**: A form for creating new database tables.
- **LoginForm**: A form for user authentication.
- **Providers**: A component for managing global providers.

## Example

Here is an example of how to use the `AppSidebar` component:
```typescript
import { AppSidebar } from 'apps/studio/src/components/app-sidebar';

export default function Page() {
  return (
    <div>
      <AppSidebar />
      {/* Other components */}
    </div>
  );
}
```

## License

This project is licensed under the MIT License.
