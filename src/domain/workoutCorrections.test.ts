import { describe, it, expect } from "vitest";
import { defaults } from "./model";
import { makeWorkout, convertWeight } from "./calculations";
import { workoutInPreferredUnits } from "./workoutUnits";
import {
  correctHistoryWorkout,
  discardActiveWorkout,
} from "./workoutCorrections";
import { exportBackup, parseBackup } from "../data/storage";

describe("workout corrections", () => {
  it("discards only the active draft without changing progress or other records", () => {
    const state = defaults();
    state.active = makeWorkout(state);
    state.pastWorkout = { ...makeWorkout(state), historyOnly: true };
    const next = discardActiveWorkout(state);
    expect(next).toEqual({ ...state, active: null });
    expect(discardActiveWorkout(next)).toEqual(next);
  });
  it("corrects actual performance while preserving prescriptions, units and cycle progress", () => {
    const state = defaults();
    const original = {
      ...makeWorkout(state),
      completedAt: new Date().toISOString(),
    };
    original.sets[0].weight = 137;
    state.history = [original];
    state.position = 1;
    state.active = makeWorkout(state);
    state.settings.units = "kg";
    const draft = structuredClone(
      workoutInPreferredUnits(original, state.settings),
    );
    draft.sets[1].weight = 60;
    draft.sets[1].reps = 7;
    draft.sets[1].done = true;
    draft.notes = "Corrected entry";
    const next = correctHistoryWorkout(state, original.id, draft);
    expect(next.history[0]).toEqual({
      ...original,
      notes: draft.notes,
      sets: original.sets.map((set, i) =>
        i === 1
          ? {
              ...set,
              weight: Number(convertWeight(60, "kg", "lb").toFixed(6)),
              reps: 7,
              done: true,
            }
          : set,
      ),
    });
    expect({ ...next, history: state.history }).toEqual(state);
    expect(parseBackup(exportBackup(next))).toEqual(next);
    expect(() => correctHistoryWorkout(state, "missing", draft)).toThrow();
    draft.sets[1].reps = -1;
    expect(() => correctHistoryWorkout(state, original.id, draft)).toThrow();
  });
});
