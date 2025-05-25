import { AuthPlugin, AuthStep } from '../../types';

export function createAuthPlugin(
  config: Partial<AuthPlugin>,
  plugin: AuthPlugin,
  overrideStep?: {
    name: string;
    override: Partial<AuthStep<any>>;
  }[],
): AuthPlugin {
  const basePlugin = plugin;

  // Start with base plugin steps
  let allSteps = [...basePlugin.steps];

  // Apply step overrides if provided
  if (overrideStep && overrideStep.length > 0) {
    overrideStep.forEach((stepOverride) => {
      const existingStepIndex = allSteps.findIndex(
        (s) => s.name === stepOverride.name,
      );
      if (existingStepIndex !== -1) {
        // Override the existing step, ensuring required properties are preserved
        allSteps[existingStepIndex] = {
          ...allSteps[existingStepIndex],
          ...stepOverride.override,
        } as AuthStep<any>;
      }
    });
  }

  // Apply config steps if provided
  if (config.steps && config.steps.length > 0) {
    config.steps.forEach((configStep) => {
      const existingStepIndex = allSteps.findIndex(
        (s) => s.name === configStep.name,
      );
      if (existingStepIndex !== -1) {
        // Replace the existing step with the config step
        allSteps[existingStepIndex] = configStep;
      } else {
        // Add new step from config
        allSteps.push(configStep);
      }
    });
  }

  const combinedPlugin: AuthPlugin = {
    ...basePlugin,
    ...config,
    steps: allSteps,
  };
  return combinedPlugin;
}
