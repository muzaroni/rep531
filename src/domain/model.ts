import { accessoryPresets } from "./accessories";
import { z } from "zod";
export const lifts = ["squat", "bench", "deadlift", "press"] as const;
export type Lift = (typeof lifts)[number];
export const names: Record<Lift, string> = {
  squat: "Squat",
  bench: "Bench press",
  deadlift: "Deadlift",
  press: "Overhead press",
};
const positive = z.number().finite().positive().max(10000);
const nonnegative = z.number().finite().min(0).max(10000);
const liftSchema = z.enum(lifts);
const triple = z.tuple([
  positive.max(150),
  positive.max(150),
  positive.max(150),
]);
const maxes = z.object({
  squat: positive,
  bench: positive,
  deadlift: positive,
  press: positive,
});
export const categories = ["push", "pull", "legs", "abs"] as const;
export const categoryNames = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  abs: "Abs",
};
export type AccessoryCategory = (typeof categories)[number];
export const variantSchema = z.enum(["normal", "swap"]);
export type Variant = z.infer<typeof variantSchema>;
export const equipmentSchema = z
  .object({
    bars: z
      .array(
        z.object({ name: z.string().trim().min(1).max(80), weight: positive }),
      )
      .min(1)
      .max(20),
    barIndex: z.number().int().min(0),
    plates: z.array(positive.min(0.01)).min(1).max(30),
  })
  .refine((e) => e.barIndex < e.bars.length, {
    message: "Selected bar is unavailable",
  });
export type Equipment = z.infer<typeof equipmentSchema>;
export const defaultEquipment = (): Record<"lb" | "kg", Equipment> => ({
  lb: {
    bars: [{ name: "Olympic bar", weight: 45 }],
    barIndex: 0,
    plates: [45, 35, 25, 10, 5, 2.5],
  },
  kg: {
    bars: [{ name: "Olympic bar", weight: 20 }],
    barIndex: 0,
    plates: [25, 20, 10, 5, 2.5],
  },
});
export const accessorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  category: z.enum(categories),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  weight: nonnegative,
});
export const settingsBaseSchema = z.object({
  units: z.enum(["lb", "kg"]),
  accent: z.enum(["lime", "blue", "orange", "starry", "horizon", "pink"]),
  maxes,
  oneRepMaxes: z.object({
    squat: positive.nullable(),
    bench: positive.nullable(),
    deadlift: positive.nullable(),
    press: positive.nullable(),
  }),
  order: z
    .array(liftSchema)
    .length(4)
    .refine((v) => new Set(v).size === 4),
  days: z.array(z.number().int().min(0).max(6)).length(4),
  percentages: z.tuple([triple, triple, triple, triple]),
  warmup: triple,
  keepScreenAwake: z.boolean().default(true),
  skipWarmups: z.boolean().default(false),
  skipDeload: z.boolean().default(false),
  bbb: z.boolean(),
  bbbPercent: positive.max(150),
  rounding: positive,
  loadRounding: z.enum(["nearest", "up", "down"]).default("nearest"),
  equipment: z.object({ lb: equipmentSchema, kg: equipmentSchema }),
  cycleVariants: z.record(z.string().regex(/^[1-9]\d*$/), variantSchema),
  rest: z.object({
    warmup: z.number().int().min(0).max(3600),
    working: z.number().int().min(0).max(3600),
    bbb: z.number().int().min(0).max(3600),
  }),
  chime: z.number().int().min(0).max(7),
  timerAlerts: z
    .object({
      sound: z.boolean(),
      vibration: z.boolean(),
      notifications: z.boolean(),
    })
    .default({ sound: true, vibration: true, notifications: false }),
  autoIncrease: z.boolean(),
  increases: maxes,
  legPresetVersion: z.literal(1).optional(),
  accessoryDefaultsVersion: z.literal(1).optional(),
  accessories: z.array(accessorySchema).max(100),
  accessoryAssignments: z.object({
    squat: z.array(z.string()).max(100),
    bench: z.array(z.string()).max(100),
    deadlift: z.array(z.string()).max(100),
    press: z.array(z.string()).max(100),
  }),
});
export const settingsSchema = settingsBaseSchema
  .refine(
    (s) =>
      new Set(s.accessories.map((a) => a.id)).size === s.accessories.length,
    {
      message: "Duplicate accessory IDs",
    },
  )
  .refine(
    (s) =>
      Object.values(s.accessoryAssignments).every(
        (ids) =>
          new Set(ids).size === ids.length &&
          ids.every((id) => s.accessories.some((a) => a.id === id)),
      ),
    { message: "Accessory selections must reference unique saved exercises" },
  );
export type Settings = z.infer<typeof settingsSchema>;
export const setSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["warmup", "working", "bbb", "accessory"]),
  name: z.string(),
  percent: z.number().min(0).max(150),
  target: z.number().int().min(1).max(100),
  plus: z.boolean(),
  weight: nonnegative,
  reps: z.number().int().min(0).max(1000),
  done: z.boolean(),
  category: z.enum(categories).optional(),
  accessoryId: z.string().min(1).optional(),
});
export type WorkoutSet = z.infer<typeof setSchema>;
export const workoutSchema = z.object({
  id: z.string().min(1),
  lift: liftSchema,
  variant: variantSchema,
  bbbLift: liftSchema,
  bbbTm: positive,
  cycle: z.number().int().positive(),
  week: z.number().int().min(1).max(4),
  date: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().nullable(),
  historyOnly: z.boolean().optional(),
  units: z.enum(["lb", "kg"]),
  tm: positive,
  bar: positive,
  plates: z.array(positive.min(0.01)).min(1).max(30),
  sets: z
    .array(setSchema)
    .min(3)
    .max(2500)
    .refine((sets) => new Set(sets.map((s) => s.id)).size === sets.length, {
      message: "Duplicate set IDs",
    }),
  accessorySetOverrides: z
    .record(
      z.string().min(1),
      z.object({
        count: z.number().int().min(0).max(20),
        position: z.number().int().min(0).max(2500),
        template: setSchema.refine((set) => set.kind === "accessory", {
          message: "Accessory template must be an accessory set",
        }),
      }),
    )
    .optional(),
  notes: z.string().max(10000),
});
export type Workout = z.infer<typeof workoutSchema>;
export const stateBaseSchema = z.object({
  schemaVersion: z.literal(3),
  settings: settingsSchema,
  cycle: z.number().int().positive(),
  position: z.number().int().min(0).max(15),
  initialSetupComplete: z.boolean().optional(),
  cycleSetup: z
    .object({
      cycle: z.number().int().positive(),
      previousMaxes: maxes,
      units: z.enum(["lb", "kg"]),
      confirmed: z.boolean(),
    })
    .optional(),
  active: workoutSchema.nullable(),
  pastWorkout: workoutSchema.nullable().optional(),
  history: z.array(workoutSchema),
  cardio: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string().date(),
      name: z.string().trim().min(1).max(80),
      minutes: positive.max(10080),
      notes: z.string().max(10000),
    }),
  ),
});
export const stateSchema = stateBaseSchema.superRefine((s, ctx) => {
  const ids = [
    ...s.history.map((w) => w.id),
    ...s.cardio.map((c) => c.id),
    ...(s.active ? [s.active.id] : []),
    ...(s.pastWorkout ? [s.pastWorkout.id] : []),
  ];
  if (new Set(ids).size !== ids.length)
    ctx.addIssue({ code: "custom", message: "Duplicate record IDs" });
  if (s.history.some((w) => !w.completedAt))
    ctx.addIssue({
      code: "custom",
      message: "History contains unfinished workouts",
    });
  if (s.active?.completedAt)
    ctx.addIssue({
      code: "custom",
      message: "Active workout is already completed",
    });
  if (s.pastWorkout?.completedAt)
    ctx.addIssue({
      code: "custom",
      message: "Past workout draft is already completed",
    });
  if (
    s.active &&
    (s.active.cycle !== s.cycle ||
      s.active.week !== Math.floor(s.position / 4) + 1)
  )
    ctx.addIssue({
      code: "custom",
      message: "Active workout does not match cycle progress",
    });
});
export type AppState = z.infer<typeof stateSchema>;
export const defaults = (): AppState => ({
  schemaVersion: 3,
  initialSetupComplete: false,
  cycle: 1,
  position: 0,
  active: null,
  pastWorkout: null,
  history: [],
  cardio: [],
  settings: {
    units: "lb",
    accent: "horizon",
    maxes: { squat: 225, bench: 135, deadlift: 275, press: 95 },
    oneRepMaxes: { squat: null, bench: null, deadlift: null, press: null },
    order: [...lifts],
    days: [1, 2, 4, 5],
    percentages: [
      [65, 75, 85],
      [70, 80, 90],
      [75, 85, 95],
      [40, 50, 60],
    ],
    warmup: [40, 50, 60],
    keepScreenAwake: true,
    skipWarmups: false,
    skipDeload: false,
    bbb: true,
    bbbPercent: 50,
    rounding: 5,
    loadRounding: "nearest",
    equipment: defaultEquipment(),
    cycleVariants: {},
    rest: { warmup: 60, working: 180, bbb: 90 },
    chime: 4,
    timerAlerts: { sound: true, vibration: true, notifications: false },
    autoIncrease: false,
    increases: { squat: 10, bench: 5, deadlift: 10, press: 5 },
    legPresetVersion: 1,
    accessoryDefaultsVersion: 1,
    accessories: [
      ...accessoryPresets(),
      {
        id: "abs",
        name: "Hanging leg raise",
        category: "abs",
        sets: 5,
        reps: 10,
        weight: 0,
      },
    ],
    accessoryAssignments: {
      squat: ["abs"],
      bench: ["lat"],
      deadlift: [],
      press: [],
    },
  },
});
