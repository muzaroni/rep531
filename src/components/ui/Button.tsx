import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "text" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", className = "", type = "button", ...props },
    ref,
  ) {
    const variantClass =
      variant === "text"
        ? "text-button"
        : variant === "icon"
          ? "icon-button"
          : variant;
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={`${variantClass} ${className}`.trim()}
      />
    );
  },
);
