import { useMemo } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { names, type AppState, type Workout } from "../domain/model";
import { makeWorkout, nextTrainingDay } from "../domain/calculations";
import { LiftIcon } from "./LiftIcon";
import { CycleCalendar } from "./CycleCalendar";
type Props = {
  state: AppState;
  start: () => void;
  settings: () => void;
  history: () => void;
  cardio: () => void;
  install: () => void;
  openWorkout: (workout: Workout) => void;
  addPastWorkout: (date?: string, seed?: Workout) => void;
};
export function Overview({
  state,
  start,
  settings,
  history,
  cardio,
  install,
  openWorkout,
  addPastWorkout,
}: Props) {
  const workout = useMemo(() => state.active ?? makeWorkout(state), [state]);
  const main = workout.sets.filter((set) => set.kind === "working");
  const bbb = workout.sets.find((set) => set.kind === "bbb");
  const accessories = [
    ...new Set(
      workout.sets
        .filter((set) => set.kind === "accessory")
        .map((set) => set.name),
    ),
  ];
  const done = workout.sets.filter((set) => set.done).length;
  const day = nextTrainingDay(state.settings.days, state.position);
  const week = Math.floor(state.position / 4) + 1;
  const weeks = state.settings.skipDeload && week !== 4 ? 3 : 4;
  return (
    <div className="lean-overview">
      <div className="overview-heading">
        <div>
          <p className="eyebrow">
            CYCLE {state.cycle} · WEEK {week} / {weeks}
          </p>
          <h1>
            Overview<span>.</span>
          </h1>
        </div>
        <span className="overview-variant">
          {workout.week === 4
            ? "Deload"
            : workout.variant === "swap"
              ? "BBB Swap"
              : "Normal BBB"}
        </span>
      </div>
      <section className="panel next-workout" aria-label="Next workout">
        <div className="session-status">
          <p className="eyebrow">
            {state.active
              ? "IN PROGRESS"
              : `UP NEXT · ${day.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()}`}
          </p>
          {state.active && (
            <span className="overview-resume">
              {done} of {workout.sets.length} sets complete
            </span>
          )}
        </div>
        {state.active && (
          <div className="session-progress" aria-hidden="true">
            <span style={{ width: `${(done / workout.sets.length) * 100}%` }} />
          </div>
        )}
        <div className="next-workout-title">
          <div>
            <h2>
              <LiftIcon lift={workout.lift} size={30} />
              {names[workout.lift]}
            </h2>
          </div>
          <div className="overview-tm">
            <small>TM</small>
            <strong>
              {workout.tm}
              <span> {workout.units}</span>
            </strong>
          </div>
        </div>
        <div className="overview-main-sets" aria-label="Main set prescription">
          {main.map((set, i) => (
            <div key={set.id}>
              <small>
                SET {i + 1} · {set.percent}%
              </small>
              <div className="prescription-load">
                <strong>
                  {set.weight}
                  <span> {workout.units}</span>
                </strong>
                <span>
                  × {set.target}
                  {set.plus ? "+" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
        {bbb && (
          <div className="overview-supplement">
            <span>
              <LiftIcon lift={workout.bbbLift} size={18} />
              BBB · {names[workout.bbbLift]} · 5 × 10
            </span>
            <strong>
              {bbb.weight} {workout.units}
            </strong>
          </div>
        )}
        <div className="overview-accessories">
          <small>ACCESSORIES · {accessories.length}</small>
          <p>
            {accessories.length ? accessories.join(" · ") : "None selected"}
          </p>
        </div>
        <button className="primary full session-action" onClick={start}>
          {state.active ? "Resume workout" : "Start workout"}
          <ArrowRight size={20} />
        </button>
      </section>
      <CycleCalendar
        state={state}
        editProgram={settings}
        startWorkout={start}
        openWorkout={openWorkout}
        addPastWorkout={addPastWorkout}
      />
      <div className="overview-actions">
        <button className="secondary" onClick={cardio}>
          <Activity size={18} />
          Log cardio
        </button>
        <button className="text-button" onClick={history}>
          {state.history.length} sessions
          <ArrowUpRight size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Install app"
          onClick={install}
        >
          <ArrowDownToLine size={19} />
        </button>
      </div>
    </div>
  );
}
