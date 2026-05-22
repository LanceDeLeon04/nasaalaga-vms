import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { User } from '../App';

interface Props { user: User; }

const S = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes popIn  { 0%{transform:scale(.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
  .vm-wrap { padding:0; animation:fadeUp .35s both; }
  .vm-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px; }
  .vm-title  { font-size:22px; font-weight:900; color:#1f2937; display:flex; align-items:center; gap:10px; }
  .vm-sub    { font-size:13px; color:#6b7280; margin:4px 0 0; }
  .vm-grid   { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .vm-panel  { background:#fff; border-radius:16px; box-shadow:0 2px 10px rgba(0,0,0,.07); padding:24px; }
  .vm-panel-title { font-size:14px; font-weight:800; color:#1f2937; margin:0 0 16px; display:flex; align-items:center; gap:8px; border-bottom:2px solid #f1f5f9; padding-bottom:10px; }
  .vm-section { font-size:10.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#2B5EA6; margin:16px 0 10px; padding-bottom:5px; border-bottom:1.5px solid #e8f0fb; }
  .vm-field  { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
  .vm-label  { font-size:12px; font-weight:700; color:#374151; }
  .vm-label .req { color:#ef4444; }
  .vm-input, .vm-select { height:44px; padding:0 12px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; font-size:14px; outline:none; font-family:inherit; transition:border-color .18s,box-shadow .18s; }
  .vm-input:focus, .vm-select:focus { border-color:#2B5EA6; background:#fff; box-shadow:0 0 0 3px rgba(43,94,166,.1); }
  .vm-input:disabled { background:#f3f4f6; color:#9ca3af; cursor:not-allowed; }
  .vm-input::placeholder { color:#c4cad6; }
  .vm-scan-row { display:flex; gap:8px; }
  .vm-scan-row .vm-input { flex:1; }
  .vm-scan-btn { height:44px; padding:0 14px; border:1.5px solid #2B5EA6; border-radius:10px; background:#eff6ff; color:#2B5EA6; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .18s; white-space:nowrap; }
  .vm-scan-btn:hover { background:#2B5EA6; color:#fff; }
  .vm-pet-card { background:#f0f7ff; border:1.5px solid #bfdbfe; border-radius:12px; padding:14px 16px; margin-bottom:14px; animation:popIn .3s both; }
  .vm-pet-name { font-size:17px; font-weight:900; color:#1e3a6e; margin:0 0 6px; }
  .vm-pet-row { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .vm-pet-item { font-size:12px; color:#374151; }
  .vm-pet-item span { font-weight:700; }
  .vm-vax-card { background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:12px 16px; margin-bottom:14px; animation:popIn .3s both; }
  .vm-vax-name { font-size:15px; font-weight:800; color:#14532d; margin:0 0 4px; }
  .vm-vax-detail { font-size:12px; color:#166534; }
  .vm-qty-badge { display:inline-block; background:#dcfce7; color:#14532d; border:1px solid #86efac; border-radius:20px; padding:2px 10px; font-size:11.5px; font-weight:700; margin-left:8px; }
  .vm-qty-low   { background:#fee2e2; color:#991b1b; border-color:#fca5a5; }
  .vm-submit { width:100%; height:50px; border:none; border-radius:12px; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; font-size:15px; font-weight:900; cursor:pointer; box-shadow:0 8px 24px rgba(22,163,74,.28); transition:transform .18s; margin-top:8px; }
  .vm-submit:hover:not(:disabled) { transform:translateY(-2px); }
  .vm-submit:disabled { background:#d1d5db; color:#9ca3af; box-shadow:none; cursor:not-allowed; }
  .vm-spinner { display:inline-block; width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; animation:spin .6s linear infinite; vertical-align:middle; margin-right:6px; }
  .vm-history { background:#fff; border-radius:16px; box-shadow:0 2px 10px rgba(0,0,0,.07); overflow:hidden; margin-top:20px; }
  .vm-history-hd { padding:16px 20px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; }
  .vm-history-title { font-size:15px; font-weight:800; color:#1f2937; }
  .vm-table   { width:100%; border-collapse:collapse; }
  .vm-table th { background:#f8fafc; padding:10px 14px; text-align:left; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#64748b; border-bottom:1.5px solid #e2e8f0; }
  .vm-table td { padding:12px 14px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#374151; }
  .vm-table tr:last-child td { border-bottom:none; }
  .vm-empty { text-align:center; padding:40px; color:#9ca3af; font-size:14px; }
  .vm-success { background:#f0fdf4; border:2px solid #16a34a; border-radius:14px; padding:20px; text-align:center; animation:popIn .4s both; }
  .vm-success-icon { font-size:48px; margin-bottom:10px; }
  .vm-success-title { font-size:18px; font-weight:900; color:#14532d; margin:0 0 6px; }
  .vm-success-sub { font-size:13px; color:#166534; }
  .vm-vet-badge { background:#eff6ff; border:1.5px solid #bfdbfe; border-radius:10px; padding:10px 14px; margin-bottom:16px; font-size:13px; color:#1e40af; }
  .vm-vet-badge strong { display:block; font-size:14px; font-weight:800; color:#1e3a6e; }
  @media(max-width:700px){ .vm-grid{grid-template-columns:1fr;} }
`;

function fmt(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}); }
  catch { return d; }
}

export function VaccinationModule({ user }: Props) {
  // Vaccine scanning state
  const [vaccineBarcode, setVaccineBarcode] = useState('');
  const [vaccine, setVaccine]           = useState<any>(null);
  const [vaccineLoading, setVaccineLoading] = useState(false);

  // Pet lookup state
  const [petIdInput, setPetIdInput] = useState('');
  const [pet, setPet]               = useState<any>(null);
  const [petLoading, setPetLoading] = useState(false);

  // Form state
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState(false);
  const [lastRecord, setLastRecord] = useState<any>(null);

  // History
  const [history, setHistory]       = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const vaccineRef = useRef<HTMLInputElement>(null);
  const petRef     = useRef<HTMLInputElement>(null);

  // Auto-fill today
  const today = new Date().toISOString().split('T')[0];

  // Scan vaccine barcode
  const lookupVaccine = async (barcode?: string) => {
    const code = (barcode || vaccineBarcode).trim();
    if (!code) return;
    setVaccineLoading(true);
    try {
      const d = await api.lookupVaccineBarcode(code);
      setVaccine(d.medicine);
      toast.success(`Vaccine found: ${d.medicine.name}`);
    } catch {
      toast.error('Vaccine not found. Check barcode.');
      setVaccine(null);
    } finally { setVaccineLoading(false); }
  };

  // Handle Enter on vaccine input
  const onVaccineKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') lookupVaccine();
  };

  // Lookup pet by ID
  const lookupPet = async (id?: string) => {
    const pid = (id || petIdInput).trim().toUpperCase();
    if (!pid) return;
    setPetLoading(true);
    try {
      const d = await api.getPetById(pid);
      setPet(d.pet);
      toast.success(`Pet found: ${d.pet.pet_name}`);
      // Load history
      setHistoryLoading(true);
      const h = await api.getVaccinationHistory(d.pet.id);
      setHistory(h.history || []);
      setHistoryLoading(false);
    } catch {
      toast.error('Pet not found. Check the ID or scan the card barcode.');
      setPet(null);
      setHistory([]);
    } finally { setPetLoading(false); }
  };

  const onPetKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') lookupPet();
  };

  const canSubmit = vaccine && pet && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await api.recordVaccination({
        petId: pet.id,
        vaccineBarcode: vaccine.barcode,
        vaccineName: vaccine.name,
        lotNumber: vaccine.lot_number,
        batchNumber: vaccine.lot_number,
        medicineId: vaccine.id,
        dateOfVaccination: today,
        notes,
      });
      setLastRecord(res);
      setSuccess(true);
      toast.success(`Vaccination recorded for ${pet.pet_name}!`);
      // Refresh history
      const h = await api.getVaccinationHistory(pet.id);
      setHistory(h.history || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to record vaccination');
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setVaccineBarcode(''); setVaccine(null);
    setPetIdInput(''); setPet(null);
    setNotes(''); setSuccess(false); setLastRecord(null);
    setHistory([]);
    setTimeout(() => vaccineRef.current?.focus(), 100);
  };

  return (
    <>
      <style>{S}</style>
      <div className="vm-wrap">
        <div className="vm-header">
          <div>
            <h1 className="vm-title" style={{display:"flex",alignItems:"center",gap:8}}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v2m4-2v2M5 10l14 4-3 3-5-5-3 3-3-5z"/><path d="m18 14-3 3"/><path d="m6 18 2 2 4-4"/></svg>Vaccination Module</h1>
            <p className="vm-sub">Scan vaccine and pet ID to record vaccinations — auto-deducts inventory</p>
          </div>
        </div>

        {/* Vet info badge */}
        <div className="vm-vet-badge">
          <strong style={{display:"flex",alignItems:"center",gap:4}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{user.username}</strong>
          Administering Veterinarian — logged in · Date: {new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        </div>

        {success && lastRecord ? (
          <div className="vm-success">
            <div className="vm-success-icon"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg></div>
            <div className="vm-success-title">Vaccination Recorded Successfully!</div>
            <div className="vm-success-sub">
              <strong>{pet?.pet_name}</strong> vaccinated with <strong>{vaccine?.name}</strong><br/>
              Veterinarian: {lastRecord.vetName} · Lic: {lastRecord.vetLicense || 'N/A'}<br/>
              Inventory deducted by 1 unit.
            </div>
            <button onClick={resetForm} style={{marginTop:16,padding:'10px 24px',background:'#16a34a',color:'#fff',border:'none',borderRadius:10,fontWeight:800,cursor:'pointer',fontSize:14}}>
              Record Another Vaccination
            </button>
          </div>
        ) : (
          <div className="vm-grid">

            {/* LEFT — Vaccine */}
            <div className="vm-panel">
              <div className="vm-panel-title" style={{display:"flex",alignItems:"center",gap:6}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 0 0-7.07-7.07l-10 10a4.95 4.95 0 0 0 7.07 7.07Z"/><path d="m8.5 8.5 7 7"/></svg>Step 1: Scan Vaccine Barcode</div>
              <p className="vm-section">Vaccine</p>
              <div className="vm-field">
                <label className="vm-label">Vaccine Barcode <span className="req">*</span></label>
                <div className="vm-scan-row">
                  <input
                    ref={vaccineRef}
                    className="vm-input"
                    placeholder="Scan or type vaccine barcode…"
                    value={vaccineBarcode}
                    onChange={e => setVaccineBarcode(e.target.value)}
                    onKeyDown={onVaccineKey}
                    autoFocus
                  />
                  <button className="vm-scan-btn" onClick={() => lookupVaccine()}>
                    {vaccineLoading ? <span className="vm-spinner"/> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>} Lookup
                  </button>
                </div>
                <p style={{fontSize:11,color:'#9ca3af',margin:'4px 0 0'}}>Focus this field and scan barcode on the vaccine vial, or type the code.</p>
              </div>

              {vaccine && (
                <div className="vm-vax-card">
                  <div className="vm-vax-name">
                    {vaccine.name}
                    <span className={`vm-qty-badge ${vaccine.quantity <= vaccine.reorder_level ? 'vm-qty-low' : ''}`}>
                      {vaccine.quantity} {vaccine.unit} remaining
                    </span>
                  </div>
                  <div className="vm-vax-detail">Generic: {vaccine.generic_name || '—'}</div>
                  <div className="vm-vax-detail">Lot No: {vaccine.lot_number || '—'} · Expires: {fmt(vaccine.expiry_date)}</div>
                  <div className="vm-vax-detail">Category: {vaccine.category} · {vaccine.type}</div>
                  {vaccine.quantity === 0 && (
                    <div style={{marginTop:8,color:"#dc2626",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:4}}><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Out of stock! Cannot administer.</div>
                  )}
                </div>
              )}

              <p className="vm-section" style={{marginTop:8}}>Auto-Filled Details</p>
              <div className="vm-field">
                <label className="vm-label">Date of Vaccination</label>
                <input className="vm-input" value={new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})} disabled />
              </div>
              <div className="vm-field">
                <label className="vm-label">Administering Veterinarian</label>
                <input className="vm-input" value={user.username} disabled />
              </div>
              <div className="vm-field">
                <label className="vm-label">Notes (Optional)</label>
                <input className="vm-input" placeholder="Any additional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            {/* RIGHT — Pet */}
            <div className="vm-panel">
              <div className="vm-panel-title" style={{display:"flex",alignItems:"center",gap:6}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>Step 2: Identify Pet</div>
              <p className="vm-section">Pet Lookup</p>
              <div className="vm-field">
                <label className="vm-label">Pet ID <span className="req">*</span></label>
                <div className="vm-scan-row">
                  <input
                    ref={petRef}
                    className="vm-input"
                    placeholder="Scan booklet barcode or type Pet ID…"
                    value={petIdInput}
                    onChange={e => setPetIdInput(e.target.value.toUpperCase())}
                    onKeyDown={onPetKey}
                  />
                  <button className="vm-scan-btn" onClick={() => lookupPet()}>
                    {petLoading ? <span className="vm-spinner"/> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>} Lookup
                  </button>
                </div>
                <p style={{fontSize:11,color:'#9ca3af',margin:'4px 0 0'}}>Scan the barcode on the vaccination booklet or type the Pet ID (e.g. PET-001).</p>
              </div>

              {pet && (
                <div className="vm-pet-card">
                  <div className="vm-pet-name">{pet.pet_name}</div>
                  <div className="vm-pet-row">
                    <div className="vm-pet-item">Species: <span>{pet.species}</span></div>
                    <div className="vm-pet-item">Breed: <span>{pet.breed || '—'}</span></div>
                    <div className="vm-pet-item">Age: <span>{pet.age || '—'}</span></div>
                    <div className="vm-pet-item">Gender: <span>{pet.gender || '—'}</span></div>
                    <div className="vm-pet-item">Owner: <span>{pet.owner_name || '—'}</span></div>
                    <div className="vm-pet-item">Barangay: <span>{pet.barangay || '—'}</span></div>
                    <div className="vm-pet-item">Pet ID: <span style={{fontFamily:'monospace'}}>{pet.id}</span></div>
                    <div className="vm-pet-item">Tag ID: <span style={{fontFamily:'monospace'}}>{pet.pet_tag_id || '—'}</span></div>
                  </div>
                  <div style={{marginTop:8,fontSize:12}}>
                    Current Status: <strong style={{color: pet.vaccination_status==='Vaccinated'?'#16a34a':'#dc2626'}}>{pet.vaccination_status}</strong>
                    {pet.last_vaccination_date && <span style={{color:'#6b7280',marginLeft:8}}>Last vax: {fmt(pet.last_vaccination_date)}</span>}
                  </div>
                  {pet.vaccination_status?.includes('Observation') && (
                    <div style={{marginTop:8,background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#991b1b',fontWeight:700}}>
                      This pet is under biting incident observation. Vaccination is not recommended this year.
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button className="vm-submit" onClick={handleSubmit} disabled={!canSubmit || vaccine?.quantity === 0}>
                {saving ? <><span className="vm-spinner"/>Recording…</> : <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:"inline",marginRight:4}}><path d="M10 2v2m4-2v2M5 10l14 4-3 3-5-5-3 3-3-5z"/><path d="m18 14-3 3"/></svg>Record Vaccination &amp; Deduct Inventory</>}
              </button>

              {!vaccine && <p style={{fontSize:12,color:'#9ca3af',textAlign:'center',marginTop:8}}>Scan a vaccine first</p>}
              {!pet && vaccine && <p style={{fontSize:12,color:'#9ca3af',textAlign:'center',marginTop:8}}>Then scan or enter the Pet ID</p>}
            </div>
          </div>
        )}

        {/* Vaccination History for looked-up pet */}
        {pet && history.length > 0 && (
          <div className="vm-history">
            <div className="vm-history-hd">
              <div className="vm-history-title" style={{display:"flex",alignItems:"center",gap:6}}><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Vaccination History — {pet.pet_name}</div>
              <span style={{fontSize:12,color:'#6b7280'}}>{history.length} record{history.length!==1?'s':''}</span>
            </div>
            {historyLoading ? (
              <div className="vm-empty">Loading history…</div>
            ) : (
              <table className="vm-table">
                <thead><tr>
                  <th>Date</th><th>Vaccine</th><th>Lot/Batch No.</th><th>Veterinarian</th><th>Lic No.</th>
                </tr></thead>
                <tbody>
                  {history.map((r,i)=>(
                    <tr key={i}>
                      <td style={{whiteSpace:'nowrap',fontWeight:700,color:'#2B5EA6'}}>{fmt(r.date_of_vaccination)}</td>
                      <td>{r.vaccine_name}</td>
                      <td style={{fontFamily:'monospace',fontSize:12}}>{r.lot_number || '—'}</td>
                      <td>{r.veterinarian || '—'}</td>
                      <td style={{fontFamily:'monospace',fontSize:12}}>{r.vet_license || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default VaccinationModule;
