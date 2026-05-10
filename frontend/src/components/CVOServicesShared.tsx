import { FileText, Calendar, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';

export function CVOServicesShared() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">CVO Services</h2>
          <p className="text-gray-600">Available veterinary services in Calaca City</p>
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
            onClick={() => toast.success('Registration form available for download')}
            className="w-full px-4 py-2 border border-[#2B5EA6] text-[#2B5EA6] rounded-md hover:bg-[#2B5EA6] hover:text-white transition-colors"
          >
            Download Form
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
            onClick={() => toast.success('Appointment booking form opened')}
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
            onClick={() => toast.success('Health certificate application opened')}
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
            onClick={() => toast.success('Livestock registration form opened')}
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
}
