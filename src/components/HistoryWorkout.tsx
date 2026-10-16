import { useState } from "react";
import { useBackScreen } from "./BackNavigation";
import type { Settings, Workout as WorkoutType } from "../domain/model";
import { workoutInPreferredUnits } from "../domain/workoutUnits";
import { Workout } from "./Workout";

export function HistoryWorkout({
  workout,
  settings,
  save,
  changeDate,
  remove,
  back,
}: {
  workout: WorkoutType;
  settings: Settings;
  save: (edited: WorkoutType) => void;
  changeDate: (date: string) => void;
  remove: () => void;
  back: () => void;
}) {
  const [draft, setDraft] = useState<WorkoutType | null>(null);
  const [error, setError] = useState("");
  useBackScreen(`saved-workout:${workout.id}:${draft ? "editing" : "view"}`, draft ? 3 : 2, () => {
    if (!draft) { back(); return; }
    if (JSON.stringify(draft) !== JSON.stringify(workoutInPreferredUnits(workout, settings)) && !confirm("Discard your unsaved workout corrections? The saved workout will stay unchanged.")) return false;
    setDraft(null);
    setError("");
  });
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
        accessorySettings={settings}
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
      {!draft && (
        <button
          className="text-button danger full"
          onClick={() => {
            if (!confirm("Delete this saved workout? This removes its performance from History, charts and calendars. Cycle progress and training maxes stay unchanged. This cannot be undone without a backup.")) return;
            try {
              remove();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not delete workout.");
            }
          }}
        >
          Delete workout
        </button>
      )}
    </>
  );
}
