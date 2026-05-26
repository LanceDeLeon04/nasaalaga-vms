import { useState, useEffect } from 'react';
import {
  MessageSquare, Phone, Mail, Send, CheckCircle, ThumbsUp,
  Lightbulb, AlertCircle, RefreshCw, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { User as UserType } from '../App';

interface UserFeedbackProps {
  user: UserType;
}

const BARANGAYS = [
  'Baclas','Bagong Tubig','Balimbing','Bambang','Bisaya','Cahil','Calantas','Caluangan',
  'Camastilisan','Coral Ni Bacal','Coral Ni Lopez','Dacanlao','Dila','Loma',
  'Lumbang Calzada','Lumbang Na Bata','Lumbang Na Matanda','Madalunot','Makina','Matipok',
  'Munting Coral','Niyugan','Pantay','Poblacion 1','Poblacion 2','Poblacion 3','Poblacion 4',
  'Poblacion 5','Poblacion 6','Puting Bato East','Puting Bato West','Quisumbing','Salong',
  'San Rafael','Sinisian','Taklang Anak','Talisay','Tamayo','Timbain',
];

export function UserFeedback({ user }: UserFeedbackProps) {
  const [category, setCategory] = useState<'feedback' | 'complaint' | 'suggestion'>('feedback');
  const [submitting, setSubmitting] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [trackedItem, setTrackedItem] = useState<any | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    barangay: user.barangay || '',
    priority: 'Medium',
  });

  const loadMySubmissions = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getFeedback();
      // Filter only the current user's submissions
      const mine = (res.feedback || []).filter(
        (f: any) => f.user_id === user.id || f.username === user.username
      );
      setMySubmissions(mine);
    } catch {
      toast.error('Failed to load your submissions');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) loadMySubmissions();
  }, [showHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createFeedback({
        category,
        subject: formData.subject,
        message: formData.message,
        barangay: formData.barangay,
        priority: formData.priority,
      });
      const refId = res.feedback?.id;
      toast.success(
        `${category === 'feedback' ? 'Feedback' : category === 'complaint' ? 'Complaint' : 'Suggestion'} submitted! Reference #: ${refId}`
      );
      setFormData({ subject: '', message: '', barangay: user.barangay || '', priority: 'Medium' });
      // Refresh history if visible
      if (showHistory) loadMySubmissions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async () => {
    const id = parseInt(trackingId.trim());
    if (!id) { toast.error('Enter a valid reference number'); return; }
    try {
      const res = await api.getFeedback();
      const item = (res.feedback || []).find((f: any) => f.id === id);
      if (item) setTrackedItem(item);
      else toast.error('Reference number not found');
    } catch {
      toast.error('Could not search at this time');
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
    return `px-2.5 py-0.5 text-xs font-medium rounded-full ${map[status] || 'bg-gray-100 text-gray-700'}`;
  };

  const categoryColors: Record<string, string> = {
    feedback: 'bg-green-500',
    complaint: 'bg-red-500',
    suggestion: 'bg-yellow-500',
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Feedback & Complaints</h2>
        <p className="text-sm text-gray-500">
          Submit your feedback, complaints, or suggestions directly to the City Veterinary Office.
          All submissions are tracked and responded to within 3 working days (RA 11032).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Submit Form ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#2B5EA6]" />
            Submit a New Entry
          </h3>

          {/* Category tabs */}
          <div className="flex gap-2 mb-5">
            {(['feedback', 'complaint', 'suggestion'] as const).map(type => (
              <button
                key={type}
                onClick={() => setCategory(type)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                  category === type
                    ? `${categoryColors[type]} text-white shadow-sm`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent text-sm"
                placeholder={
                  category === 'feedback' ? 'What went well?'
                  : category === 'complaint' ? 'What is your complaint about?'
                  : 'Your suggestion title'
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Barangay</label>
                <select
                  value={formData.barangay}
                  onChange={e => setFormData(p => ({ ...p, barangay: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] text-sm"
                >
                  <option value="">Select Barangay</option>
                  {BARANGAYS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] text-sm"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message *</label>
              <textarea
                value={formData.message}
                onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2B5EA6] text-sm resize-none"
                placeholder="Describe your feedback, complaint, or suggestion in detail..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2B5EA6] text-white rounded-lg hover:bg-[#234a85] disabled:opacity-50 transition-colors text-sm font-semibold"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : `Submit ${category.charAt(0).toUpperCase() + category.slice(1)}`}
            </button>
          </form>
        </div>

        {/* ── Right column: Contact + Track ── */}
        <div className="space-y-5">
          {/* Contact info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#2B5EA6]" />
              Contact the City Veterinary Office
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-[#2B5EA6]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                  <p className="text-sm text-gray-700">(043) 123-4567 / 0917-123-4567</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#2B5EA6]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-700">cvo@calaca.gov.ph</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-[#2B5EA6]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Facebook</p>
                  <p className="text-sm text-gray-700">@CalacaCityVeterinaryOffice</p>
                </div>
              </div>
            </div>
          </div>

          {/* Track submission */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-2">Track Your Submission</h3>
            <p className="text-xs text-gray-500 mb-3">
              Enter your reference number to check the latest status and any admin response.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={trackingId}
                onChange={e => setTrackingId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
                placeholder="e.g. 101"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2B5EA6]"
              />
              <button
                onClick={handleTrack}
                className="px-4 py-2 bg-[#60A85C] text-white rounded-lg hover:bg-[#4a8a47] text-sm font-semibold"
              >
                Track
              </button>
            </div>

            {trackedItem && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm relative">
                <button
                  onClick={() => setTrackedItem(null)}
                  className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {categoryIcon(trackedItem.category)}
                    <span className="font-semibold text-gray-700">Ref #: {trackedItem.id}</span>
                  </div>
                  <span className={statusBadge(trackedItem.status)}>{trackedItem.status}</span>
                </div>
                <p className="text-gray-700 font-medium">{trackedItem.subject}</p>
                <p className="text-gray-500 text-xs mt-1 capitalize">
                  {trackedItem.category} · {new Date(trackedItem.created_at).toLocaleDateString('en-PH')}
                </p>
                {trackedItem.admin_response ? (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Response from CVO:</p>
                    <p className="text-sm text-blue-800">{trackedItem.admin_response}</p>
                    {trackedItem.responded_by && (
                      <p className="text-xs text-blue-500 mt-1">— {trackedItem.responded_by}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 p-2.5 bg-yellow-50 rounded-lg border border-yellow-100 text-xs text-yellow-700">
                    No response yet. We aim to respond within 3 working days.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── My Submissions History ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <button
          onClick={() => setShowHistory(v => !v)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#2B5EA6]" />
            <span className="font-semibold text-gray-800">My Submission History</span>
            {mySubmissions.length > 0 && (
              <span className="text-xs bg-[#2B5EA6] text-white px-2 py-0.5 rounded-full">
                {mySubmissions.length}
              </span>
            )}
          </div>
          {showHistory ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {showHistory && (
          <div className="border-t border-gray-100">
            {loadingHistory ? (
              <div className="py-10 text-center text-sm text-gray-500">Loading your submissions...</div>
            ) : mySubmissions.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                You haven't submitted any feedback or complaints yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {mySubmissions.map(item => (
                  <div key={item.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {categoryIcon(item.category)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400 font-mono">#{item.id}</span>
                            <span className="font-medium text-gray-800 text-sm truncate">{item.subject}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 capitalize">
                            {item.category} · {item.barangay || 'N/A'} · {new Date(item.created_at).toLocaleDateString('en-PH')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={statusBadge(item.status)}>{item.status}</span>
                        <button
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400"
                        >
                          {expandedId === item.id
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>

                    {expandedId === item.id && (
                      <div className="mt-3 space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                          {item.message}
                        </div>
                        {item.admin_response ? (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Response from CVO:</p>
                            <p className="text-sm text-blue-800">{item.admin_response}</p>
                            {item.responded_by && (
                              <p className="text-xs text-blue-500 mt-1">— {item.responded_by}</p>
                            )}
                            {item.responded_at && (
                              <p className="text-xs text-blue-400 mt-0.5">
                                {new Date(item.responded_at).toLocaleDateString('en-PH')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-xs text-amber-700">
                            Awaiting response from CVO. Expected within 3 working days.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ARTA Notice */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-900 font-semibold text-sm">ARTA Commitment (RA 11032)</p>
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
              We are committed to responding to all feedback and complaints within 3 working days.
              All submissions are logged in our system. Your voice matters in improving our services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
