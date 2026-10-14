import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
};

export function Dialog({ open, title, onClose, children, compact = false }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={dialogRef}
      className={`design-dialog${compact ? " design-dialog-compact" : ""}`}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="design-dialog-content">
        {compact ? (
          <div className="design-dialog-heading">
            <h2>{title}</h2>
            <Button variant="icon" aria-label={`Close ${title}`} onClick={onClose}>
              <X size={18} aria-hidden="true" />
            </Button>
          </div>
        ) : <h2>{title}</h2>}
        {children}
        {!compact && <Button onClick={onClose}>Close</Button>}
      </div>
    </dialog>
  );
}
