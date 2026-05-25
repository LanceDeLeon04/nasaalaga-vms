import { useState, useEffect } from 'react';
import { LogOut, Bell, Server, CheckCircle, UserCircle2, Settings, Menu, User } from 'lucide-react';
import type { User as UserType } from '../App';
const logoImage = '/images/city-seal.png';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  bahw: 'BAHW',
  petOwner: 'Pet Owner',
  owner: 'Pet Owner',
  livestockManager: 'Livestock Manager',
  both: 'Pet & Livestock Owner',
  cityHealth: 'City Health',
  guest: 'Guest',
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: '#7c3aed',
  admin: '#2B5EA6',
  bahw: '#0891b2',
  petOwner: '#16a34a',
  owner: '#16a34a',
  livestockManager: '#ea580c',
  both: '#0d9488',
  cityHealth: '#db2777',
  guest: '#6b7280',
};

function UserAvatar({ user, size = 36, onClick }: { user: UserType; size?: number; onClick?: () => void }) {
  const [avatarSrc, setAvatarSrc] = useState<string>('');
  const u = user as any;

  useEffect(() => {
    // Check sessionStorage for latest avatar (updated after profile save)
    const stored = sessionStorage.getItem('nasaalaga_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.avatar) { setAvatarSrc(parsed.avatar); return; }
      } catch {}
    }
    if (u.avatar) setAvatarSrc(u.avatar);
  }, [u.avatar]);

  // Listen for profile updates
  useEffect(() => {
    const handler = () => {
      const stored = sessionStorage.getItem('nasaalaga_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.avatar) setAvatarSrc(parsed.avatar);
        } catch {}
      }
    };
    window.addEventListener('nasaalaga_profile_updated', handler);
    return () => window.removeEventListener('nasaalaga_profile_updated', handler);
  }, []);

  const initials = (user.username || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const color = ROLE_COLORS[user.role || 'guest'] || '#6b7280';

  return (
    <div
      onClick={onClick}
      title="My Profile"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: avatarSrc ? 'transparent' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        boxShadow: `0 0 0 2px rgba(255,255,255,0.6)`,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px white`;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px rgba(255,255,255,0.6)`;
      }}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={user.username}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setAvatarSrc('')}
        />
      ) : (
        <span style={{
          color: 'white',
          fontSize: size * 0.38,
          fontWeight: 800,
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {initials}
        </span>
      )}
    </div>
  );
}

export function Header({ user, onLogout, onMenuClick, onProfileClick }: HeaderProps) {
  const roleLabel = ROLE_LABELS[user.role || 'guest'] || (user.role ?? 'User');

  return (
    <header className="bg-gradient-to-r from-[#2B5EA6] to-[#3d7ac7] text-white shadow-xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-4">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
                aria-label="Toggle menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <img
              src={logoImage}
              alt="Calaca City Logo"
              onError={(e) => { e.currentTarget.style.opacity = '0'; }}
              className="w-14 h-14 drop-shadow-lg"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white drop-shadow-md">NASaAlaga</h1>
              <p className="text-xs text-blue-100 hidden sm:block">Veterinary Management System</p>
            </div>
          </div>

          {/* Right: status pills + bell + user pill */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
              <CheckCircle className="w-4 h-4 text-green-300" />
              <span className="text-sm text-green-100">System Online</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
              <Server className="w-4 h-4 text-blue-300" />
              <span className="text-sm text-blue-100">Backup: Today</span>
            </div>

            <button className="relative p-3 hover:bg-white/20 rounded-full transition-all duration-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#F39C3A] rounded-full animate-pulse" />
            </button>

            {/* ── User pill ── */}
            <div className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all">
              {/* Avatar — clickable, goes to My Profile */}
              <UserAvatar user={user} size={36} onClick={onProfileClick} />

              {/* Name + role — also clickable */}
              <div
                className="text-left cursor-pointer hidden sm:block"
                onClick={onProfileClick}
                title="My Profile"
              >
                <p className="text-sm font-semibold leading-tight hover:underline">
                  {user.username}
                </p>
                <p className="text-xs text-blue-200 leading-tight mt-0.5">
                  {roleLabel}
                </p>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-white/20 rounded-full transition-all duration-200 ml-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ISO bar */}
      <div className="bg-black/10 backdrop-blur-sm px-6 py-1.5 text-xs text-blue-50 flex items-center justify-center gap-8 flex-wrap">
        <span>✓ ISO 9001:2015</span>
        <span>✓ ISO 27001</span>
        <span>✓ ISO 22301</span>
        <span>✓ ARTA Compliant</span>
      </div>
    </header>
  );
}
