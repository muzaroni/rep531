import { describe, expect, it } from "vitest";
import { defaults } from "./model";
import { makeWorkout } from "./calculations";
import {
  activeCyclePlan,
  calendarDate,
  calendarDay,
  calendarWeek,
  cycleCalendarStart,
  shiftDay,
} from "./calendar";

it("previews three training weeks using current-run completions and active snapshots", () => {
  const state = defaults();
  const completed = makeWorkout(state);
  completed.completedAt = new Date(2026, 9, 5, 13).toISOString();
  completed.sets.find((set) => set.kind === "working")!.weight = 155;
  state.history = [completed];
  state.position = 1;
  state.active = makeWorkout(state);
  const historyOnly = makeWorkout({ ...state, position: 4, active: null });
  historyOnly.historyOnly = true;
  historyOnly.completedAt = new Date(2026, 9, 6, 13).toISOString();
  state.history.push(historyOnly);

  const plan = activeCyclePlan(state);
  expect(plan).toHaveLength(3);
  expect(plan.flatMap((week) => week.slots)).toHaveLength(12);
  expect(plan[0].slots[0]).toMatchObject({
    status: "completed",
    workout: completed,
  });
  expect(plan[0].slots[1]).toMatchObject({
    status: "in progress",
    workout: state.active,
  });
  expect(plan[1].slots[0]).toMatchObject({ status: "completed", workout: historyOnly });

  state.active = null;
  state.position = 0;
  expect(activeCyclePlan(state)[0].slots[0].status).toBe("planned");
});

it("marks past and catch-up sessions completed in the active cycle without changing progress", () => {
  const state = defaults();
  const past = { ...makeWorkout(state), historyOnly: true, completedAt: new Date(2026, 9, 5, 13).toISOString() };
  const catchUp = { ...makeWorkout({ ...state, position: 4 }), historyOnly: false, completedAt: new Date(2026, 9, 12, 13).toISOString() };
  const otherCycle = { ...makeWorkout({ ...state, cycle: 2, position: 1 }), historyOnly: true, completedAt: new Date(2026, 9, 13, 13).toISOString() };
  state.history = [past, catchUp, otherCycle];
  state.position = 5;
  const before = structuredClone(state);
  const plan = activeCyclePlan(state);
  expect(plan[0].slots[0]).toMatchObject({ status: "completed", workout: past });
  expect(plan[1].slots[0]).toMatchObject({ status: "completed", workout: catchUp });
  expect(plan[0].slots[1].status).toBe("planned");
  expect(state).toEqual(before);
  state.history = state.history.filter(workout => workout.id !== past.id);
  expect(activeCyclePlan(state)[0].slots[0].status).toBe("planned");
});

describe("cycle calendar", () => {
  it("does not treat retained history as the new cycle run after a reset", () => {
    const state = defaults();
    const old = makeWorkout(state);
    old.date = new Date(2026, 8, 7, 12).toISOString();
    old.completedAt = new Date(2026, 8, 7, 13).toISOString();
    state.history = [old];
    const now = new Date(2026, 9, 5, 12);
    expect(calendarDate(cycleCalendarStart(state, now))).toBe("2026-10-05");
    expect(calendarWeek(state, 1, now).slots[0].status).toBe("next");
    state.active = makeWorkout(state);
    state.active.date = now.toISOString();
    expect(calendarWeek(state, 1, now).slots[0]).toMatchObject({
      status: "in progress",
      workout: state.active,
    });
    expect(state.history).toEqual([old]);
  });
  it("plans configured days across weeks and previews each week's real prescriptions", () => {
    const state = defaults();
    const now = new Date(2026, 9, 5, 12);
    expect(calendarDate(cycleCalendarStart(state, now))).toBe("2026-10-05");
    const week = calendarWeek(state, 2, now);
    expect(week.slots.map((slot) => slot.date)).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-15",
      "2026-10-16",
    ]);
    expect(
      week.slots[0].workout.sets
        .filter((set) => set.kind === "working")
        .map((set) => [set.percent, set.target]),
    ).toEqual([
      [70, 3],
      [80, 3],
      [90, 3],
    ]);
    expect(
      calendarWeek(state, 4, now).slots[0].workout.sets.some((set) =>
        ["warmup", "bbb"].includes(set.kind),
      ),
    ).toBe(false);
    expect(state.position).toBe(0);
    expect(state.active).toBeNull();
  });
  it("anchors to actual cycle history and keeps out-of-schedule completions on their actual dates", () => {
    const state = defaults();
    const workout = makeWorkout(state);
    workout.date = new Date(2026, 9, 6, 12).toISOString();
    workout.completedAt = new Date(2026, 9, 6, 13).toISOString();
    state.history = [workout];
    state.position = 1;
    const week = calendarWeek(state, 1, new Date(2026, 10, 1));
    expect(calendarDate(week.start)).toBe("2026-10-05");
    expect(week.slots[0]).toMatchObject({
      date: "2026-10-05",
      actualDate: "2026-10-06",
      status: "completed",
      workout,
    });
    expect(week.days[0].history).toHaveLength(0);
    expect(week.days[0].planned).toHaveLength(0);
    expect(week.days[1].history).toEqual([workout]);
    expect(week.days[1].planned[0].lift).toBe("bench");
    expect(week.slots[1].status).toBe("next");
  });
  it("retains active edits, BBB Swap, accessories, cardio, Sunday and same-day sessions", () => {
    const state = defaults();
    state.settings.days = [0, 1, 1, 5];
    state.settings.cycleVariants["1"] = "swap";
    state.active = makeWorkout(state);
    state.active.date = new Date(2026, 9, 11, 12).toISOString();
    state.active.sets.find((set) => set.kind === "working")!.weight = 155;
    state.cardio = [
      { id: "run", date: "2026-10-05", name: "Run", minutes: 20, notes: "" },
    ];
    const week = calendarWeek(state, 1);
    expect(week.slots[0].workout).toBe(state.active);
    expect(week.slots[0].workout.bbbLift).toBe("deadlift");
    expect(week.days[6].active).toBe(state.active);
    expect(week.days[0].planned).toHaveLength(2);
    expect(week.days[0].cardio[0].minutes).toBe(20);
    expect(
      week.slots[0].workout.sets.find((set) => set.kind === "working")!.weight,
    ).toBe(155);
  });
  it("keeps local dates correct across month, year and DST boundaries", () => {
    expect(calendarDate(shiftDay(calendarDay("2026-12-31"), 1))).toBe(
      "2027-01-01",
    );
    expect(calendarDate(shiftDay(calendarDay("2026-03-07"), 2))).toBe(
      "2026-03-09",
    );
    expect(calendarDate(shiftDay(calendarDay("2026-10-31"), 2))).toBe(
      "2026-11-02",
    );
    const state = defaults();
    state.position = 4;
    expect(
      calendarDate(cycleCalendarStart(state, new Date(2026, 9, 5, 12))),
    ).toBe("2026-09-28");
  });
});

it("displays added history without displacing counted sessions or anchoring the current run", () => {
  const state = defaults();
  const counted = makeWorkout(state);
  counted.date = new Date(2026, 9, 5, 12).toISOString();
  counted.completedAt = counted.date;
  state.position = 1;
  const added = makeWorkout({ ...state, position: 5 });
  added.historyOnly = true;
  added.date = new Date(2026, 8, 1, 12).toISOString();
  added.completedAt = new Date(2026, 9, 10, 12).toISOString();
  state.history = [counted, added];
  expect(calendarDate(cycleCalendarStart(state))).toBe("2026-10-05");
  expect(calendarWeek(state, 1).slots[0].workout.id).toBe(counted.id);
  expect(calendarWeek(state, 1).slots[1].status).toBe("next");
  expect(calendarWeek(state, 2).slots[1]).toMatchObject({
    status: "completed",
    workout: added,
    actualDate: "2026-09-01",
  });
  expect(state.position).toBe(1);
});
