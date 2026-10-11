import { deleteAllCycles, resetCycle } from "../domain/cycleData";
import { requestTimerNotifications } from "../lib/timerAlerts";
import { syncWorkoutAccessories } from "../domain/workoutAccessories";
import { useState, type ReactNode } from "react";
import { SettingsGroup, type SettingsSection } from "./SettingsGroup";
import { ArrowLeft, ChevronRight } from "lucide-react";
import {
  GripVertical,
  Volume2,
  Download,
  Upload,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  names,
  type AppState,
  type Settings as SettingsType,
  settingsSchema,
  lifts,
  equipmentSchema,
  type Variant,
} from "../domain/model";
import {
  trainingMax,
  changeUnits,
  cycleVariant,
  otherUnitMax,
  normalizeCycleProgress,
} from "../domain/calculations";
import { chimeNames, playChime } from "./Timer";
import { EquipmentEditor } from "./EquipmentEditor";
import { AccessoryEditor } from "./AccessoryEditor";
import { NumericInput } from "./NumericInput";
type Props = {
  state: AppState;
  commit: (s: AppState) => void;
  clearTimer: () => void;
  backup: () => void;
  markdown: () => void;
  importFile: (f: File) => void;
};
export function Settings({
  state,
  commit,
  backup,
  clearTimer,
  markdown,
  importFile,
}: Props) {
  const [draft, setDraft] = useState<SettingsType>(() =>
    structuredClone(state.settings),
  );
  const [message, setMessage] = useState("");
  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SettingsSection | null>(() => {
    try {
      const saved = localStorage.getItem("bbb-settings-section");
      if (saved === "") return null;
      return ["appearance", "maxes", "program", "equipment", "data"].includes(
        saved ?? "",
      )
        ? (saved as SettingsSection)
        : "appearance";
    } catch {
      return "appearance";
    }
  });
  const toggleSection = (section: SettingsSection) => {
    const next = openSection === section ? null : section;
    setOpenSection(next);
    try {
      localStorage.setItem("bbb-settings-section", next ?? "");
    } catch {
      /* UI preference only. */
    }
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings);
  const themeNames: Record<SettingsType["accent"], string> = {
    lime: "Acid Moss",
    blue: "Deep Cosmos",
    pink: "Deep Cosmos",
    orange: "Solar Flare",
    starry: "Starry Night",
    horizon: "Event Horizon",
  };
  const [drag, setDrag] = useState<number | null>(null);
  const update = (patch: Partial<SettingsType>) => {
    setDraft((s) => ({ ...s, ...patch }));
    setMessage("");
  };
  const reorder = (from: number, to: number) => {
    if (to < 0 || to > 3 || to === from) return;
    const order = [...draft.order],
      days = [...draft.days];
    const [lift] = order.splice(from, 1),
      [day] = days.splice(from, 1);
    order.splice(to, 0, lift);
    days.splice(to, 0, day);
    update({ order, days });
  };
  const save = () => {
    const parsed = settingsSchema.safeParse(draft);
    if (!parsed.success) {
      const field = String(parsed.error.issues[0].path[0]);
      const section: SettingsSection = [
        "maxes",
        "oneRepMaxes",
        "autoIncrease",
        "increases",
      ].includes(field)
        ? "maxes"
        : ["equipment", "rounding", "rest", "chime", "timerAlerts"].includes(
              field,
            )
          ? "equipment"
          : ["units", "accent", "keepScreenAwake"].includes(field)
            ? "appearance"
            : "program";
      setOpenSection(section);
      if (field === "percentages" || field === "warmup") setAdvancedOpen(true);
      setAccessoriesOpen(
        field === "accessories" || field === "accessoryAssignments",
      );
      setMessage(parsed.error.issues[0].message);
      return;
    }
    const next = normalizeCycleProgress({
      ...state,
      settings: parsed.data,
      active: state.active
        ? syncWorkoutAccessories(state.active, state.settings, parsed.data)
        : null,
    });
    commit(next);
    setDraft(structuredClone(next.settings));
    setMessage(
      state.active
        ? "Settings saved. Current workout accessories updated; completed sets kept."
        : "Settings saved. Changes apply to your next workout.",
    );
  };
  const group = (
    id: SettingsSection,
    title: string,
    summary: string,
    children: ReactNode,
  ) => (
    <SettingsGroup
      id={id}
      title={title}
      summary={summary}
      open={openSection === id}
      toggle={() => toggleSection(id)}
    >
      {children}
    </SettingsGroup>
  );
  return (
    <div className="settings-page">
      {accessoriesOpen && (
        <button
          className="text-button"
          onClick={() => {
            setAccessoriesOpen(false);
            window.scrollTo(0, 0);
          }}
        >
          <ArrowLeft size={17} /> Back to settings
        </button>
      )}
      <div className="page-title">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h1>
            {accessoriesOpen ? "Accessories" : "Settings"}
            <span>.</span>
          </h1>
        </div>
      </div>
      {accessoriesOpen ? (
        <AccessoryEditor settings={draft} update={update} />
      ) : (
        <div className="settings-sections">
          {group(
            "appearance",
            "Appearance & device",
            `${themeNames[draft.accent]} · ${draft.units} · Screen awake ${draft.keepScreenAwake ? "on" : "off"}`,
            <>
              <label className="field-row">
                Theme color
                <select
                  className="theme-select"
                  data-color={draft.accent === "pink" ? "blue" : draft.accent}
                  value={draft.accent === "pink" ? "blue" : draft.accent}
                  onChange={(e) =>
                    update({ accent: e.target.value as SettingsType["accent"] })
                  }
                >
                  <option value="lime" style={{ color: "#c4ff24" }}>
                    Acid Moss
                  </option>
                  <option value="blue" style={{ color: "#36b9ff" }}>
                    Deep Cosmos
                  </option>
                  <option value="orange" style={{ color: "#ff8c26" }}>
                    Solar Flare
                  </option>
                  <option value="starry" style={{ color: "#d8e8ff" }}>
                    Starry Night
                  </option>
                  <option value="horizon" style={{ color: "#cbd5e1" }}>
                    Event Horizon
                  </option>
                </select>
              </label>
              <label className="toggle-row">
                <span>
                  Keep screen awake
                  <small>
                    Prevent dimming while the app is open, where supported
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.keepScreenAwake}
                  onChange={(e) =>
                    update({ keepScreenAwake: e.target.checked })
                  }
                />
              </label>
              <label className="field-row">
                Weight units
                <select
                  value={draft.units}
                  onChange={(e) => {
                    const units = e.target.value as SettingsType["units"];
                    if (
                      !equipmentSchema.safeParse(draft.equipment[units]).success
                    ) {
                      setMessage(
                        `Fix your ${units} plates before changing units.`,
                      );
                      return;
                    }
                    setDraft(changeUnits(draft, units));
                    setMessage(
                      "Weights converted and rounded. Plate inventories are unchanged.",
                    );
                  }}
                >
                  <option value="lb">Pounds (lb)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </label>
            </>,
          )}
          {group(
            "maxes",
            "Training maxes",
            `${lifts.map((lift) => `${names[lift]} ${draft.maxes[lift]}`).join(" · ")} ${draft.units}`,
            <>
              <p className="subtle">
                1RM calculates a 90% TM. You can also edit TM directly.
              </p>
              <div className="max-table">
                <div className="table-labels">
                  <span>EXERCISE</span>
                  <span>1RM · {draft.units}</span>
                  <span>TM · {draft.units}</span>
                </div>
                {lifts.map((lift) => {
                  const otherUnit = draft.units === "lb" ? "kg" : "lb";
                  const converted = equipmentSchema.safeParse(
                    draft.equipment[otherUnit],
                  ).success
                    ? otherUnitMax(draft, draft.maxes[lift])
                    : null;
                  return (
                    <div className="max-row" key={lift}>
                      <strong>{names[lift]}</strong>
                      <NumericInput
                        aria-label={`${names[lift]} one rep max`}
                        min="1"
                        step="any"
                        placeholder="1RM"
                        value={draft.oneRepMaxes[lift]}
                        allowEmpty
                        onChange={(e) => {
                          const n =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          if (n === null || n > 0)
                            update({
                              oneRepMaxes: { ...draft.oneRepMaxes, [lift]: n },
                              ...(n === null
                                ? {}
                                : {
                                    maxes: {
                                      ...draft.maxes,
                                      [lift]: trainingMax(n),
                                    },
                                  }),
                            });
                        }}
                      />
                      <div className="max-cell">
                        <NumericInput
                          aria-label={`${names[lift]} training max`}
                          min="1"
                          step="any"
                          value={draft.maxes[lift]}
                          onChange={(e) =>
                            update({
                              maxes: {
                                ...draft.maxes,
                                [lift]: Number(e.target.value),
                              },
                            })
                          }
                        />
                        <span
                          className="max-conversion"
                          aria-label={`${names[lift]} converted training max`}
                        >
                          {converted
                            ? `≈ ${converted.weight} ${converted.units}`
                            : `Check ${otherUnit} plates`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <label className="toggle-row">
                <span>
                  Increase TMs after each cycle
                  <small>Optional automatic progression</small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.autoIncrease}
                  onChange={(e) => update({ autoIncrease: e.target.checked })}
                />
              </label>
              {draft.autoIncrease &&
                lifts.map((lift) => (
                  <label className="field-row" key={lift}>
                    {names[lift]} increase ({draft.units})
                    <NumericInput
                      min="0.01"
                      step="any"
                      value={draft.increases[lift]}
                      onChange={(e) =>
                        update({
                          increases: {
                            ...draft.increases,
                            [lift]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ))}
            </>,
          )}
          {group(
            "program",
            "Program & schedule",
            `${cycleVariant(draft, state.cycle) === "swap" ? "BBB Swap" : "Normal"} · ${draft.bbb ? `${draft.bbbPercent}% BBB` : "BBB off"} · ${draft.skipDeload ? "3" : "4"} weeks`,
            <>
              <button
                className="secondary full accessory-settings-link"
                onClick={() => {
                  setAccessoriesOpen(true);
                  window.scrollTo(0, 0);
                }}
              >
                <span>
                  Manage accessories
                  <small>
                    {draft.accessories.length} exercises · Choose for each
                    lifting day
                  </small>
                </span>
                <ChevronRight size={19} />
              </button>
              {[state.cycle, state.cycle + 1].map((cycle) => (
                <label className="field-row" key={cycle}>
                  Cycle {cycle}
                  {cycle === state.cycle ? " variation" : " (next)"}
                  <select
                    aria-label={`Cycle ${cycle} variation`}
                    value={cycleVariant(draft, cycle)}
                    onChange={(e) =>
                      update({
                        cycleVariants: {
                          ...draft.cycleVariants,
                          [String(cycle)]: e.target.value as Variant,
                        },
                      })
                    }
                  >
                    <option value="normal">Normal BBB</option>
                    <option value="swap">BBB Swap</option>
                  </select>
                </label>
              ))}
              <p className="subtle">
                BBB Swap pairs Squat ↔ Deadlift and Bench ↔ Overhead press,
                using each lift’s own TM.
              </p>
              <label className="toggle-row">
                <span>
                  Skip warmups
                  <small>Start new workouts with the main sets</small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.skipWarmups}
                  onChange={(e) => update({ skipWarmups: e.target.checked })}
                />
              </label>
              <label className="toggle-row">
                <span>
                  Skip deload week
                  <small>Three-week cycles · 12 lifting sessions</small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.skipDeload}
                  onChange={(e) => update({ skipDeload: e.target.checked })}
                />
              </label>
              <label className="toggle-row">
                <span>
                  Boring But Big
                  <small>Five sets of ten after the main lift</small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.bbb}
                  onChange={(e) => update({ bbb: e.target.checked })}
                />
              </label>
              <label className="field-row">
                BBB percentage
                <NumericInput
                  min="1"
                  max="150"
                  step="any"
                  value={draft.bbbPercent}
                  onChange={(e) =>
                    update({ bbbPercent: Number(e.target.value) })
                  }
                />
              </label>
              <h3 className="settings-subheading">Exercise order</h3>

              <p className="subtle">
                Drag the handle to reorder. Keyboard: Up / Down.
              </p>
              {draft.order.map((lift, i) => (
                <div
                  className="order-row"
                  key={lift}
                  data-order-index={i}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (drag !== null) reorder(drag, i);
                    setDrag(null);
                  }}
                >
                  <button
                    className="icon-button drag-handle"
                    aria-label={`Drag ${names[lift]} to reorder`}
                    draggable
                    onDragStart={() => setDrag(i)}
                    onDragEnd={() => setDrag(null)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        reorder(i, i + (e.key === "ArrowUp" ? -1 : 1));
                      }
                    }}
                    onPointerDown={(e) => {
                      if (e.pointerType === "touch") {
                        setDrag(i);
                        if (e.nativeEvent.isTrusted)
                          e.currentTarget.setPointerCapture(e.pointerId);
                      }
                    }}
                    onPointerUp={(e) => {
                      if (drag !== null && e.pointerType === "touch") {
                        const target = document
                          .elementFromPoint(e.clientX, e.clientY)
                          ?.closest<HTMLElement>("[data-order-index]");
                        if (target)
                          reorder(drag, Number(target.dataset.orderIndex));
                        setDrag(null);
                      }
                    }}
                  >
                    <GripVertical size={20} />
                  </button>
                  <strong>{names[lift]}</strong>
                  <select
                    aria-label={`${names[lift]} training day`}
                    value={draft.days[i]}
                    onChange={(e) => {
                      const days = [...draft.days];
                      days[i] = Number(e.target.value);
                      update({ days });
                    }}
                  >
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, j) => (
                        <option key={day} value={j}>
                          {day}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              ))}
              <details
                className="settings-advanced"
                open={advancedOpen}
                onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
              >
                <summary>Set percentages</summary>

                {draft.percentages.map((week, i) => (
                  <div className="percentage-row" key={i}>
                    <span>{i === 3 ? "Deload" : `Week ${i + 1}`}</span>
                    {week.map((value, j) => (
                      <label key={j}>
                        <span className="sr-only">
                          Week {i + 1} set {j + 1} percentage
                        </span>
                        <NumericInput
                          min="1"
                          max="150"
                          step="any"
                          value={value}
                          onChange={(e) => {
                            const percentages = structuredClone(
                              draft.percentages,
                            );
                            percentages[i][j] = Number(e.target.value);
                            update({ percentages });
                          }}
                        />
                        <span aria-hidden="true">%</span>
                      </label>
                    ))}
                  </div>
                ))}
                <div className="percentage-row">
                  <span>Warmup</span>
                  {draft.warmup.map((value, i) => (
                    <label key={i}>
                      <span className="sr-only">
                        Warmup set {i + 1} percentage
                      </span>
                      <NumericInput
                        min="1"
                        max="150"
                        step="any"
                        value={value}
                        onChange={(e) => {
                          const warmup = [
                            ...draft.warmup,
                          ] as SettingsType["warmup"];
                          warmup[i] = Number(e.target.value);
                          update({ warmup });
                        }}
                      />
                      <span aria-hidden="true">%</span>
                    </label>
                  ))}
                </div>
                <p className="subtle">Deload skips warmup and BBB.</p>
              </details>
            </>,
          )}
          {group(
            "equipment",
            "Equipment & rest",
            `${draft.rounding} ${draft.units} rounding · ${draft.rest.working}s main rest`,
            <>
              <EquipmentEditor settings={draft} update={update} />
              <label className="field-row">
                Rounding increment
                <NumericInput
                  min="0.01"
                  step="any"
                  value={draft.rounding}
                  onChange={(e) => update({ rounding: Number(e.target.value) })}
                />
              </label>
              <p className="subtle">
                Barbell loads and other-unit TMs use balanced pairs from your
                available plates.
              </p>
              <h3 className="settings-subheading">Rest timer</h3>

              {(["warmup", "working", "bbb"] as const).map((kind) => (
                <label className="field-row" key={kind}>
                  {kind === "warmup"
                    ? "Warmup"
                    : kind === "working"
                      ? "Working sets"
                      : "BBB"}{" "}
                  (seconds)
                  <NumericInput
                    min="0"
                    max="3600"
                    step="1"
                    value={draft.rest[kind]}
                    onChange={(e) =>
                      update({
                        rest: { ...draft.rest, [kind]: Number(e.target.value) },
                      })
                    }
                  />
                </label>
              ))}
              <label className="toggle-row">
                <span>
                  Timer sound
                  <small>Play the selected chime at completion</small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.timerAlerts.sound}
                  onChange={(event) =>
                    update({
                      timerAlerts: {
                        ...draft.timerAlerts,
                        sound: event.target.checked,
                      },
                    })
                  }
                />
              </label>
              <label className="toggle-row">
                <span>
                  Timer vibration<small>Where supported by your device</small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.timerAlerts.vibration}
                  onChange={(event) =>
                    update({
                      timerAlerts: {
                        ...draft.timerAlerts,
                        vibration: event.target.checked,
                      },
                    })
                  }
                />
              </label>
              <label className="toggle-row">
                <span>
                  Timer notifications
                  <small>Requires permission · iPhone: Home Screen app</small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.timerAlerts.notifications}
                  onChange={async (event) => {
                    if (!event.target.checked) {
                      update({
                        timerAlerts: {
                          ...draft.timerAlerts,
                          notifications: false,
                        },
                      });
                      return;
                    }
                    const result = await requestTimerNotifications();
                    if (
                      "Notification" in window &&
                      Notification.permission === "granted"
                    )
                      setDraft((previous) => ({
                        ...previous,
                        timerAlerts: {
                          ...previous.timerAlerts,
                          notifications: true,
                        },
                      }));
                    setMessage(result);
                  }}
                />
              </label>
              <label className="field-row">
                Timer chime
                <select
                  value={draft.chime}
                  onChange={(e) => update({ chime: Number(e.target.value) })}
                >
                  {chimeNames.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Preview chime"
                  onClick={() => playChime(draft.chime)}
                >
                  <Volume2 size={20} />
                </button>
              </label>
            </>,
          )}
          {group(
            "data",
            "Your data",
            `Stored on this device · ${state.history.length} workouts`,
            <>
              <div className="data-actions">
                <button className="secondary" onClick={backup}>
                  <Download size={18} /> JSON backup
                </button>
                <button className="secondary" onClick={markdown}>
                  <Download size={18} /> Markdown history
                </button>
                <label className="secondary import-label">
                  <Upload size={18} /> Import backup
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  className="secondary danger-button"
                  onClick={() => {
                    if (
                      confirm(
                        "Reset cycle progress, clear your in-progress workout and delete ALL cardio history? Completed lifting history is kept.",
                      )
                    ) {
                      clearTimer();
                      commit(resetCycle(state));
                      setMessage(
                        "Cycle progress reset and cardio history cleared.",
                      );
                    }
                  }}
                >
                  <RotateCcw size={18} /> Reset cycle
                </button>
                <div className="data-delete-section">
                  <button
                    className="secondary danger-button"
                    onClick={() => {
                      if (
                        !confirm(
                          "Delete all cycles and ALL lifting workout history? This also discards current and past workout drafts, clears cycle variations, and restarts at cycle 1. ALL cardio history is also deleted. Training maxes and other settings are kept. This cannot be undone without a JSON backup.",
                        )
                      )
                        return;
                      clearTimer();
                      commit(deleteAllCycles(state));
                      setDraft((previous) => ({
                        ...previous,
                        cycleVariants: {},
                      }));
                      setMessage(
                        "All cycles, lifting workouts and cardio deleted.",
                      );
                    }}
                  >
                    <Trash2 size={18} /> Delete all cycles
                  </button>
                </div>
              </div>
            </>,
          )}
        </div>
      )}
      <div className="settings-save-bar">
        <div>
          <span role="status">
            {message || (dirty ? "Unsaved changes" : "All changes saved")}
          </span>
          <small>Saving applies accessories to your current workout.</small>
        </div>
        <button className="primary" onClick={save}>
          Save changes
        </button>
      </div>
    </div>
  );
}
