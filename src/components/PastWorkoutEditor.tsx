import { useState } from "react";
import { type AppState } from "../domain/model";
import { canAdvancePastWorkout, savePastWorkout } from "../domain/pastWorkouts";
import { Workout } from "./Workout";

export function PastWorkoutEditor({
  state,
  commit,
  back,
}: {
  state: AppState;
  commit: (state: AppState) => void;
  back: () => void;
}) {
  const [advance, setAdvance] = useState(false);
  const [error, setError] = useState("");
  if (!state.pastWorkout) return null;
  const eligible = canAdvancePastWorkout(state);
  return (
    <>
      <section className="panel past-workout-options">
        <div className="section-heading">
          <h2>Past workout</h2>
          <button
            className="text-button"
            onClick={() => {
              commit({ ...state, pastWorkout: null });
              back();
            }}
          >
            Discard draft
          </button>
        </div>
        <p className="subtle">
          This draft saves separately from your current workout.
        </p>
        <button
          className="text-button"
          onClick={() =>
            commit({
              ...state,
              pastWorkout: {
                ...state.pastWorkout!,
                sets: state.pastWorkout!.sets.map((set) =>
                  set.kind === "working" || set.kind === "bbb"
                    ? { ...set, done: true }
                    : set,
                ),
              },
            })
          }
        >
          Mark main &amp; BBB complete
        </button>
        <label className="toggle-row">
          <span>
            Count as next program workout
            <small>
              {eligible
                ? "Advance your cycle when this session is saved"
                : "Available for your next session when no workout is active"}
            </small>
          </span>
          <input
            type="checkbox"
            checked={advance && eligible}
            disabled={!eligible}
            onChange={(event) => setAdvance(event.target.checked)}
          />
        </label>
        <p className="subtle">
          {advance && eligible
            ? "Saving advances progress once, including any enabled cycle increase."
            : "Saving adds history only; cycle progress and training maxes stay unchanged."}
        </p>
      </section>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <Workout
        accessorySettings={state.settings}
        past
        workout={state.pastWorkout}
        update={(pastWorkout) => commit({ ...state, pastWorkout })}
        finish={() => {
          try {
            commit(savePastWorkout(state, advance && eligible));
            back();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not save past workout.",
            );
          }
        }}
        back={back}
        onCompleteSet={() => {}}
      />
    </>
  );
}
