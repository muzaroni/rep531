import type { Workout } from "./model";

export function workoutElapsedSeconds(
  workout: Pick<Workout, "startedAt" | "completedAt">,
  now = Date.now(),
): number | null {
  if (!workout.startedAt) return null;
  const end = workout.completedAt ? Date.parse(workout.completedAt) : now;
  return Math.max(0, Math.floor((end - Date.parse(workout.startedAt)) / 1000));
}
export function formatWorkoutDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainder = String(seconds % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}
