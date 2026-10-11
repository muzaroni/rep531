import { describe, it, expect } from "vitest";
import { defaults } from "./model";
import {
  roundWeight,
  trainingMax,
  makeWorkout,
  plateLoad,
  finishWorkout,
  changeUnits,
} from "./calculations";
describe("training calculations", () => {
  it("calculates 90% TM and standard rounding", () => {
    expect(trainingMax(250)).toBe(225);
    expect(roundWeight(146.25, 5)).toBe(145);
    expect(roundWeight(66, 2.5)).toBe(65);
  });
  it.each([
    [0, [5, 5, 5], [145, 170, 190]],
    [4, [3, 3, 3], [160, 180, 205]],
    [8, [5, 3, 1], [170, 190, 215]],
  ])("builds week at position %i", (position, reps, weights) => {
    const s = defaults();
    s.position = position;
    const w = makeWorkout(s);
    expect(
      w.sets.filter((s) => s.kind === "working").map((s) => s.target),
    ).toEqual(reps);
    expect(
      w.sets.filter((s) => s.kind === "working").map((s) => s.weight),
    ).toEqual(weights);
    expect(w.sets.filter((s) => s.kind === "bbb")).toHaveLength(5);
    expect(
      w.sets.filter((s) => s.kind === "warmup").map((s) => s.target),
    ).toEqual([5, 5, 3]);
  });
  it("omits warmup and BBB in deload and respects BBB switch", () => {
    const s = defaults();
    s.position = 12;
    expect(
      makeWorkout(s).sets.filter((s) => s.kind !== "accessory"),
    ).toHaveLength(3);
    s.position = 0;
    s.settings.bbb = false;
    expect(makeWorkout(s).sets.some((s) => s.kind === "bbb")).toBe(false);
  });
  it("finds symmetric loads and handles unavailable weights", () => {
    expect(plateLoad(225, 45, [45, 35, 25, 10, 5, 2.5])).toEqual({
      plates: [45, 45],
      actual: 225,
      exact: true,
    });
    expect(plateLoad(50, 45, [10])).toEqual({
      plates: [],
      actual: 45,
      exact: false,
    });
    expect(plateLoad(20, 45, [5]).exact).toBe(false);
    expect(plateLoad(57, 45, [4, 3]).plates).toEqual([3, 3]);
  });
  it("completes once and rolls cycles with optional increases", () => {
    let s = defaults();
    s.position = 15;
    s.settings.autoIncrease = true;
    s.active = makeWorkout(s);
    expect(() => finishWorkout(s)).toThrow();
    s.active.sets.forEach((s) => (s.done = true));
    s = finishWorkout(s);
    expect(s.cycle).toBe(2);
    expect(s.position).toBe(0);
    expect(s.settings.maxes.squat).toBe(235);
    expect(s.history).toHaveLength(1);
    expect(() => finishWorkout(s)).toThrow();
  });
  it("converts to balanced, loadable weights while preserving both equipment inventories", () => {
    const original = defaults().settings,
      s = changeUnits(original, "kg");
    expect(s.maxes.squat).toBe(100);
    expect(s.rounding).toBe(2.5);
    expect(s.equipment).toEqual(original.equipment);
    expect(plateLoad(s.maxes.squat, 20, s.equipment.kg.plates)).toEqual({
      plates: [20, 20],
      actual: 100,
      exact: true,
    });
  });
});
