import { createContainer, InjectionMode } from 'awilix';
import EmailPasswordAuth from './email-password.plugin';
import { AuthInput, ReAuthCradle } from '../../types';
import { describe, it, expect, vi } from 'vitest';

describe('EmailPasswordAuth Plugin', () => {
  let container: any;

  beforeEach(() => {
    // Create a fresh container for each test
    container = createContainer<ReAuthCradle>({
      injectionMode: InjectionMode.CLASSIC,
      strict: true,
    });
  });

  it('should have the correct name', () => {
    expect(EmailPasswordAuth.name).toBe('email-password');
  });

  it('should initialize with a container', async () => {
    await EmailPasswordAuth.initialize(container);
    expect(EmailPasswordAuth.container).toBe(container);
  });

  it('should have a login step', () => {
    const loginStep = EmailPasswordAuth.getStep('login');
    expect(loginStep).toBeDefined();
    expect(loginStep?.name).toBe('login');
    expect(loginStep?.description).toBe(
      'Authenticate user with email and password',
    );
    expect(loginStep?.inputs).toContain('email');
    expect(loginStep?.inputs).toContain('password');
  });

  it('should validate email and password inputs', async () => {
    const loginStep = EmailPasswordAuth.getStep('login');
    expect(loginStep?.validationSchema).toBeDefined();
    expect(loginStep?.validationSchema?.email).toBeDefined();
    expect(loginStep?.validationSchema?.password).toBeDefined();
  });

  it('should run the login step successfully with valid inputs', async () => {
    // Initialize the plugin
    await EmailPasswordAuth.initialize(container);

    // Valid input data
    const input: AuthInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    // Run the login step
    const result = await EmailPasswordAuth.runStep('login', input, container);

    // Check the result
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Login successful');
  });

  it('should register and execute hooks', async () => {
    // Initialize the plugin
    await EmailPasswordAuth.initialize(container);

    // Get the login step
    const loginStep = EmailPasswordAuth.getStep('login');
    expect(loginStep).toBeDefined();

    // Create a mock hook function
    const beforeHook = vi.fn().mockImplementation((input) => {
      return { ...input, additionalData: 'test' };
    });

    // Register the hook
    loginStep?.registerHook('before', beforeHook);

    // Valid input data
    const input: AuthInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    // Run the login step
    await EmailPasswordAuth.runStep('login', input, container);

    // Check that the hook was called
    expect(beforeHook).toHaveBeenCalled();
    expect(beforeHook).toHaveBeenCalledWith(input, container, undefined);
  });
});
