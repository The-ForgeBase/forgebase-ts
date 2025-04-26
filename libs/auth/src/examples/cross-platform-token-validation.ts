import { TokenVerifier } from '../utils/token-verifier';

/**
 * Example showing how to implement cross-platform token validation
 * This allows mobile apps and web apps to share authentication tokens
 */

/**
 * Mobile App Implementation
 * 
 * In your React Native app, you can use the TokenVerifier to validate tokens
 * received from the web app or to validate tokens before sending to the web app.
 */
export async function mobileAppTokenValidation() {
  // Create a TokenVerifier instance
  const verifier = new TokenVerifier({
    jwksUrl: 'https://your-auth-server.com/.well-known/jwks.json',
    cacheTimeMs: 3600000 // Cache for 1 hour
  });

  /**
   * Validate a token received from another platform
   * @param token JWT token to validate
   * @returns Validation result with user information
   */
  async function validateToken(token: string) {
    try {
      // Verify the token using JWKS
      const { payload } = await verifier.verifyToken(token);
      
      return {
        valid: true,
        userId: payload.sub,
        email: payload.email,
        // Other claims from the token
      };
    } catch (error) {
      console.error('Token validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Example: Share token with web app via deep link
   * @param token JWT token to share
   */
  function shareTokenWithWebApp(token: string) {
    // First validate the token to ensure it's valid
    validateToken(token).then(result => {
      if (result.valid) {
        // Create a deep link with the token
        const webAppUrl = `https://your-web-app.com/auth/mobile-login?token=${token}`;
        
        // Open the URL in the device browser
        // Linking.openURL(webAppUrl);
        console.log('Opening deep link:', webAppUrl);
      } else {
        console.error('Cannot share invalid token');
      }
    });
  }

  return {
    validateToken,
    shareTokenWithWebApp
  };
}

/**
 * Web App Implementation
 * 
 * In your web app, you can use the TokenVerifier to validate tokens
 * received from the mobile app.
 */
export async function webAppTokenValidation() {
  // Create a TokenVerifier instance
  const verifier = new TokenVerifier({
    jwksUrl: 'https://your-auth-server.com/.well-known/jwks.json',
    cacheTimeMs: 3600000 // Cache for 1 hour
  });

  /**
   * Validate a token received from the mobile app
   * @param token JWT token to validate
   * @returns Validation result with user information
   */
  async function validateMobileToken(token: string) {
    try {
      // Verify the token using JWKS
      const { payload } = await verifier.verifyToken(token);
      
      return {
        valid: true,
        userId: payload.sub,
        email: payload.email,
        // Other claims from the token
      };
    } catch (error) {
      console.error('Mobile token validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Example: Handle mobile login with token
   * @param token JWT token from mobile app
   */
  async function handleMobileLogin(token: string) {
    const validation = await validateMobileToken(token);
    
    if (validation.valid) {
      // Token is valid, log the user in
      console.log('User authenticated from mobile app:', validation.userId);
      
      // Store the token in local storage or cookies
      // localStorage.setItem('auth_token', token);
      
      // Redirect to dashboard or home page
      // window.location.href = '/dashboard';
      
      return { success: true, userId: validation.userId };
    } else {
      console.error('Invalid mobile token');
      return { success: false, error: validation.error };
    }
  }

  return {
    validateMobileToken,
    handleMobileLogin
  };
}

/**
 * Shared API Implementation
 * 
 * If you prefer to use a shared API for token validation instead of JWKS,
 * you can implement this approach.
 */
export function sharedApiTokenValidation() {
  /**
   * Validate a token using the shared API
   * @param token JWT token to validate
   * @returns Validation result with user information
   */
  async function validateTokenWithApi(token: string) {
    try {
      // Call the shared API endpoint
      const response = await fetch('https://your-auth-server.com/auth/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      
      if (!response.ok) {
        throw new Error('Token validation failed');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API token validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  return {
    validateTokenWithApi
  };
}
