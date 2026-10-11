import { accessoryGroupKey } from "./accessorySets";
import type { Settings, Workout, WorkoutSet } from "./model";
import { convertWeight, roundWeight } from "./calculations";

// Only accessories are refreshed. Main/BBB prescriptions, workout units and
// completed logs remain snapshots, even when program settings have changed.
export function syncWorkoutAccessories(
  workout: Workout,
  previous: Settings,
  next: Settings,
): Workout {
  const original = workout.sets.filter((set) => set.kind === "accessory");
  const used = new Set<string>();
  const weightInWorkoutUnits = (weight: number, units: Settings["units"]) =>
    units === workout.units
      ? weight
      : roundWeight(
          convertWeight(weight, units, workout.units),
          workout.units === "kg" ? 2.5 : 5,
        );
  const accessories: WorkoutSet[] = [];
  const overrides: NonNullable<Workout["accessorySetOverrides"]> = {};
  for (const id of next.accessoryAssignments[workout.lift]) {
    const exercise = next.accessories.find((item) => item.id === id);
    if (!exercise) continue;
    const before = previous.accessories.find((item) => item.id === id);
    const matches = original
      .filter((set) => !used.has(set.id))
      .filter((set) =>
        set.accessoryId
          ? set.accessoryId === id
          : set.name === (before?.name ?? exercise.name) &&
            (!set.category ||
              set.category === (before?.category ?? exercise.category)),
      );
    const override =
      workout.accessorySetOverrides?.[`id:${id}`] ??
      workout.accessorySetOverrides?.[
        `legacy:${before?.name ?? exercise.name}:${before?.category ?? exercise.category}`
      ] ??
      workout.accessorySetOverrides?.[
        `legacy:${before?.name ?? exercise.name}:`
      ] ??
      (matches[0]
        ? workout.accessorySetOverrides?.[accessoryGroupKey(matches[0])]
        : undefined);
    const count = override?.count ?? exercise.sets;
    if (override)
      overrides[`id:${id}`] = {
        ...override,
        position: next.accessoryAssignments[workout.lift].indexOf(id),
        template: {
          ...override.template,
          accessoryId: id,
          name: exercise.name,
          category: exercise.category,
          target: exercise.reps,
        },
      };
    const done = matches.filter((set) => set.done);
    const pending = matches
      .filter((set) => !set.done)
      .slice(0, Math.max(0, count - done.length));
    for (const set of done) {
      used.add(set.id);
      accessories.push({ ...set, accessoryId: id });
    }
    const weight = weightInWorkoutUnits(exercise.weight, next.units);
    for (let i = done.length; i < count; i++) {
      const existing = pending[i - done.length];
      if (existing) {
        used.add(existing.id);
        const oldWeight = before
          ? weightInWorkoutUnits(before.weight, previous.units)
          : existing.weight;
        accessories.push({
          ...existing,
          accessoryId: id,
          name: exercise.name,
          category: exercise.category,
          target: exercise.reps,
          reps:
            existing.reps === existing.target ? exercise.reps : existing.reps,
          weight:
            Math.abs(existing.weight - oldWeight) < 0.001
              ? weight
              : existing.weight,
        });
      } else
        accessories.push({
          id: crypto.randomUUID(),
          kind: "accessory",
          accessoryId: id,
          name: exercise.name,
          category: exercise.category,
          percent: 0,
          target: exercise.reps,
          plus: false,
          weight,
          reps: exercise.reps,
          done: false,
        });
    }
  }
  // Removing an exercise never removes work that was already completed.
  accessories.push(...original.filter((set) => set.done && !used.has(set.id)));
  return {
    ...workout,
    ...(workout.accessorySetOverrides
      ? { accessorySetOverrides: overrides }
      : {}),
    sets: [
      ...workout.sets.filter((set) => set.kind !== "accessory"),
      ...accessories,
    ],
  };
}
