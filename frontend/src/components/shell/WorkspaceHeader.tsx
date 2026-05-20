/**
 * WorkspaceHeader — header consistente per ogni workspace.
 * Mostra icona, titolo, descrizione contestuale e bottone "?" per HelpSheet.
 */
import { HelpCircle } from "lucide-react";
import { type ReactNode } from "react";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../ui/cn";
import { useWorkspaceStore } from "../../store/workspaceStore";

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  /** Slot per badge/status secondari accanto al titolo. */
  badge?: ReactNode;
  /** Handler help (default: noop). Sarà collegato a HelpSheet in M7. */
  onHelp?: () => void;
  className?: string;
}

export function WorkspaceHeader({ icon, title, description, badge, onHelp, className }: Props) {
  const setHelp = useWorkspaceStore((s) => s.setHelp);
  const handleHelp = onHelp ?? (() => setHelp(true));
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-2 px-4 py-3 border-b border-border",
        className,
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-md bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink truncate">{title}</h2>
            {badge}
          </div>
          <p className="text-xs text-ink-muted leading-snug">{description}</p>
        </div>
      </div>
      <Tooltip content="Apri guida contestuale">
        <button
          type="button"
          onClick={handleHelp}
          className="flex-shrink-0 text-ink-muted hover:text-ink p-1 rounded hover:bg-bg-hover transition-colors"
          aria-label="Aiuto"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </Tooltip>
    </header>
  );
}
