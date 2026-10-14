import * as React from "react";
import { cn } from "../../../lib/utils";

export const inputClasses =
  "min-h-11 min-w-0 rounded-md border border-solid border-input bg-[var(--input)] px-3 py-2 text-sm text-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        type === "checkbox" || type === "file" ? "" : inputClasses,
        className,
      )}
      {...props}
    />
  );
});

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function NativeSelect({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      data-slot="native-select"
      className={cn(inputClasses, className)}
      {...props}
    />
  );
});
