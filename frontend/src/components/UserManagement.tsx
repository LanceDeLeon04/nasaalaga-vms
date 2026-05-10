import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Lock, Unlock, Shield } from 'lucide-react';

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const users = [
    { id: 1, username: 'admin01', name: 'Dr. Roberto Santos', role: 'Administrator', email: 'r.santos@calaca.gov.ph', barangay: 'All', status: 'Active', lastLogin: 'Dec 15, 2024 8:30 AM' },
    { id: 2, username: 'bahw_brgy1', name: 'Juan Dela Cruz', role: 'BAHW', email: 'j.delacruz@calaca.gov.ph', barangay: 'Barangay 1', status: 'Active', lastLogin: 'Dec 15, 2024 7:15 AM' },
    { id: 3, username: 'bahw_brgy2', name: 'Maria Santos', role: 'BAHW', email: 'm.santos@calaca.gov.ph', barangay: 'Barangay 2', status: 'Active', lastLogin: 'Dec 14, 2024 4:20 PM' },
    { id: 4, username: 'bahw_brgy3', name: 'Pedro Reyes', role: 'BAHW', email: 'p.reyes@calaca.gov.ph', barangay: 'Barangay 3', status: 'Active', lastLogin: 'Dec 15, 2024 6:45 AM' },
    { id: 5, username: 'bahw_brgy4', name: 'Ana Garcia', role: 'BAHW', email: 'a.garcia@calaca.gov.ph', barangay: 'Barangay 4', status: 'Inactive', lastLogin: 'Dec 10, 2024 2:30 PM' },
  ];

  const permissions = {
    admin: [
      'Full system access',
      'User management',
      'Approve/Reject applications',
      'Generate all reports',
      'System configuration',
      'Audit log access',
      'Budget management'
    ],
    bahw: [
      'Field data entry',
      'Livestock registration',
      'Vaccination recording',
      'Disease reporting',
      'View assigned barangay data',
      'Generate barangay reports'
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">User Management</h2>
          <p className="text-gray-600">Manage system users and access control (ISO 27001)</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors">
          <Plus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Users</p>
          <p className="text-gray-900">15</p>
          <p className="text-xs text-gray-600 mt-1">System-wide</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Administrators</p>
          <p className="text-gray-900">3</p>
          <p className="text-xs text-green-600 mt-1">All active</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">BAHW Users</p>
          <p className="text-gray-900">12</p>
          <p className="text-xs text-green-600 mt-1">11 active</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Active Sessions</p>
          <p className="text-gray-900">8</p>
          <p className="text-xs text-blue-600 mt-1">Currently logged in</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, username, email, or barangay..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-700">ID</th>
                <th className="text-left py-3 px-4 text-gray-700">Username</th>
                <th className="text-left py-3 px-4 text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-gray-700">Role</th>
                <th className="text-left py-3 px-4 text-gray-700">Email</th>
                <th className="text-left py-3 px-4 text-gray-700">Barangay</th>
                <th className="text-left py-3 px-4 text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-gray-700">Last Login</th>
                <th className="text-left py-3 px-4 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800">{user.id}</td>
                  <td className="py-3 px-4 text-gray-600">{user.username}</td>
                  <td className="py-3 px-4 text-gray-600">{user.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.role === 'Administrator'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4 text-gray-600">{user.barangay}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">{user.lastLogin}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button className="p-1 hover:bg-gray-100 rounded" title="Edit User">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title={user.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        {user.status === 'Active' ? (
                          <Lock className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <Unlock className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Delete User">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrator Permissions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-600" />
            <h3 className="text-gray-800">Administrator Permissions</h3>
          </div>
          <ul className="space-y-2">
            {permissions.admin.map((permission, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>{permission}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* BAHW Permissions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-gray-800">BAHW Permissions</h3>
          </div>
          <ul className="space-y-2">
            {permissions.bahw.map((permission, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{permission}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-900 mb-1">ISO/IEC 27001 Information Security</p>
            <p className="text-sm text-yellow-700">
              All user activities are logged and monitored. Access is restricted based on role assignments. 
              Password policies enforce strong authentication. Regular security audits are conducted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
