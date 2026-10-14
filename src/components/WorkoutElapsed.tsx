import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Timer } from "lucide-react";
import type { Workout } from "../domain/model";
import {
  formatWorkoutDuration,
  workoutElapsedSeconds,
} from "../domain/workoutDuration";

export function WorkoutElapsed({ workout, floating = false }: { workout: Workout; floating?: boolean }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!workout.startedAt || workout.completedAt) return;
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [workout.id, workout.startedAt, workout.completedAt]);
  const elapsed = workoutElapsedSeconds(workout, now);
  if (elapsed === null) return null;
  const timer = (
    <div
      className={`workout-elapsed${floating ? " workout-elapsed-floating" : ""}`}
      role="timer"
      aria-label="Total workout time"
      aria-live="off"
    >
      {floating ? (
        <>
          <span className="workout-elapsed-label">Workout</span>
          <span className="workout-elapsed-readout">
            <Timer size={14} aria-hidden="true" />
            <strong>{formatWorkoutDuration(elapsed)}</strong>
          </span>
        </>
      ) : (
        <>
          <Timer size={16} aria-hidden="true" />
          <span>{workout.completedAt ? "Total time" : "Workout time"}</span>
          <strong>{formatWorkoutDuration(elapsed)}</strong>
        </>
      )}
    </div>
  );
  return floating ? createPortal(timer, document.body) : timer;
}
