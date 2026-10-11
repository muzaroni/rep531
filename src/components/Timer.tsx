import { useRef, useState } from "react";
import { X, Play, Pause, RotateCcw, Plus, Square } from "lucide-react";
import type { RestTimerController } from "../hooks/useRestTimer";
import { timerClock } from "../domain/restTimer";
export { chimeNames, playChime, unlockAudio } from "../lib/timerAudio";

export function TimerDisplay({
  controller,
}: {
  controller: RestTimerController;
}) {
  const { timer, left } = controller;
  const progress = timer
    ? Math.min(1, Math.max(0, left / timer.totalSeconds))
    : 0;
  return (
    <div className={`timer-display${timer ? "" : " timer-idle"}`}>
      <div
        className="timer-ring"
        role="timer"
        aria-label="Rest timer"
        aria-live="off"
      >
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <circle className="timer-ring-track" cx="80" cy="80" r="70" />
          <circle
            className="timer-ring-progress"
            cx="80"
            cy="80"
            r="70"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - progress * 100}
          />
        </svg>
        <div>
          <strong>{timerClock(left)}</strong>
          <small>
            {timer?.completed
              ? "REST COMPLETE"
              : timer?.pausedSeconds !== null && timer
                ? "PAUSED"
                : timer
                  ? "REST"
                  : "READY"}
          </small>
        </div>
      </div>
      {timer?.completed && (
        <span role="status" className="sr-only">
          Rest complete. Ready when you are.
        </span>
      )}
      {timer && (
        <div className="timer-controls">
          {!timer.completed && (
            <>
              <button
                className="secondary"
                aria-label={
                  timer.pausedSeconds === null ? "Pause timer" : "Resume timer"
                }
                onClick={
                  timer.pausedSeconds === null
                    ? controller.pause
                    : controller.resume
                }
              >
                {timer.pausedSeconds === null ? (
                  <Pause size={18} />
                ) : (
                  <Play size={18} />
                )}
                {timer.pausedSeconds === null ? "Pause" : "Resume"}
              </button>
              <button
                className="secondary"
                aria-label="Add 30 seconds"
                onClick={controller.extend}
                disabled={timer.totalSeconds >= 86400}
              >
                <Plus size={18} />
                30s
              </button>
            </>
          )}
          <button
            className="secondary"
            aria-label="Restart timer"
            onClick={controller.restart}
          >
            <RotateCcw size={18} />
            Restart
          </button>
          <button
            className="timer-stop"
            aria-label="Stop timer"
            onClick={controller.stop}
          >
            <Square size={17} />
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
export function RestTimer({ controller }: { controller: RestTimerController }) {
  const origin = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  if (!controller.timer || !controller.open) return null;
  const hide = () => {
    controller.setOpen(false);
    setOffset(0);
    origin.current = null;
  };
  return (
    <section
      className="timer-sheet"
      role="dialog"
      aria-label="Rest timer controls"
      style={{ transform: `translateX(-50%) translateY(${offset}px)` }}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      <div className="timer-sheet-heading">
        <h2>Rest timer</h2>
        <button
          className="timer-drag-handle"
          aria-label="Pull down to hide timer"
          title="Pull down to hide · Timer keeps running"
          onClick={hide}
          onPointerDown={(event) => {
            origin.current = event.clientY;
            if (event.nativeEvent.isTrusted)
              event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (origin.current !== null)
              setOffset(Math.max(0, event.clientY - origin.current));
          }}
          onPointerUp={(event) => {
            if (origin.current !== null && event.clientY - origin.current > 60)
              hide();
            origin.current = null;
            setOffset(0);
          }}
          onPointerCancel={() => {
            origin.current = null;
            setOffset(0);
          }}
        >
          <span />
        </button>
        <button
          className="icon-button"
          aria-label="Dismiss timer"
          onClick={hide}
        >
          <X size={20} />
        </button>
      </div>
      <TimerDisplay controller={controller} />
    </section>
  );
}
