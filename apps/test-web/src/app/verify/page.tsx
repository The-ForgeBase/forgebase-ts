'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmail, error } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Get parameters from URL
        const token = searchParams.get('token');
        const userId = searchParams.get('userId');
        // We can use source parameter for analytics or different UI flows if needed
        // const source = searchParams.get('source');

        // Validate parameters
        if (!token || !userId) {
          setStatus('error');
          setMessage('Invalid verification link. Missing required parameters.');
          return;
        }

        // Verify the email
        await verifyEmail(userId, token);

        // Set success state
        setStatus('success');
        setMessage('Your email has been successfully verified!');
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage(
          error?.message ||
            'Failed to verify your email. Please try again or contact support.'
        );
      }
    };

    verifyToken();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">Email Verification</h1>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">{message}</p>
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
            <p>{message}</p>
            <div className="mt-6">
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
            <p>{message}</p>
            <div className="mt-6 flex flex-col space-y-2">
              <Link
                href="/login"
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Go to Login
              </Link>
              <button
                onClick={() => router.refresh()}
                className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
