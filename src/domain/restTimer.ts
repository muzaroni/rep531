import { z } from "zod";
import type { Workout } from "./model";
import { plateLoad } from "./calculations";
export const restTimerSchema = z
  .object({
    id: z.string().min(1),
    deadline: z.number().finite().positive().nullable(),
    pausedSeconds: z.number().finite().min(0).max(86400).nullable(),
    totalSeconds: z.number().finite().positive().max(86400),
    completed: z.boolean(),
    workoutId: z.string().optional(),
    afterSetId: z.string().optional(),
  })
  .refine((timer) => !(timer.deadline && timer.pausedSeconds !== null));
export type RestTimerState = z.infer<typeof restTimerSchema>;
export function timerSeconds(
  timer: RestTimerState | null,
  now: number,
): number {
  return (
    timer?.pausedSeconds ??
    (timer?.deadline
      ? Math.max(0, Math.ceil((timer.deadline - now) / 1000))
      : 0)
  );
}
export function startRestTimer(
  seconds: number,
  now: number,
  context: { workoutId?: string; afterSetId?: string } = {},
): RestTimerState {
  return restTimerSchema.parse({
    id: crypto.randomUUID(),
    deadline: now + seconds * 1000,
    pausedSeconds: null,
    totalSeconds: seconds,
    completed: false,
    ...context,
  });
}
export function pauseRestTimer(
  timer: RestTimerState,
  now: number,
): RestTimerState {
  return { ...timer, deadline: null, pausedSeconds: timerSeconds(timer, now) };
}
export function resumeRestTimer(
  timer: RestTimerState,
  now: number,
): RestTimerState {
  return {
    ...timer,
    deadline: now + timerSeconds(timer, now) * 1000,
    pausedSeconds: null,
  };
}
export function extendRestTimer(
  timer: RestTimerState,
  seconds: number,
): RestTimerState {
  return {
    ...timer,
    totalSeconds: Math.min(86400, timer.totalSeconds + seconds),
    deadline: timer.deadline ? timer.deadline + seconds * 1000 : null,
    pausedSeconds:
      timer.pausedSeconds === null
        ? null
        : Math.min(86400, timer.pausedSeconds + seconds),
  };
}
export const setTypeNames = {
  warmup: "Warmup",
  working: "Working",
  bbb: "BBB",
  accessory: "Accessory",
};
export function nextTimerSet(
  workout: Workout | null,
  timer: RestTimerState | null,
) {
  if (!workout || (timer?.workoutId && timer.workoutId !== workout.id))
    return null;
  const start = timer?.afterSetId
    ? workout.sets.findIndex((set) => set.id === timer.afterSetId) + 1
    : 0;
  const set =
    workout.sets.slice(start).find((set) => !set.done) ??
    workout.sets.find((set) => !set.done);
  if (!set) return null;
  return {
    set,
    units: workout.units,
    plates: timerPlates(
      set.weight,
      workout.bar,
      workout.plates,
      workout.units,
      set.kind === "accessory",
    ),
  };
}
export function timerPlates(
  weight: number,
  bar: number,
  plates: number[],
  units: string,
  accessory = false,
): string {
  if (accessory) return "Accessory equipment";
  const load = plateLoad(weight, bar, plates);
  if (!load.exact)
    return `Unavailable · nearest lower load ${load.actual} ${units}`;
  if (!load.plates.length) return `Empty bar · ${bar} ${units}`;
  const counts = new Map<number, number>();
  for (const plate of load.plates)
    counts.set(plate, (counts.get(plate) ?? 0) + 1);
  return `Per side: ${[...counts].map(([plate, count]) => `${count > 1 ? `${count} × ` : ""}${plate}`).join(" + ")} ${units}`;
}
export function timerClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
