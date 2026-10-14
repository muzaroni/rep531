import { variantSchema, type AppState, type Variant } from "./model";

// Only future prescriptions read this setting; snapshots remain untouched.
export function changeCycleVariation(state: AppState, variant: Variant): AppState {
  const selected = variantSchema.parse(variant);
  return {
    ...state,
    settings: {
      ...state.settings,
      cycleVariants: { ...state.settings.cycleVariants, [state.cycle]: selected },
    },
  };
}
