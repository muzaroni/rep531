// Composable shadcn/ui Dialog primitives backed by Radix focus management.
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="settings-ui-dialog-overlay" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn("settings-ui-dialog", className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
