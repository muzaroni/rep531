import { calendarDate } from "../domain/calendar";
import { type AppState, names } from "../domain/model";
import { workoutInPreferredUnits } from "../domain/workoutUnits";
const clean = (text: string) => text.replace(/[\r\n|]/g, " ");
export function exportMarkdown(state: AppState) {
  const lines = [
    "# REP531 training history",
    `Exported: ${new Date().toISOString()}`,
    "",
    `Current cycle: ${state.cycle} · Week ${Math.floor(state.position / 4) + 1}`,
    "",
  ];
  for (const original of state.history) {
    const w = workoutInPreferredUnits(original, state.settings);
    lines.push(
      `## ${calendarDate(w.date)} · ${names[w.lift]}`,
      `Cycle ${w.cycle}, week ${w.week} · TM ${w.tm} ${w.units}`,
      `Variation: ${w.variant === "swap" ? "BBB Swap" : "Normal BBB"} · BBB: ${names[w.bbbLift]} (TM ${w.bbbTm} ${w.units})`,
      "",
      "| Exercise | Set | Weight | Reps | Complete |",
      "| --- | --- | --- | --- | --- |",
    );
    w.sets.forEach((s) =>
      lines.push(
        `| ${clean(s.name)} | ${s.kind} | ${s.weight} ${w.units} | ${s.reps}${s.plus ? "+ target" : ""} | ${s.done ? "Yes" : "No"} |`,
      ),
    );
    if (w.notes) lines.push("", clean(w.notes));
    lines.push("");
  }
  lines.push("## Cardio", "");
  for (const c of state.cardio)
    lines.push(
      `- ${c.date}: ${clean(c.name)} · ${c.minutes} min${c.notes ? ` · ${clean(c.notes)}` : ""}`,
    );
  return lines.join("\n");
}
