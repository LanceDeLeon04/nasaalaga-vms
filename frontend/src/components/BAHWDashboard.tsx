import { useState, useEffect } from 'react';
import { LivestockPreRegistration } from './LivestockPreRegistration';
import { MyProfile } from './MyProfile';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { LivestockManagement } from './LivestockManagement';
import { PetRegistration } from './PetRegistration';
import { PetPreRegistration } from './PetPreRegistration';
import { VaccinationModule } from './VaccinationModule';
import { OutbreakMonitoring } from './OutbreakMonitoring';
import { VeterinaryServices } from './VeterinaryServices';
import { ReportsCertificates } from './ReportsCertificates';
import { FeedbackComplaints } from './FeedbackComplaints';
import { CVOServicesShared } from './CVOServicesShared';
import { PreRegisteredPets } from './PreRegisteredPets';
import { Footer } from './Footer';
import { ScheduleModule } from './ScheduleModule';
import { PreRegistrationModule } from './PreRegistrationModule';
import { api } from '../lib/api';
import { toast } from 'sonner';
import type { User } from '../App';
import type { ActiveView } from './AdminDashboard';
import { PawPrint, Beef, Syringe, AlertTriangle, CheckCircle, Clock, MapPin, TrendingUp, RefreshCw } from 'lucide-react';

interface BAHWDashboardProps {
  user: User;
  onLogout: () => void;
}

// ── Barangay Stats Dashboard for BAHW ─────────────────────────────────────
function BAHWBarangayDashboard({ barangay }: { barangay: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preRegs, setPreRegs] = useState<any[]>([]);
  const [livestock, setLivestock] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('nasaalaga_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [petsRes, livestockRes, alertsRes, preRegRes] = await Promise.allSettled([
        fetch(`/api/pets?barangay=${encodeURIComponent(barangay)}`, { headers } as any).then(r => r.json()),
        fetch(`/api/livestock?barangay=${encodeURIComponent(barangay)}`, { headers } as any).then(r => r.json()),
        fetch('/api/statistics/disease-alerts', { headers } as any).then(r => r.json()),
        fetch(`/api/pets/pre-registered`, { headers } as any).then(r => r.json()),
      ]);

      const pets = petsRes.status === 'fulfilled' ? (petsRes.value.pets || []) : [];
      const ls = livestockRes.status === 'fulfilled' ? (livestockRes.value.livestock || []) : [];
      const alertList = alertsRes.status === 'fulfilled' ? (alertsRes.value.alerts || []) : [];
      const preRegList = preRegRes.status === 'fulfilled' ? (preRegRes.value.preRegistrations || []) : [];

      const vaccinated = pets.filter((p: any) => p.vaccination_status === 'Vaccinated' || p.vaccinationStatus === 'Vaccinated').length;
      const vaxRate = pets.length > 0 ? Math.round((vaccinated / pets.length) * 100) : 0;

      setStats({
        totalPets: pets.length,
        vaccinated,
        unvaccinated: pets.length - vaccinated,
        vaxRate,
        totalLivestock: ls.reduce((s: number, l: any) => s + (parseInt(l.quantity) || 0), 0),
        livestockRecords: ls.length,
        healthyLivestock: ls.filter((l: any) => l.health_status === 'Healthy').length,
      });
      setLivestock(ls.slice(0, 5));
      setAlerts(alertList.filter((a: any) => !barangay || a.barangay === barangay || !a.barangay).slice(0, 4));
      setPreRegs(preRegList.filter((p: any) => !barangay || p.barangay === barangay));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [barangay]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
        <div style={{ width: 32, height: 32, border: '4px solid #2B5EA6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#6b7280', fontSize: 14 }}>Loading barangay data…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const StatCard = ({ icon, label, value, sub, color }: any) => (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 900, color: '#1f2937', margin: 0 }}>{value}</p>
        <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: color, fontWeight: 700, margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ space: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1f2937', margin: 0 }}>
            <MapPin style={{ display: 'inline', width: 20, height: 20, color: '#2B5EA6', marginRight: 6, verticalAlign: 'middle' }} />
            Brgy. {barangay} Dashboard
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Your assigned barangay — real-time overview</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard icon={<PawPrint style={{ width: 22, height: 22, color: '#2B5EA6' }} />} label="Registered Pets" value={stats?.totalPets ?? '—'} color="#2B5EA6" />
        <StatCard icon={<Syringe style={{ width: 22, height: 22, color: '#16a34a' }} />} label="Vaccinated Pets" value={stats?.vaccinated ?? '—'} sub={`${stats?.vaxRate ?? 0}% coverage`} color="#16a34a" />
        <StatCard icon={<AlertTriangle style={{ width: 22, height: 22, color: '#d97706' }} />} label="Unvaccinated" value={stats?.unvaccinated ?? '—'} sub="Need vaccination" color="#d97706" />
        <StatCard icon={<Beef style={{ width: 22, height: 22, color: '#7c3aed' }} />} label="Livestock (head)" value={stats?.totalLivestock ?? '—'} sub={`${stats?.livestockRecords ?? 0} records`} color="#7c3aed" />
      </div>

      {/* Vaccination Coverage Bar */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp style={{ width: 18, height: 18, color: '#2B5EA6' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1f2937' }}>Vaccination Coverage</span>
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, color: stats?.vaxRate >= 70 ? '#16a34a' : stats?.vaxRate >= 40 ? '#d97706' : '#dc2626' }}>
            {stats?.vaxRate ?? 0}%
          </span>
        </div>
        <div style={{ background: '#f3f4f6', borderRadius: 50, height: 14, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 50,
            width: `${stats?.vaxRate ?? 0}%`,
            background: stats?.vaxRate >= 70 ? '#16a34a' : stats?.vaxRate >= 40 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#6b7280' }}>
          <span>Target: 80%</span>
          <span style={{ color: stats?.vaxRate >= 80 ? '#16a34a' : '#d97706', fontWeight: 700 }}>
            {stats?.vaxRate >= 80 ? '✅ Target Met' : `${80 - (stats?.vaxRate ?? 0)}% to target`}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Pre-registrations */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock style={{ width: 16, height: 16, color: '#f59e0b' }} />
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1f2937' }}>Pending Pre-Registrations</span>
          </div>
          {preRegs.filter(p => p.status === 'Pending').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13 }}>
              <CheckCircle style={{ width: 28, height: 28, margin: '0 auto 8px', display: 'block', color: '#16a34a' }} />
              No pending pre-registrations
            </div>
          ) : preRegs.filter(p => p.status === 'Pending').slice(0, 4).map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
              <div>
                <p style={{ fontWeight: 700, color: '#1f2937', margin: 0 }}>{p.pet_name}</p>
                <p style={{ color: '#6b7280', margin: 0, fontSize: 12 }}>{p.owner_name} · {p.species}</p>
              </div>
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, alignSelf: 'center' }}>Pending</span>
            </div>
          ))}
          {preRegs.filter(p => p.status === 'Pending').length > 4 && (
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, fontWeight: 600 }}>+{preRegs.filter(p => p.status === 'Pending').length - 4} more pending</p>
          )}
        </div>

        {/* Alerts */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#ef4444' }} />
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1f2937' }}>Disease Alerts</span>
          </div>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13 }}>
              <CheckCircle style={{ width: 28, height: 28, margin: '0 auto 8px', display: 'block', color: '#16a34a' }} />
              No active alerts
            </div>
          ) : alerts.map((a: any, i: number) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
              <p style={{ fontWeight: 700, color: '#dc2626', margin: 0 }}>{a.disease || a.alert_type}</p>
              <p style={{ color: '#6b7280', margin: 0, fontSize: 12 }}>{a.barangay || 'General'} · {a.severity || 'Alert'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Livestock summary */}
      {livestock.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Beef style={{ width: 16, height: 16, color: '#7c3aed' }} />
            <span style={{ fontWeight: 800, fontSize: 14, color: '#1f2937' }}>Recent Livestock Records</span>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['Animal Type','Owner','Qty','Health','Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#9ca3af', fontSize: 11, fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {livestock.map((l: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#1f2937' }}>{l.animal_type}</td>
                    <td style={{ padding: '8px', color: '#6b7280' }}>{l.owner_name}</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{l.quantity}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ background: l.health_status === 'Healthy' ? '#dcfce7' : '#fee2e2', color: l.health_status === 'Healthy' ? '#166534' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {l.health_status}
                      </span>
                    </td>
                    <td style={{ padding: '8px', color: '#6b7280', fontSize: 12 }}>{l.farm_type || 'Backyard'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function BAHWDashboard({ user, onLogout }: BAHWDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const barangay = user.barangay || '';

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        // Show barangay-specific dashboard if barangay is assigned
        return barangay ? <BAHWBarangayDashboard barangay={barangay} /> : <DashboardOverview />;
      case 'livestock':
        return <LivestockManagement />;
      case 'rabies':
        return <PetRegistration userRole={user.role} />;
      case 'vaccination':
        return <VaccinationModule user={user} />;
      case 'preregistered':
        // BAHW sees combined pre-registration module
        return <PreRegistrationModule user={user} />;
      case 'livestock-prereg':
        return <PreRegistrationModule user={user} />;
      case 'pre-registration':
        return <PreRegistrationModule user={user} />;
      case 'schedule':
        return <ScheduleModule user={user} />;
      case 'outbreak':
        return <OutbreakMonitoring userRole={user.role} currentUser={{ username: user.username || user.email }} />;
      case 'services':
        return <CVOServicesShared userRole={user.role} />;
      case 'reports':
        return <ReportsCertificates />;
      case 'feedback':
        return <FeedbackComplaints userRole={user.role} />;
      case 'my-profile':
        return <MyProfile user={user} onUserUpdate={(u) => { const s = sessionStorage.getItem('nasaalaga_user'); if(s){try{const p=JSON.parse(s);Object.assign(p,u);sessionStorage.setItem('nasaalaga_user',JSON.stringify(p));window.dispatchEvent(new Event('nasaalaga_profile_updated'));}catch{}} }} />;
      default:
        return barangay ? <BAHWBarangayDashboard barangay={barangay} /> : <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} onProfileClick={() => setActiveView('my-profile')} />
      <div className="flex flex-1">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          userRole={user.role}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 p-6 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50">
          {renderContent()}
        </main>
      </div>
      <Footer />
    </div>
  );
}
