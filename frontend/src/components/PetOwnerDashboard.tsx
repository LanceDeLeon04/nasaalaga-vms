import { useState, useEffect } from 'react';
import { Header } from './Header';
import { MyProfile } from './MyProfile';
import { Footer } from './Footer';
import { PawPrint, Bell, User, FileText, AlertCircle, Calendar, Download, Eye, Syringe, X, Heart, Search, MapPin, Phone, Menu, Plus, ClipboardList, MessageSquare, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { LostFoundDetailsModal } from './LostFoundDetailsModal';
import { CVOServicesShared } from './CVOServicesShared';
import { UserFeedback } from './UserFeedback';
import { PetPreRegistration } from './PetPreRegistration';
import { VaccinationCard } from './VaccinationCard';
import { ScheduleModule } from './ScheduleModule';
import { PreRegistrationModule } from './PreRegistrationModule';
import { api } from '../lib/api';
import type { User as UserType } from '../App';


interface PetOwnerDashboardProps {
  user: UserType;
  onLogout: () => void;
}

interface Pet {
  id: string;
  ownerId: string;
  petName: string;
  species: string;
  breed: string;
  age: number | string;
  color: string;
  ownerName: string;
  contactNumber: string;
  barangay: string;
  address: string;
  microchipId?: string;
  registrationDate: string;
  vaccinationStatus: 'Vaccinated' | 'Not Vaccinated' | 'Due Soon';
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
  status: 'Active' | 'Lost' | 'Found';
  photo?: string;
  petTagId?: string;
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
  status: 'Open' | 'Resolved';
  photo?: string;
}

interface Notification {
  id: string;
  petId: string;
  petName: string;
  type: 'vaccination' | 'checkup' | 'registration';
  message: string;
  date: string;
  read: boolean;
}

export function PetOwnerDashboard({ user, onLogout }: PetOwnerDashboardProps) {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'pets' | 'preregistration' | 'profile' | 'notifications' | 'cvoservices' | 'lostfound' | 'feedback' | 'schedule'>('dashboard');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [selectedLostFoundReport, setSelectedLostFoundReport] = useState<LostFoundReport | null>(null);
  const [showLostFoundDetailsModal, setShowLostFoundDetailsModal] = useState(false);
  const [showReportLostModal, setShowReportLostModal] = useState(false);
  const [showPreRegistrationModal, setShowPreRegistrationModal] = useState(false);
  const [lostFoundFilter, setLostFoundFilter] = useState<'all' | 'Lost' | 'Found'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [vaxCardPet, setVaxCardPet] = useState<any>(null);
  const [vaxCardHistory, setVaxCardHistory] = useState<any[]>([]);


  const [pets, setPets] = useState<Pet[]>([]);
  const [lostFoundReports, setLostFoundReports] = useState<LostFoundReport[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Lost Pet Report Form
  const [reportForm, setReportForm] = useState({
    selectedPetId: '',
    manualEntry: false,
    petName: '',
    species: '',
    breed: '',
    color: '',
    lastSeenLocation: '',
    barangay: '',
    description: '',
  });

  const [notifications] = useState<Notification[]>([
    {
      id: 'N-001',
      petId: 'BLU-000-00001',
      petName: 'Brownie',
      type: 'vaccination',
      message: 'Rabies vaccination due soon',
      date: '2025-02-17',
      read: false,
    },
  ]);

  // Fetch user's pets from Supabase
  useEffect(() => {
    const fetchPets = async () => {
      if (!user.ownerId) return;
      
      try {
        setIsLoadingPets(true);
        const response = await fetch(
          `/api/pets?ownerId=${user.ownerId}`,
          {
            headers: {
              
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch pets');
        }

        const data = await response.json();
        const mappedPets = (data.pets || []).map((p: any) => ({
          id: p.id,
          ownerId: p.owner_id ?? p.ownerId ?? '',
          petName: p.pet_name ?? p.petName ?? '',
          species: p.species ?? '',
          breed: p.breed ?? '',
          age: p.age ?? '',
          color: p.color ?? '',
          ownerName: p.owner_name ?? p.ownerName ?? '',
          contactNumber: p.contact_number ?? p.contactNumber ?? '',
          barangay: p.barangay ?? '',
          address: p.address ?? '',
          microchipId: p.microchip_id ?? p.microchipId ?? undefined,
          registrationDate: p.registration_date ?? p.registrationDate ?? '',
          vaccinationStatus: p.vaccination_status ?? p.vaccinationStatus ?? 'Not Vaccinated',
          lastVaccinationDate: p.last_vaccination_date ?? p.lastVaccinationDate ?? undefined,
          nextVaccinationDate: p.next_vaccination_date ?? p.nextVaccinationDate ?? undefined,
          status: p.status ?? 'Active',
          photo: p.photo ?? undefined,
          petTagId: p.pet_tag_id ?? p.petTagId ?? undefined,
        }));
        setPets(mappedPets);
      } catch (error) {
        console.error('Error fetching pets:', error);
        toast.error('Failed to load your pets');
      } finally {
        setIsLoadingPets(false);
      }
    };

    fetchPets();
  }, [user.ownerId]);

  // Fetch lost & found reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoadingReports(true);
        const response = await fetch(
          `/api/lost-found`,
          {
            headers: {
              
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch reports');
        }

        const data = await response.json();
        setLostFoundReports(data.reports || []);
      } catch (error) {
        console.error('Error fetching lost & found reports:', error);
        toast.error('Failed to load lost & found reports');
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, []);

  const handleReportLostPet = async () => {
    try {
      let petData;
      
      if (reportForm.manualEntry) {
        // Manual entry for unregistered pets
        if (!reportForm.petName || !reportForm.species || !reportForm.breed || !reportForm.color) {
          toast.error('Please fill in all pet information');
          return;
        }
        petData = {
          petId: 'UNKNOWN',
          petName: reportForm.petName,
          species: reportForm.species,
          breed: reportForm.breed,
          color: reportForm.color,
        };
      } else {
        // From registered pets
        if (!reportForm.selectedPetId) {
          toast.error('Please select a pet');
          return;
        }
        const selectedPet = pets.find(p => p.id === reportForm.selectedPetId);
        if (!selectedPet) {
          toast.error('Selected pet not found');
          return;
        }
        petData = {
          petId: selectedPet.id,
          petName: selectedPet.petName,
          species: selectedPet.species,
          breed: selectedPet.breed,
          color: selectedPet.color,
        };
      }

      if (!reportForm.lastSeenLocation || !reportForm.barangay || !reportForm.description) {
        toast.error('Please fill in all location and description fields');
        return;
      }

      const reportData = {
        ...petData,
        type: 'Lost',
        reportedBy: user.username,
        reportedByRole: 'petOwner',
        ownerId: user.ownerId,
        contactNumber: user.username,
        lastSeenLocation: reportForm.lastSeenLocation,
        barangay: reportForm.barangay,
        description: reportForm.description,
      };

      const response = await fetch(
        `/api/lost-found`,
        {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reportData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const data = await response.json();
      setLostFoundReports(prev => [data.report, ...prev]);
      
      // Reset form
      setReportForm({
        selectedPetId: '',
        manualEntry: false,
        petName: '',
        species: '',
        breed: '',
        color: '',
        lastSeenLocation: '',
        barangay: '',
        description: '',
      });
      
      setShowReportLostModal(false);
      toast.success('Lost pet report submitted successfully!');
    } catch (error) {
      console.error('Error reporting lost pet:', error);
      toast.error('Failed to submit lost pet report');
    }
  };

  const handleDownloadCertificate = async (pet: Pet) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 190, 277);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 186, 273);
      
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('REPUBLIC OF THE PHILIPPINES', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('City of Calaca, Batangas', 105, 38, { align: 'center' });
      doc.setFontSize(14);
      doc.text('CITY VETERINARY OFFICE', 105, 46, { align: 'center' });
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('CERTIFICATE OF PET REGISTRATION', 105, 65, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Certificate No: ${pet.id}`, 20, 80);
      doc.text(`Date Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 86);
      
      doc.setFontSize(12);
      doc.text('This is to certify that the following pet has been officially registered', 105, 100, { align: 'center' });
      doc.text('with the City Veterinary Office of Calaca:', 105, 107, { align: 'center' });
      
      const startY = 125;
      const lineHeight = 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Pet Information:', 30, startY);
      doc.setFont('helvetica', 'normal');
      
      const details = [
        `Pet Name: ${pet.petName}`,
        `Species: ${pet.species}`,
        `Breed: ${pet.breed}`,
        `Age: ${pet.age}`,
        `Color: ${pet.color}`,
        `Microchip ID: ${pet.microchipId || 'N/A'}`,
        `Registration Date: ${new Date(pet.registrationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        `Vaccination Status: ${pet.vaccinationStatus}`,
      ];
      
      details.forEach((detail, index) => {
        doc.text(detail, 40, startY + (index + 1) * lineHeight);
      });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Owner Information:', 30, startY + (details.length + 2) * lineHeight);
      doc.setFont('helvetica', 'normal');
      doc.text(`Owner Name: ${user.username}`, 40, startY + (details.length + 3) * lineHeight);
      doc.text(`Owner ID: ${user.ownerId}`, 40, startY + (details.length + 4) * lineHeight);
      
      doc.setFontSize(10);
      doc.text('This certificate is valid and issued in compliance with', 105, 230, { align: 'center' });
      doc.text('Republic Act No. 9482 (Anti-Rabies Act of 2007)', 105, 237, { align: 'center' });
      
      doc.setFont('helvetica', 'bold');
      doc.text('_______________________________', 135, 260, { align: 'center' });
      doc.text('City Veterinarian', 135, 267, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Digitally issued by NASaAlaga System', 105, 280, { align: 'center' });
      doc.text(`Timestamp: ${new Date().toISOString()}`, 105, 285, { align: 'center' });
      
      doc.save(`Certificate_${pet.petName}_${pet.id}_${Date.now()}.pdf`);
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate certificate. Please try again.');
    }
  };

  const filteredReports = lostFoundReports.filter(report => {
    const matchesFilter = lostFoundFilter === 'all' || report.type === lostFoundFilter;
    const matchesSearch = searchQuery === '' || 
      report.petName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.lastSeenLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const myReports = lostFoundReports.filter(r => r.ownerId === user.ownerId);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome, {user.username}!</h2>
          <p className="text-gray-600">Manage your pets and stay updated on their health</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Pets</p>
            <PawPrint className="w-5 h-5 text-[#2B5EA6]" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{pets.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Vaccinated</p>
            <Syringe className="w-5 h-5 text-[#60A85C]" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{pets.filter(p => p.vaccinationStatus === 'Vaccinated').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Lost Reports</p>
            <AlertCircle className="w-5 h-5 text-[#E85D3B]" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{myReports.filter(r => r.status === 'Open').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Vaccinations
          </h3>
        </div>
        <div className="p-6">
          {isLoadingPets ? (
            <p className="text-gray-500 text-center py-4">Loading...</p>
          ) : pets.filter(p => p.vaccinationStatus === 'Due Soon').length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming vaccinations</p>
          ) : (
            <div className="space-y-3">
              {pets.filter(p => p.vaccinationStatus === 'Due Soon').map(pet => (
                <div key={pet.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{pet.petName}</p>
                    <p className="text-sm text-gray-600">Due: {pet.nextVaccinationDate}</p>
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

      {myReports.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              My Lost Pet Reports
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {myReports.slice(0, 3).map(report => (
                <div key={report.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{report.petName}</p>
                    <p className="text-sm text-gray-600">{report.lastSeenLocation} - {report.dateReported}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                      report.status === 'Open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedLostFoundReport(report);
                      setShowLostFoundDetailsModal(true);
                    }}
                    className="px-4 py-2 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPets = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">My Pets</h2>
          <p className="text-gray-600">View and manage your registered pets</p>
        </div>
      </div>

      {isLoadingPets ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-12 h-12 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your pets...</p>
        </div>
      ) : pets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No pets registered yet</p>
          <p className="text-sm text-gray-400 mt-2">Contact the City Veterinary Office to register your pets</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map(pet => (
            <div key={pet.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`h-2 ${
                pet.status === 'Lost' ? 'bg-red-500' : 
                pet.status === 'Found' ? 'bg-green-500' : 
                'bg-[#2B5EA6]'
              }`}></div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{pet.petName}</h3>
                    <p className="text-sm text-gray-500">{pet.id}</p>
                    {pet.petTagId && (() => {
                      const prefix = pet.petTagId.split('-')[0];
                      const colorMap: Record<string,string> = {BLU:'#2B5EA6',PRP:'#8B5CF6',RED:'#E85D3B',GRY:'#6B7280'};
                      const bg = colorMap[prefix] || '#6B7280';
                      return <span style={{display:'inline-block',marginTop:2,padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,color:'#fff',background:bg,letterSpacing:'0.04em'}}>{pet.petTagId}</span>;
                    })()}
                  </div>
                  <PawPrint className="w-6 h-6 text-gray-400" />
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Species:</strong> {pet.species}</p>
                  <p><strong>Breed:</strong> {pet.breed}</p>
                  <p><strong>Age:</strong> {pet.age}</p>
                  <p><strong>Color:</strong> {pet.color}</p>
                  <div className="pt-2 border-t border-gray-200">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      pet.vaccinationStatus === 'Vaccinated' ? 'bg-green-100 text-green-800' :
                      pet.vaccinationStatus === 'Due Soon' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {pet.vaccinationStatus}
                    </span>
                    {pet.status !== 'Active' && (
                      <span className={`inline-block ml-2 px-2 py-1 text-xs rounded-full ${
                        pet.status === 'Lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {pet.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedPet(pet);
                      setShowPetDetails(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadCertificate(pet)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[#60A85C] text-[#60A85C] rounded-md hover:bg-[#60A85C] hover:text-white transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Certificate
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const h = await api.getVaccinationHistory(pet.id);
                        setVaxCardPet(pet);
                        setVaxCardHistory(h.history || []);
                      } catch { toast.error('Could not load vaccination card'); }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-amber-500 text-amber-600 rounded-md hover:bg-amber-500 hover:text-white transition-colors text-sm"
                  >
                    <Syringe className="w-4 h-4" />
                    Vax Card
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLostFound = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Lost & Found</h2>
          <p className="text-gray-600">Report lost pets and view found pets in Calaca City</p>
        </div>
        <button
          onClick={() => setShowReportLostModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#E85D3B] text-white rounded-md hover:bg-[#d64d2b] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Report Lost Pet
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-[#2B5EA6] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700 font-medium">
              Pet Owner Information:
            </p>
            <p className="text-sm text-gray-600 mt-1">
              You can report <strong>lost pets only</strong>. If you find a pet, please surrender it to your barangay office for validation and proper reporting.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by pet name, species, breed, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLostFoundFilter('all')}
              className={`px-4 py-2 rounded-md transition-colors ${
                lostFoundFilter === 'all'
                  ? 'bg-[#2B5EA6] text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLostFoundFilter('Lost')}
              className={`px-4 py-2 rounded-md transition-colors ${
                lostFoundFilter === 'Lost'
                  ? 'bg-[#E85D3B] text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Lost
            </button>
            <button
              onClick={() => setLostFoundFilter('Found')}
              className={`px-4 py-2 rounded-md transition-colors ${
                lostFoundFilter === 'Found'
                  ? 'bg-[#60A85C] text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Found
            </button>
          </div>
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
          {filteredReports.map(report => (
            <div key={report.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`h-2 ${report.type === 'Lost' ? 'bg-[#E85D3B]' : 'bg-[#60A85C]'}`}></div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      report.type === 'Lost' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {report.type}
                    </span>
                  </div>
                  <Heart className="w-5 h-5 text-gray-400" />
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">{report.petName}</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Species:</strong> {report.species}</p>
                  <p><strong>Breed:</strong> {report.breed}</p>
                  <p><strong>Color:</strong> {report.color}</p>
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

      {!isLoadingReports && filteredReports.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No reports found matching your search criteria.</p>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Profile</h2>
        <p className="text-gray-600">Manage your account information</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <p className="font-medium text-gray-800">{user.username}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Owner ID</label>
            <p className="font-medium text-gray-800">{user.ownerId}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <p className="font-medium text-gray-800 capitalize">Pet Owner</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Registered Pets</label>
            <p className="font-medium text-gray-800">{pets.length}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Notifications</h2>
        <p className="text-gray-600">Stay updated on your pets' health and appointments</p>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div key={notif.id} className={`bg-white rounded-lg shadow p-6 ${!notif.read ? 'border-l-4 border-[#2B5EA6]' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-[#2B5EA6]" />
                    <p className="font-medium text-gray-800">{notif.petName}</p>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-gray-600">{notif.message}</p>
                  <p className="text-sm text-gray-400 mt-2">{notif.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCVOServices = () => (<CVOServicesShared userRole={user.role as any} />);
  const _oldRenderCVOServices = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">CVO Services</h2>
        <p className="text-gray-600">Available veterinary services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#2B5EA6]/10 rounded-full flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-[#2B5EA6]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Pet Pre-Registration</h3>
              <p className="text-sm text-gray-500">Submit online, validate in-person</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Pre-register your pet online. Visit our office later for photo capture and final validation.
          </p>
          <button
            onClick={() => setShowPreRegistrationModal(true)}
            className="w-full px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors"
          >
            Pre-Register Now
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#2B5EA6]/10 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#2B5EA6]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Pet Registration</h3>
              <p className="text-sm text-gray-500">Register your new pet</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Official registration of companion animals in compliance with RA 8485 (Animal Welfare Act).
          </p>
          <button
            onClick={() => toast.info('Please visit the City Veterinary Office to register your pet')}
            className="w-full px-4 py-2 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors"
          >
            Learn More
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#60A85C]/10 rounded-full flex items-center justify-center">
              <Syringe className="w-6 h-6 text-[#60A85C]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Anti-Rabies Vaccination</h3>
              <p className="text-sm text-gray-500">Schedule vaccination</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Free anti-rabies vaccination for all dogs and cats in Calaca City.
          </p>
          <button
            onClick={() => toast.info('Please contact the City Veterinary Office to schedule')}
            className="w-full px-4 py-2 border border-[#60A85C] text-[#60A85C] rounded-md hover:bg-[#60A85C] hover:text-white transition-colors"
          >
            Schedule Now
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Header user={user} onLogout={onLogout} onProfileClick={() => setActiveSection('profile')} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="md:hidden mb-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow"
          >
            <span className="font-medium text-gray-800">Menu</span>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {isMobileMenuOpen && (
            <div className="mt-2 bg-white rounded-lg shadow-lg overflow-hidden">
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
                  setActiveSection('pets');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'pets' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                My Pets
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
                Pre-Register Pet
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
                Lost & Found
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
                  setActiveSection('cvoservices');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'cvoservices' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                CVO Services
              </button>
              <button
                onClick={() => {
                  setActiveSection('schedule');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'schedule' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                My Schedule
              </button>
              <button
                onClick={() => {
                  setActiveSection('feedback');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium border-b border-gray-200 ${
                  activeSection === 'feedback' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Feedback & Complaints
              </button>
              <button
                onClick={() => {
                  setActiveSection('profile');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm font-medium ${
                  activeSection === 'profile' ? 'bg-[#2B5EA6] text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Profile
              </button>
            </div>
          )}
        </div>
        
        <div className="hidden md:block mb-8">
          <div className="flex gap-2 border-b border-gray-200">
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
              onClick={() => setActiveSection('pets')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'pets'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              My Pets
            </button>
            <button
              onClick={() => setActiveSection('preregistration')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'preregistration'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Pre-Register Pet
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
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                activeSection === 'notifications'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Notifications
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveSection('cvoservices')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'cvoservices'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              CVO Services
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
          </div>
        </div>

        {activeSection === 'dashboard' && renderDashboard()}
        {activeSection === 'pets' && renderPets()}
        {activeSection === 'preregistration' && (
          <PetPreRegistration ownerId={user.ownerId} ownerEmail={user.email} />
        )}
        {activeSection === 'lostfound' && renderLostFound()}
        {activeSection === 'notifications' && renderNotifications()}
        {activeSection === 'cvoservices' && renderCVOServices()}
        {activeSection === 'feedback' && (
          <UserFeedback user={user} />
        )}
        {activeSection === 'schedule' && (
          <ScheduleModule user={user} />
        )}
        {activeSection === 'profile' && (
          <MyProfile user={user} onUserUpdate={(u) => { const s = sessionStorage.getItem('nasaalaga_user'); if(s){try{const p=JSON.parse(s);Object.assign(p,u);sessionStorage.setItem('nasaalaga_user',JSON.stringify(p));window.dispatchEvent(new Event('nasaalaga_profile_updated'));}catch{}} }} />
        )}
      </div>

      {showReportLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReportLostModal(false)}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Report Lost Pet</h3>
                <p className="text-sm text-gray-500 mt-1">Found pets must be surrendered to the barangay for validation</p>
              </div>
              <button
                onClick={() => setShowReportLostModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setReportForm(prev => ({ ...prev, manualEntry: false }))}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    !reportForm.manualEntry
                      ? 'border-[#2B5EA6] bg-[#2B5EA6]/10 text-[#2B5EA6]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Select Registered Pet
                </button>
                <button
                  onClick={() => setReportForm(prev => ({ ...prev, manualEntry: true }))}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    reportForm.manualEntry
                      ? 'border-[#2B5EA6] bg-[#2B5EA6]/10 text-[#2B5EA6]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Enter Manually for Unregistered Pets
                </button>
              </div>

              {!reportForm.manualEntry ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Pet</label>
                  <select
                    value={reportForm.selectedPetId}
                    onChange={(e) => setReportForm(prev => ({ ...prev, selectedPetId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  >
                    <option value="">-- Select a registered pet --</option>
                    {pets.filter(p => p.status === 'Active').map(pet => (
                      <option key={pet.id} value={pet.id}>
                        {pet.petName} ({pet.species} - {pet.breed})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pet Name</label>
                    <input
                      type="text"
                      value={reportForm.petName}
                      onChange={(e) => setReportForm(prev => ({ ...prev, petName: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                      placeholder="Enter pet name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Species</label>
                    <input
                      type="text"
                      value={reportForm.species}
                      onChange={(e) => setReportForm(prev => ({ ...prev, species: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                      placeholder="Dog, Cat, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Breed</label>
                    <input
                      type="text"
                      value={reportForm.breed}
                      onChange={(e) => setReportForm(prev => ({ ...prev, breed: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                      placeholder="Enter breed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <input
                      type="text"
                      value={reportForm.color}
                      onChange={(e) => setReportForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                      placeholder="Enter color"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Seen Location</label>
                  <input
                    type="text"
                    value={reportForm.lastSeenLocation}
                    onChange={(e) => setReportForm(prev => ({ ...prev, lastSeenLocation: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                    placeholder="e.g., Near City Hall"
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
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={`Barangay ${num}`}>Barangay {num}</option>
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
                  placeholder="Describe the pet and circumstances of when it was last seen..."
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
                  onClick={handleReportLostPet}
                  className="flex-1 px-4 py-3 bg-[#E85D3B] text-white rounded-md hover:bg-[#d64d2b] transition-colors font-medium"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPetDetails && selectedPet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPetDetails(false)}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedPet.petName}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedPet.id}</p>
              </div>
              <button
                onClick={() => setShowPetDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Species</label>
                  <p className="font-medium text-gray-800">{selectedPet.species}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Breed</label>
                  <p className="font-medium text-gray-800">{selectedPet.breed}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Age</label>
                  <p className="font-medium text-gray-800">{selectedPet.age}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Color</label>
                  <p className="font-medium text-gray-800">{selectedPet.color}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Microchip ID</label>
                  <p className="font-medium text-gray-800">{selectedPet.microchipId || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Registration Date</label>
                  <p className="font-medium text-gray-800">{selectedPet.registrationDate}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Vaccination Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    selectedPet.vaccinationStatus === 'Vaccinated' ? 'bg-green-100 text-green-800' :
                    selectedPet.vaccinationStatus === 'Due Soon' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedPet.vaccinationStatus}
                  </span>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    selectedPet.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                    selectedPet.status === 'Lost' ? 'bg-red-100 text-red-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedPet.status}
                  </span>
                </div>
              </div>

              {selectedPet.lastVaccinationDate && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Last Vaccination</label>
                  <p className="font-medium text-gray-800">{selectedPet.lastVaccinationDate}</p>
                </div>
              )}

              {selectedPet.nextVaccinationDate && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Next Vaccination Due</label>
                  <p className="font-medium text-gray-800">{selectedPet.nextVaccinationDate}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleDownloadCertificate(selectedPet);
                    setShowPetDetails(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Registration Certificate
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

      {showPreRegistrationModal && (
        <PetPreRegistration
          ownerId={user.ownerId || ''}
          ownerEmail={user.username}
          onClose={() => setShowPreRegistrationModal(false)}
          onSuccess={() => {
            // Optionally refresh pets list
            toast.success('Pre-registration submitted! Check your email for confirmation.');
          }}
        />
      )}

      {vaxCardPet && (
        <VaccinationCard
          pet={vaxCardPet}
          history={vaxCardHistory}
          onClose={() => { setVaxCardPet(null); setVaxCardHistory([]); }}
        />
      )}

      <Footer />
    </>
  );
}