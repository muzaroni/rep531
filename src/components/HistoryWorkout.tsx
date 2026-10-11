import { useState } from "react";
import type { Settings, Workout as WorkoutType } from "../domain/model";
import { workoutInPreferredUnits } from "../domain/workoutUnits";
import { Workout } from "./Workout";

export function HistoryWorkout({
  workout,
  settings,
  save,
  changeDate,
  back,
}: {
  workout: WorkoutType;
  settings: Settings;
  save: (edited: WorkoutType) => void;
  changeDate: (date: string) => void;
  back: () => void;
}) {
  const [draft, setDraft] = useState<WorkoutType | null>(null);
  const [error, setError] = useState("");
  return (
    <>
      <div className="section-heading">
        <span className="muted-label">
          {draft ? "EDITING SAVED WORKOUT" : "SAVED WORKOUT"}
        </span>
        <button
          className="secondary"
          onClick={() => {
            setError("");
            setDraft(
              draft
                ? null
                : structuredClone(workoutInPreferredUnits(workout, settings)),
            );
          }}
        >
          {draft ? "Cancel edits" : "Edit workout"}
        </button>
      </div>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <Workout
        workout={draft ?? workoutInPreferredUnits(workout, settings)}
        update={setDraft}
        readonly={!draft}
        editingHistory={!!draft}
        changeDate={changeDate}
        finish={() => {
          if (!draft) return;
          try {
            save(draft);
            setDraft(null);
            setError("");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Could not save changes.",
            );
          }
        }}
        back={back}
        onCompleteSet={() => {}}
      />
    </>
  );
}
