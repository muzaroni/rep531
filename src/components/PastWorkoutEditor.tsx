import { useState } from "react";
import {
  type AppState,
  type Workout as WorkoutSnapshot,
} from "../domain/model";
import { canAdvancePastWorkout, savePastWorkout } from "../domain/pastWorkouts";
import { Workout } from "./Workout";

export function PastWorkoutEditor({
  state,
  commit,
  back,
  caughtUp,
}: {
  state: AppState;
  commit: (state: AppState) => void;
  back: () => void;
  caughtUp: (next: AppState, workout: WorkoutSnapshot) => void;
}) {
  const [error, setError] = useState("");
  if (!state.pastWorkout) return null;
  const advance = state.pastWorkout.historyOnly === false;
  const eligible = canAdvancePastWorkout(state);
  return (
    <>
      <section className="panel past-workout-options">
        <div className="section-heading">
          <h2>{advance ? "Catch up my program" : "Past workout"}</h2>
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
            checked={advance}
            disabled={!eligible && !advance}
            onChange={(event) =>
              commit({
                ...state,
                pastWorkout: {
                  ...state.pastWorkout!,
                  historyOnly: !event.target.checked,
                },
              })
            }
          />
        </label>
        <p className="subtle">
          {advance
            ? eligible
              ? `Saving continues your program after Cycle ${state.pastWorkout.cycle}, Week ${state.pastWorkout.week}, this lift. Earlier history stays unchanged. Any enabled increase applies only at cycle completion.`
              : "This draft must match your next session with no workout active. You can switch to history only."
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
            if (advance && !eligible)
              throw new Error(
                "This draft must match your next program session. Finish or discard any active workout, or switch this draft to history only.",
              );
            const next = savePastWorkout(state, advance && eligible);
            if (advance && eligible) caughtUp(next, state.pastWorkout!);
            else {
              commit(next);
              back();
            }
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
