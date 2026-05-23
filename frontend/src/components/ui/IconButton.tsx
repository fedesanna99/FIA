/**
 * IconButton atom (Precision v2.0 PR1) — bottone icon-only 28x28.
 *
 *   <IconButton aria-label="Cerca" onClick={openSearch}>
 *     <Search className="w-4 h-4" />
 *   </IconButton>
 *
 * Wrapper su <Button size="icon">. Garantisce aria-label richiesto.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  /** aria-label OBBLIGATORIO (icon-only ha bisogno di label per screen reader). */
  "aria-label": string;
  variant?: "ghost" | "outline" | "accent";
  size?: "sm" | "md";
}

const VARIANT_CLASSES: Record<NonNullable<Props["variant"]>, string> = {
  ghost:   "text-ink-2 hover:bg-bg-hover hover:text-ink",
  outline: "text-ink-2 border border-border hover:bg-bg-hover hover:border-border-light",
  accent:  "text-accent hover:bg-accent-subtle",
};

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-6 h-6",
  md: "w-7 h-7",
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { children, variant = "ghost", size = "md", className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center justify-center flex-shrink-0 transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </button>
  );
});
