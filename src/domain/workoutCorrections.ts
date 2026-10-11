import {
  type AppState,
  type Workout,
  stateSchema,
  workoutSchema,
} from "./model";
import { convertWeight } from "./calculations";
import { workoutInPreferredUnits } from "./workoutUnits";
import { calendarDate } from "./calendar";
import { workoutWithDate } from "./pastWorkouts";

export function discardActiveWorkout(state: AppState): AppState {
  return { ...state, active: null };
}

// Apply explicit corrections only, retaining untouched original-unit values.
export function correctHistoryWorkout(
  state: AppState,
  id: string,
  edited: Workout,
): AppState {
  const original = state.history.find((record) => record.id === id);
  if (!original?.completedAt) throw new Error("Completed workout not found.");
  workoutSchema.parse(edited);
  const displayed = workoutInPreferredUnits(original, state.settings);
  if (
    edited.id !== id ||
    edited.units !== displayed.units ||
    edited.sets.length !== original.sets.length ||
    edited.sets.some((set, index) => set.id !== original.sets[index].id)
  )
    throw new Error("The workout changed. Reopen it before editing.");
  const corrected: Workout = {
    ...original,
    date:
      edited.date === displayed.date
        ? original.date
        : workoutWithDate(original, calendarDate(edited.date)).date,
    notes: edited.notes,
    sets: original.sets.map((set, index) => ({
      ...set,
      weight:
        edited.sets[index].weight === displayed.sets[index].weight
          ? set.weight
          : Number(
              convertWeight(
                edited.sets[index].weight,
                edited.units,
                original.units,
              ).toFixed(6),
            ),
      reps: edited.sets[index].reps,
      done: edited.sets[index].done,
    })),
  };
  return stateSchema.parse({
    ...state,
    history: state.history.map((record) =>
      record.id === id ? corrected : record,
    ),
  });
}
