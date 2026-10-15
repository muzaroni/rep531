import {
  type AppState,
  type Workout,
  type WorkoutSet,
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

export function deleteHistoryWorkout(state: AppState, id: string): AppState {
  if (!state.history.some(record => record.id === id && record.completedAt))
    throw new Error("Completed workout not found.");
  return stateSchema.parse({
    ...state,
    history: state.history.filter(record => record.id !== id),
  });
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
    JSON.stringify(edited.sets.filter(set => set.kind !== "accessory").map(set => set.id)) !== JSON.stringify(original.sets.filter(set => set.kind !== "accessory").map(set => set.id)) ||
    edited.sets.some(set => original.sets.some(before => before.id === set.id && before.kind !== set.kind))
  )
    throw new Error("The workout changed. Reopen it before editing.");
  const convertSet = (set: WorkoutSet, before?: WorkoutSet, shown?: WorkoutSet): WorkoutSet => ({
    ...(before ?? set),
    weight: before && shown && set.weight === shown.weight ? before.weight : Number(convertWeight(set.weight, edited.units, original.units).toFixed(6)),
    reps: set.reps,
    done: set.done,
  });
  const corrected: Workout = {
    ...original,
    date:
      edited.date === displayed.date
        ? original.date
        : workoutWithDate(original, calendarDate(edited.date)).date,
    notes: edited.notes,
    sets: edited.sets.map(set => convertSet(set, original.sets.find(before => before.id === set.id), displayed.sets.find(shown => shown.id === set.id))),
    ...(edited.accessorySetOverrides ? { accessorySetOverrides: Object.fromEntries(Object.entries(edited.accessorySetOverrides).map(([key, override]) => [key, {
      ...override, template: convertSet(override.template, original.accessorySetOverrides?.[key]?.template, displayed.accessorySetOverrides?.[key]?.template),
    }])) } : {}),
  };
  return stateSchema.parse({
    ...state,
    history: state.history.map((record) =>
      record.id === id ? corrected : record,
    ),
  });
}
