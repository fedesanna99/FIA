/**
 * Badge — etichetta colorata per status/severity.
 * Uso: <Badge variant="success">OK</Badge>
 */
import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

type Variant = "default" | "info" | "success" | "warn" | "danger" | "accent" | "muted";
type Size = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  default: "bg-bg-elevated text-ink border-border",
  info:    "bg-info/15 text-accent border-info/30",
  success: "bg-success/15 text-success border-success/30",
  warn:    "bg-warn/15 text-warn border-warn/30",
  danger:  "bg-danger/15 text-danger border-danger/30",
  accent:  "bg-accent/15 text-accent border-accent/30",
  muted:   "bg-bg-hover text-ink-3 border-border",
};

const SIZE: Record<Size, string> = {
  sm: "text-[10px] px-1.5 py-0 h-4",
  md: "text-xs px-2 py-0.5 h-5",
};

export function Badge({ variant = "default", size = "md", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
