import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, RotateCcw, Square } from "lucide-react";
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
        className="timer-clock"
        role="timer"
        aria-label="Rest timer"
        aria-live="off"
      >
        <div>
          <strong>{timerClock(left)}</strong>
          <small>
            {timer?.completed
              ? "DONE"
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
          {
            <>
              <button
                className="secondary"
                disabled={timer.completed}
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
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
              </button>
              <button
                className="secondary"
                aria-label="Add 15 seconds"
                onClick={controller.extend}
                disabled={timer.completed || timer.totalSeconds >= 86400}
              >
                +15
              </button>
              <button
                className="secondary"
                aria-label="Subtract 15 seconds"
                onClick={controller.shorten}
                disabled={timer.completed || left <= 1}
              >
                −15
              </button>
            </>
          }
          <button
            className="secondary"
            aria-label="Restart timer"
            onClick={controller.restart}
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
          <button
            className="timer-stop"
            aria-label="Stop timer"
            onClick={controller.stop}
          >
            <Square size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="timer-progress" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
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
  return createPortal(
    <section
      className="timer-sheet"
      role="dialog"
      aria-label="Rest timer controls"
      style={{ transform: `translateY(${offset}px)` }}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      <div className="timer-sheet-heading">
        <button
          className="timer-drag-handle"
          aria-label="Dismiss timer"
          title="Tap the countdown or pull down to hide · Timer keeps running"
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
          <span className="sr-only">Hide rest timer</span>
        </button>
      </div>
      <TimerDisplay controller={controller} />
    </section>,
    document.body,
  );
}
