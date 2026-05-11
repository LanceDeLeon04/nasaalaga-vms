import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Building2, ScanLine, CheckCircle2, XCircle, X, AlertTriangle, PawPrint,
} from "lucide-react";
import type { UserRole } from "../App";

/* ── Toast ────────────────────────────────────────────────────────────────── */
type ToastType = "error" | "success" | "warning";
interface Toast { id: number; type: ToastType; message: string; }
let _toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm border pointer-events-auto min-w-[280px] max-w-sm
            ${t.type === "error" ? "bg-red-50/95 border-red-200 text-red-800"
            : t.type === "success" ? "bg-green-50/95 border-green-200 text-green-800"
            : "bg-amber-50/95 border-amber-200 text-amber-800"}`}
          style={{ animation: "slideIn 0.3s ease forwards" }}
        >
          {t.type === "error" && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
          {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
          {t.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button onClick={() => onRemove(t.id)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Scan Result Overlay ──────────────────────────────────────────────────── */
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
          <CheckCircle2 className="w-16 h-16 text-white drop-shadow-lg" style={{ animation: "pop 0.3s ease forwards" }} />
          <p className="text-white font-bold text-lg">Access Granted</p>
          {username && <p className="text-white/80 text-sm">Welcome, {username.split(" ")[0]}</p>}
        </>
      ) : (
        <>
          <XCircle className="w-16 h-16 text-white drop-shadow-lg" style={{ animation: "pop 0.3s ease forwards" }} />
          <p className="text-white font-bold text-lg">Access Denied</p>
          <p className="text-white/80 text-sm">Invalid or unregistered ID</p>
        </>
      )}
    </div>
  );
}


/* ── City Seal with PawPrint fallback ────────────────────────────────────── */
function CitySeal() {
  const [loaded, setLoaded] = useState(true);
  return (
    <div className="w-[140px] h-[140px] mx-auto mb-6 rounded-full flex items-center justify-center shadow-xl overflow-hidden bg-white/20">
      {loaded ? (
        <img
          src="/images/city-seal.png"
          alt="Calaca City Seal"
          className="w-full h-full object-contain p-2 drop-shadow-lg"
          onError={() => setLoaded(false)}
        />
      ) : (
        <PawPrint className="w-20 h-20 text-white drop-shadow-lg" />
      )}
    </div>
  );
}

/* ── Scanner Modal ────────────────────────────────────────────────────────── */
function ScannerModal({
  pendingEmail, pendingUsername, pendingToken, onClose, onVerified, onDenied,
}: {
  pendingEmail: string;
  pendingUsername: string;
  pendingToken: string;
  onClose: () => void;
  onVerified: (user: any, token: string) => void;
  onDenied: () => void;
}) {
  const [scanValue, setScanValue] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handleClick = () => { if (!scanResult) inputRef.current?.focus(); };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [scanResult]);

  const processBarcode = async (value: string) => {
    const clean = value.trim();
    if (!clean || isVerifying) return;
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, barcode: clean }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setScanResult("granted");
        setTimeout(() => onVerified(data.user, data.token), 1200);
      } else {
        setScanResult("denied");
        setTimeout(() => {
          setScanResult(null);
          setScanValue("");
          setIsVerifying(false);
          inputRef.current?.focus();
          onDenied();
        }, 1500);
      }
    } catch {
      setScanResult("denied");
      setTimeout(() => {
        setScanResult(null);
        setScanValue("");
        setIsVerifying(false);
        onDenied();
      }, 1500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setScanValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim().length >= 4) processBarcode(val);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      processBarcode(scanValue);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2B5EA6] to-[#3d7ac7] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScanLine className="w-5 h-5 text-white" />
            <h3 className="font-bold text-white text-base">SuperAdmin ID Verification</h3>
          </div>
          {!scanResult && (
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-500 text-sm text-center mb-5">
            Scan your employee ID barcode or QR code to proceed
          </p>

          {/* Scanner frame */}
          <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-5 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50">
            <ScanResultOverlay result={scanResult} username={pendingUsername} />
            {!scanResult && (
              <>
                <span className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#2B5EA6] rounded-tl" />
                <span className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#2B5EA6] rounded-tr" />
                <span className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#2B5EA6] rounded-bl" />
                <span className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#2B5EA6] rounded-br" />
                <div
                  className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-[#2B5EA6] to-transparent"
                  style={{ animation: "scanLine 1.8s ease-in-out infinite" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="w-10 h-10 text-[#2B5EA6]/30" />
                </div>
              </>
            )}
          </div>

          {/* Hidden input — captures scanner hardware input */}
          <input
            ref={inputRef}
            type="password"
            value={scanValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="opacity-0 absolute w-0 h-0 pointer-events-none"
            autoComplete="off"
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* Status */}
          <div className="flex items-center justify-center gap-2 text-sm min-h-[20px]">
            {!scanResult && !isVerifying && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-500">Ready — scan your ID now</span>
              </>
            )}
            {!scanResult && isVerifying && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-blue-600">Verifying…</span>
              </>
            )}
            {scanResult === "granted" && <span className="text-green-600 font-medium">Redirecting…</span>}
            {scanResult === "denied" && <span className="text-red-500 font-medium">Retrying in a moment…</span>}
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            Authenticating: <span className="font-medium text-gray-600">{pendingEmail}</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scanLine { 0% { top: 12%; } 50% { top: 82%; } 100% { top: 12%; } }
        @keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop      { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideIn  { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

/* ── Main Login Component ─────────────────────────────────────────────────── */
export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // SuperAdmin barcode step
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Toasts
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast("error", data.error || "Invalid email or password.");
        return;
      }

      // SuperAdmin → open barcode scanner
      if (data.requiresBarcodeVerification) {
        setPendingEmail(data.email);
        setPendingUsername(data.username);
        setPendingToken(data.pendingToken);
        setShowScanner(true);
        return;
      }

      // Regular user → log in immediately
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

  const handleScanDenied = () => {
    addToast("error", "Access Denied — ID barcode does not match this account.");
  };

  const handleGuestLogin = () => {
    const guestUser = { username: "Guest", role: "guest" as UserRole };
    sessionStorage.setItem("nasaalaga_user", JSON.stringify(guestUser));
    navigate("/dashboard");
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-4 md:py-0">
        {/* Background — city-hall-bg.jpg with gradient fallback */}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-500 ${showScanner ? "blur-md scale-105" : ""}`}
          style={{
            backgroundImage: `url('/images/city-hall-bg.jpg'), linear-gradient(135deg, #1a3a6e 0%, #2B5EA6 50%, #1a5c3a 100%)`,
          }}
        >
          {/* Dark overlay so text is always readable over the photo */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a6e]/80 via-[#2B5EA6]/75 to-[#60A85C]/70" />
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 mx-4 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* Left — branding */}
            <div className="bg-gradient-to-br from-[#F39C3A] to-[#E85D3B] p-6 md:p-8 flex flex-col items-center justify-center text-white">
              <div className="text-center">
                <CitySeal />
                <h1 className="text-2xl md:text-3xl font-bold mb-2">NASaAlaga</h1>
                <p className="text-white/90 text-sm md:text-base mb-6">Veterinary Management System</p>
                <p className="text-white/90 text-xs md:text-sm flex items-center justify-center gap-2 mb-4">
                  <Building2 className="w-4 h-4" />City of Calaca, Batangas
                </p>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-2">
                    <Shield className="w-5 h-5 mt-0.5 shrink-0" />
                    <p className="text-sm text-white/90">Official Calaca City Government Veterinary System</p>
                  </div>
                </div>
                <div className="mt-6 text-xs text-white/80 space-y-1">
                  <p className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    ISO 9001:2015 | ISO/IEC 27001 Certified
                  </p>
                  <p className="text-white/70">Protected by the Data Privacy Act of 2012</p>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">Welcome Back</h2>
              <p className="text-gray-600 text-sm mb-6">Login with your verified account</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    placeholder="your@email.com" type="email" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    placeholder="••••••••" required />
                </div>

                {/* SuperAdmin notice — only shown when scanner would appear */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Demo Accounts:</p>
                  <p>Admin: amie.vergara@nexgov.ph / Vergara$2026</p>
                  <p>BAHW: miguel.sanchez@nexgov.ph / Sanchez$2026</p>
                  <p>Owner: cyrus.cruz@gmail.com / Cruz$2026</p>
                  <p className="flex items-center gap-1 text-blue-500 pt-1">
                    <ScanLine className="w-3 h-3" />SuperAdmin requires ID barcode scan after login
                  </p>
                </div>

                <button type="submit" disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-colors">
                  {isLoading ? "Logging in…" : "Login"}
                </button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button onClick={handleGuestLogin}
                  className="text-blue-600 hover:text-blue-800 text-sm transition-colors">
                  Continue as Guest
                </button>
                <button onClick={() => navigate("/signup")}
                  className="text-[#2B5EA6] hover:text-[#234a85] text-sm font-medium transition-colors">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Modal — only for SuperAdmins */}
      {showScanner && (
        <ScannerModal
          pendingEmail={pendingEmail}
          pendingUsername={pendingUsername}
          pendingToken={pendingToken}
          onClose={() => setShowScanner(false)}
          onVerified={handleScanVerified}
          onDenied={handleScanDenied}
        />
      )}
    </>
  );
}
