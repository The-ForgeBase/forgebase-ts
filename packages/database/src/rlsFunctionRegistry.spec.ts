import { describe, test, expect, beforeEach, vi } from 'vitest';
import { rlsFunctionRegistry } from './rlsFunctionRegistry';
import type { UserContext } from './types';

describe('RLS Function Registry', () => {
  // Clear registry before each test
  beforeEach(() => {
    rlsFunctionRegistry.clear();
  });

  test('should register and retrieve a function', () => {
    const testFn = (userContext: UserContext) => userContext.role === 'admin';
    
    rlsFunctionRegistry.register('isAdmin', testFn);
    
    const retrievedFn = rlsFunctionRegistry.get('isAdmin');
    expect(retrievedFn).toBeDefined();
    expect(retrievedFn).toBe(testFn);
  });

  test('should check if a function exists', () => {
    rlsFunctionRegistry.register('testFunction', () => true);
    
    expect(rlsFunctionRegistry.has('testFunction')).toBe(true);
    expect(rlsFunctionRegistry.has('nonExistentFunction')).toBe(false);
  });

  test('should unregister a function', () => {
    rlsFunctionRegistry.register('tempFunction', () => true);
    expect(rlsFunctionRegistry.has('tempFunction')).toBe(true);
    
    const result = rlsFunctionRegistry.unregister('tempFunction');
    expect(result).toBe(true);
    expect(rlsFunctionRegistry.has('tempFunction')).toBe(false);
  });

  test('should return undefined for non-existent function', () => {
    const fn = rlsFunctionRegistry.get('nonExistentFunction');
    expect(fn).toBeUndefined();
  });

  test('should clear all registered functions', () => {
    rlsFunctionRegistry.register('fn1', () => true);
    rlsFunctionRegistry.register('fn2', () => false);
    
    expect(rlsFunctionRegistry.has('fn1')).toBe(true);
    expect(rlsFunctionRegistry.has('fn2')).toBe(true);
    
    rlsFunctionRegistry.clear();
    
    expect(rlsFunctionRegistry.has('fn1')).toBe(false);
    expect(rlsFunctionRegistry.has('fn2')).toBe(false);
  });

  test('should get all registered function names', () => {
    rlsFunctionRegistry.register('fn1', () => true);
    rlsFunctionRegistry.register('fn2', () => false);
    
    const names = rlsFunctionRegistry.getRegisteredFunctionNames();
    expect(names).toContain('fn1');
    expect(names).toContain('fn2');
    expect(names.length).toBe(2);
  });

  test('should warn when overwriting an existing function', () => {
    // Mock console.warn
    const originalWarn = console.warn;
    console.warn = vi.fn();
    
    rlsFunctionRegistry.register('duplicateFunction', () => true);
    rlsFunctionRegistry.register('duplicateFunction', () => false);
    
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('duplicateFunction'));
    
    // Restore console.warn
    console.warn = originalWarn;
  });

  test('should execute registered function with correct parameters', () => {
    const testUser: UserContext = {
      userId: 1,
      role: 'admin',
      labels: [],
      teams: []
    };
    
    const testRow = { id: 1, name: 'Test' };
    const mockKysely = {} as any;
    
    const testFn = vi.fn().mockReturnValue(true);
    rlsFunctionRegistry.register('execTest', testFn);
    
    const fn = rlsFunctionRegistry.get('execTest');
    const result = fn!(testUser, testRow, mockKysely);
    
    expect(result).toBe(true);
    expect(testFn).toHaveBeenCalledWith(testUser, testRow, mockKysely);
  });

  test('should handle async functions', async () => {
    const asyncFn = async () => {
      return Promise.resolve(true);
    };
    
    rlsFunctionRegistry.register('asyncFunction', asyncFn);
    
    const fn = rlsFunctionRegistry.get('asyncFunction');
    const result = await fn!({} as UserContext, {});
    
    expect(result).toBe(true);
  });
});
