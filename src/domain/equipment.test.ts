import { describe, it, expect } from "vitest";
import { defaultEquipment, defaults, lifts, settingsSchema } from "./model";
import { nearestLoad, plateLoad } from "./equipment";
import { changeUnits, makeWorkout, otherUnitMax } from "./calculations";
describe("equipment-aware rounding", () => {
  it("rounds in the chosen direction using balanced available plates", () => {
    const equipment = defaultEquipment().kg;
    equipment.plates = [25];
    expect(nearestLoad(102, equipment, 2.5, "down")).toBe(70);
    expect(nearestLoad(102, equipment, 2.5, "up")).toBe(120);
    expect(nearestLoad(120, equipment, 2.5, "up")).toBe(120);
    expect(nearestLoad(120, equipment, 2.5, "down")).toBe(120);
    expect(nearestLoad(10, equipment, 2.5, "down")).toBe(20);
    equipment.plates = [4, 3];
    expect(nearestLoad(33, equipment, 1, "down")).toBe(32);
    expect(nearestLoad(33, equipment, 1, "up")).toBe(34);
  });
  it("uses rounding direction for new prescriptions and defaults older backups to nearest", () => {
    const state = defaults();
    state.settings.loadRounding = "up";
    const up = makeWorkout(state);
    state.settings.loadRounding = "down";
    const down = makeWorkout(state);
    expect(up.sets.find(set => set.kind === "working")!.weight).toBe(150);
    expect(down.sets.find(set => set.kind === "working")!.weight).toBe(145);
    expect(up.sets.find(set => set.kind === "bbb")!.weight).toBe(115);
    expect(down.sets.find(set => set.kind === "bbb")!.weight).toBe(110);
    const { loadRounding: _direction, ...older } = state.settings;
    expect(settingsSchema.parse(older).loadRounding).toBe("nearest");
    expect(settingsSchema.safeParse({ ...older, loadRounding: "invalid" }).success).toBe(false);
    expect(settingsSchema.parse(JSON.parse(JSON.stringify(state.settings))).loadRounding).toBe("down");
  });
  it("rounds the 225 lb example to 100 kg with 40 kg on each side", () => {
    const equipment = defaultEquipment().kg;
    const load = nearestLoad(225 * 0.45359237, equipment, 2.5);
    expect(load).toBe(100);
    expect(plateLoad(load, 20, equipment.plates)).toEqual({
      plates: [20, 20],
      actual: 100,
      exact: true,
    });
  });
  it("searches both sides of a target with sparse and non-greedy inventories", () => {
    const e = defaultEquipment().kg;
    e.plates = [25];
    expect(nearestLoad(102.06, e, 2.5)).toBe(120);
    e.bars[0].weight = 45;
    e.plates = [4, 3];
    expect(nearestLoad(57, e, 1)).toBe(57);
    expect(plateLoad(57, 45, e.plates).plates).toEqual([3, 3]);
  });
  it("respects configured rounding, exact ties and empty bars", () => {
    const e = defaultEquipment().kg;
    expect(nearestLoad(102.5, e, 2.5)).toBe(105);
    expect(nearestLoad(102.06, e, 10)).toBe(100);
    expect(nearestLoad(12, e, 2.5)).toBe(20);
    e.plates.push(1.25);
    expect(nearestLoad(102.06, e, 2.5)).toBe(102.5);
  });
  it("assumes an Olympic bar and leaves legacy equipment metadata unchanged", () => {
    const s = defaults().settings;
    s.equipment.kg.bars.push({ name: "Training bar", weight: 15 });
    s.equipment.kg.barIndex = 1;
    s.accessories[0].weight = 80;
    const original = structuredClone(s.equipment);
    const kg = changeUnits(s, "kg");
    expect(kg.maxes.squat).toBe(100);
    expect(makeWorkout({ ...defaults(), settings: kg }).bar).toBe(20);
    expect(kg.accessories[0].weight).toBe(37.5);
    expect(kg.equipment).toEqual(original);
    const lb = changeUnits(kg, "lb");
    expect(lb.equipment).toEqual(original);
    expect(lb.rounding).toBe(5);
    for (const weight of Object.values(lb.maxes)) expect(weight % 5).toBe(0);
    expect(changeUnits(kg, "kg")).toBe(kg);
  });
  it("makes every automatic main, warmup and BBB load possible with its snapshot equipment", () => {
    const state = defaults();
    state.settings = changeUnits(state.settings, "kg");
    state.settings.equipment.kg.plates = [20, 5];
    for (let position = 0; position < 16; position++) {
      state.position = position;
      const w = makeWorkout(state);
      for (const set of w.sets.filter((s) => s.kind !== "accessory"))
        expect(plateLoad(set.weight, w.bar, w.plates).exact).toBe(true);
    }
  });
});
describe("cycle variations and daily accessories", () => {
  it.each(lifts)("uses the paired lift and its own TM for %s BBB", (lift) => {
    const s = defaults();
    s.settings.cycleVariants["1"] = "swap";
    s.position = s.settings.order.indexOf(lift);
    const paired = {
      squat: "deadlift",
      bench: "press",
      deadlift: "squat",
      press: "bench",
    } as const;
    const w = makeWorkout(s);
    expect(w.variant).toBe("swap");
    expect(w.bbbLift).toBe(paired[lift]);
    expect(w.bbbTm).toBe(s.settings.maxes[paired[lift]]);
    const sets = w.sets.filter((s) => s.kind === "bbb");
    expect(sets).toHaveLength(5);
    expect(
      sets.every(
        (set) =>
          set.weight === nearestLoad(w.bbbTm * 0.5, s.settings.equipment.lb, 5),
      ),
    ).toBe(true);
    expect(
      w.sets
        .filter((s) => s.kind === "working")
        .every(
          (set) =>
            set.name ===
            {
              squat: "Squat",
              bench: "Bench press",
              deadlift: "Deadlift",
              press: "Overhead press",
            }[lift],
        ),
    ).toBe(true);
  });
  it("selects a variation per cycle and still skips BBB on deload or when disabled", () => {
    const s = defaults();
    s.settings.cycleVariants = { "1": "swap", "2": "normal" };
    expect(makeWorkout(s).bbbLift).toBe("deadlift");
    s.cycle = 2;
    expect(makeWorkout(s).bbbLift).toBe("squat");
    s.cycle = 3;
    expect(makeWorkout(s).variant).toBe("normal");
    s.cycle = 1;
    s.position = 12;
    expect(makeWorkout(s).sets.some((set) => set.kind === "bbb")).toBe(false);
    s.position = 0;
    s.settings.bbb = false;
    expect(makeWorkout(s).sets.some((set) => set.kind === "bbb")).toBe(false);
  });
  it("includes only each day’s selections, allowing multiple exercises in a category", () => {
    const s = defaults();
    s.settings.accessories.push({
      id: "row",
      name: "Cable row",
      category: "pull",
      sets: 3,
      reps: 12,
      weight: 50,
    });
    s.settings.accessoryAssignments.squat = ["lat", "row", "abs"];
    const w = makeWorkout(s);
    expect(w.sets.filter((set) => set.kind === "accessory")).toHaveLength(13);
    expect(w.sets.filter((set) => set.category === "pull")).toHaveLength(8);
    s.position = 2;
    expect(makeWorkout(s).sets.some((set) => set.kind === "accessory")).toBe(
      false,
    );
  });
});

it("shows a loadable other-unit TM and converts saved 1RMs with clean rounding", () => {
  const s = defaults().settings;
  s.oneRepMaxes.squat = 300;
  expect(otherUnitMax(s, 225)).toEqual({ weight: 100, units: "kg" });
  s.equipment.kg.plates = [25];
  expect(otherUnitMax(s, 225)).toEqual({ weight: 120, units: "kg" });
  s.equipment.kg.plates = [25, 20, 10, 5, 2.5, 1.25];
  expect(otherUnitMax(s, 225)).toEqual({ weight: 102.5, units: "kg" });
  const kg = changeUnits(s, "kg");
  expect(kg.oneRepMaxes.squat).toBe(135);
  expect(kg.oneRepMaxes.bench).toBeNull();
  expect(otherUnitMax(kg, 100)).toEqual({ weight: 220, units: "lb" });
});
it("starts with exactly ten push and ten pull choices without selecting them all", () => {
  const s = defaults().settings;
  expect(s.accessories.filter((a) => a.category === "push")).toHaveLength(10);
  expect(s.accessories.filter((a) => a.category === "pull")).toHaveLength(10);
  expect(s.accessoryAssignments.squat).toEqual(["abs"]);
});
