# ForgeBase React Native Auth SDK

A React Native/Expo authentication SDK for ForgeBase that provides a simple and secure way to implement authentication in your mobile applications.

## Features

- 🔒 Secure authentication with JWT tokens
- 📱 Designed specifically for React Native and Expo
- 🔑 Integration with SecureStore for token storage
- 📧 Email verification
- 🔄 Password reset flow
- 🔁 Automatic token refresh
- 🪝 React hooks for easy integration
- ⚡ TypeScript support

## Installation

```bash
npm install @forgebase/react-native-auth expo-secure-store
# or
yarn add @forgebase/react-native-auth expo-secure-store
```

## Basic Usage

### Setup

```typescript
import { ForgebaseAuth, SecureStoreAdapter } from '@forgebase/react-native-auth';
import * as SecureStore from 'expo-secure-store';

// Create a secure storage adapter
const secureStorage = new SecureStoreAdapter(SecureStore);

// Initialize the auth SDK
const auth = new ForgebaseAuth({
  apiUrl: 'https://your-api.com',
  storage: secureStorage,
});
```

### Using the React Context Provider

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '@forgebase/react-native-auth';

const App = () => {
  return (
    <AuthProvider auth={auth}>
      <NavigationContainer>{/* Your app components */}</NavigationContainer>
    </AuthProvider>
  );
};

export default App;
```

### Using the Auth Hook

```tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { useAuth } from '@forgebase/react-native-auth';

const LoginScreen = () => {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login({ email, password });
      // Navigate to home screen on success
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  return (
    <View>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={isLoading ? 'Loading...' : 'Login'} onPress={handleLogin} disabled={isLoading} />
      {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
    </View>
  );
};
```

## Authentication Flows

### Registration

```typescript
// Using the hook
const { register } = useAuth();

try {
  await register({
    email: 'user@example.com',
    password: 'securePassword123',
    name: 'John Doe',
  });
  // Registration successful
} catch (error) {
  // Handle error
}

// Using the SDK directly
try {
  const response = await auth.register({
    email: 'user@example.com',
    password: 'securePassword123',
    name: 'John Doe',
  });
  console.log('Registered user:', response.user);
} catch (error) {
  console.error('Registration failed:', error);
}
```

### Login

```typescript
// Using the hook
const { login } = useAuth();

try {
  await login({
    email: 'user@example.com',
    password: 'securePassword123',
  });
  // Login successful
} catch (error) {
  // Handle error
}

// Using the SDK directly
try {
  const response = await auth.login({
    email: 'user@example.com',
    password: 'securePassword123',
  });
  console.log('Logged in user:', response.user);
} catch (error) {
  console.error('Login failed:', error);
}
```

### Email Verification

```typescript
// Send verification email
const { sendVerificationEmail } = useAuth();

try {
  const result = await sendVerificationEmail(
    'user@example.com',
    'myapp://verify' // Deep link URL for mobile app
  );
  console.log('Verification email sent:', result);
} catch (error) {
  console.error('Failed to send verification email:', error);
}

// Verify email with code
const { verifyEmail } = useAuth();

try {
  await verifyEmail(userId, verificationCode);
  // Email verified successfully
} catch (error) {
  console.error('Email verification failed:', error);
}
```

### Password Reset

```typescript
// Request password reset
const { forgotPassword } = useAuth();

try {
  await forgotPassword(
    'user@example.com',
    'myapp://reset-password' // Deep link URL for mobile app
  );
  // Password reset email sent
} catch (error) {
  console.error('Failed to request password reset:', error);
}

// Verify reset token
const { auth } = useAuth();

try {
  const result = await auth.verifyResetToken(userId, resetToken);
  if (result.valid) {
    // Token is valid, show password reset form
  }
} catch (error) {
  console.error('Invalid reset token:', error);
}

// Reset password
const { resetPassword } = useAuth();

try {
  await resetPassword(userId, resetToken, 'newSecurePassword123');
  // Password reset successful
} catch (error) {
  console.error('Password reset failed:', error);
}
```

### Logout

```typescript
const { logout } = useAuth();

try {
  await logout();
  // Logout successful
} catch (error) {
  console.error('Logout failed:', error);
}
```

### Token Management

The SDK automatically handles token refresh when API calls fail due to expired tokens. Since the refresh endpoint only returns `{ success: true, token }` without user data, the SDK automatically calls the `/auth/me` endpoint after a successful token refresh to get the latest user information. You can also manually refresh tokens and access them when needed:

```typescript
// Using the hook
const { refreshToken, getAccessToken, getRefreshToken } = useAuth();

// Manually refresh the token
try {
  const success = await refreshToken();
  if (success) {
    console.log('Token refreshed successfully');
  } else {
    console.log('Token refresh failed');
  }
} catch (error) {
  console.error('Error refreshing token:', error);
}

// Get the current access token
const accessToken = getAccessToken();
console.log('Current access token:', accessToken);

// Get the current refresh token
const refreshToken = await getRefreshToken();
console.log('Current refresh token:', refreshToken);

// Using the SDK directly
const accessToken = auth.getAccessToken();
const refreshToken = await auth.getRefreshToken();
const refreshResult = await auth.refreshAccessToken();
```

### Using the Axios Instance

The SDK exposes the configured axios instance with all authentication interceptors already set up. This allows you to make authenticated API calls directly without having to manually handle tokens:

```typescript
// Using the SDK directly
const { api } = auth;

// Make authenticated API calls
try {
  // The request will automatically include the Authorization header with the access token
  // and X-Refresh-Token header with the refresh token
  const response = await api.get('/api/protected-resource');
  console.log('Protected resource:', response.data);

  // POST request with data
  const createResponse = await api.post('/api/items', { name: 'New Item' });
  console.log('Created item:', createResponse.data);

  // If the token expires, it will automatically refresh and retry the request
} catch (error) {
  console.error('API call failed:', error);
}

// Using the hook
const { getApi } = useAuth();
const api = getApi();

// Now you can use the api instance in your components
const fetchData = async () => {
  const response = await api.get('/api/data');
  setData(response.data);
};
```

### Fetching User Details

The SDK provides a method to fetch the latest user details from the server:

```typescript
// Using the hook
const { fetchUser } = useAuth();

try {
  const user = await fetchUser();
  console.log('User details:', user);
} catch (error) {
  console.error('Failed to fetch user details:', error);
}

// Using the SDK directly
try {
  const user = await auth.fetchUserDetails();
  console.log('User details:', user);
} catch (error) {
  console.error('Failed to fetch user details:', error);
}
```

## Deep Linking

For email verification and password reset flows, you'll need to set up deep linking in your React Native app:

### Expo Example

```javascript
// app.json
{
  "expo": {
    "scheme": "myapp",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "myapp"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    }
  }
}
```

### Handling Deep Links

```typescript
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '@forgebase/react-native-auth';

const DeepLinkHandler = () => {
  const { verifyEmail, auth } = useAuth();

  useEffect(() => {
    // Function to handle deep links
    const handleDeepLink = async (event) => {
      const url = event.url;

      // Parse the URL
      const { path, queryParams } = parseUrl(url);

      // Handle verification links
      if (path === 'verify') {
        const { userId, token } = queryParams;
        if (userId && token) {
          try {
            await verifyEmail(userId, token);
            // Show success message
          } catch (error) {
            // Show error message
          }
        }
      }

      // Handle password reset links
      if (path === 'reset-password') {
        const { userId, token } = queryParams;
        if (userId && token) {
          try {
            const isValid = await auth.verifyResetToken(userId, token);
            if (isValid) {
              // Navigate to password reset screen with userId and token
              navigation.navigate('ResetPassword', { userId, token });
            }
          } catch (error) {
            // Show error message
          }
        }
      }
    };

    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [verifyEmail, auth]);

  return null;
};

// Helper function to parse URL
const parseUrl = (url) => {
  const [base, query] = url.split('?');
  const path = base.split('://')[1];

  const queryParams = {};
  if (query) {
    query.split('&').forEach((param) => {
      const [key, value] = param.split('=');
      queryParams[key] = value;
    });
  }

  return { path, queryParams };
};
```

## Error Handling

The SDK provides a custom `AuthError` class with different error types:

```typescript
import { AuthErrorType } from '@forgebase/react-native-auth';

try {
  await auth.login({ email, password });
} catch (error) {
  switch (error.type) {
    case AuthErrorType.INVALID_CREDENTIALS:
      // Handle invalid credentials
      break;
    case AuthErrorType.USER_NOT_FOUND:
      // Handle user not found
      break;
    case AuthErrorType.VERIFICATION_REQUIRED:
      // Handle verification required
      break;
    case AuthErrorType.NETWORK_ERROR:
      // Handle network error
      break;
    default:
      // Handle other errors
      break;
  }
}
```

## License

MIT
