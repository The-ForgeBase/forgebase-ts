import { ReAuthEngine } from './auth-engine';
import { AuthPlugin, AuthStep, PluginNotFound, StepNotFound } from './types';
import { describe, it, expect, vi } from 'vitest';

describe('ReAuthEngine', () => {
  // Mock plugin for testing
  const createMockPlugin = (name: string): AuthPlugin => {
    const mockStep: AuthStep = {
      name: 'test-step',
      description: 'Test step for unit testing',
      inputs: ['testInput'],
      run: vi.fn().mockImplementation(async (input) => {
        return {
          success: true,
          message: 'Step executed successfully',
          data: input.testInput,
        };
      }),
      registerHook: vi.fn(),
    };

    return {
      name,
      steps: [mockStep],
      initialize: vi.fn(),
      getStep: vi.fn().mockImplementation((stepName: string) => {
        if (stepName === 'test-step') {
          return mockStep;
        }
        return undefined;
      }),
      runStep: vi
        .fn()
        .mockImplementation(async (stepName, input, container) => {
          if (stepName === 'test-step') {
            return {
              success: true,
              message: 'Step executed successfully',
              data: input.testInput,
            };
          }
          throw new StepNotFound(stepName, name);
        }),
    };
  };

  let reAuth: ReAuthEngine;
  let mockPlugin: AuthPlugin;

  beforeEach(() => {
    // Create a fresh plugin and ReAuthEnginne instance for each test
    mockPlugin = createMockPlugin('test-plugin');
    reAuth = new ReAuthEngine([mockPlugin], { database: '' });
  });

  it('should register plugins during initialization', () => {
    expect(mockPlugin.initialize).toHaveBeenCalled();
  });

  it('should register a plugin after initialization', () => {
    const newPlugin = createMockPlugin('new-plugin');
    reAuth.registerPlugin(newPlugin);
    expect(newPlugin.initialize).toHaveBeenCalled();
  });

  it('should get a registered plugin by name', () => {
    const plugin = reAuth.getPlugin('test-plugin');
    expect(plugin).toBe(mockPlugin);
  });

  it('should throw PluginNotFound for non-existent plugin', () => {
    expect(() => reAuth.getPlugin('non-existent')).toThrow(PluginNotFound);
  });

  it('should execute a step on a plugin', async () => {
    const result = await reAuth.executeStep('test-plugin', 'test-step', {
      testInput: 'test-value',
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Step executed successfully');
    expect(result.data).toBe('test-value');
    expect(mockPlugin.runStep).toHaveBeenCalled();
  });

  it('should throw StepNotFound for non-existent step', async () => {
    try {
      await reAuth.executeStep('test-plugin', 'non-existent-step', {
        testInput: 'test-value',
      });
      // If we reach here, the test should fail
      fail('Expected StepNotFound to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(StepNotFound);
      expect((error as StepNotFound).message).toContain('non-existent-step');
    }
  });

  it('should register a hook on a plugin step', () => {
    const mockHook = vi.fn();
    reAuth.registerHook('test-plugin', 'test-step', 'before', mockHook);

    const step = mockPlugin.steps.find((s) => s.name === 'test-step');
    expect(step?.registerHook).toHaveBeenCalledWith('before', mockHook);
  });

  it('should throw StepNotFound when registering hook on non-existent step', () => {
    const mockHook = vi.fn();
    expect(() =>
      reAuth.registerHook(
        'test-plugin',
        'non-existent-step',
        'before',
        mockHook,
      ),
    ).toThrow(StepNotFound);
  });
});
