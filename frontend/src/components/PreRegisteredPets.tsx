import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  PawPrint, Search, Eye, CheckCircle, XCircle, RefreshCw,
  X, Camera, Tag, AlertTriangle, Clock
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
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

/* ─── Auth helper ────────────────────────────────────────────────────────── */
function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('nasaalaga_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

/* ─── Zone colours (mirrors backend) ───────────────────────────────────── */
const ZONE_COLOR: Record<string, string> = {
  BLU: '#2B5EA6', PRP: '#8B5CF6', GRY: '#6B7280', RED: '#E85D3B',
};
const ZONE_LABEL: Record<string, string> = {
  BLU: 'East Zone', PRP: 'West Zone', GRY: 'North Zone', RED: 'Baybay-Highway Zone',
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function statusBadge(s: string) {
  if (s === 'Approved') return { bg: '#dcfce7', color: '#166534', label: '✅ Approved' };
  if (s === 'Denied')   return { bg: '#fee2e2', color: '#991b1b', label: '❌ Denied' };
  return { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' };
}

function daysLeft(exp?: string) {
  if (!exp) return null;
  const diff = new Date(exp).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export function PreRegisteredPets() {
  const [list, setList]         = useState<PreReg[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'all' | 'Pending' | 'Approved' | 'Denied'>('all');
  const [search, setSearch]     = useState('');

  /* detail / approve modal */
  const [selected, setSelected] = useState<PreReg | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  /* approve flow */
  const [approveStep, setApproveStep] = useState<'review' | 'photo' | 'tag' | 'confirm'>('review');
  const [livePhoto, setLivePhoto]     = useState('');
  const [tagNumber, setTagNumber]     = useState('');
  const [tagPrefix, setTagPrefix]     = useState('BLU');
  const [tagError, setTagError]       = useState('');
  const [processing, setProcessing]   = useState(false);
  const [approvedResult, setApprovedResult] = useState<{ petTagId: string } | null>(null);

  /* deny flow */
  const [denyMode, setDenyMode]       = useState(false);
  const [denyReason, setDenyReason]   = useState('');

  /* ── fetch ─────────────────────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/pets/pre-registered', { headers: authHeaders() });
      const data = await res.json();
      setList(data.preRegistrations || []);
    } catch { toast.error('Failed to load pre-registrations'); }
    finally  { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── derived ────────────────────────────────────────────────────────────── */
  const filtered = list.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [p.pet_name, p.owner_name, p.pre_reg_number, p.species, p.barangay]
        .some(f => f?.toLowerCase().includes(q));
    }
    return true;
  });

  const stats = {
    total:    list.length,
    pending:  list.filter(p => p.status === 'Pending').length,
    approved: list.filter(p => p.status === 'Approved').length,
    denied:   list.filter(p => p.status === 'Denied').length,
  };

  /* ── open detail ────────────────────────────────────────────────────────── */
  const openDetail = async (p: PreReg) => {
    setSelected(p);
    setShowDetail(true);
    setApproveStep('review');
    setLivePhoto('');
    setTagNumber('');
    setTagError('');
    setDenyMode(false);
    setDenyReason('');
    setApprovedResult(null);

    // fetch zone-based tag prefix for this barangay
    try {
      const r = await fetch(`/api/pets/barangay-prefix?barangay=${encodeURIComponent(p.barangay)}`,
        { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        setTagPrefix(d.prefix || 'BLU');
      }
    } catch { /* use default BLU */ }
  };

  const closeDetail = () => {
    if (processing) return;
    setShowDetail(false);
    setSelected(null);
    setApprovedResult(null);
  };

  /* ── photo ──────────────────────────────────────────────────────────────── */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLivePhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* ── approve ────────────────────────────────────────────────────────────── */
  const handleApprove = async () => {
    if (!selected) return;
    const digits = tagNumber.replace(/\D/g, '');
    if (!digits) { setTagError('Tag number is required'); return; }
    if (digits.length > 6) { setTagError('Max 6 digits'); return; }
    setTagError('');
    setProcessing(true);
    try {
      const petTagId = `${tagPrefix}-${digits.padStart(4, '0')}`;
      const res = await fetch(`/api/pets/validate/${selected.pre_reg_number}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'approve',
          photo:    livePhoto || selected.photo || null,
          petTagId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.tagConflict) {
          setTagError(`Tag ${petTagId} already exists — choose a different number.`);
          setApproveStep('tag');
          return;
        }
        throw new Error(data.error || 'Approval failed');
      }
      setApprovedResult({ petTagId: data.petTagId || petTagId });
      toast.success(`${selected.pet_name} registered! Tag: ${data.petTagId || petTagId}`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally { setProcessing(false); }
  };

  /* ── deny ───────────────────────────────────────────────────────────────── */
  const handleDeny = async () => {
    if (!selected) return;
    if (!denyReason.trim()) { toast.error('Please provide a denial reason'); return; }
    setProcessing(true);
    try {
      const res = await fetch(`/api/pets/validate/${selected.pre_reg_number}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'deny', denialReason: denyReason }),
      });
      if (!res.ok) throw new Error('Denial failed');
      toast.success('Pre-registration denied');
      closeDetail();
      load();
    } catch (err: any) {
      toast.error(err.message || 'Denial failed');
    } finally { setProcessing(false); }
  };

  const previewTag = tagNumber.replace(/\D/g, '')
    ? `${tagPrefix}-${tagNumber.replace(/\D/g, '').padStart(4, '0')}`
    : '';

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PawPrint style={{ width: 24, height: 24, color: '#2B5EA6' }} />
            Pet Pre-Registrations
          </h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            Review, validate and register pets submitted by owners
          </p>
        </div>
        <button onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw style={{ width: 14, height: 14, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} /> Refresh
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total',    value: stats.total,    color: '#2B5EA6', bg: '#eff6ff' },
          { label: 'Pending',  value: stats.pending,  color: '#d97706', bg: '#fef3c7' },
          { label: 'Approved', value: stats.approved, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Denied',   value: stats.denied,   color: '#dc2626', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search owner, pet name, species, barangay…"
            style={{ width: '100%', height: 38, border: '1.5px solid #e5e7eb', borderRadius: 9, paddingLeft: 34, paddingRight: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'Pending', 'Approved', 'Denied'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .18s',
                borderColor: filter === f ? '#2B5EA6' : '#e5e7eb',
                background:  filter === f ? '#2B5EA6' : '#f9fafb',
                color:       filter === f ? '#fff'    : '#6b7280' }}>
              {f === 'all' ? 'All' : f}
              {f === 'Pending' && stats.pending > 0 && (
                <span style={{ marginLeft: 5, background: filter === 'Pending' ? 'rgba(255,255,255,.3)' : '#f59e0b', color: filter === 'Pending' ? '#fff' : '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            <PawPrint style={{ width: 40, height: 40, margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
            No pre-registrations found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                {['Pre-Reg ID', 'Pet', 'Owner', 'Barangay', 'Submitted', 'Expires', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const badge = statusBadge(p.status);
                const dl    = daysLeft(p.expires_at);
                const expired = dl !== null && dl <= 0;
                return (
                  <tr key={p.pre_reg_number} style={{ borderBottom: '1px solid #f9fafb', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{p.pre_reg_number}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.photo
                          ? <img src={p.photo} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <PawPrint style={{ width: 16, height: 16, color: '#6366f1' }} />
                            </div>
                        }
                        <div>
                          <p style={{ fontWeight: 700, color: '#1f2937', margin: 0 }}>{p.pet_name}</p>
                          <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{p.species}{p.breed ? ` · ${p.breed}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ fontWeight: 600, color: '#374151', margin: 0 }}>{p.owner_name}</p>
                      <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{p.contact_number || p.owner_email || '—'}</p>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6b7280' }}>{p.barangay}</td>
                    <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(p.submitted_date)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {p.expires_at ? (
                        <span style={{ color: expired ? '#dc2626' : dl! <= 3 ? '#d97706' : '#6b7280', fontWeight: expired || dl! <= 3 ? 700 : 400 }}>
                          {expired ? '⚠ EXPIRED' : `${dl} day${dl !== 1 ? 's' : ''} left`}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => openDetail(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', border: '1.5px solid #e5e7eb', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>
                        <Eye style={{ width: 13, height: 13 }} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DETAIL / VALIDATE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showDetail && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,.25)' }}>

            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg,#2B5EA6,#3d7ac7)', padding: '18px 22px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ color: '#fff' }}>
                <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>
                  {approvedResult ? '✅ Pet Registered!' :
                   denyMode ? '❌ Deny Pre-Registration' :
                   selected.status === 'Pending' ? `Validate: ${selected.pet_name}` :
                   `Pre-Registration — ${selected.pet_name}`}
                </p>
                <p style={{ fontSize: 12, opacity: .75, margin: '2px 0 0' }}>{selected.pre_reg_number}</p>
              </div>
              <button onClick={closeDetail} disabled={processing}
                style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* ── SUCCESS SCREEN ──────────────────────────────────────── */}
              {approvedResult && (
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle style={{ width: 40, height: 40, color: '#16a34a' }} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1f2937', margin: '0 0 8px' }}>Pet Validated & Registered!</h3>
                  <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>
                    {selected.pet_name} has been saved to the pets database and tagged to the owner's account.
                  </p>
                  <div style={{ background: '#f0f7ff', border: '2px solid #2B5EA6', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Assigned Pet Tag ID</p>
                    <p style={{ fontSize: 26, fontWeight: 900, fontFamily: 'monospace', color: ZONE_COLOR[tagPrefix] || '#2B5EA6', margin: 0 }}>{approvedResult.petTagId}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 0' }}>{ZONE_LABEL[tagPrefix] || 'Tagged'}</p>
                  </div>
                  <button onClick={closeDetail}
                    style={{ width: '100%', height: 44, background: '#2B5EA6', color: '#fff', border: 'none', borderRadius: 11, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                    Done
                  </button>
                </div>
              )}

              {/* ── DENY FORM ───────────────────────────────────────────── */}
              {!approvedResult && denyMode && (
                <>
                  <div style={{ background: '#fff8ed', border: '1.5px solid #fbbf24', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                    You are about to deny <strong>{selected.pet_name}</strong>'s pre-registration. This will notify the owner.
                  </div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for Denial *</label>
                  <textarea
                    value={denyReason}
                    onChange={e => setDenyReason(e.target.value)}
                    rows={4}
                    placeholder="e.g. Incomplete details, invalid information, owner not present…"
                    style={{ width: '100%', border: '1.5px solid #fca5a5', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => setDenyMode(false)}
                      style={{ flex: 1, height: 42, border: '1.5px solid #e5e7eb', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>← Cancel</button>
                    <button onClick={handleDeny} disabled={processing || !denyReason.trim()}
                      style={{ flex: 1, height: 42, background: processing ? '#d1d5db' : '#dc2626', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: processing ? 'not-allowed' : 'pointer' }}>
                      {processing ? 'Processing…' : 'Confirm Denial'}
                    </button>
                  </div>
                </>
              )}

              {/* ── MAIN VIEW / APPROVAL FLOW ───────────────────────────── */}
              {!approvedResult && !denyMode && (
                <>
                  {/* Step tabs — only show when Pending */}
                  {selected.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e8edf4', marginBottom: 20 }}>
                      {(['review','photo','tag','confirm'] as const).map((s, i) => {
                        const labels = ['1. Review', '2. Photo', '3. Tag', '4. Confirm'];
                        const idx = ['review','photo','tag','confirm'].indexOf(approveStep);
                        return (
                          <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 4px', fontSize: 11, fontWeight: 700,
                            color: approveStep === s ? '#2B5EA6' : i < idx ? '#16a34a' : '#9ca3af',
                            borderBottom: `3px solid ${approveStep === s ? '#2B5EA6' : i < idx ? '#16a34a' : 'transparent'}` }}>
                            <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800,
                              background: approveStep === s ? '#2B5EA6' : i < idx ? '#16a34a' : '#e5e7eb',
                              color: approveStep === s || i < idx ? '#fff' : '#9ca3af' }}>
                              {i < idx ? '✓' : i + 1}
                            </span>
                            {labels[i]}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── STEP 1 / INFO VIEW: Pet + Owner details ──────── */}
                  {(approveStep === 'review' || selected.status !== 'Pending') && (
                    <>
                      {/* Pet photo */}
                      {selected.photo && (
                        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}>
                          <img src={selected.photo} alt="Pet" style={{ width: '100%', maxHeight: 180, objectFit: 'cover' }} />
                        </div>
                      )}

                      <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2B5EA6', margin: '0 0 10px', paddingBottom: 5, borderBottom: '1.5px solid #e8f0fb' }}>Pet Information</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 16 }}>
                        {[
                          ['Pet Name',   selected.pet_name],
                          ['Species',    selected.species],
                          ['Breed',      selected.breed   || '—'],
                          ['Age',        selected.age     || '—'],
                          ['Color',      selected.color   || '—'],
                          ['Gender',     selected.gender],
                        ].map(([k, v]) => (
                          <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</p>
                            <p style={{ fontSize: 13, color: '#1f2937', fontWeight: 700, margin: 0 }}>{v}</p>
                          </div>
                        ))}
                      </div>

                      <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2B5EA6', margin: '0 0 10px', paddingBottom: 5, borderBottom: '1.5px solid #e8f0fb' }}>Owner Information</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 16 }}>
                        {[
                          ['Owner Name', selected.owner_name],
                          ['Contact',    selected.contact_number || '—'],
                          ['Email',      selected.owner_email    || '—'],
                          ['Barangay',   selected.barangay],
                          ['Address',    selected.address        || '—'],
                        ].map(([k, v]) => (
                          <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', ...(k === 'Address' ? { gridColumn: 'span 2' } : {}) }}>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</p>
                            <p style={{ fontSize: 13, color: '#1f2937', fontWeight: 700, margin: 0 }}>{v}</p>
                          </div>
                        ))}
                      </div>

                      {/* Approved record */}
                      {selected.status === 'Approved' && (
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                          <p style={{ fontWeight: 700, color: '#166534', fontSize: 13, margin: '0 0 6px' }}>✅ Registered</p>
                          <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>Pet Tag: <strong style={{ fontFamily: 'monospace' }}>{selected.pet_tag_id || '—'}</strong></p>
                          <p style={{ fontSize: 12, color: '#374151', margin: '4px 0 0' }}>Approved: {fmtDate(selected.approved_date)}</p>
                        </div>
                      )}

                      {/* Denied record */}
                      {selected.status === 'Denied' && selected.denial_reason && (
                        <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                          <p style={{ fontWeight: 700, color: '#991b1b', fontSize: 13, margin: '0 0 4px' }}>❌ Denied</p>
                          <p style={{ fontSize: 12, color: '#7f1d1d', margin: 0 }}>{selected.denial_reason}</p>
                        </div>
                      )}

                      {/* Expiry warning */}
                      {selected.status === 'Pending' && selected.expires_at && daysLeft(selected.expires_at)! <= 3 && (
                        <div style={{ background: '#fff8ed', border: '1.5px solid #fbbf24', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#92400e', display: 'flex', gap: 8 }}>
                          <Clock style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
                          {daysLeft(selected.expires_at)! <= 0 ? 'This pre-registration has EXPIRED.' : `Expires in ${daysLeft(selected.expires_at)} day(s). Validate soon.`}
                        </div>
                      )}

                      {/* Actions */}
                      {selected.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                          <button onClick={() => setDenyMode(true)}
                            style={{ flex: 1, height: 42, background: '#fff', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <XCircle style={{ width: 15, height: 15 }} /> Deny
                          </button>
                          <button onClick={() => setApproveStep('photo')}
                            style={{ flex: 2, height: 42, background: '#2B5EA6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <CheckCircle style={{ width: 15, height: 15 }} /> Proceed to Validate →
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── STEP 2: Live Photo ──────────────────────────── */}
                  {approveStep === 'photo' && (
                    <>
                      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Take a live photo of the pet during the CVO visit. This becomes the official photo on record.</p>

                      <div
                        onClick={() => document.getElementById('live-photo-input')?.click()}
                        style={{ border: `2px dashed ${livePhoto ? '#2B5EA6' : '#d1d5db'}`, borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', background: livePhoto ? '#f0f7ff' : '#fafafa', marginBottom: 16, transition: 'all .2s' }}>
                        <input id="live-photo-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoChange} />
                        {livePhoto ? (
                          <img src={livePhoto} alt="Live" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }} />
                        ) : (
                          <div style={{ color: '#9ca3af' }}>
                            <Camera style={{ width: 36, height: 36, margin: '0 auto 8px', display: 'block' }} />
                            <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>Click to capture or upload photo</p>
                            <p style={{ fontSize: 11, margin: '4px 0 0' }}>Camera will open on mobile devices</p>
                          </div>
                        )}
                      </div>

                      {!livePhoto && selected.photo && (
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 6px' }}>Or use the submitted photo:</p>
                          <img src={selected.photo} alt="Submitted" onClick={() => setLivePhoto(selected.photo)}
                            style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', opacity: 0.85 }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setApproveStep('review')}
                          style={{ flex: 1, height: 42, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>← Back</button>
                        <button onClick={() => setApproveStep('tag')}
                          style={{ flex: 2, height: 42, background: '#2B5EA6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          {livePhoto ? 'Next: Assign Tag →' : 'Skip Photo & Continue →'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── STEP 3: Tag Assignment ──────────────────────── */}
                  {approveStep === 'tag' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: `${ZONE_COLOR[tagPrefix]}15`, border: `1.5px solid ${ZONE_COLOR[tagPrefix]}50`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: ZONE_COLOR[tagPrefix] || '#2B5EA6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12, flexShrink: 0 }}>
                          {tagPrefix}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: ZONE_COLOR[tagPrefix] || '#2B5EA6', fontSize: 13, margin: 0 }}>{ZONE_LABEL[tagPrefix] || 'Zone'}</p>
                          <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Pets from <strong>{selected.barangay}</strong> use the <strong>{tagPrefix}-</strong> prefix</p>
                        </div>
                      </div>

                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                        Tag Number * <span style={{ color: '#9ca3af', fontWeight: 500 }}>(numeric part only, e.g. 0001)</span>
                      </label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ background: ZONE_COLOR[tagPrefix] || '#2B5EA6', color: '#fff', padding: '10px 14px', borderRadius: 9, fontWeight: 900, fontFamily: 'monospace', fontSize: 16, flexShrink: 0 }}>
                          {tagPrefix}-
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={tagNumber}
                          onChange={e => { setTagNumber(e.target.value.replace(/\D/g,'').slice(0,6)); setTagError(''); }}
                          placeholder="0001"
                          style={{ flex: 1, height: 44, border: `1.5px solid ${tagError ? '#ef4444' : '#e5e7eb'}`, borderRadius: 9, padding: '0 12px', fontSize: 20, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      {tagError && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{tagError}</p>}
                      {previewTag && !tagError && (
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>
                          Preview: <strong style={{ fontFamily: 'monospace', color: ZONE_COLOR[tagPrefix], fontSize: 14 }}>{previewTag}</strong>
                        </p>
                      )}

                      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginTop: 14, fontSize: 12, color: '#166534' }}>
                        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Upon confirming:</p>
                        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
                          <li>Pet is inserted into the registered pets database</li>
                          <li>Tag <strong>{previewTag || `${tagPrefix}-XXXX`}</strong> is permanently assigned</li>
                          <li>Pet is linked to the owner's account via owner ID</li>
                        </ul>
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <button onClick={() => setApproveStep('photo')}
                          style={{ flex: 1, height: 42, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>← Back</button>
                        <button onClick={() => {
                          if (!tagNumber.replace(/\D/g,'')) { setTagError('Tag number is required'); return; }
                          setApproveStep('confirm');
                        }}
                          style={{ flex: 2, height: 42, background: '#2B5EA6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          Next: Confirm →
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── STEP 4: Confirm ─────────────────────────────── */}
                  {approveStep === 'confirm' && (
                    <>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px' }}>Review all details before finalising.</p>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                        {[
                          ['Pet Name',   selected.pet_name],
                          ['Species',    selected.species],
                          ['Breed',      selected.breed || '—'],
                          ['Owner',      selected.owner_name],
                          ['Contact',    selected.contact_number || '—'],
                          ['Barangay',   selected.barangay],
                          ['Pet Tag ID', previewTag || '—'],
                          ['Photo',      livePhoto ? '📸 Live photo captured' : selected.photo ? '📷 Submitted photo used' : '(no photo)'],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                            <span style={{ color: '#6b7280', fontWeight: 600 }}>{k}</span>
                            <span style={{ color: '#1f2937', fontWeight: 700, textAlign: 'right', maxWidth: '55%' }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      {livePhoto && (
                        <img src={livePhoto} alt="Live" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />
                      )}

                      <div style={{ background: '#fff8ed', border: '1.5px solid #fbbf24', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 16 }}>
                        <strong>This action cannot be undone.</strong> The pet will be permanently moved from pre-registration to the active pets registry.
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setApproveStep('tag')}
                          style={{ flex: 1, height: 44, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>← Back</button>
                        <button onClick={handleApprove} disabled={processing}
                          style={{ flex: 2, height: 44, background: processing ? '#d1d5db' : '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Tag style={{ width: 16, height: 16 }} />
                          {processing ? 'Registering…' : '✅ Confirm & Register Pet'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default PreRegisteredPets;
