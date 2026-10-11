import { describe, expect, it } from "vitest";
import { defaults, settingsSchema } from "./model";
import {
  canFinishWorkout,
  finishWorkout,
  makeWorkout,
  normalizeCycleProgress,
  skipWorkoutWarmups,
} from "./calculations";
describe("optional warmups, deload and completion", () => {
  it("defaults old backups to the full program and omits optional warmups", () => {
    const settings = { ...defaults().settings };
    const { skipWarmups, skipDeload, ...old } = settings;
    expect(settingsSchema.parse(old)).toMatchObject({
      skipWarmups: false,
      skipDeload: false,
    });
    const state = defaults();
    state.settings.skipWarmups = true;
    const workout = makeWorkout(state);
    expect(workout.sets.some((set) => set.kind === "warmup")).toBe(false);
    expect(workout.sets.filter((set) => set.kind === "working")).toHaveLength(
      3,
    );
    expect(workout.sets.filter((set) => set.kind === "bbb")).toHaveLength(5);
  });
  it("skips pending warmups without discarding completed warmups or history", () => {
    const workout = makeWorkout(defaults());
    workout.sets[0].done = true;
    expect(
      skipWorkoutWarmups(workout).sets.filter((set) => set.kind === "warmup"),
    ).toEqual([workout.sets[0]]);
    expect(workout.sets.filter((set) => set.kind === "warmup")).toHaveLength(3);
    const history = { ...workout, completedAt: new Date().toISOString() };
    expect(skipWorkoutWarmups(history)).toBe(history);
  });
  it.each([true, false])(
    "only requires existing main and BBB sets (BBB %s)",
    (bbb) => {
      const state = defaults();
      state.settings.bbb = bbb;
      state.active = makeWorkout(state);
      expect(canFinishWorkout(state.active)).toBe(false);
      expect(() => finishWorkout(state)).toThrow();
      state.active.sets
        .filter((set) => set.kind === "working")
        .forEach((set) => {
          set.done = true;
        });
      expect(canFinishWorkout(state.active)).toBe(!bbb);
      state.active.sets
        .filter((set) => set.kind === "bbb")
        .forEach((set) => {
          set.done = true;
        });
      const result = finishWorkout(state);
      expect(result.position).toBe(1);
      expect(result.history[0].sets.some((set) => !set.done)).toBe(true);
      expect(result.active).toBeNull();
      expect(() => finishWorkout(result)).toThrow();
    },
  );
  it("rolls over after twelve sessions and applies optional increases exactly once", () => {
    const state = defaults();
    state.settings.skipDeload = true;
    state.settings.autoIncrease = true;
    state.position = 11;
    state.active = makeWorkout(state);
    state.active.sets
      .filter((set) => ["working", "bbb"].includes(set.kind))
      .forEach((set) => {
        set.done = true;
      });
    const result = finishWorkout(state);
    expect(result).toMatchObject({ cycle: 2, position: 0 });
    expect(result.settings.maxes.squat).toBe(235);
    expect(normalizeCycleProgress(result)).toBe(result);
    expect(makeWorkout(result).week).toBe(1);
  });
  it("skips idle deload progress but preserves an active deload until finished", () => {
    const state = defaults();
    state.position = 12;
    state.settings.skipDeload = true;
    expect(normalizeCycleProgress(state)).toMatchObject({
      cycle: 2,
      position: 0,
    });
    state.active = makeWorkout(state);
    expect(normalizeCycleProgress(state)).toBe(state);
    state.active.sets
      .filter((set) => set.kind === "working")
      .forEach((set) => {
        set.done = true;
      });
    expect(finishWorkout(state)).toMatchObject({ cycle: 2, position: 0 });
  });
});
