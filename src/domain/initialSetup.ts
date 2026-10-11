import { z } from "zod";
import {
  lifts,
  stateSchema,
  type AppState,
  type Lift,
  type Settings,
} from "./model";
import { changeUnits, equipmentForUnits, trainingMax } from "./calculations";
import { nearestLoad } from "./equipment";
const entrySchema = z.object({
  kind: z.enum(["rm", "tm"]),
  value: z.number().finite().positive().max(10000),
});
export type InitialEntry = { kind: "rm" | "tm"; value: number | null };
export type InitialEntries = Record<Lift, InitialEntry>;
export function needsInitialSetup(state: AppState) {
  return (
    state.initialSetupComplete === false &&
    state.cycle === 1 &&
    state.position === 0 &&
    !state.active &&
    state.history.length === 0
  );
}
export function completeInitialSetup(
  state: AppState,
  units: Settings["units"],
  variant: "normal" | "swap",
  entries?: InitialEntries,
): AppState {
  if (!needsInitialSetup(state))
    throw new Error("Initial setup is already complete.");
  const settings = { ...changeUnits(state.settings, units) };
  if (entries) {
    settings.maxes = { ...settings.maxes };
    settings.oneRepMaxes = { ...settings.oneRepMaxes };
    for (const lift of lifts) {
      const parsed = entrySchema.safeParse(entries[lift]);
      if (!parsed.success)
        throw new Error("Enter a positive 1RM or TM for all four lifts.");
      const entry = parsed.data;
      settings.maxes[lift] = nearestLoad(
        entry.kind === "rm" ? trainingMax(entry.value) : entry.value,
        equipmentForUnits(settings),
        settings.rounding,
      );
      settings.oneRepMaxes[lift] = entry.kind === "rm" ? entry.value : null;
    }
  }
  return stateSchema.parse({
    ...state,
    initialSetupComplete: true,
    settings: {
      ...settings,
      cycleVariants: { ...settings.cycleVariants, [state.cycle]: variant },
    },
  });
}
