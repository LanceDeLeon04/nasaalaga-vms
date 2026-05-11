import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { BAHWDashboard } from './BAHWDashboard';
import { PetOwnerDashboard } from './PetOwnerDashboard';
import { GuestDashboard } from './GuestDashboard';
import type { User } from '../App';

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in (stored in sessionStorage)
    const storedUser = sessionStorage.getItem('nasaalaga_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // No user logged in, redirect to login
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('nasaalaga_user');
    setUser(null);
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user.role === 'admin' || user.role === 'superadmin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : user.role === 'bahw' ? (
        <BAHWDashboard user={user} onLogout={handleLogout} />
      ) : user.role === 'petOwner' || user.role === 'livestockManager' || user.role === 'owner' ? (
        <PetOwnerDashboard user={user} onLogout={handleLogout} />
      ) : user.role === 'guest' ? (
        <GuestDashboard user={user} onLogout={handleLogout} />
      ) : null}
    </div>
  );
}
