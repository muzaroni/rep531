import { describe, it, expect } from "vitest";
import { defaults } from "./model";
import { makeWorkout, convertWeight } from "./calculations";
import { workoutInPreferredUnits } from "./workoutUnits";
import {
  correctHistoryWorkout,
  discardActiveWorkout,
  deleteHistoryWorkout,
} from "./workoutCorrections";
import { exportBackup, parseBackup } from "../data/storage";
import { addWorkoutAccessory } from "./addWorkoutAccessory";
import { accessoryGroupKey, changeAccessorySetCount } from "./accessorySets";

describe("workout corrections", () => {
  it("deletes only the chosen saved record without rewinding progress or modifying drafts", () => {
    const state = defaults();
    const first = { ...makeWorkout(state), completedAt: new Date().toISOString() };
    const second = { ...makeWorkout(state), completedAt: new Date().toISOString(), historyOnly: true };
    state.history = [first, second];
    state.position = 6;
    state.active = makeWorkout(state);
    state.pastWorkout = { ...makeWorkout(state), historyOnly: true };
    const before = structuredClone(state);
    const next = deleteHistoryWorkout(state, first.id);
    expect(next).toEqual({ ...state, history: [second] });
    expect(state).toEqual(before);
    expect(deleteHistoryWorkout(next, second.id).history).toEqual([]);
    expect(parseBackup(exportBackup(next))).toEqual(next);
    expect(() => deleteHistoryWorkout(next, first.id)).toThrow("Completed workout not found");
  });
  it("adds and removes historical accessories without changing program data or original-unit performance", () => {
    const state = defaults();
    const original = { ...makeWorkout(state), completedAt: new Date().toISOString() };
    original.sets.forEach(set => { set.done = true; });
    original.sets[0].weight = 137;
    state.history = [original];
    state.active = makeWorkout(state);
    state.settings.units = "kg";
    const catalog = state.settings.accessories.find(exercise => exercise.name === "Lat pulldown")!;
    catalog.weight = 30;
    let draft = workoutInPreferredUnits(original, state.settings);
    const old = draft.sets.find(set => set.kind === "accessory")!;
    expect(changeAccessorySetCount(draft, accessoryGroupKey(old), -1)).toBe(draft);
    draft = changeAccessorySetCount(draft, accessoryGroupKey(old), -1, true);
    draft = addWorkoutAccessory(draft, state.settings, catalog.id, true);
    const corrected = correctHistoryWorkout(state, original.id, draft);
    expect(corrected.history[0].sets.filter(set => set.name === old.name)).toHaveLength(4);
    const added = corrected.history[0].sets.filter(set => set.accessoryId === catalog.id);
    expect(added).toHaveLength(5);
    expect(added[0].weight).toBeCloseTo(convertWeight(30, "kg", "lb"), 5);
    expect(corrected.history[0].sets[0]).toEqual(original.sets[0]);
    expect(corrected.history[0].completedAt).toBe(original.completedAt);
    expect({ ...corrected, history: state.history }).toEqual(state);
    expect(parseBackup(exportBackup(corrected))).toEqual(corrected);
    const invalid = structuredClone(draft);
    invalid.sets = invalid.sets.filter(set => set.kind !== "working");
    expect(() => correctHistoryWorkout(state, original.id, invalid)).toThrow();
  });
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
