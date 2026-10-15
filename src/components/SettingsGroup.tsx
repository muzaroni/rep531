import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AccordionItem, AccordionTrigger } from "./ui/shadcn/accordion";
export type SettingsSection = "appearance" | "maxes" | "program" | "plates" | "timers" | "data" | "install";

export function SettingsGroup({ id, title, open, children }: {
  id: SettingsSection; title: string; open: boolean; children: ReactNode;
}) {
  const identity = useId();
  const body = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const element = body.current;
    if (!element) return;
    const measure = () => setHeight(element.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <AccordionItem value={id} className="panel settings-group" data-section={id}>
    <AccordionTrigger id={`${identity}-trigger`} aria-controls={`${identity}-content`} aria-label={title}><span><strong>{title}</strong></span></AccordionTrigger>
    <div id={`${identity}-content`} role="region" aria-labelledby={`${identity}-trigger`} className="settings-group-content" data-state={open ? "open" : "closed"} aria-hidden={!open} inert={!open} style={{ height: open ? height : 0 }}>
      <div className="settings-group-clip"><div ref={body} className="settings-group-body">{children}</div></div>
    </div>
  </AccordionItem>;
}
