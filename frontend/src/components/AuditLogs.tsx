import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, AlertCircle, CheckCircle, Edit, Trash2, Eye, LogIn, Settings, Shield, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayTotal: 0, failedLogins: 0, modifications: 0, recentAlerts: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.getAuditLogs({ action: filterAction !== 'all' ? filterAction : undefined, search: searchTerm || undefined, limit: 300 }),
        api.getAuditLogStats(),
      ]);
      let filtered = logsRes.logs || [];
      if (dateFrom) filtered = filtered.filter((l: any) => new Date(l.created_at) >= new Date(dateFrom));
      if (dateTo) filtered = filtered.filter((l: any) => new Date(l.created_at) <= new Date(dateTo + 'T23:59:59'));
      setLogs(filtered);
      setStats(statsRes);
    } catch (err: any) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filterAction, searchTerm, dateFrom, dateTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleExport = () => {
    const csv = [
      ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Resource', 'Resource ID', 'Details', 'IP Address'],
      ...logs.map(l => [
        l.id, new Date(l.created_at).toLocaleString('en-PH'),
        l.username || 'Unknown', l.user_role || '-',
        l.action, l.resource || '-', l.resource_id || '-',
        typeof l.details === 'object' ? JSON.stringify(l.details) : (l.details || '-'),
        l.ip_address || '-',
      ])
    ].map(r => r.map((v: any) => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Audit logs exported');
  };

  const getActionIcon = (action: string) => {
    switch (action?.toLowerCase()) {
      case 'create': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'update': case 'approve': case 'respond': return <Edit className="w-4 h-4 text-blue-600" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'view': return <Eye className="w-4 h-4 text-gray-600" />;
      case 'login': return <LogIn className="w-4 h-4 text-purple-600" />;
      case 'login failed': return <Shield className="w-4 h-4 text-red-600" />;
      case 'upload': return <Settings className="w-4 h-4 text-teal-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    const base = 'px-2 py-0.5 text-xs rounded font-medium';
    const map: Record<string, string> = {
      'Create': `${base} bg-green-100 text-green-800`,
      'Update': `${base} bg-blue-100 text-blue-800`,
      'Delete': `${base} bg-red-100 text-red-800`,
      'Login': `${base} bg-purple-100 text-purple-800`,
      'Login Failed': `${base} bg-red-100 text-red-800`,
      'View': `${base} bg-gray-100 text-gray-800`,
      'Approve': `${base} bg-cyan-100 text-cyan-800`,
      'Upload': `${base} bg-teal-100 text-teal-800`,
      'Respond': `${base} bg-indigo-100 text-indigo-800`,
    };
    return map[action] || `${base} bg-gray-100 text-gray-700`;
  };

  const formatDetails = (details: any) => {
    if (!details) return '-';
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch { return details; }
    }
    if (typeof details === 'object') {
      const entries = Object.entries(details).slice(0, 3);
      return entries.map(([k, v]) => `${k}: ${v}`).join(' | ') || '-';
    }
    return String(details);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">Audit Logs</h2>
          <p className="text-gray-600">Real-time system activity tracking — ISO 27001 Compliance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadLogs} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Activities Today</p>
          <p className="text-2xl font-bold text-gray-900">{stats.todayTotal}</p>
          <p className="text-xs text-green-600 mt-1">↑ Live from database</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Failed Logins (Today)</p>
          <p className="text-2xl font-bold text-gray-900">{stats.failedLogins}</p>
          <p className={`text-xs mt-1 ${stats.failedLogins > 5 ? 'text-red-600' : 'text-yellow-600'}`}>
            {stats.failedLogins > 5 ? '⚠ High — investigate' : stats.failedLogins > 0 ? 'Monitor' : '✓ All clear'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Data Modifications</p>
          <p className="text-2xl font-bold text-gray-900">{stats.modifications}</p>
          <p className="text-xs text-blue-600 mt-1">Create/Update/Delete actions</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Security Alerts</p>
          <p className="text-2xl font-bold text-gray-900">{stats.recentAlerts}</p>
          <p className={`text-xs mt-1 ${stats.recentAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stats.recentAlerts > 0 ? '⚠ Failed logins last hour' : '✓ All clear'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search by user, action, resource, or details..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]" />
          </div>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]">
            <option value="all">All Actions</option>
            <option value="Create">Create</option>
            <option value="Update">Update</option>
            <option value="Delete">Delete</option>
            <option value="View">View</option>
            <option value="Login">Login</option>
            <option value="Login Failed">Login Failed</option>
            <option value="Approve">Approve</option>
            <option value="Upload">Upload</option>
            <option value="Respond">Respond</option>
          </select>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]" />
            <span className="text-gray-500 text-sm">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]" />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="text-sm text-gray-600">{loading ? 'Loading...' : `${logs.length} records found`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-700">Timestamp</th>
                <th className="text-left py-3 px-4 text-gray-700">User</th>
                <th className="text-left py-3 px-4 text-gray-700">Role</th>
                <th className="text-left py-3 px-4 text-gray-700">Action</th>
                <th className="text-left py-3 px-4 text-gray-700">Resource</th>
                <th className="text-left py-3 px-4 text-gray-700">Details</th>
                <th className="text-left py-3 px-4 text-gray-700">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500">Loading audit logs from database...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500">No audit logs found matching your criteria.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className={`border-b hover:bg-gray-50 ${log.action === 'Login Failed' ? 'bg-red-50/30' : ''}`}>
                    <td className="py-3 px-4 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-PH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-gray-700 font-medium">{log.username || 'Unknown'}</td>
                    <td className="py-3 px-4">
                      {log.user_role && (
                        <span className={`px-1.5 py-0.5 text-xs rounded ${log.user_role==='superadmin'?'bg-purple-100 text-purple-800':log.user_role==='admin'?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-700'}`}>
                          {log.user_role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className={getActionBadge(log.action)}>{log.action}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {log.resource}{log.resource_id ? <span className="text-xs text-gray-400 ml-1">#{log.resource_id}</span> : ''}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs max-w-xs truncate" title={formatDetails(log.details)}>
                      {formatDetails(log.details)}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs font-mono">{log.ip_address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium">ISO/IEC 27001 Audit Trail Compliance</p>
            <p className="text-sm text-blue-700">
              All system activities are automatically logged with timestamps, user information, and IP addresses.
              Logs are drawn directly from the database in real-time. Unauthorized access attempts are flagged.
              Logs are retained for 2 years per security policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
