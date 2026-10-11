import { useMemo, useState } from "react";
import { Activity, ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { names, type AppState, type Workout } from "../domain/model";
import { calendarDate, calendarDay, calendarWeek } from "../domain/calendar";
import { workoutInPreferredUnits } from "../domain/workoutUnits";
import { LiftIcon } from "./LiftIcon";

const shortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const weekNames = ["5s", "3s", "5/3/1", "Deload"];

export function CycleCalendar({
  state,
  editProgram,
  startWorkout,
  openWorkout,
  addPastWorkout,
}: {
  state: AppState;
  editProgram: () => void;
  startWorkout: () => void;
  openWorkout: (workout: Workout) => void;
  addPastWorkout: (date?: string, seed?: Workout) => void;
}) {
  const currentWeek = Math.floor(state.position / 4) + 1;
  const weeks = state.settings.skipDeload && currentWeek !== 4 ? 3 : 4;
  const [browsedWeek, setBrowsedWeek] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedWeek = Math.min(browsedWeek ?? currentWeek, weeks);
  const calendar = useMemo(
    () => calendarWeek(state, selectedWeek),
    [state, selectedWeek],
  );
  const today = calendarDate(new Date());
  const sessions = weeks * 4;
  const changeWeek = (week: number) => {
    setBrowsedWeek(week);
    setSelectedDate(null);
  };
  const selectedHistory = selectedDate
    ? state.history.filter(
        (workout) => calendarDate(workout.date) === selectedDate,
      )
    : [];
  const selectedActive =
    state.active && calendarDate(state.active.date) === selectedDate
      ? state.active
      : null;
  const selectedPlanned = calendar.slots.filter(
    (slot) => slot.date === selectedDate && !slot.actualDate,
  );
  const selectedWorkouts = [
    ...selectedHistory,
    ...(selectedActive ? [selectedActive] : []),
    ...selectedPlanned.map((slot) => slot.workout),
  ];
  const selectedCardio = state.cardio.filter(
    (activity) => activity.date === selectedDate,
  );
  const protocol = calendar.slots[0].workout.sets.filter(
    (set) => set.kind === "working",
  );

  return (
    <section className="panel overview-week" aria-label="Cycle schedule">
      <div className="section-heading">
        <h2>
          {selectedWeek === currentWeek ? "This week" : `Week ${selectedWeek}`}
        </h2>
        <button className="text-button" onClick={editProgram}>
          Edit program <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="overview-progress">
        <span>
          {state.position} / {sessions} workouts
        </span>
        <span>{Math.round((state.position / sessions) * 100)}%</span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${(state.position / sessions) * 100}%` }} />
      </div>
      <div className="overview-weeks" aria-label="Cycle weeks">
        {weekNames.slice(0, weeks).map((name, index) => (
          <button
            key={name}
            className={selectedWeek === index + 1 ? "current" : ""}
            aria-label={`Week ${index + 1} · ${name}`}
            aria-pressed={selectedWeek === index + 1}
            aria-current={currentWeek === index + 1 ? "step" : undefined}
            onClick={() => changeWeek(index + 1)}
          >
            {index + 1} · {name}
          </button>
        ))}
      </div>
      <div className="calendar-heading">
        <strong>
          {shortDate(calendar.start)} – {shortDate(calendar.end)}
        </strong>
        {selectedWeek !== currentWeek && (
          <button
            className="text-button"
            onClick={() => changeWeek(currentWeek)}
          >
            Current week
          </button>
        )}
        {selectedWeek === currentWeek && (
          <div className="calendar-key">
            <span>
              <i className="calendar-lift-dot" /> Lift
            </span>
            <span>
              <Check size={12} /> Logged
            </span>
            <span>
              <Activity size={12} /> Cardio
            </span>
          </div>
        )}
      </div>
      <p className="calendar-protocol">
        {protocol
          .map((set) => `${set.target}${set.plus ? "+" : ""}`)
          .join(" / ")}{" "}
        reps · {protocol.map((set) => `${set.percent}%`).join(" / ")}
      </p>
      <div
        className="calendar-strip"
        aria-label={`Week ${selectedWeek} calendar`}
      >
        {calendar.days.map((day) => {
          const description = [
            ...day.history.map((workout) => `${names[workout.lift]} logged`),
            ...(day.active ? [`${names[day.active.lift]} in progress`] : []),
            ...day.planned.map((slot) => `${names[slot.lift]} planned`),
            ...day.cardio.map(
              (activity) => `${activity.name} ${activity.minutes} minutes`,
            ),
          ];
          return (
            <button
              key={day.date}
              className="calendar-day"
              data-today={day.date === today}
              aria-current={day.date === today ? "date" : undefined}
              aria-pressed={selectedDate === day.date}
              aria-label={`${calendarDay(day.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}. ${description.join(". ") || "Rest day"}`}
              onClick={() =>
                setSelectedDate(selectedDate === day.date ? null : day.date)
              }
            >
              <small>
                {calendarDay(day.date)
                  .toLocaleDateString(undefined, { weekday: "short" })
                  .slice(0, 3)}
              </small>
              <strong>{calendarDay(day.date).getDate()}</strong>
              <span className="calendar-markers" aria-hidden="true">
                {day.history.length > 0 && <Check size={12} />}
                {(day.planned.length > 0 || day.active) && (
                  <span className="calendar-lift-dot" />
                )}
                {day.cardio.length > 0 && <Activity size={12} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="overview-schedule">
        {calendar.slots.map((slot) => {
          const date = slot.actualDate ?? slot.date;
          const workout = workoutInPreferredUnits(slot.workout, state.settings);
          return (
            <div
              key={slot.lift}
              className={
                slot.status === "next" || slot.status === "in progress"
                  ? "next"
                  : ""
              }
            >
              <button
                className="calendar-lift-row"
                aria-label={`${names[slot.lift]} · ${slot.status} · show details`}
                aria-expanded={selectedDate === date}
                onClick={() =>
                  setSelectedDate(selectedDate === date ? null : date)
                }
              >
                <small>
                  {calendarDay(date)
                    .toLocaleDateString(undefined, { weekday: "short" })
                    .toUpperCase()}
                  <span>{calendarDay(date).getDate()}</span>
                </small>
                <strong>
                  <LiftIcon lift={slot.lift} size={20} />
                  {names[slot.lift]}
                </strong>
                <span>
                  {workout.tm} {workout.units}
                  <small>TM</small>
                </span>
                <span
                  className="overview-session-status"
                  aria-label={`${names[slot.lift]} ${slot.status}`}
                >
                  {slot.status === "completed" ? (
                    <Check size={18} />
                  ) : slot.status === "next" ||
                    slot.status === "in progress" ? (
                    <ArrowRight size={18} />
                  ) : (
                    <span className="session-dot" />
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {selectedDate && (
        <section className="calendar-details" aria-label="Day details">
          <div className="calendar-detail-heading">
            <h3>
              {calendarDay(selectedDate).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>
            <button
              className="icon-button"
              aria-label="Close day details"
              onClick={() => setSelectedDate(null)}
            >
              <X size={17} />
            </button>
          </div>
          {!selectedWorkouts.length && (
            <p className="subtle">Rest day · no lifting scheduled.</p>
          )}
          {selectedDate <= today && (
            <button
              className="text-button"
              onClick={() => addPastWorkout(selectedDate)}
            >
              Add past workout on this day <ArrowRight size={15} />
            </button>
          )}
          {selectedWorkouts.map((original) => {
            const workout = workoutInPreferredUnits(original, state.settings);
            const main = workout.sets.filter((set) => set.kind === "working");
            const bbb = workout.sets.find((set) => set.kind === "bbb");
            const accessories = [
              ...new Set(
                workout.sets
                  .filter((set) => set.kind === "accessory")
                  .map((set) => set.name),
              ),
            ];
            const isActive = original.id === state.active?.id;
            const isNext =
              !state.active &&
              calendar.slots.some(
                (slot) =>
                  slot.workout.id === original.id && slot.status === "next",
              );
            return (
              <div className="calendar-workout-detail" key={workout.id}>
                <div className="calendar-detail-title">
                  <strong>
                    <LiftIcon lift={workout.lift} />
                    {names[workout.lift]}
                  </strong>
                  <small>
                    {workout.completedAt
                      ? "Logged"
                      : isActive
                        ? "In progress"
                        : "Planned"}{" "}
                    · Week {workout.week}
                  </small>
                </div>
                <div className="calendar-detail-sets">
                  {main.map((set) => (
                    <div key={set.id}>
                      <small>{set.percent}%</small>
                      <strong>
                        {set.weight} {workout.units} ×{" "}
                        {workout.completedAt ? set.reps : set.target}
                        {!workout.completedAt && set.plus ? "+" : ""}
                      </strong>
                    </div>
                  ))}
                </div>
                {bbb && (
                  <p>
                    BBB · {names[workout.bbbLift]} · 5 × 10 · {bbb.weight}{" "}
                    {workout.units}
                  </p>
                )}
                {!workout.completedAt && !isActive && selectedDate <= today && (
                  <button
                    className="text-button"
                    onClick={() => addPastWorkout(selectedDate, workout)}
                  >
                    Log this past session <ArrowRight size={15} />
                  </button>
                )}
                <p className="subtle">
                  Accessories ·{" "}
                  {accessories.length
                    ? accessories.join(" · ")
                    : "None selected"}
                </p>
                {(workout.completedAt || isActive) && (
                  <p className="subtle">
                    {workout.sets.filter((set) => set.done).length} of{" "}
                    {workout.sets.length} sets complete
                  </p>
                )}
                {workout.completedAt ? (
                  <button
                    className="text-button"
                    onClick={() => openWorkout(original)}
                  >
                    View logged workout <ArrowUpRight size={15} />
                  </button>
                ) : (
                  (isActive || isNext) && (
                    <button className="text-button" onClick={startWorkout}>
                      {isActive ? "Resume this workout" : "Start this workout"}{" "}
                      <ArrowRight size={15} />
                    </button>
                  )
                )}
              </div>
            );
          })}
          {selectedCardio.map((activity) => (
            <div className="calendar-cardio" key={activity.id}>
              <Activity size={17} />
              <div>
                <strong>
                  {activity.name} · {activity.minutes} min
                </strong>
                {activity.notes && <p className="subtle">{activity.notes}</p>}
              </div>
            </div>
          ))}
        </section>
      )}
      <p className="calendar-note">
        Tap a day for details · Dates are planned until logged.
      </p>
    </section>
  );
}
