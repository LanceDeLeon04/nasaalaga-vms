import { useState } from 'react';
import { FileText, Download, Printer, Search, Calendar, Award } from 'lucide-react';

export function ReportsCertificates() {
  const [reportType, setReportType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const certificates = [
    { id: 'VHC-2024-1201', type: 'Veterinary Health Certificate', issuedTo: 'Juan Dela Cruz', barangay: 'Barangay 1', dateIssued: 'Dec 12, 2024', status: 'Valid', validUntil: 'Dec 19, 2024' },
    { id: 'ASF-2024-0845', type: 'ASF-Free Certification', issuedTo: 'Maria Santos', barangay: 'Barangay 3', dateIssued: 'Dec 10, 2024', status: 'Valid', validUntil: 'Dec 17, 2024' },
    { id: 'RAB-2024-1532', type: 'Rabies Vaccination Certificate', issuedTo: 'Pedro Reyes', barangay: 'Barangay 2', dateIssued: 'Dec 8, 2024', status: 'Valid', validUntil: 'Dec 8, 2025' },
    { id: 'HR-2024-0234', type: 'Hog Raiser Registration', issuedTo: 'Ana Garcia', barangay: 'Barangay 5', dateIssued: 'Nov 25, 2024', status: 'Active', validUntil: 'Nov 25, 2025' },
    { id: 'COA-2024-0089', type: 'Certificate of Acceptance', issuedTo: 'Roberto Cruz', barangay: 'Barangay 4', dateIssued: 'Dec 5, 2024', status: 'Issued', validUntil: 'N/A' },
  ];

  const reports = [
    { name: 'Monthly Livestock Inventory Report', date: 'November 2024', category: 'Inventory', format: 'PDF' },
    { name: 'Rabies Vaccination Coverage Report', date: 'Q4 2024', category: 'Health', format: 'Excel' },
    { name: 'Disease Outbreak Summary', date: 'December 2024', category: 'Disease', format: 'PDF' },
    { name: 'Budget Utilization Report', date: 'FY 2024', category: 'Financial', format: 'PDF' },
    { name: 'Hog Raisers Registration Summary', date: '2024 Annual', category: 'Registration', format: 'Excel' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-800 mb-1">Reports & Certificates</h2>
        <p className="text-gray-600">Generate, view, and download official documents</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Certificates Issued (This Month)</p>
              <p className="text-gray-900">127</p>
            </div>
            <Award className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">VHC Issued</p>
              <p className="text-gray-900">45</p>
            </div>
            <FileText className="w-5 h-5 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">ASF Certifications</p>
              <p className="text-gray-900">38</p>
            </div>
            <FileText className="w-5 h-5 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Requests</p>
              <p className="text-gray-900">12</p>
            </div>
            <FileText className="w-5 h-5 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Certificates Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-800">Issued Certificates</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors">
            <FileText className="w-4 h-4" />
            Issue New Certificate
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or barangay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
            />
          </div>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
          >
            <option value="all">All Certificates</option>
            <option value="vhc">VHC</option>
            <option value="asf">ASF-Free</option>
            <option value="rabies">Rabies</option>
            <option value="registration">Registration</option>
          </select>
        </div>

        {/* Certificates Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-700">Certificate ID</th>
                <th className="text-left py-3 px-4 text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-gray-700">Issued To</th>
                <th className="text-left py-3 px-4 text-gray-700">Barangay</th>
                <th className="text-left py-3 px-4 text-gray-700">Date Issued</th>
                <th className="text-left py-3 px-4 text-gray-700">Valid Until</th>
                <th className="text-left py-3 px-4 text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800">{cert.id}</td>
                  <td className="py-3 px-4 text-gray-600">{cert.type}</td>
                  <td className="py-3 px-4 text-gray-600">{cert.issuedTo}</td>
                  <td className="py-3 px-4 text-gray-600">{cert.barangay}</td>
                  <td className="py-3 px-4 text-gray-600">{cert.dateIssued}</td>
                  <td className="py-3 px-4 text-gray-600">{cert.validUntil}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      cert.status === 'Valid' || cert.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {cert.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded" title="Download">
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Print">
                        <Printer className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Reports Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-800 mb-4">System Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-800 mb-1">{report.name}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{report.date}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                      {report.category}
                    </span>
                  </div>
                </div>
                <FileText className="w-8 h-8 text-[#2B5EA6]" />
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors text-sm">
                  <Download className="w-4 h-4" />
                  Download {report.format}
                </button>
                <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Custom Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-800 mb-4">Generate Custom Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Report Type</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]">
              <option>Livestock Inventory</option>
              <option>Vaccination Coverage</option>
              <option>Disease Monitoring</option>
              <option>Budget Utilization</option>
              <option>Service Requests</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Date Range</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]">
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
              <option>Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Format</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]">
              <option>PDF</option>
              <option>Excel</option>
              <option>CSV</option>
            </select>
          </div>
        </div>
        <button className="mt-4 px-6 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors">
          Generate Report
        </button>
      </div>
    </div>
  );
}
