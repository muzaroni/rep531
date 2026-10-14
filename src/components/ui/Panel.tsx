import type { HTMLAttributes } from "react";

export function Panel({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`panel ${className}`.trim()} />;
}
