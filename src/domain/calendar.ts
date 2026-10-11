import type { AppState, Workout } from "./model";
import { makeWorkout, nextTrainingDay } from "./calculations";

// Use local calendar dates and noon-based arithmetic, avoiding UTC date shifts
// and 24-hour additions across daylight-saving transitions.
export function calendarDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
export function calendarDay(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
export function shiftDay(date: Date, days: number): Date {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
}
const monday = (date: Date) => shiftDay(date, -((date.getDay() + 6) % 7));

// Resetting progress keeps history and reuses cycle numbers. Only the most
// recent completed sessions covered by this cursor belong to its current run.
function currentCycleHistory(state: AppState): Workout[] {
  if (state.position === 0) return [];
  return state.history
    .filter((workout) => workout.cycle === state.cycle && !workout.historyOnly)
    .sort((a, b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!))
    .slice(-state.position);
}

export function cycleCalendarStart(state: AppState, now = new Date()): Date {
  const currentWeek = Math.floor(state.position / 4) + 1;
  // Keep a stable cycle plan anchored to the earliest actual session available.
  const first = [
    ...currentCycleHistory(state),
    ...(state.active ? [state.active] : []),
  ]
    .filter((workout) => workout.cycle === state.cycle)
    .sort(
      (a, b) => a.week - b.week || Date.parse(a.date) - Date.parse(b.date),
    )[0];
  return first
    ? shiftDay(monday(new Date(first.date)), -(first.week - 1) * 7)
    : shiftDay(
        monday(nextTrainingDay(state.settings.days, state.position, now)),
        -(currentWeek - 1) * 7,
      );
}

export function calendarWeek(state: AppState, week: number, now = new Date()) {
  const start = shiftDay(cycleCalendarStart(state, now), (week - 1) * 7);
  const completed = currentCycleHistory(state);
  const slots = state.settings.order.map((lift, index) => {
    const date = calendarDate(
      shiftDay(start, (state.settings.days[index] + 6) % 7),
    );
    const history = [
      ...completed,
      ...state.history.filter((workout) => workout.historyOnly),
    ]
      .filter(
        (workout) =>
          workout.cycle === state.cycle &&
          workout.week === week &&
          workout.lift === lift &&
          (workout.historyOnly || (week - 1) * 4 + index < state.position),
      )
      .sort(
        (a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!),
      )[0];
    const active =
      state.active?.week === week && state.active.lift === lift
        ? state.active
        : null;
    const workout: Workout =
      active ??
      history ??
      makeWorkout({ ...state, position: (week - 1) * 4 + index, active: null });
    const status = active
      ? "in progress"
      : history
        ? "completed"
        : state.position === (week - 1) * 4 + index
          ? "next"
          : "planned";
    return {
      lift,
      date,
      workout,
      status,
      actualDate: history || active ? calendarDate(workout.date) : null,
    };
  });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = calendarDate(shiftDay(start, index));
    return {
      date,
      planned: slots.filter((slot) => slot.date === date && !slot.actualDate),
      history: state.history.filter(
        (workout) => calendarDate(workout.date) === date,
      ),
      active:
        state.active && calendarDate(state.active.date) === date
          ? state.active
          : null,
      cardio: state.cardio.filter((activity) => activity.date === date),
    };
  });
  return { start, end: shiftDay(start, 6), slots, days };
}
