import { useState } from "react";
import { Minus, Plus, GripVertical, LockKeyhole } from "lucide-react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { CycleCalendar } from "./CycleCalendar";
import { ActiveCycleCard } from "./ActiveCycleCard";
import { MonthlyCalendarCard } from "./MonthlyCalendarCard";
import { DailyLogCard } from "./DailyLogCard";
import { ProgressCard } from "./ProgressCard";
import type { AppState, Workout } from "../domain/model";

const cardDefinitions = [
  { id: "week", name: "This week" },
  { id: "cycle", name: "Active cycle" },
  { id: "monthly", name: "Monthly calendar" },
  { id: "daily", name: "Daily log" },
  { id: "progress", name: "Estimated 1RM" },
] as const;
type CardId = (typeof cardDefinitions)[number]["id"];
type Page = "overview" | "history";
const defaultOrder: Record<Page, CardId[]> = {
  overview: ["week", "cycle", "monthly", "daily", "progress"],
  history: ["progress", "monthly", "daily", "week", "cycle"],
};
const permanent = (page: Page, id: CardId) =>
  page === "history" && (id === "progress" || id === "monthly");
function normalizeOrder(page: Page, value: unknown): CardId[] {
  const known = defaultOrder[page];
  const supplied = Array.isArray(value)
    ? value.filter((id): id is CardId => known.includes(id))
    : [];
  const ids = [...new Set([...supplied, ...known])];
  return [
    ...ids.filter((id) => permanent(page, id)),
    ...ids.filter((id) => !permanent(page, id)),
  ];
}
function storageKey(page: Page, id: CardId) {
  if (page === "overview" && id === "week") return "bbb-overview-this-week";
  if (page === "overview" && id === "cycle") return "bbb-overview-active-cycle";
  return `bbb-${page}-card-${id}`;
}
export function useDashboardCards(page: Page) {
  const [visible, setVisible] = useState<CardId[]>(() =>
    cardDefinitions
      .filter((card) => {
        if (permanent(page, card.id)) return true;
        const fallback =
          page === "overview"
            ? card.id === "week"
            : card.id === "daily" || card.id === "progress";
        try {
          const value = localStorage.getItem(storageKey(page, card.id));
          return value === null ? fallback : value === "true";
        } catch {
          return fallback;
        }
      })
      .map((card) => card.id),
  );
  const [order, setOrder] = useState<CardId[]>(() => {
    try {
      return normalizeOrder(
        page,
        JSON.parse(localStorage.getItem(`bbb-${page}-card-order`) ?? "null"),
      );
    } catch {
      return normalizeOrder(page, null);
    }
  });
  const reorder = (from: CardId, to: CardId) => {
    if (from === to || permanent(page, from) !== permanent(page, to)) return;
    setOrder((previous) => {
      const next = [...previous];
      const target = next.indexOf(to);
      next.splice(next.indexOf(from), 1);
      next.splice(target, 0, from);
      try {
        localStorage.setItem(`bbb-${page}-card-order`, JSON.stringify(next));
      } catch {
        /* UI-only preference. */
      }
      return next;
    });
  };
  const toggle = (id: CardId) => {
    if (permanent(page, id)) return;
    const enabled = !visible.includes(id);
    setVisible((previous) =>
      enabled ? [...previous, id] : previous.filter((value) => value !== id),
    );
    try {
      localStorage.setItem(storageKey(page, id), String(enabled));
    } catch {
      /* UI-only preference. */
    }
  };
  return { visible, toggle, order, reorder };
}
export function DashboardCards({
  page,
  state,
  cards,
  pickerOpen,
  closePicker,
  editProgram,
  start,
  openWorkout,
  addPastWorkout,
}: {
  page: Page;
  state: AppState;
  cards: ReturnType<typeof useDashboardCards>;
  pickerOpen: boolean;
  closePicker: () => void;
  editProgram: () => void;
  start: () => void;
  openWorkout: (workout: Workout) => void;
  addPastWorkout: (date?: string, workout?: Workout) => void;
}) {
  const [drag, setDrag] = useState<CardId | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const arranged = cards.order.filter((id) => cards.visible.includes(id));
  const move = (from: CardId, to: CardId) => {
    if (permanent(page, from) !== permanent(page, to)) return;
    cards.reorder(from, to);
    setAnnouncement(
      `${cardDefinitions.find((card) => card.id === from)!.name} moved.`,
    );
  };
  return (
    <>
      <div className="dashboard-cards">
        {cards.order
          .filter((id) => cards.visible.includes(id))
          .map((id) => {
            if (id === "week")
              return (
                <CycleCalendar
                  key={id}
                  state={state}
                  editProgram={editProgram}
                  startWorkout={start}
                  openWorkout={openWorkout}
                  addPastWorkout={addPastWorkout}
                />
              );
            if (id === "cycle")
              return (
                <ActiveCycleCard
                  key={id}
                  state={state}
                  editProgram={editProgram}
                />
              );
            if (id === "monthly")
              return (
                <MonthlyCalendarCard
                  key={id}
                  state={state}
                  openWorkout={openWorkout}
                />
              );
            if (id === "daily")
              return <DailyLogCard key={id} state={state} open={openWorkout} />;
            return <ProgressCard key={id} state={state} />;
          })}
      </div>
      <Dialog
        open={pickerOpen}
        title={page === "overview" ? "Overview cards" : "History cards"}
        onClose={closePicker}
        compact
      >
        <p className="card-picker-hint">
          Drag handles to reorder. Use ↑ / ↓ with a keyboard.
        </p>
        {page === "overview" && (
          <div className="overview-card-option card-picker-fixed">
            <strong>Next workout</strong>
            <span className="card-fixed-label">
              <LockKeyhole size={14} aria-hidden="true" /> Always first
            </span>
          </div>
        )}
        {[
          ...arranged,
          ...cards.order.filter((id) => !cards.visible.includes(id)),
        ].map((id) => {
          const card = cardDefinitions.find((item) => item.id === id)!;
          return (
            <div
              className="overview-card-option"
              key={card.id}
              data-card-id={id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const source =
                  drag ?? (event.dataTransfer.getData("text/plain") as CardId);
                if (arranged.includes(source)) move(source, id);
                setDrag(null);
              }}
            >
              {cards.visible.includes(id) && (
                <button
                  type="button"
                  className="icon-button card-drag-handle"
                  aria-label={`Arrange ${card.name}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", id);
                    event.dataTransfer.effectAllowed = "move";
                    setDrag(id);
                  }}
                  onDragEnd={() => setDrag(null)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                      return;
                    event.preventDefault();
                    const target =
                      arranged[
                        arranged.indexOf(id) +
                          (event.key === "ArrowUp" ? -1 : 1)
                      ];
                    if (target) move(id, target);
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === "touch") {
                      setDrag(id);
                      if (event.nativeEvent.isTrusted)
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }
                  }}
                  onPointerUp={(event) => {
                    if (event.pointerType === "touch" && drag) {
                      const target = document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest<HTMLElement>("[data-card-id]")?.dataset
                        .cardId as CardId | undefined;
                      if (target && arranged.includes(target))
                        move(drag, target);
                      setDrag(null);
                    }
                  }}
                  onPointerCancel={() => setDrag(null)}
                >
                  <GripVertical size={16} aria-hidden="true" />
                </button>
              )}
              <strong>{card.name}</strong>
              {permanent(page, id) ? (
                <span
                  className="card-fixed-label"
                  aria-label="Always shown"
                  title="Always shown at the top"
                >
                  <LockKeyhole size={14} aria-hidden="true" />
                </span>
              ) : (
                <Button
                  variant="icon"
                  aria-label={`${cards.visible.includes(card.id) ? "Remove" : "Add"} ${card.name} card`}
                  onClick={() => cards.toggle(card.id)}
                >
                  {cards.visible.includes(card.id) ? (
                    <Minus size={19} aria-hidden="true" />
                  ) : (
                    <Plus size={19} aria-hidden="true" />
                  )}
                </Button>
              )}
            </div>
          );
        })}
        <span className="sr-only" role="status">
          {announcement}
        </span>
      </Dialog>
    </>
  );
}
