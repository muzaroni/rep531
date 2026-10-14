import { Check } from "lucide-react";
import { activeCyclePlan } from "../domain/calendar";
import { names, type AppState } from "../domain/model";
import { workoutInPreferredUnits } from "../domain/workoutUnits";
import { LiftIcon } from "./LiftIcon";

const weekLabels = ["5+ reps", "3+ reps", "1+ reps"];

export function ActiveCycleCard({
  state,
  editProgram,
}: {
  state: AppState;
  editProgram: () => void;
}) {
  const plan = activeCyclePlan(state);
  const lifts = state.settings.order;

  return (
    <section className="panel active-cycle-card" aria-label="Active cycle">
      <div className="active-cycle-heading">
        <div>
          <h2>Active cycle</h2>
          <small>Cycle {state.cycle} · Top sets in {state.settings.units}</small>
        </div>
        <button className="text-button" onClick={editProgram}>Edit</button>
      </div>
      <table className="active-cycle-table">
        <thead><tr>
          <th scope="col"><span className="sr-only">Week</span></th>
          {lifts.map((lift) => (
            <th scope="col" key={lift} title={names[lift]}>
              <span className="sr-only">{names[lift]}</span>
              <LiftIcon lift={lift} size={25} />
            </th>
          ))}
        </tr></thead>
        <tbody>
          {plan.map(({ week, slots }) => (
            <tr key={week} data-current={Math.floor(state.position / 4) + 1 === week}>
              <th scope="row">{weekLabels[week - 1]}</th>
              {slots.map((slot) => {
                const workout = workoutInPreferredUnits(slot.workout, state.settings);
                const topSet = workout.sets.filter((set) => set.kind === "working").at(-1);
                const status = slot.status === "completed" ? "Completed" : slot.status === "in progress" ? "In progress" : "Planned";
                return (
                  <td key={slot.lift} data-status={slot.status}>
                    <span aria-label={`${names[slot.lift]}, week ${week}: ${topSet?.weight ?? "—"} ${workout.units}, ${status}`}>
                      {topSet?.weight ?? "—"}
                      {slot.status === "completed" && <Check size={13} aria-hidden="true" />}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
