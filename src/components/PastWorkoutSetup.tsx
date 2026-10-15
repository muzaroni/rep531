import { DatePicker } from "./ui/shadcn/date-picker";
import { useState } from "react";
import { X } from "lucide-react";
import { names, type AppState, type Lift, type Workout } from "../domain/model";
import { calendarDate } from "../domain/calendar";
import { NumericInput } from "./NumericInput";

export function PastWorkoutSetup({
  state,
  date,
  seed,
  create,
  close,
  mode: initialMode = "history",
}: {
  state: AppState;
  date?: string;
  seed?: Workout;
  mode?: "history" | "catch-up";
  create: (input: {
    date: string;
    cycle: number;
    week: number;
    lift: Lift;
    mode: "history" | "catch-up";
  }) => void;
  close: () => void;
}) {
  const today = calendarDate(new Date());
  const [mode, setMode] = useState(initialMode);
  const [input, setInput] = useState({
    date: date && date <= today ? date : today,
    cycle: seed?.cycle ?? state.cycle,
    week: seed?.week ?? Math.floor(state.position / 4) + 1,
    lift: seed?.lift ?? state.settings.order[state.position % 4],
  });
  const [error, setError] = useState("");
  return (
    <section className="past-workout-setup" aria-label="Add past workout">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const position = (input.week - 1) * 4 + state.settings.order.indexOf(input.lift);
            if (mode === "catch-up" && position > state.position &&
              !confirm(`Start catching up from Cycle ${input.cycle}, Week ${input.week}, ${names[input.lift]}? Saving this workout will move your program forward from there. Earlier sessions will not be created or changed. Training maxes stay unchanged unless you finish the cycle with automatic increases enabled.`)) return;
            create({ ...input, mode });
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not create workout.",
            );
          }
        }}
      >
        <div className="page-title">
          <div>
            <p className="eyebrow">TRAINING HISTORY</p>
            <h1 id="past-workout-title">
              Add past workout<span>.</span>
            </h1>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close past workout setup"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <div
          className="past-entry-modes"
          role="group"
          aria-label="Past workout purpose"
        >
          <button
            type="button"
            className="secondary"
            aria-pressed={mode === "history"}
            onClick={() => setMode("history")}
          >
            Add to history
          </button>
          <button
            type="button"
            className="secondary"
            aria-pressed={mode === "catch-up"}
            disabled={!!state.active}
            onClick={() => {
              setMode("catch-up");
              setInput((current) => ({
                ...current,
                cycle: state.cycle,
                week: Math.floor(state.position / 4) + 1,
                lift: state.settings.order[state.position % 4],
              }));
            }}
          >
            Catch up my program
          </button>
        </div>
        <p className="subtle">
          {mode === "catch-up"
            ? "Choose where to start catching up. Saving moves your program forward from that session; earlier history stays unchanged."
            : "Record a session without changing your current program."}
          {state.active &&
            " Finish or discard your active workout before catching up your program."}{" "}
          Prescriptions use your current settings; edit the sets to match what
          you actually lifted.
        </p>
        <div className="stack-field">
          <label htmlFor="past-workout-date">Workout date</label>
          <DatePicker
            id="past-workout-date"
            inline
            required
            max={today}
            value={input.date}
            onChange={(date) => setInput({ ...input, date })}
          />
        </div>
        <div className="past-workout-fields">
          <label className="stack-field">
            Cycle
            <NumericInput
              disabled={mode === "catch-up"}
              min={1}
              max={state.cycle}
              value={input.cycle}
              onChange={(event) =>
                setInput({ ...input, cycle: Number(event.target.value) })
              }
            />
          </label>
          <label className="stack-field">
            Week
            <select
              aria-label="Week"
              value={input.week}
              onChange={(event) =>
                setInput({ ...input, week: Number(event.target.value) })
              }
            >
              {(mode === "catch-up" && state.settings.skipDeload ? [1, 2, 3] : [1, 2, 3, 4]).map((week) => (
                <option key={week} value={week}>
                  {week === 4 ? "4 · Deload" : week}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="stack-field">
          Lift
          <select
            aria-label="Lift"
            value={input.lift}
            onChange={(event) =>
              setInput({ ...input, lift: event.target.value as Lift })
            }
          >
            {state.settings.order.map((lift) => (
              <option key={lift} value={lift}>
                {names[lift]}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
        <button className="primary full" type="submit">
          Create past workout
        </button>
      </form>
    </section>
  );
}
