import { useEffect, useRef, useState, useCallback } from 'react';

const INACTIVITY_MS = 15 * 60 * 1000;
const WARNING_S = 30;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const;

const useInactivityLogout = (onLogout: () => void) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_S);
  const inactivityTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningInterval  = useRef<ReturnType<typeof setInterval> | null>(null);
  const titleInterval    = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitle    = useRef(document.title);
  const isWarningActive  = useRef(false);
  const onLogoutRef      = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const clearAllTimers = () => {
    if (inactivityTimer.current)  clearTimeout(inactivityTimer.current);
    if (warningInterval.current)  clearInterval(warningInterval.current);
    if (titleInterval.current)    clearInterval(titleInterval.current);
  };

  const stopTitlePing = useCallback(() => {
    if (titleInterval.current) clearInterval(titleInterval.current);
    document.title = originalTitle.current;
  }, []);

  const startTitlePing = useCallback(() => {
    let toggle = false;
    titleInterval.current = setInterval(() => {
      document.title = toggle ? originalTitle.current : '⚠ Session Expiring';
      toggle = !toggle;
    }, 1000);
  }, []);

  const startInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      isWarningActive.current = true;
      setShowWarning(true);
      setCountdown(WARNING_S);
      startTitlePing();
      let remaining = WARNING_S;
      warningInterval.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearAllTimers();
          stopTitlePing();
          onLogoutRef.current();
        }
      }, 1000);
    }, INACTIVITY_MS);
  }, [startTitlePing, stopTitlePing]);

  const dismiss = useCallback(() => {
    clearAllTimers();
    stopTitlePing();
    isWarningActive.current = false;
    setShowWarning(false);
    setCountdown(WARNING_S);
    startInactivityTimer();
  }, [startInactivityTimer, stopTitlePing]);

  useEffect(() => {
    const handleActivity = () => {
      if (isWarningActive.current) return;
      startInactivityTimer();
    };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    startInactivityTimer();
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
      clearAllTimers();
      stopTitlePing();
    };
  }, [startInactivityTimer, stopTitlePing]);

  return { showWarning, countdown, dismiss };
};

export default useInactivityLogout;
