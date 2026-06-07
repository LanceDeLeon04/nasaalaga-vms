import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { BAHWDashboard } from './BAHWDashboard';
import { PetOwnerDashboard } from './PetOwnerDashboard';
import { LivestockOwnerDashboard } from './LivestockOwnerDashboard';
import { GuestDashboard } from './GuestDashboard';
import { CityHealthDashboard } from './CityHealthDashboard';
import type { User } from '../App';

// Combined dashboard for users who are both pet owners and livestock managers
function BothDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'pets' | 'livestock'>('pets');
  return (
    <div>
      {/* Tab switcher */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: '#1f2937', borderRadius: 50, padding: '6px 8px',
        display: 'flex', gap: 6, zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,.35)'
      }}>
        <button
          onClick={() => setActiveTab('pets')}
          style={{
            padding: '8px 20px', borderRadius: 50, border: 'none', cursor: 'pointer',
            background: activeTab === 'pets' ? '#2B5EA6' : 'transparent',
            color: activeTab === 'pets' ? '#fff' : '#9ca3af', fontSize: 13, fontWeight: 700,
            transition: 'all .2s'
          }}>
          🐾 Pet Owner
        </button>
        <button
          onClick={() => setActiveTab('livestock')}
          style={{
            padding: '8px 20px', borderRadius: 50, border: 'none', cursor: 'pointer',
            background: activeTab === 'livestock' ? '#60A85C' : 'transparent',
            color: activeTab === 'livestock' ? '#fff' : '#9ca3af', fontSize: 13, fontWeight: 700,
            transition: 'all .2s'
          }}>
          🐄 Livestock
        </button>
      </div>
      {activeTab === 'pets'
        ? <PetOwnerDashboard user={user} onLogout={onLogout} />
        : <LivestockOwnerDashboard user={user} onLogout={onLogout} />
      }
    </div>
  );
}

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const loadUserFromStorage = () => {
    const storedUser = sessionStorage.getItem('nasaalaga_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    loadUserFromStorage();
    // Re-sync React state whenever MyProfile saves — covers avatar, username, etc.
    window.addEventListener('nasaalaga_profile_updated', loadUserFromStorage);
    return () => window.removeEventListener('nasaalaga_profile_updated', loadUserFromStorage);
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

  const role = user.role;

  return (
    <div className="min-h-screen bg-gray-50">
      {(role === 'admin' || role === 'superadmin' || role === 'cvoStaff') ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : role === 'bahw' ? (
        <BAHWDashboard user={user} onLogout={handleLogout} />
      ) : role === 'cityHealth' ? (
        <CityHealthDashboard user={user} onLogout={handleLogout} />
      ) : role === 'both' ? (
        <BothDashboard user={user} onLogout={handleLogout} />
      ) : (role === 'petOwner' || role === 'owner') ? (
        <PetOwnerDashboard user={user} onLogout={handleLogout} />
      ) : role === 'livestockManager' ? (
        <LivestockOwnerDashboard user={user} onLogout={handleLogout} />
      ) : role === 'guest' ? (
        <GuestDashboard user={user} onLogout={handleLogout} />
      ) : (
        <GuestDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
