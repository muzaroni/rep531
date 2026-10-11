import "fake-indexeddb/auto";
import { afterEach, describe, it, expect } from "vitest";
import { defaults } from "../domain/model";
import { makeWorkout, finishWorkout } from "../domain/calculations";

it("seeds ten leg presets once in existing v3 saves and preserves user changes and deletions", async () => {
  const old = defaults();
  delete old.settings.legPresetVersion;
  old.settings.accessories = old.settings.accessories.filter(
    (a) => a.category !== "legs" && a.name !== "Dips",
  );
  old.settings.accessories.push({
    id: "my-leg-press",
    name: "Leg press",
    category: "legs",
    sets: 4,
    reps: 12,
    weight: 100,
  });
  old.active = makeWorkout(old);
  const original = structuredClone(old);
  await db.state.put({ id: "main", value: old });
  const seeded = await loadState(db);
  expect(
    seeded.settings.accessories.filter((a) => a.category === "legs"),
  ).toHaveLength(10);
  expect(
    seeded.settings.accessories.find((a) => a.id === "my-leg-press"),
  ).toEqual(old.settings.accessories.at(-1));
  expect(seeded.settings.accessories.some((a) => a.name === "Dips")).toBe(
    false,
  );
  expect(seeded.settings.accessoryAssignments).toEqual(
    old.settings.accessoryAssignments,
  );
  expect(seeded.active).toEqual(old.active);
  expect((await db.state.get("main"))!.value.settings.legPresetVersion).toBe(1);
  expect(old).toEqual(original);
  seeded.settings.accessories = seeded.settings.accessories.filter(
    (a) => a.name !== "Hip thrust",
  );
  await restoreBackup(exportBackup(seeded), db);
  expect(await loadState(db)).toEqual(seeded);
  expect(
    parseBackup(exportBackup(old)).settings.accessories.filter(
      (a) => a.category === "legs",
    ),
  ).toHaveLength(10);
});
import {
  TrainingDatabase,
  loadState,
  parseBackup,
  restoreBackup,
  exportBackup,
} from "./storage";
function oldBackup() {
  let s = defaults();
  s.active = makeWorkout(s);
  s.active.sets.forEach((set) => (set.done = true));
  s = finishWorkout(s);
  s.active = makeWorkout(s);
  const {
    equipment,
    cycleVariants: _,
    accessoryAssignments: __,
    ...settings
  } = s.settings;
  const oldWorkout = (w: NonNullable<typeof s.active>) => {
    const { variant, bbbLift, bbbTm, ...old } = w;
    return old;
  };
  return {
    ...s,
    schemaVersion: 1,
    settings: {
      ...settings,
      ...equipment.lb,
      accessories: settings.accessories
        .filter((a) => ["lat", "abs"].includes(a.id))
        .map(({ category, ...a }) => ({
          ...a,
          lift: category === "abs" ? "squat" : "bench",
        })),
    },
    active: oldWorkout(s.active!),
    history: s.history.map(oldWorkout),
  };
}
const db = new TrainingDatabase("bbb-migration-tests");
afterEach(async () => {
  await db.state.clear();
});
describe("v1 migration", () => {
  it("upgrades legacy JSON without changing equipment or workout set snapshots", () => {
    const old = oldBackup(),
      s = parseBackup(JSON.stringify(old));
    expect(s.schemaVersion).toBe(3);
    expect(s.settings.equipment.lb.bars).toEqual(old.settings.bars);
    expect(s.settings.equipment.kg.bars[0].weight).toBe(20);
    expect(s.history[0].sets).toEqual(old.history[0].sets);
    expect(s.active!.sets).toEqual(old.active.sets);
    expect(s.history[0].variant).toBe("normal");
    expect(s.settings.accessories.find((a) => a.id === "lat")!.category).toBe(
      "pull",
    );
    expect(s.settings.accessoryAssignments.bench).toEqual(["lat"]);
    expect(parseBackup(exportBackup(s))).toEqual(s);
  });
  it("migrates existing IndexedDB state once and persists it", async () => {
    const old = oldBackup();
    await db.state.put({ id: "main", value: old as never });
    const migrated = await loadState(db);
    expect(migrated.schemaVersion).toBe(3);
    expect((await db.state.get("main"))!.value).toEqual(migrated);
    expect(await loadState(db)).toEqual(migrated);
  });
  it("preserves legacy kg equipment in the kg bank", () => {
    const old = oldBackup();
    old.settings.units = "kg";
    old.settings.bars[0].weight = 20;
    old.settings.plates = [25, 20, 10, 5, 2.5];
    const migrated = parseBackup(JSON.stringify(old));
    expect(migrated.settings.equipment.kg.plates).toEqual(old.settings.plates);
    expect(migrated.settings.equipment.lb.bars[0].weight).toBe(45);
  });
  it("rejects malformed legacy data and unknown versions before replacing data", async () => {
    await db.state.put({ id: "main", value: defaults() });
    const old = oldBackup();
    old.settings.barIndex = 4;
    await expect(restoreBackup(JSON.stringify(old), db)).rejects.toThrow();
    expect(await loadState(db)).toEqual(defaults());
    expect(() =>
      parseBackup(JSON.stringify({ ...defaults(), schemaVersion: 4 })),
    ).toThrow();
  });
});

describe("v2 and v3 backups", () => {
  it("adds presets once, preserves custom exercises, selections, plates and workout snapshots", async () => {
    const s = defaults();
    s.active = makeWorkout(s);
    const { oneRepMaxes: _, ...settings } = s.settings;
    settings.accessories = settings.accessories.filter((a) =>
      ["lat", "abs"].includes(a.id),
    );
    settings.accessories.push({
      id: "custom",
      name: "My row",
      category: "pull",
      sets: 4,
      reps: 12,
      weight: 50,
    });
    settings.accessoryAssignments.squat.push("custom");
    settings.equipment.kg.plates = [20, 5];
    const migrated = parseBackup(
      JSON.stringify({ ...s, schemaVersion: 2, settings }),
    );
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.active).toEqual(s.active);
    expect(migrated.settings.equipment).toEqual(settings.equipment);
    expect(migrated.settings.accessoryAssignments).toEqual(
      settings.accessoryAssignments,
    );
    expect(
      migrated.settings.accessories.filter((a) => a.category === "push"),
    ).toHaveLength(10);
    expect(
      migrated.settings.accessories.find((a) => a.id === "custom")?.weight,
    ).toBe(50);
    expect(parseBackup(exportBackup(migrated))).toEqual(migrated);
    // Removed presets stay removed after exporting a current-version backup.
    migrated.settings.accessories = migrated.settings.accessories.filter(
      (a) => a.name !== "Dips",
    );
    migrated.settings.oneRepMaxes.squat = 300;
    await restoreBackup(exportBackup(migrated), db);
    expect(await loadState(db)).toEqual(migrated);
    expect((await loadState(db)).settings.oneRepMaxes.squat).toBe(300);
  });
  it("rejects invalid v2 assignments atomically", async () => {
    await db.state.put({ id: "main", value: defaults() });
    const s = defaults();
    const { oneRepMaxes: _, ...settings } = s.settings;
    settings.accessoryAssignments.squat.push("missing");
    await expect(
      restoreBackup(JSON.stringify({ ...s, schemaVersion: 2, settings }), db),
    ).rejects.toThrow();
    expect(await loadState(db)).toEqual(defaults());
  });
});

it("updates saved accessory defaults to 5x10 once without rewriting workout snapshots", async () => {
  const old = defaults();
  delete old.settings.accessoryDefaultsVersion;
  old.settings.accessories.forEach((a) => {
    a.sets = 3;
    a.reps = 12;
  });
  old.active = makeWorkout(old);
  const original = structuredClone(old);
  await db.state.put({ id: "main", value: old });
  const updated = await loadState(db);
  expect(
    updated.settings.accessories.every((a) => a.sets === 5 && a.reps === 10),
  ).toBe(true);
  expect(updated.active).toEqual(original.active);
  expect(updated.settings.accessoryAssignments).toEqual(
    original.settings.accessoryAssignments,
  );
  expect(updated.settings.accessories.map((a) => a.weight)).toEqual(
    original.settings.accessories.map((a) => a.weight),
  );
  expect(
    (await db.state.get("main"))!.value.settings.accessoryDefaultsVersion,
  ).toBe(1);
  updated.settings.accessories[0].sets = 4;
  updated.settings.accessories[0].reps = 8;
  await restoreBackup(exportBackup(updated), db);
  expect(await loadState(db)).toEqual(updated);
  expect(
    parseBackup(exportBackup(old)).settings.accessories.every(
      (a) => a.sets === 5 && a.reps === 10,
    ),
  ).toBe(true);
});
