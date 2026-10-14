import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Button } from "./button";
import { calendarDate } from "../../../domain/calendar";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange" | "max"
> & {
  value?: string;
  defaultValue?: string;
  max?: string;
  onChange?: (value: string) => void;
};
function localDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return calendarDate(date) === value ? date : undefined;
}
export function DatePicker({
  value,
  defaultValue = "",
  onChange,
  max,
  disabled,
  ...props
}: Props) {
  const [localValue, setLocalValue] = useState(value ?? defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const current = localValue;
  const selected = localDate(current);
  const latest = max ? localDate(max) : undefined;
  useEffect(() => {
    if (value !== undefined) setLocalValue(value);
  }, [value]);
  useEffect(() => {
    const date = localDate(current);
    inputRef.current?.setCustomValidity(
      current && !date
        ? "Enter a valid date as YYYY-MM-DD."
        : date && latest && date > latest
          ? "Choose a date on or before " + max + "."
          : "",
    );
  }, [current, max]);
  const change = (next: string) => {
    const date = localDate(next);
    if (value !== undefined && date && latest && date > latest) {
      onChange?.(next);
      setLocalValue(value);
      return;
    }
    setLocalValue(next);
    if (localDate(next)) onChange?.(next);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="date-picker-field">
        <Input
          {...props}
          ref={inputRef}
          type="text"
          value={current}
          disabled={disabled}
          placeholder="YYYY-MM-DD"
          autoComplete="off"
          onBlur={(event) => {
            if (!localDate(current) && value !== undefined)
              setLocalValue(value);
            props.onBlur?.(event);
          }}
          onChange={(event) => change(event.target.value)}
        />
        <Popover.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="date-picker-trigger"
            disabled={disabled}
            aria-label="Choose date"
          >
            <CalendarDays size={18} aria-hidden="true" />
          </Button>
        </Popover.Trigger>
      </div>
      <Popover.Content
        className="date-picker-popover"
        align="end"
        sideOffset={6}
        collisionPadding={1}
        aria-label="Choose date"
        onEscapeKeyDown={(event) => event.stopPropagation()}
      >
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          autoFocus
          disabled={latest ? { after: latest } : undefined}
          onSelect={(date) => {
            if (date) {
              change(calendarDate(date));
              setOpen(false);
            }
          }}
        />
      </Popover.Content>
    </Popover.Root>
  );
}
