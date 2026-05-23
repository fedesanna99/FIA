/**
 * EmptyState — schermata didattica al posto di "no data".
 * Sempre con CTA, mai vuota.
 */
import { type ReactNode } from "react";
import { cn } from "./cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "px-6 py-12 gap-3",
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-ink-3">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="text-xs text-ink-3 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
