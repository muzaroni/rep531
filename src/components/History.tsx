import { useState } from "react";
import { Download, LayoutGrid } from "lucide-react";
import type { AppState, Workout } from "../domain/model";
import { DashboardCards, useDashboardCards } from "./DashboardCards";
export function History({
  state,
  open,
  exportHistory,
  addPastWorkout,
  start,
  editProgram,
}: {
  state: AppState;
  open: (workout: Workout) => void;
  exportHistory: () => void;
  addPastWorkout: (date?: string, workout?: Workout) => void;
  start: () => void;
  editProgram: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const cards = useDashboardCards("history");
  return (
    <div className="history-page">
      <div className="overview-heading history-heading">
        <p className="eyebrow">THE WORK ADDS UP</p>
        <h1>
          Your progress<span>.</span>
        </h1>
        <button
          className="icon-button overview-card-manager"
          aria-label="Manage history cards"
          onClick={() => setPickerOpen(true)}
        >
          <LayoutGrid size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="history-actions">
        <button className="secondary" onClick={() => addPastWorkout()}>
          {state.pastWorkout ? "Resume past workout" : "Add past workout"}
        </button>
        <button className="secondary" onClick={exportHistory}>
          <Download size={17} />
          Export
        </button>
      </div>
      <DashboardCards
        page="history"
        state={state}
        cards={cards}
        pickerOpen={pickerOpen}
        closePicker={() => setPickerOpen(false)}
        start={start}
        editProgram={editProgram}
        openWorkout={open}
        addPastWorkout={addPastWorkout}
      />
    </div>
  );
}
