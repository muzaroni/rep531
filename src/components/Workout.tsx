import { DatePicker } from "./ui/shadcn/date-picker";
import { addWorkoutAccessory } from "../domain/addWorkoutAccessory";
import { accessoryGroupKey } from "../domain/accessorySets";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "./ui/shadcn/dialog";
import { Button } from "./ui/shadcn/button";
import { Input } from "./ui/shadcn/input";
import {
  changeAccessorySetCount,
  workoutAccessoryGroups,
} from "../domain/accessorySets";
import { Fragment, useEffect, useRef, useState } from "react";
import { WorkoutElapsed } from "./WorkoutElapsed";
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
  GripVertical,
} from "lucide-react";
import {
  type Workout as WorkoutType,
  type WorkoutSet,
  names,
  categoryNames,
  type Settings,
  categories,
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
  accessorySettings?: Settings;
  updateAccessorySelection?: (workout: WorkoutType, id: string, selected: boolean) => void;
  reorderAccessories?: (ids: string[]) => void;
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
  accessorySettings,
  updateAccessorySelection,
  reorderAccessories,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragAccessory, setDragAccessory] = useState<string | null>(null);
  const moveAccessory = (id: string, target: string) => {
    if (!accessorySettings || !reorderAccessories || id === target) return;
    const ids = [...accessorySettings.accessoryAssignments[w.lift]];
    const from = ids.indexOf(id), to = ids.indexOf(target);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1); ids.splice(to, 0, id);
    reorderAccessories(ids);
  };
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [dateError, setDateError] = useState("");
  const initializedTimer = useRef<string | null>(null);
  useEffect(() => {
    if (
      !readonly &&
      !past &&
      !editingHistory &&
      !w.startedAt &&
      initializedTimer.current !== w.id
    ) {
      initializedTimer.current = w.id;
      update({ ...w, startedAt: new Date().toISOString() });
    }
  }, [w, update, readonly, past, editingHistory]);
  const change = (id: string, patch: Partial<WorkoutSet>) =>
    update({
      ...w,
      sets: w.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  const completed = w.sets.filter((s) => s.done).length;
  return (
    <>
      {readonly || past || editingHistory ? (
        <div className="workout-top-row">
          <button className="text-button" onClick={back}>
            <ArrowLeft size={17} /> Back to history
          </button>
          {!past && <WorkoutElapsed workout={w} />}
        </div>
      ) : (
        <WorkoutElapsed workout={w} floating />
      )}
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
      </div>
      <label className="workout-date">
        Workout date
        <DatePicker
          value={calendarDate(w.date)}
          max={calendarDate(new Date())}
          disabled={readonly && !changeDate}
          onChange={(date) => {
            try {
              if (readonly && changeDate) changeDate(date);
              else update(workoutWithDate(w, date));
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
            ? workoutAccessoryGroups(w).filter(group => group.sets.length > 0)
            : [{ key: kind, template: sets[0], sets }];
        if ((kind === "accessory" ? !groups.length && (!accessorySettings || readonly) : !sets.length))
          return null;
        return (
          <section className={`panel set-section${kind === "accessory" ? " accessory-set-section" : ""}`} key={kind}>
            <header className="workout-section-header">
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
              {kind === "accessory" && accessorySettings && !readonly && (
                <button className="icon-button workout-add-accessory" aria-label="Add accessory" onClick={() => setPickerOpen(true)}>
                  <Plus size={19} aria-hidden="true" />
                </button>
              )}
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
            {kind === "accessory" && accessorySettings && !readonly && (
              <p className="bbb-detail">Tap + to add an exercise</p>
            )}
            {kind === "bbb" && (
              <p className="bbb-detail">
                {names[w.bbbLift]} ·{" "}
                {w.sets.find((s) => s.kind === "bbb")!.percent}% of {w.bbbTm}{" "}
                {w.units} TM
              </p>
            )}
            </header>
            <div className="set-table-labels">
              <span>SET / LOAD</span>
              <span>{w.units.toUpperCase()}</span>
              <span>REPS</span>
              <span>DONE</span>
            </div>
            {groups.map((group) => (
              <Fragment key={group.key}>
                {kind === "accessory" && (
                  <div className="accessory-workout-heading" data-accessory-id={group.template.accessoryId}
                    onDragOver={event => event.preventDefault()}
                    onDrop={() => { if (dragAccessory && group.template.accessoryId) moveAccessory(dragAccessory, group.template.accessoryId); setDragAccessory(null); }}>
                    {reorderAccessories && !readonly && !editingHistory && group.template.accessoryId && accessorySettings?.accessoryAssignments[w.lift].includes(group.template.accessoryId) && (
                      <button className="icon-button drag-handle" aria-label={`Arrange ${group.template.name}`} draggable
                        onDragStart={() => setDragAccessory(group.template.accessoryId!)} onDragEnd={() => setDragAccessory(null)}
                        onKeyDown={event => {
                          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                          event.preventDefault();
                          const ids = accessorySettings.accessoryAssignments[w.lift];
                          const target = ids[ids.indexOf(group.template.accessoryId!) + (event.key === "ArrowUp" ? -1 : 1)];
                          if (target) moveAccessory(group.template.accessoryId!, target);
                        }}
                        onPointerDown={event => { if (event.pointerType === "touch") { setDragAccessory(group.template.accessoryId!); event.currentTarget.setPointerCapture(event.pointerId); } }}
                        onPointerUp={event => {
                          if (event.pointerType === "touch" && dragAccessory) {
                            const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-accessory-id]")?.dataset.accessoryId;
                            if (target) moveAccessory(dragAccessory, target);
                            setDragAccessory(null);
                          }
                        }}><GripVertical size={16} aria-hidden="true" /></button>
                    )}
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
                    {!readonly && (
                      <div className="accessory-set-controls">
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Remove set from ${group.template.name}`}
                          title={editingHistory ? "Remove last set" : "Remove last unfinished set"}
                          disabled={!editingHistory && !group.sets.some((set) => !set.done)}
                          onClick={() => {
                            const next = changeAccessorySetCount(w, group.key, -1, editingHistory);
                            const id = group.template.accessoryId ?? accessorySettings?.accessories.find(exercise => exercise.name === group.template.name && exercise.category === group.template.category)?.id;
                            if (id && updateAccessorySelection && !next.sets.some(set => set.kind === "accessory" && accessoryGroupKey(set) === group.key)) updateAccessorySelection(next, id, false);
                            else update(next);
                          }}
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
                            update(changeAccessorySetCount(w, group.key, 1, editingHistory))
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
      <section className="workout-notes">
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
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="workout-accessory-picker">
          <div className="section-heading">
            <DialogTitle>Add accessories</DialogTitle>
            <DialogClose asChild><Button variant="text" size="sm">Done</Button></DialogClose>
          </div>
          <DialogDescription>{updateAccessorySelection ? `Accessories for ${names[w.lift]} workouts` : "This workout only"}</DialogDescription>
          <Input aria-label="Search accessories" placeholder="Search exercises" value={search} onChange={event => setSearch(event.target.value)} />
          <div className="workout-accessory-filters">
            {["all", ...categories].map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value === "all" ? "All" : categoryNames[value as keyof typeof categoryNames]}</button>)}
          </div>
          <div className="workout-accessory-results">
            {accessorySettings?.accessories.filter(exercise => (category === "all" || exercise.category === category) && exercise.name.toLowerCase().includes(search.toLowerCase())).map(exercise => {
              const matchesExercise = (set: WorkoutSet) => set.kind === "accessory" && (set.accessoryId === exercise.id || (!set.accessoryId && set.name === exercise.name && set.category === exercise.category));
              const present = w.sets.some(matchesExercise);
              const selected = updateAccessorySelection ? accessorySettings.accessoryAssignments[w.lift].includes(exercise.id) : present;
              return <button key={exercise.id} className="workout-accessory-choice" disabled={updateAccessorySelection ? !selected && w.sets.length + exercise.sets > 2500 : (!editingHistory && present) || (!present && w.sets.length + exercise.sets > 2500)} aria-label={`${selected ? (updateAccessorySelection || editingHistory ? "Remove" : "Added") : "Add"} ${exercise.name}`} onClick={() => {
                if (updateAccessorySelection) {
                  const next = selected ? { ...w, sets: w.sets.filter(set => !matchesExercise(set) || set.done), accessorySetOverrides: Object.fromEntries(Object.entries(w.accessorySetOverrides ?? {}).filter(([key]) => key !== `id:${exercise.id}`)) } : addWorkoutAccessory(w, accessorySettings, exercise.id);
                  updateAccessorySelection(next, exercise.id, !selected);
                } else if (editingHistory && present) update({ ...w, sets: w.sets.filter(set => !matchesExercise(set)), accessorySetOverrides: Object.fromEntries(Object.entries(w.accessorySetOverrides ?? {}).filter(([, override]) => !matchesExercise(override.template))) }); else update(addWorkoutAccessory(w, accessorySettings, exercise.id, editingHistory));
              }}>
                <span>{exercise.name}</span>
                {selected ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
              </button>;
            })}
            {accessorySettings && !accessorySettings.accessories.some(exercise => (category === "all" || exercise.category === category) && exercise.name.toLowerCase().includes(search.toLowerCase())) && <p className="subtle">No matching exercises</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
