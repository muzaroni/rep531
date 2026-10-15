import type { AppState, Workout } from "./model";
import { makeWorkout } from "./calculations";
import { calendarDate, cycleCalendarStart, shiftDay } from "./calendar";

export type MonthlySession = {
  key: string;
  workout: Workout;
  status: "completed" | "active" | "planned";
};
export function monthlyCalendar(
  state: AppState,
  month: Date,
  today = new Date(),
) {
  const sessions = new Map<string, MonthlySession[]>();
  const add = (date: string, session: MonthlySession) =>
    sessions.set(date, [...(sessions.get(date) ?? []), session]);
  for (const workout of state.history)
    add(calendarDate(workout.date), {
      key: workout.id,
      workout,
      status: "completed",
    });
  if (state.active)
    add(calendarDate(state.active.date), {
      key: state.active.id,
      workout: state.active,
      status: "active",
    });
  const anchor = cycleCalendarStart(state, today);
  const weeks = state.settings.skipDeload && state.active?.week !== 4 ? 3 : 4;
  for (let position = state.position; position < weeks * 4; position++) {
    const week = Math.floor(position / 4) + 1;
    const index = position % 4;
    if (
      state.active?.cycle === state.cycle &&
      state.active.week === week &&
      state.active.lift === state.settings.order[index]
    )
      continue;
    const day = shiftDay(
      anchor,
      (week - 1) * 7 + ((state.settings.days[index] + 6) % 7),
    );
    add(calendarDate(day), {
      key: `planned-${state.cycle}-${position}`,
      workout: makeWorkout({ ...state, position, active: null }),
      status: "planned",
    });
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
    12,
  ).getDate();
  return Array.from(
    { length: Math.ceil((offset + count) / 7) * 7 },
    (_, index) => {
      const day = shiftDay(first, index - offset);
      const date = calendarDate(day);
      return {
        date,
        day: day.getDate(),
        inMonth: day.getMonth() === month.getMonth(),
        today: date === calendarDate(today),
        sessions: sessions.get(date) ?? [],
        cardio: state.cardio.filter((item) => item.date === date),
      };
    },
  );
}
