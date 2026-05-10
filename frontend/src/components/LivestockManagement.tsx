import { useState } from 'react';
import { Plus, Search, Filter, Download, Edit, Eye } from 'lucide-react';

export function LivestockManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const livestockRecords = [
    { id: 'LS-001', type: 'Cattle', owner: 'Juan Dela Cruz', barangay: 'Barangay 1', count: 15, status: 'Active', lastInspection: 'Dec 10, 2024' },
    { id: 'LS-002', type: 'Swine', owner: 'Maria Santos', barangay: 'Barangay 3', count: 45, status: 'Active', lastInspection: 'Dec 12, 2024' },
    { id: 'LS-003', type: 'Poultry', owner: 'Pedro Reyes', barangay: 'Barangay 2', count: 500, status: 'Active', lastInspection: 'Dec 8, 2024' },
    { id: 'LS-004', type: 'Goats', owner: 'Ana Garcia', barangay: 'Barangay 5', count: 8, status: 'Active', lastInspection: 'Dec 14, 2024' },
    { id: 'LS-005', type: 'Swine', owner: 'Roberto Cruz', barangay: 'Barangay 4', count: 32, status: 'Quarantine', lastInspection: 'Dec 13, 2024' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">Livestock Management</h2>
          <p className="text-gray-600">Track and monitor all livestock in Calaca City</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors">
          <Plus className="w-4 h-4" />
          Register New Livestock
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Cattle</p>
          <p className="text-gray-900">560</p>
          <p className="text-xs text-green-600 mt-1">+5% this month</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Swine</p>
          <p className="text-gray-900">2,050</p>
          <p className="text-xs text-green-600 mt-1">+3% this month</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Poultry</p>
          <p className="text-gray-900">10,700</p>
          <p className="text-xs text-green-600 mt-1">+8% this month</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Goats</p>
          <p className="text-gray-900">365</p>
          <p className="text-xs text-green-600 mt-1">+2% this month</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by owner, ID, or barangay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="cattle">Cattle</option>
              <option value="swine">Swine</option>
              <option value="poultry">Poultry</option>
              <option value="goats">Goats</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Livestock Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-700">Livestock ID</th>
                <th className="text-left py-3 px-4 text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-gray-700">Owner</th>
                <th className="text-left py-3 px-4 text-gray-700">Barangay</th>
                <th className="text-left py-3 px-4 text-gray-700">Count</th>
                <th className="text-left py-3 px-4 text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-gray-700">Last Inspection</th>
                <th className="text-left py-3 px-4 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {livestockRecords.map((record) => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800">{record.id}</td>
                  <td className="py-3 px-4 text-gray-600">{record.type}</td>
                  <td className="py-3 px-4 text-gray-600">{record.owner}</td>
                  <td className="py-3 px-4 text-gray-600">{record.barangay}</td>
                  <td className="py-3 px-4 text-gray-600">{record.count}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      record.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{record.lastInspection}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded" title="View Details">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
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
}
