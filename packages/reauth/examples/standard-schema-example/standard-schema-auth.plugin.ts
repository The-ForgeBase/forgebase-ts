import { type } from 'arktype';
import { AuthInput, AuthStep, HooksError } from '../../src/types';
import { BaseAuthPlugin } from '../../src/plugins/base-auth-plugin';
import { createStandardSchemaRule } from '../../src/utils/standard-schema';

// Define schemas using ArkType (which implements standard-schema)
const emailSchema = type('string.email');
const passwordSchema = type('string.alphanumeric >= 3');

// Create validation rules using standard-schema
const loginValidation = {
  email: createStandardSchemaRule(
    emailSchema,
    'Please enter a valid email address',
  ),
  password: createStandardSchemaRule(
    passwordSchema,
    'Password must be at least 8 characters',
  ),
};

// Define a user schema for registration
const userSchema = type({
  email: 'string.email',
  password: 'string.alphanumeric >= 8',
  name: 'string?',
  phone: 'string?',
});

class StandardSchemaAuth extends BaseAuthPlugin {
  name = 'standard-schema-auth';
  defaultConfig = {
    useCookie: true,
    cookieName: 'forgebase-auth' as const,
    cookieOptions: {
      maxAge: 3600,
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
    },
    returnToken: true,
  };
  requiredInput = {
    reqBody: true,
    reqQuery: false,
    reqParams: false,
    reqHeaders: false,
    reqMethod: false,
  };

  steps: AuthStep[] = [
    {
      name: 'login',
      description:
        'Authenticate user with email and password using standard-schema validation',
      validationSchema: loginValidation,
      run: async (input: AuthInput) => {
        const { email, password } = input.reqBody!;
        // Implement login logic here
        return { success: true, message: 'Login successful' };
      },
      hooks: {
        before: [
          async (input) => console.log('Login attempt:', input.reqBody?.email),
        ],
        after: [
          async (input) =>
            console.log('Login successful for:', input.reqBody?.email),
        ],
        onError: async (error, input) => {
          throw new HooksError(
            'Login failed for:',
            'standard-schema-auth',
            'login',
            'onError',
            {
              error,
              input,
            },
          );
        },
      },
    },
    {
      name: 'register',
      description: 'Register a new user with standard-schema validation',
      validationSchema: {
        email: createStandardSchemaRule(
          emailSchema,
          'Please enter a valid email address',
        ),
        password: createStandardSchemaRule(
          passwordSchema,
          'Password must be at least 8 characters',
        ),
        name: (val) =>
          val && typeof val !== 'string' ? 'Name must be a string' : undefined,
      },
      run: async (input: AuthInput) => {
        const userData = input.reqBody!;

        // You can also validate the entire user object using the schema directly
        const result = await userSchema['~standard'].validate(userData);

        if (result.issues) {
          throw new Error(`Validation failed: ${result.issues}`);
        }

        // Implement registration logic here
        return { success: true, message: 'Registration successful' };
      },
      hooks: {
        before: [
          async (input) =>
            console.log('Registration attempt:', input.reqBody?.email),
        ],
        after: [
          async (input) =>
            console.log('Registration successful for:', input.reqBody?.email),
        ],
        onError: async (error, input) => {
          throw new HooksError(
            'Registration failed for:',
            'standard-schema-auth',
            'register',
            'onError',
            {
              error,
              input,
            },
          );
        },
      },
    },
  ];

  // Override the initialize method to add custom initialization logic if needed
  async initialize(container?: any) {
    // Call the parent initialize method to set up the container and services
    await super.initialize(container);

    // Add any custom initialization logic here
    console.log(`Custom initialization for ${this.name} plugin`);
  }
}

export default StandardSchemaAuth;
