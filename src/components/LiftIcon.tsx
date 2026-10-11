import type { Lift } from "../domain/model";

// Original rounded-outline movement pictograms. Adjacent text supplies the name.
export function LiftIcon({ lift, size = 22 }: { lift: Lift; size?: number }) {
  return (
    <svg
      className="lift-icon"
      data-lift={lift}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {lift === "squat" && (
        <>
          <circle cx="27" cy="8" r="3.2" />
          <circle cx="12" cy="11" r="6.5" />
          <circle cx="12" cy="11" r="1.5" />
          <path d="M19 11h4m1 2-6 8 10-1c3 0 4 2 3 5l-6 10c-1 2-4 2-4 0l4-9-8 2c-4 1-6-2-4-5l5-7" />
        </>
      )}
      {lift === "bench" && (
        <>
          <circle cx="7" cy="22" r="3.2" />
          <circle cx="17" cy="7" r="5.5" />
          <circle cx="17" cy="7" r="1.3" />
          <path d="M14 14v7m6-7v7M12 21h10l9 2c2 0 3 2 3 4v7c0 3-4 3-4 0v-7H12M3 28h23M6 28v7m18-7v7" />
        </>
      )}
      {lift === "deadlift" && (
        <>
          <circle cx="20" cy="5.5" r="3.2" />
          <path d="M12 22v-7c0-3 2-4 4-4h8c2 0 4 1 4 4v7M16 16v6m8-6v6M16 28v8h-2m10-8v8h2M4 24h32M5 19v10m30-10v10" />
        </>
      )}
      {lift === "press" && (
        <>
          <circle cx="20" cy="13" r="3" />
          <path d="M4 6h32M7 2v8m5-6v5m16-5v5m5-7v8M14 7v7l1 4h10l1-4V7M15 18v18h3V27h4v9h3V18" />
        </>
      )}
    </svg>
  );
}
