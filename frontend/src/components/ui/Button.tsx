/**
 * Button primitive — variants + sizes Soft v2.1 (post FETTA E0-fix Commit 3).
 * Tutti i bottoni dell'app dovrebbero passare per qui.
 *
 * Spec §5.1 DESIGN_HANDOFF:
 *   - Tutte le variant: border-radius = var(--r-md) = 8px (Soft)
 *   - Sizes: sm=28px / md=32px / lg=40px
 *   - shadow-hover su primary/secondary (§1.4 micro-elevation)
 *   - Sharp mode opt-in via `data-radius="sharp"` su <html> (tokens.css
 *     override --r-* a 0 → bottoni squadrati senza toccare il componente)
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline" | "run";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** Quando true, renderizza come `Slot` di Radix (utile per <Link asChild>). */
  asChild?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  // FETTA E0-fix Commit 3 · Soft v2.1: primary senza `border border-accent`
  // (era Precision PR1 hairline), aggiunta micro-elevation hover:shadow-hover.
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent hover:shadow-hover",
  // Soft v2.1: secondary con hover:shadow-hover (§1.4 micro-elevation),
  // hairline border preservato (utile per dichiararsi su bg chiari).
  secondary:
    "bg-bg-elevated text-ink hover:bg-bg-hover border border-border-light hover:border-ink-3 hover:shadow-hover",
  ghost:
    "bg-transparent text-ink-2 hover:bg-bg-hover hover:text-ink border border-transparent",
  outline:
    "bg-transparent text-ink hover:bg-bg-hover border border-border",
  danger:
    "bg-transparent text-danger hover:bg-danger hover:text-white border border-danger",
  success:
    "bg-success text-white hover:bg-success/90 border border-success",
  // Soft v2.1: Run button — flat success (era gradient emerald v1.7 T3).
  // Mantiene l'identita' "Run verde" che gli utenti riconoscono.
  run:
    "bg-success text-white font-semibold hover:brightness-110 border border-success",
};

const SIZE: Record<ButtonSize, string> = {
  xs:   "h-6  px-2  text-xs  gap-1",
  sm:   "h-7  px-2.5 text-xs  gap-1.5",
  md:   "h-8  px-3  text-sm  gap-1.5",
  lg:   "h-10 px-4  text-md  gap-2",
  icon: "h-8 w-8 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    disabled,
    iconLeft,
    iconRight,
    className,
    children,
    asChild,
    ...props
  },
  ref,
) {
  const Comp: typeof Slot | "button" = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref as never}
      disabled={disabled || loading}
      className={cn(
        // FETTA E0-fix Commit 3 · Soft v2.1: tutte le variant rounded-md
        // (= var(--r-md) = 8px) per default. Sharp mode opt-in globale
        // via `data-radius="sharp"` su <html> (tokens.css override --r-*).
        // transition-shadow per supportare hover:shadow-hover delle variants.
        "inline-flex items-center justify-center font-medium rounded-md",
        "transition-[colors,box-shadow,border-color] duration-fast outline-none",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
        "whitespace-nowrap select-none",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : iconLeft}
      {children}
      {iconRight}
    </Comp>
  );
});
