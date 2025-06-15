# @the-forgebase/cli

A CLI tool for interacting with Forgebase services.

## Usage

```bash
npx @the-forgebase/cli <command> [options]
```

### Commands

#### `database`

Convert a database schema from an API to TypeScript interfaces.

**Usage**
```bash
npx @the-forgebase/cli database --url <API_URL> --output <FILE_PATH> [--header <key=value>...]
```

**Options**
- `-u, --url <url>`: (Required) The API endpoint URL for the schema.
- `-o, --output <path>`: The path for the output TypeScript file. Defaults to `schema.ts`.
- `-H, --header <headers...>`: Any HTTP headers to include in the request, in the format `key=value`. 