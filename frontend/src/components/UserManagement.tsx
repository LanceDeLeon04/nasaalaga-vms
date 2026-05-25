import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Lock, Unlock, RefreshCw, X, Shield, Users, UserPlus, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { CALACA_BARANGAYS } from '../utils/barangays';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Administrator', bahw: 'BAHW',
  owner: 'Pet Owner', petOwner: 'Pet Owner', livestockManager: 'Livestock Manager',
  cityHealth: 'City Health', guest: 'Guest',
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-800', admin: 'bg-blue-100 text-blue-800',
  bahw: 'bg-cyan-100 text-cyan-800', owner: 'bg-green-100 text-green-800',
  petOwner: 'bg-green-100 text-green-800', livestockManager: 'bg-orange-100 text-orange-800',
  cityHealth: 'bg-pink-100 text-pink-800', guest: 'bg-gray-100 text-gray-700',
};

interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  barangay: string;
}

interface CreateModalProps {
  type: 'admin' | 'bahw';
  onClose: () => void;
  onCreated: () => void;
}

function CreateUserModal({ type, onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState<CreateUserForm>({ username: '', email: '', password: '', confirmPassword: '', barangay: '' });
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const set = (k: keyof CreateUserForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.username.trim()) { toast.error('Username is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (!form.password) { toast.error('Password is required'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (type === 'bahw' && !form.barangay) { toast.error('Barangay is required for BAHW accounts'); return; }
    setSaving(true);
    try {
      if (type === 'admin') {
        await api.createAdmin({ username: form.username, email: form.email, password: form.password, barangay: form.barangay || undefined });
        toast.success('Admin account created successfully');
      } else {
        await api.createBahw({ username: form.username, email: form.email, password: form.password, barangay: form.barangay });
        toast.success('BAHW account created successfully');
      }
      onCreated();
      onClose();
    } catch (err: any) { toast.error(err.message || 'Failed to create account'); }
    finally { setSaving(false); }
  };

  const isAdmin = type === 'admin';
  const color = isAdmin ? '#2B5EA6' : '#0891b2';
  const label = isAdmin ? 'Admin' : 'BAHW';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: `linear-gradient(135deg, ${color}, ${isAdmin ? '#3d7ac7' : '#06b6d4'})` }}>
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5" />
            <span className="font-bold text-lg">Create {label} Account</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name / Username *</label>
            <input value={form.username} onChange={e => set('username', e.target.value)}
              placeholder="e.g. Juan dela Cruz"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="e.g. juan@calaca.gov.ph"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Barangay {type === 'bahw' ? '*' : '(optional)'}</label>
            <select value={form.barangay} onChange={e => set('barangay', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
              <option value="">— Select Barangay —</option>
              {CALACA_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password * (min. 8 characters)</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="Enter password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-blue-400" />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm Password *</label>
            <input type={showPw ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
              placeholder="Re-enter password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
          <div className="rounded-lg p-3 text-xs" style={{ background: isAdmin ? '#eff6ff' : '#ecfeff', color: isAdmin ? '#1e40af' : '#164e63' }}>
            {isAdmin
              ? '🛡️ Admin accounts have full system access including user management, approvals, and reports.'
              : '🏘️ BAHW accounts are scoped to their assigned barangay — they can manage field data, pre-registrations, vaccination records, and local dashboard.'}
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ background: saving ? '#d1d5db' : `linear-gradient(135deg, ${color}, ${isAdmin ? '#3d7ac7' : '#06b6d4'})` }}>
            {saving ? 'Creating…' : `Create ${label} Account`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface UserManagementProps {
  currentUserRole?: string;
}

export function UserManagement({ currentUserRole }: UserManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editData, setEditData] = useState({ username: '', role: '', barangay: '', verified: true });
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateBahw, setShowCreateBahw] = useState(false);

  // Determine current user role from session if not passed as prop
  const sessionUser = (() => { try { return JSON.parse(sessionStorage.getItem('nasaalaga_user') || '{}'); } catch { return {}; } })();
  const myRole = currentUserRole || sessionUser.role || 'admin';
  const isSuperAdmin = myRole === 'superadmin';
  const isAdmin = myRole === 'admin' || isSuperAdmin;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err: any) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    bahw: users.filter(u => u.role === 'bahw').length,
    owners: users.filter(u => ['owner','petOwner','livestockManager'].includes(u.role)).length,
    verified: users.filter(u => u.verified).length,
  };

  const filtered = users.filter(u => {
    const search = searchTerm.toLowerCase();
    if (searchTerm && !u.username?.toLowerCase().includes(search) && !u.email?.toLowerCase().includes(search) && !u.barangay?.toLowerCase().includes(search)) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    return u.role !== 'superadmin';
  });

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, editData);
      toast.success('User updated successfully');
      setEditingUser(null);
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleVerified = async (user: any) => {
    try {
      await api.updateUser(user.id, { ...user, verified: !user.verified });
      toast.success(`User ${!user.verified ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await api.deleteUser(user.id);
      toast.success('User deleted');
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-gray-800 mb-1">User Management</h2>
          <p className="text-gray-600">Manage system users and access control — ISO 27001</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* SuperAdmin can create Admin accounts */}
          {isSuperAdmin && (
            <button onClick={() => setShowCreateAdmin(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #2B5EA6, #3d7ac7)' }}>
              <UserPlus className="w-4 h-4" /> Create Admin
            </button>
          )}
          {/* Admin and SuperAdmin can create BAHW accounts */}
          {isAdmin && (
            <button onClick={() => setShowCreateBahw(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
              <UserPlus className="w-4 h-4" /> Create BAHW
            </button>
          )}
          <button onClick={loadUsers} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Users', value: stats.total },
          { label: 'Admins', value: stats.admin },
          { label: 'BAHW', value: stats.bahw },
          { label: 'Pet/Livestock Owners', value: stats.owners },
          { label: 'Verified', value: stats.verified },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg shadow p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by name, email, or barangay..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6]">
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'superadmin').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="text-sm text-gray-600">{loading ? 'Loading...' : `${filtered.length} users`} (superadmins hidden for security)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-gray-700">Email</th>
                <th className="text-left py-3 px-4 text-gray-700">Role</th>
                <th className="text-left py-3 px-4 text-gray-700">Barangay</th>
                <th className="text-left py-3 px-4 text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-gray-700">Joined</th>
                <th className="text-left py-3 px-4 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500">Loading users from database...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500">No users found.</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800 font-medium">{user.username}</td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{user.barangay || 'All'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${user.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.verified ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{user.created_at ? new Date(user.created_at).toLocaleDateString('en-PH') : '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingUser(user); setEditData({ username: user.username, role: user.role, barangay: user.barangay||'', verified: user.verified }); }}
                        className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button onClick={() => handleToggleVerified(user)} className="p-1 hover:bg-gray-100 rounded" title={user.verified ? 'Deactivate' : 'Activate'}>
                        {user.verified ? <Lock className="w-4 h-4 text-yellow-600" /> : <Unlock className="w-4 h-4 text-green-600" />}
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-1 hover:bg-gray-100 rounded" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Hierarchy Info */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-800">Role Hierarchy & Permissions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-bold">SuperAdmin</span>
            </div>
            <p className="text-xs text-purple-700">Full system access. Can create Admin accounts and has all Admin permissions. Manages system configuration, rule engine, and audit logs.</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">Admin</span>
            </div>
            <p className="text-xs text-blue-700">Can create BAHW accounts and manage all non-superadmin users. Approves/rejects applications, manages inventory, and generates reports.</p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 text-cyan-800 font-bold">BAHW</span>
            </div>
            <p className="text-xs text-cyan-700">Scoped to their assigned barangay. Views and manages pre-registered pets/livestock, records vaccinations, and monitors local disease data.</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
        <Shield className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-900 font-medium">ISO/IEC 27001 Information Security</p>
          <p className="text-sm text-yellow-700">User list is drawn directly from the database. All changes are audit-logged. Superadmin accounts are hidden for security. Role changes take effect immediately.</p>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Edit className="w-4 h-4" /> Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
                <input value={editData.username} onChange={e => setEditData(d => ({ ...d, username: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select value={editData.role} onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                  {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'superadmin').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Barangay</label>
                <select value={editData.barangay} onChange={e => setEditData(d => ({ ...d, barangay: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                  <option value="">All Barangays</option>
                  {CALACA_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editData.verified} onChange={e => setEditData(d => ({ ...d, verified: e.target.checked }))} className="rounded" id="verifiedChk" />
                <label htmlFor="verifiedChk" className="text-sm text-gray-700">Account Active / Verified</label>
              </div>
            </div>
            <div className="border-t border-gray-100 px-6 py-4 flex gap-2 justify-end">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <CreateUserModal type="admin" onClose={() => setShowCreateAdmin(false)} onCreated={loadUsers} />
      )}

      {/* Create BAHW Modal */}
      {showCreateBahw && (
        <CreateUserModal type="bahw" onClose={() => setShowCreateBahw(false)} onCreated={loadUsers} />
      )}
    </div>
  );
}
