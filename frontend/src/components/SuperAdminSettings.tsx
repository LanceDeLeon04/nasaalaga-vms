import { useState, useEffect } from 'react';
import {
  Settings, Save, Plus, Trash2, Edit2, Database, Shield, AlertTriangle,
  Bell, Zap, Power, RefreshCw, X, CheckCircle
} from 'lucide-react';
import { RuleEnginePanel } from './RuleEnginePanel';
import { api } from '../lib/api';
import type { User } from '../App';

interface Props { user: User }
type Section = 'maintenance' | 'clearrecords' | 'thresholds' | 'recommendations' | 'rules' | 'database';

function OtpModal({ onConfirm, onCancel, userEmail }: { onConfirm: () => void; onCancel: () => void; userEmail: string }) {
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setSending(true); setError('');
    try { await api.sendOtp(userEmail); setStep('verify'); }
    catch (e: any) { setError(e.message || 'Failed to send OTP'); }
    setSending(false);
  };

  const handleVerify = async () => {
    if (!otp.trim()) { setError('Enter the OTP'); return; }
    setVerifying(true); setError('');
    try { await api.verifyOtp(userEmail, otp); onConfirm(); }
    catch { setError('Invalid or expired OTP'); }
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> Identity Verification</h2>
          <p className="text-red-100 text-sm mt-1">OTP confirmation required for this destructive action</p>
        </div>
        <div className="p-6">
          {step === 'send' ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-amber-800 text-sm font-semibold">This will permanently delete records</p>
                <p className="text-amber-700 text-sm mt-1">An OTP will be sent to your registered personal email.</p>
              </div>
              <p className="text-gray-600 text-sm mb-5">OTP will be sent to: <strong>{userEmail}</strong></p>
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleSend} disabled={sending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60">
                  {sending ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-4">Enter the OTP sent to <strong>{userEmail}</strong></p>
              <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="------" maxLength={6}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-red-400 outline-none mb-4" />
              {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
              <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleVerify} disabled={verifying} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60">
                  {verifying ? 'Verifying...' : 'Confirm & Clear'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SuperAdminSettings({ user }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('maintenance');
  const [settings, setSettings] = useState<any>(null);
  const [thresholds, setThresholds] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRec, setEditingRec] = useState<any>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [maintLoading, setMaintLoading] = useState(false);
  const [clearType, setClearType] = useState<'pets'|'livestock'|'all'|null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState('');

  // OTP is sent to personal email; API uses nexgov email
  const OTP_EMAIL_MAP: Record<string, string> = {
    'deleonlance@nexgov.ph': 'deleonlancewinalexandrei@gmail.com',
    'parkarel@nexgov.ph': '__karelannepar@gmail.com',
  };
  const userApiEmail = (user as any).email || '';
  const otpDisplayEmail = OTP_EMAIL_MAP[userApiEmail] || userApiEmail;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sRes, tRes, rRes, mRes] = await Promise.all([
        api.getAdminSettings(), api.getThresholds(), api.getRecommendations(), api.checkMaintenance()
      ]);
      setSettings(sRes.settings);
      setThresholds(tRes.thresholds);
      setRecommendations(rRes.recommendations || []);
      setMaintenance(mRes.maintenance || false);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const toggleMaintenance = async () => {
    setMaintLoading(true);
    try {
      await api.setMaintenance(!maintenance);
      setMaintenance(m => !m);
    } catch(e: any) { alert('Error: ' + e.message); }
    setMaintLoading(false);
  };

  const handleClearClick = (type: 'pets'|'livestock'|'all') => { setClearType(type); setShowOtp(true); };

  const handleClearConfirmed = async () => {
    if (!clearType) return;
    setShowOtp(false); setClearing(true);
    try {
      await api.clearRecords(clearType);
      setClearSuccess(`${clearType === 'all' ? 'All animal' : clearType} records cleared.`);
      setTimeout(() => setClearSuccess(''), 6000);
    } catch(e: any) { alert('Failed: ' + e.message); }
    setClearing(false); setClearType(null);
  };

  const saveThresholds = async () => {
    setSaving(true);
    try { await api.updateThresholds(thresholds); alert('Thresholds saved!'); }
    catch(e: any) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try { await api.updateAdminSettings(settings); alert('Settings saved!'); }
    catch(e: any) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const saveRec = async (rec: any) => {
    try {
      if (rec.id && recommendations.find(r => r.id === rec.id)) { await api.updateRecommendation(rec.id, rec); }
      else { await api.createRecommendation(rec); }
      const res = await api.getRecommendations();
      setRecommendations(res.recommendations || []);
      setEditingRec(null);
    } catch(e: any) { alert('Error: ' + e.message); }
  };

  const deleteRec = async (id: string) => {
    if (!confirm('Delete this recommendation?')) return;
    try { await api.deleteRecommendation(id); setRecommendations(r => r.filter(x => x.id !== id)); }
    catch(e: any) { alert('Error: ' + e.message); }
  };

  const navItems = [
    { id: 'maintenance' as Section, label: 'Maintenance Mode', icon: Power, desc: 'Lock system access' },
    { id: 'clearrecords' as Section, label: 'Clear Records', icon: Trash2, desc: 'Delete animal data + OTP' },
    { id: 'thresholds' as Section, label: 'Alert Thresholds', icon: AlertTriangle, desc: 'Configure alert limits' },
    { id: 'recommendations' as Section, label: 'Recommendations', icon: Bell, desc: 'Manage action items' },
    { id: 'rules' as Section, label: 'Rules Engine', icon: Zap, desc: 'Smart decision rules' },
    { id: 'database' as Section, label: 'System Settings', icon: Database, desc: 'General configuration' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1a3a6e] to-[#2B5EA6] rounded-2xl p-6 text-white flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Shield className="w-6 h-6" /></div>
        <div>
          <h1 className="text-xl font-black">SuperAdmin Control Panel</h1>
          <p className="text-blue-200 text-sm">Full system access · {user.username}</p>
        </div>
      </div>

      {showOtp && clearType && (
        <OtpModal userEmail={userApiEmail || 'deleonlance@nexgov.ph'} onConfirm={handleClearConfirmed} onCancel={() => { setShowOtp(false); setClearType(null); }} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Nav */}
        <div className="lg:col-span-1 space-y-2">
          {navItems.map(({ id, label, icon: Icon, desc }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${activeSection === id ? 'bg-[#2B5EA6] text-white border-[#2B5EA6] shadow-lg' : 'bg-white text-gray-700 border-gray-100 hover:border-[#2B5EA6]/40 hover:bg-blue-50'}`}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 ${activeSection === id ? 'text-white' : 'text-[#2B5EA6]'}`} />
                <div>
                  <p className={`text-sm font-semibold ${activeSection === id ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                  <p className={`text-xs ${activeSection === id ? 'text-blue-200' : 'text-gray-500'}`}>{desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">

          {/* MAINTENANCE */}
          {activeSection === 'maintenance' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><Power className="w-5 h-5" /> Maintenance Mode</h2>
                <p className="text-slate-400 text-sm mt-1">When enabled, only SuperAdmins can log in</p>
              </div>
              <div className="p-8">
                <div className={`rounded-2xl border-2 p-8 text-center transition-all ${maintenance ? 'border-amber-400 bg-amber-50' : 'border-green-400 bg-green-50'}`}>
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${maintenance ? 'bg-amber-100' : 'bg-green-100'}`}>
                    <Power className={`w-10 h-10 ${maintenance ? 'text-amber-600' : 'text-green-600'}`} />
                  </div>
                  <h3 className={`text-2xl font-black mb-2 ${maintenance ? 'text-amber-700' : 'text-green-700'}`}>
                    {maintenance ? 'System Under Maintenance' : 'System Online'}
                  </h3>
                  <p className={`text-sm mb-6 max-w-md mx-auto ${maintenance ? 'text-amber-600' : 'text-green-600'}`}>
                    {maintenance
                      ? 'Non-superadmin users see a maintenance notice page and cannot log in. SuperAdmins remain fully operational.'
                      : 'All authorized users can log in normally. System is fully operational.'}
                  </p>
                  <button onClick={toggleMaintenance} disabled={maintLoading}
                    className={`px-8 py-3 rounded-2xl font-bold text-white text-sm shadow-lg disabled:opacity-60 transition-all ${maintenance ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                    {maintLoading
                      ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Updating...</span>
                      : maintenance ? 'Restore System Access' : 'Enable Maintenance Mode'}
                  </button>
                </div>
                <div className="mt-6 bg-gray-50 rounded-xl p-5 space-y-2">
                  <h4 className="font-bold text-gray-700 text-sm mb-3">What happens in Maintenance Mode:</h4>
                  {[
                    ['Lock', 'Admin, BAHW, and pet owners see a maintenance page and cannot log in'],
                    ['Crown', 'SuperAdmins can still log in with full access to all features'],
                    ['Flash', 'Changes take effect immediately — no restart needed'],
                    ['Info', 'A professional animated maintenance UI is shown to blocked users'],
                  ].map(([icon, text], i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <span className="text-lg">{icon}</span><span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CLEAR RECORDS */}
          {activeSection === 'clearrecords' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-red-700 to-red-800 px-6 py-5">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><Trash2 className="w-5 h-5" /> Clear Animal Records</h2>
                <p className="text-red-200 text-sm mt-1">Permanently delete pet and/or livestock data — OTP verification required</p>
              </div>
              <div className="p-6 space-y-4">
                {clearSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
                    <CheckCircle className="w-5 h-5" /><span className="text-sm font-semibold">{clearSuccess}</span>
                  </div>
                )}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-800 text-sm font-bold">Danger Zone — these actions are irreversible</p>
                  <p className="text-red-600 text-xs mt-1">OTP is sent to the personal email on file (not nexgov email).</p>
                </div>
                {([
                  { type: 'pets' as const, icon: 'pets', label: 'Clear Pet Records', desc: 'Deletes all pet registrations, pre-registrations, and lost/found reports.', color: 'orange' },
                  { type: 'livestock' as const, icon: 'livestock', label: 'Clear Livestock Records', desc: 'Deletes all livestock registrations.', color: 'orange' },
                  { type: 'all' as const, icon: 'trash', label: 'Clear ALL Animal Records', desc: 'Deletes ALL pets and livestock. Full animal database reset. Cannot be undone.', color: 'red' },
                ]).map(({ type, icon, label, desc, color }) => (
                  <div key={type} className={`border-2 rounded-xl p-5 flex items-center justify-between gap-4 ${color === 'red' ? 'border-red-200 bg-red-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{icon}</span>
                      <div>
                        <p className={`font-bold text-sm ${color === 'red' ? 'text-red-800' : 'text-orange-800'}`}>{label}</p>
                        <p className={`text-xs mt-1 ${color === 'red' ? 'text-red-600' : 'text-orange-600'}`}>{desc}</p>
                      </div>
                    </div>
                    <button onClick={() => handleClearClick(type)} disabled={clearing}
                      className={`flex-shrink-0 px-5 py-2 rounded-xl text-white text-sm font-bold shadow disabled:opacity-60 ${color === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                      {clearing && clearType === type ? 'Clearing...' : 'Clear'}
                    </button>
                  </div>
                ))}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-800 text-sm font-semibold mb-2">OTP Delivery Addresses:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• <span className="font-mono">deleonlance@nexgov.ph</span> → OTP to <strong>deleonlancewinalexandrei@gmail.com</strong></li>
                    <li>• <span className="font-mono">parkarel@nexgov.ph</span> → OTP to <strong>__karelannepar@gmail.com</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* THRESHOLDS */}
          {activeSection === 'thresholds' && thresholds && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Alert Thresholds</h2>
              </div>
              <div className="p-6 space-y-5">
                {[
                  { title: 'Livestock', key: 'livestock', color: 'blue', fields: [
                    { k: 'criticalPopulationDrop', label: 'Critical Population Drop (%)' },
                    { k: 'warningPopulationDrop', label: 'Warning Population Drop (%)' },
                    { k: 'highDensityThreshold', label: 'High Density Threshold (heads)' },
                    { k: 'lowVaccinationRate', label: 'Low Vaccination Rate (%)' },
                  ]},
                  { title: 'Pets', key: 'pets', color: 'green', fields: [
                    { k: 'unvaccinatedThreshold', label: 'Unvaccinated Alert Threshold (%)' },
                    { k: 'registrationTarget', label: 'Registration Target (%)' },
                    { k: 'missingSpikeThreshold', label: 'Missing Reports Spike Count' },
                  ]},
                  { title: 'Outbreak', key: 'outbreak', color: 'red', fields: [
                    { k: 'casesForWarning', label: 'Cases for Warning Alert' },
                    { k: 'casesForCritical', label: 'Cases for Critical Alert' },
                  ]},
                ].map(({ title, key, color, fields }) => (
                  <div key={key} className={`border rounded-xl p-5 ${color==='blue'?'border-blue-100 bg-blue-50/30':color==='green'?'border-green-100 bg-green-50/30':'border-red-100 bg-red-50/30'}`}>
                    <h3 className={`font-bold text-sm mb-4 ${color==='blue'?'text-blue-800':color==='green'?'text-green-800':'text-red-800'}`}>{title} Thresholds</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {fields.map(({ k, label }) => (
                        <div key={k}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                          <input type="number" value={thresholds[key]?.[k] || 0}
                            onChange={e => setThresholds((t: any) => ({ ...t, [key]: { ...t[key], [k]: parseInt(e.target.value)||0 } }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button onClick={saveThresholds} disabled={saving}
                    className="flex items-center gap-2 bg-[#2B5EA6] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#2B5EA6]/90 disabled:opacity-60">
                    <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Thresholds'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RECOMMENDATIONS */}
          {activeSection === 'recommendations' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><Bell className="w-5 h-5" /> Recommendations</h2>
                <button onClick={() => setEditingRec({ title:'', priority:'Medium', status:'Active', category:'Vaccination', description:'' })}
                  className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/30">
                  <Plus className="w-4 h-4" /> New
                </button>
              </div>
              <div className="p-6 space-y-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm text-gray-900 truncate">{rec.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rec.priority==='Critical'?'bg-red-100 text-red-700':rec.priority==='High'?'bg-orange-100 text-orange-700':rec.priority==='Medium'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-600'}`}>{rec.priority}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${rec.status==='Active'?'bg-green-100 text-green-700':rec.status==='Pending'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-500'}`}>{rec.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{rec.category}{rec.description ? ' · ' + rec.description.slice(0,80)+'…' : ''}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingRec(rec)} className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteRec(rec.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {recommendations.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No recommendations yet</div>}
              </div>
            </div>
          )}

          {/* RULES ENGINE */}
          {activeSection === 'rules' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#1a3a6e] to-[#2B5EA6] px-6 py-5">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><Zap className="w-5 h-5" /> Rules Engine</h2>
                <p className="text-blue-200 text-sm mt-1">Real-time evaluation against live database data</p>
              </div>
              <div className="p-6">
                <RuleEnginePanel currentUser={{ username: user.username, role: user.role! }} />
              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS */}
          {activeSection === 'database' && settings && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-5">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><Database className="w-5 h-5" /> System Settings</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'System Name', key: 'systemName' },
                    { label: 'City', key: 'city' },
                    { label: 'Province', key: 'province' },
                    { label: 'Backup Frequency', key: 'backupFrequency' },
                    { label: 'Session Timeout (min)', key: 'sessionTimeout', type: 'number' },
                    { label: 'Max Login Attempts', key: 'maxLoginAttempts', type: 'number' },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                      <input type={type||'text'} value={settings[key]||''}
                        onChange={e => setSettings((s: any) => ({ ...s, [key]: type==='number' ? parseInt(e.target.value)||0 : e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Email Notifications', key: 'emailNotifications' },
                    { label: 'SMS Notifications', key: 'smsNotifications' },
                    { label: 'Auto Backup', key: 'autoBackup' },
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <span className="text-sm font-semibold text-gray-700">{label}</span>
                      <button onClick={() => setSettings((s: any) => ({ ...s, [key]: !s[key] }))}
                        className={`relative w-12 h-6 rounded-full transition-all ${settings[key] ? 'bg-[#60A85C]' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings[key] ? 'left-6' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button onClick={saveSettings} disabled={saving}
                    className="flex items-center gap-2 bg-gray-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-900 disabled:opacity-60">
                    <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Recommendation Modal */}
      {editingRec && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editingRec.id ? 'Edit' : 'New'} Recommendation</h3>
              <button onClick={() => setEditingRec(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
                <input value={editingRec.title} onChange={e => setEditingRec((r: any) => ({...r, title: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                  <select value={editingRec.priority} onChange={e => setEditingRec((r: any) => ({...r, priority: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                    {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={editingRec.status} onChange={e => setEditingRec((r: any) => ({...r, status: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                    {['Active','Pending','Resolved'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <input value={editingRec.category} onChange={e => setEditingRec((r: any) => ({...r, category: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea value={editingRec.description||''} onChange={e => setEditingRec((r: any) => ({...r, description: e.target.value}))}
                  rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setEditingRec(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => saveRec(editingRec)} className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
