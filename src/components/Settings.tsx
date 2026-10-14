import { deleteAllCycles, resetCycle } from "../domain/cycleData";
import { changeCycleVariation } from "../domain/changeCycleVariation";
import { requestTimerNotifications } from "../lib/timerAlerts";
import { syncWorkoutAccessories } from "../domain/workoutAccessories";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MutableRefObject,
} from "react";
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
  type Variant,
  settingsSchema,
  lifts,
  equipmentSchema,
} from "../domain/model";
import {
  trainingMax,
  changeUnits,
  cycleVariant,
  swappedLifts,
  otherUnitMax,
  normalizeCycleProgress,
} from "../domain/calculations";
import { chimeNames, playChime } from "./Timer";
import { EquipmentEditor } from "./EquipmentEditor";
import { AccessoryEditor } from "./AccessoryEditor";
import { NumericInput } from "./NumericInput";
import { SaveToast } from "./SaveToast";
import { Button } from "./ui/shadcn/button";
import { Accordion } from "./ui/shadcn/accordion";
import { Input, NativeSelect } from "./ui/shadcn/input";
import { Field } from "./ui/Field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/shadcn/dialog";
type Props = {
  state: AppState;
  commit: (s: AppState) => void;
  clearTimer: () => void;
  backup: () => void;
  markdown: () => void;
  importFile: (f: File) => Promise<void>;
  flushRef: MutableRefObject<(() => void) | null>;
  persistenceStatus: string;
  programOnly?: boolean;
  back?: () => void;
};
export function Settings({
  state,
  commit,
  backup,
  clearTimer,
  markdown,
  importFile,
  flushRef,
  persistenceStatus,
  programOnly = false,
  back,
}: Props) {
  const [draft, setDraft] = useState<SettingsType>(() =>
    structuredClone(state.settings),
  );
  const [message, setMessage] = useState("");
  const [incompleteInput, setIncompleteInput] = useState(false);
  const [importing, setImporting] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const checkNumericInputs = () => {
    const inputs = pageRef.current?.querySelectorAll<HTMLInputElement>(
      'input[type="number"]',
    );
    setIncompleteInput(
      [...(inputs ?? [])].some(
        (input) =>
          input.validity.badInput ||
          (input.value === "" && input.dataset.allowEmpty !== "true") ||
          (input.value !== "" &&
            (input.validity.rangeUnderflow || input.validity.rangeOverflow)),
      ),
    );
  };
  const [accessoriesOpen, setAccessoriesOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dataHelpOpen, setDataHelpOpen] = useState(false);
  const [variationOpen, setVariationOpen] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<Variant>("normal");
  const [openSection, setOpenSection] = useState<SettingsSection | null>(() => {
    if (programOnly) return "program";
    try {
      const saved = localStorage.getItem("bbb-settings-section");
      if (saved === "equipment") return "plates";
      if (saved === "") return null;
      return ["appearance", "maxes", "program", "plates", "timers", "data", "install"].includes(
        saved ?? "",
      )
        ? (saved as SettingsSection)
        : "appearance";
    } catch {
      return "appearance";
    }
  });
  const toggleSection = (value: string) => {
    const next = (value || null) as SettingsSection | null;
    setOpenSection(next);
    if (programOnly) return;
    try {
      localStorage.setItem("bbb-settings-section", next ?? "");
    } catch {
      /* UI preference only. */
    }
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings);
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
    if (!dirty || incompleteInput || importing) return;
    const parsed = settingsSchema.safeParse(draft);
    if (!parsed.success) {
      setMessage(`Changes not saved: ${parsed.error.issues[0].message}`);
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
    setMessage("");
  };
  const latestSave = useRef(save);
  latestSave.current = save;
  useEffect(() => {
    flushRef.current = () => latestSave.current();
    const flush = () => latestSave.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flushRef.current = null;
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flushRef]);
  useEffect(() => {
    if (!dirty || incompleteInput || importing) return;
    const timeout = window.setTimeout(() => latestSave.current(), 600);
    return () => window.clearTimeout(timeout);
  }, [draft, dirty, incompleteInput, importing]);
  const group = (id: SettingsSection, title: string, children: ReactNode) => programOnly && id !== "program" ? null : (
    <SettingsGroup id={id} title={title} open={openSection === id}>
      {children}
    </SettingsGroup>
  );
  return (
    <div
      className="settings-page"
      ref={pageRef}
      onInputCapture={() => window.setTimeout(checkNumericInputs, 0)}
      onBlurCapture={() => window.setTimeout(checkNumericInputs, 0)}
    >
      {programOnly && !accessoriesOpen && <Button variant="text" onClick={back}><ArrowLeft size={17} /> Back to overview</Button>}
      {accessoriesOpen && (
        <Button
          variant="text"
          onClick={() => {
            setAccessoriesOpen(false);
            window.scrollTo(0, 0);
          }}
        >
          <ArrowLeft size={17} /> Back to program
        </Button>
      )}
      {!accessoriesOpen && <div className="page-title">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h1>
            {accessoriesOpen ? "Accessories" : programOnly ? "Edit program" : "Settings"}
            <span>.</span>
          </h1>
        </div>
      </div>}
      {accessoriesOpen ? (
        <AccessoryEditor settings={draft} update={update} standalone />
      ) : (
        <Accordion
          className="settings-sections"
          type="single"
          collapsible
          value={openSection ?? ""}
          onValueChange={toggleSection}
        >
          {group(
            "appearance",
            "Appearance & device",
            <>
              <label className="toggle-row">
                <span>
                  Keep screen awake
                  <small>
                    Prevent dimming while the app is open, where supported
                  </small>
                </span>
                <Input
                  type="checkbox"
                  checked={draft.keepScreenAwake}
                  onChange={(e) =>
                    update({ keepScreenAwake: e.target.checked })
                  }
                />
              </label>
              <Field label="Weight units">
                <NativeSelect
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
                    setMessage("");
                  }}
                >
                  <option value="lb">Pounds (lb)</option>
                  <option value="kg">Kilograms (kg)</option>
                </NativeSelect>
              </Field>
            </>,
          )}
          {group(
            "maxes",
            "Training maxes",
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
                        designSystem
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
                          designSystem
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
                <Input
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
                      designSystem
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
            <>
              <div className="field-row">
                <span>Cycle {state.cycle} variation</span>
                <strong aria-label="Current cycle variation">{cycleVariant(state.settings, state.cycle) === "swap" ? "BBB Swap" : "Normal BBB"}</strong>
              </div>
              {programOnly && <Button variant="text" size="sm" onClick={() => {
                setSelectedVariation(cycleVariant(state.settings, state.cycle));
                setVariationOpen(true);
              }}>Change variation</Button>}
              <label className="toggle-row">
                <span>
                  Skip warmups
                  <small>Start new workouts with the main sets</small>
                </span>
                <Input
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
                <Input
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
                <Input
                  type="checkbox"
                  checked={draft.bbb}
                  onChange={(e) => update({ bbb: e.target.checked })}
                />
              </label>
              <label className="field-row">
                BBB percentage
                <NumericInput
                  designSystem
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
                  <Button
                    variant="icon"
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
                  </Button>
                  <strong>{names[lift]}</strong>
                  <NativeSelect
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
                  </NativeSelect>
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
                          designSystem
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
                        designSystem
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
            "plates",
            "Plates",
            <>
              <EquipmentEditor settings={draft} update={update} />
              <label className="field-row">
                Rounding increment
                <NumericInput
                  designSystem
                  min="0.01"
                  step="any"
                  value={draft.rounding}
                  onChange={(e) => update({ rounding: Number(e.target.value) })}
                />
              </label>
              <Field label="When a workout load cannot be exact">
                <NativeSelect aria-label="When a workout load cannot be exact" value={draft.loadRounding} onChange={event => update({ loadRounding: event.target.value as SettingsType["loadRounding"] })}>
                  <option value="nearest">Nearest achievable weight</option>
                  <option value="up">Round up</option>
                  <option value="down">Round down</option>
                </NativeSelect>
              </Field>
              <p className="subtle">
                Barbell loads and other-unit TMs use balanced pairs from your
                available plates.
              </p>
              <p className="subtle">Rounding direction applies to new warmup, main and BBB sets. The empty bar is the minimum load. Existing workouts stay unchanged.</p>
            </>,
          )}
          {group(
            "timers",
            "Rest Timers",
            <>

              {(["warmup", "working", "bbb"] as const).map((kind) => (
                <label className="field-row" key={kind}>
                  {kind === "warmup"
                    ? "Warmup"
                    : kind === "working"
                      ? "Working sets"
                      : "BBB"}{" "}
                  (seconds)
                  <NumericInput
                    designSystem
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
                <Input
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
                <Input
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
                <Input
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
                <NativeSelect
                  value={draft.chime}
                  onChange={(e) => update({ chime: Number(e.target.value) })}
                >
                  {chimeNames.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  variant="icon"
                  type="button"
                  className="icon-button"
                  aria-label="Preview chime"
                  onClick={() => playChime(draft.chime)}
                >
                  <Volume2 size={20} />
                </Button>
              </label>
            </>,
          )}
          {group(
            "data",
            "Your data",
            <>
              <Button
                variant="text"
                className="data-help-trigger"
                onClick={() => setDataHelpOpen(true)}
              >
                About local data
              </Button>
              <div className="data-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    save();
                    backup();
                  }}
                >
                  <Download size={18} /> JSON backup
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    save();
                    markdown();
                  }}
                >
                  <Download size={18} /> Markdown history
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="import-label"
                  onClick={() => importInputRef.current?.click()}
                >
                  <Upload size={18} /> Import backup
                </Button>
                <Input
                  ref={importInputRef}
                  hidden
                  aria-label="Import backup file"
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) {
                      setImporting(true);
                      try {
                        await importFile(file);
                      } finally {
                        setImporting(false);
                      }
                    }
                  }}
                />
                <Button
                  variant="destructive"
                  size="sm"
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
                </Button>
                <div className="data-delete-section">
                  <Button
                    variant="destructive"
                    size="sm"
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
                  </Button>
                </div>
              </div>
            </>,
          )}
          {programOnly && <Button
            variant="ghost"
            className="settings-accessories-entry"
            aria-label="Manage accessories"
            onClick={() => {
              setAccessoriesOpen(true);
              window.scrollTo(0, 0);
            }}
          >
            Accessories
            <ChevronRight size={18} aria-hidden="true" />
          </Button>}
          {group(
            "install",
            "Install app",
            <div className="settings-install">
              <p><strong>iPhone / iPad</strong><br />In Safari, tap Share, then Add to Home Screen.</p>
              <p><strong>Android</strong><br />In Chrome, open the menu, then Install app or Add to Home screen.</p>
              <p className="subtle">Open REP531 online once and wait for “Ready offline” before training without a connection.</p>
            </div>,
          )}
        </Accordion>
      )}
      <SaveToast
        className="settings-autosave"
        status={
          persistenceStatus === "Save failed"
            ? "Could not save to device"
            : incompleteInput
              ? "Finish entering a valid number"
              : message ||
                (dirty || persistenceStatus === "Saving…" ? "Saving…" : "Saved")
        }
      />
      <Dialog open={dataHelpOpen} onOpenChange={setDataHelpOpen}>
        <DialogContent>
          <DialogTitle>Your data stays on this device</DialogTitle>
          <DialogDescription className="mt-2">
            REP531 saves your training in this browser. Browser storage can be
            cleared, so download a JSON backup regularly. Importing a backup
            replaces the saved data on this device.
          </DialogDescription>
          <div className="settings-ui-dialog-footer">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={variationOpen} onOpenChange={setVariationOpen}>
        <DialogContent className="cycle-variation-dialog">
          <DialogTitle>Change cycle {state.cycle} variation</DialogTitle>
          <DialogDescription>BBB Swap pairs Squat ↔ Deadlift and Bench ↔ Overhead press, using each lift’s own TM.</DialogDescription>
          <Field label="Variation">
            <NativeSelect aria-label="Variation" value={selectedVariation} onChange={event => setSelectedVariation(event.target.value as Variant)}>
              <option value="normal">Normal BBB</option>
              <option value="swap">BBB Swap</option>
            </NativeSelect>
          </Field>
          <div className="cycle-variation-preview" aria-label="BBB lift preview">
            <div className="cycle-variation-columns"><strong>Main lift</strong><span aria-hidden="true" /><strong>BBB lift</strong></div>
            {draft.order.map(lift => <div key={lift}><span>{names[lift]}</span><span aria-hidden="true">→</span><strong>{names[selectedVariation === "swap" ? swappedLifts[lift] : lift]}</strong></div>)}
          </div>
          <p className="subtle">Your current workout and completed sessions stay unchanged. New cycles default to Normal BBB.</p>
          <div className="settings-ui-dialog-footer">
            <DialogClose asChild><Button variant="text">Cancel</Button></DialogClose>
            <Button disabled={selectedVariation === cycleVariant(state.settings, state.cycle)} onClick={() => {
              const next = changeCycleVariation(state, selectedVariation);
              commit(next);
              setDraft(previous => ({ ...previous, cycleVariants: { ...previous.cycleVariants, [state.cycle]: selectedVariation } }));
              setVariationOpen(false);
            }}>Apply to remaining workouts</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
