import { describe, expect, it } from "vitest";
import { defaults, stateSchema } from "./model";
import { makeWorkout } from "./calculations";
import { calendarDate, calendarWeek } from "./calendar";
import {
  moveHistoryWorkoutDate,
  canAdvancePastWorkout,
  createPastWorkout,
  savePastWorkout,
  workoutWithDate,
} from "./pastWorkouts";

const now = new Date(2026, 9, 10, 12);
const input = { cycle: 1, week: 1, lift: "squat" as const, date: "2026-10-05" };
const completeRequired = (state: ReturnType<typeof defaults>) =>
  state
    .pastWorkout!.sets.filter(
      (set) => set.kind === "working" || set.kind === "bbb",
    )
    .forEach((set) => {
      set.done = true;
    });

describe("past workout logging", () => {
  it("creates an independent editable draft with current program rules and a local past date", () => {
    const state = defaults();
    state.active = makeWorkout(state);
    state.settings.cycleVariants["1"] = "swap";
    const original = structuredClone(state);
    const draft = createPastWorkout(state, input, now);
    expect(draft).toMatchObject({
      cycle: 1,
      week: 1,
      lift: "squat",
      bbbLift: "deadlift",
      completedAt: null,
      historyOnly: true,
    });
    expect(calendarDate(draft.date)).toBe("2026-10-05");
    expect(draft.sets.every((set) => !set.done)).toBe(true);
    expect(draft.id).not.toBe(state.active.id);
    expect(state).toEqual(original);
  });
  it("saves history-only entries without changing the active workout, cursor, maxes or increases", () => {
    const state = defaults();
    state.settings.autoIncrease = true;
    state.active = makeWorkout(state);
    state.pastWorkout = createPastWorkout(state, input, now);
    expect(() => savePastWorkout(state, false, now)).toThrow();
    completeRequired(state);
    state.pastWorkout!.sets.find((set) => set.kind === "working")!.reps = 8;
    const original = structuredClone(state);
    const result = savePastWorkout(state, false, now);
    expect(result.active).toEqual(state.active);
    expect(result).toMatchObject({ cycle: 1, position: 0, pastWorkout: null });
    expect(result.settings).toEqual(state.settings);
    expect(result.history[0]).toMatchObject({
      historyOnly: true,
      completedAt: now.toISOString(),
    });
    expect(result.history[0].sets.some((set) => !set.done)).toBe(true);
    expect(state).toEqual(original);
    expect(() => savePastWorkout(result, false, now)).toThrow();
    expect(calendarWeek(result, 1, now).slots[0].status).toBe("in progress");
  });
  it("advances only a matching next workout, including cycle rollover and increases exactly once", () => {
    const state = defaults();
    state.position = 11;
    state.settings.skipDeload = true;
    state.settings.autoIncrease = true;
    state.pastWorkout = createPastWorkout(
      state,
      { ...input, week: 3, lift: "press" },
      now,
    );
    completeRequired(state);
    expect(canAdvancePastWorkout(state)).toBe(true);
    const result = savePastWorkout(state, true, now);
    expect(result).toMatchObject({
      cycle: 2,
      position: 0,
      active: null,
      pastWorkout: null,
    });
    expect(result.settings.maxes.squat).toBe(235);
    expect(result.history[0].historyOnly).toBe(false);
    expect(() => savePastWorkout(result, true, now)).toThrow();
    state.active = makeWorkout(state);
    expect(canAdvancePastWorkout(state)).toBe(false);
    expect(() => savePastWorkout(state, true, now)).toThrow();
    state.active = null;
    state.position = 0;
    expect(() => savePastWorkout(state, true, now)).toThrow();
  });
  it("rejects invalid or future dates, duplicate drafts/IDs and completed drafts", () => {
    const state = defaults();
    for (const date of ["2026-02-30", "2026-10-11", "bad", ""])
      expect(() => createPastWorkout(state, { ...input, date }, now)).toThrow();
    for (const patch of [{ cycle: 0 }, { cycle: 2 }, { week: 5 }])
      expect(() =>
        createPastWorkout(state, { ...input, ...patch }, now),
      ).toThrow();
    state.pastWorkout = createPastWorkout(state, input, now);
    expect(() => createPastWorkout(state, input, now)).toThrow();
    completeRequired(state);
    state.history = [{ ...state.pastWorkout, completedAt: now.toISOString() }];
    expect(() => savePastWorkout(state, false, now)).toThrow();
    expect(stateSchema.safeParse(state).success).toBe(false);
    state.history = [];
    state.pastWorkout.completedAt = now.toISOString();
    expect(stateSchema.safeParse(state).success).toBe(false);
  });
  it("backdates an active workout without modifying its sets or progress", () => {
    const workout = makeWorkout(defaults());
    const changed = workoutWithDate(workout, input.date, now);
    expect(calendarDate(changed.date)).toBe(input.date);
    expect(changed.sets).toBe(workout.sets);
    expect(changed.id).toBe(workout.id);
    expect(() => workoutWithDate(workout, "2026-10-11", now)).toThrow();
  });
});

it("moves only a completed snapshot's date without rewriting units, sets, completion or progress", () => {
  const state = defaults();
  const logged = makeWorkout(state);
  logged.completedAt = now.toISOString();
  logged.historyOnly = true;
  logged.notes = "Keep original performance";
  logged.sets[0].weight = 175;
  logged.sets[0].done = true;
  state.history = [
    logged,
    { ...makeWorkout(state), completedAt: now.toISOString() },
  ];
  state.active = makeWorkout(state);
  state.pastWorkout = createPastWorkout(state, input, now);
  state.settings.units = "kg";
  const original = structuredClone(state);
  const moved = moveHistoryWorkoutDate(state, logged.id, "2026-10-03", now);
  expect(calendarDate(moved.history[0].date)).toBe("2026-10-03");
  expect(moved.history[0].units).toBe("lb");
  expect({ ...moved.history[0], date: logged.date }).toEqual(logged);
  expect({ ...moved, history: state.history }).toEqual(state);
  expect(moved.history[1]).toBe(state.history[1]);
  expect(state).toEqual(original);
  for (const date of ["2026-02-30", "2026-10-11", ""])
    expect(() => moveHistoryWorkoutDate(state, logged.id, date, now)).toThrow();
  expect(() =>
    moveHistoryWorkoutDate(state, "missing", input.date, now),
  ).toThrow();
});
