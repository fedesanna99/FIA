/**
 * Badge atom (Precision v2.5.0 PR1) — etichetta uppercase mono per
 * status/severity tipo `DRAFT`, `OK`, `LIVE`, version chips.
 *
 *   <Badge variant="draft">DRAFT</Badge>
 *   <Badge variant="success">OK</Badge>
 *
 * Sharp (no rounded), font-mono micro-letterspacing, uppercase by default.
 * Per Badge inline non-uppercase usa la prop `case="normal"`.
 */
import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

type Variant = "default" | "info" | "success" | "warn" | "danger" | "accent" | "muted" | "draft" | "ghost";
type Size = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  /** `"uppercase"` (default) o `"normal"` (no transform, normal letter-spacing). */
  case?: "uppercase" | "normal";
  children: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  // v2.5.0 PR1 Precision: solid bg per default/success/warn/danger/accent,
  // ghost per outlined, draft per Trust Layer (yellow outlined).
  default: "bg-bg-elevated text-ink border-border",
  info:    "bg-info/15 text-accent border-info/30",
  success: "bg-success text-white border-success",
  warn:    "bg-warn text-white border-warn",
  danger:  "bg-danger text-white border-danger",
  accent:  "bg-accent text-white border-accent",
  muted:   "bg-bg-hover text-ink-3 border-border",
  // v2.5.0 PR1 nuova variant (Trust Layer DRAFT)
  draft:   "bg-transparent text-warn border-warn",
  // v2.5.0 PR1 nuova variant (outlined accent)
  ghost:   "bg-transparent text-accent border-accent",
};

const SIZE: Record<Size, string> = {
  sm: "text-[9px] px-1.5 py-0 h-4",
  md: "text-[10px] px-1.5 py-0.5 h-5",
};

export function Badge({
  variant = "default",
  size = "md",
  case: caseProp = "uppercase",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        // v2.5.0 PR1: sharp (no rounded), mono, uppercase by default.
        "inline-flex items-center gap-1 border font-semibold font-mono",
        caseProp === "uppercase" && "uppercase tracking-wide-1",
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
