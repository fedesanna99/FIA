/**
 * Kbd atom (Precision v2.0 PR1) — keyboard shortcut hint inline.
 *
 *   <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>
 *   <Kbd>⌘K</Kbd>  (compatto OS-agnostico)
 *
 * Sharp (radius 0), hairline border, mono 10px, inset shadow bottom.
 */
import type { ReactNode } from "react";
import { cn } from "./cn";

interface Props {
  children: ReactNode;
  className?: string;
}

export function Kbd({ children, className }: Props) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center font-mono text-[10px] leading-none",
        "bg-bg-hover border border-border text-ink-2 px-1 py-0.5",
        "shadow-[inset_0_-1px_0_rgb(var(--c-border))]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
