import { ForgebaseAuth } from '../ForgebaseAuth';
import { MemoryStorageAdapter, STORAGE_KEYS } from '../storage';
import axios from 'axios';
import { AuthErrorType } from '../types';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    post: jest.fn(),
    get: jest.fn()
  })),
}));

describe('ForgebaseAuth', () => {
  let auth: ForgebaseAuth;
  let storage: MemoryStorageAdapter;
  let mockAxios: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a memory storage adapter for testing
    storage = new MemoryStorageAdapter();
    
    // Create the auth instance
    auth = new ForgebaseAuth({
      apiUrl: 'https://test-api.com',
      storage
    });
    
    // Get the mocked axios instance
    mockAxios = axios.create();
  });
  
  describe('register', () => {
    it('should register a user successfully', async () => {
      // Mock successful registration response
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const mockResponse = {
        data: {
          user: mockUser,
          token: 'test-token'
        }
      };
      
      mockAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Call register
      const result = await auth.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
      
      // Check the result
      expect(result).toEqual(mockResponse.data);
      
      // Check that axios was called correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/register', {
        provider: 'password',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
      
      // Check that the token was stored
      const storedToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      expect(storedToken).toBe('test-token');
      
      // Check that the user was stored
      const storedUser = await storage.getItem(STORAGE_KEYS.USER);
      expect(storedUser).toBe(JSON.stringify(mockUser));
      
      // Check that getCurrentUser returns the user
      expect(auth.getCurrentUser()).toEqual(mockUser);
      
      // Check that isAuthenticated returns true
      expect(auth.isAuthenticated()).toBe(true);
    });
    
    it('should handle registration errors', async () => {
      // Mock error response
      const errorResponse = {
        response: {
          status: 409,
          data: {
            error: 'Email already exists'
          }
        }
      };
      
      mockAxios.post.mockRejectedValueOnce(errorResponse);
      
      // Call register and expect it to throw
      await expect(auth.register({
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow();
      
      // Check that isAuthenticated returns false
      expect(auth.isAuthenticated()).toBe(false);
    });
  });
  
  describe('login', () => {
    it('should login a user successfully', async () => {
      // Mock successful login response
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const mockResponse = {
        data: {
          user: mockUser,
          token: 'test-token'
        }
      };
      
      mockAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Call login
      const result = await auth.login({
        email: 'test@example.com',
        password: 'password123'
      });
      
      // Check the result
      expect(result).toEqual(mockResponse.data);
      
      // Check that axios was called correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', {
        provider: 'password',
        email: 'test@example.com',
        password: 'password123'
      });
      
      // Check that the token was stored
      const storedToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      expect(storedToken).toBe('test-token');
      
      // Check that the user was stored
      const storedUser = await storage.getItem(STORAGE_KEYS.USER);
      expect(storedUser).toBe(JSON.stringify(mockUser));
    });
    
    it('should handle login errors', async () => {
      // Mock error response
      const errorResponse = {
        response: {
          status: 401,
          data: {
            error: 'Invalid credentials'
          }
        }
      };
      
      mockAxios.post.mockRejectedValueOnce(errorResponse);
      
      // Call login and expect it to throw
      try {
        await auth.login({
          email: 'test@example.com',
          password: 'wrong-password'
        });
        fail('Login should have thrown an error');
      } catch (error) {
        expect(error.type).toBe(AuthErrorType.INVALID_CREDENTIALS);
        expect(error.message).toBe('Invalid credentials');
      }
    });
  });
  
  describe('logout', () => {
    it('should logout a user successfully', async () => {
      // Setup: store a user and token
      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'test-token');
      await storage.setItem(STORAGE_KEYS.USER, JSON.stringify({
        id: 'user-123',
        email: 'test@example.com'
      }));
      
      // Mock successful logout response
      mockAxios.post.mockResolvedValueOnce({});
      
      // Call logout
      await auth.logout();
      
      // Check that axios was called correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/logout');
      
      // Check that the token was removed
      const storedToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      expect(storedToken).toBeNull();
      
      // Check that the user was removed
      const storedUser = await storage.getItem(STORAGE_KEYS.USER);
      expect(storedUser).toBeNull();
      
      // Check that getCurrentUser returns null
      expect(auth.getCurrentUser()).toBeNull();
      
      // Check that isAuthenticated returns false
      expect(auth.isAuthenticated()).toBe(false);
    });
    
    it('should clear tokens even if logout request fails', async () => {
      // Setup: store a user and token
      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'test-token');
      await storage.setItem(STORAGE_KEYS.USER, JSON.stringify({
        id: 'user-123',
        email: 'test@example.com'
      }));
      
      // Mock error response
      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Call logout
      await auth.logout();
      
      // Check that console.error was called
      expect(consoleSpy).toHaveBeenCalled();
      
      // Check that the token was still removed
      const storedToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      expect(storedToken).toBeNull();
      
      // Check that the user was still removed
      const storedUser = await storage.getItem(STORAGE_KEYS.USER);
      expect(storedUser).toBeNull();
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
  
  describe('sendVerificationEmail', () => {
    it('should send a verification email successfully', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          success: true,
          token: 'verification-token-123'
        }
      };
      
      mockAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Call sendVerificationEmail
      const result = await auth.sendVerificationEmail('test@example.com');
      
      // Check the result
      expect(result).toEqual(mockResponse.data);
      
      // Check that axios was called correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/send-verification-email', {
        email: 'test@example.com'
      });
    });
    
    it('should include redirectUrl if provided', async () => {
      // Mock successful response
      mockAxios.post.mockResolvedValueOnce({
        data: { success: true }
      });
      
      // Call sendVerificationEmail with redirectUrl
      await auth.sendVerificationEmail('test@example.com', 'myapp://verify');
      
      // Check that axios was called with redirectUrl
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/send-verification-email', {
        email: 'test@example.com',
        redirectUrl: 'myapp://verify'
      });
    });
  });
  
  describe('verifyEmail', () => {
    it('should verify an email successfully', async () => {
      // Mock successful response
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const mockResponse = {
        data: {
          success: true,
          user: mockUser
        }
      };
      
      mockAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Call verifyEmail
      const result = await auth.verifyEmail('user-123', 'verification-code');
      
      // Check the result
      expect(result).toEqual(mockResponse.data);
      
      // Check that axios was called correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/verify-email', {
        userId: 'user-123',
        code: 'verification-code'
      });
      
      // Check that the user was updated
      expect(auth.getCurrentUser()).toEqual(mockUser);
    });
  });
  
  describe('forgotPassword', () => {
    it('should request a password reset successfully', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          success: true,
          message: 'Password reset email sent'
        }
      };
      
      mockAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Call forgotPassword
      const result = await auth.forgotPassword('test@example.com');
      
      // Check the result
      expect(result).toEqual(mockResponse.data);
      
      // Check that axios was called correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com'
      });
    });
    
    it('should include redirectUrl if provided', async () => {
      // Mock successful response
      mockAxios.post.mockResolvedValueOnce({
        data: { success: true }
      });
      
      // Call forgotPassword with redirectUrl
      await auth.forgotPassword('test@example.com', 'myapp://reset');
      
      // Check that axios was called with redirectUrl
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
        redirectUrl: 'myapp://reset'
      });
    });
  });
  
  describe('verifyResetToken', () => {
    it('should verify a reset token successfully', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          valid: true
        }
      };
      
      mockAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Call verifyResetToken
      const result = await auth.verifyResetToken('user-123', 'reset-token');
      
      // Check the result
      expect(result).toEqual(mockResponse.data);
      
      // Check that axios was called correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/verify-reset-token', {
        userId: 'user-123',
        token: 'reset-token'
      });
    });
  });
  
  describe('resetPassword', () => {
    it('should reset a password successfully', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          success: true
        }
      };
      
      mockAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Call resetPassword
      const result = await auth.resetPassword('user-123', 'reset-token', 'new-password');
      
      // Check the result
      expect(result).toEqual(mockResponse.data);
      
      // Check that axios was called correctly
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/reset-password', {
        userId: 'user-123',
        token: 'reset-token',
        newPassword: 'new-password'
      });
    });
  });
});
