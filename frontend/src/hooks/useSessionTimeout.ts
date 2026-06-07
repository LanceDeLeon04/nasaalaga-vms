import { useState, useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS    = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_MS  =  5 * 60 * 1000; //  warn at 5-minute mark (5 min remaining)
const WARNING_DURATION_S = 5 * 60;          // 5-minute countdown shown in modal

type Phase = 'active' | 'warning' | 'expired';

interface SessionTimeoutState {
  phase: Phase;
  secondsLeft: number;          // only meaningful during 'warning'
  extendSession: () => void;
  acknowledgeExpiry: () => void; // clears expired state after user clicks OK
}

/**
 * Tracks user activity and drives the three-phase session lifecycle:
 *   active  → (5 min of idle remaining triggers warning)
 *   warning → (5-min countdown; extendSession() resets to active)
 *   expired → (countdown hit 0; acknowledgeExpiry() clears session + notifies caller)
 *
 * The hook itself does NOT touch sessionStorage or navigate — those side-effects
 * live in the component that consumes this hook so they can stay testable.
 */
export function useSessionTimeout(): SessionTimeoutState {
  const [phase, setPhase]            = useState<Phase>('active');
  const [secondsLeft, setSecondsLeft] = useState<number>(WARNING_DURATION_S);

  const idleTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef        = useRef<number>(WARNING_DURATION_S);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const startCountdown = useCallback(() => {
    clearCountdown();
    secondsRef.current = WARNING_DURATION_S;
    setSecondsLeft(WARNING_DURATION_S);

    countdownTimerRef.current = setInterval(() => {
      secondsRef.current -= 1;
      setSecondsLeft(secondsRef.current);

      if (secondsRef.current <= 0) {
        clearCountdown();
        setPhase('expired');
      }
    }, 1_000);
  }, []);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      setPhase('warning');
      startCountdown();
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS); // fire when 5 min of idle remain
  }, [startCountdown]);

  // ── activity listeners ───────────────────────────────────────────────────────

  const resetIdle = useCallback(() => {
    if (phase === 'active') startIdleTimer();
    // Intentionally ignore resets while in warning / expired phases
  }, [phase, startIdleTimer]);

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = [
      'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
    ];

    const handleActivity = () => resetIdle();

    events.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }));
    startIdleTimer(); // kick off immediately

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleActivity));
      clearIdleTimer();
      clearCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);                    // run once on mount

  // When phase changes back to 'active' (after extendSession), restart idle timer
  useEffect(() => {
    if (phase === 'active') {
      startIdleTimer();
    } else {
      clearIdleTimer();      // don't reset by activity while warning/expired
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── public API ───────────────────────────────────────────────────────────────

  const extendSession = useCallback(() => {
    clearCountdown();
    secondsRef.current = WARNING_DURATION_S;
    setSecondsLeft(WARNING_DURATION_S);
    setPhase('active');
  }, []);

  const acknowledgeExpiry = useCallback(() => {
    // Caller is responsible for clearing sessionStorage + navigating to login.
    // This just resets the hook's internal state so it doesn't re-trigger.
    clearCountdown();
    setPhase('active');
  }, []);

  return { phase, secondsLeft, extendSession, acknowledgeExpiry };
}
