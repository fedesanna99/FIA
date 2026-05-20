/**
 * Button primitive — variants + sizes consistenti con i design tokens.
 * Tutti i bottoni dell'app dovrebbero passare per qui.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
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
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent " +
    "shadow-sm border border-accent-hover/30",
  secondary:
    "bg-bg-elevated text-ink hover:bg-bg-hover border border-border",
  ghost:
    "bg-transparent text-ink hover:bg-bg-hover border border-transparent",
  outline:
    "bg-transparent text-ink hover:bg-bg-hover border border-border",
  danger:
    "bg-danger text-white hover:bg-danger/90 border border-danger/40",
  success:
    "bg-success text-white hover:bg-success/90 border border-success/40",
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
        "inline-flex items-center justify-center font-medium rounded-md",
        "transition-colors duration-fast outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
        "disabled:opacity-40 disabled:cursor-not-allowed",
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
