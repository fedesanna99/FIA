/**
 * ModelMenu (alpha.31) — single entry point per le azioni sul modello.
 *
 * Sostituisce in TopBar:
 *   - il <select> model picker
 *   - i 3 bottoni "Nuovo · Duplica · Modifica"
 *   - il <select> tipo analisi (analisi è scelta nel SolvePanel)
 *
 * UX:
 *   - Trigger = bottone con [📁 icon] {nome modello} [chevron]
 *   - Click → DropdownMenu compatto:
 *     · Duplica
 *     · Modifica proprietà
 *     · ───
 *     · Apri altro modello
 *     · Nuovo modello (Ctrl+N)
 *     · ───
 *     · Elimina modello (destructive)
 *
 * Tutte le azioni sono passate come callback dal parent (TopBar):
 * il componente non conosce la mutation API, mantiene la separazione.
 */
import {
  Copy,
  Pencil,
  Folders,
  Plus,
  Trash2,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../../ui/DropdownMenu";

interface Props {
  modelName: string | null;
  hasModel: boolean;
  isDuplicating?: boolean;
  isDeleting?: boolean;
  onDuplicate: () => void;
  onEdit: () => void;
  onSwitch: () => void;
  onNew: () => void;
  onDelete: () => void;
}

export function ModelMenu({
  modelName,
  hasModel,
  isDuplicating,
  isDeleting,
  onDuplicate,
  onEdit,
  onSwitch,
  onNew,
  onDelete,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-2.5 py-1 border border-border-light hover:border-accent/40 hover:bg-bg-hover text-sm text-ink font-medium min-w-0 max-w-[280px] flex-shrink transition-colors"
          data-testid="topbar-model-menu"
          aria-label="Menu modello"
        >
          <FolderOpen className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" strokeWidth={1.8} />
          <span className="truncate">
            {modelName ?? <span className="text-ink-3">Nessun modello</span>}
          </span>
          <ChevronDown className="w-3 h-3 text-ink-3 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px]">
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); onDuplicate(); }}
          disabled={!hasModel || isDuplicating}
        >
          <Copy className="w-4 h-4 text-ink-3" />
          Duplica
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); onEdit(); }}
          disabled={!hasModel}
        >
          <Pencil className="w-4 h-4 text-ink-3" />
          Modifica proprietà
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onSwitch(); }}>
          <Folders className="w-4 h-4 text-ink-3" />
          Apri altro modello
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onNew(); }}>
          <Plus className="w-4 h-4 text-ink-3" />
          Nuovo modello
          <kbd className="ml-auto font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">⌘ N</kbd>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); onDelete(); }}
          disabled={!hasModel || isDeleting}
          className="text-danger"
        >
          <Trash2 className="w-4 h-4" />
          Elimina modello
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
