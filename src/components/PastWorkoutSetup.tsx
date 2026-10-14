import { DatePicker } from "./ui/shadcn/date-picker";
import { useEffect, useRef, useState } from "react";
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
}: {
  state: AppState;
  date?: string;
  seed?: Workout;
  create: (input: {
    date: string;
    cycle: number;
    week: number;
    lift: Lift;
  }) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const today = calendarDate(new Date());
  const [input, setInput] = useState({
    date: date && date <= today ? date : today,
    cycle: seed?.cycle ?? state.cycle,
    week: seed?.week ?? Math.floor(state.position / 4) + 1,
    lift: seed?.lift ?? state.settings.order[state.position % 4],
  });
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
  }, []);
  return (
    <dialog
      className="accessory-dialog past-workout-dialog"
      ref={dialog}
      onCancel={close}
      onClose={close}
      aria-labelledby="past-workout-title"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            create(input);
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not create workout.",
            );
          }
        }}
      >
        <div className="calendar-detail-heading">
          <h2 id="past-workout-title">Add past workout</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Close past workout setup"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <p className="subtle">
          Choose the session and when you did it. We’ll use your current
          training settings; edit the sets to match what you actually lifted.
        </p>
        <label className="stack-field">
          Workout date
          <DatePicker
            autoFocus
            required
            max={today}
            value={input.date}
            onChange={(date) => setInput({ ...input, date })}
          />
        </label>
        <div className="past-workout-fields">
          <label className="stack-field">
            Cycle
            <NumericInput
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
              {[1, 2, 3, 4].map((week) => (
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
    </dialog>
  );
}
