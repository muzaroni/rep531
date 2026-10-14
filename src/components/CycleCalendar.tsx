import { useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
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
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const selectedWeek = Math.min(browsedWeek ?? currentWeek, weeks);
  const calendar = useMemo(
    () => calendarWeek(state, selectedWeek),
    [state, selectedWeek],
  );
  const today = calendarDate(new Date());
  const sessions = weeks * 4;
  const changeWeek = (week: number) => {
    if (week < 1 || week > weeks) return;
    setBrowsedWeek(week);
    setSelectedDate(null);
  };
  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStart.current = {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY,
    };
  };
  const onTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const deltaX = event.changedTouches[0].clientX - start.x;
    const deltaY = event.changedTouches[0].clientY - start.y;
    if (Math.abs(deltaX) >= 60 && Math.abs(deltaX) > Math.abs(deltaY))
      changeWeek(selectedWeek + (deltaX < 0 ? 1 : -1));
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

  return (
    <section
      className="panel overview-week"
      aria-label="Cycle schedule"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="week-card-header">
        <div>
          <p>
            Cycle {state.cycle} · Week {selectedWeek} of {weeks}
          </p>
          <h2>
            {weekNames[selectedWeek - 1]}
            <span>
              {shortDate(calendar.start)}–{shortDate(calendar.end)}
            </span>
          </h2>
        </div>
        <button className="week-edit-program" onClick={editProgram}>
          Edit program <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="overview-progress">
        <strong>
          {state.position} of {sessions} workouts
        </strong>
        <span>Cycle progress</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Cycle progress"
        aria-valuemin={0}
        aria-valuemax={sessions}
        aria-valuenow={state.position}
      >
        <div style={{ width: `${(state.position / sessions) * 100}%` }} />
      </div>
      <div className="overview-schedule">
        {calendar.slots.map((slot) => {
          const date = slot.actualDate ?? slot.date;
          const workout = workoutInPreferredUnits(slot.workout, state.settings);
          const mainSets = workout.sets
            .filter((set) => set.kind === "working")
            .map(
              (set) =>
                `${set.weight}×${slot.status === "completed" ? set.reps : set.target}${slot.status !== "completed" && set.plus ? "+" : ""}`,
            )
            .join(" · ");
          const status =
            slot.status === "completed"
              ? "Logged"
              : slot.status === "in progress"
                ? "In progress"
                : slot.status === "next"
                  ? "Next"
                  : "Planned";
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
                aria-label={`${names[slot.lift]} · ${status} · main sets ${mainSets} ${workout.units} · show details`}
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
                <span className="calendar-lift-summary">
                  <strong>
                    <LiftIcon lift={slot.lift} size={20} />
                    {names[slot.lift]}
                  </strong>
                  <small>
                    Main · {mainSets} {workout.units}
                  </small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      <nav className="week-swipe-controls" aria-label="Browse cycle weeks">
        <button
          aria-label="Previous week"
          disabled={selectedWeek === 1}
          onClick={() => changeWeek(selectedWeek - 1)}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="week-swipe-dots" aria-hidden="true">
          {Array.from({ length: weeks }, (_, index) => (
            <span
              key={index}
              className={selectedWeek === index + 1 ? "selected" : ""}
            />
          ))}
        </div>
        <button
          aria-label="Next week"
          disabled={selectedWeek === weeks}
          onClick={() => changeWeek(selectedWeek + 1)}
        >
          <ChevronRight size={20} />
        </button>
      </nav>
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
    </section>
  );
}
