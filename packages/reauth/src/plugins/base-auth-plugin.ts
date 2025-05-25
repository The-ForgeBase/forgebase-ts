// import { AwilixContainer } from 'awilix';
// import {
//   AuthInput,
//   AuthPlugin,
//   AuthStep,
//   ReAuthCradle,
//   AuthInputError,
// } from '../types';
// import { validateInputWithValidationSchema } from '../utils';

// /**
//  * Base class for auth plugins that provides common functionality
//  * Can be used either by extending this class or as a utility
//  */
// export class BaseAuthPlugin implements AuthPlugin {
//   name: string = 'base-plugin';
//   steps: AuthStep[] = [];

//   // Container and service properties
//   container!: AwilixContainer<ReAuthCradle>;

//   /**
//    * Initialize the plugin with an optional DI container
//    * @param container Optional Awilix container for dependency injection
//    */
//   async initialize(container: AwilixContainer<ReAuthCradle>): Promise<void> {
//     this.container = container;
//   }

//   /**
//    * Get a step by name
//    * @param step The name of the step to retrieve
//    */
//   getStep(step: string): AuthStep | undefined {
//     return this.steps.find((s) => s.name === step);
//   }

//   /**
//    * Run a step with the given input
//    * @param step The name of the step to run
//    * @param input The input data for the step
//    */
//   async runStep(step: string, input: AuthInput) {
//     const stepObj = this.getStep(step);
//     if (!stepObj) {
//       throw new Error(`Step ${step} is not registered for plugin ${this.name}`);
//     }

//     try {
//       // Validate input
//       if (stepObj.validationSchema) {
//         const result = await validateInputWithValidationSchema(
//           stepObj.validationSchema,
//           input.reqBody!,
//         );
//         if (!result.isValid) {
//           throw new AuthInputError(
//             'Input validation failed',
//             this.name,
//             stepObj.name,
//             result.errors,
//           );
//         }
//       }

//       let inp = input;

//       // Run before hooks
//       if (stepObj.hooks?.before) {
//         inp = await stepObj.hooks.before(input, this.container);
//       }

//       // Execute the step
//       const result = await stepObj.run(inp, {
//         pluginName: this.name,
//         container: this.container,
//       });

//       // Run after hooks
//       if (stepObj.hooks?.after) {
//         return await stepObj.hooks.after(result, this.container);
//       }

//       return result;
//     } catch (error) {
//       // Run error hooks if provided
//       if (stepObj.hooks?.onError) {
//         await stepObj.hooks.onError(error as Error, input, this.container);
//       }
//       throw error; // Re-throw to allow global error handling
//     }
//   }
// }

// /**
//  * FIXME not to be used for now
//  * Create a plugin from a partial implementation
//  * This allows using the base functionality while only specifying what's different
//  * @param plugin Partial plugin implementation
//  */
// export function createAuthPlugin(
//   plugin: Partial<AuthPlugin> & { name: string; steps: AuthStep[] },
// ): AuthPlugin {
//   const basePlugin = new BaseAuthPlugin();

//   // Create a new plugin that combines the base plugin with the provided plugin
//   const combinedPlugin: AuthPlugin = {
//     // Start with base plugin properties
//     ...basePlugin,

//     // Override with provided plugin properties
//     ...plugin,

//     // Explicitly handle required methods to satisfy TypeScript

//     // Make sure initialize is properly handled
//     initialize: async (container: AwilixContainer<ReAuthCradle>) => {
//       // Call the base initialize first
//       await basePlugin.initialize(container);

//       // Then call the plugin's initialize if it exists
//       if (plugin.initialize) {
//         await plugin.initialize(container);
//       }
//     },

//     // Handle getStep method
//     getStep: (step: string): AuthStep | undefined => {
//       // Use the plugin's implementation if provided
//       if (plugin.getStep) {
//         return plugin.getStep(step);
//       }
//       // Otherwise use the base implementation
//       return basePlugin.getStep(step);
//     },

//     // Handle runStep method
//     runStep: async (
//       step: string,
//       input: AuthInput,
//       container: AwilixContainer<ReAuthCradle>,
//     ) => {
//       // Use the plugin's implementation if provided
//       if (plugin.runStep) {
//         return await plugin.runStep(step, input, container);
//       }
//       // Otherwise use the base implementation
//       return await basePlugin.runStep(step, input);
//     },
//   };

//   return combinedPlugin;
// }
