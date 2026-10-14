import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";

// shadcn/ui's Calendar foundation, themed through REP531's shared roles.
export function Calendar(props: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      weekStartsOn={1}
      {...props}
      className="rep-calendar"
    />
  );
}
