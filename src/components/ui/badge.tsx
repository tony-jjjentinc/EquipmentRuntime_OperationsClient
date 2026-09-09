import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "running"
    | "downtime"
    | "restart"
    | "off"
    | "pending";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default:
      "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
    outline: "text-foreground border-border",
    running:
      "border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold",
    downtime:
      "border-rose-200 bg-rose-50 text-rose-700 font-semibold",
    restart:
      "border-amber-200 bg-amber-50 text-amber-700 font-semibold",
    off:
      "border-slate-200 bg-slate-100 text-slate-700 font-medium",
    pending:
      "border-amber-400 bg-amber-50 text-amber-800 border-dashed animate-pulse font-medium",
  }[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantClasses,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
