'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { auth, isLoading, error } = useAuth();

  // Define the verifyResetToken and resetPassword functions
  const verifyResetToken = async (userId: string, token: string) => {
    return await auth.verifyResetToken(userId, token);
  };

  const resetPassword = async (
    userId: string,
    token: string,
    newPassword: string
  ) => {
    return await auth.resetPassword(userId, token, newPassword);
  };

  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [status, setStatus] = useState<
    'verifying' | 'ready' | 'submitting' | 'success' | 'error'
  >('verifying');
  const [message, setMessage] = useState('Verifying your reset token...');

  // Verify the token when the component mounts
  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Get parameters from URL
        const tokenParam = searchParams.get('token');
        const userIdParam = searchParams.get('userId');

        // Validate parameters
        if (!tokenParam || !userIdParam) {
          setStatus('error');
          setMessage('Invalid reset link. Missing required parameters.');
          return;
        }

        setToken(tokenParam);
        setUserId(userIdParam);

        // Verify the token
        const result = await verifyResetToken(userIdParam, tokenParam);

        if (result.valid) {
          setTokenValid(true);
          setStatus('ready');
          setMessage('Please enter your new password.');
        } else {
          setTokenValid(false);
          setStatus('error');
          setMessage(
            'Invalid or expired reset token. Please request a new password reset link.'
          );
        }
      } catch (err) {
        console.error('Token verification error:', err);
        setTokenValid(false);
        setStatus('error');
        setMessage(
          error?.message ||
            'Failed to verify reset token. Please request a new password reset link.'
        );
      }
    };

    verifyToken();
  }, [searchParams, verifyResetToken, error]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!token || !userId) {
      setStatus('error');
      setMessage('Missing required parameters.');
      return;
    }

    setStatus('submitting');

    try {
      // Reset the password
      await resetPassword(userId, token, password);

      // Set success state
      setStatus('success');
      setMessage('Your password has been successfully reset!');
    } catch (err) {
      console.error('Password reset error:', err);
      setStatus('error');
      setMessage(
        error?.message ||
          'Failed to reset your password. Please try again or contact support.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>

        {status === 'verifying' && (
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 text-center">{message}</p>
          </div>
        )}

        {status === 'ready' && (
          <>
            {message && (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  minLength={8}
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="confirmPassword"
                  className="block text-gray-700 mb-2"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {status === 'submitting' && (
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 text-center">
              Resetting your password...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center justify-center mb-4">
              <svg
                className="w-12 h-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <p className="text-center">{message}</p>
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center justify-center mb-4">
              <svg
                className="w-12 h-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </div>
            <p className="text-center">{message}</p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/login"
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
