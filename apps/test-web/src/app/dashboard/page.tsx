import { protectRoute, getCurrentUser } from '../lib/auth';
import Link from 'next/link';
import LogoutButton from '../components/LogoutButton';

export default function DashboardPage() {
  // Protect this route - will redirect to /login if not authenticated
  protectRoute();

  // Get the current user
  const user = getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-blue-500 hover:underline">
              Profile
            </Link>
            <Link
              href="/database-test"
              className="text-blue-500 hover:underline"
            >
              Database Test
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <h2 className="text-lg font-semibold mb-2">
            Welcome, {user?.name || user?.email}!
          </h2>
          <p>You are now logged in to the protected dashboard.</p>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">
            Your Account Information
          </h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Email Verified:</strong>{' '}
              {user?.email_verified ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Account Created:</strong>{' '}
              {user?.created_at
                ? new Date(user.created_at).toLocaleString()
                : 'Unknown'}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href="/change-password"
              className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
            >
              Change Password
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
