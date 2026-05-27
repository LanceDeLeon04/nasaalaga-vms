import { useState, useEffect } from 'react';
import {
  Search, CheckCircle, XCircle, Clock, AlertTriangle,
  Camera, Tag, Eye, ChevronRight, User, PawPrint,
  CalendarClock, BadgeCheck, ArrowRight, Shield
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

/* ── DB-backed PreReg shape ───────────────────────────────────────────────── */
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
  expires_at?: string;
  pet_tag_id?: string;
}

// ── Zone → color prefix (mirrors backend ZONE_PREFIX) ──────────────────────
const BARANGAY_ZONE: Record<string, string> = {
  // East → BLU
  'Caluangan':'East','Coral Ni Bacal':'East','Dila':'East','Lumbang Na Bata':'East',
  'Lumbang Na Matanda':'East','Poblacion 1':'East','Poblacion 2':'East','Poblacion 3':'East',
  'Poblacion 4':'East','Poblacion 6':'East',
  // West → PRP
  'Bagong Tubig':'West','Cahil':'West','Calantas':'West','Coral Ni Lopez':'West',
  'Dacanlao':'West','Loma':'West','Makina':'West','Pantay':'West','Taklang Anak':'West','Timbain':'West',
  // North → GRY
  'Baclas':'North','Balimbing':'North','Bambang':'North','Bisaya':'North',
  'Madalunot':'North','Matipok':'North','Munting Coral':'North','Niyugan':'North','Tamayo':'North',
  // Red → RED
  'Camastilisan':'Baybay-Highway','Lumbang Calzada':'Baybay-Highway','Poblacion 5':'Baybay-Highway','Puting Bato East':'Baybay-Highway',
  'Puting Bato West':'Baybay-Highway','Quisumbing':'Baybay-Highway','Salong':'Baybay-Highway','San Rafael':'Baybay-Highway',
  'Sinisian':'Baybay-Highway','Talisay':'Baybay-Highway',
};

const ZONE_PREFIX: Record<string, string> = {
  East: 'BLU', West: 'PRP', North: 'GRY', Red: 'RED', 'Baybay-Highway': 'RED',
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

interface AdminValidationProps {
  adminUserId: string;
}

type ValidationStep = 'list' | 'review' | 'photo' | 'tag' | 'done';

export function AdminValidation({ adminUserId }: AdminValidationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [preRegs, setPreRegs] = useState<PreReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PreReg | null>(null);
  const [valStep, setValStep] = useState<ValidationStep>('list');
  // tagNumber: only the numeric portion admin types (e.g. "0001")
  const [tagNumber, setTagNumber] = useState('');
  const [tagError, setTagError] = useState('');
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load pre-registrations from DB on mount
  useEffect(() => { loadPreRegs(); }, []);

  const loadPreRegs = async () => {
    setLoading(true);
    try {
      const data = await api.getPreRegistrations('Pending');
      setPreRegs(data.preRegistrations || []);
    } catch { toast.error('Failed to load pre-registrations'); }
    finally { setLoading(false); }
  };

  // Derived: full tag ID preview
  const prefix = selected ? getPrefix(selected.barangay) : 'BLU';
  const numPadded = tagNumber.replace(/\D/g, '').padStart(4, '0');
  const previewTagId = tagNumber ? `${prefix}-${numPadded}` : '';

  const preRegistered = preRegs.filter(p =>
    p.status === 'Pending' &&
    (
      p.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.pre_reg_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pet_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getDaysLeft = (expiry?: string) => {
    if (!expiry) return 0;
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleStartValidation = (pet: PreReg) => {
    setSelected(pet);
    setValStep('review');
    setPhotoCaptured(false);
    setTagNumber('');
    setTagError('');
    setNotes('');
  };

  const handleConfirmTag = async () => {
    const digits = tagNumber.replace(/\D/g, '');
    if (!digits) { setTagError('Tag number is required'); return; }
    if (digits.length > 6) { setTagError('Number too long (max 6 digits)'); return; }
    if (!selected) return;
    setTagError('');
    setSubmitting(true);
    try {
      await api.validatePreRegistration(selected.pre_reg_number, {
        action: 'approve',
        tagNumber: digits,
        notes,
      });
      toast.success(`${selected.pet_name} validated and registered!`);
      setValStep('done');
      loadPreRegs();
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('tagConflict')) {
        setTagError(err.message);
      } else {
        toast.error(err.message || 'Validation failed');
      }
    } finally { setSubmitting(false); }
  };

  const getOwnerName = (pet: PreReg) => pet.owner_name || '—';

  if (valStep === 'done' && selected) {
    const finalPrefix = getPrefix(selected.barangay);
    const finalTagId = `${finalPrefix}-${tagNumber.replace(/\D/g,'').padStart(4,'0')}`;
    const tagColor = ZONE_COLOR[finalPrefix] || '#2B5EA6';
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
                style={{ background: tagColor }}>{finalTagId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Zone:</span>
              <span className="font-medium">{ZONE_LABEL[finalPrefix]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Barangay:</span>
              <span className="font-medium">{selected.barangay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Owner:</span>
              <span className="font-medium">{getOwnerName(selected)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Validated by:</span>
              <span className="font-medium">Admin</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium">{new Date().toLocaleDateString('en-PH')}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 mb-4">
            ✓ Pet moved to Registered Pets database and tagged to owner's account automatically.
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

  if (valStep !== 'list' && selected) {
    const pfx = getPrefix(selected.barangay);
    const pfxColor = ZONE_COLOR[pfx] || '#2B5EA6';

    return (
      <div className="space-y-4">
        {/* Step Header */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => { setValStep('list'); setSelected(null); }}
              className="text-sm text-[#2B5EA6] hover:underline"
            >
              ← Back to List
            </button>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-600">Validating: <strong>{selected.pet_name}</strong> ({selected.pre_reg_number})</span>
          </div>

          <div className="flex items-center gap-1">
            {[
              { key: 'review', label: '1. Review' },
              { key: 'photo', label: '2. Photo' },
              { key: 'tag', label: '3. Tag' },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  valStep === s.key ? 'bg-[#2B5EA6] text-white' :
                  ['review', 'photo', 'tag'].indexOf(valStep) > i ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-400'
                }`}>{s.label}</div>
                {i < 2 && <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* STEP: Review Details */}
        {valStep === 'review' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#2B5EA6]" />
              Verify Pre-Registration Details
            </h3>

            {/* Zone badge */}
            <div className="flex items-center gap-2 p-3 rounded-xl border"
              style={{ borderColor: pfxColor, background: `${pfxColor}10` }}>
              <Shield className="w-4 h-4" style={{ color: pfxColor }} />
              <span className="text-sm font-semibold" style={{ color: pfxColor }}>
                {ZONE_LABEL[pfx]} — tags will be prefixed <strong>{pfx}-</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Pet Details</p>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-gray-500">Name:</span> <strong>{selected.pet_name}</strong></p>
                  <p><span className="text-gray-500">Species:</span> {selected.species}</p>
                  <p><span className="text-gray-500">Breed:</span> {selected.breed}</p>
                  <p><span className="text-gray-500">Color:</span> {selected.color}</p>
                  <p><span className="text-gray-500">Sex:</span> {selected.gender}</p>
                  <p><span className="text-gray-500">Age:</span> {selected.age}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Owner Details</p>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-gray-500">Name:</span> <strong>{getOwnerName(selected)}</strong></p>
                  <p><span className="text-gray-500">Address:</span> {selected.address}</p>
                  <p><span className="text-gray-500">Contact:</span> {selected.contact_number}</p>
                  <p><span className="text-gray-500">Barangay:</span> {selected.barangay}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Confirm that the owner and pet are physically present before proceeding.
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Validation Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any observations or remarks..."
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] resize-none text-sm"
              />
            </div>

            <button
              onClick={() => setValStep('photo')}
              className="w-full py-3 bg-[#2B5EA6] text-white rounded-xl font-semibold hover:bg-[#234a85] transition-colors flex items-center justify-center gap-2"
            >
              Details Verified — Proceed to Photo
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP: Photo */}
        {valStep === 'photo' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#2B5EA6]" />
              Capture Pet Photo
            </h3>

            <div
              onClick={() => setPhotoCaptured(true)}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                photoCaptured
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-[#2B5EA6] hover:bg-blue-50'
              }`}
            >
              {photoCaptured ? (
                <div className="space-y-2">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                  <p className="text-green-700 font-semibold">Photo Captured!</p>
                  <p className="text-xs text-green-600">Click to retake</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-700 font-semibold">Click to Capture Photo</p>
                  <p className="text-xs text-gray-500">Take a clear photo of the pet for the registry</p>
                </div>
              )}
            </div>

            <button
              onClick={() => { if (photoCaptured) setValStep('tag'); }}
              disabled={!photoCaptured}
              className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                photoCaptured
                  ? 'bg-[#2B5EA6] text-white hover:bg-[#234a85]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Photo Done — Assign Pet Tag
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP: Tag Assignment */}
        {valStep === 'tag' && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#2B5EA6]" />
              Assign Pet Tag ID
            </h3>

            {/* Zone info */}
            <div className="flex items-center gap-3 p-4 rounded-xl border"
              style={{ borderColor: pfxColor, background: `${pfxColor}10` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ background: pfxColor }}>{pfx}</div>
              <div>
                <p className="font-bold text-sm" style={{ color: pfxColor }}>{ZONE_LABEL[pfx]}</p>
                <p className="text-xs text-gray-500">
                  All pets from <strong>{selected.barangay}</strong> are tagged with the <strong>{pfx}-</strong> prefix.
                  The prefix is auto-assigned — just enter the number below.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tag Number <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-400 ml-2">(the numeric part only, e.g. 1, 42, 0001)</span>
              </label>
              <div className="flex items-center gap-2">
                {/* Prefix badge (read-only, auto) */}
                <span className="px-3 py-3 rounded-xl font-mono font-black text-white text-lg flex-shrink-0"
                  style={{ background: pfxColor }}>{pfx}-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tagNumber}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTagNumber(val);
                    setTagError('');
                  }}
                  placeholder="0001"
                  className={`flex-1 px-4 py-3 border rounded-xl font-mono text-xl focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] ${tagError ? 'border-red-400' : 'border-gray-300'}`}
                />
              </div>
              {tagError && <p className="text-red-500 text-xs mt-1">{tagError}</p>}

              {/* Live preview */}
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
                <li>✓ Pet will be linked to owner's account automatically</li>
                <li>✓ Owner will be notified via email</li>
              </ul>
            </div>

            <button
              onClick={handleConfirmTag}
              disabled={submitting}
              className="w-full py-3 bg-[#60A85C] text-white rounded-xl font-semibold hover:bg-[#4a8a47] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle className="w-5 h-5" />Confirm &amp; Save Registration</>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 font-bold text-xl mb-1">Pre-Registration Validation</h2>
          <p className="text-gray-600 text-sm">Review and validate pre-registered pets submitted by the public</p>
        </div>
        <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {preRegistered.length} Pending
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

      {/* Search */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by owner name, pet name, or Pre-Reg ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
          />
        </div>
      </div>

      {/* Pre-registered list */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <div className="w-10 h-10 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading pre-registrations…</p>
          </div>
        ) : preRegistered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="font-medium">No pending pre-registrations</p>
            <p className="text-sm">All pre-registrations have been validated.</p>
          </div>
        ) : (
          preRegistered.map(pet => {
            const daysLeft = getDaysLeft(pet.expires_at);
            const isUrgent = daysLeft <= 3;
            const pfx = getPrefix(pet.barangay);
            const pfxColor = ZONE_COLOR[pfx] || '#2B5EA6';
            return (
              <div key={pet.pre_reg_number} className={`bg-white rounded-xl shadow p-5 border-l-4 ${isUrgent ? 'border-red-400' : 'border-amber-400'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <PawPrint className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{pet.pet_name} <span className="text-gray-500 font-normal">({pet.species} • {pet.breed})</span></p>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5" /> {getOwnerName(pet)} • {pet.barangay}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{pet.pre_reg_number}</span>
                        {/* Zone prefix preview */}
                        <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded"
                          style={{ background: pfxColor }}>{pfx}-????</span>
                        {daysLeft > 0 && (
                          <span className={`text-xs flex items-center gap-1 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                            <CalendarClock className="w-3.5 h-3.5" />
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartValidation(pet)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-lg hover:bg-[#234a85] transition-colors text-sm font-medium"
                  >
                    Validate
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
