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
      const response = await fetch(
        'https://your-auth-server.com/auth/validate-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API token validation failed:', error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  return {
    validateTokenWithApi,
  };
}
