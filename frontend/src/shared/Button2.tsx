// v2.6.1 foundation · Button2 primitive (Soft v2.1)
//
// Naming `Button2` temporaneo per coesistere con `Button` (Precision) usato
// in 50+ callsite + FeatureButton. Rinomina/migration in Fase 2 (Shell).
//
// Specifiche §5.1 DESIGN_HANDOFF:
//   - 4 variant: primary | secondary | ghost | danger
//   - 3 size: sm (28px) | md (32px) | lg (40px)
//   - Optional: kbd hint, icon (leading/trailing), loading, fullWidth
//   - Focus ring accent, transition fast, radius md (8px).

import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface Button2Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  kbd?: string;
  icon?: ReactNode;
  iconPosition?: "leading" | "trailing";
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover active:bg-accent-active border-transparent",
  secondary: "bg-transparent text-ink hover:bg-hover border border-border hover:border-border-light",
  ghost: "bg-transparent text-ink-muted hover:bg-hover hover:text-ink border-transparent",
  danger: "bg-danger text-white hover:opacity-90 border-transparent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3.5 text-[13px]",
  lg: "h-10 px-4 text-sm",
};

export const Button2 = forwardRef<HTMLButtonElement, Button2Props>(function Button2(
  {
    variant = "primary",
    size = "md",
    kbd,
    icon,
    iconPosition = "leading",
    loading = false,
    fullWidth = false,
    disabled,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-1.5",
        "rounded-md font-sans font-medium",
        "transition-colors duration-fast",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon && iconPosition === "leading" && <span className="inline-flex">{icon}</span>}
      <span>{loading ? "…" : children}</span>
      {icon && iconPosition === "trailing" && <span className="inline-flex">{icon}</span>}
      {kbd && (
        <kbd className="ml-1 font-mono text-[10px] tracking-wider opacity-60">{kbd}</kbd>
      )}
    </button>
  );
});
