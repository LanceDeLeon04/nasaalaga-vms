import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Heart, FileText, Search, Eye, MapPin, Phone, Calendar, AlertCircle } from 'lucide-react';
import { LostFoundDetailsModal } from './LostFoundDetailsModal';
import { toast } from 'sonner';
import type { User as UserType } from '../App';


interface GuestDashboardProps {
  user: UserType;
  onLogout: () => void;
}

interface LostFoundReport {
  id: string;
  type: 'Lost' | 'Found';
  petName: string;
  species: string;
  breed: string;
  color: string;
  lastSeenLocation: string;
  dateReported: string;
  reportedBy: string;
  contactNumber: string;
  description: string;
  photo?: string;
  status: 'Open' | 'Resolved';
  barangay: string;
  petId?: string;
}

export function GuestDashboard({ user, onLogout }: GuestDashboardProps) {
  const [activeSection, setActiveSection] = useState<'lostfound' | 'cvoservices'>('lostfound');
  const [selectedReport, setSelectedReport] = useState<LostFoundReport | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [lostFoundFilter, setLostFoundFilter] = useState<'all' | 'Lost' | 'Found'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lostFoundReports, setLostFoundReports] = useState<LostFoundReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch lost & found reports from Supabase
  useEffect(() => {
    const fetchLostFound = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/lost-found`,
          {
            headers: {
              
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch lost & found reports');
        }

        const data = await response.json();
        setLostFoundReports(data.reports || []);
      } catch (error) {
        console.error('Error fetching lost & found reports:', error);
        toast.error('Failed to load lost & found reports');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLostFound();
  }, []);

  const filteredLostFoundReports = lostFoundReports.filter(report => {
    const matchesFilter = lostFoundFilter === 'all' || report.type === lostFoundFilter;
    const matchesSearch = searchQuery === '' || 
      report.petName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.lastSeenLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderLostFound = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">Lost & Found Pets</h2>
          <p className="text-gray-600">Report or search for lost and found pets in Calaca City</p>
        </div>
      </div>

      {/* Alert for guests */}
      <div className="bg-blue-50 border-l-4 border-[#2B5EA6] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700">
              <strong>Guest Mode:</strong> You can view lost and found reports and CVO services information. To report a lost or found pet, please log in or contact the City Veterinary Office directly.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
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

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-12 h-12 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading reports...</p>
        </div>
      )}

      {/* Reports Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLostFoundReports.map(report => (
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

                <h3 className="text-gray-800 font-medium mb-2">{report.petName}</h3>
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
                    setSelectedReport(report);
                    setShowDetailsModal(true);
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

      {!isLoading && filteredLostFoundReports.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No reports found matching your search criteria.</p>
        </div>
      )}
    </div>
  );

  const renderCVOServices = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">CVO Services</h2>
          <p className="text-gray-600">Available veterinary services in Calaca City</p>
        </div>
      </div>

      {/* Alert for guests */}
      <div className="bg-blue-50 border-l-4 border-[#2B5EA6] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700">
              <strong>Guest Mode:</strong> You can view available services and download forms. To submit applications or book appointments, please log in or visit the City Veterinary Office.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pet Registration */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#2B5EA6]/10 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#2B5EA6]" />
            </div>
            <div>
              <h3 className="text-gray-800 font-medium">Pet Registration</h3>
              <p className="text-sm text-gray-500">Register your pet with the city</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Official registration of companion animals in compliance with RA 8485 (Animal Welfare Act). Required for all pet owners in Calaca City.
          </p>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p><strong>Requirements:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Valid ID of owner</li>
              <li>Pet vaccination records</li>
              <li>Recent photo of pet</li>
              <li>Proof of residence</li>
            </ul>
          </div>
          <button
            onClick={() => toast.info('Please log in to submit a registration application')}
            className="w-full px-4 py-2 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors"
          >
            View Form
          </button>
        </div>

        {/* Anti-Rabies Vaccination */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#60A85C]/10 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#60A85C]" />
            </div>
            <div>
              <h3 className="text-gray-800 font-medium">Anti-Rabies Vaccination</h3>
              <p className="text-sm text-gray-500">Schedule vaccination appointment</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Free anti-rabies vaccination for all dogs and cats in Calaca City. Part of the city's rabies prevention program.
          </p>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p><strong>Schedule:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Every Monday-Friday, 8:00 AM - 4:00 PM</li>
              <li>Free vaccination days: First Saturday of every month</li>
              <li>Walk-ins welcome</li>
            </ul>
          </div>
          <button
            onClick={() => toast.info('Please log in to book an appointment')}
            className="w-full px-4 py-2 border border-[#60A85C] text-[#60A85C] rounded-md hover:bg-[#60A85C] hover:text-white transition-colors"
          >
            Book Appointment
          </button>
        </div>

        {/* Health Certificate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#F39C3A]/10 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#F39C3A]" />
            </div>
            <div>
              <h3 className="text-gray-800 font-medium">Health Certificate</h3>
              <p className="text-sm text-gray-500">For pets and livestock</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Official health certificate for travel, sale, or transport of animals. Valid for 30 days from issuance.
          </p>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p><strong>Requirements:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Pet registration certificate</li>
              <li>Updated vaccination records</li>
              <li>Physical examination by city vet</li>
              <li>Processing fee: ₱200</li>
            </ul>
          </div>
          <button
            onClick={() => toast.info('Please log in to apply for a health certificate')}
            className="w-full px-4 py-2 border border-[#F39C3A] text-[#F39C3A] rounded-md hover:bg-[#F39C3A] hover:text-white transition-colors"
          >
            Apply Now
          </button>
        </div>

        {/* Livestock Registration */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#E85D3B]/10 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#E85D3B]" />
            </div>
            <div>
              <h3 className="text-gray-800 font-medium">Livestock Registration</h3>
              <p className="text-sm text-gray-500">Register farm animals</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Mandatory registration for all livestock owners. Enables disease monitoring and outbreak prevention.
          </p>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p><strong>Covered Animals:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Cattle, Carabao, Horses</li>
              <li>Swine (Pigs)</li>
              <li>Goats and Sheep</li>
              <li>Poultry (Chickens, Ducks)</li>
            </ul>
          </div>
          <button
            onClick={() => toast.info('Please log in to register livestock')}
            className="w-full px-4 py-2 border border-[#E85D3B] text-[#E85D3B] rounded-md hover:bg-[#E85D3B] hover:text-white transition-colors"
          >
            Register Livestock
          </button>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-800 font-medium mb-4">City Veterinary Office Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#2B5EA6]" />
            <span>Calaca City Hall, Calaca, Batangas</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#2B5EA6]" />
            <span>(043) 123-4567</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2B5EA6]" />
            <span>Monday - Friday: 8:00 AM - 5:00 PM</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2B5EA6]" />
            <span>Email: cvo@calacacity.gov.ph</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Header user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <div className="flex gap-2 border-b border-gray-200">
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
              onClick={() => setActiveSection('cvoservices')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === 'cvoservices'
                  ? 'border-[#2B5EA6] text-[#2B5EA6]'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              CVO Services
            </button>
          </div>
        </div>

        {/* Content */}
        {activeSection === 'lostfound' && renderLostFound()}
        {activeSection === 'cvoservices' && renderCVOServices()}
      </div>

      {/* Lost & Found Details Modal */}
      {showDetailsModal && selectedReport && (
        <LostFoundDetailsModal
          report={selectedReport}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReport(null);
          }}
        />
      )}

      <Footer />
    </>
  );
}