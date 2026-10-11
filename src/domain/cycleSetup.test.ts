import { describe, expect, it } from "vitest";
import { defaults } from "./model";
import {
  changeUnits,
  finishWorkout,
  makeWorkout,
  normalizeCycleProgress,
} from "./calculations";
import {
  cycleMaxes,
  needsCycleSetup,
  previousCycleMaxes,
  startCycle,
} from "./cycleSetup";
import { exportBackup, parseBackup } from "../data/storage";
function rollover(autoIncrease = true, skipDeload = false) {
  const state = defaults();
  state.settings.autoIncrease = autoIncrease;
  state.settings.skipDeload = skipDeload;
  state.position = skipDeload ? 11 : 15;
  state.active = makeWorkout(state);
  state.active.sets.forEach((set) => {
    set.done = true;
  });
  return finishWorkout(state);
}
describe("cycle setup", () => {
  it("reviews rollover suggestions without applying increases twice", () => {
    const state = rollover();
    expect(needsCycleSetup(defaults())).toBe(false);
    expect(needsCycleSetup(state)).toBe(true);
    expect(previousCycleMaxes(state).squat).toBe(225);
    const maxes = cycleMaxes(state, "increase", state.settings.maxes);
    expect(maxes.squat).toBe(235);
    const next = startCycle(state, maxes, "swap");
    expect(next.settings.maxes.squat).toBe(235);
    expect(next.active?.variant).toBe("swap");
    expect(next.active?.bbbLift).toBe("deadlift");
    expect(needsCycleSetup(next)).toBe(false);
    expect(needsCycleSetup({ ...next, active: null })).toBe(false);
    expect(() => startCycle(next, maxes, "normal")).toThrow();
    expect(state.cycleSetup?.confirmed).toBe(false);
  });
  it("allows holding previous maxes even with auto-increase, or increasing with it disabled", () => {
    const state = rollover();
    expect(
      startCycle(
        state,
        cycleMaxes(state, "keep", state.settings.maxes),
        "normal",
      ).settings.maxes.squat,
    ).toBe(225);
    const manual = rollover(false, true);
    expect(manual.cycle).toBe(2);
    expect(
      startCycle(
        manual,
        cycleMaxes(manual, "increase", manual.settings.maxes),
        "normal",
      ).settings.maxes.squat,
    ).toBe(235);
    const idle = defaults();
    idle.position = 12;
    idle.settings.skipDeload = true;
    expect(needsCycleSetup(normalizeCycleProgress(idle))).toBe(true);
  });
  it("converts previous maxes to current units and rounds custom TMs to available plate pairs", () => {
    const state = rollover();
    state.settings = changeUnits(state.settings, "kg");
    expect(previousCycleMaxes(state).squat).toBe(100);
    expect(cycleMaxes(state, "increase", state.settings.maxes).squat).toBe(105);
    const next = startCycle(
      state,
      { ...state.settings.maxes, squat: 102.06 },
      "normal",
    );
    expect(next.settings.maxes.squat).toBe(100);
    expect(next.active?.units).toBe("kg");
    expect(() =>
      startCycle(state, { ...state.settings.maxes, squat: -1 }, "normal"),
    ).toThrow();
  });
  it("persists pending/confirmed review through backups and supports older saves", () => {
    const state = rollover();
    expect(parseBackup(exportBackup(state)).cycleSetup).toEqual(
      state.cycleSetup,
    );
    const next = startCycle(
      state,
      cycleMaxes(state, "keep", state.settings.maxes),
      "normal",
    );
    expect(
      needsCycleSetup({ ...parseBackup(exportBackup(next)), active: null }),
    ).toBe(false);
    const legacy = defaults();
    legacy.cycle = 2;
    expect(needsCycleSetup(legacy)).toBe(true);
    legacy.position = 1;
    expect(needsCycleSetup(legacy)).toBe(false);
    const malformed = JSON.parse(exportBackup(state));
    malformed.cycleSetup.previousMaxes.squat = -5;
    expect(() => parseBackup(JSON.stringify(malformed))).toThrow();
  });
});
