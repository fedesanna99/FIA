/**
 * Input + Field — base testuale + numerico con label/hint/error.
 *
 * Uso tipico:
 *   <Field label="Lunghezza" hint="In metri" error={errors.L?.message}>
 *     <NumericInput {...register('L')} unit="m" min={0} />
 *   </Field>
 */
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "./cn";

// ── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-ink-muted">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-dim">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ── Input testuale base ──────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Affissi (es. "mm", "kN"). Reso a destra non interferisce con click. */
  unit?: string;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { unit, invalid, className, ...props },
  ref,
) {
  return (
    <div className="relative flex items-center">
      <input
        ref={ref}
        className={cn(
          "w-full h-8 px-2.5 rounded-md text-sm",
          "bg-bg-elevated border text-ink",
          "border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
          "placeholder:text-ink-dim",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          invalid && "border-danger focus:border-danger focus:ring-danger/30",
          unit && "pr-10",
          className,
        )}
        {...props}
      />
      {unit && (
        <span className="absolute right-2 text-xs text-ink-muted pointer-events-none font-mono">
          {unit}
        </span>
      )}
    </div>
  );
});

// ── NumericInput con step da tastiera ────────────────────────────────────────

interface NumericInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number | string;
  onChange?: (value: number) => void;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
  { unit, min, max, step = 1, value, onChange, className, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      value={value ?? ""}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!Number.isNaN(v) && onChange) onChange(v);
      }}
      unit={unit}
      className={cn("font-mono tabular-nums", className)}
      {...props}
    />
  );
});
