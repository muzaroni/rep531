import type { Settings, Workout, WorkoutSet } from "./model";
import { convertWeight, roundWeight } from "./calculations";
import { accessoryGroupKey, workoutAccessoryGroups } from "./accessorySets";

export function addWorkoutAccessory(workout: Workout, settings: Settings, id: string, editingHistory = false): Workout {
  const exercise = settings.accessories.find(item => item.id === id);
  if (!exercise || (workout.completedAt && !editingHistory)) return workout;
  const groups = workoutAccessoryGroups(workout);
  if (groups.some(group => (group.template.accessoryId === id || (!group.template.accessoryId && group.template.name === exercise.name && group.template.category === exercise.category)) && group.sets.length)) return workout;
  const key = `id:${id}`;
  const old = groups.find(group => group.key === key);
  const template: WorkoutSet = old?.template ?? {
    id: crypto.randomUUID(), kind: "accessory", accessoryId: id,
    name: exercise.name, category: exercise.category, percent: 0,
    target: exercise.reps, reps: exercise.reps, plus: false, done: false,
    weight: settings.units === workout.units ? exercise.weight : roundWeight(
      convertWeight(exercise.weight, settings.units, workout.units), workout.units === "kg" ? 2.5 : 5,
    ),
  };
  const count = exercise.sets;
  if (workout.sets.length + count > 2500) return workout;
  const added = Array.from({ length: count }, () => ({ ...template, id: crypto.randomUUID(), done: false }));
  const following = old ? groups.slice(groups.indexOf(old) + 1).find(group => group.sets.length)?.sets[0] : undefined;
  const insertion = following ? workout.sets.findIndex(set => set.id === following.id) : workout.sets.length;
  const sets = [...workout.sets];
  sets.splice(insertion, 0, ...added);
  return { ...workout, sets, accessorySetOverrides: {
    ...workout.accessorySetOverrides,
    [accessoryGroupKey(template)]: { count, position: old ? groups.indexOf(old) : groups.length, template },
  } };
}
