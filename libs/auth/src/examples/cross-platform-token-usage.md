# Cross-Platform Token Usage

This document provides examples of how to use authentication tokens across different platforms (mobile and web) with ForgebaseAuth.

## Overview

ForgebaseAuth supports cross-platform authentication, allowing tokens obtained from the auth server to be used across different platforms:

1. Mobile apps can use tokens to authenticate with web apps
2. Web apps can validate tokens from mobile apps
3. Both platforms can use the same backend API for token validation

## Mobile App Implementation

### Using React Native Auth SDK

```typescript
import { useAuth } from '@forgebase-ts/react-native-auth';
import axios from 'axios';

// In your component
const MobileComponent = () => {
  const { getAccessToken, getRefreshToken } = useAuth();
  
  // Function to call your web app's API with the token
  const callWebAppApi = async () => {
    try {
      // Get the current access token
      const accessToken = getAccessToken();
      
      // Make a request to your web app's API with the token
      const response = await axios.get('https://your-web-app.com/api/data', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };
  
  return (
    // Your component UI
  );
};
```

## Web App Implementation

### Validating Tokens from Mobile Apps

Your web app can validate tokens from mobile apps using the auth server's `/auth/verify-token` endpoint:

```typescript
// In your web app's API route handler
import axios from 'axios';

export async function validateMobileToken(token: string) {
  try {
    // Call the auth server to validate the token
    const response = await axios.post('https://your-auth-server.com/auth/verify-token', {
      token
    });
    
    // If the token is valid, the response will contain the user data
    return response.data;
  } catch (error) {
    console.error('Token validation failed:', error);
    throw new Error('Invalid token');
  }
}

// Example API route handler
export async function handler(req, res) {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }
    
    const token = authHeader.substring(7);
    
    // Validate the token
    const validation = await validateMobileToken(token);
    
    if (validation.valid) {
      // Token is valid, proceed with the request
      // You can use validation.user to access the user data
      return res.json({
        message: 'Authenticated successfully',
        user: validation.user
      });
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
```

## Using JWKS Verification (Alternative Approach)

For a more decentralized approach, you can use JWKS verification to validate tokens without contacting the auth server:

```typescript
import { TokenVerifier } from '@forgebase-ts/auth';

// Create a token verifier instance
const verifier = new TokenVerifier({
  jwksUrl: 'https://your-auth-server.com/.well-known/jwks.json',
  cacheTimeMs: 3600000 // Cache for 1 hour
});

// Validate a token
async function validateTokenWithJwks(token: string) {
  try {
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
```

## Best Practices

1. **Token Security**: Always transmit tokens over HTTPS and store them securely.
2. **Token Expiration**: Set appropriate expiration times for tokens.
3. **Refresh Tokens**: Implement refresh token rotation for enhanced security.
4. **Validation Strategy**: Choose between direct API validation or JWKS verification based on your needs.
5. **Error Handling**: Implement proper error handling for token validation failures.
