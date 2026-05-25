import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchCalacaBarangays, CALACA_BARANGAYS_FALLBACK } from '../utils/barangays';

/* ──────────────────────────────────────────────────────────────
   INLINE SVG ICONS  (no lucide — avoids the ForwardRef/bigint error)
────────────────────────────────────────────────────────────── */
function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}
function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconCreditCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────
   STYLES
────────────────────────────────────────────────────────────── */
const STYLES = `
  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spinRing { to{transform:rotate(360deg);} }
  @keyframes popIn    { 0%{transform:scale(.6);opacity:0;} 70%{transform:scale(1.08);} 100%{transform:scale(1);opacity:1;} }
  @keyframes countPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.06);} }

  .su-root {
    min-height:100vh;
    display:flex; align-items:flex-start; justify-content:center;
    position:relative; overflow:hidden; padding:40px 16px;
  }

  /* ── background ── */
  .su-bg {
    position:absolute; inset:0; z-index:0;
    background-color:#1a3a6e;
  }
  .su-bg-outline {
    position:absolute; inset:0;
    background-image:url('/images/city_hall_outline.png');
    background-size:cover; background-position:center top;
    opacity:.09; mix-blend-mode:luminosity;
    pointer-events:none;
  }
  .su-bg-overlay {
    position:absolute; inset:0;
    background:linear-gradient(160deg,rgba(26,58,110,.82) 0%,rgba(43,94,166,.75) 50%,rgba(26,58,110,.88) 100%);
    pointer-events:none;
  }

  /* ── card ── */
  .su-card {
    position:relative; z-index:1;
    width:100%; max-width:780px;
    background:rgba(255,255,255,.97);
    border-radius:20px;
    box-shadow:0 30px 80px rgba(0,0,0,.28), 0 0 0 1px rgba(255,255,255,.12);
    padding:44px 48px;
    animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both;
  }

  /* ── back btn ── */
  .su-back {
    display:inline-flex; align-items:center; gap:6px;
    color:#2B5EA6; font-size:14px; font-weight:600;
    background:none; border:none; cursor:pointer;
    padding:6px 0; margin-bottom:28px;
    transition:color .18s;
  }
  .su-back:hover { color:#1a3a6e; }
  .su-back svg  { width:16px; height:16px; }

  /* ── header ── */
  .su-header { text-align:center; margin-bottom:32px; }
  .su-header h1 { margin:0; font-size:32px; font-weight:900; color:#1f2937; letter-spacing:-0.04em; }
  .su-header p  { margin:8px 0 0; font-size:15px; color:#6b7280; }

  /* ── section label ── */
  .su-section-label {
    font-size:10.5px; font-weight:800; letter-spacing:.1em;
    text-transform:uppercase; color:#2B5EA6;
    margin:0 0 14px; padding-bottom:6px;
    border-bottom:1.5px solid #e8f0fb;
  }

  /* ── grid ── */
  .su-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .su-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
  .su-field  { display:flex; flex-direction:column; gap:6px; margin-bottom:16px; }
  .su-field:last-child { margin-bottom:0; }

  /* ── label ── */
  .su-label { font-size:12.5px; font-weight:700; color:#374151; }
  .su-label span.req { color:#ef4444; margin-left:2px; }
  .su-label span.opt { color:#9ca3af; font-weight:500; font-size:11.5px; margin-left:4px; }

  /* ── input wrapper ── */
  .su-input-wrap { position:relative; }
  .su-input-icon {
    position:absolute; left:13px; top:50%; transform:translateY(-50%);
    width:16px; height:16px; color:#9ca3af; pointer-events:none;
    display:flex; align-items:center; justify-content:center;
  }
  .su-input-icon svg { width:16px; height:16px; }
  .su-textarea-icon { top:13px; transform:none; }

  .su-input, .su-select, .su-textarea {
    width:100%; border:1.5px solid #e5e7eb; border-radius:12px;
    background:#f9fafb; color:#1f2937; font-size:14px;
    outline:none; transition:border-color .18s,box-shadow .18s,background .18s;
    font-family:inherit;
  }
  .su-input, .su-select { height:48px; padding:0 14px 0 40px; }
  .su-input.no-icon, .su-select.no-icon { padding-left:14px; }
  .su-textarea { padding:12px 14px 12px 40px; resize:none; line-height:1.6; }
  .su-textarea.no-icon { padding-left:14px; }

  .su-input:focus, .su-select:focus, .su-textarea:focus {
    background:#fff; border-color:#2B5EA6;
    box-shadow:0 0 0 3.5px rgba(43,94,166,.11);
  }
  .su-input::placeholder, .su-textarea::placeholder { color:#c4cad6; }

  /* select arrow */
  .su-select { appearance:none; cursor:pointer; }
  .su-select-arrow {
    position:absolute; right:13px; top:50%; transform:translateY(-50%);
    width:15px; height:15px; color:#9ca3af; pointer-events:none;
  }
  .su-select-arrow svg { width:15px; height:15px; }

  /* ── verify method tabs ── */
  .su-method-tab {
    display:flex; align-items:center; justify-content:center; gap:8px;
    height:44px; border-radius:10px; border:1.5px solid #e5e7eb;
    font-size:13px; font-weight:700; cursor:pointer;
    background:#f9fafb; color:#6b7280;
    transition:all .18s;
  }
  .su-method-tab.active {
    border-color:#2B5EA6; background:#eff6ff; color:#2B5EA6;
  }
  .su-method-tab svg { width:16px; height:16px; }

  /* ── primary btn ── */
  .su-btn-primary {
    width:100%; height:52px; border:none; border-radius:14px; cursor:pointer;
    background:linear-gradient(135deg,#2B5EA6 0%,#3d7ac7 100%);
    color:#fff; font-size:15px; font-weight:800; letter-spacing:.02em;
    position:relative; overflow:hidden;
    transition:transform .18s,box-shadow .18s;
    box-shadow:0 12px 32px rgba(43,94,166,.32);
    margin-top:6px;
  }
  .su-btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 16px 40px rgba(43,94,166,.40); }
  .su-btn-primary:disabled { background:#d1d5db; color:#9ca3af; cursor:not-allowed; box-shadow:none; }
  .su-btn-primary::before { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,.14),transparent); pointer-events:none; }

  /* ── spinner ── */
  .su-spinner {
    display:inline-block; width:18px; height:18px; border-radius:50%;
    border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
    animation:spinRing .65s linear infinite; vertical-align:middle; margin-right:8px;
  }

  /* ── OTP box ── */
  .otp-input {
    width:100%; height:68px; border:2px solid #e5e7eb; border-radius:14px;
    background:#f9fafb; text-align:center; font-size:32px; font-weight:900;
    letter-spacing:.55em; color:#1f2937; outline:none; font-family:monospace;
    transition:border-color .18s,box-shadow .18s;
  }
  .otp-input:focus { background:#fff; border-color:#2B5EA6; box-shadow:0 0 0 4px rgba(43,94,166,.11); }
  .otp-input::placeholder { color:#d1d5db; letter-spacing:.3em; }

  .otp-banner {
    border-radius:12px; padding:14px 18px; font-size:13px; line-height:1.6; margin-bottom:16px;
  }
  .otp-banner.info   { background:#eff6ff; border:1.5px solid #bfdbfe; color:#1e40af; }
  .otp-banner.warn   { background:#fffbeb; border:1.5px solid #fcd34d; color:#92400e; }
  .otp-code-display  {
    background:#fff; border:2px solid #fbbf24; border-radius:10px;
    padding:12px 20px; margin-top:10px; text-align:center;
    font-family:monospace; font-size:34px; font-weight:900;
    letter-spacing:.55em; color:#2B5EA6;
  }

  .su-btn-ghost {
    width:100%; height:46px; background:none; border:1.5px solid #e5e7eb;
    border-radius:12px; color:#2B5EA6; font-size:14px; font-weight:600;
    cursor:pointer; transition:border-color .18s,background .18s;
  }
  .su-btn-ghost:hover:not(:disabled) { border-color:#2B5EA6; background:#eff6ff; }
  .su-btn-ghost:disabled { opacity:.5; cursor:not-allowed; }

  /* ── success screen ── */
  .su-success-icon {
    width:88px; height:88px; border-radius:50%;
    background:#dcfce7; display:flex; align-items:center; justify-content:center;
    margin:0 auto 24px; animation:popIn .45s cubic-bezier(.22,1,.36,1) both;
  }
  .su-success-icon svg { width:44px; height:44px; color:#16a34a; }
  .su-countdown {
    background:#eff6ff; border:2px solid #2B5EA6; border-radius:12px;
    padding:14px 24px; text-align:center; font-size:20px; font-weight:800;
    color:#2B5EA6; margin:20px 0 28px; animation:countPulse 1s ease-in-out infinite;
  }

  /* ── responsive ── */
  @media(max-width:640px) {
    .su-card          { padding:28px 20px; }
    .su-grid-2        { grid-template-columns:1fr; }
    .su-grid-3        { grid-template-columns:1fr; }
  }
`;

/* ──────────────────────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────────────────────── */
export function SignUp() {
  const navigate = useNavigate();
  const [step, setStep]     = useState<'form' | 'otp' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [barangays, setBarangays] = useState<string[]>(CALACA_BARANGAYS_FALLBACK);
  const [loadingBarangays, setLoadingBarangays] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    barangay: '',
    address: '',
    temporaryId: '',
    calacazenId: '',
    householdNumber: '',
    userType: 'petOwner' as 'petOwner' | 'livestockManager' | 'both',
    verificationMethod: 'email' as 'email',
  });

  const [otp,          setOtp]          = useState('');
  const [fallbackMode, setFallbackMode] = useState(false);
  const [displayedOTP, setDisplayedOTP] = useState('');

  /* load barangays */
  useEffect(() => {
    const load = async () => {
      setLoadingBarangays(true);
      try {
        const res = await fetch('/api/barangays');
        if (res.ok) {
          const data = await res.json();
          setBarangays(data.barangays);
        }
      } catch {
        const real = await fetchCalacaBarangays();
        setBarangays(real);
      } finally {
        setLoadingBarangays(false);
      }
    };
    load();
  }, []);

  /* countdown redirect */
  useEffect(() => {
    if (step === 'success' && redirectCountdown > 0) {
      const t = setTimeout(() => setRedirectCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    if (step === 'success' && redirectCountdown === 0) navigate('/');
  }, [step, redirectCountdown, navigate]);

  /* helpers */
  const set = (k: string, v: string) => setFormData((p) => ({ ...p, [k]: v }));

  /* send OTP */
  const handleSendOTP = async () => {
    if (!formData.firstName.trim())  { toast.error('Please enter your first name');       return; }
    if (!formData.lastName.trim())   { toast.error('Please enter your last name');        return; }
    if (!formData.email.trim())      { toast.error('Please enter your email address');    return; }
    if (!formData.password)          { toast.error('Please enter a password');            return; }
    if (formData.password.length < 8){ toast.error('Password must be at least 8 characters'); return; }
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (!formData.barangay)          { toast.error('Please select your barangay');        return; }
    if (!formData.address.trim())    { toast.error('Please enter your complete address'); return; }

    setIsLoading(true);
    try {
      const res  = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      if (data.fallbackMode && data.otp) {
        setFallbackMode(true); setDisplayedOTP(data.otp);
        toast.warning(data.message, { duration: 8000 });
        if (data.testingNote) toast.info(data.testingNote, { duration: 10000 });
      } else {
        setFallbackMode(false); setDisplayedOTP('');
        toast.success('Verification code sent! Check your inbox (including spam).');
      }
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  /* verify OTP */
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
    setIsLoading(true);
    try {
      const res  = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      toast.success('OTP verified successfully!');
      await handleSignUp();
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  /* sign up */
  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const username = `${formData.firstName.trim()} ${formData.middleName.trim()} ${formData.lastName.trim()}`.replace(/\s+/g, ' ');
      const res  = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:           formData.email,
          password:        formData.password,
          username,
          barangay:        formData.barangay,
          address:         formData.address,
          temporaryId:     formData.temporaryId   || undefined,
          calacazenId:     formData.calacazenId   || undefined,
          householdNumber: formData.householdNumber || undefined,
          userType:        formData.userType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign up failed');
      setStep('success');
      toast.success('Account created successfully!');
      setRedirectCountdown(5);
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── BACKGROUND (shared) ── */
  const Bg = () => (
    <div className="su-bg">
      <div className="su-bg-outline" />
      <div className="su-bg-overlay" />
    </div>
  );

  /* ────────────────────────────────────────────────────────────
     SUCCESS
  ──────────────────────────────────────────────────────────── */
  if (step === 'success') {
    return (
      <>
        <style>{STYLES}</style>
        <div className="su-root">
          <Bg />
          <div className="su-card" style={{ maxWidth: 520, textAlign: 'center', margin: 'auto' }}>
            <div className="su-success-icon">
              <IconCheckCircle />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 900, color: '#1f2937' }}>
              Account Created Successfully!
            </h2>
            <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 15, lineHeight: 1.7 }}>
              Your NASaAlaga account has been created. You can now log in to access veterinary services.
            </p>
            <div className="su-countdown">
              Redirecting to login in {redirectCountdown}s…
            </div>
            <button className="su-btn-primary" onClick={() => navigate('/')}>
              Go to Login Now
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ────────────────────────────────────────────────────────────
     OTP
  ──────────────────────────────────────────────────────────── */
  if (step === 'otp') {
    return (
      <>
        <style>{STYLES}</style>
        <div className="su-root">
          <Bg />
          <div className="su-card" style={{ maxWidth: 520, margin: 'auto' }}>
            <button className="su-back" onClick={() => { setStep('form'); setOtp(''); setFallbackMode(false); setDisplayedOTP(''); }}>
              <IconArrowLeft /> Back to Form
            </button>

            <div className="su-header">
              <h1>Verify Your Email</h1>
              <p>We've sent a 6-digit code to <strong style={{ color: '#2B5EA6' }}>{formData.email}</strong></p>
            </div>

            {fallbackMode && displayedOTP ? (
              <div className="otp-banner warn">
                <strong style={{display:"flex",alignItems:"center",gap:4}}><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Testing Mode</strong> — Email delivery is restricted. Use this code:
                <div className="otp-code-display">{displayedOTP}</div>
                <p style={{ marginTop: 10, fontSize: 12, color: '#92400e' }}>
                  To send real emails, verify a domain at resend.com/domains
                </p>
              </div>
            ) : (
              <div className="otp-banner info">
                Check your email inbox (and spam folder) for the OTP code.
              </div>
            )}

            <div className="su-field">
              <label className="su-label">Enter 6-digit OTP</label>
              <input
                className="otp-input"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
              />
            </div>

            <button className="su-btn-primary" onClick={handleVerifyOTP} disabled={isLoading || otp.length !== 6}>
              {isLoading ? <><span className="su-spinner" />Verifying…</> : 'Verify OTP & Create Account'}
            </button>

            <div style={{ marginTop: 12 }}>
              <button className="su-btn-ghost" onClick={() => { setOtp(''); handleSendOTP(); }} disabled={isLoading}>
                Resend OTP
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ────────────────────────────────────────────────────────────
     MAIN FORM
  ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{STYLES}</style>
      <div className="su-root">
        <Bg />
        <div className="su-card">

          <button className="su-back" onClick={() => navigate('/')}>
            <IconArrowLeft /> Back to Login
          </button>

          <div className="su-header">
            <h1>Create Account</h1>
            <p>Sign up for your NASaAlaga account</p>
          </div>

          {/* ── ACCOUNT TYPE ── */}
          <p className="su-section-label">I am registering as a...</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {([
              { value: 'petOwner', emoji: '🐾', label: 'Pet Owner', desc: 'I have pets to register' },
              { value: 'livestockManager', emoji: '🐄', label: 'Livestock Manager', desc: 'I manage farm animals' },
              { value: 'both', emoji: '🐾🐄', label: 'Both', desc: 'I have pets & livestock' },
            ] as const).map(opt => (
              <button key={opt.value} type="button"
                onClick={() => set('userType', opt.value)}
                style={{
                  padding: '12px 8px', borderRadius: 10, border: '2px solid',
                  borderColor: formData.userType === opt.value ? '#2B5EA6' : '#d1d5db',
                  background: formData.userType === opt.value ? '#eff6ff' : 'white',
                  cursor: 'pointer', textAlign: 'center' as const, transition: 'all .15s',
                }}>
                <div style={{ fontSize: 22 }}>{opt.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: formData.userType === opt.value ? '#2B5EA6' : '#374151', marginTop: 4 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* ── PERSONAL INFORMATION ── */}
          <p className="su-section-label">Personal Information</p>

          <div className="su-grid-3" style={{ marginBottom: 16 }}>
            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">First Name <span className="req">*</span></label>
              <div className="su-input-wrap">
                <span className="su-input-icon"><IconUser /></span>
                <input className="su-input" type="text" placeholder="Juan"
                  value={formData.firstName} onChange={(e) => set('firstName', e.target.value)} />
              </div>
            </div>

            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">Middle Name <span className="opt">(Optional)</span></label>
              <input className="su-input no-icon" type="text" placeholder="Santos"
                value={formData.middleName} onChange={(e) => set('middleName', e.target.value)} />
            </div>

            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">Last Name <span className="req">*</span></label>
              <input className="su-input no-icon" type="text" placeholder="Dela Cruz"
                value={formData.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
          </div>

          {/* ── ACCOUNT DETAILS ── */}
          <p className="su-section-label" style={{ marginTop: 8 }}>Account Details</p>

          <div className="su-field">
            <label className="su-label">Email Address <span className="req">*</span></label>
            <div className="su-input-wrap">
              <span className="su-input-icon"><IconMail /></span>
              <input className="su-input" type="email" placeholder="juan.delacruz@email.com"
                value={formData.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>

          <div className="su-grid-2" style={{ marginBottom: 16 }}>
            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">Password <span className="req">*</span></label>
              <div className="su-input-wrap">
                <span className="su-input-icon"><IconLock /></span>
                <input className="su-input" type="password" placeholder="Min. 8 characters"
                  value={formData.password} onChange={(e) => set('password', e.target.value)} />
              </div>
            </div>

            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">Confirm Password <span className="req">*</span></label>
              <div className="su-input-wrap">
                <span className="su-input-icon"><IconLock /></span>
                <input className="su-input" type="password" placeholder="Re-enter password"
                  value={formData.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── LOCATION ── */}
          <p className="su-section-label" style={{ marginTop: 8 }}>Location</p>

          <div className="su-grid-2" style={{ marginBottom: 16 }}>
            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">Barangay <span className="req">*</span></label>
              <div className="su-input-wrap">
                <span className="su-input-icon"><IconMapPin /></span>
                <select className="su-select" value={formData.barangay} onChange={(e) => set('barangay', e.target.value)}>
                  <option value="">-- Select Barangay --</option>
                  {loadingBarangays
                    ? <option disabled>Loading…</option>
                    : barangays.map((b) => <option key={b} value={b}>{b}</option>)
                  }
                </select>
                <span className="su-select-arrow"><IconChevronDown /></span>
              </div>
            </div>

            {/* spacer — address spans full width below */}
            <div />
          </div>

          <div className="su-field">
            <label className="su-label">Complete Address <span className="req">*</span></label>
            <div className="su-input-wrap">
              <span className="su-input-icon su-textarea-icon"><IconHome /></span>
              <textarea className="su-textarea" rows={3} placeholder="House No., Street, Subdivision"
                value={formData.address} onChange={(e) => set('address', e.target.value)} />
            </div>
          </div>

          {/* ── OPTIONAL IDENTIFIERS ── */}
          <p className="su-section-label" style={{ marginTop: 20 }}>Optional Identifiers</p>

          <div className="su-grid-3" style={{ marginBottom: 16 }}>
            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">Temporary ID <span className="opt">(Optional)</span></label>
              <div className="su-input-wrap">
                <span className="su-input-icon"><IconCreditCard /></span>
                <input className="su-input" type="text" placeholder="Leave blank if none"
                  value={formData.temporaryId} onChange={(e) => set('temporaryId', e.target.value)} />
              </div>
            </div>

            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">CalacaZen ID <span className="opt">(Optional)</span></label>
              <div className="su-input-wrap">
                <span className="su-input-icon"><IconCreditCard /></span>
                <input className="su-input" type="text" placeholder="e.g. CZ-2024-00001"
                  value={formData.calacazenId} onChange={(e) => set('calacazenId', e.target.value)} />
              </div>
            </div>

            <div className="su-field" style={{ marginBottom: 0 }}>
              <label className="su-label">Household Number <span className="opt">(Optional)</span></label>
              <div className="su-input-wrap">
                <span className="su-input-icon"><IconHome /></span>
                <input className="su-input" type="text" placeholder="e.g. HH-2024-00012"
                  value={formData.householdNumber} onChange={(e) => set('householdNumber', e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── SUBMIT ── */}
          <button className="su-btn-primary" onClick={handleSendOTP} disabled={isLoading}>
            {isLoading
              ? <><span className="su-spinner" />Generating OTP…</>
              : 'Continue to Verification →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
            Already have an account?{' '}
            <button onClick={() => navigate('/')}
              style={{ color: '#2B5EA6', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
              Sign In
            </button>
          </p>

        </div>
      </div>
    </>
  );
}