import { Activity } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { calendarDate } from "../domain/calendar";
import { names, lifts, type AppState } from "../domain/model";
import { progression } from "../domain/calculations";
export function ProgressCard({ state }: { state: AppState }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const programmaticScroll = useRef(false);
  const drag = useRef<{ x: number; scroll: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(320);
  const [scrollLeft, setScrollLeft] = useState(0);
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
  const points = series
    .flatMap((item) =>
      item.points.map((point, index) => ({
        ...point,
        lift: item.lift,
        color: item.color,
        key: `${item.lift}:${point.date}:${point.value}:${index}`,
      })),
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const hasPoints = points.length > 0;
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setViewportWidth(element.clientWidth),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasPoints]);
  const matchedIndex = points.findIndex((point) => point.key === selectedKey);
  const selectedIndex = matchedIndex < 0 ? 0 : matchedIndex;
  const selected = points[selectedIndex];
  const times = points.map((point) => Date.parse(point.date));
  const first = points.length ? Math.min(...times) : 0;
  const last = points.length ? Math.max(...times) : 0;
  const max = Math.max(...points.map((point) => point.value), 1) * 1.1;
  const chartWidth = Math.max(
    viewportWidth,
    new Set(points.map((point) => calendarDate(point.date))).size * 64,
    360,
  );
  const x = (date: string) =>
    first === last
      ? chartWidth / 2
      : 44 + ((Date.parse(date) - first) / (last - first)) * (chartWidth - 68);
  const y = (value: number) => 200 - (value / max) * 170;
  const inspect = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const matrix = svg.getScreenCTM();
    if (!matrix || !points.length) return;
    const position = new DOMPoint(clientX, clientY).matrixTransform(
      matrix.inverse(),
    );
    const nearest = points.reduce((best, point) =>
      Math.hypot(x(point.date) - position.x, y(point.value) - position.y) <
      Math.hypot(x(best.date) - position.x, y(best.value) - position.y)
        ? point
        : best,
    );
    setSelectedKey(nearest.key);
  };
  const select = (index: number) => {
    const point = points[index];
    if (!point) return;
    programmaticScroll.current = true;
    setSelectedKey(point.key);
    scroller.current?.scrollTo({ left: x(point.date) - viewportWidth / 2 });
  };
  return (
    <section className="panel chart-panel">
      <div className="section-heading">
        <div>
          <h2>Estimated 1RM</h2>
        </div>
      </div>
      <div className="chart-legend" aria-label="Lift legend">
        {series.map((item) => (
          <div key={item.lift}>
            <button
              className="chart-lift-button"
              disabled={!item.points.length}
              aria-label={`Inspect ${names[item.lift]} estimates`}
              aria-pressed={selected?.lift === item.lift}
              onClick={() =>
                select(points.map((point) => point.lift).lastIndexOf(item.lift))
              }
            >
              <span className="chart-series-name">
                <svg width="12" height="8" viewBox="0 0 24 8" aria-hidden="true">
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
                {{ squat: "Squat", bench: "Bench", deadlift: "Deadlift", press: "OHP" }[item.lift]}
              </span>
              <strong style={{ color: item.color }}>
                {item.points.length
                  ? `${item.points.at(-1)!.value.toFixed(1)} ${state.settings.units}`
                  : "No sessions"}
              </strong>
            </button>
          </div>
        ))}
      </div>
      {points.length ? (
        <>
          <div className="chart-explorer">
            <div
              className="chart-scroll"
              ref={scroller}
              tabIndex={0}
              role="group"
              aria-label="Explore estimated 1RM chart. Scroll through dates or use left and right arrow keys."
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  select(
                    Math.max(
                      0,
                      Math.min(
                        points.length - 1,
                        selectedIndex + (event.key === "ArrowLeft" ? -1 : 1),
                      ),
                    ),
                  );
                }
              }}
              onScroll={(event) => {
                const left = event.currentTarget.scrollLeft;
                setScrollLeft(left);
                const center = left + viewportWidth / 2;
                const nearest = points.reduce((best, point) =>
                  Math.abs(x(point.date) - center) <
                  Math.abs(x(best.date) - center)
                    ? point
                    : best,
                );
                if (!programmaticScroll.current) setSelectedKey(nearest.key);
              }}
              onWheel={() => {
                programmaticScroll.current = false;
              }}
              onPointerDown={(event) => {
                programmaticScroll.current = false;
                if (event.pointerType === "mouse" && event.button === 0) {
                  drag.current = {
                    x: event.clientX,
                    scroll: event.currentTarget.scrollLeft,
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
              onPointerMove={(event) => {
                if (drag.current)
                  event.currentTarget.scrollLeft =
                    drag.current.scroll + drag.current.x - event.clientX;
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <svg
                role="img"
                aria-label={`Main lift estimated one rep max progression in ${state.settings.units}. ${series.map((item) => `${names[item.lift]}: ${item.points.length ? item.points.map((point) => `${calendarDate(point.date)} ${point.value.toFixed(1)} ${state.settings.units}`).join(", ") : "No sessions"}`).join(". ")}`}
                className="chart combined-chart"
                viewBox={`0 0 ${chartWidth} 230`}
                style={{ width: chartWidth, height: 230 }}
                onPointerDown={(event) =>
                  inspect(event.clientX, event.clientY, event.currentTarget)
                }
                onPointerMove={(event) => {
                  if (!drag.current)
                    inspect(event.clientX, event.clientY, event.currentTarget);
                }}
                onClick={(event) =>
                  inspect(event.clientX, event.clientY, event.currentTarget)
                }
              >
                {[0, 0.5, 1].map((fraction) => (
                  <g key={fraction}>
                    <line
                      x1="44"
                      x2={chartWidth - 24}
                      y1={y(max * fraction)}
                      y2={y(max * fraction)}
                      stroke="currentColor"
                      opacity="0.15"
                    />
                    <text
                      x="36"
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
                <line
                  x1={x(selected.date)}
                  x2={x(selected.date)}
                  y1="24"
                  y2="200"
                  stroke={selected.color}
                  opacity="0.5"
                  strokeDasharray="3 5"
                  pointerEvents="none"
                />
                <rect
                  x={x(selected.date) - 9}
                  y={y(selected.value) - 9}
                  width="18"
                  height="18"
                  rx="9"
                  fill="none"
                  stroke={selected.color}
                  strokeWidth="2"
                  pointerEvents="none"
                />
              </svg>
              <div
                className="chart-caption chart-timeline"
                style={{ width: chartWidth }}
              >
                <span>{new Date(first).toLocaleDateString()}</span>
                <span>{new Date(last).toLocaleDateString()}</span>
              </div>
            </div>
            <div
              className="chart-tooltip"
              role="status"
              aria-live="polite"
              aria-label="Selected estimate"
              style={{
                left: Math.max(
                  8,
                  Math.min(
                    viewportWidth - Math.min(200, viewportWidth - 16) - 8,
                    x(selected.date) - scrollLeft + 12,
                  ),
                ),
              }}
            >
              <time dateTime={calendarDate(selected.date)}>
                {new Date(selected.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              {points
                .filter(
                  (point) =>
                    calendarDate(point.date) === calendarDate(selected.date),
                )
                .map((point) => (
                  <div key={point.key}>
                    <span>
                      <i style={{ background: point.color }} />
                      {names[point.lift]}
                    </span>
                    <strong>
                      {point.value.toFixed(1)} {state.settings.units}
                    </strong>
                  </div>
                ))}
            </div>
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
