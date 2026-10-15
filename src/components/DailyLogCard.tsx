import { Activity, Dumbbell, ArrowUpRight } from "lucide-react";
import { names, type AppState, type Workout } from "../domain/model";
import { LiftIcon } from "./LiftIcon";
export function DailyLogCard({
  state,
  open,
}: {
  state: AppState;
  open: (workout: Workout) => void;
}) {
  return (
    <section className="panel daily-log-card" aria-label="Daily log">
      <div className="section-heading">
        <h2>Daily log</h2>
        <span className="muted-label">
          {state.history.length} WORKOUTS · {state.cardio.length} CARDIO
        </span>
      </div>
      {!state.history.length && !state.cardio.length && (
        <div className="panel empty">
          <Dumbbell size={28} />
          <h3>A clean slate.</h3>
          <p>Your completed sessions will appear here.</p>
        </div>
      )}
      <div className="history-list">
        {[
          ...state.history.map((w) => ({ date: w.date, id: w.id, w })),
          ...state.cardio.map((c) => ({ date: c.date, id: c.id, c })),
        ]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((item) =>
            "w" in item ? (
              <button
                className="panel history-row"
                key={item.id}
                onClick={() => open(item.w)}
              >
                <div className="log-icon">
                  <LiftIcon lift={item.w.lift} />
                </div>
                <div>
                  <strong>{names[item.w.lift]}</strong>
                  <small>
                    Cycle {item.w.cycle} · Week {item.w.week} ·{" "}
                    {item.w.sets.length} sets
                  </small>
                </div>
                <time>
                  {new Date(item.w.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <ArrowUpRight size={20} />
              </button>
            ) : (
              <div className="panel history-row" key={item.id}>
                <div className="log-icon">
                  <Activity size={21} />
                </div>
                <div>
                  <strong>{item.c.name}</strong>
                  <small>
                    {item.c.minutes} minutes
                    {item.c.notes ? ` · ${item.c.notes}` : ""}
                  </small>
                </div>
                <time>{item.c.date}</time>
              </div>
            ),
          )}
      </div>
    </section>
  );
}
