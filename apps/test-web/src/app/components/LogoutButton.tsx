'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function LogoutButton() {
  const { logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:bg-red-300"
    >
      {isLoading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
