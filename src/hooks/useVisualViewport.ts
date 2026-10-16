import { useEffect } from "react";

// Safari's keyboard and collapsing browser chrome can move/shrink the visible
// viewport independently of the layout viewport used by fixed-position UI.
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = viewport?.offsetTop ?? 0;
      const height = viewport?.height ?? window.innerHeight;
      root.style.setProperty("--viewport-top", `${top}px`);
      root.style.setProperty("--viewport-height", `${height}px`);
      root.style.setProperty("--viewport-bottom", `${Math.max(0, window.innerHeight - top - height)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pageshow", schedule);
      for (const name of ["--viewport-top", "--viewport-height", "--viewport-bottom"]) root.style.removeProperty(name);
    };
  }, []);
}
