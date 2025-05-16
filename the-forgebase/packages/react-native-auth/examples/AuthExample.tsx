import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { ForgebaseAuth, SecureStoreAdapter, useAuth, AuthProvider } from '@forgebase/react-native-auth';
import * as SecureStore from 'expo-secure-store';

// Create a secure storage adapter
const secureStorage = new SecureStoreAdapter(SecureStore);

// Initialize the auth SDK
const auth = new ForgebaseAuth({
  apiUrl: 'https://your-api-url.com',
  storage: secureStorage
});

// Login Screen Component
const LoginScreen = ({ onNavigate }) => {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login({ email, password });
      Alert.alert('Success', 'Logged in successfully!');
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button
        title={isLoading ? 'Loading...' : 'Login'}
        onPress={handleLogin}
        disabled={isLoading}
      />
      
      {error && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}
      
      <View style={styles.links}>
        <Button
          title="Register"
          onPress={() => onNavigate('register')}
        />
        <Button
          title="Forgot Password"
          onPress={() => onNavigate('forgotPassword')}
        />
      </View>
    </View>
  );
};

// Register Screen Component
const RegisterScreen = ({ onNavigate }) => {
  const { register, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleRegister = async () => {
    try {
      await register({ email, password, name });
      Alert.alert('Success', 'Registered successfully!');
      onNavigate('verifyEmail');
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button
        title={isLoading ? 'Loading...' : 'Register'}
        onPress={handleRegister}
        disabled={isLoading}
      />
      
      {error && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}
      
      <Button
        title="Back to Login"
        onPress={() => onNavigate('login')}
      />
    </View>
  );
};

// Verify Email Screen Component
const VerifyEmailScreen = ({ onNavigate }) => {
  const { sendVerificationEmail, verifyEmail, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');

  const handleSendVerification = async () => {
    try {
      const result = await sendVerificationEmail(email, 'myapp://verify');
      Alert.alert('Success', 'Verification email sent!');
      if (result.token) {
        Alert.alert('Debug', `Verification token: ${result.token}`);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleVerify = async () => {
    try {
      await verifyEmail(userId, code);
      Alert.alert('Success', 'Email verified successfully!');
      onNavigate('login');
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Email</Text>
      
      <Text style={styles.subtitle}>Send Verification Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <Button
        title="Send Verification Email"
        onPress={handleSendVerification}
      />
      
      <Text style={styles.subtitle}>Verify Code</Text>
      <TextInput
        style={styles.input}
        placeholder="User ID"
        value={userId}
        onChangeText={setUserId}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Verification Code"
        value={code}
        onChangeText={setCode}
      />
      
      <Button
        title={isLoading ? 'Verifying...' : 'Verify Email'}
        onPress={handleVerify}
        disabled={isLoading}
      />
      
      {error && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}
      
      <Button
        title="Back to Login"
        onPress={() => onNavigate('login')}
      />
    </View>
  );
};

// Forgot Password Screen Component
const ForgotPasswordScreen = ({ onNavigate }) => {
  const { forgotPassword, error } = useAuth();
  const [email, setEmail] = useState('');

  const handleForgotPassword = async () => {
    try {
      await forgotPassword(email, 'myapp://reset-password');
      Alert.alert('Success', 'Password reset email sent!');
      onNavigate('resetPassword');
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <Button
        title="Send Reset Email"
        onPress={handleForgotPassword}
      />
      
      {error && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}
      
      <Button
        title="Back to Login"
        onPress={() => onNavigate('login')}
      />
    </View>
  );
};

// Reset Password Screen Component
const ResetPasswordScreen = ({ onNavigate }) => {
  const { auth, resetPassword, error } = useAuth();
  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyToken = async () => {
    setIsVerifying(true);
    try {
      const result = await auth.verifyResetToken(userId, token);
      if (result.valid) {
        Alert.alert('Success', 'Token is valid. You can reset your password now.');
      } else {
        Alert.alert('Error', 'Invalid or expired token.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(userId, token, newPassword);
      Alert.alert('Success', 'Password reset successfully!');
      onNavigate('login');
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      
      <TextInput
        style={styles.input}
        placeholder="User ID"
        value={userId}
        onChangeText={setUserId}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Reset Token"
        value={token}
        onChangeText={setToken}
      />
      
      <Button
        title={isVerifying ? 'Verifying...' : 'Verify Token'}
        onPress={handleVerifyToken}
        disabled={isVerifying}
      />
      
      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      
      <Button
        title="Reset Password"
        onPress={handleResetPassword}
      />
      
      {error && (
        <Text style={styles.errorText}>{error.message}</Text>
      )}
      
      <Button
        title="Back to Login"
        onPress={() => onNavigate('login')}
      />
    </View>
  );
};

// Home Screen Component (after login)
const HomeScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Success', 'Logged out successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to logout.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>Name: {user.name || 'N/A'}</Text>
          <Text style={styles.userInfoText}>Email: {user.email}</Text>
          <Text style={styles.userInfoText}>
            Email Verified: {user.email_verified ? 'Yes' : 'No'}
          </Text>
        </View>
      )}
      
      <Button
        title="Logout"
        onPress={handleLogout}
      />
    </View>
  );
};

// Main App Component
const AuthExample = () => {
  const [screen, setScreen] = useState('login');

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen onNavigate={setScreen} />;
      case 'register':
        return <RegisterScreen onNavigate={setScreen} />;
      case 'verifyEmail':
        return <VerifyEmailScreen onNavigate={setScreen} />;
      case 'forgotPassword':
        return <ForgotPasswordScreen onNavigate={setScreen} />;
      case 'resetPassword':
        return <ResetPasswordScreen onNavigate={setScreen} />;
      case 'home':
        return <HomeScreen />;
      default:
        return <LoginScreen onNavigate={setScreen} />;
    }
  };

  return (
    <AuthProvider auth={auth}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {renderScreen()}
      </ScrollView>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    marginBottom: 10,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  userInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  userInfoText: {
    fontSize: 16,
    marginBottom: 5,
  },
});

export default AuthExample;
