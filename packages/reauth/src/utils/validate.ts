import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Validates data against any standard-schema compliant validator
 *
 * This function can be used with any schema library that implements the standard-schema spec,
 * such as Zod, Valibot, ArkType, etc.
 *
 * @param schema Any standard-schema compliant validator
 * @param input The data to validate
 * @returns The validated and typed output data
 * @throws Error if validation fails, with formatted error messages
 */
export async function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>,
): Promise<StandardSchemaV1.InferOutput<T>> {
  let result = schema['~standard'].validate(input);
  if (result instanceof Promise) result = await result;

  // If the `issues` field exists, the validation failed
  if (result.issues) {
    throw new Error(JSON.stringify(result.issues, null, 2));
  }

  return result.value;
}

/**
 * Validates data against any standard-schema compliant validator without throwing
 *
 * @param schema Any standard-schema compliant validator
 * @param input The data to validate
 * @returns An object containing the validation result and any errors
 */
export async function safeValidate<T extends StandardSchemaV1>(
  schema: T,
  input: unknown,
): Promise<{
  success: boolean;
  value?: StandardSchemaV1.InferOutput<T>;
  errors?: Array<{
    message: string;
    path?: Array<string | number> | undefined;
  }>;
}> {
  try {
    let result = schema['~standard'].validate(input);
    if (result instanceof Promise) result = await result;

    if (result.issues) {
      return {
        success: false,
        errors: result.issues.map((issue) => ({
          message: issue.message,
          path: issue.path
            ? (issue.path.map((p) =>
                typeof p === 'object'
                  ? String(p.key)
                  : typeof p === 'symbol'
                    ? String(p)
                    : p,
              ) as Array<string | number>)
            : undefined,
        })),
      };
    }

    return {
      success: true,
      value: result.value,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message:
            error instanceof Error ? error.message : 'Unknown validation error',
        },
      ],
    };
  }
}
