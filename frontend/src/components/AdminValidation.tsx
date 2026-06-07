import { useState, useEffect } from 'react';
import {
  Search, CheckCircle, Clock, AlertTriangle,
  Camera, Tag, Eye, ChevronRight, User, PawPrint,
  CalendarClock, BadgeCheck, ArrowRight, Shield, XCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

// ── Zone → color prefix ──────────────────────────────────────────────────────
const BARANGAY_ZONE: Record<string, string> = {
  'Caluangan':'East','Coral Ni Bacal':'East','Dila':'East','Lumbang Na Bata':'East',
  'Lumbang Na Matanda':'East','Poblacion 1':'East','Poblacion 2':'East','Poblacion 3':'East',
  'Poblacion 4':'East','Poblacion 6':'East',
  'Bagong Tubig':'West','Cahil':'West','Calantas':'West','Coral Ni Lopez':'West',
  'Dacanlao':'West','Loma':'West','Makina':'West','Pantay':'West','Taklang Anak':'West','Timbain':'West',
  'Baclas':'North','Balimbing':'North','Bambang':'North','Bisaya':'North',
  'Madalunot':'North','Matipok':'North','Munting Coral':'North','Niyugan':'North','Tamayo':'North',
  'Camastilisan':'Baybay-Highway','Lumbang Calzada':'Baybay-Highway','Poblacion 5':'Baybay-Highway',
  'Puting Bato East':'Baybay-Highway','Puting Bato West':'Baybay-Highway','Quisumbing':'Baybay-Highway',
  'Salong':'Baybay-Highway','San Rafael':'Baybay-Highway','Sinisian':'Baybay-Highway','Talisay':'Baybay-Highway',
};
const ZONE_PREFIX: Record<string, string> = {
  East: 'BLU', West: 'PRP', North: 'GRY', 'Baybay-Highway': 'RED',
};
const ZONE_COLOR: Record<string, string> = {
  BLU: '#2B5EA6', PRP: '#8B5CF6', GRY: '#6B7280', RED: '#E85D3B',
};
const ZONE_LABEL: Record<string, string> = {
  BLU: 'East Zone', PRP: 'West Zone', GRY: 'North Zone', RED: 'Baybay-Highway Zone',
};

function getPrefix(barangay: string): string {
  const zone = BARANGAY_ZONE[barangay] || 'East';
  return ZONE_PREFIX[zone] || 'BLU';
}

// ── Types ────────────────────────────────────────────────────────────────────

interface PreReg {
  pre_reg_number: string;
  owner_id: string;
  pet_name: string;
  species: string;
  breed: string;
  age: string;
  color: string;
  gender: string;
  owner_name: string;
  contact_number: string;
  owner_email: string;
  barangay: string;
  address: string;
  photo: string;
  status: 'Pending' | 'Approved' | 'Denied';
  submitted_date: string;
  approved_date?: string;
  denied_date?: string;
  denial_reason?: string;
  pet_id?: string;
  pet_tag_id?: string;
  expires_at?: string;
}

interface AdminValidationProps {
  adminUserId: string;
}

type ValidationStep = 'list' | 'review' | 'photo' | 'tag' | 'done';

function getDaysLeft(expiry?: string) {
  if (!expiry) return 0;
  const diff = new Date(expiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isExpired(p: PreReg) {
  return !!p.expires_at && new Date(p.expires_at) < new Date();
}

export function AdminValidation({ adminUserId }: AdminValidationProps) {
  const [searchTerm, setSearchTerm]     = useState('');
  const [list, setList]                 = useState<PreReg[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<PreReg | null>(null);
  const [valStep, setValStep]           = useState<ValidationStep>('list');
  const [tagNumber, setTagNumber]       = useState('');
  const [tagError, setTagError]         = useState('');
  const [valPhoto, setValPhoto]         = useState('');
  const [notes, setNotes]               = useState('');
  const [denyMode, setDenyMode]         = useState(false);
  const [denyReason, setDenyReason]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [finalTagId, setFinalTagId]     = useState('');
  const [tabFilter, setTabFilter]       = useState<'Pending' | 'Approved' | 'Denied'>('Pending');

  useEffect(() => { fetchList(); }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await api.getPreRegistrations();
      setList(data.preRegistrations || []);
    } catch {
      toast.error('Failed to load pre-registrations');
    } finally {
      setLoading(false);
    }
  };

  // Derived
  const prefix = selected ? getPrefix(selected.barangay) : 'BLU';
  const numPadded = tagNumber.replace(/\D/g, '').padStart(5, '0');
  const previewTagId = tagNumber ? `${prefix}-0000-${numPadded}` : '';

  const filtered = list.filter(p => {
    if (p.status !== tabFilter) return false;
    const q = searchTerm.toLowerCase();
    return !q || [p.pet_name, p.owner_name, p.pre_reg_number, p.species]
      .some(f => f?.toLowerCase().includes(q));
  });

  const pendingCount  = list.filter(p => p.status === 'Pending').length;
  const approvedCount = list.filter(p => p.status === 'Approved').length;
  const deniedCount   = list.filter(p => p.status === 'Denied').length;

  const startValidation = (p: PreReg) => {
    setSelected(p);
    setValStep('review');
    setTagNumber('');
    setTagError('');
    setValPhoto('');
    setNotes('');
    setDenyMode(false);
    setDenyReason('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setValPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmTag = () => {
    const digits = tagNumber.replace(/\D/g, '');
    if (!digits) { setTagError('Tag number is required'); return; }
    if (digits.length > 5) { setTagError('Number too long (max 5 digits)'); return; }
    setTagError('');
    handleApprove();
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      // Send numeric portion only — backend always derives the full CLR-0000-NNNNN tag
      // from the owner's registered barangay zone to guarantee correct color prefix.
      const numericPart = tagNumber.replace(/\D/g, '');
      const res = await fetch(`/api/pets/validate/${selected.pre_reg_number}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token')}` },
        body: JSON.stringify({ action: 'approve', tagNumber: numericPart, photo: valPhoto || selected.photo, notes }),
      });
      if (!res.ok) throw new Error('Validation failed');
      const respData = await res.json();
      // Use the tag the backend actually assigned (correct prefix + CLR-0000-NNNNN format)
      const assignedTag = respData.petTagId || respData.pet?.pet_tag_id || previewTagId;
      setFinalTagId(assignedTag);
      setValStep('done');
      await fetchList();
      toast.success('Pet successfully validated and registered!');
    } catch {
      toast.error('Failed to validate pet. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeny = async () => {
    if (!selected || !denyReason.trim()) { toast.error('Please provide a denial reason'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pets/validate/${selected.pre_reg_number}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token')}` },
        body: JSON.stringify({ action: 'deny', denialReason: denyReason }),
      });
      if (!res.ok) throw new Error('Denial failed');
      toast.success('Pre-registration denied.');
      setValStep('list');
      setSelected(null);
      await fetchList();
    } catch {
      toast.error('Failed to deny pre-registration.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Done screen ──────────────────────────────────────────────────────────
  if (valStep === 'done' && selected) {
    const pfx = getPrefix(selected.barangay);
    const pfxColor = ZONE_COLOR[pfx] || '#2B5EA6';
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BadgeCheck className="w-9 h-9 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">Validation Complete!</h3>
          <p className="text-gray-600 mb-4">
            <strong>{selected.pet_name}</strong> has been successfully registered and tagged.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left mb-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Pet Tag ID:</span>
              <span className="font-mono font-bold text-lg px-3 py-0.5 rounded-lg text-white"
                style={{ background: pfxColor }}>{finalTagId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Zone:</span>
              <span className="font-medium">{ZONE_LABEL[pfx]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Barangay:</span>
              <span className="font-medium">{selected.barangay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Owner:</span>
              <span className="font-medium">{selected.owner_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium">{new Date().toLocaleDateString('en-PH')}</span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 mb-4">
            ✓ Pet moved to Registered Pets database and linked to owner's account.
          </div>
          <button
            onClick={() => { setValStep('list'); setSelected(null); }}
            className="w-full py-3 bg-[#2B5EA6] text-white rounded-xl font-semibold hover:bg-[#234a85] transition-colors"
          >
            Validate Another Pet
          </button>
        </div>
      </div>
    );
  }

  // ── Validation steps ─────────────────────────────────────────────────────
  if (valStep !== 'list' && selected) {
    const pfx = getPrefix(selected.barangay);
    const pfxColor = ZONE_COLOR[pfx] || '#2B5EA6';
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => { setValStep('list'); setSelected(null); setDenyMode(false); }}
              className="text-sm text-[#2B5EA6] hover:underline">← Back to List</button>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-600">
              {denyMode ? 'Denying: ' : 'Validating: '}<strong>{selected.pet_name}</strong> ({selected.pre_reg_number})
            </span>
          </div>
          {!denyMode && (
            <div className="flex items-center gap-1">
              {[{ key: 'review', label: '1. Review' }, { key: 'photo', label: '2. Photo' }, { key: 'tag', label: '3. Tag' }].map((s, i) => (
                <div key={s.key} className="flex items-center gap-1 flex-1">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    valStep === s.key ? 'bg-[#2B5EA6] text-white' :
                    ['review','photo','tag'].indexOf(valStep) > i ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-400'
                  }`}>{s.label}</div>
                  {i < 2 && <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deny mode */}
        {denyMode && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-red-700 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Deny Pre-Registration
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
              You are about to deny <strong>{selected.pet_name}</strong>'s pre-registration. Please provide a clear reason.
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Denial *</label>
              <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} rows={4}
                placeholder="e.g. Incomplete details, invalid information, owner not present..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDenyMode(false)} className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-50">← Cancel</button>
              <button onClick={handleDeny} disabled={submitting || !denyReason.trim()}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? 'Denying…' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        )}

        {/* STEP: Review */}
        {!denyMode && valStep === 'review' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#2B5EA6]" /> Verify Pre-Registration Details
            </h3>
            <div className="flex items-center gap-2 p-3 rounded-xl border"
              style={{ borderColor: pfxColor, background: `${pfxColor}10` }}>
              <Shield className="w-4 h-4" style={{ color: pfxColor }} />
              <span className="text-sm font-semibold" style={{ color: pfxColor }}>
                {ZONE_LABEL[pfx]} — tags will be prefixed <strong>{pfx}-</strong>
              </span>
            </div>
            {isExpired(selected) && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                This pre-registration has <strong>expired</strong>. You may still validate, but advise the owner.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Pet Details</p>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-gray-500">Name:</span> <strong>{selected.pet_name}</strong></p>
                  <p><span className="text-gray-500">Species:</span> {selected.species}</p>
                  <p><span className="text-gray-500">Breed:</span> {selected.breed || '—'}</p>
                  <p><span className="text-gray-500">Color:</span> {selected.color || '—'}</p>
                  <p><span className="text-gray-500">Gender:</span> {selected.gender}</p>
                  <p><span className="text-gray-500">Age:</span> {selected.age || '—'}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Owner Details</p>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-gray-500">Name:</span> <strong>{selected.owner_name}</strong></p>
                  <p><span className="text-gray-500">Contact:</span> {selected.contact_number}</p>
                  <p><span className="text-gray-500">Email:</span> {selected.owner_email || '—'}</p>
                  <p><span className="text-gray-500">Barangay:</span> {selected.barangay}</p>
                  <p><span className="text-gray-500">Address:</span> {selected.address}</p>
                </div>
              </div>
            </div>
            {selected.photo && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Submitted Photo</p>
                <img src={selected.photo} alt="Pet" className="w-full max-h-48 object-cover rounded-xl" />
              </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Confirm that the owner and pet are physically present before proceeding.
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Validation Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any observations or remarks..." rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] resize-none text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDenyMode(true)}
                className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold hover:bg-red-100 transition-colors">
                Deny
              </button>
              <button onClick={() => setValStep('photo')}
                className="flex-1 py-3 bg-[#2B5EA6] text-white rounded-xl font-semibold hover:bg-[#234a85] transition-colors flex items-center justify-center gap-2">
                Details Verified — Proceed to Photo <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP: Photo */}
        {!denyMode && valStep === 'photo' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#2B5EA6]" /> Capture Pet Photo
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
              Please take a current photo of the pet during the CVO visit. This will be the official photo on record.
            </div>
            <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-[#2B5EA6] hover:bg-blue-50"
              onClick={() => document.getElementById('val-photo-input')?.click()}>
              <input id="val-photo-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoChange} />
              {valPhoto ? (
                <img src={valPhoto} alt="Pet" className="w-full max-h-48 object-cover rounded-xl mx-auto" />
              ) : (
                <div className="space-y-2 text-gray-400">
                  <Camera className="w-12 h-12 mx-auto" />
                  <p className="font-semibold">Click to Capture or Upload Photo</p>
                  <p className="text-xs">Take a clear photo of the pet for the registry</p>
                </div>
              )}
            </div>
            {!valPhoto && selected.photo && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Or use submitted photo:</p>
                <img src={selected.photo} alt="Submitted" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', opacity: 0.85 }}
                  onClick={() => setValPhoto(selected.photo)} />
              </div>
            )}
            <button onClick={() => setValStep('tag')}
              className="w-full py-3 bg-[#2B5EA6] text-white rounded-xl font-semibold hover:bg-[#234a85] transition-colors flex items-center justify-center gap-2">
              {valPhoto ? 'Photo Done —' : 'Skip Photo —'} Assign Pet Tag <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP: Tag */}
        {!denyMode && valStep === 'tag' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#2B5EA6]" /> Assign Pet Tag ID
            </h3>
            <div className="flex items-center gap-3 p-4 rounded-xl border"
              style={{ borderColor: pfxColor, background: `${pfxColor}10` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ background: pfxColor }}>{pfx}</div>
              <div>
                <p className="font-bold text-sm" style={{ color: pfxColor }}>{ZONE_LABEL[pfx]}</p>
                <p className="text-xs text-gray-500">
                  All pets from <strong>{selected.barangay}</strong> will be tagged <strong>{pfx}-0000-NNNNN</strong>.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tag Number <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-400 ml-2">(5-digit number — tag will be auto-formatted as {prefix}-0000-NNNNN)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-3 rounded-xl font-mono font-black text-white text-lg flex-shrink-0"
                  style={{ background: pfxColor }}>{pfx}-</span>
                <input type="text" inputMode="numeric" value={tagNumber}
                  onChange={e => { setTagNumber(e.target.value.replace(/\D/g, '').slice(0,5)); setTagError(''); }}
                  placeholder="00001"
                  className={`flex-1 px-4 py-3 border rounded-xl font-mono text-xl focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] ${tagError ? 'border-red-400' : 'border-gray-300'}`} />
              </div>
              {tagError && <p className="text-red-500 text-xs mt-1">{tagError}</p>}
              {previewTagId && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <span className="font-mono font-black text-white px-3 py-1 rounded-lg text-sm"
                    style={{ background: pfxColor }}>{previewTagId}</span>
                </div>
              )}
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              <p className="font-semibold mb-1">Upon saving:</p>
              <ul className="space-y-1">
                <li>✓ Tag <strong>{previewTagId || `${pfx}-XXXX`}</strong> will be stored in the database</li>
                <li>✓ Pet record will be moved from Pre-Registered to Registered</li>
                <li>✓ Pet will be linked to the owner's account automatically</li>
                <li>✓ Owner will be notified via email</li>
              </ul>
            </div>
            <button onClick={handleConfirmTag} disabled={submitting}
              className="w-full py-3 bg-[#60A85C] text-white rounded-xl font-semibold hover:bg-[#4a8a47] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {submitting ? 'Saving…' : <><CheckCircle className="w-5 h-5" /> Confirm & Save Registration</>}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Main list ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-gray-800 font-bold text-xl mb-1">Pre-Registration Validation</h2>
          <p className="text-gray-600 text-sm">Review and validate pre-registered pets submitted by the public</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1">
            <Clock className="w-4 h-4" /> {pendingCount} Pending
          </div>
          <button onClick={fetchList} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Zone legend */}
      <div className="bg-white rounded-xl shadow p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Zone Color Coding</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(ZONE_LABEL).map(([pfx, label]) => (
            <div key={pfx} className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ borderColor: ZONE_COLOR[pfx], background: `${ZONE_COLOR[pfx]}10` }}>
              <span className="w-8 h-6 rounded text-white text-xs font-black flex items-center justify-center flex-shrink-0"
                style={{ background: ZONE_COLOR[pfx] }}>{pfx}</span>
              <span className="text-xs font-semibold text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + search */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {(['Pending','Approved','Denied'] as const).map(tab => {
            const count = tab === 'Pending' ? pendingCount : tab === 'Approved' ? approvedCount : deniedCount;
            return (
              <button key={tab} onClick={() => setTabFilter(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                  tabFilter === tab
                    ? tab === 'Pending' ? 'bg-amber-500 border-amber-500 text-white' :
                      tab === 'Approved' ? 'bg-green-600 border-green-600 text-white' :
                      'bg-red-600 border-red-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {tab}
                {count > 0 && <span className="ml-1.5 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by owner, pet name, or Pre-Reg ID..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] text-sm" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Loading pre-registrations…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-medium">No {tabFilter.toLowerCase()} pre-registrations</p>
          <p className="text-sm">
            {tabFilter === 'Pending' ? 'All pre-registrations have been validated.' : `No ${tabFilter.toLowerCase()} records found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const daysLeft = getDaysLeft(p.expires_at);
            const isUrgent = daysLeft <= 3 && p.status === 'Pending';
            const pfx = getPrefix(p.barangay);
            const pfxColor = ZONE_COLOR[pfx] || '#2B5EA6';
            return (
              <div key={p.pre_reg_number}
                className={`bg-white rounded-xl shadow p-5 border-l-4 ${
                  p.status === 'Approved' ? 'border-green-400' :
                  p.status === 'Denied' ? 'border-red-400' :
                  isUrgent ? 'border-red-400' : 'border-amber-400'
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      p.status === 'Approved' ? 'bg-green-100' :
                      p.status === 'Denied' ? 'bg-red-100' :
                      isUrgent ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <PawPrint className={`w-5 h-5 ${
                        p.status === 'Approved' ? 'text-green-600' :
                        p.status === 'Denied' ? 'text-red-600' :
                        isUrgent ? 'text-red-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{p.pet_name}
                        <span className="text-gray-500 font-normal"> ({p.species}{p.breed ? ` · ${p.breed}` : ''})</span>
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5" /> {p.owner_name} · {p.barangay}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{p.pre_reg_number}</span>
                        {p.status === 'Pending' && (
                          <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded"
                            style={{ background: pfxColor }}>{pfx}-????</span>
                        )}
                        {p.status === 'Approved' && p.pet_tag_id && (
                          <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-green-600">{p.pet_tag_id}</span>
                        )}
                        {p.status === 'Pending' && p.expires_at && (
                          <span className={`text-xs flex items-center gap-1 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                            <CalendarClock className="w-3.5 h-3.5" />
                            {isExpired(p) ? 'EXPIRED' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                          </span>
                        )}
                        {p.status === 'Denied' && p.denial_reason && (
                          <span className="text-xs text-red-600 italic truncate max-w-[200px]">Reason: {p.denial_reason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {p.status === 'Pending' && (
                    <button onClick={() => startValidation(p)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-lg hover:bg-[#234a85] transition-colors text-sm font-medium flex-shrink-0">
                      Validate <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {p.status === 'Approved' && (
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-semibold flex-shrink-0">
                      <CheckCircle className="w-4 h-4" /> Approved
                    </span>
                  )}
                  {p.status === 'Denied' && (
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold flex-shrink-0">
                      <XCircle className="w-4 h-4" /> Denied
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
