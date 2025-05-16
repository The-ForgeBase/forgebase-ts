import type { CustomRlsFunction } from './types';

/**
 * Registry for custom RLS functions that can be used in permission rules
 */
class RlsFunctionRegistry {
  private functions: Map<string, CustomRlsFunction> = new Map();

  /**
   * Register a custom RLS function
   * @param name Unique name for the function
   * @param fn The function implementation
   */
  register(name: string, fn: CustomRlsFunction): void {
    if (this.functions.has(name)) {
      console.warn(`RLS function "${name}" is being overwritten`);
    }
    this.functions.set(name, fn);
  }

  /**
   * Get a registered RLS function by name
   * @param name Name of the function to retrieve
   * @returns The function or undefined if not found
   */
  get(name: string): CustomRlsFunction | undefined {
    return this.functions.get(name);
  }

  /**
   * Check if a function with the given name exists
   * @param name Name to check
   * @returns True if the function exists
   */
  has(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Remove a function from the registry
   * @param name Name of the function to remove
   * @returns True if the function was removed
   */
  unregister(name: string): boolean {
    return this.functions.delete(name);
  }

  /**
   * Clear all registered functions
   */
  clear(): void {
    this.functions.clear();
  }

  /**
   * Get all registered function names
   * @returns Array of function names
   */
  getRegisteredFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }
}

// Create a singleton instance
const rlsFunctionRegistry = new RlsFunctionRegistry();

export { rlsFunctionRegistry };
