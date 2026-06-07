import { useEffect, useRef } from 'react';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Warning modal (5-minute countdown) ───────────────────────────────────────

interface WarningModalProps {
  secondsLeft: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionWarningModal({ secondsLeft, onExtend, onLogout }: WarningModalProps) {
  const pct = secondsLeft / (5 * 60); // 0 → 1
  const radius   = 38;
  const circumf  = 2 * Math.PI * radius;
  const dashOff  = circumf * (1 - pct);

  // urgency colour: green → amber → red
  const colour =
    secondsLeft > 180 ? '#60A85C' :
    secondsLeft > 60  ? '#f59e0b' : '#ef4444';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        style={{ border: '2px solid #e5e7eb' }}
      >
        {/* Top accent bar */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#2B5EA6,#60A85C)' }} />

        <div className="p-8 text-center">
          {/* Countdown ring */}
          <div className="flex justify-center mb-6">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle
                  cx="44" cy="44" r={radius}
                  fill="none"
                  stroke={colour}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumf}
                  strokeDashoffset={dashOff}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black tabular-nums" style={{ color: colour }}>
                  {fmt(secondsLeft)}
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">remaining</span>
              </div>
            </div>
          </div>

          {/* Icon + heading */}
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
              <svg className="w-6 h-6" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-black text-gray-900 mb-2">Session About to Expire</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            You have been inactive for a while. Your session will automatically end when the
            timer reaches zero. Click <strong>Stay Logged In</strong> to continue your session.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold
                         hover:bg-gray-50 transition-colors"
            >
              Log Out Now
            </button>
            <button
              onClick={onExtend}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-bold transition-all
                         hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#2B5EA6,#60A85C)' }}
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Expiry modal (session ended — must click OK) ──────────────────────────────

interface ExpiryModalProps {
  onAcknowledge: () => void;
}

export function SessionExpiredModal({ onAcknowledge }: ExpiryModalProps) {
  // Trap focus inside the modal so keyboard users can't escape without clicking OK
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btnRef.current?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Tab') e.preventDefault();
      if (e.key === 'Enter' || e.key === ' ') onAcknowledge();
    };
    window.addEventListener('keydown', trap);
    return () => window.removeEventListener('keydown', trap);
  }, [onAcknowledge]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
      // Prevent closing by clicking the backdrop
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
        style={{ border: '2px solid #fecaca' }}
      >
        {/* Red accent bar */}
        <div className="h-1.5 w-full bg-red-500" />

        <div className="p-8 text-center">
          {/* Lock icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#fee2e2,#fecaca)' }}>
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-black text-gray-900 mb-2">Session Expired</h2>

          <p className="text-gray-600 text-sm leading-relaxed mb-2">
            Your session has been automatically ended due to inactivity.
          </p>
          <p className="text-gray-400 text-xs leading-relaxed mb-8">
            This is a security measure to protect your account and sensitive
            veterinary data. Please log in again to continue.
          </p>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 mb-6 py-2.5 px-4 rounded-xl
                          bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            For your security — NASaAlaga VMS auto-logout
          </div>

          <button
            ref={btnRef}
            onClick={onAcknowledge}
            className="w-full px-6 py-3.5 rounded-xl text-white font-bold text-sm transition-all
                       hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-300"
            style={{ background: 'linear-gradient(135deg,#2B5EA6,#60A85C)' }}
          >
            OK — Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
