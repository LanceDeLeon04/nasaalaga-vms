import { useState, useEffect, useRef } from 'react';
import { LogOut, Bell, Server, CheckCircle, Settings, Menu, User, ChevronDown, UserCircle2 } from 'lucide-react';
import type { User as UserType } from '../App';

const logoImage = '/images/city-seal.png';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Admin', bahw: 'BAHW',
  petOwner: 'Pet Owner', owner: 'Pet Owner',
  livestockManager: 'Livestock Manager', both: 'Pet & Livestock',
  cityHealth: 'City Health', guest: 'Guest',
};

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onMenuClick?: () => void;
  onProfileClick?: () => void;
}

export function Header({ user, onLogout, onMenuClick, onProfileClick }: HeaderProps) {
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Derive avatar: prefer user prop (always fresh from React state), fall back to sessionStorage
  const avatar = user.avatar || (() => {
    try {
      const stored = sessionStorage.getItem('nasaalaga_user');
      return stored ? JSON.parse(stored).avatar || '' : '';
    } catch { return ''; }
  })();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (user.username || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const roleLabel = ROLE_LABELS[user.role || 'guest'] || user.role || '';

  const AvatarCircle = ({ size = 36 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      background: avatar ? 'transparent' : 'rgba(255,255,255,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid rgba(255,255,255,0.5)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      {avatar
        ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: 'white', fontSize: size * 0.35, fontWeight: 700, lineHeight: 1 }}>{initials}</span>
      }
    </div>
  );

  return (
    <header className="bg-gradient-to-r from-[#2B5EA6] to-[#3d7ac7] text-white shadow-xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left — logo + title */}
          <div className="flex items-center gap-4">
            {onMenuClick && (
              <button onClick={onMenuClick}
                className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
                aria-label="Toggle menu">
                <Menu className="w-6 h-6" />
              </button>
            )}
            <img src={logoImage} alt="Calaca City Logo"
              onError={e => { e.currentTarget.style.opacity = '0'; }}
              className="w-14 h-14 drop-shadow-lg" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white drop-shadow-md">NASaAlaga</h1>
              <p className="text-xs text-blue-100 hidden sm:block">Veterinary Management System</p>
            </div>
          </div>

          {/* Right — status badges + user dropdown */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
              <CheckCircle className="w-4 h-4 text-green-300" />
              <span className="text-sm text-green-100">System Online</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
              <Server className="w-4 h-4 text-blue-300" />
              <span className="text-sm text-blue-100">Backup: Today</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 hover:bg-white/20 rounded-full transition-all duration-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#F39C3A] rounded-full animate-pulse" />
            </button>

            {/* User dropdown */}
            <div ref={dropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 14px 6px 8px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 50, cursor: 'pointer', color: 'white',
                  transition: 'background .2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <AvatarCircle size={34} />
                <div style={{ textAlign: 'left', lineHeight: 1.3 }} className="hidden sm:block">
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>{user.username}</p>
                  <p style={{ fontSize: 11, color: 'rgba(219,234,254,0.9)', margin: 0 }}>{roleLabel}</p>
                </div>
                <ChevronDown style={{
                  width: 15, height: 15, opacity: 0.8,
                  transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform .2s',
                }} />
              </button>

              {/* Dropdown panel */}
              {dropOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 1000,
                  background: 'white', borderRadius: 14, width: 220,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                }}>
                  {/* Profile header inside dropdown */}
                  <div style={{ padding: '16px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: avatar ? 'transparent' : '#2B5EA6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {avatar
                        ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>{initials}</span>
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: '#1f2937', fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</p>
                      <p style={{ color: '#6b7280', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email || roleLabel}</p>
                    </div>
                  </div>

                  {/* My Profile link */}
                  {onProfileClick && (
                    <button
                      onClick={() => { setDropOpen(false); onProfileClick(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '12px 18px', border: 'none',
                        background: 'none', cursor: 'pointer', color: '#374151',
                        fontSize: 14, fontWeight: 500, textAlign: 'left',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <User style={{ width: 16, height: 16, color: '#2B5EA6' }} />
                      My Profile
                    </button>
                  )}

                  <div style={{ height: 1, background: '#f3f4f6' }} />

                  {/* Logout */}
                  <button
                    onClick={() => { setDropOpen(false); onLogout(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '12px 18px', border: 'none',
                      background: 'none', cursor: 'pointer', color: '#dc2626',
                      fontSize: 14, fontWeight: 500, textAlign: 'left',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <LogOut style={{ width: 16, height: 16 }} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ISO Compliance Banner */}
      <div className="bg-black/10 backdrop-blur-sm px-6 py-2 text-xs text-blue-50 flex items-center justify-center gap-8 flex-wrap">
        <span className="flex items-center gap-1">✓ ISO 9001:2015</span>
        <span className="flex items-center gap-1">✓ ISO 27001</span>
        <span className="flex items-center gap-1">✓ ISO 22301</span>
        <span className="flex items-center gap-1">✓ ARTA Compliant</span>
      </div>
    </header>
  );
}
