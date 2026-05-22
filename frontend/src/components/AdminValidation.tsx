import { useState } from 'react';
import {
  Search, CheckCircle, XCircle, Clock, AlertTriangle,
  Camera, Tag, Eye, ChevronRight, User, PawPrint,
  CalendarClock, BadgeCheck, ArrowRight
} from 'lucide-react';
import { MOCK_PETS, MOCK_USERS, type Pet } from '../types';

interface AdminValidationProps {
  adminUserId: string;
}

type ValidationStep = 'list' | 'review' | 'photo' | 'tag' | 'done';

export function AdminValidation({ adminUserId }: AdminValidationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Pet | null>(null);
  const [valStep, setValStep] = useState<ValidationStep>('list');
  const [petTagInput, setPetTagInput] = useState('');
  const [tagError, setTagError] = useState('');
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [notes, setNotes] = useState('');
  const [registeredPets, setRegisteredPets] = useState<string[]>([]);

  const admin = MOCK_USERS.find(u => u.id === adminUserId)!;

  // Pre-registered pets pending validation
  const preRegistered = MOCK_PETS.filter(p =>
    p.status === 'pre-registered' &&
    !registeredPets.includes(p.id) &&
    (
      p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.preRegId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getDaysLeft = (expiry?: string) => {
    if (!expiry) return 0;
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleStartValidation = (pet: Pet) => {
    setSelected(pet);
    setValStep('review');
    setPhotoCaptured(false);
    setPetTagInput('');
    setTagError('');
    setNotes('');
  };

  const handleConfirmTag = () => {
    if (!petTagInput.trim()) {
      setTagError('Pet Tag ID is required');
      return;
    }
    if (!petTagInput.match(/^TAG-\d{4}-\d{4}$/)) {
      setTagError('Format must be TAG-YYYY-XXXX (e.g. TAG-2025-0005)');
      return;
    }
    setTagError('');
    setValStep('done');
    if (selected) setRegisteredPets(prev => [...prev, selected.id]);
  };

  const getOwnerName = (pet: Pet) => {
    if (pet.ownerId) {
      const user = MOCK_USERS.find(u => u.id === pet.ownerId);
      return user?.name || pet.ownerName;
    }
    return pet.ownerName;
  };

  if (valStep === 'done' && selected) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BadgeCheck className="w-9 h-9 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">Validation Complete!</h3>
          <p className="text-gray-600 mb-4">
            <strong>{selected.name}</strong> has been successfully registered and tagged.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 text-left mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pet Tag ID:</span>
              <span className="font-mono font-bold text-[#2B5EA6]">{petTagInput}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Owner:</span>
              <span className="font-medium">{getOwnerName(selected)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Validated by:</span>
              <span className="font-medium">{admin.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium">{new Date().toLocaleDateString('en-PH')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status:</span>
              <span className="text-green-700 font-semibold bg-green-100 px-2 py-0.5 rounded">Registered</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 mb-4">
            ✓ Pet moved to Registered Pets database and tagged to owner's account automatically.
          </div>

          <button
            onClick={() => { setValStep('list'); setSelected(null); }}
            className="w-full py-3 bg-[#2B5EA6] text-white rounded-xl font-semibold hover:bg-[#234a85] transition-colors"
          >
            Validate Another Pet
          </button>
        </div>
      </div>
    );
  }

  if (valStep !== 'list' && selected) {
    return (
      <div className="space-y-4">
        {/* Step Header */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => { setValStep('list'); setSelected(null); }}
              className="text-sm text-[#2B5EA6] hover:underline"
            >
              ← Back to List
            </button>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-600">Validating: <strong>{selected.name}</strong> ({selected.preRegId})</span>
          </div>

          {/* Mini Steps */}
          <div className="flex items-center gap-1">
            {[
              { key: 'review', label: '1. Review' },
              { key: 'photo', label: '2. Photo' },
              { key: 'tag', label: '3. Tag' },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  valStep === s.key ? 'bg-[#2B5EA6] text-white' :
                  ['review', 'photo', 'tag'].indexOf(valStep) > i ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-400'
                }`}>{s.label}</div>
                {i < 2 && <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* STEP: Review Details */}
        {valStep === 'review' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#2B5EA6]" />
              Verify Pre-Registration Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Pet Details</p>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-gray-500">Name:</span> <strong>{selected.name}</strong></p>
                  <p><span className="text-gray-500">Species:</span> {selected.species}</p>
                  <p><span className="text-gray-500">Breed:</span> {selected.breed}</p>
                  <p><span className="text-gray-500">Color:</span> {selected.color}</p>
                  <p><span className="text-gray-500">Sex:</span> {selected.sex}</p>
                  <p><span className="text-gray-500">Age:</span> {selected.age}</p>
                  {selected.weight && <p><span className="text-gray-500">Weight:</span> {selected.weight}</p>}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Owner Details</p>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-gray-500">Name:</span> <strong>{getOwnerName(selected)}</strong></p>
                  <p><span className="text-gray-500">Address:</span> {selected.ownerAddress}</p>
                  <p><span className="text-gray-500">Contact:</span> {selected.ownerContact}</p>
                  <p><span className="text-gray-500">Barangay:</span> {selected.barangay}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Confirm that the owner and pet are physically present before proceeding.
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Validation Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any observations or remarks..."
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] resize-none text-sm"
              />
            </div>

            <button
              onClick={() => setValStep('photo')}
              className="w-full py-3 bg-[#2B5EA6] text-white rounded-xl font-semibold hover:bg-[#234a85] transition-colors flex items-center justify-center gap-2"
            >
              Details Verified — Proceed to Photo
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP: Photo */}
        {valStep === 'photo' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#2B5EA6]" />
              Capture Pet Photo
            </h3>

            <div
              onClick={() => setPhotoCaptured(true)}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                photoCaptured
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-[#2B5EA6] hover:bg-blue-50'
              }`}
            >
              {photoCaptured ? (
                <div className="space-y-2">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                  <p className="text-green-700 font-semibold">Photo Captured!</p>
                  <p className="text-xs text-green-600">Click to retake</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-700 font-semibold">Click to Capture Photo</p>
                  <p className="text-xs text-gray-500">Take a clear photo of the pet for the registry</p>
                </div>
              )}
            </div>

            <button
              onClick={() => { if (photoCaptured) setValStep('tag'); }}
              disabled={!photoCaptured}
              className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                photoCaptured
                  ? 'bg-[#2B5EA6] text-white hover:bg-[#234a85]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Photo Done — Assign Pet Tag
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP: Tag Assignment */}
        {valStep === 'tag' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#2B5EA6]" />
              Assign Pet Tag ID
            </h3>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Physical tag should be attached to the pet before entering the ID.</p>
              <p>Format: <code className="bg-blue-100 px-1 rounded">TAG-YYYY-XXXX</code> (e.g. TAG-2025-0005)</p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Pet Tag ID <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={petTagInput}
                onChange={e => { setPetTagInput(e.target.value.toUpperCase()); setTagError(''); }}
                placeholder="TAG-2025-0005"
                className={`w-full px-4 py-3 border rounded-xl font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] ${tagError ? 'border-red-400' : 'border-gray-300'}`}
              />
              {tagError && <p className="text-red-500 text-xs mt-1">{tagError}</p>}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <p className="font-semibold mb-1">Upon saving:</p>
              <ul className="space-y-1">
                <li>✓ Pet record will be moved from Pre-Registered to Registered database</li>
                <li>✓ Pet will be automatically tagged to the owner's account</li>
                <li>✓ Owner will be notified via email</li>
              </ul>
            </div>

            <button
              onClick={handleConfirmTag}
              className="w-full py-3 bg-[#60A85C] text-white rounded-xl font-semibold hover:bg-[#4a8a47] transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Confirm & Save Registration
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 font-bold text-xl mb-1">Pre-Registration Validation</h2>
          <p className="text-gray-600 text-sm">Review and validate pre-registered pets submitted by the public</p>
        </div>
        <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {preRegistered.length} Pending
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by owner name, pet name, or Pre-Reg ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
          />
        </div>
      </div>

      {/* Pre-registered list */}
      <div className="space-y-3">
        {preRegistered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="font-medium">No pending pre-registrations</p>
            <p className="text-sm">All pre-registrations have been validated.</p>
          </div>
        ) : (
          preRegistered.map(pet => {
            const daysLeft = getDaysLeft(pet.preRegExpiry);
            const isUrgent = daysLeft <= 3;
            return (
              <div key={pet.id} className={`bg-white rounded-xl shadow p-5 border-l-4 ${isUrgent ? 'border-red-400' : 'border-amber-400'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <PawPrint className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{pet.name} <span className="text-gray-500 font-normal">({pet.species} • {pet.breed})</span></p>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5" /> {getOwnerName(pet)} • {pet.barangay}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{pet.preRegId}</span>
                        <span className={`text-xs flex items-center gap-1 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                          <CalendarClock className="w-3.5 h-3.5" />
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartValidation(pet)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-lg hover:bg-[#234a85] transition-colors text-sm font-medium"
                  >
                    Validate
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
