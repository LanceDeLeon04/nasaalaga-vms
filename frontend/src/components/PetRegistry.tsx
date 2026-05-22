import { useState } from 'react';
import {
  Search, PawPrint, User, Tag, CheckCircle, Clock,
  AlertTriangle, Eye, Filter, Download
} from 'lucide-react';
import { MOCK_PETS, MOCK_USERS, type Pet, type UserRole } from '../types';

interface PetRegistryProps {
  userRole: UserRole;
  currentUserId: string;
}

type TabView = 'registered' | 'preregistered';

export function PetRegistry({ userRole, currentUserId }: PetRegistryProps) {
  const [tab, setTab] = useState<TabView>('registered');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBarangay, setFilterBarangay] = useState('');
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isPublic = userRole === 'public' || userRole === 'bahw';

  const getOwnerInfo = (pet: Pet) => {
    if (pet.ownerId) {
      const user = MOCK_USERS.find(u => u.id === pet.ownerId);
      return { name: user?.name || pet.ownerName, linked: true, userId: user?.id };
    }
    return { name: pet.ownerName, linked: false, tempId: pet.ownerTempId };
  };

  // Public users see only their own pets
  const allPets = isPublic
    ? MOCK_PETS.filter(p => p.ownerId === currentUserId)
    : MOCK_PETS;

  const registered = allPets.filter(p =>
    p.status === 'registered' &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (p.petTagId || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!filterBarangay || p.barangay === filterBarangay)
  );

  const preRegistered = allPets.filter(p =>
    p.status === 'pre-registered' &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (p.preRegId || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getDaysLeft = (expiry?: string) => {
    if (!expiry) return 0;
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const barangays = Array.from(new Set(MOCK_PETS.map(p => p.barangay))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 font-bold text-xl mb-1">Pet Registry</h2>
          <p className="text-gray-600 text-sm">
            {isPublic ? 'Your registered pets' : 'Complete database of all registered and pre-registered pets'}
          </p>
        </div>
        {isAdmin && (
          <button className="flex items-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-lg hover:bg-[#4a8a47] transition-colors text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Registered Pets</p>
          <p className="text-2xl font-bold text-gray-800">{MOCK_PETS.filter(p => p.status === 'registered').length}</p>
          <p className="text-xs text-green-600">With official tag</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Pre-Registered</p>
          <p className="text-2xl font-bold text-amber-600">{MOCK_PETS.filter(p => p.status === 'pre-registered').length}</p>
          <p className="text-xs text-amber-600">Pending validation</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Tagged to Accounts</p>
          <p className="text-2xl font-bold text-[#2B5EA6]">{MOCK_PETS.filter(p => p.ownerId).length}</p>
          <p className="text-xs text-blue-600">Linked to users</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Unregistered Owners</p>
          <p className="text-2xl font-bold text-gray-600">{MOCK_PETS.filter(p => p.ownerTempId).length}</p>
          <p className="text-xs text-gray-500">TempID issued</p>
        </div>
      </div>

      {/* Tab + Search */}
      <div className="bg-white rounded-xl shadow">
        <div className="flex border-b">
          <button
            onClick={() => setTab('registered')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'registered' ? 'text-[#2B5EA6] border-b-2 border-[#2B5EA6]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Registered ({registered.length})
            </span>
          </button>
          <button
            onClick={() => setTab('preregistered')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'preregistered' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Pre-Registered ({preRegistered.length})
            </span>
          </button>
        </div>

        <div className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={tab === 'registered' ? 'Search pet name, owner, or tag ID...' : 'Search by name, owner, or Pre-Reg ID...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
            />
          </div>
          {isAdmin && (
            <select
              value={filterBarangay}
              onChange={e => setFilterBarangay(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
            >
              <option value="">All Barangays</option>
              {barangays.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Registered Pets Table */}
      {tab === 'registered' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pet</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tag ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Barangay</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  {isAdmin && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {registered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <PawPrint className="w-8 h-8 mx-auto mb-2" />
                      No registered pets found
                    </td>
                  </tr>
                ) : registered.map(pet => {
                  const owner = getOwnerInfo(pet);
                  return (
                    <tr key={pet.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <PawPrint className="w-4 h-4 text-[#2B5EA6]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{pet.name}</p>
                            <p className="text-xs text-gray-500">{pet.species} • {pet.breed} • {pet.sex}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-semibold text-[#2B5EA6] bg-blue-50 px-2 py-1 rounded">
                          {pet.petTagId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {owner.linked ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Tag className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm text-gray-800">{owner.name}</p>
                            {!owner.linked && pet.ownerTempId && (
                              <p className="text-xs font-mono text-amber-600">{pet.ownerTempId}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{pet.barangay}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          Registered
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedPet(pet)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pre-Registered Pets */}
      {tab === 'preregistered' && (
        <div className="space-y-3">
          {preRegistered.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p>No pre-registered pets found</p>
            </div>
          ) : preRegistered.map(pet => {
            const daysLeft = getDaysLeft(pet.preRegExpiry);
            const isUrgent = daysLeft <= 3;
            return (
              <div key={pet.id} className={`bg-white rounded-xl shadow p-5 border-l-4 ${isUrgent ? 'border-red-400' : 'border-amber-400'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUrgent ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <PawPrint className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{pet.name} <span className="text-gray-400 text-sm">({pet.species} • {pet.breed})</span></p>
                      <p className="text-sm text-gray-600">{pet.ownerName} • {pet.barangay}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{pet.preRegId}</span>
                        <span className={`text-xs ${isUrgent ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                    Pending Validation
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pet Detail Modal */}
      {selectedPet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-gradient-to-r from-[#2B5EA6] to-[#1a4a8a] p-5 text-white rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{selectedPet.name}</h3>
                  <p className="text-blue-200 text-sm">{selectedPet.species} • {selectedPet.breed}</p>
                </div>
                <button onClick={() => setSelectedPet(null)} className="text-blue-200 hover:text-white">✕</button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Tag ID:</span> <span className="font-mono font-bold text-[#2B5EA6]">{selectedPet.petTagId}</span></div>
                <div><span className="text-gray-500">Sex:</span> {selectedPet.sex}</div>
                <div><span className="text-gray-500">Color:</span> {selectedPet.color}</div>
                <div><span className="text-gray-500">Age:</span> {selectedPet.age}</div>
                {selectedPet.weight && <div><span className="text-gray-500">Weight:</span> {selectedPet.weight}</div>}
                <div><span className="text-gray-500">Barangay:</span> {selectedPet.barangay}</div>
                <div className="col-span-2"><span className="text-gray-500">Owner:</span> {selectedPet.ownerName}</div>
                <div className="col-span-2"><span className="text-gray-500">Address:</span> {selectedPet.ownerAddress}</div>
                <div><span className="text-gray-500">Contact:</span> {selectedPet.ownerContact}</div>
                <div><span className="text-gray-500">Registered:</span> {selectedPet.registeredDate}</div>
                {selectedPet.ownerTempId && (
                  <div className="col-span-2 bg-amber-50 rounded-lg p-2">
                    <span className="text-gray-500">Temp Owner ID:</span>{' '}
                    <span className="font-mono text-amber-700 font-bold">{selectedPet.ownerTempId}</span>
                    <span className="text-xs text-amber-600 ml-2">(not yet claimed by a user account)</span>
                  </div>
                )}
                {selectedPet.ownerId && (
                  <div className="col-span-2 bg-green-50 rounded-lg p-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 text-sm font-medium">Tagged to registered user account</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedPet(null)}
                className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
