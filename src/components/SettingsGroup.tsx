import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
export type SettingsSection =
  "appearance" | "maxes" | "program" | "equipment" | "data";

export function SettingsGroup({
  id,
  title,
  summary,
  open,
  toggle,
  children,
}: {
  id: SettingsSection;
  title: string;
  summary: string;
  open: boolean;
  toggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="panel settings-group" data-section={id}>
      <h2>
        <button
          className="settings-group-toggle"
          aria-label={title}
          aria-expanded={open}
          aria-controls={`settings-${id}`}
          onClick={toggle}
        >
          <span>
            <strong>{title}</strong>
            <small>{summary}</small>
          </span>
          <ChevronDown size={20} className={open ? "expanded" : ""} />
        </button>
      </h2>
      <div
        id={`settings-${id}`}
        className="settings-group-content"
        hidden={!open}
      >
        {children}
      </div>
    </section>
  );
}
