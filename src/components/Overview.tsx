import { useMemo, useState } from "react";
import { Activity, ArrowRight, LayoutGrid, Minus, Plus } from "lucide-react";
import { names, type AppState, type Workout } from "../domain/model";
import { makeWorkout, nextTrainingDay } from "../domain/calculations";
import { LiftIcon } from "./LiftIcon";
import { CycleCalendar } from "./CycleCalendar";
import { ActiveCycleCard } from "./ActiveCycleCard";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

const activeCycleCardKey = "bbb-overview-active-cycle";
const thisWeekCardKey = "bbb-overview-this-week";
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
  const [showActiveCycle, setShowActiveCycle] = useState(() => {
    try {
      return localStorage.getItem(activeCycleCardKey) === "true";
    } catch {
      return false;
    }
  });
  const [showThisWeek, setShowThisWeek] = useState(() => {
    try {
      return localStorage.getItem(thisWeekCardKey) !== "false";
    } catch {
      return true;
    }
  });
  const setCardVisibility = (key: string, visible: boolean) => {
    if (key === activeCycleCardKey) setShowActiveCycle(visible);
    else setShowThisWeek(visible);
    try {
      localStorage.setItem(key, String(visible));
    } catch {
      /* Card visibility is a local UI preference. */
    }
  };
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
        <p className="eyebrow">CYCLE {state.cycle} · WEEK {week} / {weeks}</p>
        <h1>Overview<span>.</span></h1>
        <button
          className="icon-button overview-card-manager"
          aria-label="Manage overview cards"
          title="Manage cards"
          onClick={() => setManageCardsOpen(true)}
        >
          <LayoutGrid size={20} aria-hidden="true" />
        </button>
      </div>
      {!showThisWeek && !showActiveCycle && <button className="text-button" onClick={settings}>Edit program</button>}
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
          <Button variant="text" className="overview-cardio-action" onClick={cardio}>
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
      {showThisWeek && (
        <CycleCalendar
          state={state}
          editProgram={settings}
          startWorkout={start}
          openWorkout={openWorkout}
          addPastWorkout={addPastWorkout}
        />
      )}
      {showActiveCycle && (
        <ActiveCycleCard
          state={state}
          editProgram={settings}
        />
      )}
      <Dialog
        open={manageCardsOpen}
        title="Overview cards"
        onClose={() => setManageCardsOpen(false)}
        compact
      >
        <div className="overview-card-option">
          <div>
            <strong>This week</strong>
            <small>Four lifts and week browsing</small>
          </div>
          <Button
            variant="icon"
            aria-label={`${showThisWeek ? "Remove" : "Add"} This week card`}
            onClick={() => setCardVisibility(thisWeekCardKey, !showThisWeek)}
          >
            {showThisWeek ? <Minus size={19} aria-hidden="true" /> : <Plus size={19} aria-hidden="true" />}
          </Button>
        </div>
        <div className="overview-card-option">
          <div>
            <strong>Active cycle</strong>
            <small>Top sets across three weeks</small>
          </div>
          <Button
            variant="icon"
            aria-label={`${showActiveCycle ? "Remove" : "Add"} Active cycle card`}
            onClick={() => setCardVisibility(activeCycleCardKey, !showActiveCycle)}
          >
            {showActiveCycle ? <Minus size={19} aria-hidden="true" /> : <Plus size={19} aria-hidden="true" />}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
