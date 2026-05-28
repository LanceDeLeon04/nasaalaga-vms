import {
  LayoutDashboard, Package, Syringe, AlertTriangle, FileText, Award,
  Users, ScrollText, MessageSquare, Lock, ShieldCheck, Bird,
  ClipboardList, Settings, X, FlaskConical, AlertCircle, PawPrint, DollarSign, UserCircle,
  CalendarClock
} from 'lucide-react';import type { ActiveView } from './AdminDashboard';
import type { UserRole } from '../App';
import { useState, useEffect } from 'react';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  userRole: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activeView, setActiveView, userRole, isOpen = true, onClose }: SidebarProps) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const refresh = () => forceUpdate(n => n + 1);
    window.addEventListener('nasaalaga_profile_updated', refresh);
    return () => window.removeEventListener('nasaalaga_profile_updated', refresh);
  }, []);

  const menuItems = [
    { id: 'dashboard' as ActiveView, label: 'Dashboard',        icon: LayoutDashboard, roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'livestock' as ActiveView, label: 'Livestock',        icon: Package,         roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'rabies'      as ActiveView, label: 'Pets Management',  icon: PawPrint,    roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'vaccination' as ActiveView, label: 'Vaccination',       icon: Syringe,     roles: ['admin', 'bahw', 'superadmin'] },
    { id: 'preregistered' as ActiveView, label: 'Pet Pre-Reg Review', icon: ClipboardList, roles: ['admin', 'superadmin', 'cvoStaff'] },
    { id: 'livestock-prereg' as ActiveView, label: 'Livestock Pre-Reg Review', icon: ClipboardList, roles: ['admin', 'superadmin', 'cvoStaff'] },
    { id: 'pre-registration' as ActiveView, label: 'Pre-Registration', icon: ClipboardList, roles: ['bahw'] },
    { id: 'schedule' as ActiveView, label: 'Schedule',           icon: CalendarClock, roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'wildlife'  as ActiveView, label: 'Wildlife Tracking',icon: Bird,            roles: ['admin', 'superadmin'] },
    { id: 'outbreak'  as ActiveView, label: 'Outbreak Monitor', icon: AlertTriangle,   roles: ['admin', 'bahw', 'superadmin'] },
    { id: 'services'  as ActiveView, label: 'Other CVO Services',     icon: FileText,        roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'inventory' as ActiveView, label: 'Inventory',        icon: FlaskConical,    roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'budget'    as ActiveView, label: 'Budget',            icon: DollarSign,      roles: ['admin', 'superadmin'] },
    { id: 'reports'   as ActiveView, label: 'Reports',          icon: Award,           roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'feedback'  as ActiveView, label: 'Feedback',         icon: MessageSquare,   roles: ['admin', 'bahw', 'superadmin'] },
    { id: 'my-profile' as ActiveView, label: 'My Profile',      icon: UserCircle,      roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'users'     as ActiveView, label: 'Users',            icon: Users,           roles: ['admin', 'superadmin'] },
    { id: 'audit'     as ActiveView, label: 'Audit Logs',       icon: ScrollText,      roles: ['admin', 'superadmin'] },
    { id: 'settings'  as ActiveView, label: 'SuperAdmin Panel', icon: Settings,    roles: ['superadmin'] },
  ];

  const handleMenuItemClick = (itemId: ActiveView, isAllowed: boolean) => {
    if (isAllowed) {
      setActiveView(itemId);
      if (onClose) onClose();
    }
  };

  return (
    <>
      {isOpen && onClose && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-gradient-to-b from-[#60A85C] to-[#4a8a47] text-white shadow-2xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {onClose && (
          <div className="lg:hidden flex justify-end p-4">
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
        <nav className="p-4">
          <ul className="space-y-1.5">
            {[
              ...menuItems.filter(item => item.roles.includes(userRole!)),
              ...menuItems.filter(item => !item.roles.includes(userRole!)),
            ].map((item) => {
              const isAllowed = item.roles.includes(userRole!);
              const isActive = activeView === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleMenuItemClick(item.id, isAllowed)}
                    disabled={!isAllowed}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-[#60A85C] shadow-lg scale-[1.02]'
                        : isAllowed
                        ? 'hover:bg-white/15 text-white hover:pl-5'
                        : 'opacity-40 cursor-not-allowed text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm flex-1 text-left">{item.label}</span>
                    {!isAllowed && <Lock className="w-3 h-3" />}
                    {isActive && <div className="w-2 h-2 bg-[#60A85C] rounded-full" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        {(userRole === 'admin' || userRole === 'superadmin') && (
          <div className="m-4 p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
            <h3 className="text-sm mb-3 text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              System Health
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                <span className="text-gray-100">Recovery</span>
                <span className="text-green-300 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-300 rounded-full" /> Ready
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                <span className="text-gray-100">Backup</span>
                <span className="text-green-300 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-300 rounded-full" /> Active
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                <span className="text-gray-100">Uptime</span>
                <span className="text-green-300">99.8%</span>
              </div>
            </div>
          </div>
        )}

        {/* Logged-in user mini card */}
        {(() => {
          try {
            const stored = sessionStorage.getItem('nasaalaga_user');
            if (!stored) return null;
            const u = JSON.parse(stored);
            const initials = (u.username || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <button
                onClick={() => setActiveView('my-profile' as any)}
                className="mx-4 mb-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center gap-3 w-[calc(100%-2rem)] transition-all cursor-pointer"
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: u.avatar ? 'transparent' : 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {u.avatar
                    ? <img src={u.avatar} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{initials}</span>
                  }
                </div>
                <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</p>
                  <p style={{ fontSize: 11, color: 'rgba(219,234,254,0.8)', margin: 0 }}>My Profile →</p>
                </div>
              </button>
            );
          } catch { return null; }
        })()}
      </aside>
    </>
  );
}
