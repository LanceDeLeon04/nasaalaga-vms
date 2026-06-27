import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, X, CheckCircle, AlertCircle, Scissors,
  Syringe, Stethoscope, AlertTriangle, ChevronLeft, ChevronRight,
  MapPin, User, Ban, Check, Eye, Bell, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { User as UserType } from '../App';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ScheduleType = 'Vaccination' | 'Spay/Neuter' | 'Checkup' | 'Intervention' | 'Outbreak';

interface ScheduleEntry {
  id: string;
  type: ScheduleType;
  title: string;
  date: string;
  timeSlot: string; // e.g. "09:00"
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  requestedBy?: string; // userId
  requestedByName?: string;
  notes?: string;
  petName?: string;
  petId?: string;
  barangay?: string;
  venue?: string;
  capacity?: number;
  // For admin-created blocks (interventions/outbreaks)
  isAdminCreated?: boolean;
  linkedRecordId?: string; // intervention or outbreak id
}

interface UnavailableBlock {
  id: string;
  userId: string;
  userName: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  reason?: string;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 17; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`);
  if (h < 17) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:15`);
  if (h < 17) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`);
  if (h < 17) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:45`);
}

const TYPE_CONFIG: Record<ScheduleType, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  Vaccination:  { color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Syringe  className="w-3.5 h-3.5" />, label: 'Vaccination'  },
  'Spay/Neuter':{ color: 'text-purple-700', bg: 'bg-purple-100', icon: <Scissors className="w-3.5 h-3.5" />, label: 'Spay/Neuter' },
  Checkup:      { color: 'text-green-700',  bg: 'bg-green-100',  icon: <Stethoscope className="w-3.5 h-3.5"/>, label: 'Checkup'   },
  Intervention: { color: 'text-orange-700', bg: 'bg-orange-100', icon: <AlertTriangle className="w-3.5 h-3.5"/>, label: 'Intervention'},
  Outbreak:     { color: 'text-red-700',    bg: 'bg-red-100',    icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Outbreak'  },
};

const STATUS_CONFIG = {
  Pending:    { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Confirmed:  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  Completed:  { bg: 'bg-green-100',  text: 'text-green-700'  },
  Cancelled:  { bg: 'bg-red-100',    text: 'text-red-700'    },
};

// ─── HELPER ──────────────────────────────────────────────────────────────────

function fmt12(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getOneWeekMax() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// ─── DB → frontend mapper ─────────────────────────────────────────────────────

function mapDbSchedule(row: any): ScheduleEntry {
  // Normalize date to YYYY-MM-DD
  const rawDate = row.date ? String(row.date).split('T')[0] : '';
  // Normalize time_slot — strip AM/PM suffixes that may come from old vaccination_schedules rows
  const rawTime = row.time_slot || row.time_start || '08:00';
  const normalizedTime = rawTime.replace(/\s*(AM|PM)$/i, '').trim();
  return {
    id: row.id,
    type: (row.schedule_type || row.type || 'Vaccination') as ScheduleType,
    title: row.title || `${row.schedule_type || 'Vaccination'} — ${row.barangay || 'CVO'}`,
    date: rawDate,
    timeSlot: normalizedTime,
    status: (row.status === 'Scheduled' ? 'Confirmed' : row.status) as ScheduleEntry['status'],
    requestedBy: row.requested_by || row.owner_id || undefined,
    requestedByName: row.requested_by_name || row.created_by || undefined,
    notes: row.notes || undefined,
    petName: row.pet_name || undefined,
    petId: row.pet_id || undefined,
    barangay: row.barangay || undefined,
    venue: row.venue || undefined,
    capacity: row.capacity ? Number(row.capacity) : undefined,
    isAdminCreated: row.is_admin_created ?? (!row.requested_by),
    linkedRecordId: row.linked_record_id || undefined,
  };
}

// ─── REQUEST FORM MODAL ───────────────────────────────────────────────────────

function RequestScheduleModal({
  user, existingSchedules, unavailableBlocks, onClose, onSave,
}: {
  user: UserType;
  existingSchedules: ScheduleEntry[];
  unavailableBlocks: UnavailableBlock[];
  onClose: () => void;
  onSave: (entry: Omit<ScheduleEntry, 'id'>) => void;
}) {
  const [form, setForm] = useState({
    type: 'Checkup' as ScheduleType,
    date: '',
    timeSlot: '',
    petName: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const maxDate = getOneWeekMax();
  const todayStr = getTodayStr();

  // Get taken slots for selected date (max 2 per slot)
  const takenSlots = (date: string) => {
    const counts: Record<string, number> = {};
    existingSchedules.filter(s => s.date === date && s.status !== 'Cancelled').forEach(s => {
      counts[s.timeSlot] = (counts[s.timeSlot] || 0) + 1;
    });
    return counts;
  };

  const isUnavailable = (date: string, slot: string) => {
    const taken = takenSlots(date);
    if ((taken[slot] || 0) >= 2) return true;
    return unavailableBlocks.some(b => b.date === date && slot >= b.timeStart && slot < b.timeEnd);
  };

  const availableSlots = form.date ? TIME_SLOTS.filter(s => !isUnavailable(form.date, s)) : [];

  const handleSubmit = () => {
    if (!form.date || !form.timeSlot) { toast.error('Please select date and time'); return; }
    if (!form.petName.trim()) { toast.error('Pet name is required'); return; }
    setSaving(true);
    setTimeout(() => {
      onSave({
        type: form.type,
        title: `${form.type} — ${form.petName}`,
        date: form.date,
        timeSlot: form.timeSlot,
        status: 'Pending',
        requestedBy: user.ownerId || user.email,
        requestedByName: user.username || user.email,
        petName: form.petName,
        notes: form.notes,
      });
      setSaving(false);
      toast.success('Schedule request submitted!');
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#2B5EA6] to-[#60A85C] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white" />
            <p className="font-bold text-white">Request Schedule</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Service Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Vaccination','Checkup','Spay/Neuter'] as ScheduleType[]).map(t => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-bold ${
                      form.type === t ? `border-current ${cfg.bg} ${cfg.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Pet Name *</label>
            <input
              value={form.petName}
              onChange={e => setForm(f => ({ ...f, petName: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6] focus:ring-2 focus:ring-[#2B5EA6]/10"
              placeholder="Enter pet name…"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
              Date * <span className="text-gray-400 font-normal normal-case">(max 1 week ahead)</span>
            </label>
            <input
              type="date"
              min={todayStr}
              max={maxDate}
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value, timeSlot: '' }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6] focus:ring-2 focus:ring-[#2B5EA6]/10"
            />
          </div>

          {form.date && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                Time Slot * <span className="text-gray-400 font-normal normal-case">(15-min slots, max 2 per slot)</span>
              </label>
              {availableSlots.length === 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                  No available slots on this date. Please choose another date.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                  {TIME_SLOTS.map(slot => {
                    const taken = takenSlots(form.date)[slot] || 0;
                    const unavail = isUnavailable(form.date, slot);
                    const selected = form.timeSlot === slot;
                    return (
                      <button key={slot}
                        disabled={unavail}
                        onClick={() => setForm(f => ({ ...f, timeSlot: slot }))}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selected ? 'bg-[#2B5EA6] text-white' :
                          unavail ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through' :
                          taken === 1 ? 'bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100' :
                          'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-[#2B5EA6]/30'
                        }`}>
                        {fmt12(slot)}
                        {taken > 0 && !unavail && <span className="block text-[9px] text-yellow-600">{taken}/2</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6] focus:ring-2 focus:ring-[#2B5EA6]/10 resize-none"
              placeholder="Any concerns or notes…"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.date || !form.timeSlot || !form.petName}
              className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? 'Submitting…' : <><Calendar className="w-4 h-4" />Submit Request</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MARK UNAVAILABLE MODAL ───────────────────────────────────────────────────

function MarkUnavailableModal({
  user, onClose, onSave,
}: {
  user: UserType;
  onClose: () => void;
  onSave: (block: Omit<UnavailableBlock, 'id'>) => void;
}) {
  const [form, setForm] = useState({ date: '', timeStart: '07:00', timeEnd: '17:00', reason: '' });
  const maxDate = getOneWeekMax();

  const handleSave = () => {
    if (!form.date) { toast.error('Please select a date'); return; }
    if (form.timeStart >= form.timeEnd) { toast.error('End time must be after start time'); return; }
    onSave({
      userId: user.ownerId || user.email,
      userName: user.username || user.email,
      date: form.date,
      timeStart: form.timeStart,
      timeEnd: form.timeEnd,
      reason: form.reason,
    });
    toast.success('Unavailability marked');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><Ban className="w-5 h-5 text-white" /><p className="font-bold text-white">Mark Unavailable</p></div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">Mark a time when you cannot attend appointments. This will block those slots from being booked.</p>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Date *</label>
            <input type="date" min={getTodayStr()} max={maxDate} value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">From</label>
              <select value={form.timeStart} onChange={e => setForm(f => ({...f, timeStart: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]">
                {TIME_SLOTS.map(s => <option key={s} value={s}>{fmt12(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">To</label>
              <select value={form.timeEnd} onChange={e => setForm(f => ({...f, timeEnd: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]">
                {TIME_SLOTS.map(s => <option key={s} value={s}>{fmt12(s)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Reason (optional)</label>
            <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]"
              placeholder="e.g., Out of office, Holiday…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 bg-gray-700 text-white rounded-xl text-sm font-bold hover:bg-gray-800 flex items-center justify-center gap-2">
              <Ban className="w-4 h-4" />Mark Unavailable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADD ADMIN SCHEDULE MODAL ─────────────────────────────────────────────────

function AddAdminScheduleModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (entry: Omit<ScheduleEntry, 'id'>) => void;
}) {
  const CALACA_BARANGAYS = ['Baclas','Bagong Tubig','Balimbing','Bambang','Bisaya','Cahil','Calantas','Caluangan','Camastilisan','Coral Ni Bacal','Coral Ni Lopez','Dacanlao','Dila','Loma','Lumbang Calzada','Lumbang Na Bata','Lumbang Na Matanda','Madalunot','Makina','Matipok','Munting Coral','Niyugan','Pantay','Poblacion 1','Poblacion 2','Poblacion 3','Poblacion 4','Poblacion 5','Poblacion 6','Puting Bato East','Puting Bato West','Quisumbing','Salong','San Rafael','Sinisian','Taklang Anak','Talisay','Tamayo','Timbain'];

  const [form, setForm] = useState({
    type: 'Vaccination' as ScheduleType,
    title: '',
    date: '',
    timeSlot: '08:00',
    barangay: '',
    venue: '',
    capacity: '20',
    notes: '',
  });
  const [notifyCount, setNotifyCount] = React.useState<number|null>(null);
  const [loadingCount, setLoadingCount] = React.useState(false);

  // When barangay changes, fetch how many users will be notified
  React.useEffect(() => {
    if (!form.barangay) { setNotifyCount(null); return; }
    setLoadingCount(true);
    fetch(`/api/users?barangay=${encodeURIComponent(form.barangay)}`, {
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('nasaalaga_token') || '') }
    })
      .then(r => r.json())
      .then(d => setNotifyCount((d.users || []).length))
      .catch(() => setNotifyCount(null))
      .finally(() => setLoadingCount(false));
  }, [form.barangay]);

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.date) { toast.error('Date is required'); return; }
    onSave({
      type: form.type,
      title: form.title,
      date: form.date,
      timeSlot: form.timeSlot,
      status: 'Confirmed',
      isAdminCreated: true,
      barangay: form.barangay,
      venue: form.venue,
      capacity: parseInt(form.capacity) || 20,
      notes: form.notes,
      requestedByName: 'Admin',
    });
    if (form.barangay && notifyCount && notifyCount > 0) {
      toast.success(`Schedule added! Notifying ${notifyCount} resident(s) in ${form.barangay}…`);
    } else {
      toast.success('Schedule added!');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-white" /><p className="font-bold text-white">Add Schedule</p></div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Schedule Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_CONFIG) as ScheduleType[]).map(t => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      form.type === t ? `${cfg.bg} ${cfg.color} border-transparent` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {cfg.icon}{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]"
              placeholder={`e.g., ${form.type} Drive — ${new Date().toLocaleDateString('en-PH',{month:'long'})}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Start Time</label>
              <select value={form.timeSlot} onChange={e => setForm(f => ({...f, timeSlot: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]">
                {TIME_SLOTS.filter((_,i) => i % 4 === 0).map(s => <option key={s} value={s}>{fmt12(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Barangay</label>
              <select value={form.barangay} onChange={e => setForm(f => ({...f, barangay: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]">
                <option value="">All / City-wide</option>
                {CALACA_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm(f => ({...f, capacity: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]" />
            </div>
          </div>
          {/* Notify preview */}
          {form.barangay && (
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
              notifyCount && notifyCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                {loadingCount
                  ? <p className="text-xs">Checking residents in {form.barangay}…</p>
                  : notifyCount !== null
                    ? notifyCount > 0
                      ? <><p className="font-bold text-xs">🔔 {notifyCount} resident(s) in {form.barangay} will be notified immediately</p>
                          <p className="text-[11px] mt-0.5 opacity-80">All users (pet owners, livestock managers, BAHWs) tagged with this barangay will receive an in-app notification when you save.</p></>
                      : <p className="text-xs">No registered users found in {form.barangay} — no notifications will be sent.</p>
                    : null
                }
                {!form.barangay && <p className="text-xs">Select a barangay above to enable targeted notifications.</p>}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Venue</label>
            <input value={form.venue} onChange={e => setForm(f => ({...f, venue: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]"
              placeholder="Venue / location" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6] resize-none"
              placeholder="Additional info, linked intervention ID, etc." />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Add Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────

function CalendarView({ schedules, onDayClick, isAdmin }: {
  schedules: ScheduleEntry[];
  onDayClick: (date: string) => void;
  isAdmin: boolean;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const getForDay = (day: number) =>
    schedules.filter(s => {
      const d = new Date(s.date + 'T00:00:00');
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
    });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-4 flex items-center justify-between">
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); }}
          className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <p className="text-white font-bold text-lg">{MONTHS[viewMonth]} {viewYear}</p>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); }}
          className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30">
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({length: firstDay}, (_, i) => <div key={`e${i}`} />)}
          {Array.from({length: daysInMonth}, (_, i) => {
            const day = i + 1;
            const ds = getForDay(day);
            const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
            const isPast  = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const typeSet = [...new Set(ds.map(s => s.type))];
            return (
              <button key={day} onClick={() => ds.length > 0 && onDayClick(dateStr)}
                className={`min-h-[56px] rounded-xl p-1 border text-left transition-all ${
                  isToday ? 'border-[#2B5EA6] bg-blue-50 ring-2 ring-[#2B5EA6]/20' :
                  ds.length ? 'border-gray-200 bg-white hover:bg-gray-50 cursor-pointer' :
                  isPast ? 'border-transparent bg-gray-50/50' : 'border-transparent hover:bg-gray-50'
                }`}>
                <p className={`text-xs font-bold mb-1 ${isToday ? 'text-[#2B5EA6]' : isPast ? 'text-gray-300' : 'text-gray-600'}`}>{day}</p>
                <div className="space-y-0.5">
                  {typeSet.slice(0,3).map(t => {
                    const cfg = TYPE_CONFIG[t];
                    return <div key={t} className={`w-full rounded text-[8px] font-bold px-1 py-0.5 truncate ${cfg.bg} ${cfg.color}`}>{cfg.label}</div>;
                  })}
                  {typeSet.length > 3 && <div className="text-[8px] text-gray-400 font-bold px-1">+{typeSet.length - 3}</div>}
                </div>
              </button>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
          {(Object.entries(TYPE_CONFIG) as [ScheduleType, typeof TYPE_CONFIG[ScheduleType]][]).map(([t, cfg]) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN SCHEDULE MODULE ─────────────────────────────────────────────────────

interface ScheduleModuleProps {
  user: UserType;
}

export function ScheduleModule({ user }: ScheduleModuleProps) {
  const isAdmin = ['admin','superadmin','bahw','cvoStaff'].includes(user.role || '');
  const isNonAdmin = !isAdmin;

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [unavailableBlocks, setUnavailableBlocks] = useState<UnavailableBlock[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [filterType, setFilterType] = useState<'all' | ScheduleType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [showAdminAddModal, setShowAdminAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // ── Fetch from DB ─────────────────────────────────────────────────────────
  useEffect(() => { fetchSchedules(); fetchUnavailableBlocks(); fetchNotifications(); }, []);

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      // Fetch both appointment_schedules and vaccination_schedules (community drives)
      const [apptData, vaccData] = await Promise.all([
        api.getAppointmentSchedules().catch(() => ({ schedules: [] })),
        api.getSchedules().catch(() => ({ schedules: [] })),
      ]);
      const apptRows: ScheduleEntry[] = (apptData.schedules || []).map(mapDbSchedule);
      const vaccRows: ScheduleEntry[] = (vaccData.schedules || []).map((row: any) => ({
        ...mapDbSchedule(row),
        type: 'Vaccination' as ScheduleType,
        isAdminCreated: true,
      }));
      // Merge, de-duplicate by id
      const seen = new Set<string>();
      const merged: ScheduleEntry[] = [];
      for (const s of [...apptRows, ...vaccRows]) {
        if (!seen.has(s.id)) { seen.add(s.id); merged.push(s); }
      }
      setSchedules(merged);
    } catch {
      // silent — show empty state
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchUnavailableBlocks = async () => {
    try {
      const data = await api.getUnavailableBlocks();
      setUnavailableBlocks(data.blocks || []);
    } catch { /* silent */ }
  };

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch { /* silent */ }
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n));
    try { await api.markNotificationRead(id); } catch { /* silent */ }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({...n, is_read: true})));
    try { await api.markAllNotificationsRead(); } catch { /* silent */ }
  };

  // Non-admins only see their own schedules
  const visibleSchedules = isAdmin
    ? schedules
    : schedules.filter(s =>
        s.isAdminCreated ||  // public events
        s.requestedBy === (user.ownerId || user.email)
      );

  const filteredSchedules = visibleSchedules.filter(s =>
    (filterType === 'all' || s.type === filterType) &&
    (filterStatus === 'all' || s.status === filterStatus) &&
    (selectedDay ? s.date === selectedDay : true)
  );

  // Upcoming (next 7 days)
  const today = getTodayStr();
  const nextWeek = getOneWeekMax();
  const upcomingSchedules = visibleSchedules.filter(s =>
    s.date >= today && s.date <= nextWeek && s.status !== 'Cancelled'
  ).sort((a,b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot));

  const handleAddSchedule = async (entry: Omit<ScheduleEntry, 'id'>) => {
    try {
      const payload = {
        scheduleType: entry.type,
        title: entry.title,
        date: entry.date,
        timeSlot: entry.timeSlot,
        status: entry.status,
        requestedBy: entry.requestedBy,
        requestedByName: entry.requestedByName,
        notes: entry.notes,
        petName: entry.petName,
        petId: entry.petId,
        barangay: entry.barangay,
        venue: entry.venue,
        capacity: entry.capacity,
        isAdminCreated: entry.isAdminCreated ?? true,
        linkedRecordId: entry.linkedRecordId,
      };
      const data = await api.createAppointmentSchedule(payload);
      const saved = mapDbSchedule(data.schedule || data);
      setSchedules(prev => [...prev, saved]);
      // If the backend returned notifiedBarangay, show a success message
      if (data.notifiedBarangay) {
        toast.success(`📣 All residents in Barangay ${data.notifiedBarangay} have been notified!`);
      }
    } catch {
      // Optimistic fallback
      const id = `SCH-${String(schedules.length + 1).padStart(3,'0')}`;
      setSchedules(prev => [...prev, { ...entry, id }]);
    }
  };

  const handleStatusChange = async (id: string, status: ScheduleEntry['status']) => {
    // Optimistic update
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    toast.success(`Schedule marked as ${status}`);
    try {
      // Try appointment_schedules first, fallback to vaccination_schedules
      await api.updateAppointmentSchedule(id, { status }).catch(() =>
        api.updateSchedule(id, { status })
      );
    } catch { /* already updated optimistically */ }
  };

  const handleDeleteUnavail = async (id: string) => {
    setUnavailableBlocks(prev => prev.filter(b => b.id !== id));
    toast.success('Unavailability removed');
    try { await api.deleteUnavailableBlock(id); } catch { /* silent */ }
  };

  // Loading state used in header badge
  const isLoading = loadingSchedules;

  // Stats
  const totalUpcoming = upcomingSchedules.length;
  const totalPending  = visibleSchedules.filter(s => s.status === 'Pending').length;
  const totalToday    = visibleSchedules.filter(s => s.date === today).length;
  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Schedule Management
            </h2>
            <p className="text-white/80 text-sm">
              {isAdmin
                ? 'Manage all appointments, vaccination drives, interventions, and outbreaks'
                : 'Your upcoming appointments and schedule requests (max 1 week ahead)'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Notification bell */}
            <button onClick={() => setShowNotifPanel(v => !v)} className="relative flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white rounded-xl text-sm font-bold hover:bg-white/30 transition-all">
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">{unreadNotifCount}</span>
              )}
            </button>
            {isNonAdmin && (
              <>
                <button onClick={() => setShowRequestModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-[#2B5EA6] rounded-xl text-sm font-bold hover:bg-blue-50 transition-all shadow">
                  <Plus className="w-4 h-4" />Request Schedule
                </button>
                <button onClick={() => setShowUnavailableModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl text-sm font-bold hover:bg-white/30 transition-all">
                  <Ban className="w-4 h-4" />Mark Unavailable
                </button>
              </>
            )}
            {isAdmin && (
              <button onClick={() => setShowAdminAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#2B5EA6] rounded-xl text-sm font-bold hover:bg-blue-50 transition-all shadow">
                <Plus className="w-4 h-4" />Add Schedule
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifPanel && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-[#1e4080] to-[#2B5EA6]">
            <p className="font-bold text-white text-sm flex items-center gap-2"><Bell className="w-4 h-4"/>Notifications{unreadNotifCount > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{unreadNotifCount} new</span>}</p>
            <div className="flex items-center gap-2">
              {unreadNotifCount > 0 && <button onClick={markAllRead} className="text-xs text-white/80 hover:text-white font-semibold">Mark all read</button>}
              <button onClick={() => setShowNotifPanel(false)} className="text-white/70 hover:text-white"><X className="w-4 h-4"/></button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20"/>
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  className={`px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 ${!n.is_read ? 'bg-blue-50/60' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-gray-200'}`}/>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Today', value: totalToday,    color:'text-[#2B5EA6]', bg:'bg-blue-50',   border:'border-blue-200',  icon:<Clock className="w-4 h-4" /> },
          { label:'This Week', value: totalUpcoming, color:'text-green-700',bg:'bg-green-50', border:'border-green-200', icon:<Calendar className="w-4 h-4" /> },
          { label:'Pending',   value: totalPending,  color:'text-yellow-700',bg:'bg-yellow-50',border:'border-yellow-200',icon:<Bell className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`${s.color}`}>{s.icon}</div>
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming strip */}
      {upcomingSchedules.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#2B5EA6]" />
            <p className="font-bold text-gray-800 text-sm">Upcoming This Week</p>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingSchedules.slice(0,5).map(s => {
              const cfg = TYPE_CONFIG[s.type];
              const stCfg = STATUS_CONFIG[s.status];
              return (
                <div key={s.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0`}>{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{s.title}</p>
                    <p className="text-xs text-gray-500">{fmtDate(s.date)} · {fmt12(s.timeSlot)}{s.petName ? ` · ${s.petName}` : ''}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stCfg.bg} ${stCfg.text}`}>{s.status}</span>
                  {isAdmin && s.status === 'Pending' && (
                    <button onClick={() => handleStatusChange(s.id, 'Confirmed')}
                      className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors" title="Confirm">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View toggle + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['calendar','list'] as const).map(v => (
            <button key={v} onClick={() => { setActiveView(v); setSelectedDay(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all capitalize ${activeView === v ? 'bg-white text-[#2B5EA6] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'calendar' ? <><Calendar className="w-3.5 h-3.5 inline mr-1" />Calendar</> : <><Filter className="w-3.5 h-3.5 inline mr-1" />List</>}
            </button>
          ))}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white outline-none">
          <option value="all">All Types</option>
          {(Object.keys(TYPE_CONFIG) as ScheduleType[]).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white outline-none">
          <option value="all">All Status</option>
          {(['Pending','Confirmed','Completed','Cancelled']).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {selectedDay && (
          <button onClick={() => setSelectedDay(null)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold">
            <X className="w-3 h-3" /> {fmtDate(selectedDay)}
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setShowUnavailableModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 ml-auto">
            <Ban className="w-3.5 h-3.5" />Mark Unavailable
          </button>
        )}
      </div>

      {/* Calendar */}
      {activeView === 'calendar' && (
        <CalendarView
          schedules={filteredSchedules}
          onDayClick={(date) => { setSelectedDay(date); setActiveView('list'); }}
          isAdmin={isAdmin}
        />
      )}

      {/* List */}
      {activeView === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-bold text-gray-800">
              {selectedDay ? `Schedules — ${fmtDate(selectedDay)}` : 'All Schedules'}
              <span className="ml-2 text-sm font-normal text-gray-400">({filteredSchedules.length})</span>
            </p>
          </div>
          {filteredSchedules.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No schedules found</p>
              {isNonAdmin && <button onClick={() => setShowRequestModal(true)} className="mt-3 px-4 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85]">Request a Schedule</button>}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredSchedules
                .sort((a,b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot))
                .map(s => {
                  const cfg = TYPE_CONFIG[s.type];
                  const stCfg = STATUS_CONFIG[s.status];
                  const d = new Date(s.date + 'T00:00:00');
                  return (
                    <div key={s.id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Date badge */}
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm ${cfg.bg} ${cfg.color}`}>
                          <p className="text-[9px] font-bold uppercase opacity-80">{MONTHS[d.getMonth()].slice(0,3)}</p>
                          <p className="text-2xl font-black leading-tight">{d.getDate()}</p>
                          <p className="text-[9px] font-semibold uppercase opacity-70">{d.toLocaleDateString('en',{weekday:'short'})}</p>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${cfg.bg} ${cfg.color}`}>
                              {cfg.icon}{cfg.label}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${stCfg.bg} ${stCfg.text}`}>{s.status}</span>
                            {s.isAdminCreated && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500">Official</span>}
                          </div>
                          <p className="font-bold text-gray-900 text-sm mb-0.5">{s.title}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt12(s.timeSlot)}</span>
                            {s.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.venue}</span>}
                            {s.barangay && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.barangay}</span>}
                            {s.requestedByName && isAdmin && <span className="flex items-center gap-1"><User className="w-3 h-3" />{s.requestedByName}</span>}
                            {s.petName && <span className="flex items-center gap-1">🐾 {s.petName}</span>}
                          </div>
                          {s.notes && <p className="text-xs text-gray-400 mt-1 italic">{s.notes}</p>}
                        </div>

                        {/* Admin actions */}
                        {isAdmin && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {s.status === 'Pending' && (
                              <button onClick={() => handleStatusChange(s.id, 'Confirmed')}
                                className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 flex items-center gap-1">
                                <Check className="w-3 h-3" />Confirm
                              </button>
                            )}
                            {(s.status === 'Confirmed' || s.status === 'Pending') && (
                              <button onClick={() => handleStatusChange(s.id, 'Completed')}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />Done
                              </button>
                            )}
                            {s.status !== 'Cancelled' && s.status !== 'Completed' && (
                              <button onClick={() => handleStatusChange(s.id, 'Cancelled')}
                                className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100 flex items-center gap-1">
                                <X className="w-3 h-3" />Cancel
                              </button>
                            )}
                          </div>
                        )}
                        {/* Non-admin cancel own pending */}
                        {isNonAdmin && s.status === 'Pending' && s.requestedBy === (user.ownerId || user.email) && (
                          <button onClick={() => handleStatusChange(s.id, 'Cancelled')}
                            className="shrink-0 px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100 flex items-center gap-1">
                            <X className="w-3 h-3" />Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Unavailable blocks (user's own or all for admin) */}
      {unavailableBlocks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Ban className="w-4 h-4 text-gray-500" />
            <p className="font-bold text-gray-800 text-sm">Marked Unavailable</p>
          </div>
          <div className="divide-y divide-gray-50">
            {unavailableBlocks
              .filter(b => isAdmin || b.userId === (user.ownerId || user.email))
              .map(b => (
                <div key={b.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{fmtDate(b.date)}</p>
                    <p className="text-xs text-gray-500">{fmt12(b.timeStart)} – {fmt12(b.timeEnd)}{b.reason ? ` · ${b.reason}` : ''}</p>
                    {isAdmin && <p className="text-xs text-gray-400">{b.userName}</p>}
                  </div>
                  <button onClick={() => handleDeleteUnavail(b.id)}
                    className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showRequestModal && (
        <RequestScheduleModal
          user={user}
          existingSchedules={schedules}
          unavailableBlocks={unavailableBlocks}
          onClose={() => setShowRequestModal(false)}
          onSave={handleAddSchedule}
        />
      )}
      {showUnavailableModal && (
        <MarkUnavailableModal
          user={user}
          onClose={() => setShowUnavailableModal(false)}
          onSave={(block) => {
            const id = `UNAVAIL-${Date.now()}`;
            setUnavailableBlocks(prev => [...prev, { ...block, id }]);
          }}
        />
      )}
      {showAdminAddModal && (
        <AddAdminScheduleModal
          onClose={() => setShowAdminAddModal(false)}
          onSave={handleAddSchedule}
        />
      )}
    </div>
  );
}

export default ScheduleModule;
