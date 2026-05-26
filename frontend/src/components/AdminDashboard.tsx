import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MyProfile } from './MyProfile';
import { DashboardOverview } from './DashboardOverview';
import { LivestockManagement } from './LivestockManagement';
import { LivestockPreRegistration } from './LivestockPreRegistration';
import { PetRegistration } from './PetRegistration';
import { PreRegisteredPets } from './PreRegisteredPets';
import { OutbreakMonitoring } from './OutbreakMonitoring';
import { VeterinaryServices } from './VeterinaryServices';
import { CVOServicesShared } from './CVOServicesShared';
import { ReportsCertificates } from './ReportsCertificates';
import { UserManagement } from './UserManagement';
import { AuditLogs } from './AuditLogs';
import { FeedbackComplaints } from './FeedbackComplaints';
import { WildlifeTracking } from './WildlifeTracking';
import { SuperAdminSettings } from './SuperAdminSettings';
import { InventoryPage } from './InventoryPage';
import { VaccinationModule } from './VaccinationModule';
import { BudgetUtilization } from './BudgetUtilization';
import { Footer } from './Footer';
import { ErrorBoundary } from './ErrorBoundary';
import type { User } from '../App';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export type ActiveView =
  | 'dashboard' | 'livestock' | 'rabies' | 'preregistered'
  | 'outbreak'  | 'services'  | 'reports'| 'users'
  | 'audit'     | 'feedback'  | 'wildlife'| 'inventory'
  | 'vaccination'| 'settings' | 'budget' | 'livestock-prereg' | 'my-profile';

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    // Superadmin cannot access the 'settings' route directly from admin sidebar
    // They go through SuperAdminSettings component which is shown for superadmin only
    switch (activeView) {
      case 'dashboard':    return <DashboardOverview onNavigate={setActiveView} />;
      case 'livestock':    return <LivestockManagement />;
      case 'rabies':        return <PetRegistration userRole={user.role} />;
      case 'vaccination':   return <VaccinationModule user={user} />;
      case 'budget':        return <BudgetUtilization userRole={user.role} />;
      case 'preregistered': return <PreRegisteredPets />;
      case 'livestock-prereg': return <LivestockPreRegistration userRole={user.role} />;
      case 'my-profile': return <MyProfile user={user} onUserUpdate={(u) => { const s = sessionStorage.getItem('nasaalaga_user'); if(s){try{const p=JSON.parse(s);Object.assign(p,u);sessionStorage.setItem('nasaalaga_user',JSON.stringify(p));window.dispatchEvent(new Event('nasaalaga_profile_updated'));}catch{}} }} />;
      case 'outbreak':     return <OutbreakMonitoring userRole={user.role} currentUser={{ username: user.username || user.email }} />;
      case 'services':     return <CVOServicesShared userRole={user.role} />;
      case 'reports':      return <ReportsCertificates />;
      case 'users':        return <UserManagement currentUserRole={user.role} />;
      case 'audit':        return <AuditLogs />;
      case 'feedback':     return <FeedbackComplaints userRole={user.role} />;
      case 'wildlife':     return <WildlifeTracking />;
      case 'inventory':    return <InventoryPage userRole={user.role} />;
      case 'settings':
        // Only superadmin can access settings page
        if (user.role === 'superadmin') return <SuperAdminSettings user={user} />;
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="mb-4 flex justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
              <h2 className="text-xl font-bold text-gray-700">Access Restricted</h2>
              <p className="text-gray-500 mt-2">SuperAdmin access required for this section.</p>
            </div>
          </div>
        );
      default: return <DashboardOverview onNavigate={setActiveView} />;
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
          <ErrorBoundary key={activeView}>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
      <Footer />
    </div>
  );
}
