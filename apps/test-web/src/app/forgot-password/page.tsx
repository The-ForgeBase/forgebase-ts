'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { forgotPassword, isLoading, error } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }
    
    setStatus('submitting');
    
    try {
      // Get the current URL to use as base for the reset link
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/reset-password`;
      
      // Send password reset email
      await forgotPassword(email, redirectUrl);
      
      // Set success state
      setStatus('success');
      setMessage('Password reset instructions have been sent to your email.');
    } catch (err) {
      console.error('Password reset request error:', err);
      setStatus('error');
      setMessage(error?.message || 'Failed to send password reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>
        
        {status === 'success' ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="text-center">{message}</p>
            <div className="mt-6 text-center">
              <Link 
                href="/login" 
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {status === 'error' && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {message}
              </div>
            )}
            
            <p className="mb-4 text-gray-600">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading || status === 'submitting'}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              >
                {isLoading || status === 'submitting' ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <Link href="/login" className="text-blue-500 hover:underline">
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
