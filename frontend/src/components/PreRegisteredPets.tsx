import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../lib/api';

/* ─── types ─── */
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

type ValStep = 'details' | 'photo' | 'tag' | 'confirm';

const STYLES = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes popIn  { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }

  .prl-wrap { padding: 0; }
  .prl-topbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px; }
  .prl-title  { font-size:24px; font-weight:900; color:#1f2937; margin:0; display:flex; align-items:center; gap:10px; }
  .prl-subtitle { color:#6b7280; font-size:14px; margin:4px 0 0; }
  .prl-stats  { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
  .prl-stat   { background:#fff; border-radius:14px; padding:18px 20px; box-shadow:0 2px 8px rgba(0,0,0,.06); display:flex; align-items:center; gap:14px; }
  .prl-stat-ico { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; }
  .prl-stat-val { font-size:26px; font-weight:900; }
  .prl-stat-lbl { font-size:12px; color:#6b7280; font-weight:600; }
  .prl-toolbar  { background:#fff; border-radius:14px; padding:16px 20px; margin-bottom:16px; display:flex; gap:10px; flex-wrap:wrap; box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .prl-search   { flex:1; min-width:200px; height:40px; border:1.5px solid #e5e7eb; border-radius:10px; padding:0 12px; font-size:14px; outline:none; }
  .prl-search:focus { border-color:#2B5EA6; }
  .prl-tabs     { display:flex; gap:6px; }
  .prl-tab      { height:40px; padding:0 16px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; color:#6b7280; font-size:13px; font-weight:700; cursor:pointer; transition:all .18s; }
  .prl-tab.active-all      { background:#2B5EA6; border-color:#2B5EA6; color:#fff; }
  .prl-tab.active-Pending  { background:#f59e0b; border-color:#f59e0b; color:#fff; }
  .prl-tab.active-Approved { background:#16a34a; border-color:#16a34a; color:#fff; }
  .prl-tab.active-Denied   { background:#dc2626; border-color:#dc2626; color:#fff; }
  .prl-table-wrap { background:#fff; border-radius:14px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden; }
  .prl-table    { width:100%; border-collapse:collapse; }
  .prl-table th { background:#f8fafc; padding:12px 16px; text-align:left; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#64748b; border-bottom:1.5px solid #e2e8f0; }
  .prl-table td { padding:14px 16px; border-bottom:1px solid #f1f5f9; font-size:14px; color:#374151; vertical-align:middle; }
  .prl-table tr:last-child td { border-bottom:none; }
  .prl-table tr:hover td { background:#f8fafc; }
  .prl-badge    { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700; }
  .prl-badge.Pending  { background:#fef9c3; color:#92400e; border:1px solid #fde047; }
  .prl-badge.Approved { background:#dcfce7; color:#14532d; border:1px solid #86efac; }
  .prl-badge.Denied   { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
  .prl-btn      { height:34px; padding:0 14px; border-radius:8px; border:none; font-size:13px; font-weight:700; cursor:pointer; transition:all .18s; }
  .prl-btn-blue { background:#eff6ff; color:#2B5EA6; }
  .prl-btn-blue:hover { background:#2B5EA6; color:#fff; }
  .prl-btn-green { background:#f0fdf4; color:#16a34a; }
  .prl-btn-green:hover { background:#16a34a; color:#fff; }
  .prl-empty    { text-align:center; padding:60px 20px; color:#9ca3af; }
  .prl-empty-ico{ font-size:48px; margin-bottom:12px; }

  /* ─── modal ─── */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .modal-box     { background:#fff; border-radius:20px; width:100%; max-width:640px; max-height:90vh; overflow-y:auto; box-shadow:0 30px 80px rgba(0,0,0,.25); animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both; }
  .modal-header  { display:flex; align-items:center; justify-content:space-between; padding:22px 28px 0; }
  .modal-title   { font-size:18px; font-weight:900; color:#1f2937; margin:0; }
  .modal-close   { width:34px; height:34px; border-radius:50%; border:none; background:#f1f5f9; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; }
  .modal-close:hover { background:#e2e8f0; }
  .modal-body    { padding:24px 28px; }
  .modal-steps   { display:flex; gap:0; border-bottom:1px solid #e8edf4; margin-bottom:24px; }
  .modal-step    { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:12px 6px; font-size:12px; font-weight:700; color:#9ca3af; border-bottom:3px solid transparent; }
  .modal-step.active { color:#2B5EA6; border-bottom-color:#2B5EA6; }
  .modal-step.done   { color:#16a34a; border-bottom-color:#16a34a; }
  .modal-step-num { width:20px; height:20px; border-radius:50%; background:#e5e7eb; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; }
  .modal-step.active .modal-step-num { background:#2B5EA6; color:#fff; }
  .modal-step.done   .modal-step-num { background:#16a34a; color:#fff; }
  .modal-section { font-size:10.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#2B5EA6; margin:0 0 14px; padding-bottom:5px; border-bottom:1.5px solid #e8f0fb; }
  .modal-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
  .modal-detail  { background:#f8fafc; border-radius:10px; padding:12px 14px; }
  .modal-detail-lbl { font-size:11px; color:#9ca3af; font-weight:600; margin-bottom:3px; }
  .modal-detail-val { font-size:14px; color:#1f2937; font-weight:700; }
  .modal-field   { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
  .modal-label   { font-size:12.5px; font-weight:700; color:#374151; }
  .modal-input   { height:44px; padding:0 12px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; font-size:14px; outline:none; font-family:inherit; transition:border-color .18s; }
  .modal-input:focus { border-color:#2B5EA6; background:#fff; }
  .modal-textarea { padding:10px 12px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; font-size:14px; outline:none; font-family:inherit; resize:none; line-height:1.6; }
  .modal-textarea:focus { border-color:#2B5EA6; background:#fff; }
  .modal-actions { display:flex; gap:10px; margin-top:20px; }
  .modal-btn-primary { flex:1; height:46px; border:none; border-radius:11px; cursor:pointer; background:linear-gradient(135deg,#2B5EA6,#3d7ac7); color:#fff; font-size:14px; font-weight:800; box-shadow:0 6px 20px rgba(43,94,166,.28); transition:transform .18s; }
  .modal-btn-primary:hover:not(:disabled) { transform:translateY(-2px); }
  .modal-btn-primary:disabled { background:#d1d5db; color:#9ca3af; box-shadow:none; cursor:not-allowed; }
  .modal-btn-secondary { height:46px; padding:0 18px; border:1.5px solid #e5e7eb; border-radius:11px; background:#fff; color:#374151; font-size:14px; font-weight:700; cursor:pointer; transition:all .18s; }
  .modal-btn-secondary:hover { border-color:#2B5EA6; color:#2B5EA6; }
  .modal-btn-deny { flex:1; height:46px; border:none; border-radius:11px; cursor:pointer; background:#fee2e2; color:#dc2626; font-size:14px; font-weight:800; transition:all .18s; }
  .modal-btn-deny:hover { background:#dc2626; color:#fff; }
  .modal-spinner { display:inline-block; width:15px; height:15px; border-radius:50%; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; animation:spin .6s linear infinite; vertical-align:middle; margin-right:6px; }
  .modal-photo-upload { border:2px dashed #d1d5db; border-radius:12px; padding:24px; text-align:center; cursor:pointer; transition:all .2s; }
  .modal-photo-upload:hover { border-color:#2B5EA6; background:#f0f7ff; }
  .modal-photo-preview { width:100%; max-height:200px; object-fit:cover; border-radius:10px; margin-top:10px; }
  .modal-alert  { border-radius:10px; padding:12px 16px; font-size:13px; line-height:1.6; margin-bottom:14px; }
  .modal-alert.warn { background:#fff8ed; border:1.5px solid #fbbf24; color:#92400e; }
  .modal-alert.info { background:#eff6ff; border:1.5px solid #bfdbfe; color:#1e40af; }
  .modal-confirm-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
  .modal-confirm-row:last-child { border-bottom:none; }
  .modal-confirm-key { color:#6b7280; font-weight:600; }
  .modal-confirm-val { color:#1f2937; font-weight:700; }
  .modal-success-icon { width:72px; height:72px; border-radius:50%; background:#f0fdf4; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; animation:popIn .4s cubic-bezier(.22,1,.36,1) both; }
  .modal-tag-box { background:#f0f7ff; border:2px solid #2B5EA6; border-radius:12px; padding:18px; text-align:center; margin-bottom:16px; }
  .modal-tag-val { font-size:24px; font-weight:900; font-family:monospace; color:#2B5EA6; }

  @media(max-width:600px){
    .prl-stats { grid-template-columns:1fr; }
    .modal-detail-grid { grid-template-columns:1fr; }
    .modal-steps { flex-wrap:wrap; }
  }
`;

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PreRegisteredPets() {
  const [list, setList]       = useState<PreReg[]>([]);
  const [filtered, setFiltered] = useState<PreReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all'|'Pending'|'Approved'|'Denied'>('Pending');
  const [search, setSearch]   = useState('');

  const [selected, setSelected]     = useState<PreReg | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showValidate, setShowValidate] = useState(false);
  const [valStep, setValStep]       = useState<ValStep>('details');
  const [submitting, setSubmitting] = useState(false);

  const [valPhoto, setValPhoto]     = useState('');
  const [petTagId, setPetTagId]     = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [denyMode, setDenyMode]     = useState(false);
  const [valDone, setValDone]       = useState(false);

  /* ─ load ─ */
  useEffect(() => { fetchList(); }, []);

  useEffect(() => {
    let r = list;
    if (filter !== 'all') r = r.filter(p => p.status === filter);
    if (search) r = r.filter(p =>
      [p.pet_name, p.owner_name, p.pre_reg_number, p.species]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()))
    );
    setFiltered(r);
  }, [list, filter, search]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await api.getPreRegistrations();
      setList(data.preRegistrations || []);
    } catch { toast.error('Failed to load pre-registrations'); }
    finally { setLoading(false); }
  };

  const openValidate = (p: PreReg) => {
    setSelected(p);
    setValStep('details');
    setValPhoto('');
    setPetTagId('');
    setDenyReason('');
    setDenyMode(false);
    setValDone(false);
    setShowValidate(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setValPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const data = await api.validatePreRegistration(selected.pre_reg_number, {
        action: 'approve', photo: valPhoto, petTagId,
      });
      toast.success(`${selected.pet_name} validated and registered! Tag: ${data.petTagId || petTagId}`);
      setValDone(true);
      fetchList();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  };

  const handleDeny = async () => {
    if (!selected || !denyReason.trim()) { toast.error('Please enter a reason'); return; }
    setSubmitting(true);
    try {
      await api.validatePreRegistration(selected.pre_reg_number, {
        action: 'deny', denialReason: denyReason,
      });
      toast.success('Pre-registration denied.');
      setShowValidate(false);
      fetchList();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  };

  const pending  = list.filter(p => p.status === 'Pending').length;
  const approved = list.filter(p => p.status === 'Approved').length;
  const denied   = list.filter(p => p.status === 'Denied').length;

  const valSteps: { key: ValStep; label: string }[] = [
    { key: 'details', label: 'Review' },
    { key: 'photo',   label: 'Photo' },
    { key: 'tag',     label: 'Pet Tag' },
    { key: 'confirm', label: 'Confirm' },
  ];
  const valStepIdx = valSteps.findIndex(s => s.key === valStep);

  const isExpired = (p: PreReg) => p.expires_at && new Date(p.expires_at) < new Date();

  return (
    <>
      <style>{STYLES}</style>
      <div className="prl-wrap">

        {/* top bar */}
        <div className="prl-topbar">
          <div>
            <h1 className="prl-title">Pre-Registered Pets</h1>
            <p className="prl-subtitle">Review and validate pet pre-registrations submitted by owners</p>
          </div>
        </div>

        {/* stats */}
        <div className="prl-stats">
          <div className="prl-stat">
            <div className="prl-stat-ico" style={{ background: '#fff8ed' }}>⏳</div>
            <div><div className="prl-stat-val" style={{ color: '#f59e0b' }}>{pending}</div><div className="prl-stat-lbl">Pending</div></div>
          </div>
          <div className="prl-stat">
            <div className="prl-stat-ico" style={{ background: '#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div><div className="prl-stat-val" style={{ color: '#16a34a' }}>{approved}</div><div className="prl-stat-lbl">Approved</div></div>
          </div>
          <div className="prl-stat">
            <div className="prl-stat-ico" style={{ background: '#fee2e2', display:'flex', alignItems:'center', justifyContent:'center' }}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
            <div><div className="prl-stat-val" style={{ color: '#dc2626' }}>{denied}</div><div className="prl-stat-lbl">Denied</div></div>
          </div>
        </div>

        {/* toolbar */}
        <div className="prl-toolbar">
          <input className="prl-search" placeholder="Search by name, species, ID…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="prl-tabs">
            {(['all','Pending','Approved','Denied'] as const).map(f => (
              <button key={f} className={`prl-tab ${filter === f ? `active-${f}` : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f}
                {f === 'Pending' && pending > 0 && <span style={{ marginLeft: 6, background: '#f59e0b', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{pending}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* table */}
        <div className="prl-table-wrap">
          {loading ? (
            <div className="prl-empty"><div className="prl-empty-ico">⏳</div><p>Loading…</p></div>
          ) : filtered.length === 0 ? (
            <div className="prl-empty"><div className="prl-empty-ico"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><p>No pre-registrations found.</p></div>
          ) : (
            <table className="prl-table">
              <thead>
                <tr>
                  <th>Pre-Reg ID</th>
                  <th>Pet</th>
                  <th>Owner</th>
                  <th>Submitted</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.pre_reg_number}>
                    <td><code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 6 }}>{p.pre_reg_number}</code></td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.pet_name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.species}{p.breed ? ` · ${p.breed}` : ''}</div>
                    </td>
                    <td>
                      <div>{p.owner_name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.contact_number}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{formatDate(p.submitted_date)}</td>
                    <td style={{ fontSize: 13, color: isExpired(p) ? '#dc2626' : '#374151', fontWeight: isExpired(p) ? 700 : 400 }}>
                      {p.expires_at ? formatDate(p.expires_at) : '—'}
                      {isExpired(p) && <div style={{ fontSize: 11, color: '#dc2626' }}>EXPIRED</div>}
                    </td>
                    <td><span className={`prl-badge ${p.status}`}>{p.status === 'Pending' ? p.status : p.status === 'Approved' ? '✅' : '❌'} {p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="prl-btn prl-btn-blue" onClick={() => { setSelected(p); setShowDetails(true); }}>View</button>
                        {p.status === 'Pending' && (
                          <button className="prl-btn prl-btn-green" onClick={() => openValidate(p)}>Validate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── DETAILS MODAL ─── */}
      {showDetails && selected && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selected.pet_name} — Details</h3>
              <button className="modal-close" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-section">Pet Information</p>
              <div className="modal-detail-grid">
                {[
                  ['Pre-Reg ID', selected.pre_reg_number],
                  ['Status', selected.status],
                  ['Pet Name', selected.pet_name],
                  ['Species', selected.species],
                  ['Breed', selected.breed || '—'],
                  ['Age', selected.age || '—'],
                  ['Color', selected.color || '—'],
                  ['Gender', selected.gender],
                  ['Pet Tag ID', selected.pet_tag_id || '—'],
                ].map(([l,v]) => (
                  <div key={l} className="modal-detail"><div className="modal-detail-lbl">{l}</div><div className="modal-detail-val">{v}</div></div>
                ))}
              </div>
              <p className="modal-section">Owner Information</p>
              <div className="modal-detail-grid">
                {[
                  ['Owner Name', selected.owner_name],
                  ['Contact No.', selected.contact_number],
                  ['Email', selected.owner_email || '—'],
                  ['Barangay', selected.barangay],
                  ['Address', selected.address],
                ].map(([l,v]) => (
                  <div key={l} className="modal-detail"><div className="modal-detail-lbl">{l}</div><div className="modal-detail-val">{v}</div></div>
                ))}
              </div>
              {selected.photo && (
                <>
                  <p className="modal-section">Pet Photo</p>
                  <img src={selected.photo} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }} alt="Pet" />
                </>
              )}
              {selected.status === 'Pending' && (
                <div style={{ marginTop: 16 }}>
                  <button className="modal-btn-primary" style={{ width: '100%' }} onClick={() => { setShowDetails(false); openValidate(selected); }}>
                    Proceed to Validate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── VALIDATION MODAL ─── */}
      {showValidate && selected && (
        <div className="modal-overlay" onClick={() => !submitting && setShowValidate(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {denyMode ? 'Deny Pre-Registration' : `Validate: ${selected.pet_name}`}
              </h3>
              <button className="modal-close" onClick={() => !submitting && setShowValidate(false)}>×</button>
            </div>

            <div className="modal-body">
              {/* success screen */}
              {valDone ? (
                <div style={{ textAlign: 'center' }}>
                  <div className="modal-success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} style={{ width: 40, height: 40 }}>
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#1f2937' }}>Pet Validated & Registered!</h3>
                  <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px' }}>{selected.pet_name} has been moved to the registered pets database and tagged to the owner's account.</p>
                  <div className="modal-tag-box">
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>Pet Tag ID Assigned</div>
                    <div className="modal-tag-val">{petTagId || '(Auto-assigned)'}</div>
                  </div>
                  <button className="modal-btn-primary" style={{ width: '100%' }} onClick={() => setShowValidate(false)}>Done</button>
                </div>
              ) : denyMode ? (
                <>
                  <div className="modal-alert warn">You are about to deny this pre-registration. Please provide a clear reason.</div>
                  <div className="modal-field">
                    <label className="modal-label">Reason for Denial *</label>
                    <textarea className="modal-textarea" rows={4} placeholder="e.g. Incomplete details, invalid information…" value={denyReason} onChange={e => setDenyReason(e.target.value)} />
                  </div>
                  <div className="modal-actions">
                    <button className="modal-btn-secondary" onClick={() => setDenyMode(false)}>← Cancel</button>
                    <button className="modal-btn-deny" onClick={handleDeny} disabled={submitting}>
                      {submitting ? <><span className="modal-spinner" />Denying…</> : 'Confirm Denial'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* step indicator */}
                  <div className="modal-steps">
                    {valSteps.map((s, i) => (
                      <div key={s.key} className={`modal-step ${valStep === s.key ? 'active' : i < valStepIdx ? 'done' : ''}`}>
                        <span className="modal-step-num">{i < valStepIdx ? '✓' : i + 1}</span>
                        {s.label}
                      </div>
                    ))}
                  </div>

                  {/* STEP 1: Review Details */}
                  {valStep === 'details' && (
                    <>
                      <p className="modal-section">Verify Submitted Information</p>
                      <div className="modal-detail-grid">
                        {[
                          ['Pet Name', selected.pet_name],
                          ['Species', selected.species],
                          ['Breed', selected.breed || '—'],
                          ['Age', selected.age || '—'],
                          ['Color', selected.color || '—'],
                          ['Gender', selected.gender],
                          ['Owner', selected.owner_name],
                          ['Contact', selected.contact_number],
                          ['Email', selected.owner_email || '—'],
                          ['Barangay', selected.barangay],
                        ].map(([l,v]) => (
                          <div key={l} className="modal-detail"><div className="modal-detail-lbl">{l}</div><div className="modal-detail-val">{v}</div></div>
                        ))}
                      </div>
                      <div className="modal-detail" style={{ marginBottom: 16 }}>
                        <div className="modal-detail-lbl">Address</div>
                        <div className="modal-detail-val">{selected.address}</div>
                      </div>
                      {isExpired(selected) && (
                        <div className="modal-alert warn">This pre-registration has <strong>expired</strong> (14-day window passed). You may still validate, but advise the owner accordingly.</div>
                      )}
                      <div className="modal-actions">
                        <button className="modal-btn-deny" onClick={() => setDenyMode(true)}>Deny</button>
                        <button className="modal-btn-primary" onClick={() => setValStep('photo')}>Next: Take Photo →</button>
                      </div>
                    </>
                  )}

                  {/* STEP 2: Photo */}
                  {valStep === 'photo' && (
                    <>
                      <p className="modal-section">Take / Upload Pet Photo</p>
                      <div className="modal-alert info">Please take a current photo of the pet during the CVO visit. This will be the official photo on record.</div>
                      <div className="modal-photo-upload" onClick={() => document.getElementById('val-photo-input')?.click()}>
                        <input id="val-photo-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoChange} />
                        {valPhoto ? (
                          <img src={valPhoto} className="modal-photo-preview" alt="Pet" />
                        ) : (
                          <div style={{ color: '#9ca3af' }}>
                            <div style={{ fontSize: 36, marginBottom: 8, display:"flex", justifyContent:"center" }}><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
                            <p style={{ margin: 0, fontSize: 13 }}>Click to capture or upload photo</p>
                          </div>
                        )}
                      </div>
                      {!valPhoto && selected.photo && (
                        <div style={{ marginTop: 10 }}>
                          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 6px' }}>Or use submitted photo:</p>
                          <img src={selected.photo} style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', opacity: .85 }} alt="Submitted" onClick={() => setValPhoto(selected.photo)} />
                        </div>
                      )}
                      <div className="modal-actions">
                        <button className="modal-btn-secondary" onClick={() => setValStep('details')}>← Back</button>
                        <button className="modal-btn-primary" onClick={() => setValStep('tag')}>Next: Assign Tag →</button>
                      </div>
                    </>
                  )}

                  {/* STEP 3: Pet Tag ID */}
                  {valStep === 'tag' && (
                    <>
                      <p className="modal-section">Assign Pet Tag ID</p>
                      <div className="modal-alert info">Enter the official Pet Tag ID from the physical tag that will be attached to the animal.</div>
                      <div className="modal-field">
                        <label className="modal-label">Pet Tag ID *</label>
                        <input className="modal-input" placeholder="e.g. TAG-2024-00123" value={petTagId} onChange={e => setPetTagId(e.target.value)} />
                      </div>
                      <div className="modal-actions">
                        <button className="modal-btn-secondary" onClick={() => setValStep('photo')}>← Back</button>
                        <button className="modal-btn-primary" onClick={() => { if (!petTagId.trim()) { toast.error('Please enter a Pet Tag ID'); return; } setValStep('confirm'); }}>
                          Next: Confirm →
                        </button>
                      </div>
                    </>
                  )}

                  {/* STEP 4: Confirm */}
                  {valStep === 'confirm' && (
                    <>
                      <p className="modal-section">Confirm Validation</p>
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        {[
                          ['Pet Name', selected.pet_name],
                          ['Species', selected.species],
                          ['Owner', selected.owner_name],
                          ['Pet Tag ID', petTagId],
                          ['Photo', valPhoto ? 'Photo uploaded' : '(Using submitted photo)'],
                        ].map(([k,v]) => (
                          <div key={k} className="modal-confirm-row">
                            <span className="modal-confirm-key">{k}</span>
                            <span className="modal-confirm-val">{v}</span>
                          </div>
                        ))}
                      </div>
                      {valPhoto && (
                        <img src={valPhoto} style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} alt="Pet" />
                      )}
                      <div className="modal-alert warn">
                        By confirming, this pet will be <strong>officially registered</strong> and moved from the pre-registration list to the active pets database. This action cannot be undone.
                      </div>
                      <div className="modal-actions">
                        <button className="modal-btn-secondary" onClick={() => setValStep('tag')}>← Back</button>
                        <button className="modal-btn-primary" onClick={handleApprove} disabled={submitting}>
                          {submitting ? <><span className="modal-spinner" />Saving…</> : '✅ Confirm & Register Pet'}
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
    </>
  );
}

export default PreRegisteredPets;
