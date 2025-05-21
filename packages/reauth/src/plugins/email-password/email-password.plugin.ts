import { type } from 'arktype';
import { ValidationSchema, AuthStep, AuthInput, HooksError } from '../../types';
import { BaseAuthPlugin } from '../base-auth-plugin';
import { createStandardSchemaRule } from '../../utils';

const emailSchema = type('string.email');
const passwordSchema = type('string.alphanumeric <= 8');

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

class EmailPasswordAuth extends BaseAuthPlugin {
  name = 'email-password';
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
      description: 'Authenticate user with email and password',
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
            'email-password',
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
      description: 'Register a new user with email and password',
      run: async (input: AuthInput) => {
        const { email, password, userData } = input.reqBody!;
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
            'email-password',
            'register',
            'onError',
            {
              error,
              input,
            },
          );
        },
      },
      validationSchema: loginValidation,
    },
    {
      name: 'forgot-password',
      description: 'Initiate password reset process',
      run: async (input: AuthInput) => {
        const { email } = input.reqBody!;

        // Example of using injected services
        if (this.emailService) {
          try {
            // Use the injected email service to send a reset email
            const token = await this.tokenService?.generateResetToken(email);
            await this.emailService.sendPasswordResetEmail(email, token);
            return {
              success: true,
              message: 'Password reset email sent',
              token,
            };
          } catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
          }
        } else {
          // Fallback implementation if no email service is available
          console.log(`Would send password reset email to ${email}`);
          return { success: true, message: 'Password reset email sent (mock)' };
        }
      },
      hooks: {
        before: [
          async (input) =>
            console.log('Forgot password attempt:', input.reqBody?.email),
        ],
        after: [
          async (input) =>
            console.log(
              'Forgot password successful for:',
              input.reqBody?.email,
            ),
        ],
        onError: async (error, input) => {
          throw new HooksError(
            'Forgot password failed for:',
            'email-password',
            'forgot-password',
            'onError',
            {
              error,
              input,
            },
          );
        },
      },
      validationSchema: {
        email: [
          (val) => (!val ? 'Email is required' : undefined),
          (val) =>
            val && !/\S+@\S+\.\S+$/.test(val)
              ? 'Invalid email format'
              : undefined,
        ],
      },
    },
    {
      name: 'reset-password',
      description: 'Reset user password with a valid token',
      run: async (input: AuthInput) => {
        const { token, userId, newPassword } = input.reqBody!;

        // Example of using injected services
        if (this.userService && this.tokenService) {
          try {
            // Verify the token
            const isValid = await this.tokenService.verifyResetToken(
              token,
              userId,
            );

            if (!isValid) {
              throw new Error('Invalid or expired token');
            }

            // Update the user's password
            await this.userService.updatePassword(userId, newPassword);

            // Invalidate the token
            await this.tokenService.invalidateToken(token);

            return { success: true, message: 'Password reset successful' };
          } catch (error: any) {
            console.error('Error resetting password:', error);
            throw new Error(
              `Failed to reset password: ${error.message || 'Unknown error'}`,
            );
          }
        } else {
          // Fallback implementation if services aren't available
          console.log(`Would reset password for token ${token}`);
          return { success: true, message: 'Password reset successful (mock)' };
        }
      },
      hooks: {
        before: [
          async (input) =>
            console.log('Reset password attempt:', input.reqBody?.token),
        ],
        after: [
          async (input) =>
            console.log('Reset password successful for:', input.reqBody?.token),
        ],
        onError: async (error, input) => {
          throw new HooksError(
            'Reset password failed for:',
            'email-password',
            'reset-password',
            'onError',
            {
              error,
              input,
            },
          );
        },
      },
      validationSchema: {
        token: [(val) => (!val ? 'Token is required' : undefined)],
        newPassword: [
          (val) => (!val ? 'New password is required' : undefined),
          (val) =>
            val && val.length < 8
              ? 'New password must be at least 8 characters'
              : undefined,
        ],
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

export default EmailPasswordAuth;
