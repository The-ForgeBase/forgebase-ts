import { z } from 'zod';
import { UserFieldDefinition } from './user-extension';

/**
 * Creates a Zod schema from user field definitions
 * @param fields User field definitions
 * @returns Zod schema for validating user data
 */
//FIXME: there is a bug in the zod schema generation
export function createUserValidationSchema(
  fields: UserFieldDefinition[]
): z.ZodObject<any> {
  const schemaFields: Record<string, any> = {};

  for (const field of fields) {
    let fieldSchema;

    // Create base schema based on field type
    switch (field.type) {
      case 'string':
      case 'text':
      case 'uuid':
        fieldSchema = z.string();

        // Add string-specific validations
        if (field.validation?.minLength !== undefined) {
          fieldSchema = fieldSchema.min(field.validation.minLength, {
            message: `${field.name} must be at least ${field.validation.minLength} characters`,
          });
        }

        if (field.validation?.maxLength !== undefined) {
          fieldSchema = fieldSchema.max(field.validation.maxLength, {
            message: `${field.name} must be at most ${field.validation.maxLength} characters`,
          });
        }

        if (field.validation?.pattern !== undefined) {
          const pattern =
            field.validation.pattern instanceof RegExp
              ? field.validation.pattern
              : new RegExp(field.validation.pattern);

          fieldSchema = fieldSchema.regex(pattern, {
            message: `${field.name} has an invalid format`,
          });
        }

        if (field.validation?.isEmail) {
          fieldSchema = fieldSchema.email({
            message: `${field.name} must be a valid email address`,
          });
        }

        if (field.validation?.isUrl) {
          fieldSchema = fieldSchema.url({
            message: `${field.name} must be a valid URL`,
          });
        }

        break;

      case 'integer':
      case 'bigInteger':
      case 'decimal':
      case 'float':
        fieldSchema = z.number();

        // Add number-specific validations
        if (field.validation?.min !== undefined) {
          fieldSchema = fieldSchema.min(field.validation.min, {
            message: `${field.name} must be at least ${field.validation.min}`,
          });
        }

        if (field.validation?.max !== undefined) {
          fieldSchema = fieldSchema.max(field.validation.max, {
            message: `${field.name} must be at most ${field.validation.max}`,
          });
        }

        break;

      case 'boolean':
        fieldSchema = z.boolean();
        break;

      case 'datetime':
      case 'date':
      case 'time':
      case 'timestamp':
        fieldSchema = z.date();
        break;

      case 'json':
      case 'jsonb':
        fieldSchema = z.record(z.any());
        break;

      default:
        fieldSchema = z.any();
    }

    // Handle nullable fields
    if (field.nullable !== false) {
      fieldSchema = fieldSchema.nullable();
    }

    // Handle required fields
    if (field.validation?.required) {
      fieldSchema = fieldSchema.nullable(false);
    }

    // Add custom validation if provided
    if (field.validation?.custom) {
      fieldSchema = fieldSchema.refine(
        (value) => {
          try {
            return field.validation!.custom!(value);
          } catch (error) {
            return false;
          }
        },
        {
          message: field.validation.customMessage || `${field.name} is invalid`,
        }
      );
    }

    // Add to schema fields
    schemaFields[field.name] = fieldSchema;
  }

  return z.object(schemaFields);
}

/**
 * Validates user data against field definitions using Zod
 * @param userData User data to validate
 * @param fields Field definitions to validate against
 * @returns Validation result with errors if any
 */
export function validateUserDataWithZod(
  userData: Record<string, any>,
  fields: UserFieldDefinition[]
): { valid: boolean; errors: Record<string, string> } {
  const schema = createUserValidationSchema(fields);

  try {
    schema.parse(userData);
    return { valid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};

      for (const issue of error.errors) {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      }

      return { valid: false, errors };
    }

    return {
      valid: false,
      errors: { _error: 'An unknown validation error occurred' },
    };
  }
}

/**
 * Validates a phone number
 * @param phone Phone number to validate
 * @returns True if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Basic international phone number validation (E.164 format)
  return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s+/g, ''));
}

/**
 * Validates an email address
 * @param email Email address to validate
 * @returns True if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  // Basic email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a URL
 * @param url URL to validate
 * @returns True if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates a password against common requirements
 * @param password Password to validate
 * @param options Validation options
 * @returns Validation result with errors if any
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecialChar?: boolean;
  } = {}
): { valid: boolean; errors: string[] } {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecialChar = true,
  } = options;

  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (
    requireSpecialChar &&
    !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
