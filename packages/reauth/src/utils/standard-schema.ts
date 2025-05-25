import type { StandardSchemaV1 } from '@standard-schema/spec';
import { AuthInput, ValidationResult, ValidationSchema } from '../types';

/**
 * Validates input data using a standard-schema compliant validator
 *
 * @param schema Any standard-schema compliant validator (Zod, Valibot, ArkType, etc.)
 * @param value The value to validate
 * @param fieldName The name of the field being validated (for error messages)
 * @param input The complete AuthInput object (for context)
 * @returns ValidationResult compatible with reauth's validation system
 */
export function validateWithStandardSchema<T extends StandardSchemaV1>(
  schema: T,
  value: unknown,
  fieldName: string,
  input: AuthInput,
): ValidationResult {
  try {
    const result = schema['~standard'].validate(value);

    // Handle async validation results (convert to sync)
    if (result instanceof Promise) {
      return {
        isValid: false,
        errors: {
          [fieldName]: 'Async validation is not supported',
        },
      };
    }

    // If validation passed
    if (!result.issues) {
      return {
        isValid: true,
      };
    }

    // If validation failed, format errors to match reauth's format
    const errors: Record<string, string> = {};

    for (const issue of result.issues) {
      // Use the field name as the key if no path is provided
      const key =
        issue.path && issue.path.length > 0
          ? `${fieldName}.${issue.path.map((p) => (typeof p === 'object' ? p.key : p)).join('.')}`
          : fieldName;

      errors[key] = issue.message;
    }

    return {
      isValid: false,
      errors,
    };
  } catch (error) {
    // Handle any unexpected errors
    return {
      isValid: false,
      errors: {
        [fieldName]:
          error instanceof Error ? error.message : 'Unknown validation error',
      },
    };
  }
}

/**
 * Creates a ValidationRule that uses a standard-schema compliant validator
 *
 * @param schema Any standard-schema compliant validator
 * @param errorMessage Optional custom error message
 * @returns A ValidationRule compatible with reauth's validation system
 */
export function createStandardSchemaRule<T extends StandardSchemaV1>(
  schema: T,
  errorMessage?: string,
) {
  return (value: unknown, input: AuthInput): string | undefined => {
    const result = schema['~standard'].validate(value);

    // Handle async validation results (convert to sync)
    if (result instanceof Promise) {
      return 'Async validation is not supported';
    }

    // If validation passed
    if (!result.issues) {
      return undefined;
    }

    // If validation failed, return the first error message
    return errorMessage || result.issues[0]?.message || 'Validation failed';
  };
}

/**
 * Utility function to validate an entire input object against a schema
 *
 * @param schema Any standard-schema compliant validator
 * @param input The input data to validate
 * @returns ValidationResult compatible with reauth's validation system
 */
export async function validateInputWithStandardSchema<
  T extends StandardSchemaV1,
>(schema: T, input: Record<string, any>): Promise<ValidationResult> {
  try {
    let result = schema['~standard'].validate(input);

    // Handle async validation if needed
    if (result instanceof Promise) {
      result = await result;
    }

    // If validation passed
    if (!result.issues) {
      return {
        isValid: true,
      };
    }

    // If validation failed, format errors to match reauth's format
    const errors: Record<string, string> = {};

    for (const issue of result.issues) {
      const key =
        issue.path && issue.path.length > 0
          ? issue.path.map((p) => (typeof p === 'object' ? p.key : p)).join('.')
          : '_error';

      errors[key] = issue.message;
    }

    return {
      isValid: false,
      errors,
    };
  } catch (error) {
    // Handle any unexpected errors
    return {
      isValid: false,
      errors: {
        _error:
          error instanceof Error ? error.message : 'Unknown validation error',
      },
    };
  }
}

/**
 * Utility function to validate an entire input object against a ValidationSchema
 *
 * This function is used to validate input using the built-in ValidationSchema type
 *
 * @param schema ValidationSchema with validation rules
 * @param input The input data to validate
 * @returns ValidationResult compatible with reauth's validation system
 */
export async function validateInputWithValidationSchema(
  schema: ValidationSchema,
  input: Record<string, any>,
): Promise<ValidationResult> {
  const errors: Record<string, string> = {};

  // Run each validation rule
  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];
    const rulesArray = Array.isArray(rules) ? rules : [rules];

    for (const rule of rulesArray) {
      // Create a minimal AuthInput object for the validation rule
      const authInput: AuthInput = { reqBody: input };

      const error = rule(value, authInput);
      if (error) {
        errors[field] = error;
        break; // Stop on first error for this field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}
