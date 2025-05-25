import { executeStep } from './execute-step';
import { AuthInput, AuthOutput, AuthStep, StepNotFound } from '../../types';
import { describe, it, expect, vi } from 'vitest';

describe('executeStep', () => {
  // Mock step for testing
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

  // Mock getStep function
  const mockGetStep = vi.fn().mockImplementation((stepName: string) => {
    if (stepName === 'test-step') {
      return mockStep;
    }
    return undefined;
  });

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should execute a step successfully', async () => {
    const input: AuthInput = { testInput: 'test-value' };

    const result = await executeStep('test-step', input, {
      pluginName: 'test-plugin',
      getStep: mockGetStep,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Step executed successfully');
    expect(result.data).toBe('test-value');
    expect(mockGetStep).toHaveBeenCalledWith('test-step');
    expect(mockStep.run).toHaveBeenCalledWith(input, {
      pluginName: 'test-plugin',
      container: undefined,
    });
  });

  it('should throw StepNotFound if step does not exist', async () => {
    const input: AuthInput = { testInput: 'test-value' };

    await expect(
      executeStep('non-existent-step', input, {
        pluginName: 'test-plugin',
        getStep: mockGetStep,
      }),
    ).rejects.toThrow(StepNotFound);
  });

  it('should execute before hooks if provided', async () => {
    const input: AuthInput = { testInput: 'test-value' };

    // Create a step with hooks
    const stepWithHooks: AuthStep = {
      ...mockStep,
      hooks: {
        before: vi.fn().mockImplementation(async (input) => {
          return { ...input, modified: true };
        }),
      },
    };

    // Override getStep to return our step with hooks
    mockGetStep.mockImplementationOnce(() => stepWithHooks);

    await executeStep('test-step', input, {
      pluginName: 'test-plugin',
      getStep: mockGetStep,
    });

    expect(stepWithHooks.hooks?.before).toHaveBeenCalledWith(input, undefined);
    expect(stepWithHooks.run).toHaveBeenCalledWith(
      expect.objectContaining({ testInput: 'test-value', modified: true }),
      expect.anything(),
    );
  });

  it('should execute after hooks if provided', async () => {
    const input: AuthInput = { testInput: 'test-value' };
    const stepOutput: AuthOutput = {
      success: true,
      message: 'Step executed successfully',
    };

    // Mock the run function to return our predefined output
    const runFn = vi.fn().mockResolvedValue(stepOutput);

    // Create a step with hooks
    const stepWithHooks: AuthStep = {
      ...mockStep,
      run: runFn,
      hooks: {
        after: vi.fn().mockImplementation(async (output) => {
          return { ...output, modified: true };
        }),
      },
    };

    // Override getStep to return our step with hooks
    mockGetStep.mockImplementationOnce(() => stepWithHooks);

    const result = await executeStep('test-step', input, {
      pluginName: 'test-plugin',
      getStep: mockGetStep,
    });

    expect(stepWithHooks.hooks?.after).toHaveBeenCalledWith(
      stepOutput,
      undefined,
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Step executed successfully',
        modified: true,
      }),
    );
  });

  it('should handle errors and execute onError hooks if provided', async () => {
    const input: AuthInput = { testInput: 'test-value' };
    const testError = new Error('Test error');

    // Create a step that throws an error
    const errorStep: AuthStep = {
      ...mockStep,
      run: vi.fn().mockRejectedValue(testError),
      hooks: {
        onError: vi.fn(),
      },
    };

    // Override getStep to return our error step
    mockGetStep.mockImplementationOnce(() => errorStep);

    await expect(
      executeStep('test-step', input, {
        pluginName: 'test-plugin',
        getStep: mockGetStep,
      }),
    ).rejects.toThrow('Test error');

    expect(errorStep.hooks?.onError).toHaveBeenCalledWith(
      testError,
      input,
      undefined,
    );
  });
});
