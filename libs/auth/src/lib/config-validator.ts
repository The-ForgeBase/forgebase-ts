import { z } from 'zod';
import { AuthError, AUTH_ERROR_CODES } from './errors';

export interface ValidationRule {
  validate: (value: any) => Promise<boolean>;
  message: string;
}

export class ConfigValidator {
  private schemas = new Map<string, z.ZodType>();
  private customRules = new Map<string, ValidationRule[]>();
  private dependencies = new Map<string, Set<string>>();

  registerSchema(path: string, schema: z.ZodType): void {
    this.schemas.set(path, schema);
  }

  addCustomRule(path: string, rule: ValidationRule): void {
    if (!this.customRules.has(path)) {
      this.customRules.set(path, []);
    }
    this.customRules.get(path)!.push(rule);
  }

  addDependency(path: string, dependsOn: string): void {
    if (!this.dependencies.has(path)) {
      this.dependencies.set(path, new Set());
    }
    this.dependencies.get(path)!.add(dependsOn);
  }

  async validate(
    path: string,
    value: any,
    fullConfig: Record<string, any>
  ): Promise<void> {
    // Schema validation
    const schema = this.schemas.get(path);
    if (schema) {
      try {
        await schema.parseAsync(value);
      } catch (error) {
        throw new AuthError(
          AUTH_ERROR_CODES.INVALID_CONFIG,
          `Invalid configuration at ${path}: ${error.message}`,
          400
        );
      }
    }

    // Custom rules validation
    const rules = this.customRules.get(path);
    if (rules) {
      for (const rule of rules) {
        const isValid = await rule.validate(value);
        if (!isValid) {
          throw new AuthError(
            AUTH_ERROR_CODES.INVALID_CONFIG,
            `Configuration validation failed at ${path}: ${rule.message}`,
            400
          );
        }
      }
    }

    // Dependency validation
    const deps = this.dependencies.get(path);
    if (deps) {
      for (const dep of deps) {
        if (!(dep in fullConfig)) {
          throw new AuthError(
            AUTH_ERROR_CODES.INVALID_CONFIG,
            `Configuration at ${path} requires ${dep} to be present`,
            400
          );
        }
      }
    }
  }

  async validateAll(config: Record<string, any>): Promise<void> {
    const validationPromises: Promise<void>[] = [];

    for (const [path, value] of Object.entries(config)) {
      validationPromises.push(this.validate(path, value, config));
    }

    await Promise.all(validationPromises);
  }
}

// Common validation rules
export const commonValidationRules = {
  nonEmptyArray: (
    message: string = 'Array must not be empty'
  ): ValidationRule => ({
    validate: async (value: any) => Array.isArray(value) && value.length > 0,
    message,
  }),

  uniqueValues: (field: string, message?: string): ValidationRule => ({
    validate: async (array: any[]) => {
      if (!Array.isArray(array)) return false;
      const values = array.map((item) => item[field]);
      return new Set(values).size === values.length;
    },
    message: message || `${field} values must be unique`,
  }),

  urlReachable: (
    message: string = 'URL must be reachable'
  ): ValidationRule => ({
    validate: async (url: string) => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    },
    message,
  }),
};
