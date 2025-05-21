import { ReAuth } from '../src/auth';
import { BaseAuthPlugin } from '../src/base-auth-plugin';
import { AuthInput, AuthStep } from '../src/types';
import { asClass, asValue } from 'awilix';

// Example service classes
class EmailService {
  async sendPasswordResetEmail(email: string, token: string) {
    console.log(`Sending password reset email to ${email} with token ${token}`);
    // In a real implementation, this would send an actual email
    return true;
  }
}

class UserService {
  async updatePassword(userId: string, newPassword: string) {
    console.log(`Updating password for user ${userId}`);
    // In a real implementation, this would hash the password and update the database
    return true;
  }
  
  async findUserByEmail(email: string) {
    console.log(`Finding user by email: ${email}`);
    // Mock implementation
    return { id: '123', email };
  }
}

class TokenService {
  async generateResetToken(email: string) {
    console.log(`Generating reset token for ${email}`);
    // In a real implementation, this would generate a secure token and store it
    return `reset-token-${Date.now()}`;
  }
  
  async verifyResetToken(token: string, userId: string) {
    console.log(`Verifying reset token ${token} for user ${userId}`);
    // Mock implementation
    return true;
  }
  
  async invalidateToken(token: string) {
    console.log(`Invalidating token ${token}`);
    // Mock implementation
    return true;
  }
}

// Example 1: Extending the BaseAuthPlugin
class CustomAuthPlugin extends BaseAuthPlugin {
  constructor() {
    super();
    this.name = 'custom-auth';
    this.defaultConfig = {
      useCookie: true,
      cookieName: 'custom-auth-cookie',
      cookieOptions: {
        maxAge: 7200,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      },
      returnToken: true,
    };
    this.requiredInput = {
      reqBody: true,
      reqQuery: false,
      reqParams: false,
      reqHeaders: false,
      reqMethod: false,
    };
    
    // Define steps
    this.steps = [
      {
        name: 'custom-login',
        description: 'Custom login step',
        run: async (input: AuthInput) => {
          console.log('Running custom login with:', input.reqBody);
          return { success: true, message: 'Custom login successful' };
        },
      },
    ];
  }
  
  // Override initialize to add custom logic
  async initialize(container?: any) {
    await super.initialize(container);
    console.log('Custom initialization for custom-auth plugin');
  }
}

// Example 2: Using the createAuthPlugin helper
const simpleAuthPlugin = new BaseAuthPlugin();
simpleAuthPlugin.name = 'simple-auth';
simpleAuthPlugin.steps = [
  {
    name: 'simple-login',
    description: 'Simple login step',
    run: async (input: AuthInput) => {
      console.log('Running simple login with:', input.reqBody);
      return { success: true, message: 'Simple login successful' };
    },
  },
];

// Create the ReAuth instance
const reAuth = new ReAuth();

// Register services in the container
reAuth.registerService('emailService', new EmailService());
reAuth.registerService('userService', new UserService());
reAuth.registerService('tokenService', new TokenService());

// Register the plugins
const customAuthPlugin = new CustomAuthPlugin();
reAuth.registerPlugin(customAuthPlugin);
reAuth.registerPlugin(simpleAuthPlugin);

// Example usage
async function runExample() {
  try {
    // Custom login example
    const customLoginResult = await reAuth.getPlugin('custom-auth').runStep('custom-login', {
      reqBody: {
        username: 'user123',
        password: 'password123'
      }
    });
    console.log('Custom login result:', customLoginResult);
    
    // Simple login example
    const simpleLoginResult = await reAuth.getPlugin('simple-auth').runStep('simple-login', {
      reqBody: {
        username: 'user456',
        password: 'password456'
      }
    });
    console.log('Simple login result:', simpleLoginResult);
    
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
runExample().then(() => console.log('Example completed'));
