/**
 * TemplateGalleryDialog · v3.6 SYNC (30/05/2026 sera)
 *
 * Modale "Apri da template" — adesso single source of truth via
 * `templates/catalog.ts`. Pre-SYNC: cards dinamiche da
 * `models.filter(ex_*)` + dict `TEMPLATE_DESCRIPTIONS` statico (9
 * chiavi) → bug "10 in home vs 9 nel modale" segnalato da Federico.
 *
 * Inoltre fix bug P0 audit-2026-05-28 L2-1 che non era risolto qui:
 * il vecchio onSelect carica direttamente il template `ex_*` →
 * modifiche utente mutano il template CONDIVISO. Adesso usa
 * `cloneMutation` (POST /api/models/from-template) come TemplatesPage
 * → utente lavora su un clone con `owner_id` proprio.
 */
import { useState } from "react";
import { Boxes, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useModalBackButton } from "../../hooks/useModalBackButton";
import { modelsApi } from "../../api/client";
import { toast } from "../../store/toastStore";

import {
  TEMPLATES_CATALOG,
  VARIANT_THUMBS,
  type TemplateEntry,
} from "../../templates/catalog";


interface Props {
  open: boolean;
  onClose: () => void;
  /** Chiamato con il MODEL.id del clone creato (NON con il template id originale). */
  onSelect: (modelId: string) => void;
}


export function TemplateGalleryDialog({ open, onClose, onSelect }: Props) {
  useModalBackButton(open, onClose);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const qc = useQueryClient();

  // v3.1.1 audit-fix L2-1 anche qui: clone template via backend (owner_id user)
  const cloneMutation = useMutation({
    mutationFn: (backendId: string) => modelsApi.fromTemplate(backendId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["models"] });
    },
  });

  if (!open) return null;

  const handleOpen = async (t: TemplateEntry) => {
    if (cloneMutation.isPending) return;
    setPendingId(t.id);
    toast("info", `Caricamento template ${t.uc} · ${t.title}…`, 2_500);
    try {
      const cloned = await cloneMutation.mutateAsync(t.backendId);
      onSelect(cloned.id);
      onClose();
    } catch {
      toast(
        "error",
        `Impossibile aprire ${t.uc}. Riprova fra qualche secondo o scegli un altro template.`,
        5_000,
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-dialog flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
      role="presentation"
      data-testid="template-gallery"
    >
      <div
        className="bg-bg-elevated border border-border-light shadow-dialog w-[calc(100vw-24px)] max-w-[820px] max-h-[calc(100vh-48px)] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-gallery-title"
      >
        {/* Header Precision: icon + title font-display + sub mono */}
        <header className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-bg-info text-accent border border-border-light flex items-center justify-center flex-shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="template-gallery-title"
                className="font-display text-lg font-semibold tracking-tight-1 text-ink"
              >
                Galleria template
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mt-0.5">
                {TEMPLATES_CATALOG.length} modelli pronti all&apos;uso
              </p>
            </div>
          </div>
        </header>

        {/* Body grid */}
        <div className="p-4 overflow-y-auto flex-1 bg-bg-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {TEMPLATES_CATALOG.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                pending={pendingId === t.id}
                onOpen={() => handleOpen(t)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border px-5 py-3 flex items-center justify-between flex-shrink-0 bg-bg-elevated">
          <span className="text-[11px] text-ink-3">
            I template sono modelli leggibili e modificabili come qualunque altro.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover"
          >
            Annulla
          </button>
        </footer>
      </div>
    </div>
  );
}


function TemplateCard({
  template,
  pending,
  onOpen,
}: {
  template: TemplateEntry;
  pending: boolean;
  onOpen: () => void;
}) {
  const Thumb = VARIANT_THUMBS[template.variant];
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={pending}
      data-testid={`template-card-${template.backendId}`}
      className="group text-left bg-bg-elevated border border-border hover:border-accent/50 p-3.5 transition-colors flex flex-col gap-2 focus-visible:outline-none focus-visible:border-accent disabled:opacity-60 disabled:cursor-progress"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-ink-3 uppercase tracking-wide-1 flex-shrink-0">
            {template.uc}
          </span>
          <h3 className="font-display text-[14px] font-semibold tracking-tight-1 text-ink leading-snug truncate">
            {template.title}
          </h3>
        </div>
        {template.badge && (
          <span
            className={`font-mono text-[9px] font-semibold uppercase tracking-wide-1 px-1.5 py-0.5 border ${
              template.badge === "POPOLARE"
                ? "text-accent border-accent/40 bg-bg-info"
                : template.badge === "PRO"
                  ? "text-purple border-purple/40 bg-bg-purple"
                  : "text-success border-success/40 bg-bg-success"
            }`}
          >
            {template.badge}
          </span>
        )}
      </div>
      <div className="aspect-[280/120] bg-bg-viewport border border-border-light overflow-hidden flex items-center justify-center">
        <Thumb />
      </div>
      <p className="text-[12px] text-ink-2 leading-snug line-clamp-2">{template.desc}</p>
      <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] text-ink-3 mt-1">
        <span className="bg-bg-panel border border-border px-1.5 py-0.5">{template.category}</span>
        {template.pills.map((p) => (
          <span key={p} className="bg-bg-panel border border-border px-1.5 py-0.5">{p}</span>
        ))}
        <span className="ml-auto text-ink-dim">{template.timeMin} min</span>
      </div>
      <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent font-medium group-hover:gap-2 transition-all">
        {pending ? "Caricamento…" : (
          <>
            Apri template
            <ArrowRight className="w-3 h-3" />
          </>
        )}
      </div>
    </button>
  );
}
