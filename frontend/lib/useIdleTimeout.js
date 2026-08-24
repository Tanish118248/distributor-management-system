import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";

const IDLE_LIMIT_MS = 15 * 60 * 1000;   // 15 minutes of inactivity → logout
const WARNING_BEFORE_MS = 60 * 1000;     // show warning 1 minute before logout

export function useIdleTimeout() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const warningTimer = useRef(null);
  const logoutTimer = useRef(null);

  const doLogout = useCallback(() => {
    localStorage.removeItem("dsms_token");
    router.push("/login?reason=timeout");
  }, [router]);

  const resetTimers = useCallback(() => {
    setShowWarning(false);
    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, IDLE_LIMIT_MS - WARNING_BEFORE_MS);

    logoutTimer.current = setTimeout(() => {
      doLogout();
    }, IDLE_LIMIT_MS);
  }, [doLogout]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimers));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers));
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [resetTimers]);

  const stayLoggedIn = () => resetTimers();

  return { showWarning, stayLoggedIn, doLogout };
}