import { useState, useEffect } from 'react';
import { ClipboardList, Eye, Check, X, Upload, Calendar, User, Phone, Mail, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CALACA_BARANGAYS } from '../utils/barangays';


interface PreRegisteredPet {
  preRegNumber: string;
  ownerId: string;
  petName: string;
  species: string;
  breed: string;
  age: string;
  color: string;
  gender: string;
  ownerName: string;
  contactNumber: string;
  ownerEmail: string;
  barangay: string;
  address: string;
  status: 'Pending' | 'Approved' | 'Denied';
  submittedDate: string;
  approvedDate?: string;
  deniedDate?: string;
  denialReason?: string;
  petId?: string;
}

export function PreRegisteredPets() {
  const [preRegistrations, setPreRegistrations] = useState<PreRegisteredPet[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<PreRegisteredPet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Approved' | 'Denied'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreReg, setSelectedPreReg] = useState<PreRegisteredPet | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  
  // Validation form
  const [validationForm, setValidationForm] = useState({
    petId: '',
    photo: '',
    action: 'approve' as 'approve' | 'deny',
    denialReason: ''
  });

  // Fetch pre-registered pets
  useEffect(() => {
    fetchPreRegistrations();
  }, []);

  // Filter and search
  useEffect(() => {
    let filtered = preRegistrations;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(p => p.status === filter);
    }

    // Search
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.petName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.preRegNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.species.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRegistrations(filtered);
  }, [preRegistrations, filter, searchQuery]);

  const fetchPreRegistrations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/pets/pre-registered`,
        {
          headers: {
            
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pre-registrations');
      }

      const data = await response.json();
      setPreRegistrations(data.preRegistrations || []);
    } catch (error) {
      console.error('Error fetching pre-registrations:', error);
      toast.error('Failed to load pre-registrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedPreReg) return;

    if (validationForm.action === 'approve') {
      if (!validationForm.petId || !validationForm.photo) {
        toast.error('Please provide Pet ID and photo');
        return;
      }
    } else if (validationForm.action === 'deny') {
      if (!validationForm.denialReason) {
        toast.error('Please provide a reason for denial');
        return;
      }
    }

    try {
      const response = await fetch(
        `/api/pets/validate/${selectedPreReg.preRegNumber}`,
        {
          method: 'POST',
          headers: {
            
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: validationForm.action,
            petId: validationForm.petId,
            photo: validationForm.photo,
            denialReason: validationForm.denialReason
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to validate pre-registration');
      }

      const data = await response.json();
      
      if (validationForm.action === 'approve') {
        toast.success(`Pet ${validationForm.petId} validated and registered successfully!`);
      } else {
        toast.success('Pre-registration denied');
      }

      // Refresh list
      await fetchPreRegistrations();
      
      // Reset and close
      setShowValidationModal(false);
      setSelectedPreReg(null);
      setValidationForm({
        petId: '',
        photo: '',
        action: 'approve',
        denialReason: ''
      });
    } catch (error) {
      console.error('Error validating pre-registration:', error);
      toast.error('Failed to validate pre-registration');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValidationForm(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePetId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `PET-${timestamp}-${random}`;
  };

  const pendingCount = preRegistrations.filter(p => p.status === 'Pending').length;
  const approvedCount = preRegistrations.filter(p => p.status === 'Approved').length;
  const deniedCount = preRegistrations.filter(p => p.status === 'Denied').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-[#2B5EA6]" />
            Pre-Registered Pets
          </h1>
          <p className="text-gray-600 mt-1">Review and validate pet pre-registrations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Validation</p>
              <p className="text-3xl font-bold text-[#F39C3A]">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-[#F39C3A]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Approved</p>
              <p className="text-3xl font-bold text-[#60A85C]">{approvedCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#60A85C]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Denied</p>
              <p className="text-3xl font-bold text-[#E85D3B]">{deniedCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-[#E85D3B]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by pet name, owner, or pre-reg number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#2B5EA6] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('Pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'Pending'
                  ? 'bg-[#F39C3A] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('Approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'Approved'
                  ? 'bg-[#60A85C] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('Denied')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'Denied'
                  ? 'bg-[#E85D3B] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Denied
            </button>
          </div>
        </div>
      </div>

      {/* Pre-Registrations List */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-12 h-12 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading pre-registrations...</p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No pre-registrations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRegistrations.map((preReg) => (
            <div key={preReg.preRegNumber} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className={`h-2 rounded-t-lg ${
                preReg.status === 'Pending' ? 'bg-[#F39C3A]' :
                preReg.status === 'Approved' ? 'bg-[#60A85C]' :
                'bg-[#E85D3B]'
              }`}></div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{preReg.petName}</h3>
                    <p className="text-sm text-gray-500 font-mono">{preReg.preRegNumber}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    preReg.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                    preReg.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {preReg.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>Species:</strong> {preReg.species}</p>
                    <p><strong>Breed:</strong> {preReg.breed}</p>
                    <p><strong>Age:</strong> {preReg.age}</p>
                    <p><strong>Gender:</strong> {preReg.gender}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-600"><strong>Owner:</strong> {preReg.ownerName}</p>
                    <p className="text-gray-600 text-xs">{preReg.contactNumber} • {preReg.ownerEmail}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Submitted: {new Date(preReg.submittedDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedPreReg(preReg);
                      setShowDetailsModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  {preReg.status === 'Pending' && (
                    <button
                      onClick={() => {
                        setSelectedPreReg(preReg);
                        setValidationForm({
                          petId: generatePetId(),
                          photo: '',
                          action: 'approve',
                          denialReason: ''
                        });
                        setShowValidationModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Validate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPreReg && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#2B5EA6] to-[#3d7ac7] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Pre-Registration Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedPreReg.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                    selectedPreReg.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedPreReg.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Pre-Reg #: {selectedPreReg.preRegNumber}</p>
              </div>

              {/* Pet Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Pet Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Pet Name</label>
                    <p className="font-medium text-gray-800">{selectedPreReg.petName}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Species</label>
                    <p className="font-medium text-gray-800">{selectedPreReg.species}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Breed</label>
                    <p className="font-medium text-gray-800">{selectedPreReg.breed}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Age</label>
                    <p className="font-medium text-gray-800">{selectedPreReg.age}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Color/Markings</label>
                    <p className="font-medium text-gray-800">{selectedPreReg.color}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Gender</label>
                    <p className="font-medium text-gray-800">{selectedPreReg.gender}</p>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Owner Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-800">{selectedPreReg.ownerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-800">{selectedPreReg.contactNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-800">{selectedPreReg.ownerEmail}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-gray-800">{selectedPreReg.address}</p>
                      <p className="text-sm text-gray-600">{selectedPreReg.barangay}, Calaca City</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Submitted:</strong> {new Date(selectedPreReg.submittedDate).toLocaleString()}
                </p>
                {selectedPreReg.approvedDate && (
                  <p className="text-sm text-green-800 mt-1">
                    <strong>Approved:</strong> {new Date(selectedPreReg.approvedDate).toLocaleString()}
                  </p>
                )}
                {selectedPreReg.deniedDate && (
                  <>
                    <p className="text-sm text-red-800 mt-1">
                      <strong>Denied:</strong> {new Date(selectedPreReg.deniedDate).toLocaleString()}
                    </p>
                    {selectedPreReg.denialReason && (
                      <p className="text-sm text-red-800 mt-1">
                        <strong>Reason:</strong> {selectedPreReg.denialReason}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && selectedPreReg && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#60A85C] to-[#4a8a47] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Validate Pre-Registration</h2>
              <button
                onClick={() => setShowValidationModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Pet Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">{selectedPreReg.petName}</h3>
                <p className="text-sm text-gray-600">{selectedPreReg.species} • {selectedPreReg.breed} • {selectedPreReg.color}</p>
                <p className="text-xs text-gray-500 mt-1">Owner: {selectedPreReg.ownerName}</p>
              </div>

              {/* Action Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Action</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setValidationForm(prev => ({ ...prev, action: 'approve' }))}
                    className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                      validationForm.action === 'approve'
                        ? 'border-[#60A85C] bg-green-50 text-[#60A85C]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Check className="w-5 h-5 mx-auto mb-1" />
                    <span className="font-medium">Approve & Register</span>
                  </button>
                  <button
                    onClick={() => setValidationForm(prev => ({ ...prev, action: 'deny' }))}
                    className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                      validationForm.action === 'deny'
                        ? 'border-[#E85D3B] bg-red-50 text-[#E85D3B]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <X className="w-5 h-5 mx-auto mb-1" />
                    <span className="font-medium">Deny</span>
                  </button>
                </div>
              </div>

              {validationForm.action === 'approve' ? (
                <>
                  {/* Pet ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Pet ID <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={validationForm.petId}
                        onChange={(e) => setValidationForm(prev => ({ ...prev, petId: e.target.value }))}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#60A85C]"
                        placeholder="PET-XXXXX"
                      />
                      <button
                        onClick={() => setValidationForm(prev => ({ ...prev, petId: generatePetId() }))}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Pet Photo <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#60A85C] transition-colors">
                      {validationForm.photo ? (
                        <div className="space-y-3">
                          <img
                            src={validationForm.photo}
                            alt="Pet"
                            className="w-48 h-48 object-cover rounded-lg mx-auto"
                          />
                          <button
                            onClick={() => setValidationForm(prev => ({ ...prev, photo: '' }))}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove Photo
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Complete Validation</p>
                        <p>Once you approve this pre-registration, the pet will be officially registered in the system with the assigned ID and photo.</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Denial Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Denial <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={validationForm.denialReason}
                      onChange={(e) => setValidationForm(prev => ({ ...prev, denialReason: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D3B]"
                      placeholder="Provide a clear reason for denying this pre-registration..."
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Denial Notice</p>
                        <p>The pet owner will be notified via email with the reason for denial. They can resubmit with corrections if needed.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleValidate}
                  className={`flex-1 px-6 py-3 text-white rounded-lg font-semibold transition-colors ${
                    validationForm.action === 'approve'
                      ? 'bg-[#60A85C] hover:bg-[#4a8a47]'
                      : 'bg-[#E85D3B] hover:bg-[#d64d2b]'
                  }`}
                >
                  {validationForm.action === 'approve' ? 'Complete Validation & Register' : 'Deny Pre-Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
