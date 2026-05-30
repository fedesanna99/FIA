/**
 * TemplateGallery · Fetta E3.5 + SYNC (single source of truth, 30/05/2026 sera)
 *
 * Galleria prominente in fondo Dashboard. Importa catalogo + SVG thumb
 * registry da `frontend/src/templates/catalog.ts` (vedi quel modulo per
 * la lista canonica dei 10 template). Aggiungere un template = aggiungere
 * 1 voce in catalog → appare qui automaticamente.
 *
 * Click su template apre/clona via backend POST /api/models/from-template.
 */
import { useState } from "react";
import { ChevronRight, ArrowRight } from "lucide-react";

import {
  TEMPLATES_CATALOG,
  VARIANT_THUMBS,
  type TemplateEntry,
  type TemplateCategory,
  type TemplateBadge,
} from "../templates/catalog";

type Filter = "tutti" | TemplateCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "tutti", label: "Tutti" },
  { key: "acciaio", label: "Acciaio" },
  { key: "ca", label: "Calcestruzzo" },
  { key: "legno", label: "Legno" },
  { key: "sismica", label: "Sismica" },
];

function countForFilter(f: Filter): number {
  if (f === "tutti") return TEMPLATES_CATALOG.length;
  return TEMPLATES_CATALOG.filter((t) => t.category === f).length;
}

function pillClassForBadge(badge?: TemplateBadge): string {
  if (badge === "POPOLARE") return "tpl-pill pill-pop";
  if (badge === "PRO") return "tpl-pill pill-pro";
  if (badge === "NEW") return "tpl-pill pill-new";
  return "tpl-pill";
}

function matClassForCategory(cat: TemplateCategory): string {
  if (cat === "acciaio") return "meta-pill mp-mat";
  if (cat === "ca") return "meta-pill mp-mat mp-mat-ca";
  if (cat === "legno") return "meta-pill mp-mat mp-mat-wood";
  if (cat === "sismica") return "meta-pill";
  return "meta-pill";
}

function matLabel(cat: TemplateCategory): string {
  if (cat === "ca") return "CA";
  return cat;
}

export interface TemplateGalleryProps {
  onOpenTemplate?: (backendId: string | null, label: string) => void;
  onOpenGallery?: () => void;
}

export function TemplateGallery({ onOpenTemplate, onOpenGallery }: TemplateGalleryProps) {
  const [filter, setFilter] = useState<Filter>("tutti");
  const visible: TemplateEntry[] =
    filter === "tutti" ? TEMPLATES_CATALOG : TEMPLATES_CATALOG.filter((t) => t.category === filter);

  return (
    <section className="block tpl-block" id="template-gallery" data-testid="dash-template-gallery">
      <header className="block-head">
        <div>
          <span className="eyebrow">Catalogo · {TEMPLATES_CATALOG.length} template</span>
          <h2>Modelli FEM pronti all&apos;uso</h2>
        </div>
        <button
          type="button"
          className="block-link"
          onClick={() => onOpenGallery?.()}
          data-testid="dash-template-openall"
        >
          Apri la gallery
          <ChevronRight strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div className="tg-filters" role="group" aria-label="Filtro template per materiale">
        {FILTERS.map((f) => {
          const count = countForFilter(f.key);
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              className={`filter-chip${active ? " is-active" : ""}`}
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              data-testid={`dash-tpl-filter-${f.key}`}
            >
              {f.label}
              <span className="fc-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="tg-grid">
        {visible.map((t) => {
          const Thumb = VARIANT_THUMBS[t.variant];
          return (
            <article
              key={t.id}
              className={`tpl-card${t.badge === "POPOLARE" ? " is-featured" : ""}`}
              data-testid={`dash-tpl-card-${t.id}`}
            >
              <div className="tpl-thumb">
                <Thumb />
                {t.badge && <span className={pillClassForBadge(t.badge)}>{t.badge}</span>}
              </div>
              <div className="tpl-body">
                <span className="tpl-id">{t.uc}</span>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
                <div className="tpl-meta">
                  <span className={matClassForCategory(t.category)}>{matLabel(t.category)}</span>
                  {t.pills.map((p) => (
                    <span key={p} className="meta-pill">{p}</span>
                  ))}
                  <span className="meta-dot">·</span>
                  <span className="meta-time">{t.timeMin} min</span>
                </div>
              </div>
              <button
                type="button"
                className="tpl-cta"
                onClick={() => onOpenTemplate?.(t.backendId, `${t.uc} · ${t.title}`)}
                data-testid={`dash-tpl-open-${t.id}`}
              >
                Apri template
                <ArrowRight strokeWidth={2.4} aria-hidden />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
