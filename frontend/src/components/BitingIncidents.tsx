import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Incident {
  id: string;
  pet_id?: string;
  pet_name: string;
  incident_date: string;
  location: string;
  bitten_person: string;
  owner_name?: string;
  confirmed_rabies: boolean;
  vaccinated: boolean;
  remarks?: string;
  observation_start?: string;
  observation_end?: string;
  observation_update?: string;
  status: string;
  reported_by?: string;
  created_at: string;
}

interface Props {
  userRole: string;
}

const S = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes popIn  { 0%{transform:scale(.8);opacity:0} 70%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }

  .bi-wrap { padding:0; }
  .bi-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px; }
  .bi-title  { font-size:22px; font-weight:900; color:#1f2937; display:flex; align-items:center; gap:10px; }
  .bi-sub    { font-size:13px; color:#6b7280; margin:4px 0 0; }
  .bi-btn-primary { height:42px; padding:0 18px; background:linear-gradient(135deg,#dc2626,#b91c1c); color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 4px 14px rgba(220,38,38,.3); transition:transform .18s; display:flex; align-items:center; gap:6px; }
  .bi-btn-primary:hover { transform:translateY(-1px); }
  .bi-alert-banner { background:#fff8ed; border:1.5px solid #fbbf24; border-radius:14px; padding:16px 20px; margin-bottom:16px; display:flex; align-items:flex-start; gap:12px; animation:fadeUp .3s both; }
  .bi-alert-dot { width:10px; height:10px; border-radius:50%; background:#ef4444; animation:pulse 1.5s infinite; flex-shrink:0; margin-top:4px; }
  .bi-stats  { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:18px; }
  .bi-stat   { background:#fff; border-radius:14px; padding:16px 20px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .bi-stat-val { font-size:28px; font-weight:900; }
  .bi-stat-lbl { font-size:12px; color:#6b7280; font-weight:600; margin-top:2px; }
  .bi-toolbar { background:#fff; border-radius:14px; padding:14px 18px; margin-bottom:14px; display:flex; gap:10px; flex-wrap:wrap; box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .bi-search  { flex:1; min-width:180px; height:40px; border:1.5px solid #e5e7eb; border-radius:10px; padding:0 12px; font-size:14px; outline:none; }
  .bi-search:focus { border-color:#dc2626; }
  .bi-tab     { height:38px; padding:0 14px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; color:#6b7280; font-size:13px; font-weight:700; cursor:pointer; transition:all .18s; }
  .bi-tab.active { background:#dc2626; border-color:#dc2626; color:#fff; }
  .bi-table-wrap { background:#fff; border-radius:14px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden; }
  .bi-table   { width:100%; border-collapse:collapse; }
  .bi-table th { background:#f8fafc; padding:11px 14px; text-align:left; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#64748b; border-bottom:1.5px solid #e2e8f0; }
  .bi-table td { padding:13px 14px; border-bottom:1px solid #f1f5f9; font-size:13.5px; color:#374151; vertical-align:middle; }
  .bi-table tr:last-child td { border-bottom:none; }
  .bi-table tr:hover td { background:#fef9f9; }
  .bi-badge   { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11.5px; font-weight:700; }
  .bi-badge.open    { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
  .bi-badge.closed  { background:#dcfce7; color:#14532d; border:1px solid #86efac; }
  .bi-badge.yes     { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
  .bi-badge.no      { background:#f0fdf4; color:#15803d; border:1px solid #86efac; }
  .bi-badge.obs     { background:#fff8ed; color:#92400e; border:1px solid #fde68a; }
  .bi-act     { height:32px; padding:0 12px; border-radius:8px; border:none; font-size:12.5px; font-weight:700; cursor:pointer; transition:all .18s; }
  .bi-act-edit { background:#eff6ff; color:#2B5EA6; }
  .bi-act-edit:hover { background:#2B5EA6; color:#fff; }
  .bi-act-del  { background:#fee2e2; color:#dc2626; }
  .bi-act-del:hover  { background:#dc2626; color:#fff; }
  .bi-empty   { text-align:center; padding:56px 20px; color:#9ca3af; }
  .bi-spinner { display:inline-block; width:32px; height:32px; border-radius:50%; border:3px solid #f1f5f9; border-top-color:#dc2626; animation:spin .7s linear infinite; margin-bottom:12px; }

  /* modal */
  .bi-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .bi-modal   { background:#fff; border-radius:20px; width:100%; max-width:620px; max-height:90vh; overflow-y:auto; box-shadow:0 30px 80px rgba(0,0,0,.22); animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both; }
  .bi-modal-hd{ display:flex; align-items:center; justify-content:space-between; padding:22px 26px 0; }
  .bi-modal-title { font-size:18px; font-weight:900; color:#1f2937; }
  .bi-modal-close { width:32px; height:32px; border-radius:50%; border:none; background:#f1f5f9; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; }
  .bi-modal-close:hover { background:#e2e8f0; }
  .bi-modal-bd{ padding:22px 26px; }
  .bi-section { font-size:10.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#dc2626; margin:0 0 12px; padding-bottom:5px; border-bottom:1.5px solid #fee2e2; }
  .bi-grid    { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .bi-field   { display:flex; flex-direction:column; gap:5px; }
  .bi-label   { font-size:12px; font-weight:700; color:#374151; }
  .bi-input,.bi-select,.bi-textarea { border:1.5px solid #e5e7eb; border-radius:9px; background:#f9fafb; font-size:13.5px; outline:none; font-family:inherit; transition:border-color .18s; }
  .bi-input,.bi-select { height:42px; padding:0 11px; }
  .bi-textarea { padding:9px 11px; resize:none; line-height:1.6; }
  .bi-input:focus,.bi-select:focus,.bi-textarea:focus { border-color:#dc2626; background:#fff; box-shadow:0 0 0 3px rgba(220,38,38,.08); }
  .bi-checkbox-row { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
  .bi-checkbox-row label { font-size:13.5px; font-weight:600; color:#374151; cursor:pointer; display:flex; align-items:center; gap:7px; }
  .bi-modal-actions { display:flex; gap:10px; margin-top:20px; }
  .bi-modal-save { flex:1; height:44px; border:none; border-radius:10px; background:linear-gradient(135deg,#dc2626,#b91c1c); color:#fff; font-size:14px; font-weight:800; cursor:pointer; transition:transform .18s; box-shadow:0 6px 18px rgba(220,38,38,.25); }
  .bi-modal-save:hover:not(:disabled) { transform:translateY(-1px); }
  .bi-modal-save:disabled { background:#d1d5db; color:#9ca3af; box-shadow:none; cursor:not-allowed; }
  .bi-modal-cancel { height:44px; padding:0 18px; border:1.5px solid #e5e7eb; border-radius:10px; background:#fff; color:#374151; font-size:14px; font-weight:700; cursor:pointer; transition:all .18s; }
  .bi-modal-cancel:hover { border-color:#dc2626; color:#dc2626; }
  .bi-obs-box { background:#fff8ed; border:1.5px solid #fbbf24; border-radius:10px; padding:14px 16px; margin-bottom:14px; font-size:13px; color:#92400e; line-height:1.7; }
  @media(max-width:580px){ .bi-stats{grid-template-columns:1fr 1fr;} .bi-grid{grid-template-columns:1fr;} }
`;

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}
function daysLeft(end?: string) {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

const EMPTY_FORM = {
  petId:'', petName:'', incidentDate:'', location:'', bittenPerson:'',
  ownerName:'', confirmedRabies:false, vaccinated:false, remarks:'',
  status:'Open', observationUpdate:'',
};

export function BitingIncidents({ userRole }: Props) {
  const canEdit   = ['admin','superadmin','cityHealth'].includes(userRole);
  const canDelete = ['admin','superadmin'].includes(userRole);

  const [list, setList]       = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [tabFilter, setTabFilter] = useState<'All'|'Open'|'Closed'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<Incident|null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/biting-incidents');
      const d = await r.json();
      setList(d.incidents || []);
    } catch { toast.error('Failed to load biting incidents'); }
    finally { setLoading(false); }
  };

  const filtered = list.filter(i => {
    const matchTab = tabFilter === 'All' || i.status === tabFilter;
    const matchSearch = !search || [i.pet_name, i.bitten_person, i.location, i.owner_name||'']
      .some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchTab && matchSearch;
  });

  // Alerts: incidents where observation window is active
  const observing = list.filter(i => {
    if (!i.observation_end) return false;
    const dl = daysLeft(i.observation_end);
    return dl !== null && dl >= 0 && i.status === 'Open';
  });
  const overdueObs = list.filter(i => {
    if (!i.observation_end) return false;
    const dl = daysLeft(i.observation_end);
    return dl !== null && dl < 0 && i.status === 'Open' && !i.observation_update;
  });

  const openEdit = (inc: Incident) => {
    setEditing(inc);
    setForm({
      petId: inc.pet_id || '',
      petName: inc.pet_name,
      incidentDate: inc.incident_date?.split('T')[0] || '',
      location: inc.location,
      bittenPerson: inc.bitten_person,
      ownerName: inc.owner_name || '',
      confirmedRabies: inc.confirmed_rabies,
      vaccinated: inc.vaccinated,
      remarks: inc.remarks || '',
      status: inc.status,
      observationUpdate: inc.observation_update || '',
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.petName.trim()) { toast.error('Pet name is required'); return; }
    if (!form.incidentDate)   { toast.error('Incident date is required'); return; }
    if (!form.location.trim()){ toast.error('Location is required'); return; }
    if (!form.bittenPerson.trim()){ toast.error('Bitten person is required'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/biting-incidents/${editing.id}` : '/api/biting-incidents';
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      toast.success(editing ? 'Incident updated!' : 'Incident reported!');
      setShowModal(false);
      load();
    } catch(e:any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this incident record?')) return;
    try {
      await fetch(`/api/biting-incidents/${id}`, { method:'DELETE' });
      toast.success('Deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const open = list.filter(i => i.status==='Open').length;
  const rabies = list.filter(i => i.confirmed_rabies).length;
  const thisYear = list.filter(i => new Date(i.incident_date).getFullYear() === new Date().getFullYear()).length;

  return (
    <>
      <style>{S}</style>
      <div className="bi-wrap">

        {/* header */}
        <div className="bi-header">
          <div>
            <h1 className="bi-title">Biting Incident Reports</h1>
            <p className="bi-sub">Track animal biting cases, 14-day observation windows, and rabies status</p>
          </div>
          {canEdit && (
            <button className="bi-btn-primary" onClick={openNew}>＋ Report Incident</button>
          )}
        </div>

        {/* observation alerts */}
        {overdueObs.length > 0 && (
          <div className="bi-alert-banner" style={{background:'#fef2f2',borderColor:'#fca5a5'}}>
            <div className="bi-alert-dot" />
            <div>
              <p style={{margin:'0 0 4px',fontWeight:800,color:'#991b1b',fontSize:14}}>
                {overdueObs.length} Observation Period Ended — Update Required!
              </p>
              <p style={{margin:0,color:'#991b1b',fontSize:13}}>
                The following pets have completed their 14-day observation but no update has been recorded:&nbsp;
                <strong>{overdueObs.map(i => i.pet_name).join(', ')}</strong>. Please add an observation update.
              </p>
            </div>
          </div>
        )}
        {observing.length > 0 && (
          <div className="bi-alert-banner">
            <div className="bi-alert-dot" style={{background:'#f59e0b'}} />
            <div>
              <p style={{margin:'0 0 4px',fontWeight:800,color:'#92400e',fontSize:14}}>
                {observing.length} Pet(s) Under 14-Day Observation
              </p>
              {observing.map(i => (
                <p key={i.id} style={{margin:'2px 0',color:'#92400e',fontSize:13}}>
                  • <strong>{i.pet_name}</strong> — observation ends {fmt(i.observation_end)}&nbsp;
                  ({daysLeft(i.observation_end)} day{daysLeft(i.observation_end)===1?'':'s'} remaining)
                </p>
              ))}
            </div>
          </div>
        )}

        {/* stats */}
        <div className="bi-stats">
          <div className="bi-stat"><div className="bi-stat-val" style={{color:'#dc2626'}}>{list.length}</div><div className="bi-stat-lbl">Total Incidents</div></div>
          <div className="bi-stat"><div className="bi-stat-val" style={{color:'#f59e0b'}}>{open}</div><div className="bi-stat-lbl">Open Cases</div></div>
          <div className="bi-stat"><div className="bi-stat-val" style={{color:'#7c3aed'}}>{rabies}</div><div className="bi-stat-lbl">Confirmed Rabies</div></div>
          <div className="bi-stat"><div className="bi-stat-val" style={{color:'#2B5EA6'}}>{thisYear}</div><div className="bi-stat-lbl">This Year</div></div>
        </div>

        {/* toolbar */}
        <div className="bi-toolbar">
          <input className="bi-search" placeholder="Search pet, person, location…" value={search} onChange={e=>setSearch(e.target.value)} />
          {(['All','Open','Closed'] as const).map(t => (
            <button key={t} className={`bi-tab ${tabFilter===t?'active':''}`} onClick={()=>setTabFilter(t)}>{t}</button>
          ))}
        </div>

        {/* table */}
        <div className="bi-table-wrap">
          {loading ? (
            <div className="bi-empty"><div className="bi-spinner"/><p>Loading incidents…</p></div>
          ) : filtered.length === 0 ? (
            <div className="bi-empty"><div style={{fontSize:40,marginBottom:10}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-4"/><path d="M17 2l5 5-10 10H7v-5z"/></svg></div><p>No biting incidents found.</p></div>
          ) : (
            <table className="bi-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pet</th>
                  <th>Bitten Person</th>
                  <th>Location</th>
                  <th>Rabies</th>
                  <th>Vaccinated</th>
                  <th>Observation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inc => {
                  const dl = daysLeft(inc.observation_end);
                  const isOverdue = dl !== null && dl < 0 && inc.status==='Open' && !inc.observation_update;
                  return (
                    <tr key={inc.id} style={isOverdue ? {background:'#fff5f5'} : {}}>
                      <td style={{whiteSpace:'nowrap'}}>{fmt(inc.incident_date)}</td>
                      <td>
                        <div style={{fontWeight:700}}>{inc.pet_name}</div>
                        {inc.owner_name && <div style={{fontSize:11,color:'#9ca3af'}}>{inc.owner_name}</div>}
                      </td>
                      <td>{inc.bitten_person}</td>
                      <td style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inc.location}</td>
                      <td><span className={`bi-badge ${inc.confirmed_rabies?'yes':'no'}`}>{inc.confirmed_rabies?'⚠️ Yes':'No'}</span></td>
                      <td><span className={`bi-badge ${inc.vaccinated?'no':'yes'}`}>{inc.vaccinated?'✅ Yes':'❌ No'}</span></td>
                      <td>
                        {inc.observation_end ? (
                          <span className={`bi-badge ${isOverdue?'yes':dl!==null&&dl>=0?'obs':'no'}`}>
                            {isOverdue ? 'Overdue' : dl!==null&&dl>=0 ? `${dl}d left` : 'Done'}
                          </span>
                        ) : '—'}
                      </td>
                      <td><span className={`bi-badge ${inc.status==='Open'?'open':'closed'}`}>{inc.status}</span></td>
                      <td>
                        <div style={{display:'flex',gap:5}}>
                          {canEdit && <button className="bi-act bi-act-edit" onClick={()=>openEdit(inc)}>Edit</button>}
                          {canDelete && <button className="bi-act bi-act-del" onClick={()=>handleDelete(inc.id)}>Del</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div className="bi-overlay" onClick={()=>!saving&&setShowModal(false)}>
          <div className="bi-modal" onClick={e=>e.stopPropagation()}>
            <div className="bi-modal-hd">
              <h3 className="bi-modal-title">{editing ? 'Edit Incident Report' : 'Report Biting Incident'}</h3>
              <button className="bi-modal-close" onClick={()=>!saving&&setShowModal(false)}>×</button>
            </div>
            <div className="bi-modal-bd">

              {/* Observation update banner when editing overdue */}
              {editing && editing.observation_end && daysLeft(editing.observation_end) !== null && daysLeft(editing.observation_end)! < 0 && !editing.observation_update && (
                <div className="bi-obs-box">
                  <strong>14-Day Observation Period Ended</strong> — Please provide an observation update below.
                  The pet has been flagged as <em>not to be vaccinated this year</em>.
                </div>
              )}

              <p className="bi-section">Incident Details</p>
              <div className="bi-grid">
                <div className="bi-field">
                  <label className="bi-label">Pet Name *</label>
                  <input className="bi-input" value={form.petName} onChange={e=>setForm(p=>({...p,petName:e.target.value}))} placeholder="e.g. Bantay" />
                </div>
                <div className="bi-field">
                  <label className="bi-label">Pet ID (if registered)</label>
                  <input className="bi-input" value={form.petId} onChange={e=>setForm(p=>({...p,petId:e.target.value}))} placeholder="BLU-000-00001" />
                </div>
                <div className="bi-field">
                  <label className="bi-label">Date of Incident *</label>
                  <input className="bi-input" type="date" value={form.incidentDate} onChange={e=>setForm(p=>({...p,incidentDate:e.target.value}))} />
                </div>
                <div className="bi-field">
                  <label className="bi-label">Location of Biting *</label>
                  <input className="bi-input" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Barangay / Street / Area" />
                </div>
                <div className="bi-field">
                  <label className="bi-label">Person Bitten (Who Bit) *</label>
                  <input className="bi-input" value={form.bittenPerson} onChange={e=>setForm(p=>({...p,bittenPerson:e.target.value}))} placeholder="Full name of victim" />
                </div>
                <div className="bi-field">
                  <label className="bi-label">Pet Owner</label>
                  <input className="bi-input" value={form.ownerName} onChange={e=>setForm(p=>({...p,ownerName:e.target.value}))} placeholder="Owner name" />
                </div>
              </div>

              <p className="bi-section" style={{marginTop:8}}>Medical Status</p>
              <div className="bi-checkbox-row">
                <label>
                  <input type="checkbox" checked={form.confirmedRabies} onChange={e=>setForm(p=>({...p,confirmedRabies:e.target.checked}))} />
                  Confirmed Rabies
                </label>
                <label style={{marginLeft:20}}>
                  <input type="checkbox" checked={form.vaccinated} onChange={e=>setForm(p=>({...p,vaccinated:e.target.checked}))} />
                  Pet was Vaccinated
                </label>
              </div>

              <div className="bi-field" style={{marginBottom:12}}>
                <label className="bi-label">Remarks & Report</label>
                <textarea className="bi-textarea" rows={3} value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} placeholder="Full report details, actions taken, referrals…" />
              </div>

              {editing && (
                <>
                  <p className="bi-section" style={{marginTop:8}}>Observation Update</p>
                  <div className="bi-grid">
                    <div className="bi-field">
                      <label className="bi-label">Case Status</label>
                      <select className="bi-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                        <option>Open</option>
                        <option>Closed</option>
                      </select>
                    </div>
                    <div style={{gridColumn:'1/-1'}} className="bi-field">
                      <label className="bi-label">14-Day Observation Update</label>
                      <textarea className="bi-textarea" rows={3} value={form.observationUpdate} onChange={e=>setForm(p=>({...p,observationUpdate:e.target.value}))} placeholder="State of the animal after 14-day observation period…" />
                    </div>
                  </div>
                </>
              )}

              {!editing && form.incidentDate && (
                <div style={{background:'#fff8ed',border:'1.5px solid #fbbf24',borderRadius:10,padding:'10px 14px',fontSize:12.5,color:'#92400e',marginBottom:12}}>
                  <strong>14-Day Observation</strong> will be set from <strong>{new Date(form.incidentDate).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</strong> to&nbsp;
                  <strong>{new Date(new Date(form.incidentDate).getTime()+14*86400000).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</strong>.
                  The City Vet will be notified. The pet's vaccination status will be flagged this year.
                </div>
              )}

              <div className="bi-modal-actions">
                <button className="bi-modal-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="bi-modal-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update Report' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BitingIncidents;
