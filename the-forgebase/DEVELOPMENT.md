# Development Guidelines for ForgeBase-TS

This document provides development guidelines and best practices for contributing to the ForgeBase-TS project.

## Development Environment

### Prerequisites

- Node.js (LTS version recommended)
- pnpm package manager
- Git

### Setup

1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Run `nx run-many -t build` to build all projects

## Project Structure

The ForgeBase-TS project is organized into several libraries and applications:

### Libraries

- **@forgebase-ts/api**: Core API functionality and framework adapters
- **@forgebase-ts/auth**: Authentication and authorization
- **@forgebase-ts/database**: Database access and query building
- **@forgebase-ts/storage**: File storage abstraction
- **@forgebase-ts/common**: Shared utilities
- **@forgebase-ts/sdk**: Client and server SDK
- **@forgebase-ts/real-time**: Real-time communication

### Applications

- **studio**: Admin UI built with Angular and AnalogJS
- **hono-test**: Example Hono application

## Development Workflow

### Creating New Features

1. Create a feature branch from main

   ```
   git checkout -b feature/feature-name
   ```

2. Implement changes following the project guidelines
3. Add tests for new functionality
4. Update documentation as needed
5. Submit a pull request

### Making Changes to Libraries

When making changes to libraries, ensure the following:

1. Maintain backward compatibility when possible
2. Update all relevant documentation
3. Update examples if necessary
4. Consider cross-library impacts
5. Run tests for all affected libraries

## Building and Testing

### Building Projects

```
nx build <project-name>
```

### Running Tests

```
nx test <project-name>
```

### Running E2E Tests

```
nx e2e <project-name>
```

## Angular/AnalogJS Development

### Component Design

- Use standalone components
- Implement OnPush change detection
- Use signals for reactive state
- Follow the container/presentation component pattern

### Performance Considerations

- Lazy load routes and components
- Use proper trackBy functions in ngFor directives
- Optimize change detection with OnPush strategy

## Documentation

### Code Documentation

All code should be properly documented using JSDoc comments. Public APIs should include:

- Description of functionality
- Parameter descriptions
- Return value descriptions
- Example usage when helpful
- Edge cases and errors

Example:

```typescript
/**
 * Retrieves data from the specified collection with optional filtering
 *
 * @param collection - The name of the collection to query
 * @param query - Optional query parameters to filter results
 * @returns Promise resolving to the query results
 *
 * @example
 * ```ts
 * const users = await db.get('users', { role: 'admin' });
 * ```
 */
async get(collection: string, query?: QueryParams): Promise<Result[]> {
  // Implementation
}
````

### Library Documentation

Each library should have a comprehensive README.md that includes:

1. Overview of functionality
2. Installation instructions
3. Basic usage examples
4. API reference or link to API docs
5. Configuration options
6. Common use cases

## Submitting Changes

1. Ensure all tests pass
2. Follow the commit message guidelines
3. Keep pull requests focused on a single feature or fix
4. Respond to review feedback promptly

## Release Process

1. Update version numbers according to semver
2. Update CHANGELOG.md
3. Create a release tag
4. Build and publish packages

Thank you for contributing to ForgeBase-TS!
