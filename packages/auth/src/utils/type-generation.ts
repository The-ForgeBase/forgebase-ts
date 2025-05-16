import { UserFieldDefinition } from './user-extension.js';

/**
 * Options for generating TypeScript types
 */
export interface TypeGenerationOptions {
  /**
   * Name of the interface to generate
   */
  interfaceName: string;

  /**
   * Field definitions
   */
  fields: UserFieldDefinition[];

  /**
   * Whether to include JSDoc comments
   * @default true
   */
  includeComments?: boolean;

  /**
   * Base interface to extend
   * @default 'User'
   */
  baseInterface?: string;

  /**
   * Import path for the base interface
   * @default '@the-forgebase/auth'
   */
  importPath?: string;
}

/**
 * Generates TypeScript interface code for an extended user type
 * @param options Type generation options
 * @returns TypeScript code as a string
 */
export function generateTypeInterface(options: TypeGenerationOptions): string {
  const {
    interfaceName,
    fields,
    includeComments = true,
    baseInterface = 'User',
    importPath = '@the-forgebase/auth',
  } = options;

  const fieldDefinitions = fields
    .map((field) => {
      const nullable = field.nullable !== false ? '?' : '';
      let type: string;

      switch (field.type) {
        case 'string':
        case 'text':
          type = 'string';
          break;
        case 'integer':
        case 'bigInteger':
        case 'decimal':
        case 'float':
          type = 'number';
          break;
        case 'boolean':
          type = 'boolean';
          break;
        case 'datetime':
        case 'date':
        case 'time':
        case 'timestamp':
          type = 'Date';
          break;
        case 'json':
        case 'jsonb':
          type = 'Record<string, any>';
          break;
        case 'uuid':
          type = 'string';
          break;
        default:
          type = 'any';
      }

      const comment =
        includeComments && field.description
          ? `  /** ${field.description} */\n`
          : '';

      return `${comment}  ${field.name}${nullable}: ${type};`;
    })
    .join('\n');

  const interfaceComment = includeComments
    ? `\n/**\n * Extended user interface with custom fields\n */`
    : '';

  return `import { ${baseInterface} } from '${importPath}';${interfaceComment}
export interface ${interfaceName} extends ${baseInterface} {
${fieldDefinitions}
}
`;
}

/**
 * Generates a TypeScript type file for an extended user model
 * @param options Type generation options
 * @param additionalImports Additional import statements to include
 * @param additionalTypes Additional type definitions to include
 * @returns Complete TypeScript file content as a string
 */
export function generateTypeFile(
  options: TypeGenerationOptions,
  additionalImports: string[] = [],
  additionalTypes: string[] = [],
): string {
  const { baseInterface = 'User', importPath = '@the-forgebase/auth' } =
    options;

  const imports = [
    `import { ${baseInterface} } from '${importPath}';`,
    ...additionalImports,
  ].join('\n');

  const interfaceCode = generateTypeInterface(options);

  // Remove the import statement from the interface code since we're adding it separately
  const interfaceCodeWithoutImport = interfaceCode.replace(
    `import { ${baseInterface} } from '${importPath}';`,
    '',
  );

  return `${imports}

${interfaceCodeWithoutImport}
${additionalTypes.join('\n\n')}
`;
}

/**
 * Generates TypeScript type definitions for a set of related user extensions
 * @param baseOptions Base options for all types
 * @param extensions Array of extension definitions
 * @returns TypeScript file content as a string
 */
export function generateExtensionTypes(
  baseOptions: Omit<TypeGenerationOptions, 'fields' | 'interfaceName'>,
  extensions: Array<{
    name: string;
    fields: UserFieldDefinition[];
    description?: string;
  }>,
): string {
  const imports = [
    `import { ${baseOptions.baseInterface || 'User'} } from '${baseOptions.importPath || '@the-forgebase/auth'}';`,
  ];
  const interfaces: string[] = [];

  for (const extension of extensions) {
    const interfaceName = extension.name;
    const comment = extension.description
      ? `\n/**\n * ${extension.description}\n */`
      : '';

    const fieldDefinitions = extension.fields
      .map((field) => {
        const nullable = field.nullable !== false ? '?' : '';
        let type: string;

        switch (field.type) {
          case 'string':
          case 'text':
            type = 'string';
            break;
          case 'integer':
          case 'bigInteger':
          case 'decimal':
          case 'float':
            type = 'number';
            break;
          case 'boolean':
            type = 'boolean';
            break;
          case 'datetime':
          case 'date':
          case 'time':
          case 'timestamp':
            type = 'Date';
            break;
          case 'json':
          case 'jsonb':
            type = 'Record<string, any>';
            break;
          case 'uuid':
            type = 'string';
            break;
          default:
            type = 'any';
        }

        const fieldComment = field.description
          ? `  /** ${field.description} */\n`
          : '';

        return `${fieldComment}  ${field.name}${nullable}: ${type};`;
      })
      .join('\n');

    interfaces.push(`${comment}
export interface ${interfaceName} extends ${baseOptions.baseInterface || 'User'} {
${fieldDefinitions}
}`);
  }

  return `${imports.join('\n')}

${interfaces.join('\n\n')}
`;
}

/**
 * Generates a combined user type with multiple extensions
 * @param options Options for the combined type
 * @param extensionTypes Array of extension type names to include
 * @returns TypeScript code for the combined type
 */
export function generateCombinedUserType(
  options: {
    name: string;
    description?: string;
    baseInterface?: string;
    importPath?: string;
  },
  extensionTypes: string[],
): string {
  const {
    name,
    description = 'Combined user type with multiple extensions',
    baseInterface = 'User',
    importPath = '@the-forgebase/auth',
  } = options;

  const imports = [
    `import { ${baseInterface} } from '${importPath}';`,
    ...extensionTypes.map(
      (type) => `import { ${type} } from './${type.toLowerCase()}';`,
    ),
  ];

  const comment = `\n/**\n * ${description}\n */`;

  const typeDefinition = `export type ${name} = ${baseInterface} & ${extensionTypes.join(' & ')};`;

  return `${imports.join('\n')}
${comment}
${typeDefinition}
`;
}
