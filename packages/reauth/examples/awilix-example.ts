import { ReAuth } from '../src/auth';
import EmailPasswordAuth from '../src/email-password.plugin';
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

// Create the ReAuth instance
const reAuth = new ReAuth();

// Register services in the container
reAuth.registerService('emailService', new EmailService());
reAuth.registerService('userService', new UserService());
reAuth.registerService('tokenService', new TokenService());

// Register the email-password plugin
const emailPasswordAuth = new EmailPasswordAuth();
reAuth.registerPlugin(emailPasswordAuth);

// Example usage
async function runExample() {
  try {
    // Forgot password example
    const forgotPasswordResult = await reAuth.getPlugin('email-password').runStep('forgot-password', {
      reqBody: {
        email: 'user@example.com'
      }
    });
    console.log('Forgot password result:', forgotPasswordResult);
    
    // Reset password example
    const resetPasswordResult = await reAuth.getPlugin('email-password').runStep('reset-password', {
      reqBody: {
        userId: '123',
        token: 'some-token',
        newPassword: 'newSecurePassword123'
      }
    });
    console.log('Reset password result:', resetPasswordResult);
    
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
runExample().then(() => console.log('Example completed'));
