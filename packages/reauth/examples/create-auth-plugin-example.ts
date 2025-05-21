import { ReAuth } from '../src/auth';
import { createAuthPlugin } from '../src/base-auth-plugin';
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

// Create a plugin using the createAuthPlugin helper
const myAuthPlugin = createAuthPlugin({
  name: 'my-auth',
  steps: [
    {
      name: 'login',
      description: 'Login with username and password',
      run: async (input: AuthInput) => {
        const { username, password } = input.reqBody || {};
        console.log(`Login attempt for ${username}`);
        return { success: true, message: 'Login successful' };
      }
    },
    {
      name: 'register',
      description: 'Register a new user',
      run: async (input: AuthInput) => {
        const { username, password, email } = input.reqBody || {};
        console.log(`Registration attempt for ${username} (${email})`);
        return { success: true, message: 'Registration successful' };
      }
    }
  ],
  defaultConfig: {
    useCookie: true,
    cookieName: 'my-auth-cookie',
    cookieOptions: {
      maxAge: 3600,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    },
    returnToken: true,
  },
  requiredInput: {
    reqBody: true,
    reqQuery: false,
    reqParams: false,
    reqHeaders: false,
    reqMethod: false,
  },
  // Custom initialization logic
  initialize: async (container) => {
    console.log('Initializing my-auth plugin');
    if (container) {
      console.log('Container provided to my-auth plugin');
    }
  }
});

// Create the ReAuth instance
const reAuth = new ReAuth();

// Register services in the container
reAuth.registerService('emailService', new EmailService());
reAuth.registerService('userService', new UserService());
reAuth.registerService('tokenService', new TokenService());

// Register the plugin
reAuth.registerPlugin(myAuthPlugin);

// Example usage
async function runExample() {
  try {
    // Login example
    const loginResult = await reAuth.getPlugin('my-auth').runStep('login', {
      reqBody: {
        username: 'user123',
        password: 'password123'
      }
    });
    console.log('Login result:', loginResult);
    
    // Register example
    const registerResult = await reAuth.getPlugin('my-auth').runStep('register', {
      reqBody: {
        username: 'newuser',
        password: 'newpassword123',
        email: 'newuser@example.com'
      }
    });
    console.log('Register result:', registerResult);
    
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
runExample().then(() => console.log('Example completed'));
