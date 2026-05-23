/**
 * FormField atom (Precision v2.0 PR1) — label uppercase mono + input + help.
 *
 *   <FormField label="Nome modello" help="Massimo 64 caratteri">
 *     <Input value={name} onChange={...} />
 *   </FormField>
 *
 * Pattern coerente con `.field` di precision.css.
 */
import { Children, cloneElement, isValidElement, useId, type ReactNode } from "react";
import { cn } from "./cn";

interface Props {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, help, error, required, children, className }: Props) {
  const id = useId();

  // Inject id into the first child (assumed to be the input).
  const childrenWithId = Children.map(children, (child) => {
    if (isValidElement(child)) {
      return cloneElement(child as React.ReactElement, { id });
    }
    return child;
  });

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-wide-4 text-ink-3 font-semibold"
      >
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {childrenWithId}
      {help && !error && (
        <span className="text-[11px] text-ink-3 leading-snug">{help}</span>
      )}
      {error && (
        <span className="text-[11px] text-danger leading-snug" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
