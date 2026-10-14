import { expect, it } from "vitest";
import { defaults, stateSchema } from "./model";
import { makeWorkout } from "./calculations";
import {
  workoutElapsedSeconds,
  formatWorkoutDuration,
} from "./workoutDuration";

it("measures wall-clock elapsed time and freezes at completion", () => {
  const workout = { startedAt: "2026-10-12T12:00:00.000Z", completedAt: null };
  expect(
    workoutElapsedSeconds(workout, Date.parse("2026-10-12T13:02:03Z")),
  ).toBe(3723);
  expect(formatWorkoutDuration(3723)).toBe("1:02:03");
  expect(formatWorkoutDuration(65)).toBe("1:05");
  expect(
    workoutElapsedSeconds(
      { ...workout, completedAt: "2026-10-12T12:45:00Z" },
      Date.parse("2026-10-13T12:00:00Z"),
    ),
  ).toBe(2700);
  expect(workoutElapsedSeconds(workout, 0)).toBe(0);
  expect(workoutElapsedSeconds({ completedAt: null })).toBeNull();
});
it("preserves the optional start timestamp in validated backups and accepts older snapshots", () => {
  const state = defaults();
  state.active = makeWorkout(state);
  expect(
    stateSchema.parse(JSON.parse(JSON.stringify(state))).active?.startedAt,
  ).toBe(state.active.startedAt);
  expect(
    stateSchema.safeParse({
      ...state,
      active: { ...state.active, startedAt: "invalid" },
    }).success,
  ).toBe(false);
  delete state.active.startedAt;
  expect(stateSchema.safeParse(state).success).toBe(true);
});
