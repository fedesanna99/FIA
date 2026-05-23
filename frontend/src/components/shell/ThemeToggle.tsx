/**
 * ThemeToggle — bottone che cicla dark → light → system → dark.
 *
 * Mostra l'icona del tema corrente con tooltip che indica il prossimo.
 */
import { Sun, Moon, Monitor } from "lucide-react";
import { useThemeStore, type ThemeMode } from "../../store/themeStore";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../ui/cn";

const ICON: Record<ThemeMode, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

const NEXT_LABEL: Record<ThemeMode, string> = {
  dark: "Passa a tema chiaro",
  light: "Segui sistema",
  system: "Passa a tema scuro",
};

interface Props {
  className?: string;
  /** Se true, layout compatto (LeftRail). Altrimenti label visibile. */
  compact?: boolean;
}

export function ThemeToggle({ className, compact = true }: Props) {
  const mode = useThemeStore((s) => s.mode);
  const cycle = useThemeStore((s) => s.cycle);
  const Icon = ICON[mode];

  return (
    <Tooltip content={NEXT_LABEL[mode]} side={compact ? "right" : "top"}>
      <button
        type="button"
        onClick={cycle}
        aria-label={`Tema: ${mode}. ${NEXT_LABEL[mode]}`}
        className={cn(
          "flex items-center justify-center rounded-md transition-colors",
          "text-ink-3 hover:bg-bg-hover hover:text-ink",
          "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
          compact ? "w-9 h-9" : "px-3 h-8 gap-1.5 text-xs",
          className,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        {!compact && (
          <span className="capitalize">{mode}</span>
        )}
      </button>
    </Tooltip>
  );
}
