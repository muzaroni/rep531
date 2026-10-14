import type { HTMLAttributes, ReactNode } from "react";
import { Label } from "./shadcn/label";

type FieldProps = HTMLAttributes<HTMLLabelElement> & {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({
  label,
  hint,
  children,
  className = "",
  ...props
}: FieldProps) {
  return (
    <Label {...props} className={`field-row ${className}`.trim()}>
      <span>
        {label}
        {hint && <small className="field-hint">{hint}</small>}
      </span>
      {children}
    </Label>
  );
}
