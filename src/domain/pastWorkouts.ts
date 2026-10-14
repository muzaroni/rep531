import { z } from "zod";
import {
  type AppState,
  type Lift,
  type Workout,
  lifts,
  stateSchema,
} from "./model";
import { calendarDate, calendarDay } from "./calendar";
import { canFinishWorkout, finishWorkout, makeWorkout } from "./calculations";

export function workoutWithDate(
  workout: Workout,
  date: string,
  now = new Date(),
): Workout {
  if (!z.string().date().safeParse(date).success || date > calendarDate(now))
    throw new Error("Choose a valid workout date on or before today.");
  return { ...workout, date: calendarDay(date).toISOString() };
}

export function createPastWorkout(
  state: AppState,
  input: { date: string; cycle: number; week: number; lift: Lift },
  now = new Date(),
): Workout {
  if (state.pastWorkout)
    throw new Error("Resume or discard your existing past workout first.");
  if (
    !Number.isInteger(input.cycle) ||
    input.cycle < 1 ||
    input.cycle > state.cycle ||
    !Number.isInteger(input.week) ||
    input.week < 1 ||
    input.week > 4 ||
    !lifts.includes(input.lift)
  )
    throw new Error("Choose a valid cycle, week and lift.");
  const workout = makeWorkout({
    ...state,
    cycle: input.cycle,
    position: (input.week - 1) * 4 + state.settings.order.indexOf(input.lift),
    active: null,
  });
  return {
    ...workoutWithDate(workout, input.date, now),
    startedAt: undefined,
    historyOnly: true,
  };
}

export function canAdvancePastWorkout(state: AppState): boolean {
  const workout = state.pastWorkout;
  return (
    !!workout &&
    !state.active &&
    workout.cycle === state.cycle &&
    workout.week === Math.floor(state.position / 4) + 1 &&
    workout.lift === state.settings.order[state.position % 4]
  );
}

export function savePastWorkout(
  state: AppState,
  advance = false,
  now = new Date(),
): AppState {
  if (state.pastWorkout?.completedAt)
    throw new Error("This workout is already completed.");
  if (!state.pastWorkout || !canFinishWorkout(state.pastWorkout))
    throw new Error("Complete the main and BBB sets before saving.");
  const workout = workoutWithDate(
    state.pastWorkout,
    calendarDate(state.pastWorkout.date),
    now,
  );
  if (state.history.some((record) => record.id === workout.id))
    throw new Error("This workout is already saved.");
  if (advance) {
    if (!canAdvancePastWorkout(state))
      throw new Error(
        "Only your next program session can advance progress, with no active workout.",
      );
    return stateSchema.parse(
      finishWorkout({
        ...state,
        pastWorkout: null,
        active: { ...workout, historyOnly: false },
      }),
    );
  }
  return stateSchema.parse({
    ...state,
    pastWorkout: null,
    history: [
      ...state.history,
      { ...workout, historyOnly: true, completedAt: now.toISOString() },
    ],
  });
}

// Update the stored snapshot, never a display copy converted to preferred units.
export function moveHistoryWorkoutDate(
  state: AppState,
  id: string,
  date: string,
  now = new Date(),
): AppState {
  const workout = state.history.find((record) => record.id === id);
  if (!workout?.completedAt) throw new Error("Completed workout not found.");
  const moved = workoutWithDate(workout, date, now);
  return {
    ...state,
    history: state.history.map((record) => (record.id === id ? moved : record)),
  };
}
