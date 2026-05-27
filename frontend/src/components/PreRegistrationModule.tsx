import { useState } from 'react';
import { PawPrint, Beef } from 'lucide-react';
import { PetPreRegistration } from './PetPreRegistration';
import { LivestockPreRegistration } from './LivestockPreRegistration';
import type { User } from '../App';

interface PreRegistrationModuleProps {
  user?: User;
  userRole?: string;
  ownerId?: string;
  ownerEmail?: string;
  barangay?: string;
}

export function PreRegistrationModule({ user, userRole, ownerId, ownerEmail, barangay }: PreRegistrationModuleProps) {
  const [activeTab, setActiveTab] = useState<'pet' | 'livestock'>('pet');

  const resolvedRole = userRole || user?.role;
  const resolvedOwnerId = ownerId || user?.ownerId;
  const resolvedEmail = ownerEmail || user?.email || '';
  const resolvedBarangay = barangay || user?.barangay || '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2B5EA6] to-[#60A85C] rounded-2xl p-6 text-white">
        <h2 className="text-xl font-black mb-1">Pre-Registration</h2>
        <p className="text-white/80 text-sm">Register your pets or livestock online — visit the CVO within 14 days for official validation</p>
      </div>

      {/* Tab switcher */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('pet')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold transition-all ${
              activeTab === 'pet'
                ? 'text-[#2B5EA6] border-b-2 border-[#2B5EA6] bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <PawPrint className="w-4 h-4" />
            Pet Pre-Registration
          </button>
          <button
            onClick={() => setActiveTab('livestock')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold transition-all ${
              activeTab === 'livestock'
                ? 'text-[#60A85C] border-b-2 border-[#60A85C] bg-green-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Beef className="w-4 h-4" />
            Livestock Pre-Registration
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'pet' && (
            <PetPreRegistration
              ownerId={resolvedOwnerId}
              ownerEmail={resolvedEmail}
            />
          )}
          {activeTab === 'livestock' && (
            <LivestockPreRegistration
              ownerId={resolvedOwnerId}
              ownerEmail={resolvedEmail}
              userRole={resolvedRole}
              barangay={resolvedBarangay}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PreRegistrationModule;
