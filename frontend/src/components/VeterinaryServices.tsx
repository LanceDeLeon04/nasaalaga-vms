import { useState } from 'react';
import { FileText, Clock, DollarSign, CheckCircle, Users, Building } from 'lucide-react';
import type { UserRole } from '../App';

interface VeterinaryServicesProps {
  userRole: UserRole;
}

export function VeterinaryServices({ userRole }: VeterinaryServicesProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const services = [
    {
      id: 'service-1',
      name: 'Organizing Local Hog Raisers Association',
      classification: 'Complex',
      type: 'G2C',
      description: 'Assistance in organizing and registering local hog raisers associations',
      whoMayAvail: 'Hog raisers in Calaca City',
      requirements: [
        'List of prospective members (min. 15)',
        'Proposed Constitution and By-Laws',
        'Barangay endorsement',
        'Valid IDs of officers'
      ],
      processingTime: '15 working days',
      fees: 'Free',
      steps: [
        { step: 1, action: 'Submit requirements to CVO', responsible: 'Applicant', status: 'Initial' },
        { step: 2, action: 'Review and validation of documents', responsible: 'BAHW', status: 'For Validation' },
        { step: 3, action: 'Schedule organizational meeting', responsible: 'Admin', status: 'Processing' },
        { step: 4, action: 'Conduct orientation and training', responsible: 'CVO Staff', status: 'Processing' },
        { step: 5, action: 'Issue Certificate of Registration', responsible: 'Admin', status: 'Released' }
      ]
    },
    {
      id: 'service-2',
      name: 'Training on Livestock & Poultry Production',
      classification: 'Simple',
      type: 'G2C',
      description: 'Free training programs on modern livestock and poultry production techniques',
      whoMayAvail: 'Livestock and poultry raisers, aspiring farmers',
      requirements: [
        'Filled-out registration form',
        'Barangay clearance',
        'Valid ID'
      ],
      processingTime: '5 working days',
      fees: 'Free',
      steps: [
        { step: 1, action: 'Submit registration form', responsible: 'Applicant', status: 'Initial' },
        { step: 2, action: 'Validate applicant information', responsible: 'BAHW', status: 'For Validation' },
        { step: 3, action: 'Schedule training session', responsible: 'Admin', status: 'Approved' },
        { step: 4, action: 'Conduct training', responsible: 'CVO Staff', status: 'Released' }
      ]
    },
    {
      id: 'service-3',
      name: 'Animal Dispersal Program',
      classification: 'Complex',
      type: 'G2C',
      description: 'Distribution of livestock to qualified beneficiaries to improve livelihood',
      whoMayAvail: 'Qualified farmers and residents of Calaca City',
      requirements: [
        'Accomplished application form',
        'Barangay certification',
        'Proof of residency',
        'Farm location map/sketch',
        'Certificate of training (if applicable)'
      ],
      processingTime: '30 working days',
      fees: 'Free',
      steps: [
        { step: 1, action: 'Submit application', responsible: 'Applicant', status: 'Initial' },
        { step: 2, action: 'Validate eligibility', responsible: 'BAHW', status: 'For Validation' },
        { step: 3, action: 'Farm inspection', responsible: 'BAHW', status: 'For Validation' },
        { step: 4, action: 'Approve beneficiary', responsible: 'Admin', status: 'Approved' },
        { step: 5, action: 'Schedule dispersal', responsible: 'Admin', status: 'Approved' },
        { step: 6, action: 'Release animals and documentation', responsible: 'CVO Staff', status: 'Released' }
      ]
    },
    {
      id: 'service-4',
      name: 'Hog Raisers Registration',
      classification: 'Simple',
      type: 'G2C',
      description: 'Official registration of hog raisers in the city database',
      whoMayAvail: 'All hog raisers operating in Calaca City',
      requirements: [
        'Accomplished registration form',
        'Barangay business permit (if applicable)',
        'Farm location map',
        'Valid ID'
      ],
      processingTime: '3 working days',
      fees: 'Free',
      steps: [
        { step: 1, action: 'Submit requirements', responsible: 'Applicant', status: 'Initial' },
        { step: 2, action: 'Validate and encode data', responsible: 'BAHW', status: 'For Validation' },
        { step: 3, action: 'Issue Certificate of Registration', responsible: 'Admin', status: 'Released' }
      ]
    },
    {
      id: 'service-5',
      name: 'Provision of Veterinary Services',
      classification: 'Simple',
      type: 'G2C',
      description: 'Basic veterinary services including consultation, treatment, and vaccination',
      whoMayAvail: 'All livestock and pet owners in Calaca City',
      requirements: [
        'Service request form',
        'Animal health history (if available)'
      ],
      processingTime: 'Same day / 1 working day',
      fees: 'Minimal fee for medicines (if needed)',
      steps: [
        { step: 1, action: 'Request service', responsible: 'Applicant', status: 'Initial' },
        { step: 2, action: 'Assess animal condition', responsible: 'CVO Staff', status: 'Processing' },
        { step: 3, action: 'Provide treatment/service', responsible: 'CVO Staff', status: 'Released' }
      ]
    },
    {
      id: 'service-6',
      name: 'Issuance of VHC & ASF-Free Certification',
      classification: 'Simple',
      type: 'G2C / G2G',
      description: 'Veterinary Health Certificate and African Swine Fever-Free Certification for livestock transport',
      whoMayAvail: 'Livestock owners transporting animals outside Calaca City',
      requirements: [
        'Application form',
        'Hog raiser registration certificate',
        'Proof of ownership',
        'Valid ID'
      ],
      processingTime: '2 working days',
      fees: '₱50 per certificate',
      steps: [
        { step: 1, action: 'Submit application', responsible: 'Applicant', status: 'Initial' },
        { step: 2, action: 'Conduct farm inspection', responsible: 'BAHW', status: 'For Validation' },
        { step: 3, action: 'Validate ASF-free status', responsible: 'BAHW', status: 'For Validation' },
        { step: 4, action: 'Approve and sign certificate', responsible: 'Admin', status: 'Approved' },
        { step: 5, action: 'Release certificate', responsible: 'Admin', status: 'Released' }
      ]
    },
    {
      id: 'service-7',
      name: 'Certificate of Acceptance',
      classification: 'Simple',
      type: 'G2C',
      description: 'Certificate acknowledging receipt of livestock/animals',
      whoMayAvail: 'Recipients of livestock through programs or private transactions',
      requirements: [
        'Request letter',
        'Delivery receipt',
        'Valid ID'
      ],
      processingTime: '1 working day',
      fees: 'Free',
      steps: [
        { step: 1, action: 'Submit request', responsible: 'Applicant', status: 'Initial' },
        { step: 2, action: 'Verify transaction', responsible: 'BAHW', status: 'For Validation' },
        { step: 3, action: 'Issue certificate', responsible: 'Admin', status: 'Released' }
      ]
    },
    {
      id: 'service-8',
      name: 'Livestock Insurance Application (PCIC)',
      classification: 'Complex',
      type: 'G2G',
      description: 'Assistance in applying for livestock insurance through Philippine Crop Insurance Corporation',
      whoMayAvail: 'Registered livestock raisers in Calaca City',
      requirements: [
        'PCIC application form',
        'Hog raiser registration certificate',
        'Farm location map',
        'List of insured animals with ear tags',
        'Valid ID',
        'Insurance premium payment'
      ],
      processingTime: '10 working days',
      fees: 'Insurance premium (varies per animal)',
      steps: [
        { step: 1, action: 'Submit PCIC application', responsible: 'Applicant', status: 'Initial' },
        { step: 2, action: 'Validate farmer registration', responsible: 'BAHW', status: 'For Validation' },
        { step: 3, action: 'Conduct farm inspection', responsible: 'BAHW', status: 'For Validation' },
        { step: 4, action: 'Endorse to PCIC', responsible: 'Admin', status: 'Approved' },
        { step: 5, action: 'Release insurance certificate', responsible: 'Admin', status: 'Released' }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Initial':
        return 'bg-gray-100 text-gray-800';
      case 'For Validation':
        return 'bg-yellow-100 text-yellow-800';
      case 'Processing':
        return 'bg-blue-100 text-blue-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Released':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-800 mb-1">City Veterinary Office Services</h2>
        <p className="text-gray-600">ISO 9001:2015 & ARTA-Compliant Service Directory</p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedService(selectedService === service.id ? null : service.id)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-gray-800 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                </div>
                <FileText className="w-6 h-6 text-[#2B5EA6] flex-shrink-0 ml-2" />
              </div>

              {/* Service Metadata */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    service.classification === 'Simple' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {service.classification}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {service.type}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600 justify-end">
                  <DollarSign className="w-4 h-4" />
                  <span>{service.fees}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Processing: {service.processingTime}</span>
              </div>

              {/* Expanded Details */}
              {selectedService === service.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Who May Avail */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-[#60A85C]" />
                      <p className="text-gray-800 text-sm">Who May Avail</p>
                    </div>
                    <p className="text-sm text-gray-600 pl-6">{service.whoMayAvail}</p>
                  </div>

                  {/* Requirements */}
                  <div>
                    <p className="text-gray-800 text-sm mb-2">Requirements Checklist</p>
                    <ul className="space-y-1 pl-6">
                      {service.requirements.map((req, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Process Flow */}
                  <div>
                    <p className="text-gray-800 text-sm mb-3">Process Flow (ISO 9001:2015)</p>
                    <div className="space-y-2">
                      {service.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-gray-50 p-3 rounded-md">
                          <div className="flex-shrink-0 w-6 h-6 bg-[#2B5EA6] text-white rounded-full flex items-center justify-center text-xs">
                            {step.step}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{step.action}</p>
                            <p className="text-xs text-gray-600">Responsible: {step.responsible}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${getStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors text-sm">
                      Apply for Service
                    </button>
                    <button className="px-4 py-2 border border-[#60A85C] text-[#60A85C] rounded-md hover:bg-green-50 transition-colors text-sm">
                      Download Form
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ARTA Compliance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Building className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-900 mb-1">ARTA Compliance (RA 11032)</p>
            <p className="text-sm text-blue-700">
              All services comply with the Anti-Red Tape Authority guidelines. Processing times are strictly monitored. 
              Fees are transparent and displayed upfront. Service delivery is citizen-centric with clear step-by-step procedures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
