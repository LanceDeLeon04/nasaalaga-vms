import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "../App";

const STYLES = `
  @keyframes slideIn      { from { transform:translateX(110%);opacity:0; } to { transform:translateX(0);opacity:1; } }
  @keyframes fadeIn       { from { opacity:0; } to { opacity:1; } }
  @keyframes pop          { 0%{transform:scale(.5);opacity:0;} 70%{transform:scale(1.1);} 100%{transform:scale(1);opacity:1;} }
  @keyframes scanLine     { 0%{top:10%;} 50%{top:84%;} 100%{top:10%;} }
  @keyframes sealFloat    { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
  @keyframes pulseRing    { 0%{transform:scale(1);opacity:.65;} 100%{transform:scale(2.2);opacity:0;} }
  @keyframes blobDrift1 {
    0%   { transform:translate(0,0) scale(1); }
    15%  { transform:translate(60px,-80px) scale(1.18); }
    30%  { transform:translate(120px,20px) scale(.92); }
    45%  { transform:translate(60px,100px) scale(1.22); }
    60%  { transform:translate(-40px,60px) scale(.95); }
    75%  { transform:translate(-80px,-40px) scale(1.12); }
    100% { transform:translate(0,0) scale(1); }
  }
  @keyframes blobDrift2 {
    0%   { transform:translate(0,0) scale(1); }
    20%  { transform:translate(-70px,90px) scale(1.20); }
    40%  { transform:translate(-120px,-30px) scale(.90); }
    60%  { transform:translate(40px,-100px) scale(1.16); }
    80%  { transform:translate(90px,50px) scale(.94); }
    100% { transform:translate(0,0) scale(1); }
  }
  @keyframes blobDrift3 {
    0%   { transform:translate(0,0) scale(1); }
    25%  { transform:translate(80px,70px) scale(1.14); }
    50%  { transform:translate(-50px,110px) scale(.88); }
    75%  { transform:translate(-90px,-50px) scale(1.18); }
    100% { transform:translate(0,0) scale(1); }
  }
  @keyframes fadeUp       { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
  @keyframes spinLoader   { to{transform:rotate(360deg);} }
  @keyframes chipGlow     { 0%,100%{background:rgba(0,0,0,.22);} 50%{background:rgba(0,0,0,.32);} }
  @keyframes btnShimmer   { 0%{transform:translateX(-100%) skewX(-15deg);} 100%{transform:translateX(280%) skewX(-15deg);} }
  @keyframes btnGlowPulse { 0%,100%{box-shadow:0 4px 20px rgba(232,104,10,.4),0 0 0 0 rgba(232,104,10,0);}
                             50%{box-shadow:0 6px 32px rgba(232,104,10,.6),0 0 0 6px rgba(232,104,10,.08);} }
  @keyframes cardShimmer  { 0%{transform:translateX(-120%);} 100%{transform:translateX(120%);} }
  @keyframes hexDrift     { 0%,100%{background-position:0 0;} 50%{background-position:6px 12px;} }

  .ls1{animation:fadeUp .48s .05s both cubic-bezier(.22,1,.36,1);}
  .ls2{animation:fadeUp .48s .12s both cubic-bezier(.22,1,.36,1);}
  .ls3{animation:fadeUp .48s .19s both cubic-bezier(.22,1,.36,1);}
  .ls4{animation:fadeUp .48s .26s both cubic-bezier(.22,1,.36,1);}
  .ls5{animation:fadeUp .48s .33s both cubic-bezier(.22,1,.36,1);}
  .ls6{animation:fadeUp .48s .40s both cubic-bezier(.22,1,.36,1);}

  .seal-float  { animation:sealFloat 5s ease-in-out infinite; }
  .seal-ring-1 { position:absolute;inset:-12px;border-radius:9999px;border:2.5px solid rgba(255,255,255,.55);animation:pulseRing 2.8s ease-out infinite;pointer-events:none; }
  .seal-ring-2 { position:absolute;inset:-26px;border-radius:9999px;border:2px solid rgba(255,255,255,.32);animation:pulseRing 2.8s 1.1s ease-out infinite;pointer-events:none; }

  .bg-blob   { position:absolute;border-radius:50%;pointer-events:none;will-change:transform; }
  .bg-blob-1 { width:780px;height:780px;top:-25%;left:-18%;
    background:radial-gradient(circle at 40% 40%,rgba(232,104,10,.55) 0%,rgba(220,80,8,.28) 30%,rgba(200,60,5,.08) 58%,transparent 72%);
    filter:blur(38px);animation:blobDrift1 26s cubic-bezier(.42,0,.58,1) infinite; }
  .bg-blob-2 { width:620px;height:620px;bottom:-20%;right:-15%;
    background:radial-gradient(circle at 55% 55%,rgba(190,65,10,.52) 0%,rgba(160,40,8,.24) 32%,rgba(130,30,5,.07) 58%,transparent 72%);
    filter:blur(36px);animation:blobDrift2 32s cubic-bezier(.42,0,.58,1) infinite; }
  .bg-blob-3 { width:460px;height:460px;top:25%;right:10%;
    background:radial-gradient(circle at 45% 45%,rgba(43,94,166,.40) 0%,rgba(30,70,140,.18) 35%,rgba(20,50,110,.05) 60%,transparent 72%);
    filter:blur(34px);animation:blobDrift3 38s 3s cubic-bezier(.42,0,.58,1) infinite; }

  .bg-honeycomb {
    position:absolute; inset:0; pointer-events:none; z-index:0;
    opacity:.03;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='92'%3E%3Cpolygon points='40,3 77,23 77,69 40,89 3,69 3,23' fill='none' stroke='%23ffffff' stroke-width='1.4'/%3E%3C/svg%3E");' fill='none' stroke='%23ffffff' stroke-width='1.6'/%3E%3C/svg%3E");
    background-size: 120px 138px;
    animation: hexDrift 28s ease-in-out infinite;
  }

  .left-stripe { position:absolute;inset:0;pointer-events:none;
    background-image:repeating-linear-gradient(-45deg,rgba(255,255,255,.045) 0,rgba(255,255,255,.045) 1px,transparent 1px,transparent 20px); }
  .left-glow   { position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(ellipse at 35% 18%,rgba(255,255,255,.22) 0%,transparent 55%); }

  .info-chip { display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.18);border-radius:50px;padding:6px 14px;transition:background .2s;cursor:default;animation:chipGlow 4s ease-in-out infinite; }
  .info-chip:hover { background:rgba(0,0,0,.32); }

  .form-input {
    width:100%;background:#F8F9FC;border:1.5px solid #E8ECF4;
    border-radius:12px;padding:10px 15px;font-size:14px;color:#1a1a2e;
    outline:none;transition:border-color .2s,box-shadow .2s,background .2s;
  }
  .form-input::placeholder { color:#B0B8CC; }
  .form-input:focus { background:#fff;border-color:#E8680A;box-shadow:0 0 0 3px rgba(232,104,10,.12); }

  .signin-btn {
    width:100%;background:linear-gradient(135deg,#E8680A 0%,#F5882A 50%,#E8680A 100%);
    color:#fff;font-weight:800;font-size:14px;letter-spacing:.09em;
    text-transform:uppercase;border:none;border-radius:12px;padding:12px;
    cursor:pointer;position:relative;overflow:hidden;
    transition:transform .18s,box-shadow .18s;
    animation:btnGlowPulse 3s ease-in-out infinite;
  }
  .signin-btn::before { content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.18) 0%,transparent 60%);pointer-events:none; }
  .signin-btn::after  { content:'';position:absolute;top:0;left:0;width:45%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);animation:btnShimmer 2.4s ease-in-out infinite;pointer-events:none; }
  .signin-btn:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 12px 36px rgba(232,104,10,.55),0 0 0 4px rgba(232,104,10,.12) !important;animation:none; }
  .signin-btn:active:not(:disabled){ transform:translateY(0);box-shadow:0 4px 14px rgba(232,104,10,.35) !important; }
  .signin-btn:disabled { background:#d1d5db;color:#9ca3af;cursor:not-allowed;animation:none;box-shadow:none; }
  .signin-btn:disabled::after { display:none; }

  .right-shimmer {
    position:absolute;top:0;left:0;width:60%;height:100%;
    background:linear-gradient(90deg,transparent,rgba(232,104,10,.04),transparent);
    animation:cardShimmer 5s ease-in-out infinite;
    pointer-events:none;z-index:0;
  }
  .right-accent {
    position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,rgba(232,104,10,.35),rgba(232,104,10,.6),rgba(232,104,10,.35),transparent);
    pointer-events:none;
  }
  .right-corner-glow {
    position:absolute;top:0;right:0;width:180px;height:180px;
    background:radial-gradient(circle at 100% 0%,rgba(232,104,10,.08) 0%,transparent 65%);
    pointer-events:none;
  }

  .sc { position:absolute;width:20px;height:20px;border-style:solid;border-color:#E8680A; }
  .sc.tl { top:8px;left:8px;    border-width:2.5px 0 0 2.5px;border-radius:3px 0 0 0; }
  .sc.tr { top:8px;right:8px;   border-width:2.5px 2.5px 0 0;border-radius:0 3px 0 0; }
  .sc.bl { bottom:8px;left:8px;  border-width:0 0 2.5px 2.5px;border-radius:0 0 0 3px; }
  .sc.br { bottom:8px;right:8px; border-width:0 2.5px 2.5px 0;border-radius:0 0 3px 0; }
`;

/* ── SVG Icons (inline, avoids lucide version mismatch entirely) ─────────── */
function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 22V12h6v10M3 9h18" />
    </svg>
  );
}
function IconScan({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}
function IconCheckCircle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconXCircle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconAlert({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconPaw({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/>
      <circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/>
      <path d="M12 18c-3.5 0-6-2-6-4s2.5-3 6-3 6 1 6 3-2.5 4-6 4z"/>
    </svg>
  );
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
type ToastType = "error" | "success" | "warning";
interface Toast { id: number; type: ToastType; message: string; }
let _toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm border pointer-events-auto min-w-[280px] max-w-sm
            ${t.type === "error"   ? "bg-red-50/95 border-red-200 text-red-800"
            : t.type === "success" ? "bg-green-50/95 border-green-200 text-green-800"
            :                        "bg-amber-50/95 border-amber-200 text-amber-800"}`}
          style={{ animation: "slideIn 0.3s ease forwards" }}
        >
          {t.type === "error"   && <IconXCircle     className="w-5 h-5 text-red-500 shrink-0" />}
          {t.type === "success" && <IconCheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
          {t.type === "warning" && <IconAlert       className="w-5 h-5 text-amber-500 shrink-0" />}
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button onClick={() => onRemove(t.id)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
            <IconX className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Scan Result Overlay ─────────────────────────────────────────────────── */
type ScanResult = "granted" | "denied" | null;

function ScanResultOverlay({ result, username }: { result: ScanResult; username?: string }) {
  if (!result) return null;
  return (
    <div
      className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 z-10
        ${result === "granted" ? "bg-green-500/95" : "bg-red-500/95"}`}
      style={{ animation: "fadeIn 0.2s ease forwards" }}
    >
      {result === "granted" ? (
        <>
          <IconCheckCircle className="w-14 h-14 text-white" style={{ animation: "pop 0.3s ease forwards" }} />
          <p className="text-white font-bold">Access Granted</p>
          {username && <p className="text-white/80 text-sm">Welcome, {username.split(" ")[0]}</p>}
        </>
      ) : (
        <>
          <IconXCircle className="w-14 h-14 text-white" style={{ animation: "pop 0.3s ease forwards" }} />
          <p className="text-white font-bold">Access Denied</p>
          <p className="text-white/80 text-sm">Invalid or unregistered ID</p>
        </>
      )}
    </div>
  );
}

/* ── City Seal ───────────────────────────────────────────────────────────── */
function CitySeal() {
  const [loaded, setLoaded] = useState(true);
  return (
    <div className="seal-float relative inline-block mb-4">
      <span className="seal-ring-1" />
      <span className="seal-ring-2" />
      <div
        className="w-[108px] h-[108px] rounded-full flex items-center justify-center overflow-hidden bg-white/20 border-2 border-white/40"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.3)" }}
      >
        {loaded
          ? <img src="/images/city-seal.png" alt="Calaca City Seal"
              className="w-full h-full object-contain p-2"
              onError={() => setLoaded(false)} />
          : <IconPaw className="w-14 h-14 text-white" />
        }
      </div>
    </div>
  );
}

/* ── Scanner Modal ───────────────────────────────────────────────────────── */
function ScannerModal({
  pendingEmail, pendingUsername, pendingToken, onClose, onVerified, onDenied,
}: {
  pendingEmail: string; pendingUsername: string; pendingToken: string;
  onClose: () => void; onVerified: (user: any, token: string) => void; onDenied: () => void;
}) {
  const [scanValue,   setScanValue]   = useState("");
  const [scanResult,  setScanResult]  = useState<ScanResult>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = () => { if (!scanResult) inputRef.current?.focus(); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [scanResult]);

  const processBarcode = async (value: string) => {
    const clean = value.trim();
    if (!clean || isVerifying) return;
    setIsVerifying(true);
    try {
      const res  = await fetch("/api/auth/verify-barcode", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, barcode: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanResult("granted");
        setTimeout(() => onVerified(data.user, data.token), 1200);
      } else {
        setScanResult("denied");
        setTimeout(() => {
          setScanResult(null); setScanValue(""); setIsVerifying(false);
          inputRef.current?.focus(); onDenied();
        }, 1500);
      }
    } catch {
      setScanResult("denied");
      setTimeout(() => { setScanResult(null); setScanValue(""); setIsVerifying(false); onDenied(); }, 1500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setScanValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { if (val.trim().length >= 4) processBarcode(val); }, 300);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { if (debounceRef.current) clearTimeout(debounceRef.current); processBarcode(scanValue); }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        style={{ animation: "fadeUp 0.3s ease both" }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,#E8680A,#F5882A)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <IconScan className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">SuperAdmin ID Verification</h3>
              <p className="text-white/65 text-xs">Biometric scan required</p>
            </div>
          </div>
          {!scanResult && (
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1">
              <IconX className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-5">
          <p className="text-gray-500 text-xs text-center mb-4">
            Scan your employee ID barcode or QR code to proceed
          </p>
          <div className="relative w-[165px] h-[165px] mx-auto mb-4 rounded-xl bg-orange-50 border border-orange-100">
            <ScanResultOverlay result={scanResult} username={pendingUsername} />
            {!scanResult && (
              <>
                <span className="sc tl" /><span className="sc tr" />
                <span className="sc bl" /><span className="sc br" />
                <div className="absolute left-3 right-3 h-[2px]"
                  style={{
                    background: "linear-gradient(90deg,transparent,#E8680A,transparent)",
                    animation: "scanLine 1.8s ease-in-out infinite",
                  }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <IconScan className="w-9 h-9 text-orange-200" />
                </div>
              </>
            )}
          </div>
          <input
            ref={inputRef} type="password" value={scanValue}
            onChange={handleChange} onKeyDown={handleKeyDown}
            className="opacity-0 absolute w-0 h-0 pointer-events-none"
            autoComplete="off" aria-hidden tabIndex={-1}
          />
          <div className="flex items-center justify-center gap-2 text-xs min-h-[18px] mb-3">
            {!scanResult && !isVerifying && (
              <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              <span className="text-gray-500">Ready — scan your ID now</span></>
            )}
            {!scanResult && isVerifying && (
              <><span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse inline-block" />
              <span className="text-orange-600 font-medium">Verifying…</span></>
            )}
            {scanResult === "granted" && <span className="text-green-600 font-medium">Redirecting…</span>}
            {scanResult === "denied"  && <span className="text-red-500 font-medium">Retrying in a moment…</span>}
          </div>
          <p className="text-xs text-gray-400 text-center">
            Authenticating: <span className="font-medium text-gray-600">{pendingEmail}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Main Login ──────────────────────────────────────────────────────────── */
export function Login() {
  const navigate = useNavigate();
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [pendingEmail,    setPendingEmail]    = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [pendingToken,    setPendingToken]    = useState("");
  const [showScanner,     setShowScanner]     = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (type: ToastType, message: string) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'maintenance') {
          window.location.reload();
          return;
        }
        addToast("error", data.error || "Invalid email or password.");
        return;
      }
      if (data.requiresBarcodeVerification) {
        setPendingEmail(data.email);
        setPendingUsername(data.username);
        setPendingToken(data.pendingToken);
        setShowScanner(true);
        return;
      }
      sessionStorage.setItem("nasaalaga_user", JSON.stringify(data.user));
      sessionStorage.setItem("nasaalaga_token", data.token);
      addToast("success", `Welcome back, ${data.user.username}!`);
      setTimeout(() => navigate("/dashboard"), 400);
    } catch {
      addToast("error", "Network error — is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanVerified = (user: any, token: string) => {
    sessionStorage.setItem("nasaalaga_user", JSON.stringify(user));
    sessionStorage.setItem("nasaalaga_token", token);
    setShowScanner(false);
    navigate("/dashboard");
  };

  const handleGuestLogin = () => {
    sessionStorage.setItem(
      "nasaalaga_user",
      JSON.stringify({ username: "Guest", role: "guest" as UserRole })
    );
    navigate("/dashboard");
  };

  return (
    <>
      <style>{STYLES}</style>
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg,#0a1220 0%,#111827 40%,#1a0e08 70%,#0a1220 100%)",
          filter: showScanner ? "blur(4px) brightness(.7)" : "none",
          transition: "filter .4s ease",
        }}
      >
        {/* Honeycomb — larger cells, more visible */}
        <div className="bg-honeycomb" />

        {/* Drifting blobs — more saturated, wider travel */}
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />

        {/* Card */}
        <div
          className="relative z-10 w-full mx-4 overflow-hidden"
          style={{
            maxWidth: 840,
            borderRadius: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            boxShadow: "0 32px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06)",
          }}
        >
          {/* LEFT — branding */}
          <div
            className="relative flex flex-col items-center justify-center px-7 py-9 overflow-hidden"
            style={{ background: "linear-gradient(150deg,#F5932A 0%,#E8680A 50%,#D04A08 100%)" }}
          >
            <div className="left-stripe" />
            <div className="left-glow" />
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)" }} />

            <div className="relative z-10 flex flex-col items-center text-center w-full">
              <div className="ls1"><CitySeal /></div>

              <div className="ls2">
                <h1 className="text-[30px] font-extrabold text-white tracking-tight mb-0.5"
                  style={{ textShadow: "0 2px 16px rgba(0,0,0,.2)" }}>
                  NASaAlaga
                </h1>
                <p className="text-white/80 text-sm mb-4">Veterinary Management System</p>
              </div>

              <div className="ls3 mb-4">
                <div className="info-chip">
                  <IconBuilding className="w-3.5 h-3.5 text-white/80 shrink-0" />
                  <span className="text-white/90 text-sm font-medium">City of Calaca, Batangas</span>
                </div>
              </div>

              <div className="ls4 flex flex-col gap-2 w-full max-w-[220px] mb-4">
                {[
                  { Icon: IconShield,       label: "Official LGU Gov't System" },
                  { Icon: IconCheckCircle,  label: "ISO 9001 · ISO 27001 Certified" },
                  { Icon: IconScan,         label: "2-Factor Biometric Auth" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="info-chip">
                    <Icon className="w-3.5 h-3.5 text-white/70 shrink-0" />
                    <span className="text-white/85 text-xs">{label}</span>
                  </div>
                ))}
              </div>

              <div className="ls5">
                <div className="info-chip" style={{ paddingTop: 5, paddingBottom: 5 }}>
                  <span className="text-white/55 text-xs">Protected · Data Privacy Act 2012</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="relative flex flex-col justify-center px-8 py-9 overflow-hidden bg-white">
            <div className="right-shimmer" />
            <div className="right-accent" />
            <div className="right-corner-glow" />

            <div className="relative z-10">
              <div className="ls1 mb-5">
                <p className="text-xs font-bold tracking-[.14em] uppercase mb-1.5" style={{ color: "#E8680A" }}>
                  Secure Portal
                </p>
                <h2 className="text-[26px] font-extrabold text-gray-900 tracking-tight leading-tight">
                  Welcome back 👋
                </h2>
                <p className="text-gray-500 text-sm mt-1">Sign in with your verified government account</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="ls2 mb-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="your@email.com"
                    type="email"
                    required
                  />
                </div>

                <div className="ls3 mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="ls4 mb-4">
                  <button type="submit" disabled={isLoading} className="signin-btn">
                    {isLoading
                      ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                            style={{ animation: "spinLoader .65s linear infinite" }}>
                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3" />
                            <path d="M4 12a8 8 0 018-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          Signing in…
                        </span>
                      )
                      : "Sign In"
                    }
                  </button>
                </div>
              </form>

              <div className="ls5 flex items-center justify-between">
                <button onClick={handleGuestLogin}
                  className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                  Continue as Guest
                </button>
                <button onClick={() => navigate("/signup")}
                  className="text-sm font-semibold transition-colors hover:opacity-75"
                  style={{ color: "#E8680A" }}>
                  Create Account →
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] tracking-widest z-10"
          style={{ color: "rgba(255,255,255,.28)" }}>
          © {new Date().getFullYear()} City Government of Calaca · NASaAlaga VMS
        </p>
      </div>

      {showScanner && (
        <ScannerModal
          pendingEmail={pendingEmail}
          pendingUsername={pendingUsername}
          pendingToken={pendingToken}
          onClose={() => setShowScanner(false)}
          onVerified={handleScanVerified}
          onDenied={() => addToast("error", "Access Denied — ID barcode does not match this account.")}
        />
      )}
    </>
  );
}
