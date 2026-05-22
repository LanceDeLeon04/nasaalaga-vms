import { useState } from 'react';
import { toast } from 'sonner';

/* ── inline icons ── */
const IC = (d: string) => ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IconPaw      = () => <svg viewBox="0 0 24 24" fill="currentColor" style={{width:20,height:20}}><path d="M12 14c-3.31 0-6 2.24-6 5 0 .55.45 1 1 1h10c.55 0 1-.45 1-1 0-2.76-2.69-5-6-5zm-4-5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm8 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM7 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm10 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>;
const IconCheck    = IC('M20 6L9 17l-5-5');
const IconArrow    = IC('M19 12H5 M12 5l-7 7 7 7');
const IconCamera   = IC('M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z');

const STYLES = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes popIn  { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
  @keyframes spin   { to{transform:rotate(360deg)} }

  .pr-wrap { min-height:100vh; background:#f0f4fb; display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; }
  .pr-card { background:#fff; border-radius:20px; box-shadow:0 8px 40px rgba(0,0,0,.12); width:100%; max-width:720px; overflow:hidden; animation:fadeUp .4s cubic-bezier(.22,1,.36,1) both; }
  .pr-header { background:linear-gradient(135deg,#2B5EA6,#60A85C); padding:28px 36px; color:#fff; }
  .pr-header h2 { margin:0 0 4px; font-size:22px; font-weight:800; }
  .pr-header p  { margin:0; font-size:13px; opacity:.85; }
  .pr-steps { display:flex; gap:0; border-bottom:1px solid #e8edf4; }
  .pr-step  { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:14px 8px; font-size:12.5px; font-weight:700; color:#9ca3af; border-bottom:3px solid transparent; transition:all .2s; cursor:default; }
  .pr-step.active  { color:#2B5EA6; border-bottom-color:#2B5EA6; }
  .pr-step.done    { color:#16a34a; border-bottom-color:#16a34a; }
  .pr-step-num { width:22px; height:22px; border-radius:50%; background:#e5e7eb; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; transition:all .2s; }
  .pr-step.active  .pr-step-num { background:#2B5EA6; color:#fff; }
  .pr-step.done    .pr-step-num { background:#16a34a; color:#fff; }
  .pr-body  { padding:32px 36px; }
  .pr-section { font-size:10.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#2B5EA6; margin:0 0 16px; padding-bottom:6px; border-bottom:1.5px solid #e8f0fb; }
  .pr-grid  { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
  .pr-field { display:flex; flex-direction:column; gap:5px; }
  .pr-label { font-size:12.5px; font-weight:700; color:#374151; }
  .pr-label .req { color:#ef4444; margin-left:2px; }
  .pr-label .opt { color:#9ca3af; font-size:11px; font-weight:500; margin-left:4px; }
  .pr-input, .pr-select, .pr-textarea {
    border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; color:#1f2937;
    font-size:14px; outline:none; font-family:inherit;
    transition:border-color .18s,box-shadow .18s,background .18s;
  }
  .pr-input, .pr-select { height:44px; padding:0 12px; }
  .pr-textarea { padding:10px 12px; resize:none; line-height:1.6; }
  .pr-input:focus, .pr-select:focus, .pr-textarea:focus { background:#fff; border-color:#2B5EA6; box-shadow:0 0 0 3px rgba(43,94,166,.1); }
  .pr-input::placeholder, .pr-textarea::placeholder { color:#c4cad6; }
  .pr-select { appearance:none; cursor:pointer; }
  .pr-actions { display:flex; gap:12px; margin-top:24px; }
  .pr-btn-primary { flex:1; height:48px; border:none; border-radius:12px; cursor:pointer; background:linear-gradient(135deg,#2B5EA6,#3d7ac7); color:#fff; font-size:14px; font-weight:800; transition:transform .18s,box-shadow .18s; box-shadow:0 8px 24px rgba(43,94,166,.28); }
  .pr-btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 32px rgba(43,94,166,.36); }
  .pr-btn-primary:disabled { background:#d1d5db; color:#9ca3af; cursor:not-allowed; box-shadow:none; }
  .pr-btn-secondary { height:48px; padding:0 20px; border:1.5px solid #e5e7eb; border-radius:12px; background:#fff; color:#374151; font-size:14px; font-weight:700; cursor:pointer; transition:all .18s; }
  .pr-btn-secondary:hover { border-color:#2B5EA6; color:#2B5EA6; background:#eff6ff; }
  .pr-spinner { display:inline-block; width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; animation:spin .6s linear infinite; vertical-align:middle; margin-right:6px; }
  .pr-confirm-box { background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:24px; margin-bottom:20px; }
  .pr-confirm-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
  .pr-confirm-row:last-child { border-bottom:none; }
  .pr-confirm-key { color:#6b7280; font-weight:600; }
  .pr-confirm-val { color:#1f2937; font-weight:700; text-align:right; }
  .pr-alert { border-radius:12px; padding:14px 18px; font-size:13.5px; line-height:1.7; margin-bottom:20px; }
  .pr-alert.warn  { background:#fff8ed; border:1.5px solid #fbbf24; color:#92400e; }
  .pr-alert.info  { background:#eff6ff; border:1.5px solid #bfdbfe; color:#1e40af; }
  .pr-alert.success { background:#f0fdf4; border:1.5px solid #86efac; color:#14532d; }
  .pr-success-icon { width:80px; height:80px; border-radius:50%; background:#f0fdf4; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; animation:popIn .4s cubic-bezier(.22,1,.36,1) both; }
  .pr-id-box { background:#f0f7ff; border:2px solid #2B5EA6; border-radius:14px; padding:20px; text-align:center; margin-bottom:20px; }
  .pr-id-label { font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#64748b; margin-bottom:6px; }
  .pr-id-value { font-size:26px; font-weight:900; font-family:monospace; color:#2B5EA6; letter-spacing:.05em; }
  .pr-photo-upload { border:2px dashed #d1d5db; border-radius:12px; padding:28px; text-align:center; cursor:pointer; transition:all .2s; }
  .pr-photo-upload:hover { border-color:#2B5EA6; background:#f0f7ff; }
  .pr-photo-preview { width:100%; max-height:200px; object-fit:cover; border-radius:10px; margin-top:10px; }
  @media(max-width:600px){ .pr-grid{grid-template-columns:1fr;} .pr-body{padding:20px;} .pr-header{padding:20px;} }
`;

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Other'];
const GENDER_OPTIONS  = ['Male', 'Female'];

interface FormState {
  petName: string; species: string; breed: string; age: string;
  color: string; gender: string; ownerName: string; contactNumber: string;
  ownerEmail: string; barangay: string; address: string; photo: string;
}

const EMPTY: FormState = {
  petName:'', species:'', breed:'', age:'', color:'', gender:'',
  ownerName:'', contactNumber:'', ownerEmail:'', barangay:'', address:'', photo:'',
};

type Step = 'details' | 'confirm' | 'success';

interface PetPreRegistrationProps {
  ownerId?: string;
  ownerEmail?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function PetPreRegistration({ ownerId: propOwnerId, ownerEmail: propOwnerEmail, onClose, onSuccess }: PetPreRegistrationProps = {}) {
  const resolvedOwnerId    = propOwnerId    || null;
  const resolvedOwnerEmail = propOwnerEmail || '';
  const isModal = !!onClose;

  const [step, setStep]       = useState<Step>('details');
  const [form, setForm]       = useState<FormState>({ ...EMPTY, ownerEmail: resolvedOwnerEmail });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ preRegNumber: string; expiresAt: string; emailSent: boolean } | null>(null);

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('photo', ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const validateDetails = () => {
    if (!form.petName.trim())     { toast.error('Pet name is required'); return false; }
    if (!form.species)            { toast.error('Species is required');  return false; }
    if (!form.gender)             { toast.error('Gender is required');   return false; }
    if (!form.ownerName.trim())   { toast.error('Owner name is required'); return false; }
    if (!form.contactNumber.trim()){ toast.error('Contact number is required'); return false; }
    if (!form.barangay.trim())    { toast.error('Barangay is required'); return false; }
    if (!form.address.trim())     { toast.error('Address is required');  return false; }
    return true;
  };

  const handleProceed = () => {
    if (validateDetails()) setStep('confirm');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        ownerId: resolvedOwnerId,
      };
      const res = await fetch('/api/pets/pre-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pre-registration failed');
      setResult({ preRegNumber: data.preRegNumber, expiresAt: data.expiresAt, emailSent: data.emailSent });
      setStep('success');
      toast.success('Pet pre-registered successfully!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Pre-registration failed');
    } finally {
      setLoading(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'details', label: 'Pet Details' },
    { key: 'confirm', label: 'Review & Confirm' },
    { key: 'success', label: 'Submitted' },
  ];
  const stepIdx = steps.findIndex(s => s.key === step);

  const Field = ({ label, required, opt, children }: { label: string; required?: boolean; opt?: boolean; children: React.ReactNode }) => (
    <div className="pr-field">
      <label className="pr-label">{label}{required && <span className="req"> *</span>}{opt && <span className="opt"> (Optional)</span>}</label>
      {children}
    </div>
  );

  const confirmRows = [
    ['Pet Name',       form.petName],
    ['Species',        form.species],
    ['Breed',          form.breed || '—'],
    ['Age',            form.age || '—'],
    ['Color',          form.color || '—'],
    ['Gender',         form.gender],
    ['Owner Name',     form.ownerName],
    ['Contact No.',    form.contactNumber],
    ['Owner Email',    form.ownerEmail || '—'],
    ['Barangay',       form.barangay],
    ['Address',        form.address],
  ];

  return (
    <>
      <style>{STYLES}</style>
      <div className={isModal ? '' : 'pr-wrap'}>
        <div className="pr-card" style={isModal ? { boxShadow: 'none', borderRadius: 0, maxWidth: '100%' } : {}}>

          {/* header */}
          <div className="pr-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <IconPaw />
                <h2>Pet Pre-Registration</h2>
              </div>
              <p>Register your pet online — bring them to the CVO within 14 days for official validation</p>
            </div>
            {isModal && onClose && (
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
            )}
          </div>

          {/* step indicator */}
          <div className="pr-steps">
            {steps.map((s, i) => (
              <div key={s.key} className={`pr-step ${step === s.key ? 'active' : i < stepIdx ? 'done' : ''}`}>
                <span className="pr-step-num">
                  {i < stepIdx ? <IconCheck className="" /> : i + 1}
                </span>
                {s.label}
              </div>
            ))}
          </div>

          <div className="pr-body">

            {/* ─── STEP 1: DETAILS ─── */}
            {step === 'details' && (
              <>
                <p className="pr-section">Pet Information</p>
                <div className="pr-grid">
                  <Field label="Pet Name" required>
                    <input className="pr-input" placeholder="e.g. Buddy" value={form.petName} onChange={e => set('petName', e.target.value)} />
                  </Field>
                  <Field label="Species" required>
                    <select className="pr-select" value={form.species} onChange={e => set('species', e.target.value)}>
                      <option value="">-- Select --</option>
                      {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Breed" opt>
                    <input className="pr-input" placeholder="e.g. Aspin" value={form.breed} onChange={e => set('breed', e.target.value)} />
                  </Field>
                  <Field label="Age" opt>
                    <input className="pr-input" placeholder="e.g. 2 years" value={form.age} onChange={e => set('age', e.target.value)} />
                  </Field>
                  <Field label="Color / Markings" opt>
                    <input className="pr-input" placeholder="e.g. Brown with white spots" value={form.color} onChange={e => set('color', e.target.value)} />
                  </Field>
                  <Field label="Gender" required>
                    <select className="pr-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                      <option value="">-- Select --</option>
                      {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                </div>

                <p className="pr-section" style={{ marginTop: 8 }}>Pet Photo</p>
                <div className="pr-photo-upload" onClick={() => document.getElementById('pet-photo-input')?.click()}>
                  <input id="pet-photo-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                  {form.photo ? (
                    <img src={form.photo} className="pr-photo-preview" alt="Pet preview" />
                  ) : (
                    <div style={{ color: '#9ca3af' }}>
                      <IconCamera className="" />
                      <p style={{ margin: '8px 0 0', fontSize: 13 }}>Click to upload a photo of your pet <span style={{ color: '#c4cad6' }}>(Optional)</span></p>
                    </div>
                  )}
                </div>

                <p className="pr-section" style={{ marginTop: 20 }}>Owner Information</p>
                <div className="pr-grid">
                  <Field label="Owner Full Name" required>
                    <input className="pr-input" placeholder="Your full name" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} />
                  </Field>
                  <Field label="Contact Number" required>
                    <input className="pr-input" placeholder="09XX XXX XXXX" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} />
                  </Field>
                  <Field label="Email Address" opt>
                    <input className="pr-input" type="email" placeholder="you@email.com" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} />
                  </Field>
                  <Field label="Barangay" required>
                    <input className="pr-input" placeholder="e.g. Barangay 1" value={form.barangay} onChange={e => set('barangay', e.target.value)} />
                  </Field>
                </div>
                <Field label="Complete Address" required>
                  <textarea className="pr-textarea" rows={2} placeholder="House No., Street, Subdivision" value={form.address} onChange={e => set('address', e.target.value)} />
                </Field>

                <div className="pr-alert warn" style={{ marginTop: 16 }}>
                  <strong style={{display:"flex",alignItems:"center",gap:4}}><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{display:"inline",marginRight:4}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Reminder:</strong> After submitting, you must bring your pet to the <strong>Calaca City Veterinary Office (CVO)</strong> within <strong>14 days</strong> for physical validation. Your pre-registration will expire after this period.
                </div>

                <div className="pr-actions">
                  <button className="pr-btn-primary" onClick={handleProceed}>Review & Confirm →</button>
                </div>
              </>
            )}

            {/* ─── STEP 2: CONFIRM ─── */}
            {step === 'confirm' && (
              <>
                <p className="pr-section">Review Your Details</p>
                <div className="pr-confirm-box">
                  {confirmRows.map(([k, v]) => (
                    <div key={k} className="pr-confirm-row">
                      <span className="pr-confirm-key">{k}</span>
                      <span className="pr-confirm-val">{v}</span>
                    </div>
                  ))}
                  {form.photo && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 6px' }}>Pet Photo</p>
                      <img src={form.photo} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10 }} alt="Pet" />
                    </div>
                  )}
                </div>

                <div className="pr-alert info">
                  <strong>Confirmation Email</strong><br />
                  {form.ownerEmail
                    ? <>A confirmation with your Pre-Registration ID will be sent to <strong>{form.ownerEmail}</strong>.</>
                    : <>No email provided — you may add one. Your Pre-Registration ID will be shown after submission.</>
                  }
                </div>

                <div className="pr-alert warn">
                  <strong style={{display:"flex",alignItems:"center",gap:4}}><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{display:"inline",marginRight:4}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>14-Day Validation Window</strong><br />
                  Bring your pet to the CVO within <strong>14 days</strong>. Failure to do so will expire this pre-registration.
                </div>

                <div className="pr-actions">
                  <button className="pr-btn-secondary" onClick={() => setStep('details')}><IconArrow className="" /> Edit Details</button>
                  <button className="pr-btn-primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? <><span className="pr-spinner" />Submitting…</> : <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{display:"inline",marginRight:4}}><polyline points="20 6 9 17 4 12"/></svg>Confirm &amp; Submit</>}
                  </button>
                </div>
              </>
            )}

            {/* ─── STEP 3: SUCCESS ─── */}
            {step === 'success' && result && (
              <div style={{ textAlign: 'center' }}>
                <div className="pr-success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} style={{ width: 44, height: 44 }}>
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: '#1f2937' }}>Pre-Registration Submitted!</h3>
                <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
                  Your pet pre-registration has been received. Please save your Pre-Registration ID below.
                </p>

                <div className="pr-id-box">
                  <div className="pr-id-label">Pre-Registration ID</div>
                  <div className="pr-id-value">{result.preRegNumber}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    Expires: {new Date(result.expiresAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                {result.emailSent && (
                  <div className="pr-alert success">
                    <strong>Email Sent!</strong> A confirmation email with your Pre-Registration ID has been sent to <strong>{form.ownerEmail}</strong>.
                  </div>
                )}
                {!result.emailSent && form.ownerEmail && (
                  <div className="pr-alert warn">
                    <strong style={{display:"flex",alignItems:"center",gap:4}}><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{display:"inline",marginRight:4}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Email not delivered</strong> — please save your Pre-Registration ID manually.
                  </div>
                )}

                <div className="pr-alert warn" style={{ textAlign: 'left' }}>
                  <strong style={{display:"flex",alignItems:"center",gap:4}}><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:"inline",marginRight:4}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Next Steps:</strong>
                  <ol style={{ margin: '8px 0 0 0', paddingLeft: 20, lineHeight: 2 }}>
                    <li>Bring your pet to the <strong>Calaca City Veterinary Office (CVO)</strong>.</li>
                    <li>Provide your Pre-Registration ID: <strong>{result.preRegNumber}</strong></li>
                    <li>CVO staff will validate your details, take a photo, and assign an official <strong>Pet Tag ID</strong>.</li>
                    <li>Your pre-registration expires in <strong>14 days</strong>. Do not delay!</li>
                  </ol>
                </div>

                <button className="pr-btn-primary" style={{ marginTop: 8 }} onClick={() => {
                  if (isModal && onClose) { onClose(); return; }
                  setForm({ ...EMPTY, ownerEmail: resolvedOwnerEmail });
                  setResult(null);
                  setStep('details');
                }}>
                  {isModal ? 'Close' : 'Register Another Pet'}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

export default PetPreRegistration;
