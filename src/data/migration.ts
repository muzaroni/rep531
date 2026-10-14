import { addMissingPresets } from "../domain/accessories";
import { z } from "zod";
import {
  defaultEquipment,
  settingsBaseSchema,
  stateBaseSchema,
  stateSchema,
  workoutSchema,
  type AppState,
  type AccessoryCategory,
} from "../domain/model";

// Validate v1's original shape before adapting it. Never infer new fields in an
// invalid or unknown backup, or rewrite historical workout prescriptions.
const legacyAccessory = settingsBaseSchema.shape.accessories.element
  .omit({ category: true })
  .extend({ lift: workoutSchema.shape.lift });
const legacySettings = settingsBaseSchema
  .omit({
    equipment: true,
    cycleVariants: true,
    accessoryAssignments: true,
    oneRepMaxes: true,
  })
  .extend({
    accessories: z.array(legacyAccessory).max(100),
    bars: defaultBarSchema(),
    barIndex: z.number().int().min(0),
    plates: workoutSchema.shape.plates,
  })
  .refine((s) => s.barIndex < s.bars.length, {
    message: "Selected bar is unavailable",
  });
function defaultBarSchema() {
  return settingsBaseSchema.shape.equipment.shape.lb.innerType().shape.bars;
}
const legacyWorkout = workoutSchema.omit({
  variant: true,
  bbbLift: true,
  bbbTm: true,
});
const legacyState = stateBaseSchema.extend({
  schemaVersion: z.literal(1),
  settings: legacySettings,
  active: legacyWorkout.nullable(),
  history: z.array(legacyWorkout),
});
function inferCategory(name: string, lift: string): AccessoryCategory {
  if (/\babs?\b|abdominal|crunch|plank|leg raise|sit.?up/i.test(name))
    return "abs";
  if (/row|pull|chin|curl|\blat\b|shrug/i.test(name)) return "pull";
  return lift === "squat" || lift === "deadlift" ? "legs" : "push";
}
function applyAccessoryDefaults(state: AppState): AppState {
  if (state.settings.accessoryDefaultsVersion === 1) return state;
  return {
    ...state,
    settings: {
      ...state.settings,
      accessoryDefaultsVersion: 1,
      accessories: state.settings.accessories.map((exercise) => ({
        ...exercise,
        sets: 5,
        reps: 10,
      })),
    },
  };
}
function useEventHorizon(state: AppState): AppState {
  if (state.settings.accent === "horizon") return state;
  return { ...state, settings: { ...state.settings, accent: "horizon" } };
}
export function upgradeState(value: unknown): AppState {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value)
  )
    return useEventHorizon(stateSchema.parse(value));
  if (value.schemaVersion === 2) {
    const oldSchema = stateBaseSchema.extend({
      schemaVersion: z.literal(2),
      settings: settingsBaseSchema.omit({ oneRepMaxes: true }),
    });
    const old = oldSchema.parse(value);
    // Validate all current invariants before augmenting the catalog.
    const upgraded = stateSchema.parse({
      ...old,
      schemaVersion: 3,
      settings: {
        ...old.settings,
        oneRepMaxes: { squat: null, bench: null, deadlift: null, press: null },
      },
    });
    upgraded.settings.accessories = addMissingPresets(
      upgraded.settings.accessories,
    );
    upgraded.settings.legPresetVersion = 1;
    return useEventHorizon(stateSchema.parse(applyAccessoryDefaults(upgraded)));
  }
  if (value.schemaVersion !== 1) {
    const current = stateSchema.parse(value);
    if (current.settings.legPresetVersion !== 1) {
      current.settings.accessories = addMissingPresets(
        current.settings.accessories,
        ["legs"],
      );
      current.settings.legPresetVersion = 1;
    }
    return useEventHorizon(stateSchema.parse(applyAccessoryDefaults(current)));
  }
  const old = legacyState.parse(value),
    equipment = defaultEquipment();
  equipment[old.settings.units] = {
    bars: old.settings.bars,
    barIndex: old.settings.barIndex,
    plates: old.settings.plates,
  };
  const assignments = {
    squat: [] as string[],
    bench: [] as string[],
    deadlift: [] as string[],
    press: [] as string[],
  };
  const accessories = old.settings.accessories.map(({ lift, ...a }) => {
    assignments[lift].push(a.id);
    return { ...a, category: inferCategory(a.name, lift) };
  });
  const {
    bars: _bars,
    plates: _plates,
    barIndex: _barIndex,
    ...settings
  } = old.settings;
  const migrateWorkout = (w: z.infer<typeof legacyWorkout>) => ({
    ...w,
    variant: "normal" as const,
    bbbLift: w.lift,
    bbbTm: w.tm,
  });
  return upgradeState({
    ...old,
    schemaVersion: 2,
    settings: {
      ...settings,
      equipment,
      accessories,
      accessoryAssignments: assignments,
      cycleVariants: {},
    },
    active: old.active ? migrateWorkout(old.active) : null,
    history: old.history.map(migrateWorkout),
  });
}
