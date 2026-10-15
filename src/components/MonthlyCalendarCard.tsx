import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Activity, Info } from "lucide-react";
import { monthlyCalendar } from "../domain/monthlyCalendar";
import { calendarDay } from "../domain/calendar";
import { names, type AppState, type Workout } from "../domain/model";
import { workoutInPreferredUnits } from "../domain/workoutUnits";
import { LiftIcon } from "./LiftIcon";

export function MonthlyCalendarCard({
  state,
  openWorkout,
}: {
  state: AppState;
  openWorkout: (workout: Workout) => void;
}) {
  const [today, setToday] = useState(() => new Date());
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1, 12),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const keyId = useId();
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  useEffect(() => {
    const tick = window.setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);
  const days = monthlyCalendar(state, month, today);
  const selectedDay = days.find((day) => day.date === selected);
  const move = (direction: number) => {
    setMonth(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() + direction,
          1,
          12,
        ),
    );
    setSelected(null);
  };
  return (
    <section
      className="panel monthly-calendar-card"
      aria-label="Monthly calendar"
    >
      <h2 className="sr-only">Monthly calendar</h2>
      <div className="monthly-navigation">
        <button
          className="icon-button"
          aria-label="Previous month"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <h3 aria-live="polite">
          {month.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })}
        </h3>
        <button
          className="icon-button"
          aria-label="Next month"
          onClick={() => move(1)}
        >
          <ChevronRight size={18} />
        </button>
        <button
          className="text-button monthly-today-action"
          onClick={() => {
            setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
            setSelected(null);
          }}
        >
          Today
        </button>
        <button
          className="icon-button"
          aria-label="Calendar key"
          aria-expanded={showKey}
          aria-controls={keyId}
          onClick={() => setShowKey(!showKey)}
        >
          <Info size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="monthly-weekdays" aria-hidden="true">
        {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <div
        className="monthly-grid"
        onPointerDown={(event) => {
          swiped.current = false;
          gesture.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start) return;
          const x = event.clientX - start.x,
            y = event.clientY - start.y;
          if (Math.abs(x) > 50 && Math.abs(y) < Math.abs(x) * 0.65) {
            swiped.current = true;
            move(x < 0 ? 1 : -1);
          }
        }}
      >
        {days.map((day) => {
          const session = day.sessions[0];
          const completed = day.sessions.some(
            (item) => item.status === "completed",
          );
          const dots = session ? [5, 3, 1, 0][session.workout.week - 1] : 0;
          const label = `${calendarDay(day.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${day.today ? ", Today" : ""}${day.sessions.map((item) => `, ${names[item.workout.lift]}, week ${item.workout.week}, ${item.status}`).join("")}${day.cardio.length ? `, ${day.cardio.length} cardio activities` : ""}`;
          return (
            <button
              key={day.date}
              className="monthly-day"
              data-date={day.date}
              data-completed={completed}
              data-outside={!day.inMonth}
              aria-label={label}
              aria-current={day.today ? "date" : undefined}
              aria-pressed={selected === day.date}
              onClick={() => {
                if (!swiped.current)
                  setSelected(selected === day.date ? null : day.date);
              }}
            >
              <span className="monthly-date">{day.day}</span>
              {day.today && (
                <span className="monthly-today" aria-hidden="true" />
              )}
              {session ? (
                <>
                  <LiftIcon lift={session.workout.lift} size={16} />
                  <span className="monthly-week-dots" aria-hidden="true">
                    {dots ? (
                      Array.from({ length: dots }, (_, index) => (
                        <i key={index} />
                      ))
                    ) : (
                      <span className="monthly-deload">D</span>
                    )}
                  </span>
                </>
              ) : day.cardio.length ? (
                <Activity
                  className="monthly-cardio"
                  size={16}
                  aria-hidden="true"
                />
              ) : null}
              {day.sessions.length > 1 && (
                <span className="monthly-more">+{day.sessions.length - 1}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="monthly-key" id={keyId} hidden={!showKey}>
        5 dots · 5s <span>3 · 3s</span>
        <span>1 · 1s</span>
        <span>D · Deload</span>
      </p>
      {selectedDay && (
        <div className="monthly-day-detail" aria-label="Calendar day details">
          <strong>
            {calendarDay(selectedDay.date).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}
          </strong>
          {!selectedDay.sessions.length && !selectedDay.cardio.length && (
            <p className="subtle">No workouts recorded or planned.</p>
          )}
          {selectedDay.sessions.map((session) => {
            const workout = workoutInPreferredUnits(
              session.workout,
              state.settings,
            );
            return (
              <div key={session.key} className="monthly-detail-session">
                <span>
                  <LiftIcon lift={workout.lift} size={18} />
                  {names[workout.lift]} ·{" "}
                  {session.status === "completed"
                    ? "Completed"
                    : session.status === "active"
                      ? "In progress"
                      : "Estimated"}
                </span>
                <small>
                  Cycle {workout.cycle} · Week {workout.week} ·{" "}
                  {workout.sets
                    .filter((set) => set.kind === "working")
                    .map(
                      (set) =>
                        `${set.weight} × ${session.status === "completed" ? set.reps : set.target}${session.status !== "completed" && set.plus ? "+" : ""}`,
                    )
                    .join(" · ")}{" "}
                  {workout.units}
                </small>
                {session.status === "completed" && (
                  <button
                    className="text-button"
                    onClick={() => openWorkout(session.workout)}
                  >
                    View workout
                  </button>
                )}
              </div>
            );
          })}
          {selectedDay.cardio.map((activity) => (
            <p key={activity.id} className="subtle">
              {activity.name} · {activity.minutes} min
            </p>
          ))}
          {selectedDay.sessions.some(
            (session) => session.status === "planned",
          ) && (
            <p className="subtle">
              Planned dates are estimates for the current cycle.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
