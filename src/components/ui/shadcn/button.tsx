// Adapted from shadcn/ui Button; REP531 aliases retain existing call sites.
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-0 bg-primary px-3 py-2 text-primary-foreground hover:brightness-110",
        primary: "primary",
        secondary: "secondary",
        destructive: "danger-button border border-solid px-3 py-2",
        outline:
          "border border-solid border-input bg-background px-3 py-2 text-primary hover:bg-accent",
        ghost: "border-0 bg-transparent px-2 py-2 text-primary hover:bg-accent",
        text: "text-button",
        icon: "icon-button",
      },
      size: { default: "", icon: "h-11 w-11 p-0", sm: "min-h-11 px-2" },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(function Button(
  { className, variant, size, asChild = false, type = "button", ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});
