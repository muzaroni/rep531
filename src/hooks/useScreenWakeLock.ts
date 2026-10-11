import { useEffect } from "react";

// Screen locks last only while visible. Never retain a late request after cleanup.
export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !navigator.wakeLock) return;
    let disposed = false;
    let pending = false;
    let lock: WakeLockSentinel | null = null;
    const release = () => {
      const current = lock;
      lock = null;
      if (current && !current.released) void current.release().catch(() => {});
    };
    const acquire = async () => {
      if (
        disposed ||
        pending ||
        document.visibilityState !== "visible" ||
        (lock && !lock.released)
      )
        return;
      pending = true;
      try {
        const requested = await navigator.wakeLock.request("screen");
        if (disposed || document.visibilityState !== "visible") {
          await requested.release();
        } else {
          lock = requested;
        }
      } catch {
        // Unsupported policies and low-power refusals must not interrupt logging.
      } finally {
        pending = false;
      }
    };
    const visibility = () => {
      if (document.visibilityState === "visible") void acquire();
      else release();
    };
    void acquire();
    document.addEventListener("visibilitychange", visibility);
    // A later interaction retries if the browser initially refused the request.
    document.addEventListener("pointerdown", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerdown", acquire);
      release();
    };
  }, [enabled]);
}
