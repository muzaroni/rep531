import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue"
> & {
  value: number | null;
  allowEmpty?: boolean;
};

// Keep incomplete typing separate from the saved numeric value. In particular,
// clearing a required field must never turn it into a persisted zero.
export function NumericInput({
  value,
  allowEmpty = false,
  onChange,
  onBlur,
  onFocus,
  ...props
}: Props) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const focused = useRef(false);
  const emitted = useRef<number | null>(value);
  useEffect(() => {
    if (!focused.current || value !== emitted.current)
      setText(value === null ? "" : String(value));
    emitted.current = value;
  }, [value]);
  return (
    <input
      {...props}
      type="number"
      value={text}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (next === "") {
          if (allowEmpty) {
            emitted.current = null;
            onChange?.(event);
          }
        } else if (Number.isFinite(Number(next))) {
          emitted.current = Number(next);
          onChange?.(event);
        }
      }}
      onBlur={(event) => {
        focused.current = false;
        setText(value === null ? "" : String(value));
        onBlur?.(event);
      }}
    />
  );
}
