import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Lock, Unlock, Shield, RefreshCw, X, Save, Users, CheckSquare, Square } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { CALACA_BARANGAYS_FALLBACK } from '../utils/barangays';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Administrator', bahw: 'BAHW',
  owner: 'Pet Owner', petOwner: 'Pet Owner', livestockManager: 'Livestock Manager',
  both: 'Pet & Livestock Owner', cityHealth: 'City Health', guest: 'Guest',
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-800', admin: 'bg-blue-100 text-blue-800',
  bahw: 'bg-cyan-100 text-cyan-800', owner: 'bg-green-100 text-green-800',
  petOwner: 'bg-green-100 text-green-800', livestockManager: 'bg-orange-100 text-orange-800',
  both: 'bg-teal-100 text-teal-800', cityHealth: 'bg-pink-100 text-pink-800', guest: 'bg-gray-100 text-gray-700',
};

const PERMISSIONS: Record<string, string[]> = {
  superadmin: ['Full system access', 'System configuration', 'User management', 'Audit logs', 'Database control', 'Rule engine management'],
  admin: ['Full system access', 'User management (non-superadmin)', 'Approve/Reject applications', 'Generate all reports', 'System settings', 'Budget management'],
  bahw: ['Field data entry', 'Livestock registration', 'Vaccination recording', 'Disease reporting', 'View assigned barangay data', 'Generate barangay reports'],
  cityHealth: ['View all health data', 'Biting incident management', 'Disease alerts', 'Generate health reports'],
  petOwner: ['Register pets', 'View own pets', 'Submit feedback', 'Download CVO forms', 'Report lost/found pets'],
  owner: ['Register pets', 'View own pets', 'Submit feedback', 'Download CVO forms', 'Report lost/found pets'],
  livestockManager: ['Register livestock', 'View livestock records', 'Health record entry', 'Download CVO forms'],
  both: ['Register pets & livestock', 'View own animals', 'Submit feedback', 'Download CVO forms', 'Report lost/found pets'],
};

const BARANGAYS = CALACA_BARANGAYS_FALLBACK;

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editData, setEditData] = useState({ username: '', role: '', barangay: '', verified: true, can_add_livestock: false, can_add_pets: false });
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    email: '', username: '', password: '', confirmPassword: '',
    role: 'petOwner', user_type: 'petOwner', barangay: '', phone: '', address: '',
    can_add_livestock: false, can_add_pets: true,
  });
  const [creating, setCreating] = useState(false);

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
    superadmin: users.filter(u => u.role === 'superadmin').length,
    admin: users.filter(u => u.role === 'admin').length,
    bahw: users.filter(u => u.role === 'bahw').length,
    owners: users.filter(u => ['owner','petOwner','livestockManager','both'].includes(u.role)).length,
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
      // Also update access flags
      await api.updateUserAccessFlags(editingUser.id, {
        can_add_livestock: editData.can_add_livestock,
        can_add_pets: editData.can_add_pets,
      });
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

  const handleCreate = async () => {
    if (!createData.email || !createData.username || !createData.password) {
      toast.error('Email, name, and password are required'); return;
    }
    if (createData.password !== createData.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (createData.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    if (createData.role === 'bahw' && !createData.barangay) {
      toast.error('Barangay is required for BAHW accounts'); return;
    }
    setCreating(true);
    try {
      // Determine can_add flags from role
      const payload = {
        ...createData,
        can_add_livestock: createData.role === 'livestockManager' || createData.user_type === 'both' || createData.can_add_livestock,
        can_add_pets: createData.role === 'petOwner' || createData.role === 'owner' || createData.user_type === 'both' || createData.can_add_pets,
      };
      await api.adminCreateUser(payload);
      toast.success(`Account created for ${createData.username}`);
      setShowCreateModal(false);
      setCreateData({ email:'',username:'',password:'',confirmPassword:'',role:'petOwner',user_type:'petOwner',barangay:'',phone:'',address:'',can_add_livestock:false,can_add_pets:true });
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const handleRoleChange = (role: string) => {
    let user_type = role;
    let can_add_pets = role === 'petOwner' || role === 'owner' || role === 'both';
    let can_add_livestock = role === 'livestockManager' || role === 'both';
    setCreateData(p => ({ ...p, role, user_type, can_add_pets, can_add_livestock }));
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditData({
      username: user.username, role: user.role, barangay: user.barangay||'',
      verified: user.verified,
      can_add_livestock: user.can_add_livestock || false,
      can_add_pets: user.can_add_pets || false,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">User Management</h2>
          <p className="text-gray-600">Manage system users and access control — ISO 27001</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadUsers} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] text-sm font-medium">
            <Plus className="w-4 h-4" /> Create Account
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Users', value: stats.total },
          { label: 'Super Admin', value: stats.superadmin },
          { label: 'Admins', value: stats.admin },
          { label: 'BAHW', value: stats.bahw },
          { label: 'Pet/Livestock', value: stats.owners },
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
        <div className="p-4 border-b">
          <span className="text-sm text-gray-600">{loading ? 'Loading...' : `${filtered.length} users`} (superadmins hidden)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-gray-700">Email</th>
                <th className="text-left py-3 px-4 text-gray-700">Role</th>
                <th className="text-left py-3 px-4 text-gray-700">Barangay</th>
                <th className="text-left py-3 px-4 text-gray-700">Cross-Access</th>
                <th className="text-left py-3 px-4 text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500">No users found.</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800 font-medium">{user.username}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[user.user_type || user.role] || user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{user.barangay || 'All'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 text-xs">
                      {user.can_add_pets && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">🐾 Pets</span>}
                      {user.can_add_livestock && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">🐄 Livestock</span>}
                      {!user.can_add_pets && !user.can_add_livestock && <span className="text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${user.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.verified ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(user)} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button onClick={() => handleToggleVerified(user)} className="p-1 hover:bg-gray-100 rounded">
                        {user.verified ? <Lock className="w-4 h-4 text-yellow-600" /> : <Unlock className="w-4 h-4 text-green-600" />}
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-1 hover:bg-gray-100 rounded">
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

      {/* Role-Based Access Control */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#2B5EA6]" />
          <h3 className="text-gray-800 font-medium">Role-Based Access Control</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(PERMISSIONS).map(role => (
            <button key={role} onClick={() => setSelectedRole(selectedRole === role ? null : role)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${selectedRole === role ? 'border-[#2B5EA6] bg-[#2B5EA6] text-white' : 'border-gray-200 hover:border-[#2B5EA6] text-gray-600'}`}>
              {ROLE_LABELS[role] || role}
            </button>
          ))}
        </div>
        {selectedRole && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PERMISSIONS[selectedRole]?.map((perm, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-[#2B5EA6] rounded-full flex-shrink-0" />
                {perm}
              </div>
            ))}
          </div>
        )}
        {!selectedRole && <p className="text-sm text-gray-500">Click a role above to view its permissions.</p>}
      </div>

      {/* ── CREATE ACCOUNT MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Plus className="w-5 h-5 text-[#2B5EA6]" /> Create New Account</h3>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Account Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'petOwner', label: '🐾 Pet Owner', desc: 'Manage pets only' },
                    { value: 'livestockManager', label: '🐄 Livestock Manager', desc: 'Manage livestock only' },
                    { value: 'both', label: '🐾🐄 Both', desc: 'Pets & livestock' },
                    { value: 'bahw', label: '🏥 BAHW', desc: 'Barangay Animal Health Worker' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => handleRoleChange(opt.value)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${createData.role === opt.value ? 'border-[#2B5EA6] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Barangay — required for BAHW */}
              {(createData.role === 'bahw' || true) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay {createData.role === 'bahw' && <span className="text-red-500">*</span>}
                  </label>
                  <select value={createData.barangay} onChange={e => setCreateData(p => ({...p, barangay: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]">
                    <option value="">Select barangay...</option>
                    {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}

              {/* Basic Info */}
              {[
                { label: 'Full Name *', key: 'username', placeholder: 'Juan dela Cruz', type: 'text' },
                { label: 'Email Address *', key: 'email', placeholder: 'user@example.com', type: 'email' },
                { label: 'Phone Number', key: 'phone', placeholder: '09XXXXXXXXX', type: 'tel' },
                { label: 'Password *', key: 'password', placeholder: 'Min. 8 characters', type: 'password' },
                { label: 'Confirm Password *', key: 'confirmPassword', placeholder: 'Repeat password', type: 'password' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type}
                    value={(createData as any)[f.key]}
                    onChange={e => setCreateData(p => ({...p, [f.key]: e.target.value}))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]" />
                </div>
              ))}

              {/* Cross-access flags for pet/livestock owners */}
              {['petOwner','owner','livestockManager'].includes(createData.role) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-3">Cross-Access Permissions (CVO-granted)</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={createData.can_add_pets}
                        onChange={e => setCreateData(p => ({...p, can_add_pets: e.target.checked}))}
                        className="w-4 h-4 accent-[#2B5EA6]" />
                      <span className="text-sm text-gray-700">🐾 Allow adding/managing <strong>Pets</strong></span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={createData.can_add_livestock}
                        onChange={e => setCreateData(p => ({...p, can_add_livestock: e.target.checked}))}
                        className="w-4 h-4 accent-[#2B5EA6]" />
                      <span className="text-sm text-gray-700">🐄 Allow adding/managing <strong>Livestock</strong></span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t sticky bottom-0 bg-white">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] disabled:opacity-60">
                <Users className="w-4 h-4" /> {creating ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">Edit User</h3>
              <button onClick={() => setEditingUser(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Display Name</label>
                <input value={editData.username} onChange={e => setEditData(p => ({...p, username: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Role</label>
                <select value={editData.role} onChange={e => setEditData(p => ({...p, role: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]">
                  {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'superadmin').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Barangay Assignment</label>
                <select value={editData.barangay} onChange={e => setEditData(p => ({...p, barangay: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]">
                  <option value="">All Barangays</option>
                  {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="verified" checked={editData.verified} onChange={e => setEditData(p => ({...p, verified: e.target.checked}))} />
                <label htmlFor="verified" className="text-sm text-gray-700">Account Active / Verified</label>
              </div>
              {/* Cross-access flags */}
              {['petOwner','owner','livestockManager','both'].includes(editData.role) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-2">Cross-Access (CVO-granted)</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="checkbox" checked={editData.can_add_pets}
                        onChange={e => setEditData(p => ({...p, can_add_pets: e.target.checked}))}
                        className="w-4 h-4 accent-[#2B5EA6]" />
                      🐾 Allow managing Pets
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="checkbox" checked={editData.can_add_livestock}
                        onChange={e => setEditData(p => ({...p, can_add_livestock: e.target.checked}))}
                        className="w-4 h-4 accent-[#2B5EA6]" />
                      🐄 Allow managing Livestock
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85]">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-900 font-medium">ISO/IEC 27001 Information Security</p>
            <p className="text-sm text-yellow-700">All changes are audit-logged. Cross-access flags allow selected users to manage both pets and livestock as authorized by the CVO. Superadmin accounts are hidden for security.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
