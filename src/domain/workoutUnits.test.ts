import { describe, expect, it } from "vitest";
import { defaults } from "./model";
import { changeUnits, makeWorkout, plateLoad } from "./calculations";
import {
  editableWorkoutsInPreferredUnits,
  workoutInPreferredUnits,
} from "./workoutUnits";
import {
  changeAccessorySetCount,
  workoutAccessoryGroups,
} from "./accessorySets";
import { exportMarkdown } from "../data/markdown";

describe("preferred workout units", () => {
  it("converts all loads with the destination plates without changing progress or the source", () => {
    const state = defaults();
    const source = makeWorkout(state);
    source.sets[0].done = true;
    source.sets[0].reps = 8;
    source.notes = "Keep this";
    source.sets.find((set) => set.kind === "working")!.weight = 175;
    const original = structuredClone(source);
    const settings = changeUnits(state.settings, "kg");
    settings.equipment.kg.plates = [20, 5];
    const converted = workoutInPreferredUnits(source, settings);
    expect(converted).toMatchObject({
      units: "kg",
      bar: 20,
      plates: [20, 5],
      tm: 100,
      notes: "Keep this",
    });
    expect(converted.sets.find((set) => set.kind === "working")!.weight).toBe(
      80,
    );
    converted.sets.forEach((set, index) => {
      expect(set).toMatchObject({
        id: source.sets[index].id,
        reps: source.sets[index].reps,
        done: source.sets[index].done,
        target: source.sets[index].target,
      });
      if (set.kind !== "accessory")
        expect(
          plateLoad(set.weight, converted.bar, converted.plates).exact,
        ).toBe(true);
    });
    expect(source).toEqual(original);
    expect(workoutInPreferredUnits(converted, settings)).toBe(converted);
  });

  it("converts zero-set templates and keeps bodyweight at zero", () => {
    const state = defaults();
    let workout = makeWorkout(state);
    const group = workoutAccessoryGroups(workout)[0];
    group.sets.forEach((set) => {
      set.weight = 25;
    });
    while (workoutAccessoryGroups(workout)[0].sets.length)
      workout = changeAccessorySetCount(workout, group.key, -1);
    const settings = changeUnits(state.settings, "kg");
    workout = workoutInPreferredUnits(workout, settings);
    expect(workout.accessorySetOverrides![group.key].template.weight).toBe(
      12.5,
    );
    workout = changeAccessorySetCount(workout, group.key, 1);
    expect(workoutAccessoryGroups(workout)[0].sets[0].weight).toBe(12.5);
    workout.sets.find((set) => set.kind === "accessory")!.weight = 0;
    const pounds = workoutInPreferredUnits(workout, state.settings);
    expect(pounds.units).toBe("lb");
    expect(pounds.bar).toBe(45);
    expect(pounds.sets.find((set) => set.kind === "accessory")!.weight).toBe(0);
  });

  it("exports history in preferred units while preserving original history and equipment banks", () => {
    const state = defaults();
    state.history = [
      { ...makeWorkout(state), completedAt: new Date().toISOString() },
    ];
    const history = structuredClone(state.history);
    const equipment = structuredClone(state.settings.equipment);
    state.settings = changeUnits(state.settings, "kg");
    const text = exportMarkdown(state);
    expect(text).toContain("TM 100 kg");
    expect(text).not.toMatch(/\blb\b/);
    expect(state.history).toEqual(history);
    expect(state.settings.equipment).toEqual(equipment);
  });
});

it("converts both editable drafts without changing their dates, IDs or stored history", () => {
  const state = defaults();
  state.active = makeWorkout(state);
  state.pastWorkout = { ...makeWorkout(state), historyOnly: true };
  const original = structuredClone(state);
  state.settings = changeUnits(state.settings, "kg");
  const converted = editableWorkoutsInPreferredUnits(state);
  for (const key of ["active", "pastWorkout"] as const) {
    expect(converted[key]).toMatchObject({
      units: "kg",
      bar: 20,
      id: original[key]!.id,
      date: original[key]!.date,
    });
    converted[key]!.sets.filter((set) => set.kind !== "accessory").forEach(
      (set) =>
        expect(plateLoad(set.weight, 20, converted[key]!.plates).exact).toBe(
          true,
        ),
    );
  }
  expect(converted.history).toBe(state.history);
  expect(editableWorkoutsInPreferredUnits(converted)).toBe(converted);
});
