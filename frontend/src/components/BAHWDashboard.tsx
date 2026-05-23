import { useState } from 'react';
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
import { Footer } from './Footer';
import type { User } from '../App';
import type { ActiveView } from './AdminDashboard';

interface BAHWDashboardProps {
  user: User;
  onLogout: () => void;
}

export function BAHWDashboard({ user, onLogout }: BAHWDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'livestock':
        return <LivestockManagement />;
      case 'rabies':
        return <PetRegistration userRole={user.role} />;
      case 'vaccination':
        return <VaccinationModule user={user} />;
      case 'preregistered':
        return <PetPreRegistration ownerId={user.ownerId} ownerEmail={user.email} />;
      case 'outbreak':
        return <OutbreakMonitoring />;
      case 'services':
        return <CVOServicesShared userRole={user.role} />;
      case 'reports':
        return <ReportsCertificates />;
      case 'feedback':
        return <FeedbackComplaints userRole={user.role} />;
      default:
        return <DashboardOverview />;
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
          {renderContent()}
        </main>
      </div>
      <Footer />
    </div>
  );
}