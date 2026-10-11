import type { AccessoryCategory, Settings } from "./model";

// Stable IDs make upgrades idempotent. Presets never select themselves for a day.
export function accessoryPresets(): Settings["accessories"] {
  const groups = {
    push: [
      "Push up",
      "Dumbbell bench press",
      "Incline dumbbell press",
      "Dips",
      "Dumbbell shoulder press",
      "Close grip bench press",
      "Cable chest fly",
      "Triceps pushdown",
      "Overhead triceps extension",
      "Lateral raise",
    ],
    legs: [
      "Bulgarian split squat",
      "Romanian deadlift",
      "Leg press",
      "Goblet squat",
      "Walking lunge",
      "Step up",
      "Lying leg curl",
      "Leg extension",
      "Hip thrust",
      "Standing calf raise",
    ],
    pull: [
      "Lat pulldown",
      "Pull up",
      "Chin up",
      "Barbell row",
      "Dumbbell row",
      "Seated cable row",
      "Chest supported row",
      "Face pull",
      "Biceps curl",
      "Hammer curl",
    ],
  } as const;
  return Object.entries(groups).flatMap(([category, names]) =>
    names.map((name, i) => ({
      id: name === "Lat pulldown" ? "lat" : `preset-${category}-${i + 1}`,
      name,
      category: category as AccessoryCategory,
      sets: 5,
      reps: 10,
      weight: 0,
    })),
  );
}

export function addMissingPresets(
  existing: Settings["accessories"],
  categories?: readonly AccessoryCategory[],
) {
  const result = [...existing];
  for (const preset of accessoryPresets()) {
    if (categories && !categories.includes(preset.category)) continue;
    if (result.length >= 100) break;
    if (!result.some((a) => a.name.toLowerCase() === preset.name.toLowerCase()))
      result.push({
        ...preset,
        id: result.some((a) => a.id === preset.id)
          ? crypto.randomUUID()
          : preset.id,
      });
  }
  return result;
}
