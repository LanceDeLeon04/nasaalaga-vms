import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { BAHWDashboard } from './BAHWDashboard';
import { PetOwnerDashboard } from './PetOwnerDashboard';
import { LivestockOwnerDashboard } from './LivestockOwnerDashboard';
import { GuestDashboard } from './GuestDashboard';
import { CityHealthDashboard } from './CityHealthDashboard';
import type { User } from '../App';

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = sessionStorage.getItem('nasaalaga_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('nasaalaga_user');
    sessionStorage.removeItem('nasaalaga_token');
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

  const u = user as any;
  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  const isBahw = user.role === 'bahw';
  const isCityHealth = user.role === 'cityHealth';
  const isGuest = user.role === 'guest';
  // Livestock-only: role is livestockManager AND cannot add pets AND not 'both'
  const isLivestockOnly = user.role === 'livestockManager' && !u.can_add_pets && u.user_type !== 'both';
  // Pet owner (default for petOwner, owner, both, or livestockManager with pet access)
  const isPetOwnerOrBoth = user.role === 'petOwner' || user.role === 'owner' ||
    u.user_type === 'both' || (user.role === 'livestockManager' && u.can_add_pets);

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdmin ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : isBahw ? (
        <BAHWDashboard user={user} onLogout={handleLogout} />
      ) : isCityHealth ? (
        <CityHealthDashboard user={user} onLogout={handleLogout} />
      ) : isLivestockOnly ? (
        <LivestockOwnerDashboard user={user} onLogout={handleLogout} />
      ) : isPetOwnerOrBoth ? (
        <PetOwnerDashboard user={user} onLogout={handleLogout} />
      ) : isGuest ? (
        <GuestDashboard user={user} onLogout={handleLogout} />
      ) : null}
    </div>
  );
}
