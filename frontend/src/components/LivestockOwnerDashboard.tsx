import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Header } from './Header';
import { MyProfile } from './MyProfile';
import { Footer } from './Footer';
import { LivestockPreRegistration } from './LivestockPreRegistration';
import { UserFeedback } from './UserFeedback';
import { ScheduleModule } from './ScheduleModule';
import { LostFoundDetailsModal } from './LostFoundDetailsModal';
import { Beef, Bell, User, FileText, AlertCircle, Calendar, Download, Eye, Activity, X, Menu, ClipboardList, MessageSquare, CalendarClock, Plus, MapPin, Heart, Skull, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { User as UserType } from '../App';

interface LivestockOwnerDashboardProps {
  user: UserType;
  onLogout: () => void;
}

interface Livestock {
  id: string;
  type: string;
  breed?: string;
  color?: string;
  count: number;
  barangay: string;
  registrationDate: string;
  lastInspection: string;
  nextInspection: string;
  healthStatus: 'Healthy' | 'Under Observation' | 'Quarantine' | 'Dead';
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

interface LostFoundReport {
  id: string;
  petId: string;
  petName: string;
  species: string;
  breed: string;
  color: string;
  type: 'Lost' | 'Found';
  reportedBy: string;
  reportedByRole: string;
  ownerId: string;
  contactNumber: string;
  lastSeenLocation: string;
  barangay: string;
  dateReported: string;
  description: string;
  status: 'Open' | 'Verified' | 'Rejected' | 'Resolved';
  photo?: string;
}

export function LivestockOwnerDashboard({ user, onLogout }: LivestockOwnerDashboardProps) {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'livestock' | 'preregistration' | 'profile' | 'notifications' | 'feedback' | 'schedule' | 'lostfound'>('dashboard');
  const [selectedLivestock, setSelectedLivestock] = useState<Livestock | null>(null);
  const [showLivestockDetails, setShowLivestockDetails] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [livestockLoading, setLivestockLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Lost Livestock reports
  const [lostFoundReports, setLostFoundReports] = useState<LostFoundReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [lostFoundFilter, setLostFoundFilter] = useState<'all' | 'Lost' | 'Found'>('all');
  const [showReportLostModal, setShowReportLostModal] = useState(false);
  const [selectedLostFoundReport, setSelectedLostFoundReport] = useState<LostFoundReport | null>(null);
  const [showLostFoundDetailsModal, setShowLostFoundDetailsModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    selectedLivestockId: '',
    lastSeenLocation: '',
    barangay: '',
    description: '',
  });
  // Official barangay names from the database (must match what BAHW accounts are assigned to)
  const [barangayOptions, setBarangayOptions] = useState<string[]>([]);

  // Report Death / Expired
  const [showDeathModal, setShowDeathModal] = useState(false);
  const [deathTargetLivestock, setDeathTargetLivestock] = useState<Livestock | null>(null);
  const [deathForm, setDeathForm] = useState({ quantity: '1', cause: '', dateReported: new Date().toISOString().split('T')[0], notes: '', photoUrl: '' });
  const [savingDeath, setSavingDeath] = useState(false);
  const deathFileRef = useRef<HTMLInputElement>(null);
  const onDeathPhoto = (e: { target: HTMLInputElement }) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => setDeathForm(p => ({ ...p, photoUrl: ev.target?.result as string }));
    r.readAsDataURL(f);
  };

  useEffect(() => {
    api.getBarangays()
      .then((d: any) => setBarangayOptions(d.barangays || []))
      .catch(() => setBarangayOptions([]));
  }, []);

  useEffect(() => {
    const fetchLivestock = async () => {
      try {
        const data = await api.getLivestock({ ownerId: user.ownerId });
        const rows: any[] = Array.isArray(data) ? data : (data as any).livestock ?? [];
        const mapped: Livestock[] = rows.map((r: any) => ({
          id: r.id,
          type: r.animal_type ?? r.type ?? '',
          breed: r.breed ?? '',
          color: r.color_markings ?? r.color ?? '',
          count: r.quantity ?? r.count ?? 0,
          barangay: r.barangay ?? '',
          registrationDate: r.registration_date ?? r.registrationDate ?? '',
          lastInspection: r.last_inspection ?? r.lastInspection ?? '',
          nextInspection: r.next_inspection ?? r.nextInspection ?? '',
          healthStatus: r.health_status ?? r.healthStatus ?? 'Healthy',
          vaccinationStatus: r.vaccination_status ?? r.vaccinationStatus ?? 'Up to Date',
        }));
        setLivestock(mapped);

        // Derive notifications from real records (due-soon vaccinations / upcoming inspections)
        const derived: Notification[] = [];
        mapped.forEach((item) => {
          if (item.vaccinationStatus === 'Due Soon' || item.vaccinationStatus === 'Overdue') {
            derived.push({
              id: `notif-vax-${item.id}`,
              livestockId: item.id,
              type: 'vaccination',
              message: `${item.type} vaccination is ${item.vaccinationStatus.toLowerCase()}.`,
              date: item.nextInspection || new Date().toISOString().split('T')[0],
              read: false,
            });
          }
          if (item.nextInspection) {
            const daysUntil = Math.ceil(
              (new Date(item.nextInspection).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntil >= 0 && daysUntil <= 30) {
              derived.push({
                id: `notif-insp-${item.id}`,
                livestockId: item.id,
                type: 'inspection',
                message: `${item.type} inspection scheduled on ${item.nextInspection}.`,
                date: item.nextInspection,
                read: false,
              });
            }
          }
        });
        setNotifications(derived);
      } catch (err: any) {
        console.error('[LivestockOwnerDashboard] Failed to load livestock:', err);
        toast.error('Failed to load livestock records.');
      } finally {
        setLivestockLoading(false);
      }
    };

    if (user?.ownerId) {
      fetchLivestock();
    } else {
      setLivestockLoading(false);
    }
  }, [user?.ownerId]);

  // Fetch this owner's lost/found livestock reports
  useEffect(() => {
    const fetchReports = async () => {
      if (!user.ownerId) {
        setIsLoadingReports(false);
        return;
      }
      try {
        setIsLoadingReports(true);
        const data = await api.getLostFound(undefined, user.ownerId);
        const mapped = ((data as any).reports || []).map((r: any) => ({
          id: r.id,
          petId: r.pet_id ?? r.petId ?? '',
          petName: r.pet_name ?? r.petName ?? '',
          species: r.species ?? '',
          breed: r.breed ?? '',
          color: r.color ?? '',
          type: r.type ?? 'Lost',
          reportedBy: r.reported_by ?? r.reportedBy ?? '',
          reportedByRole: r.reported_by_role ?? r.reportedByRole ?? '',
          ownerId: r.owner_id ?? r.ownerId ?? '',
          contactNumber: r.contact_number ?? r.contactNumber ?? '',
          lastSeenLocation: r.last_seen_location ?? r.lastSeenLocation ?? '',
          barangay: r.barangay ?? '',
          dateReported: r.date_reported ?? r.dateReported ?? '',
          description: r.description ?? '',
          status: r.status ?? 'Open',
          photo: r.photo ?? undefined,
        }));
        setLostFoundReports(mapped);
      } catch (err) {
        console.error('[LivestockOwnerDashboard] Failed to load lost/found reports:', err);
        toast.error('Failed to load lost & found reports');
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, [user.ownerId]);

  const handleReportLostLivestock = async () => {
    try {
      if (!reportForm.selectedLivestockId) {
        toast.error('Please select one of your registered livestock');
        return;
      }
      const selected = livestock.find(l => l.id === reportForm.selectedLivestockId);
      if (!selected) {
        toast.error('Selected livestock not found');
        return;
      }
      if (!reportForm.lastSeenLocation || !reportForm.barangay || !reportForm.description) {
        toast.error('Please fill in all location and description fields');
        return;
      }

      const reportData = {
        petId: selected.id,
        petName: `${selected.type} (${selected.id})`,
        species: selected.type,
        breed: selected.breed || '',
        color: selected.color || '',
        type: 'Lost',
        reportedBy: user.username,
        reportedByRole: 'livestockOwner',
        ownerId: user.ownerId,
        contactNumber: user.username,
        lastSeenLocation: reportForm.lastSeenLocation,
        barangay: reportForm.barangay,
        description: reportForm.description,
      };

      const data = await api.createLostFound(reportData);
      const r = (data as any).report;
      const mappedReport: LostFoundReport = {
        id: r.id,
        petId: r.pet_id ?? r.petId ?? '',
        petName: r.pet_name ?? r.petName ?? '',
        species: r.species ?? '',
        breed: r.breed ?? '',
        color: r.color ?? '',
        type: r.type ?? 'Lost',
        reportedBy: r.reported_by ?? r.reportedBy ?? '',
        reportedByRole: r.reported_by_role ?? r.reportedByRole ?? '',
        ownerId: r.owner_id ?? r.ownerId ?? '',
        contactNumber: r.contact_number ?? r.contactNumber ?? '',
        lastSeenLocation: r.last_seen_location ?? r.lastSeenLocation ?? '',
        barangay: r.barangay ?? '',
        dateReported: r.date_reported ?? r.dateReported ?? '',
        description: r.description ?? '',
        status: r.status ?? 'Open',
        photo: r.photo ?? undefined,
      };
      setLostFoundReports(prev => [mappedReport, ...prev]);

      setReportForm({
        selectedLivestockId: '',
        lastSeenLocation: '',
        barangay: '',
        description: '',
      });
      setShowReportLostModal(false);
      toast.success('Lost livestock report submitted successfully!');
    } catch (error) {
      console.error('Error reporting lost livestock:', error);
      toast.error('Failed to submit lost livestock report');
    }
  };

  const filteredLostFoundReports = lostFoundReports.filter(report =>
    lostFoundFilter === 'all' || report.type === lostFoundFilter
  );

  const openDeathModal = (item: Livestock) => {
    setDeathTargetLivestock(item);
    setDeathForm({ quantity: '1', cause: '', dateReported: new Date().toISOString().split('T')[0], notes: '', photoUrl: '' });
    setShowDeathModal(true);
  };

  const handleReportDeath = async () => {
    if (!deathTargetLivestock || !deathForm.cause || savingDeath) return;
    setSavingDeath(true);
    try {
      await api.addMortality({
        recordKind: 'Livestock',
        livestockId: deathTargetLivestock.id,
        animalType: deathTargetLivestock.type,
        breed: deathTargetLivestock.breed,
        ownerName: user.username,
        barangay: deathTargetLivestock.barangay,
        quantity: parseInt(deathForm.quantity) || 1,
        cause: deathForm.cause,
        dateReported: deathForm.dateReported,
        notes: deathForm.notes,
        photoUrl: deathForm.photoUrl || undefined,
      });
      setLivestock(prev => prev.map(l => l.id === deathTargetLivestock.id ? { ...l, healthStatus: 'Dead' } : l));
      setShowDeathModal(false);
      setDeathTargetLivestock(null);
      toast.success('Death/expired report submitted successfully.');
    } catch (error: any) {
      console.error('Error reporting livestock death:', error);
      toast.error(error?.message || 'Failed to submit death report');
    } finally {
      setSavingDeath(false);
    }
  };

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
      {livestockLoading && (
        <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
          <Activity className="w-4 h-4 animate-pulse" />
          Loading your livestock records…
        </div>
      )}

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

      {livestockLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
          <Activity className="w-4 h-4 animate-pulse" />
          Loading your livestock records…
        </div>
      ) : livestock.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Beef className="w-12 h-12 opacity-30" />
          <p className="text-sm">No livestock records yet. Use Pre-Registration to get started.</p>
        </div>
      ) : (
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
              {item.healthStatus !== 'Dead' && (
                <button
                  onClick={() => openDeathModal(item)}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-400 text-gray-600 rounded-md hover:bg-gray-600 hover:text-white transition-colors text-sm"
                >
                  <Skull className="w-4 h-4" />
                  Report Death / Expired
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
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

  const renderLostFound = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Lost & Found</h2>
          <p className="text-gray-600">Report lost livestock and track your reports</p>
        </div>
        <button
          onClick={() => setShowReportLostModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#E85D3B] text-white rounded-md hover:bg-[#d64d2b] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Report Lost Livestock
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-[#2B5EA6] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700 font-medium">Livestock Owner Information:</p>
            <p className="text-sm text-gray-600 mt-1">
              You can report <strong>lost livestock only</strong>. If you find stray or unaccounted livestock, please report it to your barangay office or the City Veterinary Office.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-2">
          <button
            onClick={() => setLostFoundFilter('all')}
            className={`px-4 py-2 rounded-md transition-colors ${
              lostFoundFilter === 'all' ? 'bg-[#2B5EA6] text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setLostFoundFilter('Lost')}
            className={`px-4 py-2 rounded-md transition-colors ${
              lostFoundFilter === 'Lost' ? 'bg-[#E85D3B] text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Lost
          </button>
          <button
            onClick={() => setLostFoundFilter('Found')}
            className={`px-4 py-2 rounded-md transition-colors ${
              lostFoundFilter === 'Found' ? 'bg-[#60A85C] text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Found
          </button>
        </div>
      </div>

      {isLoadingReports && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-12 h-12 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading reports...</p>
        </div>
      )}

      {!isLoadingReports && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLostFoundReports.map(report => (
            <div key={report.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`h-2 ${report.type === 'Lost' ? 'bg-[#E85D3B]' : 'bg-[#60A85C]'}`}></div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    report.type === 'Lost' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {report.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'Verified' ? 'bg-blue-100 text-blue-700'
                      : report.status === 'Rejected' ? 'bg-red-100 text-red-700'
                      : report.status === 'Resolved' ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-800'
                    }`}>
                      {report.status === 'Open' ? 'Pending validation' : report.status}
                    </span>
                    <Beef className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">{report.petName}</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Type:</strong> {report.species}</p>
                  {report.breed && <p><strong>Breed:</strong> {report.breed}</p>}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="flex-1">{report.lastSeenLocation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <p>{report.dateReported}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedLostFoundReport(report);
                    setShowLostFoundDetailsModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoadingReports && filteredLostFoundReports.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">You haven't reported any lost livestock yet.</p>
        </div>
      )}
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
              {activeSection === 'lostfound' && 'Lost & Found'}
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
                  setActiveSection('lostfound');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'lostfound' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Lost &amp; Found
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
              onClick={() => setActiveSection('lostfound')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'lostfound'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Lost & Found
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
              onClick={() => setActiveSection('schedule')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeSection === 'schedule'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Schedule
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
        {activeSection === 'lostfound' && renderLostFound()}
        {activeSection === 'notifications' && renderNotifications()}
        {activeSection === 'schedule' && (
          <ScheduleModule user={user} />
        )}
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

      {/* Report Lost Livestock Modal */}
      {showReportLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReportLostModal(false)}>
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Report Lost Livestock</h3>
                <p className="text-sm text-gray-500 mt-1">Notify the City Veterinary Office and your barangay</p>
              </div>
              <button
                onClick={() => setShowReportLostModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">You can only report livestock that is already registered under your account.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Your Registered Livestock *</label>
                <select
                  value={reportForm.selectedLivestockId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = livestock.find(l => l.id === id);
                    setReportForm(prev => ({
                      ...prev,
                      selectedLivestockId: id,
                      // pre-fill with the livestock's registered barangay
                      barangay: prev.barangay || found?.barangay || '',
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                >
                  <option value="">-- Select a registered livestock record --</option>
                  {livestock.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.type} ({item.count} head(s)) · {item.id}
                    </option>
                  ))}
                </select>
                {livestock.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No registered livestock found. Please register your livestock first before filing a lost report.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Seen Location</label>
                  <input
                    type="text"
                    value={reportForm.lastSeenLocation}
                    onChange={(e) => setReportForm(prev => ({ ...prev, lastSeenLocation: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                    placeholder="e.g., Near the rice field along Purok 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
                  <select
                    value={reportForm.barangay}
                    onChange={(e) => setReportForm(prev => ({ ...prev, barangay: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  >
                    <option value="">-- Select barangay --</option>
                    {barangayOptions.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={reportForm.description}
                  onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  placeholder="Describe the livestock and circumstances of when it was last seen..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowReportLostModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportLostLivestock}
                  className="flex-1 px-4 py-3 bg-[#E85D3B] text-white rounded-md hover:bg-[#d64d2b] transition-colors font-medium"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLostFoundDetailsModal && selectedLostFoundReport && (
        <LostFoundDetailsModal
          report={selectedLostFoundReport}
          onClose={() => {
            setShowLostFoundDetailsModal(false);
            setSelectedLostFoundReport(null);
          }}
        />
      )}

      {showDeathModal && deathTargetLivestock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeathModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Skull className="w-5 h-5 text-gray-600" />
                Report Death / Expired
              </h3>
              <button onClick={() => setShowDeathModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Reporting for <strong>{deathTargetLivestock.type}</strong> ({deathTargetLivestock.id}). This will mark the record as Dead.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity Dead *</label>
                <input
                  type="number"
                  min="1"
                  max={deathTargetLivestock.count}
                  value={deathForm.quantity}
                  onChange={e => setDeathForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cause of Death *</label>
                <input
                  value={deathForm.cause}
                  onChange={e => setDeathForm(p => ({ ...p, cause: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Disease, accident, unknown…"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={deathForm.dateReported}
                  onChange={e => setDeathForm(p => ({ ...p, dateReported: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea
                  value={deathForm.notes}
                  onChange={e => setDeathForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Photo (optional)</label>
                <input ref={deathFileRef} type="file" accept="image/*" onChange={onDeathPhoto} className="hidden" />
                {deathForm.photoUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={deathForm.photoUrl} alt="Death record" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                    <button type="button" onClick={() => deathFileRef.current?.click()} className="text-xs font-semibold text-gray-600 hover:underline">Replace photo</button>
                    <button type="button" onClick={() => setDeathForm(p => ({ ...p, photoUrl: '' }))} className="text-xs font-semibold text-gray-400 hover:underline">Remove</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => deathFileRef.current?.click()} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-500 font-semibold hover:bg-gray-50">
                    Attach photo
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowDeathModal(false)} className="flex-1 py-2 border border-gray-200 rounded-md text-sm hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleReportDeath}
                disabled={!deathForm.cause || savingDeath}
                className="flex-1 py-2 bg-gray-700 text-white rounded-md text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingDeath ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Saving…</> : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}