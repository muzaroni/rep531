import { useMemo, useState } from "react";
import { Activity, ArrowRight, LayoutGrid } from "lucide-react";
import { names, type AppState, type Workout } from "../domain/model";
import { makeWorkout, nextTrainingDay } from "../domain/calculations";
import { LiftIcon } from "./LiftIcon";

import { Button } from "./ui/Button";

import { DashboardCards, useDashboardCards } from "./DashboardCards";

type Props = {
  state: AppState;
  start: () => void;
  settings: () => void;
  cardio: () => void;
  openWorkout: (workout: Workout) => void;
  addPastWorkout: (date?: string, seed?: Workout) => void;
};
export function Overview({
  state,
  start,
  settings,
  cardio,
  openWorkout,
  addPastWorkout,
}: Props) {
  const [manageCardsOpen, setManageCardsOpen] = useState(false);
  const cards = useDashboardCards("overview");
  const showThisWeek = cards.visible.includes("week"),
    showActiveCycle = cards.visible.includes("cycle");
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
        <p className="eyebrow">
          CYCLE {state.cycle} · WEEK {week} / {weeks}
        </p>
        <h1>
          Overview<span>.</span>
        </h1>
        <button
          className="icon-button overview-card-manager"
          aria-label="Manage overview cards"
          title="Manage cards"
          onClick={() => setManageCardsOpen(true)}
        >
          <LayoutGrid size={20} aria-hidden="true" />
        </button>
      </div>
      {!showThisWeek && !showActiveCycle && (
        <button className="text-button" onClick={settings}>
          Edit program
        </button>
      )}
      <section className="panel next-workout" aria-label="Next workout">
        <div className="session-status">
          <div className="session-status-copy">
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
          <Button
            variant="text"
            className="overview-cardio-action"
            onClick={cardio}
          >
            <Activity size={17} aria-hidden="true" />
            Log cardio
          </Button>
        </div>
        {state.active && (
          <div className="session-progress" aria-hidden="true">
            <span style={{ width: `${(done / workout.sets.length) * 100}%` }} />
          </div>
        )}
        <div className="next-workout-title">
          <h2>
            <LiftIcon lift={workout.lift} size={30} />
            {names[workout.lift]}
          </h2>
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
      <DashboardCards
        page="overview"
        state={state}
        cards={cards}
        pickerOpen={manageCardsOpen}
        closePicker={() => setManageCardsOpen(false)}
        editProgram={settings}
        start={start}
        openWorkout={openWorkout}
        addPastWorkout={addPastWorkout}
      />
    </div>
  );
}
