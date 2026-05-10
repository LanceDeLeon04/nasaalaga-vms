import React, { useState } from 'react';

export function DebugEnv() {
  const [usersData, setUsersData] = useState<any>(null);
  const [testEmailResult, setTestEmailResult] = useState<any>(null);
  const [testEmail, setTestEmail] = useState('');
  const [initResult, setInitResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = sessionStorage.getItem('nasaalaga_token');
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const testEmailSend = async () => {
    if (!testEmail) { alert('Please enter an email address'); return; }
    setLoading(true); setError(null); setTestEmailResult(null);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await response.json();
      setTestEmailResult(data);
      if (data.success && !data.fallbackMode) {
        alert(`✅ OTP email sent successfully! Check ${testEmail} inbox.`);
      } else if (data.fallbackMode) {
        alert(`⚠️ Email service not configured. Fallback OTP: ${data.otp}`);
      }
    } catch (err: any) {
      setError(err.message); setTestEmailResult({ error: err.message, success: false });
    } finally { setLoading(false); }
  };

  const checkUsers = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/users', { headers: authHeaders });
      const data = await response.json();
      setUsersData(data);
    } catch (err: any) {
      setError(err.message); setUsersData({ error: err.message });
    } finally { setLoading(false); }
  };

  const initializeDatabase = async () => {
    if (!confirm('This will re-run the database init endpoint. Continue?')) return;
    setLoading(true); setError(null); setInitResult(null);
    try {
      const response = await fetch('/api/init', { method: 'POST', headers: authHeaders });
      const data = await response.json();
      setInitResult(data);
      if (data.initialized) alert('✅ Database ready!');
    } catch (err: any) {
      setError(err.message); setInitResult({ error: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">📡 Connection Info</h3>
        <p className="text-sm text-blue-800"><strong>API Base:</strong> /api (proxied to backend)</p>
        <p className="text-sm text-blue-800 mt-1">Check browser console for detailed logs.</p>
      </div>

      {/* Init */}
      <div className="p-6 bg-orange-50 border-2 border-orange-300 rounded-lg">
        <h3 className="text-xl font-bold text-orange-900 mb-3">🗄️ Database Initialization</h3>
        <button onClick={initializeDatabase} disabled={loading}
          className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50">
          {loading ? '🔄 Working...' : '🚀 Check / Init Database'}
        </button>
        {initResult && (
          <div className={`mt-4 p-4 rounded-lg border-2 ${initResult.initialized ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <pre className="text-xs overflow-auto">{JSON.stringify(initResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Users */}
      <div className="p-6 bg-gray-50 border-2 border-gray-300 rounded-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-3">👥 Users Debug (Admin only)</h3>
        <button onClick={checkUsers} disabled={loading}
          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
          {loading ? '🔍 Loading...' : '🔍 Fetch Users'}
        </button>
        {usersData && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
            <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(usersData, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Test Email */}
      <div className="p-6 bg-gray-50 border-2 border-gray-300 rounded-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-3">📧 Test Email (OTP Send)</h3>
        <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
          placeholder="Enter email address"
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
        <button onClick={testEmailSend} disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {loading ? '📧 Sending...' : '📧 Send Test OTP'}
        </button>
        {testEmailResult && (
          <div className={`mt-4 p-4 rounded-lg border-2 ${testEmailResult.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <pre className="text-xs overflow-auto">{JSON.stringify(testEmailResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
