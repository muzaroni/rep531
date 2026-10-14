import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../../lib/utils";

export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = AccordionPrimitive.Item;

export function AccordionTrigger({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        className={cn("settings-group-toggle", className)}
        {...props}
      >
        {children}
        <ChevronDown size={18} aria-hidden="true" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className={cn("settings-group-content", className)}
      {...props}
    />
  );
}
