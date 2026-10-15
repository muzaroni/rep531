import type { Workout, WorkoutSet } from "./model";

export const accessoryGroupKey = (set: WorkoutSet) =>
  set.accessoryId
    ? `id:${set.accessoryId}`
    : `legacy:${set.name}:${set.category ?? ""}`;

export function workoutAccessoryGroups(workout: Workout) {
  const groups: { key: string; template: WorkoutSet; sets: WorkoutSet[] }[] =
    [];
  for (const set of workout.sets.filter((item) => item.kind === "accessory")) {
    const key = accessoryGroupKey(set);
    const group = groups.find((item) => item.key === key);
    if (group) {
      group.sets.push(set);
      group.template = set;
    } else groups.push({ key, template: set, sets: [set] });
  }
  // Keep an empty exercise visible so its Add button remains available.
  const empty = Object.entries(workout.accessorySetOverrides ?? {})
    .filter(
      ([key, override]) =>
        override.count === 0 && !groups.some((group) => group.key === key),
    )
    .sort((a, b) => a[1].position - b[1].position);
  for (const [key, override] of empty)
    groups.splice(Math.min(override.position, groups.length), 0, {
      key,
      template: override.template,
      sets: [],
    });
  return groups;
}

// Session-only counts survive autosave, resume and Settings reconciliation.
// Removing a set always removes the last unfinished one, never a completed log.
export function changeAccessorySetCount(
  workout: Workout,
  key: string,
  delta: 1 | -1,
  editingHistory = false,
): Workout {
  if (workout.completedAt && !editingHistory) return workout;
  const groups = workoutAccessoryGroups(workout);
  const position = groups.findIndex((group) => group.key === key);
  const group = groups[position];
  if (!group) return workout;
  if (delta === 1 && (group.sets.length >= 20 || workout.sets.length >= 2500))
    return workout;
  const template = group.sets.at(-1) ?? group.template;
  const sets = [...workout.sets];
  if (delta === -1) {
    const removable = editingHistory ? group.sets.at(-1) : [...group.sets].reverse().find((set) => !set.done);
    if (!removable) return workout;
    sets.splice(
      sets.findIndex((set) => set.id === removable.id),
      1,
    );
  } else {
    const following = groups
      .slice(position + 1)
      .find((item) => item.sets.length)?.sets[0];
    const insertion = group.sets.length
      ? sets.findIndex((set) => set.id === template.id) + 1
      : following
        ? sets.findIndex((set) => set.id === following.id)
        : sets.length;
    sets.splice(insertion, 0, {
      ...template,
      id: crypto.randomUUID(),
      done: false,
    });
  }
  return {
    ...workout,
    sets,
    accessorySetOverrides: {
      ...workout.accessorySetOverrides,
      [key]: {
        count: group.sets.length + delta,
        position,
        template: { ...template, done: false },
      },
    },
  };
}
