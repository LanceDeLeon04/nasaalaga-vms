import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, X, CheckCircle, AlertCircle, Scissors,
  Syringe, Stethoscope, AlertTriangle, ChevronLeft, ChevronRight,
  MapPin, User, Ban, Check, Eye, Bell, Filter, Users
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
  visibility?: 'public' | 'barangay' | 'staff';
  rsvpCount?: number;
  myRsvp?: { status: string; animals: { id: string; name: string }[]; headCount: number };
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

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getOneWeekMax() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return ymdLocal(d);
}

function getTodayStr() {
  return ymdLocal(new Date());
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
    visibility: row.visibility || undefined,
    rsvpCount: Number(row.rsvp_count || 0),
    myRsvp: row.my_rsvp ? { status: row.my_rsvp.status, animals: row.my_rsvp.animals || [], headCount: Number(row.my_rsvp.head_count || 0) } : undefined,
  };
}

function mapBlock(row: any): UnavailableBlock {
  return {
    id: String(row.id),
    userId: row.user_id ?? row.userId ?? '',
    userName: row.user_name ?? row.userName ?? '',
    date: row.date ? String(row.date).split('T')[0] : '',
    timeStart: String(row.time_start ?? row.timeStart ?? '').replace(/\s*(AM|PM)$/i, ''),
    timeEnd: String(row.time_end ?? row.timeEnd ?? '').replace(/\s*(AM|PM)$/i, ''),
    reason: row.reason ?? undefined,
  };
}

// ─── REQUEST FORM MODAL ───────────────────────────────────────────────────────
// Personal appointment. Slot availability comes from the server (it counts everyone's bookings and
// the vets' blocked times), and the server re-checks on submit, so the picker can never lie.

interface OwnedAnimal { id: string; label: string; group: 'pet' | 'livestock' }

interface SlotInfo { slot: string; taken: number; capacity: number; blocked: boolean; past: boolean; available: boolean }

function RequestScheduleModal({
  animals, onClose, onSave,
}: {
  animals: OwnedAnimal[];
  onClose: () => void;
  onSave: (entry: { type: ScheduleType; date: string; timeSlot: string; petId: string; notes: string }) => Promise<boolean>;
}) {
  const [form, setForm] = useState({ type: 'Checkup' as ScheduleType, date: '', timeSlot: '', petId: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsFailed, setSlotsFailed] = useState(false);

  const todayStr = getTodayStr();
  const maxDate = getOneWeekMax();
  const hasPets = animals.some(a => a.group === 'pet');
  // Spay/Neuter is a pet service; livestock can be vaccinated or checked up.
  const choices = animals.filter(a => form.type !== 'Spay/Neuter' || a.group === 'pet');
  const types = (['Vaccination', 'Checkup', 'Spay/Neuter'] as ScheduleType[]).filter(t => t !== 'Spay/Neuter' || hasPets);

  const loadSlots = async (date: string) => {
    setLoadingSlots(true); setSlotsFailed(false);
    try { const d = await api.getAppointmentSlots(date); setSlots(d.slots || []); }
    catch { setSlots([]); setSlotsFailed(true); }
    finally { setLoadingSlots(false); }
  };

  const pickDate = (date: string) => {
    setForm(f => ({ ...f, date, timeSlot: '' }));
    if (date) loadSlots(date); else setSlots([]);
  };

  const anyOpen = slots.some(s => s.available);

  const handleSubmit = async () => {
    if (!form.date || !form.timeSlot) { toast.error('Please select date and time'); return; }
    if (!form.petId) { toast.error('Please choose which animal this is for'); return; }
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
    else if (form.date) loadSlots(form.date);   // slot may have just been taken — refresh the picker
  };

  const input = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6] focus:ring-2 focus:ring-[#2B5EA6]/10';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#2B5EA6] to-[#60A85C] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white" />
            <p className="font-bold text-white">Book an Appointment</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Service Type</label>
            <div className={`grid gap-2 ${types.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {types.map(t => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, petId: '' }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-bold ${
                      form.type === t ? `border-current ${cfg.bg} ${cfg.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {cfg.icon}{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="appt-animal" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">For which animal? *</label>
            <select id="appt-animal" value={form.petId} onChange={e => setForm(f => ({ ...f, petId: e.target.value }))} className={input}>
              <option value="">Select a registered animal</option>
              {hasPets && choices.some(a => a.group === 'pet') && (
                <optgroup label="Pets">{choices.filter(a => a.group === 'pet').map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>
              )}
              {choices.some(a => a.group === 'livestock') && (
                <optgroup label="Livestock">{choices.filter(a => a.group === 'livestock').map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>
              )}
            </select>
            {choices.length === 0 && <p className="mt-1.5 text-xs text-red-600">No registered animals available for this service. Register one first.</p>}
          </div>

          <div>
            <label htmlFor="appt-date" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
              Date * <span className="text-gray-400 font-normal normal-case">(up to 1 week ahead)</span>
            </label>
            <input id="appt-date" type="date" min={todayStr} max={maxDate} value={form.date} onChange={e => pickDate(e.target.value)} className={input} />
          </div>

          {form.date && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                Time Slot * <span className="text-gray-400 font-normal normal-case">(15-min slots, {slots[0]?.capacity ?? 2} per slot)</span>
              </label>
              {loadingSlots ? (
                <p className="text-sm text-gray-400 py-3">Checking availability…</p>
              ) : slotsFailed ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                  Could not load availability. <button type="button" onClick={() => loadSlots(form.date)} className="font-bold underline">Try again</button>
                </div>
              ) : !anyOpen ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                  No available slots on this date. Please choose another date.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto" role="group" aria-label="Available time slots">
                  {slots.map(s => {
                    const selected = form.timeSlot === s.slot;
                    return (
                      <button key={s.slot} type="button" disabled={!s.available} aria-pressed={selected}
                        onClick={() => setForm(f => ({ ...f, timeSlot: s.slot }))}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selected ? 'bg-[#2B5EA6] text-white' :
                          !s.available ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through' :
                          s.taken > 0 ? 'bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100' :
                          'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-[#2B5EA6]/30'
                        }`}>
                        {fmt12(s.slot)}
                        {s.taken > 0 && s.available && <span className="block text-[9px] text-yellow-600">{s.taken}/{s.capacity}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="appt-notes" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea id="appt-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className={`${input} resize-none`} placeholder="Any concerns or notes…" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving || !form.date || !form.timeSlot || !form.petId}
              className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? 'Submitting…' : <><Calendar className="w-4 h-4" />Submit Request</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RSVP MODAL ───────────────────────────────────────────────────────────────

function RsvpModal({ schedule, animals, onClose, onSubmit, onCancelRsvp }: {
  schedule: ScheduleEntry;
  animals: OwnedAnimal[];
  onClose: () => void;
  onSubmit: (animalIds: string[]) => Promise<boolean>;
  onCancelRsvp: () => Promise<boolean>;
}) {
  const going = schedule.myRsvp?.status === 'Going';
  const [selected, setSelected] = useState<string[]>(going ? (schedule.myRsvp?.animals || []).map(a => a.id) : []);
  const [busy, setBusy] = useState(false);
  const left = schedule.capacity ? Math.max(0, schedule.capacity - (schedule.rsvpCount || 0) + (going ? (schedule.myRsvp?.headCount || 0) : 0)) : null;
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const groups: ['pet' | 'livestock', string][] = [['pet', 'Pets'], ['livestock', 'Livestock']];

  const submit = async () => { setBusy(true); const ok = await onSubmit(selected); setBusy(false); if (ok) onClose(); };
  const cancel = async () => { setBusy(true); const ok = await onCancelRsvp(); setBusy(false); if (ok) onClose(); };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#2B5EA6] to-[#60A85C] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3"><Users className="w-5 h-5 text-white" /><p className="font-bold text-white">{going ? 'Your RSVP' : 'RSVP'}</p></div>
          <button onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="font-bold text-gray-900">{schedule.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{fmtDate(schedule.date)} · {fmt12(schedule.timeSlot)}{schedule.venue ? ` · ${schedule.venue}` : ''}{schedule.barangay ? ` · ${schedule.barangay}` : ' · City-wide'}</p>
            {left !== null && <p className={`text-xs font-semibold mt-1 ${left === 0 ? 'text-red-600' : 'text-gray-500'}`}>{left === 0 ? 'Full' : `${left} place${left === 1 ? '' : 's'} left`}</p>}
          </div>

          <div>
            <p className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Which animals are you bringing? *</p>
            {animals.length === 0 ? (
              <p className="text-sm text-gray-500">You have no registered animals yet.</p>
            ) : groups.map(([g, label]) => {
              const list = animals.filter(a => a.group === g);
              if (!list.length) return null;
              return (
                <fieldset key={g} className="mb-3">
                  <legend className="text-xs font-semibold text-gray-400 mb-1.5">{label}</legend>
                  <div className="space-y-1.5">
                    {list.map(a => (
                      <label key={a.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer min-h-[44px] ${selected.includes(a.id) ? 'border-[#2B5EA6] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} className="h-4 w-4 accent-[#2B5EA6]" />
                        <span className="font-medium text-gray-800">{a.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            {going
              ? <button type="button" onClick={cancel} disabled={busy} className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-40">Cancel RSVP</button>
              : <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Close</button>}
            <button type="button" onClick={submit} disabled={busy || selected.length === 0}
              className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] disabled:opacity-40">
              {busy ? 'Saving…' : going ? 'Update RSVP' : 'Confirm RSVP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ATTENDEES MODAL (staff) ──────────────────────────────────────────────────

function AttendeesModal({ schedule, onClose }: { schedule: ScheduleEntry; onClose: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api.getScheduleRsvps(schedule.id).then((d: any) => setRows(d.rsvps || [])).catch(() => setFailed(true));
  }, [schedule.id]);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-4 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3"><Users className="w-5 h-5 text-white" /><p className="font-bold text-white">RSVPs · {schedule.title}</p></div>
          <button onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          {failed ? <p className="text-sm text-red-600">Could not load the RSVP list.</p>
            : rows === null ? <p className="text-sm text-gray-400">Loading…</p>
            : rows.length === 0 ? <p className="text-sm text-gray-500">No RSVPs yet.</p>
            : <ul className="divide-y divide-gray-100">{rows.map((r, i) => (
                <li key={i} className="py-2.5">
                  <p className="text-sm font-semibold text-gray-800">{r.user_name || 'Owner'}{r.barangay ? <span className="font-normal text-gray-400"> · {r.barangay}</span> : null}</p>
                  <p className="text-xs text-gray-500">{(r.animals || []).map((a: any) => a.name).join(', ')}</p>
                </li>))}</ul>}
        </div>
      </div>
    </div>
  );
}

// ─── MARK UNAVAILABLE MODAL (vets only) ───────────────────────────────────────

function MarkUnavailableModal({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (block: { date: string; timeStart: string; timeEnd: string; reason: string }) => Promise<boolean>;
}) {
  const [form, setForm] = useState({ date: '', timeStart: '07:00', timeEnd: '17:00', reason: '' });
  const [saving, setSaving] = useState(false);
  const maxDate = getOneWeekMax();

  const handleSave = async () => {
    if (!form.date) { toast.error('Please select a date'); return; }
    if (form.timeStart >= form.timeEnd) { toast.error('End time must be after start time'); return; }
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><Ban className="w-5 h-5 text-white" /><p className="font-bold text-white">Block Date / Time</p></div>
          <button onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">Mark a time when the veterinary office cannot take appointments. Owners will see those slots as unavailable.</p>
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
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-gray-700 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center gap-2">
              <Ban className="w-4 h-4" />{saving ? 'Saving…' : 'Block'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADD ADMIN SCHEDULE MODAL ─────────────────────────────────────────────────

function AddAdminScheduleModal({ user, onClose, onSave }: {
  user: UserType;
  onClose: () => void;
  onSave: (entry: Omit<ScheduleEntry, 'id'>) => Promise<boolean>;
}) {
  const isBahw = user.role === 'bahw';
  const CALACA_BARANGAYS = ['Baclas','Bagong Tubig','Balimbing','Bambang','Bisaya','Cahil','Calantas','Caluangan','Camastilisan','Coral Ni Bacal','Coral Ni Lopez','Dacanlao','Dila','Loma','Lumbang Calzada','Lumbang Na Bata','Lumbang Na Matanda','Madalunot','Makina','Matipok','Munting Coral','Niyugan','Pantay','Poblacion 1','Poblacion 2','Poblacion 3','Poblacion 4','Poblacion 5','Poblacion 6','Puting Bato East','Puting Bato West','Quisumbing','Salong','San Rafael','Sinisian','Taklang Anak','Talisay','Tamayo','Timbain'];

  const [form, setForm] = useState({
    type: 'Vaccination' as ScheduleType,
    title: '',
    date: '',
    timeSlot: '08:00',
    barangay: isBahw ? (user.barangay || '') : '',
    visibility: '' as '' | 'public' | 'barangay' | 'staff',
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
      headers: { 'Authorization': 'Bearer ' + (sessionStorage.getItem('nasaalaga_token') || '') }
    })
      .then(r => r.json())
      .then(d => setNotifyCount((d.users || []).length))
      .catch(() => setNotifyCount(null))
      .finally(() => setLoadingCount(false));
  }, [form.barangay]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.date) { toast.error('Date is required'); return; }
    const visibility = form.visibility || (['Intervention', 'Outbreak'].includes(form.type) ? 'staff' : form.barangay ? 'barangay' : 'public');
    if (visibility === 'barangay' && !form.barangay) { toast.error('Choose a barangay for a barangay-only schedule'); return; }
    const ok = await onSave({
      visibility,
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
      requestedByName: user.username || 'Admin',
    });
    if (ok) onClose();
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
              <select value={form.barangay} disabled={isBahw} onChange={e => setForm(f => ({...f, barangay: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6] disabled:bg-gray-50">
                {!isBahw && <option value="">All / City-wide</option>}
                {(isBahw ? [user.barangay || ''] : CALACA_BARANGAYS).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm(f => ({...f, capacity: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Who can see this?</label>
            <select value={form.visibility} onChange={e => setForm(f => ({...f, visibility: e.target.value as any}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2B5EA6]">
              <option value="">Automatic ({['Intervention', 'Outbreak'].includes(form.type) ? 'staff only' : form.barangay ? 'residents of the barangay' : 'public, everyone'})</option>
              <option value="public">Public — all owners (city-wide)</option>
              <option value="barangay">Barangay — only residents of the selected barangay</option>
              <option value="staff">Staff only — hidden from owners</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Owners can RSVP to public and barangay schedules. Interventions and outbreaks default to staff only.</p>
          </div>
          {/* Notify preview */}
          {form.barangay && form.visibility !== 'staff' && !['Intervention', 'Outbreak'].includes(form.type) && (
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
  // isAdmin = anyone on the staff side. isVet = the veterinary office (only they may block dates).
  const isAdmin = ['admin','superadmin','bahw','cvoStaff'].includes(user.role || '');
  const isVet = ['admin','superadmin','cvoStaff'].includes(user.role || '');
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
  const [scope, setScope] = useState<'all' | 'mine' | 'events'>('all');
  const [animals, setAnimals] = useState<OwnedAnimal[]>([]);
  const [rsvpFor, setRsvpFor] = useState<ScheduleEntry | null>(null);
  const [attendeesFor, setAttendeesFor] = useState<ScheduleEntry | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // ── Fetch from DB ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSchedules(); fetchNotifications();
    if (isVet) fetchUnavailableBlocks();     // owners never receive block details — they just see slots as unavailable
    if (isNonAdmin) fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    if (!user.ownerId) return;
    const a: any = api;
    const [p, l] = await Promise.allSettled([a.getPets(user.ownerId), a.getLivestock({ ownerId: user.ownerId })]);
    const out: OwnedAnimal[] = [];
    if (p.status === 'fulfilled') {
      for (const x of (p.value?.pets || [])) {
        if (x.is_archived || /decease|dead/i.test(String(x.status || ''))) continue;
        out.push({ id: String(x.id), label: `${x.pet_name ?? x.petName ?? 'Pet'} (${x.species ?? 'Pet'})`, group: 'pet' });
      }
    }
    if (l.status === 'fulfilled') {
      for (const x of (l.value?.livestock || [])) {
        if (String(x.health_status ?? '') === 'Dead') continue;
        out.push({ id: String(x.id), label: `${x.animal_type ?? x.type ?? 'Livestock'} (${x.id})`, group: 'livestock' });
      }
    }
    setAnimals(out);
  };

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
      setUnavailableBlocks((data.blocks || []).map(mapBlock));
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

  // Owners see exactly two things (the server already enforces this; this is a second line of defence):
  //   1. their own personal appointments, and
  //   2. public / their-barangay official schedules (never staff-only ones, never other barangays').
  const isMine = (s: ScheduleEntry) => !s.isAdminCreated && !!s.requestedBy && [user.ownerId, user.email, user.id].filter(Boolean).includes(s.requestedBy);
  const isOpenEvent = (s: ScheduleEntry) =>
    !!s.isAdminCreated && s.visibility !== 'staff' && !['Intervention', 'Outbreak'].includes(s.type) &&
    (!s.barangay || s.barangay.toLowerCase() === (user.barangay || '').toLowerCase());
  const visibleSchedules = isAdmin ? schedules : schedules.filter(s => isMine(s) || isOpenEvent(s));
  const canRsvp = (s: ScheduleEntry) =>
    isNonAdmin && isOpenEvent(s) && ['Confirmed', 'Scheduled'].includes(s.status) && s.date >= getTodayStr();

  const filteredSchedules = visibleSchedules.filter(s =>
    (isAdmin || scope === 'all' || (scope === 'mine' ? isMine(s) : !isMine(s))) &&
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

  // Staff: create an official schedule / drive. No optimistic "fake save" — if the server refuses, say so.
  const handleAddSchedule = async (entry: Omit<ScheduleEntry, 'id'>): Promise<boolean> => {
    try {
      const data = await api.createAppointmentSchedule({
        scheduleType: entry.type, title: entry.title, date: entry.date, timeSlot: entry.timeSlot, status: entry.status,
        requestedByName: entry.requestedByName, notes: entry.notes, barangay: entry.barangay, venue: entry.venue,
        capacity: entry.capacity, visibility: entry.visibility, linkedRecordId: entry.linkedRecordId,
      });
      setSchedules(prev => [...prev, mapDbSchedule(data.schedule || data)]);
      toast.success(data.notifiedBarangay ? `📣 Residents of ${data.notifiedBarangay} have been notified` : 'Schedule added');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the schedule');
      return false;
    }
  };

  // Owner: personal appointment. The server owns the rules (window, slot capacity, vet blocks, ownership of the animal).
  const handleRequest = async (r: { type: ScheduleType; date: string; timeSlot: string; petId: string; notes: string }): Promise<boolean> => {
    try {
      const data = await api.createAppointmentSchedule({ scheduleType: r.type, date: r.date, timeSlot: r.timeSlot, petId: r.petId, notes: r.notes });
      setSchedules(prev => [...prev, mapDbSchedule(data.schedule || data)]);
      toast.success('Appointment requested. You will be notified once it is confirmed.');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Could not book that appointment');
      return false;
    }
  };

  const applyRsvp = (id: string, rsvp: ScheduleEntry['myRsvp'] | undefined, count: number) =>
    setSchedules(prev => prev.map(x => x.id === id ? { ...x, myRsvp: rsvp, rsvpCount: count } : x));

  const handleRsvp = async (s: ScheduleEntry, animalIds: string[]): Promise<boolean> => {
    try {
      const d: any = await api.rsvpSchedule(s.id, animalIds);
      applyRsvp(s.id, { status: d.rsvp.status, animals: d.rsvp.animals || [], headCount: Number(d.rsvp.head_count || animalIds.length) }, Number(d.rsvpCount || 0));
      toast.success("You're on the list! See you there.");
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Could not save your RSVP');
      return false;
    }
  };

  const handleCancelRsvp = async (s: ScheduleEntry): Promise<boolean> => {
    try {
      const d: any = await api.cancelRsvp(s.id);
      applyRsvp(s.id, undefined, Number(d.rsvpCount || 0));
      toast.success('RSVP cancelled');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Could not cancel your RSVP');
      return false;
    }
  };

  const handleStatusChange = async (id: string, status: ScheduleEntry['status']) => {
    const prev = schedules;
    setSchedules(p => p.map(s => s.id === id ? { ...s, status } : s));   // optimistic…
    try {
      // Owners can only cancel their own booking; staff may update either kind of schedule.
      await api.updateAppointmentSchedule(id, { status }).catch((e: any) => {
        if (id.startsWith('SCH-') && isAdmin) return api.updateSchedule(id, { status });   // legacy barangay drive
        throw e;
      });
      toast.success(`Schedule marked as ${status}`);
    } catch (e: any) {
      setSchedules(prev);                                                  // …and rolled back if the server said no
      toast.error(e?.message || 'Could not update the schedule');
    }
  };

  // Vets only
  const handleAddBlock = async (b: { date: string; timeStart: string; timeEnd: string; reason: string }): Promise<boolean> => {
    try {
      const d: any = await api.createUnavailableBlock(b);
      setUnavailableBlocks(prev => [...prev, mapBlock(d.block)]);
      toast.success('Time blocked. Owners can no longer book it.');
      return true;
    } catch (e: any) {
      toast.error(e?.message || 'Could not block that time');
      return false;
    }
  };

  const handleDeleteUnavail = async (id: string) => {
    try {
      await api.deleteUnavailableBlock(id);
      setUnavailableBlocks(prev => prev.filter(b => b.id !== id));
      toast.success('Block removed');
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove the block');
    }
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
                : 'Your appointments, plus public and barangay schedules you can RSVP to'}
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
              <button onClick={() => setShowRequestModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#2B5EA6] rounded-xl text-sm font-bold hover:bg-blue-50 transition-all shadow">
                <Plus className="w-4 h-4" />Book Appointment
              </button>
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
        {isNonAdmin && (
          <div role="group" aria-label="Show" className="flex bg-gray-100 rounded-xl p-1">
            {([['all', 'All'], ['mine', 'My appointments'], ['events', 'Drives & events']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setScope(v)} aria-pressed={scope === v}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${scope === v ? 'bg-white text-[#2B5EA6] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
            ))}
          </div>
        )}
        {isVet && (
          <button onClick={() => setShowUnavailableModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 ml-auto">
            <Ban className="w-3.5 h-3.5" />Block Date / Time
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
              {isNonAdmin && <button onClick={() => setShowRequestModal(true)} className="mt-3 px-4 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85]">Book an Appointment</button>}
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
                            {s.isAdminCreated && s.visibility === 'staff' && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-800 text-white">Staff only</span>}
                            {isNonAdmin && s.isAdminCreated && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700">{s.barangay ? `Your barangay` : 'Public'}</span>}
                            {isNonAdmin && isMine(s) && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-[#2B5EA6]">My appointment</span>}
                            {s.myRsvp?.status === 'Going' && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700">✓ Going</span>}
                          </div>
                          <p className="font-bold text-gray-900 text-sm mb-0.5">{s.title}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt12(s.timeSlot)}</span>
                            {s.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.venue}</span>}
                            {s.barangay && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.barangay}</span>}
                            {s.requestedByName && isAdmin && <span className="flex items-center gap-1"><User className="w-3 h-3" />{s.requestedByName}</span>}
                            {s.petName && <span className="flex items-center gap-1">🐾 {s.petName}</span>}
                          </div>
                          {s.isAdminCreated && s.capacity ? (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Users className="w-3 h-3" />{s.rsvpCount || 0} / {s.capacity} RSVP'd</p>
                          ) : null}
                          {s.myRsvp?.status === 'Going' && s.myRsvp.animals.length > 0 && (
                            <p className="text-xs text-green-700 mt-1">Bringing: {s.myRsvp.animals.map(a => a.name).join(', ')}</p>
                          )}
                          {s.notes && <p className="text-xs text-gray-400 mt-1 italic">{s.notes}</p>}
                        </div>

                        {/* Owner RSVP */}
                        {canRsvp(s) && (() => {
                          const full = !!s.capacity && (s.rsvpCount || 0) >= s.capacity && s.myRsvp?.status !== 'Going';
                          return (
                            <button onClick={() => setRsvpFor(s)} disabled={full}
                              className={`shrink-0 px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1 min-h-[36px] ${
                                s.myRsvp?.status === 'Going' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                full ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#2B5EA6] text-white hover:bg-[#234a85]'}`}>
                              <Users className="w-3.5 h-3.5" />{s.myRsvp?.status === 'Going' ? 'Edit RSVP' : full ? 'Full' : 'RSVP'}
                            </button>
                          );
                        })()}
                        {/* Staff: who is coming */}
                        {isAdmin && s.isAdminCreated && (
                          <button onClick={() => setAttendeesFor(s)}
                            className="shrink-0 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 flex items-center gap-1 self-start">
                            <Users className="w-3 h-3" />RSVPs{s.rsvpCount ? ` (${s.rsvpCount})` : ''}
                          </button>
                        )}

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
                        {isNonAdmin && isMine(s) && (s.status === 'Pending' || s.status === 'Confirmed') && (
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
      {isVet && unavailableBlocks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Ban className="w-4 h-4 text-gray-500" />
            <p className="font-bold text-gray-800 text-sm">Blocked Dates &amp; Times</p>
          </div>
          <div className="divide-y divide-gray-50">
            {unavailableBlocks
              .map(b => (
                <div key={b.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{fmtDate(b.date)}</p>
                    <p className="text-xs text-gray-500">{fmt12(b.timeStart)} – {fmt12(b.timeEnd)}{b.reason ? ` · ${b.reason}` : ''}</p>
                    <p className="text-xs text-gray-400">{b.userName}</p>
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
          animals={animals}
          onClose={() => setShowRequestModal(false)}
          onSave={handleRequest}
        />
      )}
      {showUnavailableModal && isVet && (
        <MarkUnavailableModal
          onClose={() => setShowUnavailableModal(false)}
          onSave={handleAddBlock}
        />
      )}
      {showAdminAddModal && isAdmin && (
        <AddAdminScheduleModal
          user={user}
          onClose={() => setShowAdminAddModal(false)}
          onSave={handleAddSchedule}
        />
      )}
      {rsvpFor && (
        <RsvpModal
          schedule={schedules.find(x => x.id === rsvpFor.id) || rsvpFor}
          animals={animals}
          onClose={() => setRsvpFor(null)}
          onSubmit={ids => handleRsvp(rsvpFor, ids)}
          onCancelRsvp={() => handleCancelRsvp(rsvpFor)}
        />
      )}
      {attendeesFor && <AttendeesModal schedule={attendeesFor} onClose={() => setAttendeesFor(null)} />}
    </div>
  );
}

export default ScheduleModule;
