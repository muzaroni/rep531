import {
  changeAccessorySetCount,
  workoutAccessoryGroups,
} from "../domain/accessorySets";
import { Fragment, useState } from "react";
import { calendarDate } from "../domain/calendar";
import { workoutWithDate } from "../domain/pastWorkouts";
import { LiftIcon } from "./LiftIcon";
import { NumericInput } from "./NumericInput";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Dumbbell,
  Minus,
  Plus,
} from "lucide-react";
import {
  type Workout as WorkoutType,
  type WorkoutSet,
  names,
  categoryNames,
} from "../domain/model";
import {
  plateLoad,
  canFinishWorkout,
  skipWorkoutWarmups,
} from "../domain/calculations";
type Props = {
  workout: WorkoutType;
  update: (w: WorkoutType) => void;
  finish: () => void;
  back: () => void;
  onCompleteSet: (kind: WorkoutSet["kind"], setId: string) => void;
  readonly?: boolean;
  past?: boolean;
  changeDate?: (date: string) => void;
  discard?: () => void;
  editingHistory?: boolean;
};
export function Workout({
  workout: w,
  update,
  finish,
  back,
  onCompleteSet,
  readonly = false,
  past = false,
  changeDate,
  discard,
  editingHistory = false,
}: Props) {
  const [dateError, setDateError] = useState("");
  const change = (id: string, patch: Partial<WorkoutSet>) =>
    update({
      ...w,
      sets: w.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  const completed = w.sets.filter((s) => s.done).length;
  return (
    <>
      <button className="text-button" onClick={back}>
        <ArrowLeft size={17} />{" "}
        {readonly || past || editingHistory ? "Back to history" : "Dashboard"}
      </button>
      <div className="page-title workout-title">
        <div>
          <p className="eyebrow">
            CYCLE {w.cycle} / WEEK {w.week} ·{" "}
            {w.variant === "swap" ? "BBB SWAP" : "NORMAL BBB"}{" "}
            {readonly || editingHistory ? " / COMPLETED" : ""}
            {past ? " / PAST WORKOUT" : ""}
          </p>
          <h1>
            <LiftIcon lift={w.lift} size={30} />
            {names[w.lift]}
            <span>.</span>
          </h1>
        </div>
        <div className="tm-tag">
          TRAINING MAX
          <strong>
            {w.tm} <small>{w.units}</small>
          </strong>
        </div>
      </div>
      <label className="workout-date">
        Workout date
        <input
          type="date"
          value={calendarDate(w.date)}
          max={calendarDate(new Date())}
          disabled={readonly && !changeDate}
          onChange={(event) => {
            try {
              if (readonly && changeDate) changeDate(event.target.value);
              else update(workoutWithDate(w, event.target.value));
              setDateError("");
            } catch (error) {
              setDateError(
                error instanceof Error ? error.message : "Invalid date.",
              );
            }
          }}
        />
      </label>
      {dateError && (
        <p role="alert" className="error-banner">
          {dateError}
        </p>
      )}
      <div className="progress-header">
        <span>
          {completed} of {w.sets.length} sets complete
        </span>
        <span>{Math.round((completed / w.sets.length) * 100)}%</span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${(completed / w.sets.length) * 100}%` }} />
      </div>
      {(["warmup", "working", "bbb", "accessory"] as const).map((kind) => {
        const sets = w.sets.filter((s) => s.kind === kind);
        const groups =
          kind === "accessory"
            ? workoutAccessoryGroups(w)
            : [{ key: kind, template: sets[0], sets }];
        if (!groups.length || (kind !== "accessory" && !sets.length))
          return null;
        return (
          <section className="panel set-section" key={kind}>
            <div className="section-heading">
              <h2>
                <span className="section-icon">
                  <Dumbbell size={18} />
                </span>
                {
                  {
                    warmup: "Warm up",
                    working: "Main lifts",
                    bbb: "Boring But Big",
                    accessory: "Accessories",
                  }[kind]
                }
              </h2>
              <span className="muted-label">
                {kind === "working" && w.week !== 4
                  ? "LAST SET: AMRAP"
                  : kind === "bbb"
                    ? "5 × 10"
                    : ""}
              </span>
              {kind === "warmup" &&
                !readonly &&
                !editingHistory &&
                sets.some((set) => !set.done) && (
                  <button
                    className="text-button skip-warmups"
                    onClick={() => update(skipWorkoutWarmups(w))}
                  >
                    Skip warmups
                  </button>
                )}
            </div>
            {kind === "bbb" && (
              <p className="bbb-detail">
                {names[w.bbbLift]} ·{" "}
                {w.sets.find((s) => s.kind === "bbb")!.percent}% of {w.bbbTm}{" "}
                {w.units} TM
              </p>
            )}
            <div className="set-table-labels">
              <span>SET / LOAD</span>
              <span>{w.units.toUpperCase()}</span>
              <span>REPS</span>
              <span>DONE</span>
            </div>
            {groups.map((group) => (
              <Fragment key={group.key}>
                {kind === "accessory" && (
                  <div className="accessory-workout-heading">
                    <div>
                      <h3>{group.template.name}</h3>
                      <small>
                        {group.template.category
                          ? `${categoryNames[group.template.category]} · `
                          : ""}
                        {group.sets.length}{" "}
                        {group.sets.length === 1 ? "set" : "sets"}
                      </small>
                    </div>
                    {!readonly && !editingHistory && (
                      <div className="accessory-set-controls">
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Remove set from ${group.template.name}`}
                          title="Remove last unfinished set"
                          disabled={!group.sets.some((set) => !set.done)}
                          onClick={() =>
                            update(changeAccessorySetCount(w, group.key, -1))
                          }
                        >
                          <Minus size={19} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Add set to ${group.template.name}`}
                          title="Add set"
                          disabled={
                            group.sets.length >= 20 || w.sets.length >= 2500
                          }
                          onClick={() =>
                            update(changeAccessorySetCount(w, group.key, 1))
                          }
                        >
                          <Plus size={19} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {group.sets.map((set, localIndex) => {
                  const i = sets.indexOf(set);
                  const load =
                    kind === "accessory"
                      ? null
                      : plateLoad(set.weight, w.bar, w.plates);
                  const plates = load?.plates.reduce<
                    { weight: number; count: number }[]
                  >((items, weight) => {
                    const item = items.find((plate) => plate.weight === weight);
                    if (item) item.count++;
                    else items.push({ weight, count: 1 });
                    return items;
                  }, []);
                  return (
                    <div
                      className={`set-row ${set.done ? "completed" : ""}`}
                      key={set.id}
                    >
                      <div className="set-description">
                        <strong>
                          {`Set ${localIndex + 1}`}{" "}
                          <span>
                            {set.percent
                              ? `${set.percent}% · ${set.target}${set.plus ? "+" : ""} reps`
                              : `${set.target} reps`}
                          </span>
                        </strong>
                        {set.category && kind !== "accessory" && (
                          <small>{categoryNames[set.category]}</small>
                        )}
                        {load && (
                          <small>
                            {load.exact ? (
                              load.plates.length ? (
                                <>
                                  <span>Per side: </span>
                                  <b>
                                    {plates!
                                      .map(
                                        (plate) =>
                                          `${plate.count > 1 ? `${plate.count} × ` : ""}${plate.weight}`,
                                      )
                                      .join(" + ")}{" "}
                                    {w.units}
                                  </b>
                                </>
                              ) : (
                                `Empty bar · ${w.bar} ${w.units}`
                              )
                            ) : (
                              `Unavailable · nearest lower load ${load.actual} ${w.units}${set.weight < w.bar ? " (bar exceeds target)" : ""}`
                            )}
                          </small>
                        )}
                      </div>
                      <NumericInput
                        aria-label={`${kind} set ${i + 1} weight`}
                        type="number"
                        min="0"
                        max="10000"
                        step="any"
                        disabled={readonly}
                        value={set.weight}
                        onChange={(e) =>
                          change(set.id, {
                            weight: Math.min(
                              10000,
                              Math.max(0, Number(e.target.value)),
                            ),
                          })
                        }
                      />
                      <NumericInput
                        aria-label={`${kind} set ${i + 1} reps`}
                        type="number"
                        min="0"
                        max="1000"
                        disabled={readonly}
                        value={set.reps}
                        onChange={(e) =>
                          change(set.id, {
                            reps: Math.min(
                              1000,
                              Math.max(0, Math.trunc(Number(e.target.value))),
                            ),
                          })
                        }
                      />
                      <label className="check-label">
                        <input
                          aria-label={`Complete ${kind} set ${i + 1}`}
                          type="checkbox"
                          checked={set.done}
                          disabled={readonly}
                          onChange={(e) => {
                            change(set.id, { done: e.target.checked });
                            if (e.target.checked) onCompleteSet(kind, set.id);
                          }}
                        />
                        <span>
                          <Check size={18} />
                        </span>
                      </label>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </section>
        );
      })}
      <section className="panel">
        <label className="stack-field">
          Session notes
          <textarea
            disabled={readonly}
            placeholder="How did it feel? Any PRs?"
            value={w.notes}
            maxLength={10000}
            onChange={(e) => update({ ...w, notes: e.target.value })}
          />
        </label>
      </section>
      {!readonly && (
        <button
          className="primary full finish-button"
          disabled={!editingHistory && !canFinishWorkout(w)}
          onClick={finish}
        >
          {editingHistory
            ? "Save changes"
            : past
              ? "Save past workout"
              : "Finish workout"}{" "}
          <ChevronRight size={18} />
        </button>
      )}
      {discard && (
        <button className="text-button danger full" onClick={discard}>
          Discard workout
        </button>
      )}
      {(readonly || editingHistory) && (
        <p className="subtle centered">
          {new Date(w.completedAt!).toLocaleString()}
        </p>
      )}
    </>
  );
}
