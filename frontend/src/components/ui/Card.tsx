/**
 * Card — contenitore base con header opzionale.
 * Usato in panels, dialog content, empty states.
 */
import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Riduce padding interno per liste dense. */
  dense?: boolean;
  /** Variante "elevated" con background più chiaro. */
  elevated?: boolean;
}

export function Card({
  title,
  description,
  actions,
  dense,
  elevated,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "border border-border",
        elevated ? "bg-bg-elevated" : "bg-bg-panel",
        className,
      )}
      {...props}
    >
      {(title || description || actions) && (
        <div className={cn("flex items-start justify-between gap-3 border-b border-border",
                          dense ? "px-3 py-2" : "px-4 py-3")}>
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-ink truncate">{title}</h3>}
            {description && <p className="text-xs text-ink-3 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn(dense ? "p-3" : "p-4")}>{children}</div>
    </div>
  );
}
