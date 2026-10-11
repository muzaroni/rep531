import {
  type AppState,
  type Workout,
  type WorkoutSet,
  type Settings,
  type Lift,
  names,
} from "./model";
import { nearestLoad } from "./equipment";
export { plateLoad, nearestLoad } from "./equipment";
export const roundWeight = (weight: number, increment: number) =>
  Math.round(Math.round(weight / increment) * increment * 100) / 100;
export const trainingMax = (oneRepMax: number) =>
  Math.round(oneRepMax * 90) / 100;
export const convertWeight = (
  weight: number,
  from: "lb" | "kg",
  to: "lb" | "kg",
) =>
  from === to ? weight : weight * (to === "kg" ? 0.45359237 : 1 / 0.45359237);
// Old backups retain bar metadata, but new prescriptions always use an Olympic bar.
export function equipmentForUnits(settings: Settings, units = settings.units) {
  return {
    ...settings.equipment[units],
    bars: [{ name: "Olympic bar", weight: units === "lb" ? 45 : 20 }],
    barIndex: 0,
  };
}
export function otherUnitMax(settings: Settings, value: number) {
  const units = settings.units === "lb" ? "kg" : "lb";
  return {
    units,
    weight: nearestLoad(
      convertWeight(value, settings.units, units),
      equipmentForUnits(settings, units),
      units === "kg" ? 2.5 : 5,
    ),
  };
}
export function changeUnits(
  settings: Settings,
  units: Settings["units"],
): Settings {
  if (settings.units === units) return settings;
  const rounding = units === "kg" ? 2.5 : 5;
  const cv = (n: number) =>
    roundWeight(convertWeight(n, settings.units, units), rounding);
  return {
    ...settings,
    units,
    rounding,
    maxes: Object.fromEntries(
      Object.entries(settings.maxes).map(([k, v]) => [
        k,
        nearestLoad(
          convertWeight(v, settings.units, units),
          equipmentForUnits(settings, units),
          rounding,
        ),
      ]),
    ) as Settings["maxes"],
    oneRepMaxes: Object.fromEntries(
      Object.entries(settings.oneRepMaxes).map(([lift, value]) => [
        lift,
        value === null ? null : cv(value),
      ]),
    ) as Settings["oneRepMaxes"],
    increases: Object.fromEntries(
      Object.entries(settings.increases).map(([k, v]) => [
        k,
        Math.max(rounding, cv(v)),
      ]),
    ) as Settings["maxes"],
    accessories: settings.accessories.map((a) => ({
      ...a,
      weight: cv(a.weight),
    })),
  };
}
export const swappedLifts: Record<Lift, Lift> = {
  squat: "deadlift",
  deadlift: "squat",
  bench: "press",
  press: "bench",
};
export const cycleVariant = (settings: Settings, cycle: number) =>
  settings.cycleVariants[String(cycle)] ?? "normal";
export function makeWorkout(state: AppState): Workout {
  const s = state.settings,
    week = Math.floor(state.position / 4) + 1,
    lift = s.order[state.position % 4],
    tm = s.maxes[lift];
  const equipment = equipmentForUnits(s),
    variant = cycleVariant(s, state.cycle),
    bbbLift = variant === "swap" ? swappedLifts[lift] : lift,
    bbbTm = s.maxes[bbbLift];
  const sets: WorkoutSet[] = [];
  const add = (
    kind: WorkoutSet["kind"],
    percent: number,
    target: number,
    plus = false,
    name = names[lift],
    weight = nearestLoad((tm * percent) / 100, equipment, s.rounding),
    category?: WorkoutSet["category"],
    accessoryId?: string,
  ) =>
    sets.push({
      id: crypto.randomUUID(),
      kind,
      percent,
      target,
      plus,
      name,
      weight,
      reps: target,
      done: false,
      ...(category ? { category } : {}),
      ...(accessoryId ? { accessoryId } : {}),
    });
  if (week !== 4 && !s.skipWarmups)
    s.warmup.forEach((p, i) => add("warmup", p, [5, 5, 3][i]));
  s.percentages[week - 1].forEach((p, i) =>
    add(
      "working",
      p,
      [
        [5, 5, 5],
        [3, 3, 3],
        [5, 3, 1],
        [5, 5, 5],
      ][week - 1][i],
      week !== 4 && i === 2,
    ),
  );
  if (week !== 4 && s.bbb)
    for (let i = 0; i < 5; i++)
      add(
        "bbb",
        s.bbbPercent,
        10,
        false,
        names[bbbLift],
        nearestLoad((bbbTm * s.bbbPercent) / 100, equipment, s.rounding),
      );
  for (const id of s.accessoryAssignments[lift]) {
    const a = s.accessories.find((item) => item.id === id);
    if (a)
      for (let i = 0; i < a.sets; i++)
        add("accessory", 0, a.reps, false, a.name, a.weight, a.category, a.id);
  }
  return {
    id: crypto.randomUUID(),
    lift,
    variant,
    bbbLift,
    bbbTm,
    cycle: state.cycle,
    week,
    date: new Date().toISOString(),
    completedAt: null,
    units: s.units,
    tm,
    bar: equipment.bars[equipment.barIndex].weight,
    plates: [...equipment.plates],
    sets,
    notes: "",
  };
}
export const estimatedMax = (weight: number, reps: number) =>
  reps === 1 ? weight : weight * (1 + reps / 30);
export function canFinishWorkout(workout: Workout): boolean {
  const required = workout.sets.filter(
    (set) => set.kind === "working" || set.kind === "bbb",
  );
  return (
    required.some((set) => set.kind === "working") &&
    required.every((set) => set.done)
  );
}
export function skipWorkoutWarmups(workout: Workout): Workout {
  if (workout.completedAt) return workout;
  return {
    ...workout,
    sets: workout.sets.filter((set) => set.kind !== "warmup" || set.done),
  };
}
function nextCycle(state: AppState): AppState {
  const settings = structuredClone(state.settings);
  if (settings.autoIncrease)
    for (const lift of settings.order)
      settings.maxes[lift] = nearestLoad(
        settings.maxes[lift] + settings.increases[lift],
        equipmentForUnits(settings),
        settings.rounding,
      );
  return {
    ...state,
    settings,
    position: 0,
    cycle: state.cycle + 1,
    cycleSetup: {
      cycle: state.cycle + 1,
      previousMaxes: { ...state.settings.maxes },
      units: state.settings.units,
      confirmed: false,
    },
  };
}
// A saved week-four cursor can be skipped immediately, but never discard an
// already started deload session. That session rolls over when finished.
export function normalizeCycleProgress(state: AppState): AppState {
  return state.settings.skipDeload && state.position >= 12 && !state.active
    ? nextCycle(state)
    : state;
}
export function finishWorkout(state: AppState): AppState {
  if (!state.active || !canFinishWorkout(state.active))
    throw new Error("Complete the main and BBB sets before finishing.");
  const rollover = state.position >= (state.settings.skipDeload ? 11 : 15);
  const completed: AppState = {
    ...state,
    active: null,
    history: [
      ...state.history,
      { ...state.active, completedAt: new Date().toISOString() },
    ],
    position: rollover ? state.position : state.position + 1,
  };
  return rollover ? nextCycle(completed) : completed;
}
export function nextTrainingDay(
  days: number[],
  position: number,
  now = new Date(),
) {
  const result = new Date(now);
  result.setDate(
    result.getDate() + ((days[position % 4] - now.getDay() + 7) % 7),
  );
  return result;
}
export function progression(
  history: Workout[],
  lift: Lift,
  units: Settings["units"],
) {
  return history
    .filter((w) => w.lift === lift)
    .map((w) => ({
      date: w.date,
      value: Math.max(
        ...w.sets
          .filter((s) => s.kind === "working" && s.done && s.reps > 0)
          .map((s) =>
            convertWeight(estimatedMax(s.weight, s.reps), w.units, units),
          ),
        0,
      ),
    }));
}
