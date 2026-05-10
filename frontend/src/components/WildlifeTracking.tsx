import { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, FileText, AlertCircle, MapPin, Calendar, Download, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WildAnimal {
  id: string;
  species: string;
  commonName: string;
  scientificName: string;
  location: string;
  sightingDate: string;
  status: 'Monitored' | 'Rescued' | 'Released' | 'Under Care';
  reportedBy: string;
  description: string;
  threatLevel: 'Low' | 'Medium' | 'High';
}

interface WildlifePetApplication {
  id: string;
  applicantName: string;
  species: string;
  applicationDate: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Denied';
  permitNumber?: string;
  requirements: {
    validId: boolean;
    cagePhoto: boolean;
    veterinaryCert: boolean;
    barangayClearance: boolean;
  };
}

export function WildlifeTracking() {
  const [activeTab, setActiveTab] = useState<'tracking' | 'pets' | 'applications'>('tracking');
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showAddApplication, setShowAddApplication] = useState(false);
  const [showAnimalDetails, setShowAnimalDetails] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<WildAnimal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for wild animals
  const [wildAnimals, setWildAnimals] = useState<WildAnimal[]>([
    {
      id: 'WA-001',
      species: 'Philippine Eagle',
      commonName: 'Haring Ibon',
      scientificName: 'Pithecophaga jefferyi',
      location: 'Barangay 8, Forest Area',
      sightingDate: '2025-02-10',
      status: 'Monitored',
      reportedBy: 'BAHW - Juan Dela Cruz',
      description: 'Sighted in forest area, appears healthy. Monitoring nest site.',
      threatLevel: 'High',
    },
    {
      id: 'WA-002',
      species: 'Philippine Tarsier',
      commonName: 'Maumag',
      scientificName: 'Carlito syrichta',
      location: 'Barangay 5, Mangrove Area',
      sightingDate: '2025-02-12',
      status: 'Rescued',
      reportedBy: 'Local Resident - Maria Santos',
      description: 'Found injured, currently under veterinary care.',
      threatLevel: 'Medium',
    },
    {
      id: 'WA-003',
      species: 'Reticulated Python',
      commonName: 'Sawa',
      scientificName: 'Malayopython reticulatus',
      location: 'Barangay 3, Rice Fields',
      sightingDate: '2025-02-14',
      status: 'Released',
      reportedBy: 'BAHW - Pedro Garcia',
      description: 'Captured in residential area, healthy, released to natural habitat.',
      threatLevel: 'Low',
    },
  ]);

  // Mock data for wildlife pet applications
  const [applications, setApplications] = useState<WildlifePetApplication[]>([
    {
      id: 'WPA-001',
      applicantName: 'Roberto Cruz',
      species: 'Philippine Cockatoo (Kalangay)',
      applicationDate: '2025-02-01',
      status: 'Under Review',
      requirements: {
        validId: true,
        cagePhoto: true,
        veterinaryCert: true,
        barangayClearance: false,
      },
    },
    {
      id: 'WPA-002',
      applicantName: 'Ana Reyes',
      species: 'Brahminy Kite (Lawin)',
      applicationDate: '2025-01-28',
      status: 'Approved',
      permitNumber: 'WP-2025-0001',
      requirements: {
        validId: true,
        cagePhoto: true,
        veterinaryCert: true,
        barangayClearance: true,
      },
    },
    {
      id: 'WPA-003',
      applicantName: 'Jose Martinez',
      species: 'Monitor Lizard (Bayawak)',
      applicationDate: '2025-02-05',
      status: 'Pending',
      requirements: {
        validId: true,
        cagePhoto: false,
        veterinaryCert: false,
        barangayClearance: false,
      },
    },
  ]);

  const [newAnimal, setNewAnimal] = useState<Partial<WildAnimal>>({
    species: '',
    commonName: '',
    scientificName: '',
    location: '',
    sightingDate: '',
    status: 'Monitored',
    reportedBy: '',
    description: '',
    threatLevel: 'Low',
  });

  const handleAddAnimal = () => {
    if (!newAnimal.species || !newAnimal.location || !newAnimal.sightingDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const animal: WildAnimal = {
      id: `WA-${String(wildAnimals.length + 1).padStart(3, '0')}`,
      species: newAnimal.species!,
      commonName: newAnimal.commonName || '',
      scientificName: newAnimal.scientificName || '',
      location: newAnimal.location!,
      sightingDate: newAnimal.sightingDate!,
      status: newAnimal.status as WildAnimal['status'] || 'Monitored',
      reportedBy: newAnimal.reportedBy || 'Unknown',
      description: newAnimal.description || '',
      threatLevel: newAnimal.threatLevel as WildAnimal['threatLevel'] || 'Low',
    };

    setWildAnimals([...wildAnimals, animal]);
    setShowAddAnimal(false);
    setNewAnimal({
      species: '',
      commonName: '',
      scientificName: '',
      location: '',
      sightingDate: '',
      status: 'Monitored',
      reportedBy: '',
      description: '',
      threatLevel: 'Low',
    });
    toast.success('Wild animal record added successfully');
  };

  const handleDownloadReport = async (animal: WildAnimal) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('WILDLIFE SIGHTING REPORT', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('City Veterinary Office - Calaca City, Batangas', 105, 28, { align: 'center' });
      
      // Report details
      let yPos = 45;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Report ID:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(animal.id, 70, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Species:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(animal.species, 70, yPos);
      
      if (animal.commonName) {
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Common Name:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(animal.commonName, 70, yPos);
      }
      
      if (animal.scientificName) {
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Scientific Name:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(animal.scientificName, 70, yPos);
      }
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Location:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(animal.location, 70, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Sighting Date:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(animal.sightingDate, 70, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(animal.status, 70, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Threat Level:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(animal.threatLevel, 70, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Reported By:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(animal.reportedBy, 70, yPos);
      
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('Description:', 20, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(animal.description, 170);
      doc.text(descLines, 20, yPos);
      
      // Footer
      doc.setFontSize(8);
      doc.text('Generated by NASaAlaga System', 105, 280, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
      
      doc.save(`Wildlife_Report_${animal.id}_${Date.now()}.pdf`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    }
  };

  const filteredAnimals = wildAnimals.filter(animal => 
    searchQuery === '' ||
    animal.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    animal.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    animal.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTracking = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-800 font-medium">Wild Animals Tracking</h3>
          <p className="text-sm text-gray-600">Monitor and track wildlife sightings in Calaca City</p>
        </div>
        <button
          onClick={() => setShowAddAnimal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sighting
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by species, common name, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
        />
      </div>

      {/* Animals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAnimals.map(animal => (
          <div key={animal.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
            <div className={`h-2 ${
              animal.threatLevel === 'High' ? 'bg-red-500' :
              animal.threatLevel === 'Medium' ? 'bg-orange-500' :
              'bg-green-500'
            }`}></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-gray-800 font-medium">{animal.species}</h4>
                  {animal.commonName && (
                    <p className="text-sm text-gray-500">{animal.commonName}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  animal.status === 'Monitored' ? 'bg-blue-100 text-blue-700' :
                  animal.status === 'Rescued' ? 'bg-orange-100 text-orange-700' :
                  animal.status === 'Released' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {animal.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="flex-1">{animal.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <p>{animal.sightingDate}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-4 h-4 ${
                    animal.threatLevel === 'High' ? 'text-red-500' :
                    animal.threatLevel === 'Medium' ? 'text-orange-500' :
                    'text-green-500'
                  }`} />
                  <p>Threat: {animal.threatLevel}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedAnimal(animal);
                    setShowAnimalDetails(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleDownloadReport(animal)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Report
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApplications = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-800 font-medium">Wildlife as Pet Applications</h3>
          <p className="text-sm text-gray-600">Applications for keeping wildlife species as pets</p>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-yellow-50 border-l-4 border-[#F39C3A] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#F39C3A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700">
              <strong>Important:</strong> Keeping wildlife as pets requires special permits and must comply with RA 9147 (Wildlife Resources Conservation and Protection Act) and DENR regulations.
            </p>
          </div>
        </div>
      </div>

      {/* Required Documents Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-gray-800 font-medium mb-4">Required Documents for Application</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-[#60A85C] flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-800">Valid Government ID</p>
              <p className="text-xs">UMID, Driver's License, Passport, etc.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-[#60A85C] flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-800">Cage/Enclosure Photos</p>
              <p className="text-xs">Must meet minimum size requirements</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-[#60A85C] flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-800">Veterinary Certificate</p>
              <p className="text-xs">Health assessment of the animal</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-[#60A85C] flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-800">Barangay Clearance</p>
              <p className="text-xs">Proof of residence and good standing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Species</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requirements</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-800">{app.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{app.applicantName}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{app.species}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.applicationDate}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      app.status === 'Denied' ? 'bg-red-100 text-red-700' :
                      app.status === 'Under Review' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-1">
                      {Object.entries(app.requirements).map(([key, value]) => (
                        <div
                          key={key}
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            value ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}
                          title={key}
                        >
                          {value ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.info('Application details view')}
                        className="p-1 text-[#2B5EA6] hover:bg-blue-50 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {app.status === 'Approved' && (
                        <button
                          onClick={() => toast.success('Permit downloaded')}
                          className="p-1 text-[#60A85C] hover:bg-green-50 rounded transition-colors"
                          title="Download Permit"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('tracking')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'tracking'
                ? 'border-[#2B5EA6] text-[#2B5EA6]'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Wild Animals Tracking
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'applications'
                ? 'border-[#2B5EA6] text-[#2B5EA6]'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Wildlife as Pet Applications
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'tracking' && renderTracking()}
      {activeTab === 'applications' && renderApplications()}

      {/* Add Animal Modal */}
      {showAddAnimal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-gray-800 font-medium">Add Wildlife Sighting</h3>
              <button
                onClick={() => setShowAddAnimal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Species *</label>
                  <input
                    type="text"
                    value={newAnimal.species}
                    onChange={(e) => setNewAnimal({ ...newAnimal, species: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                    placeholder="e.g., Philippine Eagle"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Common Name</label>
                  <input
                    type="text"
                    value={newAnimal.commonName}
                    onChange={(e) => setNewAnimal({ ...newAnimal, commonName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                    placeholder="e.g., Haring Ibon"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Scientific Name</label>
                <input
                  type="text"
                  value={newAnimal.scientificName}
                  onChange={(e) => setNewAnimal({ ...newAnimal, scientificName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  placeholder="e.g., Pithecophaga jefferyi"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  value={newAnimal.location}
                  onChange={(e) => setNewAnimal({ ...newAnimal, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  placeholder="e.g., Barangay 8, Forest Area"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Sighting Date *</label>
                  <input
                    type="date"
                    value={newAnimal.sightingDate}
                    onChange={(e) => setNewAnimal({ ...newAnimal, sightingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Status</label>
                  <select
                    value={newAnimal.status}
                    onChange={(e) => setNewAnimal({ ...newAnimal, status: e.target.value as WildAnimal['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  >
                    <option value="Monitored">Monitored</option>
                    <option value="Rescued">Rescued</option>
                    <option value="Released">Released</option>
                    <option value="Under Care">Under Care</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Reported By</label>
                  <input
                    type="text"
                    value={newAnimal.reportedBy}
                    onChange={(e) => setNewAnimal({ ...newAnimal, reportedBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                    placeholder="Name of reporter"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Threat Level</label>
                  <select
                    value={newAnimal.threatLevel}
                    onChange={(e) => setNewAnimal({ ...newAnimal, threatLevel: e.target.value as WildAnimal['threatLevel'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Description</label>
                <textarea
                  value={newAnimal.description}
                  onChange={(e) => setNewAnimal({ ...newAnimal, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  placeholder="Detailed description of the sighting..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleAddAnimal}
                  className="flex-1 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors"
                >
                  Add Sighting
                </button>
                <button
                  onClick={() => setShowAddAnimal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animal Details Modal */}
      {showAnimalDetails && selectedAnimal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-gray-800 font-medium">Wildlife Sighting Details</h3>
              <button
                onClick={() => {
                  setShowAnimalDetails(false);
                  setSelectedAnimal(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Report ID</label>
                  <p className="font-medium text-gray-800">{selectedAnimal.id}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                    selectedAnimal.status === 'Monitored' ? 'bg-blue-100 text-blue-700' :
                    selectedAnimal.status === 'Rescued' ? 'bg-orange-100 text-orange-700' :
                    selectedAnimal.status === 'Released' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {selectedAnimal.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Species</label>
                <p className="font-medium text-gray-800">{selectedAnimal.species}</p>
              </div>
              {selectedAnimal.commonName && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Common Name</label>
                  <p className="font-medium text-gray-800">{selectedAnimal.commonName}</p>
                </div>
              )}
              {selectedAnimal.scientificName && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Scientific Name</label>
                  <p className="font-medium text-gray-800 italic">{selectedAnimal.scientificName}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Location</label>
                <p className="font-medium text-gray-800">{selectedAnimal.location}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Sighting Date</label>
                <p className="font-medium text-gray-800">{selectedAnimal.sightingDate}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Threat Level</label>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  selectedAnimal.threatLevel === 'High' ? 'bg-red-100 text-red-700' :
                  selectedAnimal.threatLevel === 'Medium' ? 'bg-orange-100 text-orange-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedAnimal.threatLevel}
                </span>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Reported By</label>
                <p className="font-medium text-gray-800">{selectedAnimal.reportedBy}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <p className="text-gray-800">{selectedAnimal.description}</p>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadReport(selectedAnimal)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
