import { useState } from 'react';
import { MessageSquare, Phone, Mail, Facebook, Send, CheckCircle } from 'lucide-react';
import type { UserRole } from '../App';

interface FeedbackComplaintsProps {
  userRole: UserRole;
}

export function FeedbackComplaints({ userRole }: FeedbackComplaintsProps) {
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'complaint'>('feedback');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    barangay: '',
    subject: '',
    message: ''
  });

  const submissions = [
    { id: 'FB-001', type: 'Feedback', name: 'Juan Dela Cruz', subject: 'Excellent service during vaccination campaign', date: 'Dec 14, 2024', status: 'Resolved', priority: 'Low' },
    { id: 'CP-001', type: 'Complaint', name: 'Maria Santos', subject: 'Delayed processing of VHC certificate', date: 'Dec 13, 2024', status: 'Under Review', priority: 'High' },
    { id: 'SG-001', type: 'Suggestion', name: 'Pedro Reyes', subject: 'Extend vaccination hours on weekends', date: 'Dec 12, 2024', status: 'Under Review', priority: 'Medium' },
    { id: 'FB-002', type: 'Feedback', name: 'Ana Garcia', subject: 'Very helpful BAHW staff', date: 'Dec 11, 2024', status: 'Resolved', priority: 'Low' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert(`${feedbackType === 'feedback' ? 'Feedback' : 'Complaint'} submitted successfully!`);
    setFormData({ name: '', email: '', phone: '', barangay: '', subject: '', message: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-800 mb-1">Feedback & Complaints Management</h2>
        <p className="text-gray-600">ARTA-compliant citizen feedback mechanism</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
          <p className="text-gray-900">87</p>
          <p className="text-xs text-blue-600 mt-1">This month</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Feedback Received</p>
          <p className="text-gray-900">52</p>
          <p className="text-xs text-green-600 mt-1">All positive</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Complaints</p>
          <p className="text-gray-900">15</p>
          <p className="text-xs text-yellow-600 mt-1">10 resolved</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">Suggestions</p>
          <p className="text-gray-900">20</p>
          <p className="text-xs text-purple-600 mt-1">Under review</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-800 mb-4">Submit Feedback or Complaint</h3>
          
          {/* Type Selection */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFeedbackType('feedback')}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                feedbackType === 'feedback'
                  ? 'bg-[#60A85C] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Feedback / Suggestion
            </button>
            <button
              onClick={() => setFeedbackType('complaint')}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                feedbackType === 'complaint'
                  ? 'bg-[#E85D3B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Complaint
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Barangay</label>
              <select
                value={formData.barangay}
                onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                required
              >
                <option value="">Select Barangay</option>
                <option value="Barangay 1">Barangay 1</option>
                <option value="Barangay 2">Barangay 2</option>
                <option value="Barangay 3">Barangay 3</option>
                <option value="Barangay 4">Barangay 4</option>
                <option value="Barangay 5">Barangay 5</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] transition-colors"
            >
              <Send className="w-4 h-4" />
              Submit {feedbackType === 'feedback' ? 'Feedback' : 'Complaint'}
            </button>
          </form>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-800 mb-4">Contact the City Veterinary Office</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-800">Phone</p>
                  <p className="text-sm text-gray-600">(043) 123-4567</p>
                  <p className="text-sm text-gray-600">Mobile: 0917-123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-800">Email</p>
                  <p className="text-sm text-gray-600">cvo@calaca.gov.ph</p>
                  <p className="text-sm text-gray-600">veterinary.calaca@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-800">SMS</p>
                  <p className="text-sm text-gray-600">Text: 0917-123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Facebook className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-800">Social Media</p>
                  <p className="text-sm text-gray-600">Facebook: @CalacaCityVeterinaryOffice</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-800 mb-4">Track Your Submission</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your tracking number to check the status of your feedback or complaint.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., FB-001 or CP-001"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              />
              <button className="px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] transition-colors">
                Track
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions (Admin/BAHW View) */}
      {userRole === 'admin' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-gray-800">Recent Submissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 text-gray-700">Subject</th>
                  <th className="text-left py-3 px-4 text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-gray-700">Priority</th>
                  <th className="text-left py-3 px-4 text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800">{item.id}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.type === 'Complaint'
                          ? 'bg-red-100 text-red-800'
                          : item.type === 'Suggestion'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{item.name}</td>
                    <td className="py-3 px-4 text-gray-600">{item.subject}</td>
                    <td className="py-3 px-4 text-gray-600">{item.date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.priority === 'High'
                          ? 'bg-red-100 text-red-800'
                          : item.priority === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.status === 'Resolved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-[#2B5EA6] hover:underline text-sm">
                        {item.status === 'Resolved' ? 'View' : 'Resolve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARTA Commitment */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-900 mb-1">ARTA Commitment (RA 11032)</p>
            <p className="text-sm text-green-700">
              We are committed to responding to all feedback and complaints within 3 working days. 
              All submissions are tracked and monitored for timely resolution. Your voice matters in improving our services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
