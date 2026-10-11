import type { AppState, Settings, Workout, WorkoutSet } from "./model";
import { convertWeight, equipmentForUnits, roundWeight } from "./calculations";
import { nearestLoad } from "./equipment";

// Convert only when units differ, preserving IDs, progress and prescriptions.
// Historical callers use this as a view; their original records stay untouched.
export function workoutInPreferredUnits(
  workout: Workout,
  settings: Settings,
): Workout {
  if (workout.units === settings.units) return workout;
  const equipment = equipmentForUnits(settings);
  const converted = (weight: number) =>
    convertWeight(weight, workout.units, settings.units);
  const barbell = (weight: number) =>
    nearestLoad(converted(weight), equipment, settings.rounding);
  const setInUnits = (set: WorkoutSet): WorkoutSet => ({
    ...set,
    weight:
      set.kind === "accessory"
        ? roundWeight(converted(set.weight), settings.units === "kg" ? 2.5 : 5)
        : barbell(set.weight),
  });
  return {
    ...workout,
    units: settings.units,
    tm: barbell(workout.tm),
    bbbTm: barbell(workout.bbbTm),
    bar: equipment.bars[equipment.barIndex].weight,
    plates: [...equipment.plates],
    sets: workout.sets.map(setInUnits),
    ...(workout.accessorySetOverrides
      ? {
          accessorySetOverrides: Object.fromEntries(
            Object.entries(workout.accessorySetOverrides).map(
              ([key, override]) => [
                key,
                { ...override, template: setInUnits(override.template) },
              ],
            ),
          ),
        }
      : {}),
  };
}

export function editableWorkoutsInPreferredUnits(state: AppState): AppState {
  const active = state.active
    ? workoutInPreferredUnits(state.active, state.settings)
    : state.active;
  const pastWorkout = state.pastWorkout
    ? workoutInPreferredUnits(state.pastWorkout, state.settings)
    : state.pastWorkout;
  if (active === state.active && pastWorkout === state.pastWorkout)
    return state;
  return {
    ...state,
    active,
    ...(pastWorkout !== undefined ? { pastWorkout } : {}),
  };
}
