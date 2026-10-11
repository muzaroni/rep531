import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  lifts,
  names,
  stateSchema,
  type AppState,
  type Settings,
} from "../domain/model";
import {
  changeUnits,
  convertWeight,
  equipmentForUnits,
  roundWeight,
  trainingMax,
} from "../domain/calculations";
import { nearestLoad } from "../domain/equipment";
import {
  completeInitialSetup,
  type InitialEntries,
} from "../domain/initialSetup";
import { NumericInput } from "./NumericInput";
import { AccessoryEditor } from "./AccessoryEditor";
export function InitialSetup({
  state,
  close,
  save,
}: {
  state: AppState;
  close: () => void;
  save: (next: AppState) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [units, setUnits] = useState(state.settings.units);
  const [variant, setVariant] = useState<"normal" | "swap">(
    state.settings.cycleVariants[1] ?? "normal",
  );
  const [entries, setEntries] = useState<InitialEntries>(
    Object.fromEntries(
      lifts.map((lift) => [lift, { kind: "tm", value: null }]),
    ) as InitialEntries,
  );
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [prepared, setPrepared] = useState<AppState | null>(null);
  const settings = changeUnits(state.settings, units);
  const finish = (useDefaults = false) => {
    try {
      const next = completeInitialSetup(
        state,
        units,
        variant,
        useDefaults ? undefined : entries,
      );
      if (prepared) {
        const previous = changeUnits(prepared.settings, units);
        next.settings.accessories = previous.accessories;
        next.settings.accessoryAssignments = previous.accessoryAssignments;
      }
      setPrepared(stateSchema.parse(next));
      setError("");
      setStep(2);
      dialog.current?.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your maxes.");
    }
  };
  useEffect(() => {
    dialog.current!.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="accessory-dialog cycle-setup-dialog initial-setup-dialog"
      aria-labelledby="initial-setup-title"
      onCancel={close}
      onClose={close}
    >
      {step === 1 ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            finish();
          }}
        >
          <div className="calendar-detail-heading">
            <div>
              <p className="eyebrow">STEP 1 OF 2 · YOUR TRAINING</p>
              <h2 id="initial-setup-title">Set up your training</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Set up later"
              title="Set up later"
              onClick={close}
            >
              <X size={20} />
            </button>
          </div>
          <label className="field-row">
            Weight units
            <select
              value={units}
              onChange={(event) => {
                const next = event.target.value as Settings["units"];
                setEntries(
                  Object.fromEntries(
                    lifts.map((lift) => [
                      lift,
                      {
                        ...entries[lift],
                        value:
                          entries[lift].value === null
                            ? null
                            : roundWeight(
                                convertWeight(
                                  entries[lift].value!,
                                  units,
                                  next,
                                ),
                                next === "kg" ? 2.5 : 5,
                              ),
                      },
                    ]),
                  ) as InitialEntries,
                );
                setUnits(next);
              }}
            >
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </label>
          <p className="subtle cycle-setup-note">
            Enter a 1RM or TM for each lift. 1RM uses 90% for your TM, rounded
            to your plates. You can change these anytime.
          </p>
          <div className="cycle-max-grid">
            {lifts.map((lift) => {
              const entry = entries[lift];
              const tm =
                entry.value && entry.value > 0
                  ? nearestLoad(
                      entry.kind === "rm"
                        ? trainingMax(entry.value)
                        : entry.value,
                      equipmentForUnits(settings),
                      settings.rounding,
                    )
                  : null;
              return (
                <div key={lift} className="initial-lift-entry">
                  <label htmlFor={`initial-${lift}`}>
                    {names[lift]} <small>{units}</small>
                  </label>
                  <div className="initial-entry-inputs">
                    <select
                      aria-label={`${names[lift]} max type`}
                      value={entry.kind}
                      onChange={(event) =>
                        setEntries({
                          ...entries,
                          [lift]: {
                            ...entry,
                            kind: event.target.value as "rm" | "tm",
                          },
                        })
                      }
                    >
                      <option value="tm">TM</option>
                      <option value="rm">1RM</option>
                    </select>
                    <NumericInput
                      id={`initial-${lift}`}
                      aria-label={`${names[lift]} initial max`}
                      value={entry.value}
                      allowEmpty
                      min={0.01}
                      max={10000}
                      step="any"
                      placeholder="Weight"
                      onChange={(event) =>
                        setEntries({
                          ...entries,
                          [lift]: {
                            ...entry,
                            value:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <small>{tm ? `TM: ${tm} ${units}` : "Enter your max"}</small>
                </div>
              );
            })}
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
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="cycle-setup-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => finish(true)}
            >
              Use defaults
            </button>
            <button className="primary" type="submit">
              Choose accessories
            </button>
          </div>
          <p className="subtle initial-defaults-note">
            Defaults:{" "}
            {lifts
              .map((lift) => `${names[lift]} ${settings.maxes[lift]}`)
              .join(" · ")}{" "}
            {units}
          </p>
        </form>
      ) : (
        prepared && (
          <div>
            <div className="calendar-detail-heading">
              <div>
                <p className="eyebrow">STEP 2 OF 2 · ACCESSORIES</p>
                <h2 id="initial-setup-title">Set up your training</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Set up later"
                onClick={close}
              >
                <X size={20} />
              </button>
            </div>
            <p className="subtle cycle-setup-note">
              Choose accessories for each lifting day. Aim for a push, a pull,
              and legs or abs; any number is fine. You can change these in
              Settings.
            </p>
            <AccessoryEditor
              settings={prepared.settings}
              update={(patch) =>
                setPrepared((current) =>
                  current
                    ? {
                        ...current,
                        settings: { ...current.settings, ...patch },
                      }
                    : current,
                )
              }
            />
            <div
              className="initial-accessory-summary"
              aria-label="Daily accessory counts"
            >
              {prepared.settings.order.map((lift) => (
                <span key={lift}>
                  {names[lift]}{" "}
                  <strong>
                    {prepared.settings.accessoryAssignments[lift].length}
                  </strong>
                </span>
              ))}
            </div>
            {error && <p role="alert">{error}</p>}
            <div className="cycle-setup-actions initial-accessory-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setStep(1);
                  setError("");
                  dialog.current?.scrollTo(0, 0);
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  try {
                    save(stateSchema.parse(prepared));
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Check your accessories.",
                    );
                  }
                }}
              >
                Save setup
              </button>
            </div>
          </div>
        )
      )}
    </dialog>
  );
}
