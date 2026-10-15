import { Activity } from "lucide-react";
import { calendarDate } from "../domain/calendar";
import { names, lifts, type AppState } from "../domain/model";
import { progression } from "../domain/calculations";
export function ProgressCard({ state }: { state: AppState }) {
  const colors = ["#36b9ff", "#b38aff", "#c4ff24", "#ff9b45"];
  const patterns = ["", "10 5", "3 4", "12 4 3 4"];
  const series = lifts.map((lift, index) => ({
    lift,
    color: colors[index],
    pattern: patterns[index],
    points: progression(state.history, lift, state.settings.units)
      .filter((point) => point.value > 0)
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
  }));
  const points = series.flatMap((item) => item.points);
  const times = points.map((point) => Date.parse(point.date));
  const first = points.length ? Math.min(...times) : 0;
  const last = points.length ? Math.max(...times) : 0;
  const max = Math.max(...points.map((point) => point.value), 1) * 1.1;
  const x = (date: string) =>
    first === last
      ? 320
      : 60 + ((Date.parse(date) - first) / (last - first)) * 520;
  const y = (value: number) => 200 - (value / max) * 170;
  return (
    <section className="panel chart-panel">
      <div className="section-heading">
        <div>
          <h2>Estimated 1RM</h2>
          <p className="subtle">
            Best completed main set · Epley estimate · {state.settings.units}
          </p>
        </div>
      </div>
      <div className="chart-legend" aria-label="Lift legend">
        {series.map((item) => (
          <div key={item.lift}>
            <span className="chart-series-name">
              <svg width="24" height="8" aria-hidden="true">
                <line
                  x1="0"
                  x2="24"
                  y1="4"
                  y2="4"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeDasharray={item.pattern}
                />
              </svg>
              {names[item.lift]}
            </span>
            <strong style={{ color: item.color }}>
              {item.points.length
                ? `${item.points.at(-1)!.value.toFixed(1)} ${state.settings.units}`
                : "No sessions"}
            </strong>
          </div>
        ))}
      </div>
      {points.length ? (
        <>
          <svg
            role="img"
            aria-label={`Main lift estimated one rep max progression in ${state.settings.units}. ${series.map((item) => `${names[item.lift]}: ${item.points.length ? item.points.map((point) => `${calendarDate(point.date)} ${point.value.toFixed(1)} ${state.settings.units}`).join(", ") : "No sessions"}`).join(". ")}`}
            className="chart combined-chart"
            viewBox="0 0 600 230"
          >
            {[0, 0.5, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  x1="60"
                  x2="580"
                  y1={y(max * fraction)}
                  y2={y(max * fraction)}
                  stroke="currentColor"
                  opacity="0.15"
                />
                <text
                  x="48"
                  y={y(max * fraction) + 5}
                  textAnchor="end"
                  fill="currentColor"
                  fontSize="14"
                >
                  {Math.round(max * fraction)}
                </text>
              </g>
            ))}
            {series.map((item) => (
              <g key={item.lift} data-lift={item.lift}>
                <polyline
                  fill="none"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeDasharray={item.pattern}
                  points={item.points
                    .map((point) => `${x(point.date)},${y(point.value)}`)
                    .join(" ")}
                />
                {item.points.map((point, i) => (
                  <circle
                    key={i}
                    cx={x(point.date)}
                    cy={y(point.value)}
                    r="5"
                    fill={item.color}
                  >
                    <title>
                      {names[item.lift]} ·{" "}
                      {new Date(point.date).toLocaleDateString()}:{" "}
                      {point.value.toFixed(1)} {state.settings.units}
                    </title>
                  </circle>
                ))}
              </g>
            ))}
          </svg>
          <div className="chart-caption">
            <span>{new Date(first).toLocaleDateString()}</span>
            <span>{new Date(last).toLocaleDateString()}</span>
          </div>
        </>
      ) : (
        <div className="empty">
          <Activity size={32} />
          <h3>Your progress starts with one session.</h3>
          <p>
            Complete a lifting workout to see all four strength trends here.
          </p>
        </div>
      )}
    </section>
  );
}
