import { describe, it, expect } from "vitest";
import { defaults } from "./model";
import { makeWorkout } from "./calculations";
import {
  startRestTimer,
  timerSeconds,
  pauseRestTimer,
  resumeRestTimer,
  extendRestTimer,
  shortenRestTimer,
  nextTimerSet,
  restTimerSchema,
  timerPlates,
} from "./restTimer";
describe("rest timer", () => {
  it("subtracts time while running or paused, preserving a valid final second", () => {
    const running = startRestTimer(60, 1000);
    expect(timerSeconds(shortenRestTimer(running, 15, 11000), 11000)).toBe(35);
    const paused = pauseRestTimer(running, 11000);
    expect(timerSeconds(shortenRestTimer(paused, 15, 11000), 999999)).toBe(35);
    const minimum = shortenRestTimer(paused, 99, 11000);
    expect(timerSeconds(minimum, 11000)).toBe(1);
    expect(restTimerSchema.safeParse(minimum).success).toBe(true);
  });
  it("uses wall-clock time through pause, resume, extension and expiry", () => {
    let timer = startRestTimer(60, 1000);
    expect(timerSeconds(timer, 11500)).toBe(50);
    timer = pauseRestTimer(timer, 11500);
    expect(timerSeconds(timer, 999999)).toBe(50);
    timer = extendRestTimer(timer, 30);
    timer = resumeRestTimer(timer, 20000);
    expect(timerSeconds(timer, 21000)).toBe(79);
    expect(timerSeconds(timer, 100001)).toBe(0);
    expect(restTimerSchema.parse(JSON.parse(JSON.stringify(timer)))).toEqual(
      timer,
    );
    expect(() => startRestTimer(-1, 1000)).toThrow();
  });
  it("finds the next pending set using its actual units and plate bank", () => {
    const state = defaults();
    state.settings.units = "kg";
    const workout = makeWorkout(state);
    workout.sets[0].done = true;
    workout.sets[1].weight = 70;
    const timer = startRestTimer(60, 1000, {
      workoutId: workout.id,
      afterSetId: workout.sets[0].id,
    });
    expect(nextTimerSet(workout, timer)).toMatchObject({
      set: workout.sets[1],
      units: "kg",
      plates: "Per side: 25 kg",
    });
    expect(nextTimerSet({ ...workout, id: "different" }, timer)).toBeNull();
    workout.sets.forEach((set) => (set.done = true));
    expect(nextTimerSet(workout, timer)).toBeNull();
    expect(timerPlates(175, 45, [25, 10, 5], "lb")).toBe(
      "Per side: 2 × 25 + 10 + 5 lb",
    );
  });
});
