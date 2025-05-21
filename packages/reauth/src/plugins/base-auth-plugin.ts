import { AwilixContainer } from 'awilix';
import {
  AuthInput,
  AuthPlugin,
  AuthStep,
  HookFunction,
  ValidationResult,
  ValidationSchema,
  ReAuthCradle,
  AuthInputError,
} from '../types';

/**
 * Base class for auth plugins that provides common functionality
 * Can be used either by extending this class or as a utility
 */
export class BaseAuthPlugin implements AuthPlugin {
  name: string = 'base-plugin';
  steps: AuthStep[] = [];
  defaultConfig: AuthPlugin['defaultConfig'] = {
    useCookie: false,
    returnToken: true,
  };
  requiredInput: AuthPlugin['requiredInput'] = {
    reqBody: false,
    reqQuery: false,
    reqParams: false,
    reqHeaders: false,
    reqMethod: false,
  };

  // Container and service properties
  container?: AwilixContainer<ReAuthCradle>;
  emailService?: any;
  userService?: any;
  tokenService?: any;

  /**
   * Initialize the plugin with an optional DI container
   * @param container Optional Awilix container for dependency injection
   */
  async initialize(container?: AwilixContainer<ReAuthCradle>): Promise<void> {
    if (container) this.container = container;

    // If container is provided, try to resolve dependencies
    if (container) {
      try {
        // Example: Get services from the container if they exist
        if (container.hasRegistration('emailService')) {
          this.emailService = container.resolve('emailService');
        }

        if (container.hasRegistration('userService')) {
          this.userService = container.resolve('userService');
        }

        if (container.hasRegistration('tokenService')) {
          this.tokenService = container.resolve('tokenService');
        }

        console.log(
          `${this.name} plugin successfully connected to DI container`,
        );
      } catch (error) {
        console.error(
          `Error resolving dependencies for ${this.name} plugin:`,
          error,
        );
      }
    }
  }

  /**
   * Get a step by name
   * @param step The name of the step to retrieve
   */
  getStep(step: string): AuthStep | undefined {
    return this.steps.find((s) => s.name === step);
  }

  /**
   * Run hooks for a step
   * @param hooks The hooks to run
   * @param input The input data
   * @param output Optional output data
   */
  async runHooks(
    hooks: HookFunction | HookFunction[] | undefined,
    input: AuthInput,
    output?: any,
  ): Promise<void> {
    if (!hooks) return;
    const hooksArray = Array.isArray(hooks) ? hooks : [hooks];
    for (const hook of hooksArray) {
      await hook(input, output);
    }
  }

  /**
   * Validate input against a schema
   * @param schema The validation schema
   * @param input The input data to validate
   */
  validateInput(schema: ValidationSchema, input: AuthInput): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = input.reqBody?.[field];
      const rulesArray = Array.isArray(rules) ? rules : [rules];

      for (const rule of rulesArray) {
        const error = rule(value, input);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }

  /**
   * Run a step with the given input
   * @param step The name of the step to run
   * @param input The input data for the step
   */
  async runStep(step: string, input: AuthInput) {
    const stepObj = this.getStep(step);
    if (!stepObj) {
      throw new Error(`Step ${step} is not registered for plugin ${this.name}`);
    }

    try {
      // Check required input
      for (const [field, required] of Object.entries(this.requiredInput)) {
        if (required && !input[field]) {
          throw new AuthInputError(
            `Missing required input: ${field}`,
            this.name,
            step,
            input,
          );
        }
      }

      // Run before hooks
      if (stepObj.hooks?.before) {
        await this.runHooks(stepObj.hooks.before, input);
      }

      // Validate input if schema is provided
      if (stepObj.validationSchema) {
        const { isValid, errors } = this.validateInput(
          stepObj.validationSchema,
          input,
        );
        if (!isValid) {
          throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
        }
      }

      // Execute the step
      const result = await stepObj.run(input);

      // Run after hooks
      if (stepObj.hooks?.after) {
        await this.runHooks(stepObj.hooks.after, input, result);
      }

      return result;
    } catch (error) {
      // Run error hooks if provided
      if (stepObj.hooks?.onError) {
        await stepObj.hooks.onError(error as Error, input);
      }
      throw error; // Re-throw to allow global error handling
    }
  }
}

/**
 * FIXME not to be used for now
 * Create a plugin from a partial implementation
 * This allows using the base functionality while only specifying what's different
 * @param plugin Partial plugin implementation
 */
export function createAuthPlugin(
  plugin: Partial<AuthPlugin> & { name: string; steps: AuthStep[] },
): AuthPlugin {
  const basePlugin = new BaseAuthPlugin();

  // Create a new plugin that combines the base plugin with the provided plugin
  const combinedPlugin: AuthPlugin = {
    // Start with base plugin properties
    ...basePlugin,

    // Override with provided plugin properties
    ...plugin,

    // Explicitly handle required methods to satisfy TypeScript

    // Make sure initialize is properly handled
    initialize: async (container?: AwilixContainer<ReAuthCradle>) => {
      // Call the base initialize first
      await basePlugin.initialize(container);

      // Then call the plugin's initialize if it exists
      if (plugin.initialize) {
        await plugin.initialize(container);
      }
    },

    // Handle getStep method
    getStep: (step: string): AuthStep | undefined => {
      // Use the plugin's implementation if provided
      if (plugin.getStep) {
        return plugin.getStep(step);
      }
      // Otherwise use the base implementation
      return basePlugin.getStep(step);
    },

    // Handle runStep method
    runStep: async (step: string, input: AuthInput) => {
      // Use the plugin's implementation if provided
      if (plugin.runStep) {
        return await plugin.runStep(step, input);
      }
      // Otherwise use the base implementation
      return await basePlugin.runStep(step, input);
    },
  };

  return combinedPlugin;
}
