import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { LivestockManagement } from './LivestockManagement';
import { PetRegistration } from './PetRegistration';
import { PetPreRegistration } from './PetPreRegistration';
import { VaccinationModule } from './VaccinationModule';
import { OutbreakMonitoring } from './OutbreakMonitoring';
import { CVOServicesShared } from './CVOServicesShared';
import { ReportsCertificates } from './ReportsCertificates';
import { FeedbackComplaints } from './FeedbackComplaints';
import { MyProfile } from './MyProfile';
import { Footer } from './Footer';
import { api } from '../lib/api';
import type { User } from '../App';
import type { ActiveView } from './AdminDashboard';

interface BAHWDashboardProps {
  user: User;
  onLogout: () => void;
}

export function BAHWDashboard({ user, onLogout }: BAHWDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // BAHW-scoped barangay (from user profile)
  const barangay = (user as any).barangay || '';

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <BAHWBarangayDashboard user={user} barangay={barangay} />;
      case 'livestock':
        return <LivestockManagement barangayFilter={barangay} />;
      case 'rabies':
        return <PetRegistration userRole={user.role} barangayFilter={barangay} />;
      case 'vaccination':
        return <VaccinationModule user={user} />;
      case 'preregistered':
        return <PetPreRegistration ownerId={user.ownerId} ownerEmail={user.email} />;
      case 'outbreak':
        return <OutbreakMonitoring userRole={user.role} currentUser={{ username: user.username || user.email }} />;
      case 'services':
        return <CVOServicesShared userRole={user.role} />;
      case 'reports':
        return <ReportsCertificates />;
      case 'feedback':
        return <FeedbackComplaints userRole={user.role} />;
      case 'myprofile':
        return <MyProfile user={user} />;
      default:
        return <BAHWBarangayDashboard user={user} barangay={barangay} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} onProfileClick={() => setActiveView('myprofile')} />
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

// ── Barangay-scoped BAHW Dashboard ──────────────────────────────────────────
function BAHWBarangayDashboard({ user, barangay }: { user: User; barangay: string }) {
  const [tab, setTab] = useState<'summary' | 'pets' | 'livestock'>('summary');
  const [pets, setPets] = useState<any[]>([]);
  const [livestock, setLivestock] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = async () => {
    if (loaded) return;
    try {
      const [p, l] = await Promise.all([
        api.getPets(undefined).catch(() => ({ pets: [] })),
        api.getLivestock({ barangay }).catch(() => ({ livestock: [] })),
      ]);
      const myPets = (p.pets || []).filter((x: any) => !barangay || x.barangay === barangay);
      setPets(myPets);
      setLivestock(l.livestock || []);
    } catch {}
    setLoaded(true);
  };

  if (!loaded) load();

  const tabs = [
    { id: 'summary', label: '📊 Barangay Summary' },
    { id: 'pets', label: `🐾 Pets (${pets.length})` },
    { id: 'livestock', label: `🐄 Livestock (${livestock.length})` },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2B5EA6] to-[#60A85C] rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🏥</div>
          <div>
            <h2 className="text-xl font-bold">BAHW Dashboard</h2>
            <p className="text-white/80 text-sm">
              {barangay ? `Assigned: ${barangay}` : 'No barangay assigned — contact Admin'}
            </p>
            <p className="text-white/70 text-xs mt-1">{user.username}</p>
          </div>
        </div>
      </div>

      {!barangay && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          ⚠️ You do not have a barangay assigned yet. Please contact the Admin to assign your barangay.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Registered Pets', value: pets.length, color: '#2B5EA6', emoji: '🐾' },
          { label: 'Livestock Records', value: livestock.length, color: '#60A85C', emoji: '🐄' },
          { label: 'Vaccinated', value: pets.filter(p => p.vaccination_status === 'Vaccinated' || p.vaccinationStatus === 'Vaccinated').length, color: '#0891b2', emoji: '💉' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow p-5 text-center border-t-4" style={{ borderColor: s.color }}>
            <div className="text-3xl mb-1">{s.emoji}</div>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="flex border-b">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${tab === t.id ? 'bg-[#2B5EA6] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === 'summary' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Barangay Summary — {barangay || 'All'}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-600 font-semibold">Total Animals Registered</p>
                  <p className="text-2xl font-bold text-blue-800 mt-1">{pets.length + livestock.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-green-600 font-semibold">Vaccinated Pets</p>
                  <p className="text-2xl font-bold text-green-800 mt-1">
                    {pets.filter(p => p.vaccination_status === 'Vaccinated' || p.vaccinationStatus === 'Vaccinated').length}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-orange-600 font-semibold">Species Breakdown</p>
                  <div className="mt-1 text-xs text-orange-800">
                    {Object.entries(pets.reduce((acc: any, p) => { acc[p.species || 'Unknown'] = (acc[p.species || 'Unknown'] || 0) + 1; return acc; }, {})).map(([k, v]) => (
                      <div key={k}>{k}: {v as number}</div>
                    ))}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-purple-600 font-semibold">Livestock Types</p>
                  <div className="mt-1 text-xs text-purple-800">
                    {Object.entries(livestock.reduce((acc: any, l) => { acc[l.type || 'Unknown'] = (acc[l.type || 'Unknown'] || 0) + 1; return acc; }, {})).map(([k, v]) => (
                      <div key={k}>{k}: {v as number}</div>
                    ))}
                    {livestock.length === 0 && <p>No livestock recorded</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === 'pets' && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Pets in {barangay || 'your barangay'}</p>
              {pets.length === 0 ? <p className="text-gray-400 text-center py-8">No pets found</p> : (
                <div className="space-y-2">
                  {pets.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                      <span className="text-xl">{p.species === 'Dog' ? '🐕' : p.species === 'Cat' ? '🐈' : '🐾'}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{p.pet_name || p.petName}</p>
                        <p className="text-gray-500 text-xs">{p.species} · {p.breed} · Owner: {p.owner_name || p.ownerName}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.vaccination_status === 'Vaccinated' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.vaccination_status || p.vaccinationStatus || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'livestock' && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Livestock in {barangay || 'your barangay'}</p>
              {livestock.length === 0 ? <p className="text-gray-400 text-center py-8">No livestock found</p> : (
                <div className="space-y-2">
                  {livestock.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                      <span className="text-xl">🐄</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{l.tag_id || l.id}</p>
                        <p className="text-gray-500 text-xs">{l.type} · {l.breed} · Owner: {l.owner_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${l.health_status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {l.health_status || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
