import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, LoaderCircle } from "lucide-react";

export function SaveToast({
  status,
  className = "",
  success = "Saved",
}: {
  status: string;
  className?: string;
  success?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
    if (
      status === "Saving…" ||
      /not saved|valid number|failed|Could not/i.test(status)
    )
      return;
    const timeout = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [status]);
  return createPortal(
    <div
      className={`save-toast ${className}`}
      role="status"
      aria-live="polite"
      hidden={!visible}
    >
      {status === "Saving…" ? (
        <LoaderCircle className="save-spinner" size={16} aria-hidden="true" />
      ) : status === success ? (
        <Check size={16} aria-hidden="true" />
      ) : null}
      <span>{status}</span>
    </div>,
    document.body,
  );
}
