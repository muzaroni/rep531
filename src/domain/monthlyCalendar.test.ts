import { describe, expect, it } from "vitest";
import { defaults } from "./model";
import { makeWorkout } from "./calculations";
import { calendarDate, calendarDay } from "./calendar";
import { monthlyCalendar } from "./monthlyCalendar";

describe("monthly calendar", () => {
  it("uses actual local history dates, includes multiple sessions and never changes progress", () => {
    const state = defaults();
    const today = calendarDay("2026-10-13");
    state.position = 1;
    const workout = {
      ...makeWorkout({ ...state, position: 0 }),
      date: calendarDay("2026-10-11").toISOString(),
      completedAt: today.toISOString(),
    };
    const past = {
      ...workout,
      id: "past",
      week: 2,
      historyOnly: true,
      date: calendarDay("2026-10-13").toISOString(),
    };
    state.history = [workout, past];
    state.active = { ...makeWorkout(state), date: today.toISOString() };
    const before = structuredClone(state);
    const days = monthlyCalendar(state, today, today);
    expect(days[0].date).toBe("2026-09-28");
    expect(
      days.find((day) => day.date === "2026-10-11")!.sessions[0].workout.id,
    ).toBe(workout.id);
    expect(
      days.find((day) => day.today)!.sessions.map((session) => session.status),
    ).toEqual(["completed", "active", "planned"]);
    expect(
      days
        .flatMap((day) => day.sessions)
        .filter((session) => session.status === "planned"),
    ).toHaveLength(14);
    expect(state).toEqual(before);
  });
  it("handles leap months, year boundaries, local DST dates and skipped deloads", () => {
    const state = defaults();
    state.settings.skipDeload = true;
    const today = calendarDay("2026-03-07");
    const days = monthlyCalendar(state, today, today);
    expect(days.filter((day) => day.inMonth)).toHaveLength(31);
    expect(new Set(days.map((day) => day.date)).size).toBe(days.length);
    expect(
      days
        .flatMap((day) => day.sessions)
        .every((session) => session.workout.week !== 4),
    ).toBe(true);
    expect(
      monthlyCalendar(state, calendarDay("2028-02-01"), today).filter(
        (day) => day.inMonth,
      ),
    ).toHaveLength(29);
    expect(
      monthlyCalendar(state, calendarDay("2027-01-01"), today)[0].date,
    ).toBe("2026-12-28");
    expect(calendarDate(today)).toBe("2026-03-07");
  });
});
