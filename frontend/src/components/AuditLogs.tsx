import { useState } from 'react';
import { Search, Filter, Download, AlertCircle, CheckCircle, Edit, Trash2, Eye } from 'lucide-react';

export function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  const auditLogs = [
    { id: 1, timestamp: 'Dec 15, 2024 8:45:23 AM', user: 'admin01', action: 'Create', module: 'Livestock Registration', details: 'Created livestock record LS-006', ipAddress: '192.168.1.100', status: 'Success' },
    { id: 2, timestamp: 'Dec 15, 2024 8:30:15 AM', user: 'bahw_brgy1', action: 'Update', module: 'Rabies Vaccination', details: 'Updated vaccination record RAB-2024-1533', ipAddress: '192.168.1.105', status: 'Success' },
    { id: 3, timestamp: 'Dec 15, 2024 8:15:42 AM', user: 'admin01', action: 'Approve', module: 'VHC Issuance', details: 'Approved VHC application VHC-2024-1202', ipAddress: '192.168.1.100', status: 'Success' },
    { id: 4, timestamp: 'Dec 15, 2024 7:55:30 AM', user: 'bahw_brgy3', action: 'Create', module: 'Outbreak Monitoring', details: 'Reported ASF case OUT-002', ipAddress: '192.168.1.108', status: 'Success' },
    { id: 5, timestamp: 'Dec 15, 2024 7:40:18 AM', user: 'bahw_brgy2', action: 'View', module: 'Reports', details: 'Generated livestock inventory report', ipAddress: '192.168.1.106', status: 'Success' },
    { id: 6, timestamp: 'Dec 15, 2024 7:25:55 AM', user: 'admin01', action: 'Delete', module: 'User Management', details: 'Deleted inactive user account', ipAddress: '192.168.1.100', status: 'Success' },
    { id: 7, timestamp: 'Dec 15, 2024 7:10:33 AM', user: 'bahw_brgy1', action: 'Login', module: 'Authentication', details: 'User logged in successfully', ipAddress: '192.168.1.105', status: 'Success' },
    { id: 8, timestamp: 'Dec 14, 2024 11:45:20 PM', user: 'unknown', action: 'Login', module: 'Authentication', details: 'Failed login attempt - Invalid credentials', ipAddress: '203.125.45.78', status: 'Failed' },
    { id: 9, timestamp: 'Dec 14, 2024 6:30:12 PM', user: 'admin01', action: 'Update', module: 'System Settings', details: 'Updated backup schedule configuration', ipAddress: '192.168.1.100', status: 'Success' },
    { id: 10, timestamp: 'Dec 14, 2024 5:15:45 PM', user: 'bahw_brgy4', action: 'Create', module: 'Livestock Registration', details: 'Created livestock record LS-005', ipAddress: '192.168.1.109', status: 'Success' },
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Create':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Update':
      case 'Approve':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'Delete':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'View':
        return <Eye className="w-4 h-4 text-gray-600" />;
      case 'Login':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">Audit Logs</h2>
          <p className="text-gray-600">Track all system activities and user actions (ISO 27001 Compliance)</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Activities Today</p>
          <p className="text-gray-900">127</p>
          <p className="text-xs text-green-600 mt-1">Normal activity</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Failed Login Attempts</p>
          <p className="text-gray-900">3</p>
          <p className="text-xs text-yellow-600 mt-1">Low risk</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Data Modifications</p>
          <p className="text-gray-900">45</p>
          <p className="text-xs text-blue-600 mt-1">All authorized</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Security Alerts</p>
          <p className="text-gray-900">0</p>
          <p className="text-xs text-green-600 mt-1">All clear</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs by user, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="view">View</option>
            <option value="login">Login</option>
            <option value="approve">Approve</option>
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="admin">Administrators</option>
            <option value="bahw">BAHW</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            Date Range
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-700">ID</th>
                <th className="text-left py-3 px-4 text-gray-700">Timestamp</th>
                <th className="text-left py-3 px-4 text-gray-700">User</th>
                <th className="text-left py-3 px-4 text-gray-700">Action</th>
                <th className="text-left py-3 px-4 text-gray-700">Module</th>
                <th className="text-left py-3 px-4 text-gray-700">Details</th>
                <th className="text-left py-3 px-4 text-gray-700">IP Address</th>
                <th className="text-left py-3 px-4 text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800">{log.id}</td>
                  <td className="py-3 px-4 text-gray-600 text-sm">{log.timestamp}</td>
                  <td className="py-3 px-4 text-gray-600">{log.user}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-gray-700">{log.action}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{log.module}</td>
                  <td className="py-3 px-4 text-gray-600 text-sm">{log.details}</td>
                  <td className="py-3 px-4 text-gray-600 text-sm">{log.ipAddress}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      log.status === 'Success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-900 mb-1">ISO/IEC 27001 Audit Trail Compliance</p>
            <p className="text-sm text-blue-700">
              All system activities are automatically logged with timestamps, user information, and IP addresses. 
              Logs are retained for 2 years as per security policy. Unauthorized access attempts are flagged and investigated. 
              Regular audit reviews are conducted monthly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
