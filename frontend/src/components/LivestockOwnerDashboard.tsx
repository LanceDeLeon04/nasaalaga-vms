import { useState } from 'react';
import { Header } from './Header';
import { MyProfile } from './MyProfile';
import { Footer } from './Footer';
import { LivestockPreRegistration } from './LivestockPreRegistration';
import { UserFeedback } from './UserFeedback';
import { Beef, Bell, User, FileText, AlertCircle, Calendar, Download, Eye, Activity, X, Menu, ClipboardList, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { User as UserType } from '../App';

interface LivestockOwnerDashboardProps {
  user: UserType;
  onLogout: () => void;
}

interface Livestock {
  id: string;
  type: string;
  count: number;
  barangay: string;
  registrationDate: string;
  lastInspection: string;
  nextInspection: string;
  healthStatus: 'Healthy' | 'Under Observation' | 'Quarantine';
  vaccinationStatus: 'Up to Date' | 'Due Soon' | 'Overdue';
}

interface Notification {
  id: string;
  livestockId: string;
  type: 'inspection' | 'vaccination' | 'alert';
  message: string;
  date: string;
  read: boolean;
}

export function LivestockOwnerDashboard({ user, onLogout }: LivestockOwnerDashboardProps) {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'livestock' | 'preregistration' | 'profile' | 'notifications' | 'feedback'>('dashboard');
  const [selectedLivestock, setSelectedLivestock] = useState<Livestock | null>(null);
  const [showLivestockDetails, setShowLivestockDetails] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mock data for livestock owner's animals
  const [livestock] = useState<Livestock[]>([
    {
      id: 'LS-001',
      type: 'Cattle',
      count: 15,
      barangay: 'Barangay 1',
      registrationDate: '2024-01-15',
      lastInspection: '2024-12-10',
      nextInspection: '2025-03-10',
      healthStatus: 'Healthy',
      vaccinationStatus: 'Up to Date',
    },
    {
      id: 'LS-002',
      type: 'Swine',
      count: 45,
      barangay: 'Barangay 1',
      registrationDate: '2024-03-20',
      lastInspection: '2024-12-12',
      nextInspection: '2025-02-25',
      healthStatus: 'Healthy',
      vaccinationStatus: 'Due Soon',
    },
    {
      id: 'LS-003',
      type: 'Poultry',
      count: 500,
      barangay: 'Barangay 1',
      registrationDate: '2024-02-10',
      lastInspection: '2024-12-08',
      nextInspection: '2025-02-20',
      healthStatus: 'Healthy',
      vaccinationStatus: 'Up to Date',
    },
  ]);

  const [notifications] = useState<Notification[]>([
    {
      id: 'N-001',
      livestockId: 'LS-002',
      type: 'vaccination',
      message: 'Swine vaccination due on February 25, 2025',
      date: '2025-02-17',
      read: false,
    },
    {
      id: 'N-002',
      livestockId: 'LS-003',
      type: 'inspection',
      message: 'Poultry inspection scheduled for February 20, 2025',
      date: '2025-02-15',
      read: false,
    },
    {
      id: 'N-003',
      livestockId: 'LS-001',
      type: 'alert',
      message: 'Health certificate renewal reminder',
      date: '2025-02-10',
      read: true,
    },
  ]);

  const handleDownloadCertificate = async (livestockItem: Livestock) => {
    try {
      // Dynamic import of jsPDF
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Add border
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 190, 277);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 186, 273);
      
      // Header
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('REPUBLIC OF THE PHILIPPINES', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('City of Calaca, Batangas', 105, 38, { align: 'center' });
      doc.setFontSize(14);
      doc.text('CITY VETERINARY OFFICE', 105, 46, { align: 'center' });
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('CERTIFICATE OF LIVESTOCK REGISTRATION', 105, 65, { align: 'center' });
      
      // Certificate Number and Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Certificate No: ${livestockItem.id}`, 20, 80);
      doc.text(`Date Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 86);
      
      // Body
      doc.setFontSize(12);
      doc.text('This is to certify that the following livestock has been officially registered', 105, 100, { align: 'center' });
      doc.text('with the City Veterinary Office of Calaca:', 105, 107, { align: 'center' });
      
      // Livestock Details
      const startY = 125;
      const lineHeight = 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Livestock Information:', 30, startY);
      doc.setFont('helvetica', 'normal');
      
      const details = [
        `Livestock Type: ${livestockItem.type}`,
        `Count: ${livestockItem.count} head(s)`,
        `Location: ${livestockItem.barangay}`,
        `Registration Date: ${new Date(livestockItem.registrationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        `Last Inspection: ${new Date(livestockItem.lastInspection).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        `Next Inspection: ${new Date(livestockItem.nextInspection).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        `Health Status: ${livestockItem.healthStatus}`,
        `Vaccination Status: ${livestockItem.vaccinationStatus}`,
      ];
      
      details.forEach((detail, index) => {
        doc.text(detail, 40, startY + (index + 1) * lineHeight);
      });
      
      // Owner Information
      doc.setFont('helvetica', 'bold');
      doc.text('Owner Information:', 30, startY + (details.length + 2) * lineHeight);
      doc.setFont('helvetica', 'normal');
      doc.text(`Owner Name: ${user.username}`, 40, startY + (details.length + 3) * lineHeight);
      doc.text(`Owner ID: ${user.ownerId}`, 40, startY + (details.length + 4) * lineHeight);
      
      // Footer
      doc.setFontSize(10);
      doc.text('This certificate is valid and issued in compliance with', 105, 230, { align: 'center' });
      doc.text('Republic Act No. 8485 (Animal Welfare Act of 1998)', 105, 237, { align: 'center' });
      
      // Signature Section
      doc.setFont('helvetica', 'bold');
      doc.text('_______________________________', 135, 260, { align: 'center' });
      doc.text('City Veterinarian', 135, 267, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Digitally issued by NASaAlaga System', 105, 280, { align: 'center' });
      doc.text(`Timestamp: ${new Date().toISOString()}`, 105, 285, { align: 'center' });
      
      // Save the PDF
      doc.save(`Certificate_Livestock_${livestockItem.type}_${livestockItem.id}_${Date.now()}.pdf`);
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate certificate. Please try again.');
    }
  };

  const totalAnimals = livestock.reduce((sum, item) => sum + item.count, 0);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">Welcome, {user.username}!</h2>
          <p className="text-gray-600">Manage your livestock and stay updated on inspections</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Animals</p>
            <Beef className="w-5 h-5 text-[#2B5EA6]" />
          </div>
          <p className="text-gray-900">{totalAnimals}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Livestock Types</p>
            <Activity className="w-5 h-5 text-[#60A85C]" />
          </div>
          <p className="text-gray-900">{livestock.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Healthy</p>
            <Activity className="w-5 h-5 text-[#60A85C]" />
          </div>
          <p className="text-gray-900">{livestock.filter(l => l.healthStatus === 'Healthy').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Due Soon</p>
            <AlertCircle className="w-5 h-5 text-[#F39C3A]" />
          </div>
          <p className="text-gray-900">{livestock.filter(l => l.vaccinationStatus === 'Due Soon').length}</p>
        </div>
      </div>

      {/* Upcoming Inspections */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Inspections & Vaccinations
          </h3>
        </div>
        <div className="p-6">
          {livestock.filter(l => l.vaccinationStatus === 'Due Soon').length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming inspections or vaccinations</p>
          ) : (
            <div className="space-y-3">
              {livestock.filter(l => l.vaccinationStatus === 'Due Soon').map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{item.type} ({item.count} heads)</p>
                    <p className="text-sm text-gray-600">Next Inspection: {item.nextInspection}</p>
                  </div>
                  <button
                    onClick={() => toast.info('Please contact the City Veterinary Office to schedule an appointment')}
                    className="px-4 py-2 bg-[#F39C3A] text-white rounded-md hover:bg-[#d68732] transition-colors text-sm"
                  >
                    Schedule
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Notifications
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {notifications.slice(0, 3).map(notification => (
              <div key={notification.id} className={`p-4 rounded-lg border ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 capitalize">{notification.type}</p>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">{notification.date}</p>
                  </div>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLivestock = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">My Livestock</h2>
          <p className="text-gray-600">View and manage your registered livestock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {livestock.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#2B5EA6] to-[#60A85C] rounded-full flex items-center justify-center">
                    <Beef className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-gray-800 font-medium">{item.type}</h3>
                    <p className="text-sm text-gray-500">{item.count} head(s)</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.healthStatus === 'Healthy' ? 'bg-green-100 text-green-700' :
                  item.healthStatus === 'Under Observation' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {item.healthStatus}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Registration ID:</span>
                  <span className="font-medium text-gray-800">{item.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-gray-800">{item.barangay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Inspection:</span>
                  <span className="font-medium text-gray-800">{item.lastInspection}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next Inspection:</span>
                  <span className="font-medium text-gray-800">{item.nextInspection}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vaccination Status:</span>
                  <span className={`font-medium ${
                    item.vaccinationStatus === 'Up to Date' ? 'text-green-600' :
                    item.vaccinationStatus === 'Due Soon' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {item.vaccinationStatus}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedLivestock(item);
                    setShowLivestockDetails(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                <button
                  onClick={() => handleDownloadCertificate(item)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Certificate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-800 mb-1">My Profile</h2>
        <p className="text-gray-600">View and manage your account information</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#2B5EA6] to-[#60A85C] rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="text-gray-800 font-medium">{user.username}</h3>
              <p className="text-sm text-gray-500">Livestock Manager</p>
              <p className="text-sm text-gray-500">ID: {user.ownerId}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input
              type="text"
              value={user.username}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Owner ID</label>
            <input
              type="text"
              value={user.ownerId || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <input
              type="text"
              value="Livestock Manager"
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Total Animals</label>
            <input
              type="text"
              value={totalAnimals}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Registered Livestock Types</label>
            <input
              type="text"
              value={livestock.length}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-800 mb-1">Notifications</h2>
        <p className="text-gray-600">Stay updated on inspections and livestock health</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-3">
          {notifications.map(notification => (
            <div key={notification.id} className={`p-4 rounded-lg border ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {notification.type === 'vaccination' && <Activity className="w-4 h-4 text-[#F39C3A]" />}
                    {notification.type === 'inspection' && <FileText className="w-4 h-4 text-[#2B5EA6]" />}
                    {notification.type === 'alert' && <AlertCircle className="w-4 h-4 text-[#E85D3B]" />}
                    <span className="text-xs font-medium text-gray-500 uppercase">{notification.type}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{notification.date}</p>
                </div>
                {!notification.read && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Header user={user} onLogout={onLogout} onProfileClick={() => setActiveSection('profile')} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <h3 className="text-gray-800 font-medium">
              {activeSection === 'dashboard' && 'Dashboard'}
              {activeSection === 'livestock' && 'Livestock'}
              {activeSection === 'preregistration' && 'Pre-Registration'}
              {activeSection === 'notifications' && 'Notifications'}
              {activeSection === 'profile' && 'Profile'}
            </h3>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mb-4 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => {
                  setActiveSection('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'dashboard' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  setActiveSection('livestock');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'livestock' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Livestock
              </button>
              <button
                onClick={() => {
                  setActiveSection('preregistration');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'preregistration' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Pre-Registration
              </button>
              <button
                onClick={() => {
                  setActiveSection('notifications');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 flex items-center justify-between ${
                  activeSection === 'notifications' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Notifications</span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveSection('profile');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'profile' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => {
                  setActiveSection('feedback');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium ${
                  activeSection === 'feedback' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Feedback & Complaints
              </button>
            </div>
          )}

          {/* Desktop Tabs */}
          <div className="hidden md:flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'dashboard'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveSection('livestock')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'livestock'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Livestock
            </button>
            <button
              onClick={() => setActiveSection('preregistration')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'preregistration'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Pre-Registration
            </button>
            <button
              onClick={() => setActiveSection('notifications')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 relative ${
                activeSection === 'notifications'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Notifications
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveSection('profile')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'profile'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveSection('feedback')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeSection === 'feedback'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Feedback
            </button>
          </div>
        </div>

        {/* Content */}
        {activeSection === 'dashboard' && renderDashboard()}
        {activeSection === 'livestock' && renderLivestock()}
        {activeSection === 'preregistration' && (
          <LivestockPreRegistration
            ownerId={user.ownerId}
            ownerEmail={user.email}
            userRole={user.role || 'livestockManager'}
            barangay={user.barangay || undefined}
          />
        )}
        {activeSection === 'profile' && (
          <MyProfile user={user} onUserUpdate={(u) => { const s = sessionStorage.getItem('nasaalaga_user'); if(s){try{const p=JSON.parse(s);Object.assign(p,u);sessionStorage.setItem('nasaalaga_user',JSON.stringify(p));window.dispatchEvent(new Event('nasaalaga_profile_updated'));}catch{}} }} />
        )}
        {activeSection === 'notifications' && renderNotifications()}
        {activeSection === 'feedback' && (
          <UserFeedback user={user} />
        )}
      </div>

      {/* Livestock Details Modal */}
      {showLivestockDetails && selectedLivestock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-gray-800 font-medium">Livestock Details</h3>
              <button
                onClick={() => {
                  setShowLivestockDetails(false);
                  setSelectedLivestock(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gradient-to-br from-[#2B5EA6] to-[#60A85C] rounded-full flex items-center justify-center">
                  <Beef className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h4 className="text-gray-800 font-medium text-xl">{selectedLivestock.type}</h4>
                  <p className="text-gray-600">{selectedLivestock.count} head(s)</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                    selectedLivestock.healthStatus === 'Healthy' ? 'bg-green-100 text-green-700' :
                    selectedLivestock.healthStatus === 'Under Observation' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedLivestock.healthStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Registration ID</label>
                  <p className="font-medium text-gray-800">{selectedLivestock.id}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Registration Date</label>
                  <p className="font-medium text-gray-800">{selectedLivestock.registrationDate}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Count</label>
                  <p className="font-medium text-gray-800">{selectedLivestock.count} head(s)</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Location</label>
                  <p className="font-medium text-gray-800">{selectedLivestock.barangay}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Last Inspection</label>
                  <p className="font-medium text-gray-800">{selectedLivestock.lastInspection}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Next Inspection</label>
                  <p className="font-medium text-gray-800">{selectedLivestock.nextInspection}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Vaccination Status</label>
                  <p className={`font-medium ${
                    selectedLivestock.vaccinationStatus === 'Up to Date' ? 'text-green-600' :
                    selectedLivestock.vaccinationStatus === 'Due Soon' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {selectedLivestock.vaccinationStatus}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Health Status</label>
                  <p className={`font-medium ${
                    selectedLivestock.healthStatus === 'Healthy' ? 'text-green-600' :
                    selectedLivestock.healthStatus === 'Under Observation' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {selectedLivestock.healthStatus}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadCertificate(selectedLivestock)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Certificate
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Print Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}