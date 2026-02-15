# @forgebase/cli

Command Line Interface for ForgeBase.

## Installation

```bash
npm install -g @forgebase/cli
# or use with npx/pnpx
npx @forgebase/cli <command>
```

## Commands

### `database`

Generate TypeScript schema definitions from your running ForgeBase instance.

**Usage:**

```bash
npx @forgebase/cli database --url <schema-endpoint-url> --output <output-file-path>
```

**Options:**

- `--url <url>`: The URL to the ForgeBase schema endpoint (e.g., `http://localhost:3000/schema`).
- `--output <path>`: The path to save the generated TypeScript schema file (e.g., `src/lib/db/schema.ts`).

**Example:**

```bash
# Generate schema.ts from local API
npx @forgebase/cli database --url http://localhost:3000/schema --output src/lib/db/schema.ts
```

### Using the Generated Schema

Once generated, you can use the schema with the `@forgebase/sdk` client for full type safety:

```typescript
import { DatabaseSDK } from '@forgebase/sdk/client';
import type { Schema } from './lib/db/schema';

const db = new DatabaseSDK<Schema>({
  baseUrl: 'http://localhost:3000',
  // ... config
});

// Fully typed!
const users = await db.table('users').select('email').query();
```
