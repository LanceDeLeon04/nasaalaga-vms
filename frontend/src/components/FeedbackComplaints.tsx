import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Mail, Send, CheckCircle, RefreshCw, Reply, X, AlertCircle, ThumbsUp, Lightbulb, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { UserRole } from '../App';

interface FeedbackComplaintsProps {
  userRole: UserRole;
  currentUser?: any;
}

const BARANGAYS = [
  'Baclas','Bagong Tubig','Balimbing','Bambang','Bisaya','Cahil','Calantas','Caluangan',
  'Camastilisan','Coral Ni Bacal','Coral Ni Lopez','Dacanlao','Dila','Loma',
  'Lumbang Calzada','Lumbang Na Bata','Lumbang Na Matanda','Madalunot','Makina','Matipok',
  'Munting Coral','Niyugan','Pantay','Poblacion 1','Poblacion 2','Poblacion 3','Poblacion 4',
  'Poblacion 5','Poblacion 6','Puting Bato East','Puting Bato West','Quisumbing','Salong',
  'San Rafael','Sinisian','Taklang Anak','Talisay','Tamayo','Timbain',
];

export function FeedbackComplaints({ userRole, currentUser }: FeedbackComplaintsProps) {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<'feedback' | 'complaint' | 'suggestion'>('feedback');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState('Resolved');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [trackingId, setTrackingId] = useState('');
  const [trackedItem, setTrackedItem] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    subject: '', message: '', barangay: '', priority: 'Medium',
  });

  const isAdmin = ['admin', 'superadmin'].includes(userRole);
  const isViewer = ['bahw', 'cityHealth'].includes(userRole);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const res = await api.getFeedback();
      setFeedbackList(res.feedback || []);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin || isViewer) loadFeedback(); else setLoading(false); }, [isAdmin, isViewer]);

  const stats = {
    total: feedbackList.length,
    feedbacks: feedbackList.filter(f => f.category === 'feedback').length,
    complaints: feedbackList.filter(f => f.category === 'complaint').length,
    suggestions: feedbackList.filter(f => f.category === 'suggestion').length,
    resolved: feedbackList.filter(f => f.status === 'Resolved').length,
    open: feedbackList.filter(f => f.status === 'Open' || f.status === 'Under Review').length,
  };

  const filtered = feedbackList.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterCategory !== 'all' && f.category !== filterCategory) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) { toast.error('Subject and message are required'); return; }
    setSubmitting(true);
    try {
      const res = await api.createFeedback({
        category,
        subject: formData.subject,
        message: formData.message,
        barangay: formData.barangay,
        priority: formData.priority,
      });
      toast.success(`${category === 'feedback' ? 'Feedback' : category === 'complaint' ? 'Complaint' : 'Suggestion'} submitted successfully! Reference: #${res.feedback?.id}`);
      setFormData({ subject: '', message: '', barangay: '', priority: 'Medium' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async () => {
    if (!responseText.trim()) { toast.error('Response message is required'); return; }
    try {
      await (api as any).respondToFeedback(selectedItem.id, { response: responseText, status: responseStatus });
      toast.success('Response sent successfully');
      setSelectedItem(null);
      setResponseText('');
      loadFeedback();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleTrack = async () => {
    const id = parseInt(trackingId);
    if (!id) { toast.error('Enter a valid reference number'); return; }
    const found = feedbackList.find(f => f.id === id);
    if (found) { setTrackedItem(found); }
    else {
      try {
        const res = await api.getFeedback();
        const item = (res.feedback || []).find((f: any) => f.id === id);
        if (item) setTrackedItem(item);
        else toast.error('Reference number not found');
      } catch { toast.error('Could not search at this time'); }
    }
  };

  const categoryIcon = (cat: string) => {
    if (cat === 'feedback') return <ThumbsUp className="w-4 h-4 text-green-500" />;
    if (cat === 'complaint') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Lightbulb className="w-4 h-4 text-yellow-500" />;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Open': 'bg-blue-100 text-blue-800',
      'Under Review': 'bg-yellow-100 text-yellow-800',
      'Resolved': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
    };
    return `px-2 py-0.5 text-xs rounded-full ${map[status] || 'bg-gray-100 text-gray-700'}`;
  };

  const priorityBadge = (priority: string) => {
    const map: Record<string, string> = { 'High': 'bg-red-100 text-red-800', 'Medium': 'bg-yellow-100 text-yellow-800', 'Low': 'bg-green-100 text-green-800' };
    return `px-2 py-0.5 text-xs rounded-full ${map[priority] || 'bg-gray-100 text-gray-700'}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-800 mb-1">Feedback & Complaints Management</h2>
        <p className="text-gray-600">ARTA-compliant citizen feedback mechanism (RA 11032)</p>
      </div>

      {/* Stats - admin/viewer only */}
      {(isAdmin || isViewer) && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Feedback', value: stats.feedbacks, color: 'text-green-600' },
            { label: 'Complaints', value: stats.complaints, color: 'text-red-600' },
            { label: 'Suggestions', value: stats.suggestions, color: 'text-yellow-600' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-700' },
            { label: 'Pending', value: stats.open, color: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg shadow p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-800 font-medium mb-4">Submit Feedback, Complaint, or Suggestion</h3>

          <div className="flex gap-2 mb-4">
            {(['feedback', 'complaint', 'suggestion'] as const).map(type => (
              <button key={type} onClick={() => setCategory(type)}
                className={`flex-1 px-3 py-2 rounded-md text-sm capitalize transition-colors ${category === type
                  ? type === 'feedback' ? 'bg-green-500 text-white' : type === 'complaint' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {type}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Subject *</label>
              <input type="text" value={formData.subject} onChange={e => setFormData(p => ({...p, subject: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6] text-sm"
                placeholder={category === 'feedback' ? 'What went well?' : category === 'complaint' ? 'What is your complaint about?' : 'Your suggestion'} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Barangay</label>
                <select value={formData.barangay} onChange={e => setFormData(p => ({...p, barangay: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6] text-sm">
                  <option value="">Select Barangay</option>
                  {BARANGAYS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Priority</label>
                <select value={formData.priority} onChange={e => setFormData(p => ({...p, priority: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6] text-sm">
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Message *</label>
              <textarea value={formData.message} onChange={e => setFormData(p => ({...p, message: e.target.value}))}
                rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2B5EA6] text-sm"
                placeholder="Describe your feedback, complaint, or suggestion in detail..." required />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85] disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : `Submit ${category}`}
            </button>
          </form>
        </div>

        {/* Contact + Track */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-800 font-medium mb-4">Contact the City Veterinary Office</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
                <div><p className="text-sm font-medium text-gray-700">Phone</p><p className="text-sm text-gray-600">(043) 123-4567 / 0917-123-4567</p></div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
                <div><p className="text-sm font-medium text-gray-700">Email</p><p className="text-sm text-gray-600">cvo@calaca.gov.ph</p></div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-[#2B5EA6] flex-shrink-0 mt-0.5" />
                <div><p className="text-sm font-medium text-gray-700">Facebook</p><p className="text-sm text-gray-600">@CalacaCityVeterinaryOffice</p></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-800 font-medium mb-3">Track Your Submission</h3>
            <p className="text-sm text-gray-600 mb-3">Enter your reference number (e.g. 101) to check the status.</p>
            <div className="flex gap-2">
              <input type="text" value={trackingId} onChange={e => setTrackingId(e.target.value)}
                placeholder="Enter reference number" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]" />
              <button onClick={handleTrack} className="px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] text-sm">Track</button>
            </div>
            {trackedItem && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700">Ref #: {trackedItem.id}</span>
                  <span className={statusBadge(trackedItem.status)}>{trackedItem.status}</span>
                </div>
                <p className="text-gray-600">{trackedItem.subject}</p>
                <p className="text-gray-500 text-xs mt-1">Category: {trackedItem.category} | Submitted: {new Date(trackedItem.created_at).toLocaleDateString('en-PH')}</p>
                {trackedItem.admin_response && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                    <p className="text-xs font-medium text-blue-700 mb-1">Response from CVO:</p>
                    <p className="text-xs text-blue-800">{trackedItem.admin_response}</p>
                    {trackedItem.responded_by && <p className="text-xs text-blue-500 mt-1">— {trackedItem.responded_by}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin/Viewer Table */}
      {(isAdmin || isViewer) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-gray-800 font-medium">All Submissions</h3>
            <div className="flex gap-2">
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm">
                <option value="all">All Types</option>
                <option value="feedback">Feedback</option>
                <option value="complaint">Complaint</option>
                <option value="suggestion">Suggestion</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm">
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="Under Review">Under Review</option>
                <option value="Resolved">Resolved</option>
              </select>
              {isAdmin && (
                <button onClick={loadFeedback} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-gray-500">Loading submissions from database...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-600">#</th>
                    <th className="text-left py-3 px-4 text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 text-gray-600">Subject</th>
                    <th className="text-left py-3 px-4 text-gray-600">Submitted By</th>
                    <th className="text-left py-3 px-4 text-gray-600">Barangay</th>
                    <th className="text-left py-3 px-4 text-gray-600">Priority</th>
                    <th className="text-left py-3 px-4 text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-gray-600">Date</th>
                    {isAdmin && <th className="text-left py-3 px-4 text-gray-600">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-gray-500">No submissions found.</td></tr>
                  ) : filtered.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700 font-medium">{item.id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {categoryIcon(item.category)}
                          <span className="capitalize text-gray-600">{item.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 max-w-xs truncate" title={item.subject}>{item.subject}</td>
                      <td className="py-3 px-4 text-gray-600">{item.username || 'Anonymous'}</td>
                      <td className="py-3 px-4 text-gray-600">{item.barangay || '-'}</td>
                      <td className="py-3 px-4"><span className={priorityBadge(item.priority)}>{item.priority || 'Medium'}</span></td>
                      <td className="py-3 px-4"><span className={statusBadge(item.status)}>{item.status}</span></td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{new Date(item.created_at).toLocaleDateString('en-PH')}</td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => { setSelectedItem(item); setResponseText(item.admin_response || ''); setResponseStatus(item.status === 'Resolved' ? 'Resolved' : 'Resolved'); }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-[#2B5EA6] text-white rounded hover:bg-[#234a85]">
                              <Reply className="w-3 h-3" /> Respond
                            </button>
                            <button onClick={() => setSelectedItem(item)}
                              className="p-1 hover:bg-gray-100 rounded" title="View details">
                              <Eye className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ARTA Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-900 font-medium">ARTA Commitment (RA 11032)</p>
            <p className="text-sm text-green-700">We are committed to responding to all feedback and complaints within 3 working days. All submissions are tracked in our database. Your voice matters in improving our services.</p>
          </div>
        </div>
      </div>

      {/* Respond Modal */}
      {selectedItem && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">Respond to Submission #{selectedItem.id}</h3>
              <button onClick={() => setSelectedItem(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {categoryIcon(selectedItem.category)}
                  <span className="font-medium text-gray-700 capitalize">{selectedItem.category}</span>
                  <span className={priorityBadge(selectedItem.priority)}>{selectedItem.priority}</span>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">{selectedItem.subject}</p>
                <p className="text-sm text-gray-600">{selectedItem.message}</p>
                <p className="text-xs text-gray-400 mt-2">By: {selectedItem.username} | {selectedItem.barangay} | {new Date(selectedItem.created_at).toLocaleDateString('en-PH')}</p>
              </div>
              {selectedItem.admin_response && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Previous Response:</p>
                  <p className="text-sm text-blue-800">{selectedItem.admin_response}</p>
                  <p className="text-xs text-blue-500 mt-1">— {selectedItem.responded_by}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Your Response *</label>
                <textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#2B5EA6]"
                  placeholder="Type your official response here..." />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Update Status</label>
                <select value={responseStatus} onChange={e => setResponseStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setSelectedItem(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleRespond} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-md hover:bg-[#234a85]">
                <Send className="w-4 h-4" /> Send Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
