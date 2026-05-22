/**
 * HelpSheet — overlay scorrevole con la guida contestuale del workspace attivo.
 *
 * UX:
 *  - Si apre dalla destra (slide-in 480 px max-width)
 *  - Mostra il markdown da `help/content.ts` per il workspace corrente
 *  - Footer: link rapidi a OpenAPI /docs e repo
 *  - Esc chiude
 */
import { useEffect, useState } from "react";
import { X, BookOpen, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWorkspaceStore, type Workspace } from "../../store/workspaceStore";
import { HELP_CONTENT } from "../../help/content";
import { useModalBackButton } from "../../hooks/useModalBackButton";
import { cn } from "../ui/cn";

export function HelpSheet() {
  const open = useWorkspaceStore((s) => s.helpOpen);
  const setOpen = useWorkspaceStore((s) => s.setHelp);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [section, setSection] = useState<Workspace>(workspace);

  // v1.6 S0 · B08: back hardware mobile chiude la sheet.
  useModalBackButton(open, () => setOpen(false));

  // Aggiorna la sezione quando l'utente cambia workspace mentre la sheet è aperta
  useEffect(() => {
    setSection(workspace);
  }, [workspace]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const content = HELP_CONTENT[section];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full max-w-[520px] bg-bg-panel border-l border-border",
          "shadow-dialog flex flex-col animate-slide-left",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Guida contestuale"
      >
        {/* Header */}
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <BookOpen className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-ink flex-1">Guida</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-ink-muted hover:text-ink p-1 rounded hover:bg-bg-hover"
            aria-label="Chiudi guida"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Section selector */}
        <nav className="flex gap-1 px-3 py-2 border-b border-border flex-shrink-0 overflow-x-auto">
          {(Object.keys(HELP_CONTENT) as Workspace[]).map((ws) => {
            const active = ws === section;
            return (
              <button
                key={ws}
                onClick={() => setSection(ws)}
                className={cn(
                  "text-[10px] uppercase tracking-wider px-2 py-1 rounded transition-colors flex-shrink-0",
                  active
                    ? "bg-accent-subtle text-accent font-medium"
                    : "text-ink-muted hover:bg-bg-hover hover:text-ink",
                )}
              >
                {ws}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          <h1 className="text-base font-bold text-ink mb-3">{content.title}</h1>
          <article className="prose-help">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content.md}
            </ReactMarkdown>
          </article>
        </div>

        {/* Footer */}
        <footer className="flex items-center gap-3 px-4 py-2 border-t border-border text-[11px] text-ink-dim flex-shrink-0">
          <a
            href="/docs"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-accent"
          >
            OpenAPI <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-border">|</span>
          <span>FEA Pro v1.0 · <kbd className="bg-bg px-1 rounded border border-border">Esc</kbd> chiudi</span>
        </footer>
      </aside>
    </>
  );
}

