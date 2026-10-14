import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings, Workout } from "../domain/model";
import {
  nextTimerSet,
  pauseRestTimer,
  resumeRestTimer,
  extendRestTimer,
  shortenRestTimer,
  startRestTimer,
  timerSeconds,
  restTimerSchema,
  type RestTimerState,
} from "../domain/restTimer";
import { stopChime, unlockAudio } from "../lib/timerAudio";
import { alertTimerComplete } from "../lib/timerAlerts";
const storageKey = "bbb-rest-timer";
function loadTimer(): RestTimerState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return restTimerSchema.parse(JSON.parse(raw));
    const legacy = Number(localStorage.getItem("bbb-timer"));
    return legacy > Date.now()
      ? startRestTimer(Math.ceil((legacy - Date.now()) / 1000), Date.now())
      : null;
  } catch {
    return null;
  }
}
export function useRestTimer(
  ready: boolean,
  settings: Settings,
  workout: Workout | null,
) {
  const [timer, setTimer] = useState(loadTimer);
  const timerRef = useRef(timer);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const current = useRef({ settings, workout });
  current.current = { settings, workout };
  const replace = useCallback((next: RestTimerState | null) => {
    stopChime();
    timerRef.current = next;
    setTimer(next);
    try {
      localStorage.removeItem("bbb-timer");
      if (next) localStorage.setItem(storageKey, JSON.stringify(next));
      else localStorage.removeItem(storageKey);
    } catch {
      /* Countdown still works if transient storage is unavailable. */
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      const active = timerRef.current;
      if (!active?.deadline || time < active.deadline || active.completed)
        return;
      replace({
        ...active,
        deadline: null,
        pausedSeconds: null,
        completed: true,
      });
      setOpen(true);
      const next = nextTimerSet(current.current.workout, active);
      void alertTimerComplete(
        current.current.settings,
        active.id,
        next
          ? `${next.set.name}: ${next.set.weight} ${next.units} × ${next.set.reps}${next.set.plus ? "+" : ""}. ${next.plates}`
          : "Your rest is over. Ready for the next set.",
      );
    };
    tick();
    if (!timerRef.current?.deadline) return;
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ready, replace, timer?.deadline]);
  const start = useCallback(
    (
      seconds: number,
      context: { workoutId?: string; afterSetId?: string } = {},
    ) => {
      unlockAudio();
      replace(startRestTimer(seconds, Date.now(), context));
      setNow(Date.now());
      setOpen(true);
    },
    [replace],
  );
  const stop = useCallback(() => {
    replace(null);
    setOpen(false);
  }, [replace]);
  return {
    timer,
    open,
    setOpen: (visible: boolean) => {
      if (!visible) stopChime();
      setOpen(visible);
    },
    start,
    stop,
    left: timerSeconds(timer, now),
    pause: () => {
      const t = timerRef.current;
      if (t && !t.completed) replace(pauseRestTimer(t, Date.now()));
    },
    resume: () => {
      const t = timerRef.current;
      if (t && t.pausedSeconds !== null) {
        unlockAudio();
        replace(resumeRestTimer(t, Date.now()));
      }
    },
    extend: () => {
      const t = timerRef.current;
      if (t && !t.completed && t.totalSeconds < 86400)
        replace(extendRestTimer(t, Math.min(15, 86400 - t.totalSeconds)));
    },
    shorten: () => {
      const t = timerRef.current;
      if (t && !t.completed) replace(shortenRestTimer(t, 15, Date.now()));
    },
    restart: () => {
      const t = timerRef.current;
      if (t)
        start(t.totalSeconds, {
          workoutId: t.workoutId,
          afterSetId: t.afterSetId,
        });
    },
  };
}
export type RestTimerController = ReturnType<typeof useRestTimer>;
