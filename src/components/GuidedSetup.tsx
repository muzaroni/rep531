import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
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
  applyGuidedSetup,
  completeInitialSetup,
  needsInitialSetup,
  type InitialEntries,
} from "../domain/initialSetup";
import { NumericInput } from "./NumericInput";
import { AccessoryEditor } from "./AccessoryEditor";
import { Button } from "./ui/shadcn/button";
import { NativeSelect } from "./ui/shadcn/input";

export function InitialSetup({
  state,
  close,
  save,
  revisit = false,
}: {
  state: AppState;
  close: () => void;
  save: (next: AppState) => void;
  revisit?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [units, setUnits] = useState(state.settings.units);
  const [variant, setVariant] = useState<"normal" | "swap">(
    state.settings.cycleVariants[state.cycle] ?? "normal",
  );
  const [method, setMethod] = useState<"rm" | "tm">(revisit ? "tm" : "rm");
  const [entries, setEntries] = useState<InitialEntries>(
    () =>
      Object.fromEntries(
        lifts.map((lift) => [
          lift,
          {
            kind: revisit ? "tm" : "rm",
            value: revisit ? state.settings.maxes[lift] : null,
          },
        ]),
      ) as InitialEntries,
  );
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [prepared, setPrepared] = useState<AppState | null>(null);
  const settings = changeUnits(state.settings, units);
  const prepare = (useDefaults = false) => {
    try {
      const next = (
        revisit && !needsInitialSetup(state)
          ? applyGuidedSetup
          : completeInitialSetup
      )(state, units, variant, useDefaults ? undefined : entries);
      if (prepared) {
        const previous = changeUnits(prepared.settings, units);
        next.settings.accessories = previous.accessories;
        next.settings.accessoryAssignments = previous.accessoryAssignments;
      }
      if (useDefaults) {
        setMethod("tm");
        setEntries(
          Object.fromEntries(
            lifts.map((lift) => [
              lift,
              { kind: "tm", value: next.settings.maxes[lift] },
            ]),
          ) as InitialEntries,
        );
      }
      setPrepared(stateSchema.parse(next));
      setError("");
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your weights.");
    }
  };
  useEffect(() => {
    dialog.current!.showModal();
  }, []);
  useEffect(() => {
    dialog.current?.scrollTo(0, 0);
    title.current?.focus();
  }, [step]);
  const finish = () => {
    if (!prepared) return;
    try {
      save(stateSchema.parse(prepared));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your accessories.");
    }
  };
  const switchUnits = (next: Settings["units"]) => {
    if (next === units) return;
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
                    convertWeight(entries[lift].value!, units, next),
                    next === "kg" ? 2.5 : 5,
                  ),
          },
        ]),
      ) as InitialEntries,
    );
    setUnits(next);
  };
  const convertedEntry = (lift: (typeof lifts)[number], kind: "rm" | "tm") => {
    const entry = entries[lift];
    return {
      kind,
      value:
        entry.value === null || kind === entry.kind
          ? entry.value
          : Math.round(
              (kind === "tm" ? entry.value * 0.9 : entry.value / 0.9) * 100,
            ) / 100,
    };
  };
  const switchMethod = (next: "rm" | "tm") => {
    setMethod(next);
    setEntries(
      Object.fromEntries(
        lifts.map((lift) => [lift, convertedEntry(lift, next)]),
      ) as InitialEntries,
    );
  };
  return (
    <dialog
      ref={dialog}
      className="accessory-dialog cycle-setup-dialog initial-setup-dialog guided-setup-dialog"
      aria-label={revisit ? "Guided setup" : "Set up your training"}
      onCancel={close}
      onClose={close}
    >
      <div className="guided-setup-header">
        <span className="guided-setup-brand">
          REP<span>531</span>
        </span>
        <Button
          type="button"
          variant="text"
          aria-label={revisit ? "Cancel guided setup" : "Set up later"}
          onClick={close}
        >
          {revisit ? "Cancel" : "Set up later"}
          <X size={14} aria-hidden="true" />
        </Button>
      </div>
      <p className="eyebrow">
        STEP {step} OF 2 · {step === 1 ? "STARTING WEIGHTS" : "OPTIONAL EXTRAS"}
      </p>
      <h2 ref={title} tabIndex={-1}>
        {step === 1 ? "Let’s set your weights." : "Add accessories?"}
      </h2>
      <p className="subtle guided-setup-intro">
        {step === 1
          ? "Four lifts. A starting point you can change anytime."
          : "Extra exercises after your main lift. Leave any day empty and add more during a workout."}
      </p>
      <div className="guided-step-track" aria-label={`Step ${step} of 2`}>
        <span data-active="true" />
        <span data-active={step === 2} />
      </div>
      {step === 1 ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            prepare();
          }}
        >
          <div className="guided-units-row">
            <strong>Weight units</strong>
            <div
              className="guided-segment"
              role="group"
              aria-label="Weight units"
            >
              {(["kg", "lb"] as const).map((unit) => (
                <Button
                  type="button"
                  key={unit}
                  variant="secondary"
                  aria-pressed={units === unit}
                  onClick={() => switchUnits(unit)}
                >
                  {unit}
                </Button>
              ))}
            </div>
          </div>
          <fieldset className="guided-method">
            <legend>Which weights do you know?</legend>
            <div className="guided-segment">
              <Button
                type="button"
                variant="secondary"
                aria-pressed={method === "rm"}
                onClick={() => switchMethod("rm")}
              >
                My best single rep
              </Button>
              <Button
                type="button"
                variant="secondary"
                aria-pressed={method === "tm"}
                onClick={() => switchMethod("tm")}
              >
                My training max
              </Button>
            </div>
          </fieldset>
          <p className="subtle guided-method-note">
            {method === "rm"
              ? "We use 90% of these weights to plan your training."
              : "Training max is the weight used to calculate your sets."}
          </p>
          <div className="guided-weight-list">
            {lifts.map((lift) => {
              const entry = entries[lift];
              const tm =
                entry.value &&
                entry.value > 0 &&
                entry.value <= 10000 &&
                Number.isFinite(entry.value)
                  ? nearestLoad(
                      entry.kind === "rm"
                        ? trainingMax(entry.value)
                        : entry.value,
                      equipmentForUnits(settings),
                      settings.rounding,
                    )
                  : null;
              return (
                <div className="guided-weight-row" key={lift}>
                  <div>
                    <label htmlFor={`initial-${lift}`}>{names[lift]}</label>
                    <small>
                      {entry.kind === "rm" ? "Training max" : "Starting weight"}
                      : {tm ?? "—"} {units}
                    </small>
                  </div>
                  <div className="guided-weight-input">
                    <NumericInput
                      id={`initial-${lift}`}
                      aria-label={`${names[lift]} initial max`}
                      value={entry.value}
                      allowEmpty
                      min={0.01}
                      max={10000}
                      step="any"
                      placeholder="—"
                      designSystem
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
                    <span>{units}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <details className="guided-program">
            <summary>
              Program · {variant === "swap" ? "BBB Swap" : "Normal BBB"}
            </summary>
            <label className="stack-field">
              Cycle variation
              <NativeSelect
                value={variant}
                onChange={(event) =>
                  setVariant(event.target.value as "normal" | "swap")
                }
              >
                <option value="normal">Normal BBB</option>
                <option value="swap">BBB Swap</option>
              </NativeSelect>
            </label>
            <p className="subtle">
              {variant === "swap"
                ? "BBB Swap pairs Squat ↔ Deadlift and Bench ↔ Overhead press, using each lift’s own TM."
                : "BBB adds extra sets of the same lift as your main sets."}
            </p>
          </details>
          <details className="guided-mixed">
            <summary>Different weight types per lift</summary>
            {lifts.map((lift) => (
              <label className="field-row" key={lift}>
                {names[lift]}
                <NativeSelect
                  aria-label={`${names[lift]} max type`}
                  value={entries[lift].kind}
                  onChange={(event) =>
                    setEntries({
                      ...entries,
                      [lift]: convertedEntry(
                        lift,
                        event.target.value as "rm" | "tm",
                      ),
                    })
                  }
                >
                  <option value="rm">Best single rep</option>
                  <option value="tm">Training max</option>
                </NativeSelect>
              </label>
            ))}
          </details>
          {revisit && (
            <p className="subtle guided-revisit-note">
              Main program changes apply to future sessions. Saving updates your
              current workout’s accessory selections.
            </p>
          )}
          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          <div className="guided-setup-actions">
            <Button type="button" variant="text" onClick={() => prepare(true)}>
              {revisit ? "Keep current weights" : "Use starter weights"}
            </Button>
            <Button type="submit" className="guided-setup-primary">
              Continue
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
          {!revisit && (
            <p className="subtle guided-defaults-note">
              Starter training maxes:{" "}
              {lifts
                .map((lift) => `${names[lift]} ${settings.maxes[lift]}`)
                .join(" · ")}{" "}
              {units}. Adjust them before training.
            </p>
          )}
        </form>
      ) : (
        prepared && (
          <div>
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
                  {names[lift]}
                  <strong>
                    {prepared.settings.accessoryAssignments[lift].length}
                  </strong>
                </span>
              ))}
            </div>
            {error && (
              <p role="alert" className="error-banner">
                {error}
              </p>
            )}
            <div className="guided-setup-actions initial-accessory-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                className="guided-setup-primary"
                onClick={finish}
              >
                Save setup
              </Button>
            </div>
          </div>
        )
      )}
    </dialog>
  );
}
