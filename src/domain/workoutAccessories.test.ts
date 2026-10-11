import { describe, it, expect } from "vitest";
import { defaults } from "./model";
import { makeWorkout } from "./calculations";
import { syncWorkoutAccessories } from "./workoutAccessories";

describe("accessory prescriptions", () => {
  it("uses the selected day's exercises, in selected order, with configured sets/reps/weight", () => {
    const s = defaults();
    s.settings.accessoryAssignments.squat = ["lat", "preset-push-1"];
    s.settings.accessories.find((a) => a.id === "lat")!.sets = 2;
    s.settings.accessories.find((a) => a.id === "lat")!.reps = 12;
    s.settings.accessories.find((a) => a.id === "lat")!.weight = 60;
    const sets = makeWorkout(s).sets.filter((set) => set.kind === "accessory");
    expect(sets.map((set) => set.name)).toEqual([
      "Lat pulldown",
      "Lat pulldown",
      "Push up",
      "Push up",
      "Push up",
      "Push up",
      "Push up",
    ]);
    expect(sets[0]).toMatchObject({
      accessoryId: "lat",
      target: 12,
      reps: 12,
      weight: 60,
    });
    s.position = 2;
    expect(
      makeWorkout(s).sets.filter((set) => set.kind === "accessory"),
    ).toHaveLength(0);
  });
  it("updates an already started workout and preserves finished removed sets and main lifts", () => {
    const s = defaults(),
      w = makeWorkout(s);
    const first = w.sets.find((set) => set.kind === "accessory")!;
    first.done = true;
    first.reps = 15;
    const next = structuredClone(s.settings);
    next.accessoryAssignments.squat = ["preset-push-1", "lat"];
    const synced = syncWorkoutAccessories(w, s.settings, next);
    expect(synced.sets.filter((set) => set.kind !== "accessory")).toEqual(
      w.sets.filter((set) => set.kind !== "accessory"),
    );
    expect(
      synced.sets
        .filter((set) => set.kind === "accessory")
        .map((set) => set.name),
    ).toEqual([
      ...Array(5).fill("Push up"),
      ...Array(5).fill("Lat pulldown"),
      "Hanging leg raise",
    ]);
    expect(synced.sets.find((set) => set.id === first.id)).toEqual(first);
    expect(syncWorkoutAccessories(synced, next, next)).toEqual(synced);
  });
  it("keeps edits, identifies renamed exercises by ID, and applies changed targets to untouched sets", () => {
    const s = defaults();
    s.settings.accessoryAssignments.squat = ["lat"];
    const w = makeWorkout(s),
      sets = w.sets.filter((set) => set.kind === "accessory");
    sets[0].weight = 75;
    sets[0].reps = 8;
    sets[1].done = true;
    const next = structuredClone(s.settings),
      lat = next.accessories.find((a) => a.id === "lat")!;
    lat.name = "Cable pulldown";
    lat.sets = 3;
    lat.reps = 12;
    lat.weight = 50;
    const result = syncWorkoutAccessories(w, s.settings, next).sets.filter(
      (set) => set.kind === "accessory",
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(sets[1]);
    expect(result[1]).toMatchObject({
      id: sets[0].id,
      name: "Cable pulldown",
      weight: 75,
      reps: 8,
      target: 12,
    });
    expect(result[2]).toMatchObject({
      name: "Cable pulldown",
      weight: 50,
      reps: 12,
    });
  });
  it("adapts older name-only snapshots and respects the workout's original units", () => {
    const s = defaults();
    s.settings.accessoryAssignments.squat = ["lat"];
    const w = makeWorkout(s);
    w.sets.forEach((set) => delete set.accessoryId);
    const next = structuredClone(s.settings);
    next.units = "kg";
    const lat = next.accessories.find((a) => a.id === "lat")!;
    lat.weight = 25;
    lat.sets = 2;
    const result = syncWorkoutAccessories(w, s.settings, next);
    expect(result.units).toBe("lb");
    expect(result.sets.filter((set) => set.kind === "accessory")).toHaveLength(
      2,
    );
    expect(result.sets.find((set) => set.kind === "accessory")).toMatchObject({
      accessoryId: "lat",
      weight: 55,
    });
    expect(w.sets.filter((set) => set.kind === "accessory")).toHaveLength(5);
  });
});

it("does not reuse legacy set IDs when two catalog exercises share a name", () => {
  const s = defaults();
  const lat = s.settings.accessories.find((a) => a.id === "lat")!;
  s.settings.accessories.push({ ...lat, id: "lat-copy" });
  s.settings.accessoryAssignments.squat = ["lat", "lat-copy"];
  const w = makeWorkout(s);
  w.sets.forEach((set) => delete set.accessoryId);
  const result = syncWorkoutAccessories(w, s.settings, s.settings);
  expect(new Set(result.sets.map((set) => set.id)).size).toBe(
    result.sets.length,
  );
  expect(result.sets.filter((set) => set.accessoryId === "lat")).toHaveLength(
    5,
  );
  expect(
    result.sets.filter((set) => set.accessoryId === "lat-copy"),
  ).toHaveLength(5);
});
