import { auth } from '../lib/auth';
import Link from 'next/link';
import LogoutButton from '../components/LogoutButton';
import { fetchUserFromServer, protectRoute } from '../lib/server';

export default async function ProfilePage() {
  // Protect this route - will redirect to /login if not authenticated
  protectRoute();

  // Get the current user
  const user = await fetchUserFromServer(auth.apiUrl);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Profile</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-500 hover:underline">
              Dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold">
              {user?.name
                ? user.name.charAt(0).toUpperCase()
                : user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name || 'User'}</h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-2">Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Email</p>
                <p>{user?.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Email Verified</p>
                <p>{user?.email_verified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-gray-600">Account Created</p>
                <p>
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Last Updated</p>
                <p>
                  {user?.updated_at
                    ? new Date(user.updated_at).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
