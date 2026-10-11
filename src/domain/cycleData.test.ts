import { expect, it } from "vitest";
import { defaults } from "./model";
import { makeWorkout } from "./calculations";
import { deleteAllCycles, resetCycle } from "./cycleData";
import { exportBackup, parseBackup } from "../data/storage";
it("clears all lifting cycles/drafts and review metadata, preserving settings and the original backup", () => {
  const state = defaults();
  state.initialSetupComplete = true;
  const completed = {
    ...makeWorkout(state),
    completedAt: new Date().toISOString(),
  };
  state.history = [completed];
  state.cycle = 2;
  state.active = makeWorkout(state);
  state.pastWorkout = { ...makeWorkout(state), historyOnly: true };
  state.cycleSetup = {
    cycle: 2,
    previousMaxes: { ...state.settings.maxes },
    units: "lb",
    confirmed: true,
  };
  state.settings.cycleVariants = { 1: "swap", 2: "normal" };
  state.cardio = [
    {
      id: "cardio",
      date: "2026-01-01",
      name: "Walking",
      minutes: 20,
      notes: "",
    },
  ];
  const before = structuredClone(state);
  const backup = exportBackup(state);
  const reset = resetCycle(state);
  expect(reset.cardio).toEqual([]);
  expect(reset.history).toEqual(state.history);
  expect(reset.settings).toEqual(state.settings);
  expect(reset.pastWorkout).toEqual(state.pastWorkout);
  expect(reset.active).toBeNull();
  expect(reset.cycle).toBe(1);
  expect(reset.position).toBe(0);
  const next = deleteAllCycles(state);
  expect(next.cycle).toBe(1);
  expect(next.position).toBe(0);
  expect(next.history).toEqual([]);
  expect(next.active).toBeNull();
  expect(next.pastWorkout).toBeNull();
  expect(next.cycleSetup).toBeUndefined();
  expect(next.settings).toEqual({ ...state.settings, cycleVariants: {} });
  expect(next.cardio).toEqual([]);
  expect(next.initialSetupComplete).toBe(true);
  expect(state).toEqual(before);
  expect(parseBackup(backup)).toEqual(before);
  expect(parseBackup(exportBackup(next))).toEqual(next);
});
