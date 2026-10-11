import Dexie, { type Table } from "dexie";
import { defaults, stateSchema, type AppState } from "../domain/model";
import { upgradeState } from "./migration";
export class TrainingDatabase extends Dexie {
  state!: Table<{ id: string; value: AppState }, string>;
  constructor(name = "bbb-training") {
    super(name);
    this.version(1).stores({ state: "id" });
  }
}
export const database = new TrainingDatabase();
export async function loadState(db = database): Promise<AppState> {
  const row = await db.state.get("main");
  if (!row) return defaults();
  const value = upgradeState(row.value);
  if (
    row.value.schemaVersion !== value.schemaVersion ||
    row.value.settings.legPresetVersion !== value.settings.legPresetVersion ||
    row.value.settings.accessoryDefaultsVersion !==
      value.settings.accessoryDefaultsVersion
  )
    await saveState(value, db);
  return value;
}
let pending: Promise<unknown> = Promise.resolve();
export function saveState(value: AppState, db = database): Promise<void> {
  const validated = stateSchema.parse(value);
  const task = pending
    .catch(() => {})
    .then(async () => {
      await db.transaction("rw", db.state, async () => {
        await db.state.put({ id: "main", value: validated });
      });
    });
  pending = task;
  return task;
}
export function exportBackup(state: AppState): string {
  return JSON.stringify(stateSchema.parse(state), null, 2);
}
export function parseBackup(raw: string): AppState {
  if (raw.length > 20_000_000)
    throw new Error("Backup is too large (20 MB maximum).");
  try {
    return upgradeState(JSON.parse(raw));
  } catch {
    throw new Error(
      "Invalid backup. Expected a complete REP531 backup, version 1, 2 or 3. Your existing data has not been changed.",
    );
  }
}
export async function restoreBackup(
  raw: string,
  db = database,
): Promise<AppState> {
  const parsed = parseBackup(raw);
  await saveState(parsed, db);
  return parsed;
}
export function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const fileTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, "-");
