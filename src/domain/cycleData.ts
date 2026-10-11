import { stateSchema, type AppState } from "./model";
// Clear cycle records and cardio without resetting personal training preferences.
export function resetCycle(state: AppState): AppState {
  return stateSchema.parse({
    ...state,
    cycle: 1,
    position: 0,
    active: null,
    cardio: [],
  });
}
export function deleteAllCycles(state: AppState): AppState {
  const { cycleSetup: _cycleSetup, ...kept } = state;
  return stateSchema.parse({
    ...kept,
    cycle: 1,
    position: 0,
    active: null,
    pastWorkout: null,
    history: [],
    cardio: [],
    settings: { ...state.settings, cycleVariants: {} },
  });
}
