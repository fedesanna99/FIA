/**
 * Chip atom (Precision v2.0 PR1) — etichetta inline con tono semantico.
 *
 * Usato per metadata, status, tag. Hairline border, radius 0.
 *
 *   <Chip tone="info">12 nodi</Chip>
 *   <Chip tone="success" dot>OK</Chip>
 *
 * Per chip cliccabili usa `<Button size="sm" variant="ghost">`.
 */
import type { ReactNode } from "react";
import { cn } from "./cn";

export type ChipTone = "neutral" | "info" | "success" | "warn" | "coral" | "purple" | "danger";

interface Props {
  children: ReactNode;
  tone?: ChipTone;
  /** Aggiunge un dot indicator a sinistra (per status live). */
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: "bg-bg-hover text-ink-2 border-border",
  info:    "bg-bg-info text-accent border-bg-info",
  success: "bg-bg-success text-success border-bg-success",
  warn:    "bg-bg-warn text-warn border-bg-warn",
  coral:   "bg-bg-coral text-coral border-bg-coral",
  purple:  "bg-bg-purple text-purple border-bg-purple",
  danger:  "bg-bg-danger text-danger border-bg-danger",
};

const DOT_CLASSES: Record<ChipTone, string> = {
  neutral: "bg-ink-3",
  info:    "bg-accent",
  success: "bg-success",
  warn:    "bg-warn",
  coral:   "bg-coral",
  purple:  "bg-purple",
  danger:  "bg-danger",
};

export function Chip({ children, tone = "neutral", dot, icon, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium border whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", DOT_CLASSES[tone])} />}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
