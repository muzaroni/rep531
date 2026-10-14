import type { ReactNode } from "react";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./ui/shadcn/accordion";
export type SettingsSection =
  "appearance" | "maxes" | "program" | "plates" | "timers" | "data" | "install";

export function SettingsGroup({
  id,
  title,
  open,
  children,
}: {
  id: SettingsSection;
  title: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <AccordionItem
      value={id}
      className="panel settings-group"
      data-section={id}
    >
      <AccordionTrigger aria-label={title}>
        <span>
          <strong>{title}</strong>
        </span>
      </AccordionTrigger>
      <AccordionContent forceMount aria-hidden={!open} inert={!open}>
        <div className="settings-group-clip">
          <div className="settings-group-body">{children}</div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
