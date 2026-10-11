import { BrandIcon } from "./components/BrandIcon";
import { InitialSetup } from "./components/InitialSetup";
import { needsInitialSetup } from "./domain/initialSetup";
import { CycleSetup } from "./components/CycleSetup";
import { needsCycleSetup, startCycle } from "./domain/cycleSetup";
import { useRestTimer } from "./hooks/useRestTimer";
import { timerClock } from "./domain/restTimer";
import { useScreenWakeLock } from "./hooks/useScreenWakeLock";
import { HistoryWorkout } from "./components/HistoryWorkout";
import {
  correctHistoryWorkout,
  discardActiveWorkout,
} from "./domain/workoutCorrections";
import { CardioLogger } from "./components/CardioLogger";
import { syncWorkoutAccessories } from "./domain/workoutAccessories";
import { editableWorkoutsInPreferredUnits } from "./domain/workoutUnits";
import {
  createPastWorkout,
  moveHistoryWorkoutDate,
} from "./domain/pastWorkouts";
import { PastWorkoutSetup } from "./components/PastWorkoutSetup";
import { PastWorkoutEditor } from "./components/PastWorkoutEditor";
import { Overview } from "./components/Overview";
import { useEffect, useRef, useState } from "react";
import {
  Clock3,
  Activity,
  ArrowRight,
  BarChart3,
  ChevronRight,
  Dumbbell,
  LayoutDashboard,
  Settings2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  defaults,
  names,
  stateSchema,
  type AppState,
  type Workout as WorkoutType,
  type WorkoutSet,
} from "./domain/model";
import {
  finishWorkout,
  makeWorkout,
  normalizeCycleProgress,
} from "./domain/calculations";
import {
  download,
  exportBackup,
  fileTimestamp,
  loadState,
  restoreBackup,
  saveState,
} from "./data/storage";
import { exportMarkdown } from "./data/markdown";
import { Settings } from "./components/Settings";
import { Workout } from "./components/Workout";
import { History } from "./components/History";
import { RestTimer } from "./components/Timer";
type Page = "dashboard" | "workout" | "history" | "settings" | "past-workout";
export default function App() {
  const [state, setState] = useState<AppState>(defaults),
    stateRef = useRef(state),
    [ready, setReady] = useState(false),
    [page, setPage] = useState<Page>("dashboard"),
    [saved, setSaved] = useState("Saved on device"),
    [error, setError] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [view, setView] = useState<WorkoutType | null>(null),
    [pastSetup, setPastSetup] = useState<{
      date?: string;
      seed?: WorkoutType;
    } | null>(null),
    [initialSetup, setInitialSetup] = useState(false),
    [cycleSetup, setCycleSetup] = useState(false),
    [cardio, setCardio] = useState(false),
    [install, setInstall] = useState(false);
  useScreenWakeLock(ready && state.settings.keepScreenAwake);
  const timer = useRestTimer(ready, state.settings, state.active);
  useEffect(() => {
    const openTimer = (event: MessageEvent) => {
      if (event.data?.type === "bbb-open-timer") {
        setView(null);
        setPage(stateRef.current.active ? "workout" : "dashboard");
        timer.setOpen(true);
      }
    };
    navigator.serviceWorker?.addEventListener("message", openTimer);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", openTimer);
  }, [timer.setOpen]);
  useEffect(() => {
    if (ready && new URLSearchParams(location.search).get("timer") === "1") {
      setPage(stateRef.current.active ? "workout" : "dashboard");
      timer.setOpen(true);
    }
  }, [ready, timer.setOpen]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.accent;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute(
      "content",
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg")
        .trim(),
    );
  }, [state.settings.accent]);
  useEffect(() => {
    loadState()
      .then((s) => {
        const normalized = editableWorkoutsInPreferredUnits(
          normalizeCycleProgress(s),
        );
        if (normalized !== s) {
          s = normalized;
          void saveState(s).catch(() =>
            setError(
              "Could not save updated workouts. Export a backup and check browser storage.",
            ),
          );
        }
        stateRef.current = s;
        setState(s);
        setInitialSetup(needsInitialSetup(s));
        setReady(true);
      })
      .catch(() =>
        setError(
          "Unable to open your local database. Allow browser storage and reload.",
        ),
      );
    const status = () => setOnline(navigator.onLine);
    window.addEventListener("online", status);
    window.addEventListener("offline", status);
    return () => {
      window.removeEventListener("online", status);
      window.removeEventListener("offline", status);
    };
  }, []);
  const commit = (next: AppState) => {
    next = editableWorkoutsInPreferredUnits(normalizeCycleProgress(next));
    const validated = stateSchema.safeParse(next);
    if (!validated.success) {
      setError(`Could not save: ${validated.error.issues[0].message}`);
      return;
    }
    next = validated.data;
    if (stateRef.current.active && !next.active) timer.stop();
    stateRef.current = next;
    setState(next);
    setSaved("Saving…");
    saveState(next)
      .then(() => {
        if (stateRef.current === next) setSaved("Saved on device");
      })
      .catch(() => {
        setSaved("Save failed");
        setError(
          "Could not save to device. Export a JSON backup now and check browser storage.",
        );
      });
  };
  const backup = () =>
    download(
      exportBackup(stateRef.current),
      `rep531-backup-${fileTimestamp()}.json`,
      "application/json",
    );
  const markdown = () =>
    download(
      exportMarkdown(stateRef.current),
      `rep531-history-${fileTimestamp()}.md`,
      "text/markdown",
    );
  const importFile = async (file: File) => {
    if (file.size > 20_000_000) {
      setError("Backup exceeds 20 MB.");
      return;
    }
    if (
      !confirm(
        "Replace all local settings, history and active workout with this backup? Export your current data first if needed.",
      )
    )
      return;
    try {
      let restored = await restoreBackup(await file.text());
      const normalized = editableWorkoutsInPreferredUnits(
        normalizeCycleProgress(restored),
      );
      if (normalized !== restored) {
        restored = normalized;
        await saveState(restored);
      }
      stateRef.current = restored;
      setState(restored);
      setInitialSetup(needsInitialSetup(restored));
      timer.stop();
      setView(null);
      setPastSetup(null);
      setCycleSetup(false);
      setPage("dashboard");
      setSaved("Backup restored");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
    }
  };
  const start = () => {
    if (needsInitialSetup(stateRef.current)) {
      setInitialSetup(true);
      return;
    }
    if (needsCycleSetup(stateRef.current)) {
      setCycleSetup(true);
      return;
    }
    const active = state.active
      ? syncWorkoutAccessories(state.active, state.settings, state.settings)
      : makeWorkout(state);
    if (
      !state.active ||
      JSON.stringify(active.sets) !== JSON.stringify(state.active.sets)
    )
      commit({ ...state, active });
    setPage("workout");
    setView(null);
    void navigator.storage?.persist?.();
  };
  const addPastWorkout = (date?: string, seed?: WorkoutType) => {
    setView(null);
    if (state.pastWorkout) {
      setPage("past-workout");
      window.scrollTo(0, 0);
    } else setPastSetup({ date, seed });
  };
  const rest = (kind: WorkoutSet["kind"], setId: string) => {
    const current = stateRef.current;
    const seconds =
      kind === "accessory"
        ? current.settings.rest.bbb
        : current.settings.rest[kind];
    if (seconds)
      timer.start(seconds, {
        workoutId: current.active?.id,
        afterSetId: setId,
      });
    else timer.stop();
  };
  const navigate = (p: Page) => {
    timer.setOpen(false);
    if (p === "workout" && state.active) {
      const active = syncWorkoutAccessories(
        state.active,
        state.settings,
        state.settings,
      );
      if (JSON.stringify(active.sets) !== JSON.stringify(state.active.sets))
        commit({ ...state, active });
    }
    setView(null);
    setPage(p);
    window.scrollTo(0, 0);
  };
  const week = Math.floor(state.position / 4) + 1,
    lift = state.settings.order[state.position % 4];
  if (!ready)
    return (
      <div className="loading">
        <Dumbbell size={36} />
        <h2>Opening your training log…</h2>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  return (
    <div className="app" data-theme={state.settings.accent}>
      <div className="star-field" aria-hidden="true" />
      <header className="topbar">
        <a
          className="brand"
          aria-label="REP531"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-mark">
            <BrandIcon size={104} />
          </span>
          <span className="brand-sub">STRENGTH TRAINING</span>
        </a>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "dashboard", label: "Overview", icon: LayoutDashboard },
              { id: "workout", label: "Workout", icon: Dumbbell },
              { id: "history", label: "History", icon: BarChart3 },
              { id: "settings", label: "Settings", icon: Settings2 },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={
                page === n.id || (n.id === "history" && page === "past-workout")
                  ? "active"
                  : ""
              }
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <span className="local-badge">
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{online ? "LOCAL FIRST" : "OFFLINE"}</span>
          <i />
        </span>
      </header>
      <main>
        {error && (
          <div role="alert" className="error-banner">
            <span>{error}</span>
            <button className="text-button" onClick={backup}>
              Export backup
            </button>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {page === "dashboard" && (
          <Overview
            state={state}
            start={start}
            settings={() => navigate("settings")}
            history={() => navigate("history")}
            cardio={() => setCardio(true)}
            install={() => setInstall(true)}
            addPastWorkout={addPastWorkout}
            openWorkout={(workout) => {
              setView(workout);
              setPage("history");
              window.scrollTo(0, 0);
            }}
          />
        )}
        {page === "workout" &&
          (state.active ? (
            <Workout
              workout={state.active}
              update={(active) => commit({ ...stateRef.current, active })}
              finish={() => {
                try {
                  commit(finishWorkout(stateRef.current));
                  timer.stop();
                  navigate("history");
                } catch (e) {
                  setError(String(e));
                }
              }}
              discard={() => {
                if (
                  !confirm(
                    "Discard this workout and its logged sets? Your cycle progress will stay unchanged.",
                  )
                )
                  return;
                commit(discardActiveWorkout(stateRef.current));
                navigate("dashboard");
              }}
              back={() => navigate("dashboard")}
              onCompleteSet={rest}
            />
          ) : (
            <section className="panel empty">
              <Dumbbell size={36} />
              <h1>
                Ready when you are<span>.</span>
              </h1>
              <p>
                Week {week} · {names[lift]} · {state.settings.maxes[lift]}{" "}
                {state.settings.units} training max
              </p>
              <button className="primary" onClick={start}>
                Start workout <ArrowRight size={19} />
              </button>
            </section>
          ))}
        {page === "history" &&
          (view ? (
            <HistoryWorkout
              key={view.id}
              workout={view}
              settings={state.settings}
              save={(edited) => {
                const next = correctHistoryWorkout(
                  stateRef.current,
                  view.id,
                  edited,
                );
                commit(next);
                setView(
                  next.history.find((workout) => workout.id === view.id)!,
                );
              }}
              changeDate={(date) => {
                const next = moveHistoryWorkoutDate(
                  stateRef.current,
                  view.id,
                  date,
                );
                commit(next);
                setView(
                  next.history.find((workout) => workout.id === view.id)!,
                );
              }}
              back={() => setView(null)}
            />
          ) : (
            <History
              state={state}
              open={setView}
              exportHistory={markdown}
              addPastWorkout={() => addPastWorkout()}
            />
          ))}
        {page === "settings" && (
          <Settings
            state={state}
            commit={commit}
            backup={backup}
            markdown={markdown}
            clearTimer={timer.stop}
            importFile={importFile}
          />
        )}
        {page === "past-workout" && state.pastWorkout && (
          <PastWorkoutEditor
            state={state}
            commit={commit}
            back={() => navigate("history")}
          />
        )}
        <footer>
          <span>
            REP531 <b> / </b> 5/3/1 STRENGTH TRAINING
          </span>
          <span>
            <i className={saved === "Save failed" ? "bad" : ""} />
            {saved}
          </span>
        </footer>
      </main>
      {page === "workout" && timer.timer && !timer.open && (
        <button
          className="secondary timer-reopen"
          aria-label="Open rest timer"
          onClick={() => timer.setOpen(true)}
        >
          <Clock3 size={17} />{" "}
          {timer.timer.completed ? "Rest complete" : timerClock(timer.left)}
        </button>
      )}
      <RestTimer controller={timer} />
      {initialSetup && (
        <InitialSetup
          state={state}
          close={() => setInitialSetup(false)}
          save={(next) => {
            commit(next);
            setInitialSetup(false);
            setPage("dashboard");
          }}
        />
      )}
      {cycleSetup && (
        <CycleSetup
          state={state}
          close={() => setCycleSetup(false)}
          start={(maxes, variant) => {
            const next = startCycle(stateRef.current, maxes, variant);
            commit(next);
            setCycleSetup(false);
            setPage("workout");
            setView(null);
            void navigator.storage?.persist?.();
          }}
        />
      )}
      {pastSetup && (
        <PastWorkoutSetup
          state={state}
          {...pastSetup}
          close={() => setPastSetup(null)}
          create={(input) => {
            const pastWorkout = createPastWorkout(stateRef.current, input);
            commit({ ...stateRef.current, pastWorkout });
            setPastSetup(null);
            setPage("past-workout");
            window.scrollTo(0, 0);
          }}
        />
      )}
      {cardio && (
        <CardioLogger
          lastActivity={state.cardio.at(-1)?.name}
          close={() => setCardio(false)}
          save={(entry) => {
            commit({
              ...stateRef.current,
              cardio: [
                ...stateRef.current.cardio,
                { ...entry, id: crypto.randomUUID() },
              ],
            });
            setCardio(false);
          }}
        />
      )}
      {install && (
        <div className="modal-backdrop">
          <section
            className="panel modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
          >
            <div className="section-heading">
              <h2 id="install-title">Take REP531 to the gym.</h2>
              <button
                className="icon-button"
                aria-label="Close install instructions"
                onClick={() => setInstall(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p>
              <strong>iPhone / iPad</strong>
              <br />
              Open in Safari, tap Share, then Add to Home Screen.
            </p>
            <p>
              <strong>Android</strong>
              <br />
              Open in Chrome, tap the menu, then Install app or Add to Home
              screen.
            </p>
            <p className="subtle">
              Load the production app once while online and wait for “Ready
              offline.” Your workouts will then work without a connection.
              Export backups regularly to protect your log.
            </p>
            <a
              className="text-button"
              href="https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big"
              target="_blank"
              rel="noreferrer"
            >
              About Wendler’s BBB template <ChevronRight size={16} />
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
