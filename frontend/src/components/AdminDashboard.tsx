import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { LivestockManagement } from './LivestockManagement';
import { PetRegistration } from './PetRegistration';
import { PreRegisteredPets } from './PreRegisteredPets';
import { OutbreakMonitoring } from './OutbreakMonitoring';
import { VeterinaryServices } from './VeterinaryServices';
import { ReportsCertificates } from './ReportsCertificates';
import { UserManagement } from './UserManagement';
import { AuditLogs } from './AuditLogs';
import { FeedbackComplaints } from './FeedbackComplaints';
import { WildlifeTracking } from './WildlifeTracking';
import { SuperAdminSettings } from './SuperAdminSettings';
import { InventoryPage } from './InventoryPage';
import { Footer } from './Footer';
import { ErrorBoundary } from './ErrorBoundary';
import type { User } from '../App';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export type ActiveView =
  | 'dashboard'
  | 'livestock'
  | 'rabies'
  | 'preregistered'
  | 'outbreak'
  | 'services'
  | 'reports'
  | 'users'
  | 'audit'
  | 'feedback'
  | 'wildlife'
  | 'inventory'
  | 'settings';

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    // Superadmin cannot access the 'settings' route directly from admin sidebar
    // They go through SuperAdminSettings component which is shown for superadmin only
    switch (activeView) {
      case 'dashboard':    return <DashboardOverview />;
      case 'livestock':    return <LivestockManagement />;
      case 'rabies':       return <PetRegistration />;
      case 'preregistered':return <PreRegisteredPets />;
      case 'outbreak':     return <OutbreakMonitoring />;
      case 'services':     return <VeterinaryServices userRole={user.role} />;
      case 'reports':      return <ReportsCertificates />;
      case 'users':        return <UserManagement />;
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
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-gray-700">Access Restricted</h2>
              <p className="text-gray-500 mt-2">SuperAdmin access required for this section.</p>
            </div>
          </div>
        );
      default: return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
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
