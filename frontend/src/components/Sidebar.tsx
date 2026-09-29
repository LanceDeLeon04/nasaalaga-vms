import {
  LayoutDashboard, Package, Syringe, AlertTriangle, FileText, Award,
  Users, ScrollText, MessageSquare, Lock, ShieldCheck, Bird,
  ClipboardList, Settings, X, FlaskConical, AlertCircle, PawPrint, DollarSign, UserCircle,
  CalendarClock, ChevronDown, Building2, Activity
} from 'lucide-react';
import type { ActiveView } from './AdminDashboard';
import type { UserRole } from '../App';
import { useState, useEffect } from 'react';
import { useBackupStatus, timeAgo, HEALTH_LABEL, HEALTH_COLOR, HEALTH_DOT } from '../hooks/useBackupStatus';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  userRole: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activeView, setActiveView, userRole, isOpen = true, onClose }: SidebarProps) {
  const [, forceUpdate] = useState(0);
  const backup = useBackupStatus(userRole);
  useEffect(() => {
    const refresh = () => forceUpdate(n => n + 1);
    window.addEventListener('nasaalaga_profile_updated', refresh);
    return () => window.removeEventListener('nasaalaga_profile_updated', refresh);
  }, []);

  const menuItems = [
    { id: 'dashboard' as ActiveView, label: 'Dashboard',        icon: LayoutDashboard, roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'livestock' as ActiveView, label: 'Livestock',        icon: Package,         roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'lost-livestock' as ActiveView, label: 'Validate Lost Livestock', icon: ShieldCheck, roles: ['bahw', 'admin', 'superadmin', 'cvoStaff'] },
    { id: 'livestock-death-validation' as ActiveView, label: 'Validate Livestock Deaths', icon: ShieldCheck, roles: ['bahw', 'admin', 'superadmin', 'cvoStaff'] },
    { id: 'rabies'      as ActiveView, label: 'Pets Management',  icon: PawPrint,    roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'pet-death-validation' as ActiveView, label: 'Validate Pet Deaths', icon: ShieldCheck, roles: ['bahw', 'admin', 'superadmin', 'cvoStaff'] },
    { id: 'vaccination' as ActiveView, label: 'Vaccination',       icon: Syringe,     roles: ['admin', 'bahw', 'superadmin'] },
    { id: 'preregistered' as ActiveView, label: 'Pet Pre-Reg Review', icon: ClipboardList, roles: ['admin', 'superadmin', 'cvoStaff'] },
    { id: 'livestock-prereg' as ActiveView, label: 'Livestock Pre-Reg Review', icon: ClipboardList, roles: ['admin', 'superadmin', 'cvoStaff'] },
    { id: 'pre-registration' as ActiveView, label: 'Pre-Registration', icon: ClipboardList, roles: ['bahw'] },
    { id: 'schedule' as ActiveView, label: 'Schedule',           icon: CalendarClock, roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'wildlife'  as ActiveView, label: 'Wildlife Tracking',icon: Bird,            roles: ['admin', 'superadmin'] },
    // Outbreak Monitor stays view-only field awareness for BAHW (their own barangay's data only).
    { id: 'outbreak'  as ActiveView, label: 'Outbreak Monitor', icon: AlertTriangle,   roles: ['admin', 'bahw', 'superadmin'] },
    // Inventory, Other CVO Services, Reports/Certificates, and Feedback are CVO-office /
    // city-level administrative functions — not needed for barangay-level field work, so
    // BAHW no longer sees them (principle of least privilege).
    { id: 'services'  as ActiveView, label: 'Other CVO Services',     icon: FileText,        roles: ['admin', 'superadmin', 'cvoStaff'] },
    { id: 'inventory' as ActiveView, label: 'Inventory',        icon: FlaskConical,    roles: ['admin', 'superadmin', 'cvoStaff'] },
    { id: 'budget'    as ActiveView, label: 'Budget',            icon: DollarSign,      roles: ['admin', 'superadmin'] },
    { id: 'reports'   as ActiveView, label: 'Reports',          icon: Award,           roles: ['admin', 'superadmin', 'cvoStaff'] },
    { id: 'feedback'  as ActiveView, label: 'Feedback',         icon: MessageSquare,   roles: ['admin', 'superadmin'] },
    { id: 'my-profile' as ActiveView, label: 'My Profile',      icon: UserCircle,      roles: ['admin', 'bahw', 'superadmin', 'cvoStaff'] },
    { id: 'users'     as ActiveView, label: 'Users',            icon: Users,           roles: ['admin', 'superadmin'] },
    { id: 'audit'     as ActiveView, label: 'Audit Logs',       icon: ScrollText,      roles: ['admin', 'superadmin'] },
    { id: 'settings'  as ActiveView, label: 'SuperAdmin Panel', icon: Settings,    roles: ['superadmin'] },
  ];

  // ── Sidebar categories ───────────────────────────────────────────────
  // Every menu item id must appear in exactly one place: either as a standalone
  // entry (top-level) or inside a group. Ids not listed here are appended to the
  // end as standalone items so a newly added module never silently disappears.
  const STANDALONE_TOP: ActiveView[] = ['dashboard'];
  const STANDALONE_BOTTOM: ActiveView[] = ['my-profile'];
  const menuGroups: { key: string; label: string; icon: typeof Package; ids: ActiveView[] }[] = [
    { key: 'livestock', label: 'Livestock', icon: Package,
      ids: ['livestock', 'livestock-prereg', 'lost-livestock', 'livestock-death-validation'] },
    { key: 'pets', label: 'Pets', icon: PawPrint,
      ids: ['rabies', 'preregistered', 'pet-death-validation'] },
    { key: 'health', label: 'Health & Field Work', icon: Activity,
      ids: ['vaccination', 'pre-registration', 'schedule', 'outbreak', 'wildlife'] },
    { key: 'office', label: 'CVO Office', icon: Building2,
      ids: ['services', 'inventory', 'budget', 'reports', 'feedback'] },
    { key: 'admin', label: 'Administration', icon: Settings,
      ids: ['users', 'audit', 'settings'] },
  ];

  const canSee = (item: { roles: string[] }) => item.roles.includes(userRole!);
  const byId = (id: ActiveView) => menuItems.find(m => m.id === id);
  // Allowed items first, locked (no access) items after — same ordering as before.
  const sortAllowedFirst = <T extends { roles: string[] }>(items: T[]) => [
    ...items.filter(canSee),
    ...items.filter(i => !canSee(i)),
  ];

  const groupedIds = new Set<ActiveView>([
    ...STANDALONE_TOP, ...STANDALONE_BOTTOM, ...menuGroups.flatMap(g => g.ids),
  ]);
  const ungroupedItems = menuItems.filter(m => !groupedIds.has(m.id));

  // Open/closed state. Several dropdowns can be open at the same time and the
  // choice is remembered between visits.
  const OPEN_KEY = 'nasaalaga_sidebar_open_groups';
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(OPEN_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const persistOpen = (next: Record<string, boolean>) => {
    setOpenGroups(next);
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const toggleGroup = (key: string) => persistOpen({ ...openGroups, [key]: !openGroups[key] });

  // Whenever the active view changes (sidebar click, dashboard card, deep link),
  // make sure the dropdown that contains it is open so the user can see where they are.
  useEffect(() => {
    const owner = menuGroups.find(g => g.ids.includes(activeView));
    if (owner && !openGroups[owner.key]) {
      persistOpen({ ...openGroups, [owner.key]: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const handleMenuItemClick = (itemId: ActiveView, isAllowed: boolean) => {
    if (isAllowed) {
      setActiveView(itemId);
      if (onClose) onClose();
    }
  };

  const renderItem = (
    item: (typeof menuItems)[number],
    nested = false,
    hidden = false,
  ) => {
    const isAllowed = canSee(item);
    const isActive = activeView === item.id;
    const Icon = item.icon;
    return (
      <li key={item.id}>
        <button
          onClick={() => handleMenuItemClick(item.id, isAllowed)}
          disabled={!isAllowed}
          tabIndex={hidden ? -1 : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
            nested ? 'px-3 py-2.5' : 'px-4 py-3.5'
          } ${
            isActive
              ? 'bg-white text-[#60A85C] shadow-lg scale-[1.02]'
              : isAllowed
              ? 'hover:bg-white/15 text-white'
              : 'opacity-40 cursor-not-allowed text-gray-300'
          }`}
        >
          <Icon className={nested ? 'w-4 h-4' : 'w-5 h-5'} />
          <span className="text-sm flex-1 text-left">{item.label}</span>
          {!isAllowed && <Lock className="w-3 h-3" />}
          {isActive && <div className="w-2 h-2 bg-[#60A85C] rounded-full" />}
        </button>
      </li>
    );
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
        overflow-y-auto overscroll-contain
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
            {STANDALONE_TOP.map(id => byId(id)).filter((i): i is NonNullable<typeof i> => !!i && canSee(i)).map(i => renderItem(i))}

            {menuGroups.map(group => {
              const items = sortAllowedFirst(
                group.ids.map(byId).filter((i): i is NonNullable<typeof i> => !!i)
              );
              // Hide a category entirely when the role can't use anything in it.
              if (!items.some(canSee)) return null;

              const isOpen = !!openGroups[group.key];
              const hasActive = items.some(i => i.id === activeView);
              const GroupIcon = group.icon;
              const panelId = `sidebar-group-${group.key}`;
              return (
                <li key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                      hasActive && !isOpen ? 'bg-white/25 text-white' : 'hover:bg-white/15 text-white'
                    }`}
                  >
                    <GroupIcon className="w-5 h-5" />
                    <span className="text-sm flex-1 text-left font-medium">{group.label}</span>
                    {hasActive && !isOpen && <div className="w-2 h-2 bg-white rounded-full" />}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {/* grid-rows trick animates height without measuring the content */}
                  <div
                    id={panelId}
                    className={`grid transition-all duration-200 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <ul className="overflow-hidden ml-6 pl-3 border-l border-white/25 space-y-1">
                      {items.map(item => renderItem(item, true, !isOpen))}
                    </ul>
                  </div>
                </li>
              );
            })}

            {ungroupedItems.filter(canSee).map(i => renderItem(i))}
            {STANDALONE_BOTTOM.map(id => byId(id)).filter((i): i is NonNullable<typeof i> => !!i && canSee(i)).map(i => renderItem(i))}
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
                <span className={`${backup?.lastBackup ? 'text-green-300' : 'text-amber-300'} flex items-center gap-1`}>
                  <span className={`w-2 h-2 rounded-full ${backup?.lastBackup ? 'bg-green-300' : 'bg-amber-300'}`} />
                  {backup?.lastBackup ? 'Ready' : 'No backup'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg" title={backup?.lastBackup ? `Last backup ${timeAgo(backup.lastBackup.createdAt)}` : ''}>
                <span className="text-gray-100">Backup</span>
                <span className={`${backup ? HEALTH_COLOR[backup.health] : 'text-gray-300'} flex items-center gap-1`}>
                  <span className={`w-2 h-2 rounded-full ${backup ? HEALTH_DOT[backup.health] : 'bg-gray-400'}`} />
                  {backup ? HEALTH_LABEL[backup.health] : '…'}
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
