import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";

type BackScreen = { key: string; depth: number; back: () => boolean | void };
const BackContext = createContext<(screen: BackScreen) => () => void>(
  () => () => {},
);

// Nested screens register their own back action without changing persisted data.
export function useBackScreen(
  key: string,
  depth: number,
  back: () => boolean | void,
  enabled = true,
) {
  const register = useContext(BackContext);
  const action = useRef(back);
  action.current = back;
  useEffect(
    () =>
      enabled
        ? register({ key, depth, back: () => action.current() })
        : undefined,
    [register, key, depth, enabled],
  );
}

export function BackNavigation({
  screen,
  children,
}: {
  screen: BackScreen;
  children: ReactNode;
}) {
  const [nested, setNested] = useState<BackScreen[]>([]);
  const [distance, setDistance] = useState(0);
  const [revision, setRevision] = useState(0);
  const register = useCallback((entry: BackScreen) => {
    setNested((entries) => [...entries, entry]);
    return () =>
      setNested((entries) => entries.filter((item) => item !== entry));
  }, []);
  const current = useRef(screen);
  current.current = [...nested, screen].sort((a, b) => b.depth - a.depth)[0];
  const session = useRef(crypto.randomUUID());
  const stack = useRef<{ key: string; depth: number }[]>([]);
  const index = useRef(0);
  const ignorePop = useRef(false);
  const lastKey = useRef("");
  const rootKey = useRef(screen.key);
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => { history.scrollRestoration = previous; };
  }, []);
  useEffect(() => {
    if (rootKey.current !== screen.key) window.scrollTo(0, 0);
    rootKey.current = screen.key;
  }, [screen.key]);
  const marker = (position: number) => ({
    ...history.state,
    rep531Back: { session: session.current, index: position },
  });

  useEffect(() => {
    if (ignorePop.current) return;
    const entry = current.current;
    if (!stack.current.length) {
      stack.current = [{ key: entry.key, depth: entry.depth }];
      history.replaceState(marker(0), "");
    } else if (entry.key !== lastKey.current) {
      const previous = stack.current[index.current];
      if (entry.depth > previous.depth) {
        stack.current = stack.current.slice(0, index.current + 1);
        stack.current.push({ key: entry.key, depth: entry.depth });
        index.current++;
        history.pushState(marker(index.current), "");
      } else if (entry.depth < previous.depth) {
        const target = stack.current
          .slice(0, index.current)
          .map((item) => item.depth)
          .lastIndexOf(entry.depth);
        if (target >= 0) {
          ignorePop.current = true;
          history.go(target - index.current);
          index.current = target;
        }
        stack.current[index.current] = { key: entry.key, depth: entry.depth };
      } else {
        stack.current[index.current] = { key: entry.key, depth: entry.depth };
        history.replaceState(marker(index.current), "");
      }
    }
    lastKey.current = entry.key;
  }, [screen.key, screen.depth, nested, revision]);

  useEffect(() => {
    const modal = () =>
      document.querySelector(
        'dialog[open], [role="dialog"][data-state="open"]',
      );
    const pop = (event: PopStateEvent) => {
      setDistance(0);
      if (ignorePop.current) {
        ignorePop.current = false;
        history.replaceState(marker(index.current), "");
        setRevision((value) => value + 1);
        return;
      }
      const destination = event.state?.rep531Back;
      if (destination?.session !== session.current) return;
      const previous = index.current;
      if (destination.index >= previous) {
        // Forward must not resurrect discarded editing drafts.
        if (destination.index > previous) {
          ignorePop.current = true;
          history.go(previous - destination.index);
        }
        return;
      }
      if (current.current.depth === 0) return;
      index.current = destination.index;
      let accepted: boolean | void = false;
      const openModal = modal();
      if (openModal) {
        if (openModal instanceof HTMLDialogElement)
          openModal.dispatchEvent(new Event("cancel", { cancelable: true }));
        else
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          );
      } else accepted = current.current.back();
      if (accepted === false) {
        ignorePop.current = true;
        index.current = previous;
        history.go(previous - destination.index);
      }
    };
    let start: { x: number; y: number; locked: boolean } | null = null;
    const touchStart = (event: TouchEvent) => {
      start = null;
      if (event.touches.length !== 1 || current.current.depth === 0 || modal())
        return;
      const touch = event.touches[0];
      const target = event.target instanceof Element ? event.target : null;
      if (
        touch.clientX > 28 ||
        target?.closest(
          'input, textarea, select, button, a, [draggable="true"], [role="dialog"], .chart-explorer, .overview-week, .monthly-calendar-card',
        )
      )
        return;
      start = { x: touch.clientX, y: touch.clientY, locked: false };
    };
    const move = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) {
        start = null;
        setDistance(0);
        return;
      }
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (!start.locked && Math.abs(dy) > 12 && Math.abs(dy) > dx) {
        start = null;
        setDistance(0);
        return;
      }
      if (dx > 12 && dx > Math.abs(dy) * 1.5) start.locked = true;
      if (start.locked) {
        if (event.cancelable) event.preventDefault();
        setDistance(Math.max(0, Math.min(110, dx)));
      }
    };
    const end = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const complete =
        start &&
        touch &&
        start.locked &&
        touch.clientX - start.x >= 80 &&
        Math.abs(touch.clientY - start.y) < 60;
      start = null;
      setDistance(0);
      if (complete) history.back();
    };
    const cancel = () => {
      start = null;
      setDistance(0);
    };
    window.addEventListener("popstate", pop);
    document.addEventListener("touchstart", touchStart, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", cancel);
    return () => {
      window.removeEventListener("popstate", pop);
      document.removeEventListener("touchstart", touchStart);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", cancel);
    };
  }, []);
  return (
    <BackContext.Provider value={register}>
      {children}
      {distance > 0 &&
        createPortal(
          <div
            className="swipe-back-indicator"
            aria-hidden="true"
            style={{
              opacity: Math.min(1, distance / 80),
              transform: `translateX(${Math.min(32, distance / 3) - 12}px)`,
            }}
          >
            <ChevronLeft size={20} />
          </div>,
          document.body,
        )}
    </BackContext.Provider>
  );
}
