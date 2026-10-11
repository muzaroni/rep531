import { describe, expect, it } from "vitest";
import { defaults, type AppState } from "./model";
import {
  completeInitialSetup,
  needsInitialSetup,
  type InitialEntries,
} from "./initialSetup";
import { exportBackup, parseBackup } from "../data/storage";
import { makeWorkout } from "./calculations";
const entries: InitialEntries = {
  squat: { kind: "rm", value: 200 },
  bench: { kind: "tm", value: 135 },
  deadlift: { kind: "rm", value: 300 },
  press: { kind: "tm", value: 95 },
};
describe("first-time setup", () => {
  it("derives loadable 90% TMs, preserves entered 1RMs and supports mixed inputs without mutating the draft", () => {
    const state = defaults();
    const before = structuredClone(state);
    const next = completeInitialSetup(state, "lb", "swap", entries);
    expect(next.settings.maxes).toEqual({
      squat: 180,
      bench: 135,
      deadlift: 270,
      press: 95,
    });
    expect(next.settings.oneRepMaxes).toEqual({
      squat: 200,
      bench: null,
      deadlift: 300,
      press: null,
    });
    expect(makeWorkout(next).bbbLift).toBe("deadlift");
    expect(next.active).toBeNull();
    expect(needsInitialSetup(next)).toBe(false);
    expect(state).toEqual(before);
    expect(parseBackup(exportBackup(next))).toEqual(next);
  });
  it("uses the metric plate bank and leaves both banks untouched", () => {
    const state = defaults();
    const next = completeInitialSetup(state, "kg", "normal", {
      ...entries,
      squat: { kind: "rm", value: 125 },
      bench: { kind: "tm", value: 102.06 },
    });
    expect(next.settings.units).toBe("kg");
    expect(next.settings.maxes.squat).toBe(115);
    expect(next.settings.maxes.bench).toBe(100);
    expect(next.settings.equipment).toEqual(state.settings.equipment);
    expect(next.settings.oneRepMaxes.squat).toBe(125);
  });
  it("validates all entries before saving and allows explicitly accepting defaults", () => {
    const state = defaults();
    const before = structuredClone(state);
    for (const value of [null, 0, -10, NaN, Infinity, 10001])
      expect(() =>
        completeInitialSetup(state, "lb", "normal", {
          ...entries,
          press: { kind: "tm", value },
        }),
      ).toThrow();
    expect(state).toEqual(before);
    const next = completeInitialSetup(state, "kg", "swap");
    expect(next.initialSetupComplete).toBe(true);
    expect(next.settings.maxes.squat).toBe(100);
    expect(() => completeInitialSetup(next, "lb", "normal", entries)).toThrow();
  });
  it("prompts only new untouched installs, not legacy or existing workouts/reset saves", () => {
    const state = defaults();
    expect(needsInitialSetup(state)).toBe(true);
    const legacy: AppState = { ...state };
    delete legacy.initialSetupComplete;
    expect(needsInitialSetup(parseBackup(exportBackup(legacy)))).toBe(false);
    expect(needsInitialSetup({ ...state, active: makeWorkout(state) })).toBe(
      false,
    );
    expect(needsInitialSetup({ ...state, cycle: 2 })).toBe(false);
    expect(needsInitialSetup({ ...state, initialSetupComplete: true })).toBe(
      false,
    );
    const malformed = JSON.parse(exportBackup(state));
    malformed.initialSetupComplete = "yes";
    expect(() => parseBackup(JSON.stringify(malformed))).toThrow();
  });
});
