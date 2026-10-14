import { useState } from "react";
import { Plus, Search, X, GripVertical, Trash2 } from "lucide-react";
import { NumericInput } from "./NumericInput";
import { Input, NativeSelect } from "./ui/shadcn/input";
import { Button } from "./ui/shadcn/button";
import { categories, categoryNames, names, accessorySchema, type Lift, type Settings, type AccessoryCategory } from "../domain/model";
type Accessory = Settings["accessories"][number];
type Props = { settings: Settings; update: (patch: Partial<Settings>) => void; standalone?: boolean };
export function AccessoryEditor({ settings, update, standalone = false }: Props) {
  const [day, setDay] = useState<Lift>(settings.order[0]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AccessoryCategory | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const selected = settings.accessoryAssignments[day];
  const toggle = (id: string) => {
    const removing = selected.includes(id);
    update({ accessoryAssignments: { ...settings.accessoryAssignments, [day]: removing ? selected.filter(item => item !== id) : [...selected, id] } });
    setEditing(removing ? null : id);
    setCreating(false);
  };
  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= selected.length || from === to) return;
    const ids = [...selected], [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    update({ accessoryAssignments: { ...settings.accessoryAssignments, [day]: ids } });
  };
  const saveExercise = (exercise: Accessory) => update({ accessories: settings.accessories.map(item => item.id === exercise.id ? exercise : item) });
  const removeExercise = (id: string) => {
    update({ accessories: settings.accessories.filter(item => item.id !== id), accessoryAssignments: Object.fromEntries(Object.entries(settings.accessoryAssignments).map(([lift, ids]) => [lift, ids.filter(item => item !== id)])) as Settings["accessoryAssignments"] });
    setEditing(null);
  };
  const edit = (id: string) => { setEditing(editing === id ? null : id); setCreating(false); };
  const results = settings.accessories.filter(exercise => !selected.includes(exercise.id) && (category === "all" || exercise.category === category) && exercise.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const editor = (exercise: Accessory) => editing === exercise.id && <InlineExerciseEditor key={exercise.id} exercise={exercise} units={settings.units} save={saveExercise} close={() => setEditing(null)} remove={() => removeExercise(exercise.id)} />;
  return (
    <section className="accessory-manager accessory-inline-manager" aria-label="Accessory planner">
      <div className="section-heading accessory-inline-title">
        {standalone ? <h1>Accessories<span>.</span></h1> : <h2>Accessories</h2>}
        <Button variant="icon" aria-label="New exercise" disabled={settings.accessories.length >= 100} onClick={() => { setCreating(!creating); setEditing(null); }}><Plus size={18} aria-hidden="true" /></Button>
      </div>
      {creating && <InlineExerciseEditor key="new" exercise={{ id: crypto.randomUUID(), name: "", category: "push", sets: 5, reps: 10, weight: 0 }} units={settings.units} isNew close={() => setCreating(false)} save={exercise => {
        update({ accessories: [...settings.accessories, exercise], accessoryAssignments: { ...settings.accessoryAssignments, [day]: [...selected, exercise.id] } });
        setCreating(false); setEditing(exercise.id);
      }} />}
      <div className="day-tabs" role="tablist" aria-label="Accessory training day">
        {settings.order.map(lift => <button type="button" role="tab" key={lift} id={`accessory-tab-${lift}`} aria-label={names[lift]} aria-selected={day === lift} aria-controls="accessory-day-panel" onClick={() => { setDay(lift); setEditing(null); }}>
          {lift === "bench" ? "Bench" : lift === "press" ? "Press" : names[lift]}
        </button>)}
      </div>
      <div role="tabpanel" id="accessory-day-panel" aria-labelledby={`accessory-tab-${day}`}>
        <div className="accessory-selection-heading"><strong>{selected.length} {selected.length === 1 ? "exercise" : "exercises"}</strong></div>
        {!selected.length && <p className="subtle accessory-empty">Add exercises below.</p>}
        <div className="selected-accessories">
          {selected.map((id, index) => {
            const exercise = settings.accessories.find(item => item.id === id);
            if (!exercise) return null;
            return <div className="selected-accessory" key={id} data-accessory-index={index} data-open={editing === id} onDragOver={event => event.preventDefault()} onDrop={() => { if (drag !== null) reorder(drag, index); setDrag(null); }}>
              <button type="button" className="icon-button drag-handle" aria-label={`Arrange ${exercise.name}`} draggable onDragStart={() => setDrag(index)} onDragEnd={() => setDrag(null)} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); reorder(index, index + (event.key === "ArrowUp" ? -1 : 1)); } }} onPointerDown={event => { if (event.pointerType === "touch") { setDrag(index); if (event.nativeEvent.isTrusted) event.currentTarget.setPointerCapture(event.pointerId); } }} onPointerUp={event => {
                if (drag !== null && event.pointerType === "touch") { const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-accessory-index]"); if (target) reorder(drag, Number(target.dataset.accessoryIndex)); setDrag(null); }
              }} onPointerCancel={() => setDrag(null)}><GripVertical size={16} aria-hidden="true" /></button>
              <button type="button" className="accessory-edit" aria-label={`Edit ${exercise.name}`} aria-expanded={editing === id} onClick={() => edit(id)}><strong>{exercise.name}</strong><small>{exercise.sets} × {exercise.reps}{exercise.weight ? ` · ${exercise.weight} ${settings.units}` : ""}</small></button>
              <button type="button" className="icon-button" aria-label={`Unselect ${exercise.name} for ${names[day]}`} onClick={() => toggle(id)}><X size={16} aria-hidden="true" /></button>
              {editor(exercise)}
            </div>;
          })}
        </div>
        <section className="accessory-library" aria-label="Exercise library">
          <h3 className="accessory-library-heading">Add an exercise</h3>
          <label className="library-search"><Search size={16} aria-hidden="true" /><Input type="search" aria-label="Search accessories" placeholder="Search exercises" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <div className="accessory-category-tabs" aria-label="Filter accessory category">
            {(["all", ...categories] as const).map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{value === "all" ? "All" : categoryNames[value]}</button>)}
          </div>
          <div className="accessory-results" tabIndex={0} aria-label="Accessory library results">
            {results.map(exercise => <div className="library-row" key={exercise.id}>
              <button type="button" className="accessory-library-name" aria-label={`Edit library ${exercise.name}`} aria-expanded={editing === exercise.id} onClick={() => edit(exercise.id)}>{exercise.name}</button>
              <Button variant="icon" className="accessory-add-control" aria-label={`Add ${exercise.name}`} onClick={() => toggle(exercise.id)}><Plus size={16} aria-hidden="true" /></Button>
              {editor(exercise)}
            </div>)}
            {!results.length && <p className="subtle accessory-empty">No matches. Try another search or add a new exercise.</p>}
          </div>
        </section>
      </div>
    </section>
  );
}
function InlineExerciseEditor({ exercise, units, isNew = false, save, close, remove }: {
  exercise: Accessory; units: Settings["units"]; isNew?: boolean; save: (exercise: Accessory) => void; close: () => void; remove?: () => void;
}) {
  const [draft, setDraft] = useState(exercise);
  const [error, setError] = useState("");
  const numbers = (field: "sets" | "reps" | "weight", value: number) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (!isNew) { const parsed = accessorySchema.safeParse(next); if (parsed.success) save(parsed.data); }
  };
  const finish = () => {
    const parsed = accessorySchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    save(parsed.data); if (!isNew) close();
  };
  return <div className={`accessory-inline-fields${isNew ? " accessory-inline-new" : ""}`} role="group" aria-label={isNew ? "New exercise" : `Edit ${exercise.name}`}>
    {isNew && <label className="stack-field">Exercise name<Input autoFocus aria-label="Accessory name" maxLength={80} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>}
    <div className="accessory-inline-numbers">
      {(["sets", "reps", "weight"] as const).map(field => <label key={field}><span>{field === "weight" ? units : field === "sets" ? "Sets" : "Reps"}</span><NumericInput aria-label={`${draft.name || "New exercise"} ${field}`} value={draft[field]} min={field === "weight" ? 0 : 1} max={field === "sets" ? 20 : field === "reps" ? 100 : 10000} step={field === "weight" ? "any" : 1} onChange={event => numbers(field, Number(event.target.value))} /></label>)}
    </div>
    <details className="accessory-inline-details" open={isNew || undefined}>
      <summary>Exercise details</summary>
      {!isNew && <label className="stack-field">Exercise name<Input aria-label="Accessory name" maxLength={80} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>}
      <label className="stack-field">Category<NativeSelect aria-label={`${draft.name || "New exercise"} category`} value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as AccessoryCategory })}>{categories.map(value => <option key={value} value={value}>{categoryNames[value]}</option>)}</NativeSelect></label>
      {!isNew && <p className="subtle">Exercise defaults apply across assigned lifting days.</p>}
      {remove && <Button variant="text" className="danger" onClick={remove}><Trash2 size={16} aria-hidden="true" />Delete from all days</Button>}
    </details>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="accessory-inline-actions">{isNew && <Button variant="text" onClick={close}>Cancel</Button>}<Button variant="text" onClick={finish}>Done</Button></div>
  </div>;
}
