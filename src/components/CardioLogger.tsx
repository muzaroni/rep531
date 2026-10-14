import { DatePicker } from "./ui/shadcn/date-picker";
import { useEffect, useRef, useState } from "react";
import { Bike, Check, Footprints, X } from "lucide-react";
import { type AppState } from "../domain/model";
import { calendarDate } from "../domain/calendar";

const activities = [
  "Walking",
  "Elliptical",
  "Treadmill",
  "Cycling",
  "Rowing",
] as const;
type Activity = (typeof activities)[number];
function CardioIcon({ activity }: { activity: Activity }) {
  if (activity === "Walking")
    return <Footprints size={26} aria-hidden="true" />;
  if (activity === "Cycling") return <Bike size={26} aria-hidden="true" />;
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {activity === "Elliptical" ? (
        <>
          <circle cx="7" cy="16" r="4" />
          <path d="m7 16 11 3 2-15h-3M5 21h6m4 0h6M13 17 12 7H9" />
        </>
      ) : activity === "Treadmill" ? (
        <>
          <rect x="3" y="16" width="18" height="5" rx="2.5" />
          <rect x="13" y="3" width="7" height="4" rx="1" />
          <path d="m17 7 2 9M17 10h-6" />
        </>
      ) : (
        <>
          <circle cx="18" cy="14" r="5" />
          <rect x="3" y="13" width="5" height="3" rx="1" />
          <path d="M2 20h20M4 20v2m16-2v2M6 16v4M11 17l-2-4M10 6h4l2 3" />
        </>
      )}
    </svg>
  );
}

export function CardioLogger({
  lastActivity,
  save,
  close,
}: {
  lastActivity?: string;
  save: (entry: Omit<AppState["cardio"][number], "id">) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [activity, setActivity] = useState(lastActivity || "Walking");
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="accessory-dialog cardio-dialog"
      aria-labelledby="cardio-title"
      onClose={close}
    >
      <div className="section-heading">
        <h2 id="cardio-title">Log cardio</h2>
        <button
          className="icon-button"
          aria-label="Close cardio"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const name = activity.trim();
          if (!name) {
            setError("Enter an activity or choose one below.");
            return;
          }
          const data = new FormData(event.currentTarget);
          save({
            name,
            date: String(data.get("date")),
            minutes: Number(data.get("minutes")),
            notes: String(data.get("notes")),
          });
        }}
      >
        <label className="stack-field">
          Activity
          <input
            name="name"
            placeholder="Choose below or type your own…"
            required
            maxLength={80}
            value={activity}
            onChange={(event) => {
              setActivity(event.target.value);
              setError("");
            }}
          />
        </label>
        <div
          className="cardio-presets"
          role="group"
          aria-label="Quick select activity"
        >
          {activities.map((name) => (
            <button
              type="button"
              className="cardio-preset"
              key={name}
              aria-pressed={
                activity.trim().toLowerCase() === name.toLowerCase()
              }
              onClick={() => {
                setActivity(name);
                setError("");
              }}
            >
              <CardioIcon activity={name} />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <p className="subtle cardio-recall">
          Your last logged activity is selected next time.
        </p>
        <div className="two-fields">
          <label className="stack-field">
            Date
            <DatePicker
              name="date"
              defaultValue={calendarDate(new Date())}
              required
            />
          </label>
          <label className="stack-field">
            Duration (minutes)
            <input
              name="minutes"
              type="number"
              min="0.01"
              max="10080"
              step="any"
              defaultValue="20"
              required
            />
          </label>
        </div>
        <label className="stack-field">
          Notes
          <textarea name="notes" maxLength={10000} placeholder="Optional" />
        </label>
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
        <button className="primary full" type="submit">
          Save cardio <Check size={18} />
        </button>
      </form>
    </dialog>
  );
}
