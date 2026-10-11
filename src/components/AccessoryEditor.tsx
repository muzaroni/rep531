import { useEffect, useRef, useState } from "react";
import { Plus, Search, Pencil, X, GripVertical, Trash2 } from "lucide-react";
import { NumericInput } from "./NumericInput";
import {
  categories,
  categoryNames,
  names,
  accessorySchema,
  type Lift,
  type Settings,
  type AccessoryCategory,
} from "../domain/model";
type Accessory = Settings["accessories"][number];
type Props = { settings: Settings; update: (patch: Partial<Settings>) => void };
export function AccessoryEditor({ settings, update }: Props) {
  const [day, setDay] = useState<Lift>(settings.order[0]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AccessoryCategory | "all">("all");
  const [editing, setEditing] = useState<Accessory | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const selected = settings.accessoryAssignments[day];
  const toggle = (id: string) =>
    update({
      accessoryAssignments: {
        ...settings.accessoryAssignments,
        [day]: selected.includes(id)
          ? selected.filter((item) => item !== id)
          : [...selected, id],
      },
    });
  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to >= selected.length) return;
    const ids = [...selected],
      [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    update({
      accessoryAssignments: { ...settings.accessoryAssignments, [day]: ids },
    });
  };
  const results = settings.accessories.filter(
    (a) =>
      (category === "all" || category === a.category) &&
      a.name.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()),
  );
  return (
    <section className="panel wide accessory-manager">
      <div className="section-heading">
        <h2>Accessories</h2>
        <button
          className="text-button"
          onClick={() =>
            setEditing({
              id: crypto.randomUUID(),
              name: "New exercise",
              category: "push",
              sets: 5,
              reps: 10,
              weight: 0,
            })
          }
        >
          <Plus size={18} /> New exercise
        </button>
      </div>
      <div
        className="day-tabs"
        role="tablist"
        aria-label="Accessory training day"
      >
        {settings.order.map((lift) => (
          <button
            type="button"
            role="tab"
            key={lift}
            id={`accessory-tab-${lift}`}
            aria-selected={day === lift}
            aria-controls="accessory-day-panel"
            onClick={() => setDay(lift)}
          >
            {names[lift]}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="accessory-day-panel"
        aria-labelledby={`accessory-tab-${day}`}
      >
        <div className="accessory-selection-heading">
          <strong>{selected.length} selected</strong>
          <span className="subtle">Drag to arrange</span>
        </div>
        {!selected.length && (
          <p className="subtle accessory-empty">
            Choose a push, a pull, and legs or abs below.
          </p>
        )}
        <div className="selected-accessories">
          {selected.map((id, i) => {
            const a = settings.accessories.find((item) => item.id === id);
            if (!a) return null;
            return (
              <div
                className="selected-accessory"
                key={id}
                data-accessory-index={i}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (drag !== null) reorder(drag, i);
                  setDrag(null);
                }}
              >
                <button
                  type="button"
                  className="icon-button drag-handle"
                  aria-label={`Arrange ${a.name}`}
                  draggable
                  onDragStart={() => setDrag(i)}
                  onDragEnd={() => setDrag(null)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                      event.preventDefault();
                      reorder(i, i + (event.key === "ArrowUp" ? -1 : 1));
                    }
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === "touch") {
                      setDrag(i);
                      if (event.nativeEvent.isTrusted)
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }
                  }}
                  onPointerUp={(event) => {
                    if (drag !== null && event.pointerType === "touch") {
                      const target = document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest<HTMLElement>("[data-accessory-index]");
                      if (target)
                        reorder(drag, Number(target.dataset.accessoryIndex));
                      setDrag(null);
                    }
                  }}
                  onPointerCancel={() => setDrag(null)}
                >
                  <GripVertical size={18} />
                </button>
                <button
                  type="button"
                  className="accessory-edit"
                  aria-label={`Edit ${a.name}`}
                  onClick={() => setEditing(a)}
                >
                  <strong>{a.name}</strong>
                  <small>
                    {categoryNames[a.category]} · {a.sets} × {a.reps}
                    {a.weight ? ` · ${a.weight} ${settings.units}` : ""}
                  </small>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Unselect ${a.name} for ${names[day]}`}
                  onClick={() => toggle(a.id)}
                >
                  <X size={18} />
                </button>
              </div>
            );
          })}
        </div>
        <details className="accessory-library">
          <summary>
            Choose exercises{" "}
            <span>{settings.accessories.length} in library</span>
          </summary>
          <div className="library-toolbar">
            <label className="library-search">
              <Search size={18} />
              <input
                type="search"
                aria-label="Search accessories"
                placeholder="Find an exercise…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter accessory category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as typeof category)
              }
            >
              <option value="all">All groups</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {categoryNames[value]}
                </option>
              ))}
            </select>
          </div>
          <div
            className="accessory-results"
            tabIndex={0}
            aria-label="Accessory library results"
          >
            {results.map((a) => (
              <div className="library-row" key={a.id}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`${names[day]} accessory ${a.name}`}
                    checked={selected.includes(a.id)}
                    onChange={() => toggle(a.id)}
                  />
                  <span>
                    <strong>{a.name}</strong>
                    <small>
                      {categoryNames[a.category]} · {a.sets} × {a.reps}
                    </small>
                  </span>
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Edit library ${a.name}`}
                  onClick={() => setEditing(a)}
                >
                  <Pencil size={18} />
                </button>
              </div>
            ))}
            {!results.length && (
              <p className="subtle accessory-empty">
                No matches. Try another search or add a new exercise.
              </p>
            )}
          </div>
        </details>
      </div>
      {editing && (
        <AccessoryForm
          key={editing.id}
          exercise={editing}
          units={settings.units}
          isNew={!settings.accessories.some((a) => a.id === editing.id)}
          close={() => setEditing(null)}
          save={(exercise) => {
            update({
              accessories: settings.accessories.some(
                (a) => a.id === exercise.id,
              )
                ? settings.accessories.map((a) =>
                    a.id === exercise.id ? exercise : a,
                  )
                : [...settings.accessories, exercise],
            });
            setEditing(null);
          }}
          remove={() => {
            update({
              accessories: settings.accessories.filter(
                (a) => a.id !== editing.id,
              ),
              accessoryAssignments: Object.fromEntries(
                Object.entries(settings.accessoryAssignments).map(
                  ([lift, ids]) => [
                    lift,
                    ids.filter((id) => id !== editing.id),
                  ],
                ),
              ) as Settings["accessoryAssignments"],
            });
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
function AccessoryForm({
  exercise,
  units,
  isNew,
  save,
  close,
  remove,
}: {
  exercise: Accessory;
  units: Settings["units"];
  isNew: boolean;
  save: (a: Accessory) => void;
  close: () => void;
  remove: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(exercise);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="accessory-dialog"
      aria-labelledby="accessory-editor-title"
      onClose={close}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const result = accessorySchema.safeParse(draft);
          if (result.success) save(result.data);
          else setError(result.error.issues[0].message);
        }}
      >
        <div className="section-heading">
          <h2 id="accessory-editor-title">
            {isNew ? "New exercise" : "Edit exercise"}
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close exercise editor"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <label className="stack-field">
          Exercise name
          <input
            aria-label="Accessory name"
            value={draft.name}
            maxLength={80}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
          />
        </label>
        <label className="stack-field">
          Group
          <select
            aria-label={`${draft.name} category`}
            value={draft.category}
            onChange={(event) =>
              setDraft({
                ...draft,
                category: event.target.value as AccessoryCategory,
              })
            }
          >
            {categories.map((value) => (
              <option key={value} value={value}>
                {categoryNames[value]}
              </option>
            ))}
          </select>
        </label>
        <div className="accessory-form-numbers">
          {(["sets", "reps", "weight"] as const).map((field) => (
            <label className="stack-field" key={field}>
              {field === "weight" ? units : field}
              <NumericInput
                aria-label={`${draft.name} ${field}`}
                value={draft[field]}
                min={field === "weight" ? 0 : 1}
                max={field === "sets" ? 20 : field === "reps" ? 100 : 10000}
                step={field === "weight" ? "any" : 1}
                onChange={(event) =>
                  setDraft({ ...draft, [field]: Number(event.target.value) })
                }
              />
            </label>
          ))}
        </div>
        <p className="subtle">
          Exercise details are shared across lifting days. Save Settings to
          apply your changes.
        </p>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <div className="accessory-form-actions">
          {!isNew && (
            <button
              type="button"
              className="text-button danger"
              onClick={remove}
            >
              <Trash2 size={18} /> Delete from all days
            </button>
          )}
          <button className="primary" type="submit">
            Done
          </button>
        </div>
      </form>
    </dialog>
  );
}
