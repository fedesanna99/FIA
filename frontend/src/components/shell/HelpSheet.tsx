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
        className="fixed inset-0 z-40 bg-black/40 animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full max-w-[540px] bg-bg-elevated border-l border-border-light",
          "shadow-dialog flex flex-col animate-slide-left",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Guida contestuale"
      >
        {/* Header Precision */}
        <header className="flex items-center gap-2.5 px-4 py-3 border-b border-border flex-shrink-0 bg-bg-panel">
          <BookOpen className="h-4 w-4 text-accent flex-shrink-0" />
          <h2 className="font-display text-lg font-semibold tracking-tight-1 text-ink flex-1">Guida</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-ink-3 hover:text-ink p-1 hover:bg-bg-hover transition-colors"
            aria-label="Chiudi guida"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Section selector */}
        <nav className="flex gap-0.5 px-3 py-2 border-b border-border flex-shrink-0 overflow-x-auto bg-bg-panel">
          {(Object.keys(HELP_CONTENT) as Workspace[]).map((ws) => {
            const active = ws === section;
            return (
              <button
                key={ws}
                onClick={() => setSection(ws)}
                className={cn(
                  "font-mono text-[10px] uppercase tracking-wide-1 font-semibold px-2.5 py-1 transition-colors flex-shrink-0",
                  active
                    ? "bg-accent text-white"
                    : "text-ink-3 hover:bg-bg-hover hover:text-ink",
                )}
              >
                {ws}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          <h1 className="font-display text-xl font-semibold tracking-tight-1 text-ink mb-4">{content.title}</h1>
          <article className="prose-help">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content.md}
            </ReactMarkdown>
          </article>
        </div>

        {/* Footer Precision */}
        <footer className="flex items-center gap-3 px-4 py-2.5 border-t border-border font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 flex-shrink-0 bg-bg-panel">
          <a
            href="/docs"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-accent transition-colors font-semibold"
          >
            OpenAPI <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-border">·</span>
          <span>FEA Pro v1.0</span>
          <span className="text-border">·</span>
          <kbd className="bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">Esc</kbd>
          <span>chiudi</span>
        </footer>
      </aside>
    </>
  );
}

