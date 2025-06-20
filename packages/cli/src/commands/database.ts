import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import axios from "axios";

// Types
type ColumnType =
  | "increments"
  | "string"
  | "text"
  | "integer"
  | "bigInteger"
  | "boolean"
  | "decimal"
  | "float"
  | "datetime"
  | "date"
  | "time"
  | "timestamp"
  | "binary"
  | "json"
  | "uuid"
  | "varchar";

interface Column {
  name: string;
  table: string;
  data_type: string;
  is_nullable: boolean;
  default_value: any;
  max_length?: number | null;
  numeric_precision?: number | null;
  numeric_scale?: number | null;
  is_generated: boolean;
  generation_expression: string | null;
  is_unique: boolean;
  is_primary_key: boolean;
  has_auto_increment: boolean;
  foreign_key_column: string | null;
  foreign_key_table: string | null;
}

interface TableSchema {
  columns: Column[];
  foreignKeys: any[];
}

interface DatabaseSchema {
  [tableName: string]: TableSchema;
}

// SQL type to TypeScript type mapping
const sqlToTypeScriptType = new Map<string, string>([
  ["varchar", "string"],
  ["character varying", "string"],
  ["text", "string"],
  ["integer", "number"],
  ["float", "number"],
  ["datetime", "Date"],
  ["timestamp with time zone", "Date"],
  ["timestamp without time zone", "Date"],
  ["date", "Date"],
  ["timestamp", "Date"],
  ["boolean", "boolean"],
  ["json", "Record<string, any>"],
  ["uuid", "string"],
  ["char", "string"],
]);

// SQL type to ColumnType mapping
const sqlToColumnType = new Map<string, ColumnType>([
  ["varchar", "string"],
  ["text", "text"],
  ["integer", "integer"],
  ["float", "float"],
  ["datetime", "datetime"],
  ["timestamp with time zone", "timestamp"],
  ["timestamp without time zone", "timestamp"],
  ["date", "date"],
  ["timestamp", "timestamp"],
  ["boolean", "boolean"],
  ["json", "json"],
  ["uuid", "uuid"],
  ["character varying", "string"],
]);

function generateInterface(tableName: string, columns: Column[]): string {
  const properties = columns.map((column) => {
    let tsType = sqlToTypeScriptType.get(column.data_type) || "any";
    if (tsType === "Date") {
      tsType = "string";
    }
    const nullable = column.is_nullable ? "?" : "";
    return `  ${column.name}${nullable}: ${tsType};`;
  });

  return `export interface ${capitalizeFirstLetter(tableName)} {
${properties.join("\n")}
}`;
}

function generateMutationInterface(
  tableName: string,
  columns: Column[],
): string {
  const properties = columns.map((column) => {
    const tsType = sqlToTypeScriptType.get(column.data_type) || "any";
    const nullable = column.is_nullable
      ? "?"
      : column.is_primary_key
        ? "?"
        : column.default_value
          ? "?"
          : "";
    return `  ${column.name}${nullable}: ${tsType};`;
  });

  return `export interface ${capitalizeFirstLetter(tableName)}Mutation {
${properties.join("\n")}
}`;
}

function generateColumnTypeDefinition(
  tableName: string,
  columns: Column[],
): string {
  const properties = columns.map((column) => {
    const columnType = sqlToColumnType.get(column.data_type) || "string";
    return `  ${column.name}: {
    type: '${columnType}',
    nullable: ${column.is_nullable},
    primary: ${column.is_primary_key},
    unique: ${column.is_unique},
    autoIncrement: ${column.has_auto_increment}
  }`;
  });

  return `export const ${tableName}Schema = {
${properties.join(",\n")}
} as const;`;
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateTypeScriptInterfaces(schema: DatabaseSchema): string {
  const interfaces: string[] = [];
  const schemas: string[] = [];

  for (const [tableName, tableSchema] of Object.entries(schema)) {
    if (!tableSchema.columns || tableName === "table_permissions") {
      continue;
    }
    // Generate TypeScript Interface
    interfaces.push(generateInterface(tableName, tableSchema.columns));
    interfaces.push(generateMutationInterface(tableName, tableSchema.columns));
    schemas.push(generateColumnTypeDefinition(tableName, tableSchema.columns));
  }

  return `// Generated TypeScript Interfaces
${interfaces.join("\n\n")}

// Schema Definitions
${schemas.join("\n\n")}
`;
}

async function fetchSchema(
  url: string,
  headers?: Record<string, string>,
): Promise<DatabaseSchema> {
  try {
    const response = await axios.get(url, { headers });
    return response.data.schema;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch schema: ${error.message}`);
    }
    throw error;
  }
}

async function generate(options: {
  url: string;
  output: string;
  header: string[];
}) {
  const headers = options.header.reduce(
    (acc: Record<string, string>, curr: string) => {
      const [key, value] = curr.split("=");
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );
  try {
    // Fetch schema from API
    console.log("Fetching schema from API...");
    const schema = await fetchSchema(options.url, headers);

    // Generate TypeScript interfaces
    console.log("Generating TypeScript interfaces...");
    // console.log(schema);
    const output = generateTypeScriptInterfaces(schema);

    // Write output file
    const outputPath = path.resolve(options.output);
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, output);

    console.log(
      `Successfully generated TypeScript interfaces at ${outputPath}`,
    );
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : "Unknown error occurred",
    );
    process.exit(1);
  }
}

export const databaseCommand = new Command()
  .name("database")
  .description("Convert database schema from API to TypeScript interfaces")
  .requiredOption("-u, --url <url>", "API endpoint URL for schema")
  .option("-o, --output <path>", "Output TypeScript file path", "schema.ts")
  .option("-H, --header <headers...>", "HTTP headers (format: key=value)", [])
  .action(generate);

const t = "test";
