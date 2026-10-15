import { names, type AppState, type Workout } from "../domain/model";
import { nextCatchUpSession } from "../domain/pastWorkouts";
import { calendarDay } from "../domain/calendar";
import { LiftIcon } from "./LiftIcon";

export function CatchUpReview({
  state,
  previous,
  addNext,
  done,
}: {
  state: AppState;
  previous: Workout;
  addNext: () => void;
  done: () => void;
}) {
  const next = nextCatchUpSession(state, previous);
  return (
    <section className="catch-up-review" aria-label="Catch-up progress">
      <div className="page-title">
        <div>
          <p className="eyebrow">PROGRAM UPDATED</p>
          <h1>
            Session saved<span>.</span>
          </h1>
        </div>
      </div>
      <p className="subtle">
        Cycle {previous.cycle} · Week {previous.week} · {names[previous.lift]}{" "}
        is recorded on its actual workout date.
      </p>
      <div className="panel catch-up-next">
        <p className="eyebrow">YOUR NEXT WORKOUT</p>
        <h2>
          <LiftIcon lift={next.lift} size={24} />
          {names[next.lift]}
        </h2>
        <p>
          Cycle {next.cycle} · Week {next.week}
        </p>
        <p className="subtle">
          Estimated schedule ·{" "}
          {calendarDay(next.date).toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <p className="subtle">
        Still have sessions to enter? Keep catching up. Otherwise, continue
        training from this session.
      </p>
      <div className="catch-up-actions">
        <button className="secondary" onClick={addNext}>
          Add another past workout
        </button>
        <button className="primary" onClick={done}>
          Continue from here
        </button>
      </div>
    </section>
  );
}
