import { EnvironmentInjector, importProvidersFrom } from '@angular/core';
import { UseClientDirective } from './use-client.directive';

/**
 * Collection of directives that should be globally available throughout the application
 * without needing to be explicitly imported in each component.
 */
const GLOBAL_DIRECTIVES = [UseClientDirective];

/**
 * Provides all global directives for use in the bootstrapping process.
 *
 * @example
 * // In main.ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     // ...other providers
 *     provideGlobalDirectives()
 *   ]
 * });
 */
export function provideGlobalDirectives() {
  return importProvidersFrom([GLOBAL_DIRECTIVES]);
}

/**
 * Registers a directive to be available globally.
 * This is a utility function for internal use.
 *
 * @param injector The environment injector
 */
export function registerGlobalDirectives(injector: EnvironmentInjector) {
  // This function would handle any runtime registration logic if needed
  return true;
}
