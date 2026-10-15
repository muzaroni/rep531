import { lifts, stateSchema, type AppState, type Settings } from "./model";
import { convertWeight, equipmentForUnits, makeWorkout } from "./calculations";
import { nearestLoad } from "./equipment";
export type CycleMaxMode = "keep" | "increase" | "custom";
export function needsCycleSetup(state: AppState) {
  return (
    !state.active &&
    state.position === 0 &&
    state.cycle > 1 &&
    !(state.cycleSetup?.cycle === state.cycle && state.cycleSetup.confirmed)
  );
}
export function previousCycleMaxes(state: AppState): Settings["maxes"] {
  const setup =
    state.cycleSetup?.cycle === state.cycle ? state.cycleSetup : null;
  if (!setup) return { ...state.settings.maxes };
  return Object.fromEntries(
    lifts.map((lift) => [
      lift,
      setup.units === state.settings.units
        ? setup.previousMaxes[lift]
        : nearestLoad(
            convertWeight(
              setup.previousMaxes[lift],
              setup.units,
              state.settings.units,
            ),
            equipmentForUnits(state.settings),
            state.settings.rounding,
          ),
    ]),
  ) as Settings["maxes"];
}
export function cycleMaxes(
  state: AppState,
  mode: CycleMaxMode,
  custom: Settings["maxes"],
): Settings["maxes"] {
  const previous = previousCycleMaxes(state);
  return Object.fromEntries(
    lifts.map((lift) => [
      lift,
      nearestLoad(
        mode === "custom"
          ? custom[lift]
          : previous[lift] +
              (mode === "increase" ? state.settings.increases[lift] : 0),
        equipmentForUnits(state.settings),
        state.settings.rounding,
      ),
    ]),
  ) as Settings["maxes"];
}
export function confirmCycleSettings(
  state: AppState,
  maxes: Settings["maxes"],
  variant: "normal" | "swap",
): AppState {
  if (!needsCycleSetup(state))
    throw new Error("This cycle has already started.");
  // Validate input before rounding so invalid values cannot become valid loads.
  stateSchema.parse({ ...state, settings: { ...state.settings, maxes } });
  const next: AppState = {
    ...state,
    settings: {
      ...state.settings,
      maxes: cycleMaxes(state, "custom", maxes),
      cycleVariants: {
        ...state.settings.cycleVariants,
        [state.cycle]: variant,
      },
    },
    cycleSetup: {
      cycle: state.cycle,
      previousMaxes: previousCycleMaxes(state),
      units: state.settings.units,
      confirmed: true,
    },
  };
  return stateSchema.parse(next);
}
export function startCycle(
  state: AppState,
  maxes: Settings["maxes"],
  variant: "normal" | "swap",
): AppState {
  const next = confirmCycleSettings(state, maxes, variant);
  return stateSchema.parse({ ...next, active: makeWorkout(next) });
}
