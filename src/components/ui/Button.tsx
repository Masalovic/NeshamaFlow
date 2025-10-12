// src/components/ui/Button.tsx
import React from "react";

type Variant = "primary" | "outline" | "ghost" | "secondary";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Make the button stretch to container width */
  fluid?: boolean;
  /** Keep on one line and truncate with ellipsis if it would overflow */
  truncate?: boolean;
};

export default function Button({
  variant = "primary",
  className = "",
  fluid = false,
  truncate = false,
  ...props
}: Props) {
  const byVariant: Record<Variant, string> = {
    primary: "btn btn-primary",
    outline: "btn btn-outline",
    ghost: "btn btn-ghost",
    secondary: "btn btn-secondary",
  };

  const width = fluid ? "w-full" : "w-auto";
  const overflow = truncate ? "max-w-full overflow-hidden text-ellipsis" : "";
  const nowrap = "whitespace-nowrap"; // ensure text never wraps to 2 lines

  const classes = [byVariant[variant], width, nowrap, overflow, className]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} {...props} />;
}
