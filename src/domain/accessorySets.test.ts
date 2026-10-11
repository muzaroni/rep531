import { describe, it, expect } from "vitest";
import { defaults } from "./model";
import { makeWorkout } from "./calculations";
import {
  accessoryGroupKey,
  changeAccessorySetCount,
  workoutAccessoryGroups,
} from "./accessorySets";
import { syncWorkoutAccessories } from "./workoutAccessories";

describe("per-workout accessory set counts", () => {
  it("adds a fresh unfinished set using the last set's values without changing other exercises", () => {
    const state = defaults();
    state.settings.accessoryAssignments.squat = ["abs", "lat"];
    const workout = makeWorkout(state),
      group = workoutAccessoryGroups(workout)[0];
    group.sets.at(-1)!.weight = 25;
    group.sets.at(-1)!.reps = 12;
    const result = changeAccessorySetCount(workout, group.key, 1);
    const groups = workoutAccessoryGroups(result);
    expect(groups[0].sets).toHaveLength(6);
    expect(groups[0].sets.at(-1)).toMatchObject({
      weight: 25,
      reps: 12,
      done: false,
    });
    expect(groups[0].sets.at(-1)!.id).not.toBe(group.sets.at(-1)!.id);
    expect(groups[1].sets).toEqual(workoutAccessoryGroups(workout)[1].sets);
    expect(state.settings.accessories.find((a) => a.id === "abs")!.sets).toBe(
      5,
    );
    expect(result.sets.filter((set) => set.kind !== "accessory")).toEqual(
      workout.sets.filter((set) => set.kind !== "accessory"),
    );
  });
  it("removes the last unfinished set, preserving completed sets and their values", () => {
    const workout = makeWorkout(defaults()),
      group = workoutAccessoryGroups(workout)[0];
    group.sets.at(-1)!.done = true;
    const result = changeAccessorySetCount(workout, group.key, -1);
    expect(result.sets.some((set) => set.id === group.sets[3].id)).toBe(false);
    expect(result.sets.find((set) => set.id === group.sets[4].id)).toEqual(
      group.sets[4],
    );
    expect(workoutAccessoryGroups(result)[0].sets).toHaveLength(4);
  });
  it("supports removing all sets and adding back in the original exercise order", () => {
    const state = defaults();
    state.settings.accessoryAssignments.squat = ["abs", "lat"];
    let workout = makeWorkout(state);
    const keys = workoutAccessoryGroups(workout).map((group) => group.key);
    for (const key of keys)
      for (let i = 0; i < 5; i++)
        workout = changeAccessorySetCount(workout, key, -1);
    expect(
      workoutAccessoryGroups(workout).map((group) => group.sets.length),
    ).toEqual([0, 0]);
    workout = syncWorkoutAccessories(workout, state.settings, state.settings);
    expect(workoutAccessoryGroups(workout).map((group) => group.key)).toEqual(
      keys,
    );
    workout = changeAccessorySetCount(workout, keys[1], 1);
    workout = changeAccessorySetCount(workout, keys[0], 1);
    expect(
      workout.sets
        .filter((set) => set.kind === "accessory")
        .map((set) => set.name),
    ).toEqual(["Hanging leg raise", "Lat pulldown"]);
  });
  it("keeps custom counts after resume and Settings changes while future workouts use Settings", () => {
    const state = defaults(),
      workout = makeWorkout(state),
      group = workoutAccessoryGroups(workout)[0];
    const adjusted = changeAccessorySetCount(workout, group.key, -1);
    const next = structuredClone(state.settings);
    next.accessories.find((a) => a.id === "abs")!.sets = 8;
    expect(
      workoutAccessoryGroups(
        syncWorkoutAccessories(adjusted, state.settings, next),
      )[0].sets,
    ).toHaveLength(4);
    expect(
      workoutAccessoryGroups(makeWorkout({ ...state, settings: next }))[0].sets,
    ).toHaveLength(8);
  });
  it("enforces the 20-set limit, ignores unknown groups, and never edits completed workouts", () => {
    const state = defaults();
    state.settings.accessories.find((a) => a.id === "abs")!.sets = 20;
    const workout = makeWorkout(state),
      key = workoutAccessoryGroups(workout)[0].key;
    expect(changeAccessorySetCount(workout, key, 1)).toBe(workout);
    expect(changeAccessorySetCount(workout, "missing", -1)).toBe(workout);
    workout.sets.forEach((set) => (set.done = true));
    expect(changeAccessorySetCount(workout, key, -1)).toBe(workout);
    workout.completedAt = new Date().toISOString();
    expect(changeAccessorySetCount(workout, key, -1)).toBe(workout);
  });
  it("supports older accessory sets without catalog IDs", () => {
    const state = defaults(),
      workout = makeWorkout(state);
    workout.sets.forEach((set) => delete set.accessoryId);
    const key = accessoryGroupKey(
      workout.sets.find((set) => set.kind === "accessory")!,
    );
    const adjusted = changeAccessorySetCount(workout, key, 1);
    expect(
      workoutAccessoryGroups(
        syncWorkoutAccessories(adjusted, state.settings, state.settings),
      )[0].sets,
    ).toHaveLength(6);
  });
  it("keeps a legacy zero-set exercise visible after reconciliation", () => {
    const state = defaults();
    let workout = makeWorkout(state);
    workout.sets.forEach((set) => delete set.accessoryId);
    const key = workoutAccessoryGroups(workout)[0].key;
    for (let i = 0; i < 5; i++)
      workout = changeAccessorySetCount(workout, key, -1);
    const result = syncWorkoutAccessories(
      workout,
      state.settings,
      state.settings,
    );
    expect(workoutAccessoryGroups(result)[0].sets).toHaveLength(0);
    expect(workoutAccessoryGroups(result)[0].key).toBe("id:abs");
  });
});
