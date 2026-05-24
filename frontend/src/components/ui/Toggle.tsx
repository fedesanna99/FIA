/**
 * Toggle atom (Precision v2.0 PR1) — switch on/off compatto.
 *
 *   <Toggle checked={isDark} onChange={setDark} label="Dark mode" />
 *
 * Hairline border, sharp (radius 0), thumb sharp che slitta a destra.
 */
import { useId } from "react";
import { cn } from "./cn";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Sr-only label per a11y se label visuale non c'è. */
  ariaLabel?: string;
}

export function Toggle({ checked, onChange, label, disabled, className, ariaLabel }: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label ?? "Toggle"}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          // v2.5.0 PR1 Precision: focus outline (era ring).
          "relative inline-block w-8 h-4 border transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
          checked
            ? "bg-accent border-accent"
            : "bg-bg-hover border-border",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-px h-[14px] w-[14px] bg-white transition-transform duration-fast",
            checked ? "translate-x-[14px]" : "translate-x-px",
          )}
        />
      </button>
      {label && <span className="text-xs text-ink-2">{label}</span>}
    </label>
  );
}
