import { useState, useEffect, useRef, useCallback } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export type UserRole = 'admin' | 'superadmin' | 'bahw' | 'petOwner' | 'livestockManager' | 'owner' | 'guest' | 'cityHealth' | 'both' | null;

export interface User {
  id?: string;
  username: string;
  role: UserRole;
  ownerId?: string;
  email?: string;
  barangay?: string;
}

// ── Secret bypass: Shift + Alt + S  A  (typed while holding Shift+Alt, press S then A)
// Sequence window: 2 seconds between keys
const SECRET_SEQUENCE = ['S', 'A'];
const REQUIRED_MODIFIERS = { shift: true, alt: true };

function MaintenancePage({ onBypass }: { onBypass: () => void }) {
  const seqRef   = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ghost hint: faint flicker after 30s of inactivity to hint something exists
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHintTimer = useCallback(() => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintVisible(false);
    hintTimer.current = setTimeout(() => setHintVisible(true), 30_000);
  }, []);

  useEffect(() => {
    resetHintTimer();
    const onKey = (e: KeyboardEvent) => {
      resetHintTimer();

      const modOk =
        e.shiftKey === (REQUIRED_MODIFIERS.shift ?? false) &&
        e.altKey   === (REQUIRED_MODIFIERS.alt   ?? false);

      if (!modOk) {
        seqRef.current = [];
        return;
      }

      const key = e.key.toUpperCase();

      // Only track keys that are part of the sequence
      if (!SECRET_SEQUENCE.includes(key)) {
        seqRef.current = [];
        return;
      }

      seqRef.current = [...seqRef.current, key];

      // Reset sequence window timer
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { seqRef.current = []; }, 2000);

      // Check for match
      const seq = seqRef.current;
      if (seq.length >= SECRET_SEQUENCE.length) {
        const tail = seq.slice(-SECRET_SEQUENCE.length);
        if (tail.every((k, i) => k === SECRET_SEQUENCE[i])) {
          seqRef.current = [];
          if (timerRef.current) clearTimeout(timerRef.current);
          onBypass();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [onBypass, resetHintTimer]);

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative bg-[#0a0f1e]">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#2B5EA6]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#60A85C]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2B5EA6]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(43,94,166,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(43,94,166,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10 text-center px-8 max-w-2xl mx-auto">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-28 h-28 bg-gradient-to-br from-[#2B5EA6] to-[#60A85C] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#2B5EA6]/40">
              <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="absolute -inset-2 border-2 border-dashed border-[#2B5EA6]/40 rounded-[2rem] animate-spin" style={{ animationDuration: '8s' }} />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          System Maintenance
        </div>

        <h1 className="text-5xl font-black text-white mb-4 leading-tight">
          We'll be back{' '}
          <span className="bg-gradient-to-r from-[#4a8fef] to-[#60A85C] bg-clip-text text-transparent">
            shortly
          </span>
        </h1>
        <p className="text-xl text-slate-400 mb-3 font-medium">
          NASaAlaga VMS is currently undergoing maintenance
        </p>
        <p className="text-slate-500 text-sm mb-10 max-w-md mx-auto leading-relaxed">
          Our team is working hard to improve your experience. The Calaca City Veterinary Management System will be back online very soon.
        </p>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Database', status: 'Optimizing', color: 'amber' },
            { label: 'Server',   status: 'Updating',   color: 'blue'  },
            { label: 'Security', status: 'Patching',   color: 'green' },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 animate-pulse ${
                item.color === 'amber' ? 'bg-amber-400' :
                item.color === 'blue'  ? 'bg-blue-400'  : 'bg-green-400'
              }`} />
              <p className="text-white text-sm font-semibold">{item.label}</p>
              <p className={`text-xs mt-1 ${
                item.color === 'amber' ? 'text-amber-400' :
                item.color === 'blue'  ? 'text-blue-400'  : 'text-green-400'
              }`}>{item.status}</p>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-xs">
          Calaca City Veterinary Office &mdash; NASaAlaga VMS &copy; 2025
        </p>

        {/* Ghost hint — appears after 30 s of no interaction, invisible to regular users */}
        <p
          className="mt-6 text-[10px] tracking-widest uppercase transition-all duration-1000"
          style={{
            color: hintVisible ? 'rgba(255,255,255,0.06)' : 'transparent',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          administrator access available
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [maintenance, setMaintenance]       = useState(false);
  const [bypassed, setBypassed]             = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await fetch('/api/health');
        const res = await fetch('/api/system/maintenance');
        if (res.ok) {
          const data = await res.json();
          if (data.maintenance) {
            // Still allow already-logged-in superadmins through
            const stored = sessionStorage.getItem('nasaalaga_user');
            const user   = stored ? JSON.parse(stored) : null;
            if (!user || user.role !== 'superadmin') {
              setMaintenance(true);
            }
          }
        }
      } catch (_) {}
      setIsInitializing(false);
    };
    init();
  }, []);

  const handleBypass = useCallback(() => {
    setBypassed(true);
    setMaintenance(false);
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a3a6e] via-[#2B5EA6] to-[#60A85C] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold">Initializing NASaAlaga...</p>
          <p className="text-white/70 text-sm mt-1">Calaca City Veterinary Management System</p>
        </div>
      </div>
    );
  }

  if (maintenance && !bypassed) {
    return <MaintenancePage onBypass={handleBypass} />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
