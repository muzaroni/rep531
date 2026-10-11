import {
  changeAccessorySetCount,
  workoutAccessoryGroups,
} from "../domain/accessorySets";
import "fake-indexeddb/auto";
import { afterEach, describe, it, expect } from "vitest";
import {
  TrainingDatabase,
  saveState,
  loadState,
  exportBackup,
  restoreBackup,
  parseBackup,
} from "./storage";
import { defaults } from "../domain/model";
import { makeWorkout, finishWorkout } from "../domain/calculations";
import { exportMarkdown } from "./markdown";
const db = new TrainingDatabase("bbb-tests");
afterEach(async () => {
  await db.state.clear();
});
describe("local persistence and backups", () => {
  it("round-trips skip preferences and unfinished optional work in completed history", async () => {
    let state = defaults();
    state.settings.skipWarmups = true;
    state.settings.skipDeload = true;
    state.active = makeWorkout(state);
    state.active.sets
      .filter((set) => set.kind === "working" || set.kind === "bbb")
      .forEach((set) => {
        set.done = true;
      });
    state = finishWorkout(state);
    await restoreBackup(exportBackup(state), db);
    expect(await loadState(db)).toEqual(state);
    expect(state.history[0].sets.some((set) => !set.done)).toBe(true);
    const legacy = JSON.parse(exportBackup(state));
    delete legacy.settings.skipWarmups;
    delete legacy.settings.skipDeload;
    await restoreBackup(JSON.stringify(legacy), db);
    expect((await loadState(db)).settings).toMatchObject({
      skipWarmups: false,
      skipDeload: false,
    });
    legacy.settings.skipDeload = "true";
    await expect(restoreBackup(JSON.stringify(legacy), db)).rejects.toThrow();
    expect((await loadState(db)).settings.skipDeload).toBe(false);
  });
  it.each(["blue", "starry", "horizon"] as const)(
    "round-trips settings, active workout, history and cardio with %s theme",
    async (accent) => {
      let s = defaults();
      s.active = makeWorkout(s);
      s.active.sets.forEach((s) => (s.done = true));
      s = finishWorkout(s);
      s.active = makeWorkout(s);
      s.active.sets[0].reps = 8;
      s.cardio.push({
        id: "c",
        date: "2026-10-10",
        name: "Walk",
        minutes: 25,
        notes: "Outside",
      });
      s.settings.accent = accent;
      await saveState(s, db);
      expect(await loadState(db)).toEqual(s);
      await db.state.clear();
      expect(await restoreBackup(exportBackup(s), db)).toEqual(s);
      expect(await loadState(db)).toEqual(s);
      expect(exportMarkdown(s)).toContain("Walk · 25 min");
    },
  );
  it.each(["not json", "{}", '{"schemaVersion":2}'])(
    "rejects malformed imports without data loss: %s",
    async (raw) => {
      await saveState(defaults(), db);
      await expect(restoreBackup(raw, db)).rejects.toThrow();
      expect(await loadState(db)).toEqual(defaults());
    },
  );
  it("rejects duplicate records, bad settings and missing fields", () => {
    const s = defaults();
    s.settings.order = ["squat", "squat", "bench", "press"];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
    s.settings = defaults().settings;
    s.settings.equipment.lb.bars = [];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
    s.settings = defaults().settings;
    s.cardio = [
      { id: "x", date: "2026-10-10", minutes: 1, name: "Run", notes: "" },
      { id: "x", date: "2026-10-10", minutes: 1, name: "Run", notes: "" },
    ];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
  });
  it("serializes rapid saves in order", async () => {
    const a = defaults(),
      b = defaults();
    b.cycle = 2;
    await Promise.all([saveState(a, db), saveState(b, db)]);
    expect((await loadState(db)).cycle).toBe(2);
  });
  it("rolls back a failed restore transaction", async () => {
    const original = defaults();
    await saveState(original, db);
    const replacement = defaults();
    replacement.cycle = 9;
    const fail = () => {
      throw new Error("Simulated storage failure");
    };
    db.state.hook("updating", fail);
    try {
      await expect(
        restoreBackup(exportBackup(replacement), db),
      ).rejects.toThrow("Simulated storage failure");
    } finally {
      db.state.hook("updating").unsubscribe(fail);
    }
    expect(await loadState(db)).toEqual(original);
  });
  it("rejects impossible dates, duplicate sets and mismatched active progress", () => {
    const s = defaults();
    s.active = makeWorkout(s);
    s.active.sets[1].id = s.active.sets[0].id;
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
    s.active = makeWorkout(s);
    s.active.week = 3;
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
    s.active = null;
    s.cardio = [
      {
        id: "bad-date",
        date: "2026-02-30",
        name: "Walk",
        minutes: 15,
        notes: "",
      },
    ];
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
  });
});

it("backs up and restores session-only accessory counts including zero sets", async () => {
  const s = defaults();
  s.active = makeWorkout(s);
  const key = workoutAccessoryGroups(s.active)[0].key;
  for (let i = 0; i < 5; i++)
    s.active = changeAccessorySetCount(s.active, key, -1);
  await saveState(s, db);
  expect(await loadState(db)).toEqual(s);
  const backup = exportBackup(s);
  await db.state.clear();
  await restoreBackup(backup, db);
  const restored = await loadState(db);
  expect(restored).toEqual(s);
  expect(workoutAccessoryGroups(restored.active!)[0].sets).toHaveLength(0);
  expect(
    workoutAccessoryGroups(changeAccessorySetCount(restored.active!, key, 1))[0]
      .sets,
  ).toHaveLength(1);
  const invalid = JSON.parse(backup);
  invalid.active.accessorySetOverrides[key].count = -1;
  await expect(restoreBackup(JSON.stringify(invalid), db)).rejects.toThrow();
  invalid.active.accessorySetOverrides[key].count = 0;
  invalid.active.accessorySetOverrides[key].template.kind = "working";
  await expect(restoreBackup(JSON.stringify(invalid), db)).rejects.toThrow();
  expect(await loadState(db)).toEqual(s);
});

it("preserves independent past drafts and history-only metadata in storage and backups", async () => {
  const state = defaults();
  state.active = makeWorkout(state);
  state.pastWorkout = { ...makeWorkout(state), historyOnly: true };
  state.pastWorkout.sets[0].weight = 95;
  state.pastWorkout.sets[0].done = true;
  await saveState(state, db);
  expect(await loadState(db)).toEqual(state);
  await restoreBackup(exportBackup(state), db);
  expect(await loadState(db)).toEqual(state);
  const malformed = JSON.parse(exportBackup(state));
  malformed.pastWorkout.id = state.active.id;
  await expect(restoreBackup(JSON.stringify(malformed), db)).rejects.toThrow();
  expect(await loadState(db)).toEqual(state);
  malformed.pastWorkout.id = state.pastWorkout.id;
  malformed.pastWorkout.completedAt = new Date().toISOString();
  await expect(restoreBackup(JSON.stringify(malformed), db)).rejects.toThrow();
  const legacy = JSON.parse(exportBackup(state));
  delete legacy.pastWorkout;
  await restoreBackup(JSON.stringify(legacy), db);
  expect((await loadState(db)).active).toEqual(state.active);
});
