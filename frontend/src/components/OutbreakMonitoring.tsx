import { useState } from 'react';
import { AlertTriangle, MapPin, Filter, Plus, TrendingUp, Search, Map, FileText, Lightbulb, BarChart3 } from 'lucide-react';
const calacaMap = '/images/calaca-map.png';

export function OutbreakMonitoring() {
  const [selectedDisease, setSelectedDisease] = useState('all');
  const [selectedBarangay, setSelectedBarangay] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInsights, setShowInsights] = useState(false);

  const barangays = [
    // Based on the map legend
    { name: 'Poblacion 1', asf: 0, rabies: 0, avianFlu: 0, severity: 'none' },
    { name: 'Poblacion 2', asf: 1, rabies: 0, avianFlu: 0, severity: 'medium' },
    { name: 'Poblacion 3', asf: 0, rabies: 0, avianFlu: 0, severity: 'none' },
    { name: 'Poblacion 4', asf: 0, rabies: 1, avianFlu: 0, severity: 'low' },
    { name: 'Poblacion 5', asf: 0, rabies: 0, avianFlu: 0, severity: 'none' },
    { name: 'Poblacion 6', asf: 0, rabies: 0, avianFlu: 0, severity: 'none' },
    { name: 'Baclас', asf: 0, rabies: 0, avianFlu: 0, severity: 'none' },
    { name: 'Bagong Tubig', asf: 2, rabies: 0, avianFlu: 1, severity: 'high' },
    { name: 'Balimbing', asf: 0, rabies: 0, avianFlu: 0, severity: 'none' },
    { name: 'Bambang', asf: 0, rabies: 0, avianFlu: 0, severity: 'none' },
    { name: 'Bisaya', asf: 0, rabies: 0, avianFlu: 0, severity: 'none' },
    { name: 'Cahil', asf: 1, rabies: 0, avianFlu: 0, severity: 'medium' },
  ];

  const outbreakReports = [
    { id: 'OUT-001', disease: 'ASF', barangay: 'Bagong Tubig', cases: 2, reportedBy: 'BAHW Cruz', date: 'Dec 14, 2024', status: 'Under Investigation', severity: 'High' },
    { id: 'OUT-002', disease: 'Rabies', barangay: 'Poblacion 4', cases: 1, reportedBy: 'BAHW Santos', date: 'Dec 13, 2024', status: 'Quarantined', severity: 'Medium' },
    { id: 'OUT-003', disease: 'Avian Flu', barangay: 'Bagong Tubig', cases: 1, reportedBy: 'BAHW Reyes', date: 'Dec 12, 2024', status: 'Monitoring', severity: 'Medium' },
    { id: 'OUT-004', disease: 'ASF', barangay: 'Poblacion 2', cases: 1, reportedBy: 'BAHW Garcia', date: 'Dec 11, 2024', status: 'Contained', severity: 'Low' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'none':
        return 'bg-gray-100';
      case 'low':
        return 'bg-green-200';
      case 'medium':
        return 'bg-yellow-300';
      case 'high':
        return 'bg-red-400';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1 flex items-center gap-2">
            <Map className="w-6 h-6 text-[#2B5EA6]" />
            Outbreak Monitoring
          </h2>
          <p className="text-gray-600">Real-time disease tracking across Calaca City</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#E85D3B] to-[#d44d2b] text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
          <Plus className="w-4 h-4" />
          Report Outbreak
        </button>
      </div>

      {/* Alert Summary - Modern Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-lg p-5 hover:scale-[1.02] transition-transform">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-red-100 mb-1">Active Cases</p>
              <p className="text-3xl" style={{ fontWeight: 700 }}>5</p>
              <p className="text-xs text-red-200 mt-1">3 critical alerts</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl shadow-lg p-5 hover:scale-[1.02] transition-transform">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-orange-100 mb-1">ASF Cases</p>
              <p className="text-3xl" style={{ fontWeight: 700 }}>3</p>
              <p className="text-xs text-orange-200 mt-1">Under investigation</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-2xl shadow-lg p-5 hover:scale-[1.02] transition-transform">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-yellow-100 mb-1">Rabies Cases</p>
              <p className="text-3xl" style={{ fontWeight: 700 }}>1</p>
              <p className="text-xs text-yellow-200 mt-1">Quarantined</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg p-5 hover:scale-[1.02] transition-transform">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blue-100 mb-1">Avian Flu Cases</p>
              <p className="text-3xl" style={{ fontWeight: 700 }}>1</p>
              <p className="text-xs text-blue-200 mt-1">Monitoring</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Disease Heatmap with Actual Calaca Map */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-800 flex items-center gap-2">
            <Map className="w-5 h-5 text-[#2B5EA6]" />
            Disease Heatmap - Calaca City
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#60A85C] focus:border-transparent"
            >
              <option value="all">All Diseases</option>
              <option value="asf">ASF Only</option>
              <option value="rabies">Rabies Only</option>
              <option value="avianFlu">Avian Flu Only</option>
            </select>
          </div>
        </div>

        {/* Actual Calaca Map */}
        <div className="flex gap-6 items-start mb-6">
          <div className="relative bg-gray-50 rounded-xl overflow-hidden flex-shrink-0" style={{ maxWidth: '600px' }}>
            <img 
              src={calacaMap} onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display='none'; }} 
              alt="Map of Calaca" 
              className="w-full h-auto"
            />
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-lg">
            <p className="text-sm text-gray-700 mb-3" style={{ fontWeight: 600 }}>Legend:</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span className="text-gray-600">No Cases</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-200 border border-gray-300 rounded"></div>
                <span className="text-gray-600">Low Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-300 border border-gray-300 rounded"></div>
                <span className="text-gray-600">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-400 border border-gray-300 rounded"></div>
                <span className="text-gray-600">High Risk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barangay Data Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {barangays.map((barangay) => (
            <div
              key={barangay.name}
              className={`p-4 rounded-xl border-2 ${getSeverityColor(barangay.severity)} transition-all hover:shadow-md cursor-pointer hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>{barangay.name}</p>
                <MapPin className="w-4 h-4 text-gray-600" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-700">ASF:</span>
                  <span className="text-gray-900" style={{ fontWeight: 600 }}>{barangay.asf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Rabies:</span>
                  <span className="text-gray-900" style={{ fontWeight: 600 }}>{barangay.rabies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Avian:</span>
                  <span className="text-gray-900" style={{ fontWeight: 600 }}>{barangay.avianFlu}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outbreak Reports Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#2B5EA6]" />
              Recent Outbreak Reports
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#60A85C] focus:border-transparent"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Report ID</th>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Disease</th>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Barangay</th>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Cases</th>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Reported By</th>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Date</th>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Status</th>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Severity</th>
                <th className="text-left py-4 px-6 text-gray-700 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outbreakReports.map((report) => (
                <tr key={report.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 text-gray-800">{report.id}</td>
                  <td className="py-4 px-6 text-gray-600">{report.disease}</td>
                  <td className="py-4 px-6 text-gray-600">{report.barangay}</td>
                  <td className="py-4 px-6 text-gray-600">{report.cases}</td>
                  <td className="py-4 px-6 text-gray-600">{report.reportedBy}</td>
                  <td className="py-4 px-6 text-gray-600">{report.date}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      report.status === 'Under Investigation' 
                        ? 'bg-red-100 text-red-800' 
                        : report.status === 'Quarantined'
                        ? 'bg-yellow-100 text-yellow-800'
                        : report.status === 'Monitoring'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      report.severity === 'High' 
                        ? 'bg-red-100 text-red-800' 
                        : report.severity === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {report.severity}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button className="text-[#2B5EA6] hover:underline text-sm hover:text-[#60A85C] transition-colors">
                      Validate →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}