/**
 * Avatar atom (Precision v2.0 PR1) — iniziali su tinted bg.
 *
 *   <Avatar name="Federico Sanna" />        → "FS"
 *   <Avatar name="ada" size="lg" tone="info" />
 *
 * Sempre `rounded-full` (eccezione Precision per cerchi puri).
 * Tone deterministico hashato dal nome se non specificato.
 */
import { cn } from "./cn";

type AvatarTone = "neutral" | "info" | "success" | "warn" | "coral" | "purple";
type AvatarSize = "sm" | "md" | "lg";

interface Props {
  name: string;
  /** Stato tonale. Se omesso, derivato da hash del nome. */
  tone?: AvatarTone;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-7 h-7 text-[11px]",
  lg: "w-9 h-9 text-sm",
};

const TONE_CLASSES: Record<AvatarTone, string> = {
  neutral: "bg-bg-hover text-ink-2 border-border",
  info:    "bg-bg-info text-accent border-bg-info",
  success: "bg-bg-success text-success border-bg-success",
  warn:    "bg-bg-warn text-warn border-bg-warn",
  coral:   "bg-bg-coral text-coral border-bg-coral",
  purple:  "bg-bg-purple text-purple border-bg-purple",
};

const TONES: AvatarTone[] = ["info", "success", "warn", "coral", "purple"];

function initialsFrom(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "·";
  // Split su spazi / punti / @ (email)
  const parts = cleaned.split(/[\s.@_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function hashTone(name: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return TONES[Math.abs(hash) % TONES.length];
}

export function Avatar({ name, tone, size = "md", className }: Props) {
  const resolvedTone = tone ?? hashTone(name);
  const initials = initialsFrom(name);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-semibold border rounded-full flex-shrink-0",
        SIZE_CLASSES[size],
        TONE_CLASSES[resolvedTone],
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initials}
    </span>
  );
}
