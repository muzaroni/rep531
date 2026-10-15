import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { lifts, names, type AppState } from "../domain/model";
import {
  cycleMaxes,
  previousCycleMaxes,
  type CycleMaxMode,
} from "../domain/cycleSetup";
import { NumericInput } from "./NumericInput";
export function CycleSetup({
  state,
  close,
  start,
  catchUp = false,
}: {
  state: AppState;
  catchUp?: boolean;
  close: () => void;
  start: (
    maxes: AppState["settings"]["maxes"],
    variant: "normal" | "swap",
  ) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<CycleMaxMode>(
    state.settings.autoIncrease && state.cycleSetup?.cycle === state.cycle
      ? "increase"
      : "keep",
  );
  const [custom, setCustom] = useState({ ...state.settings.maxes });
  const [variant, setVariant] = useState<"normal" | "swap">(
    state.settings.cycleVariants[state.cycle] ?? "normal",
  );
  const [error, setError] = useState("");
  const previous = previousCycleMaxes(state);
  const maxes = mode === "custom" ? custom : cycleMaxes(state, mode, custom);
  useEffect(() => {
    dialog.current!.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="accessory-dialog cycle-setup-dialog"
      aria-labelledby="cycle-setup-title"
      onCancel={close}
      onClose={close}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            start(maxes, variant);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Check training maxes.");
          }
        }}
      >
        <div className="calendar-detail-heading">
          <div>
            <p className="eyebrow">NEXT CYCLE</p>
            <h2 id="cycle-setup-title">Set up cycle {state.cycle}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close cycle setup"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <label className="field-row">
          Training max approach
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as CycleMaxMode)}
          >
            <option value="keep">Keep previous TMs</option>
            <option value="increase">Previous TMs + cycle increases</option>
            <option value="custom">Enter my own TMs</option>
          </select>
        </label>
        <p className="subtle cycle-setup-note">
          Increases use your configured amounts, not estimated 1RMs from past
          reps. Loads round to your available plates.
        </p>
        <div className="cycle-max-grid">
          {lifts.map((lift) => (
            <label key={lift}>
              <span>
                {names[lift]} <small>{state.settings.units}</small>
              </span>
              <NumericInput
                aria-label={`${names[lift]} cycle training max`}
                value={maxes[lift]}
                min={0.01}
                max={10000}
                step="any"
                disabled={mode !== "custom"}
                onChange={(event) =>
                  setCustom({ ...custom, [lift]: Number(event.target.value) })
                }
              />
              <small>
                Previous: {previous[lift]} {state.settings.units}
              </small>
            </label>
          ))}
        </div>
        <label className="field-row">
          Cycle variation
          <select
            value={variant}
            onChange={(event) =>
              setVariant(event.target.value as "normal" | "swap")
            }
          >
            <option value="normal">Normal BBB</option>
            <option value="swap">BBB Swap</option>
          </select>
        </label>
        <p className="subtle cycle-setup-note">
          {variant === "swap"
            ? "Squat ↔ deadlift · Bench ↔ overhead press for BBB."
            : "BBB uses the same lift as your main sets."}
          {!state.settings.bbb ? " BBB is currently disabled in Settings." : ""}
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="cycle-setup-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" type="submit">
            {catchUp ? "Continue catch-up" : `Start cycle ${state.cycle}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
