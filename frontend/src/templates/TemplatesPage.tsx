/**
 * TemplatesPage · v3.6 SYNC (30/05/2026 sera)
 *
 * Pagina full-screen `/templates` con tutti i template del catalogo
 * (importato da `frontend/src/templates/catalog.ts`, single source
 * of truth UI). Riusa VARIANT_THUMBS dal catalog (no più 9 SVG
 * duplicate qui).
 *
 * Click su template card → POST /api/models/from-template/{backendId}
 * (clone con owner_id corrente per evitare bug P0 mutazione template
 * condivisi — v3.1.1 audit-fix L2-1), poi navigate("/") con state
 * `pendingActiveId` che App.tsx legge al mount per fare setActiveId.
 *
 * Rimossi 4 fantasmi (mensola, tirante, capriata legno, pilastro CA
 * buckling) che erano hardcoded qui pre-SYNC. Il catalog espone solo
 * template realmente serviti dal backend (vedi `examples.py`).
 */
import { useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "../store/authStore";
import { toast } from "../store/toastStore";
import { modelsApi } from "../api/client";

import {
  TEMPLATES_CATALOG,
  VARIANT_THUMBS,
  type TemplateEntry,
  type TemplateCategory,
  type TemplateBadge,
} from "./catalog";

import "../styles/templates.css";

// ── Filtri ──────────────────────────────────────────────────────────────

type CategoryFilter = "tutti" | TemplateCategory;
type TierFilter = "free" | "pro" | "all";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  tutti: "Tutti",
  acciaio: "Acciaio",
  ca: "Calcestruzzo",
  legno: "Legno",
  sismica: "Sismica",
  altro: "Altro",
};

/** Inferisce il tier dal badge PRO (presenza/assenza). */
function tierOf(t: TemplateEntry): "free" | "pro" {
  return t.badge === "PRO" ? "pro" : "free";
}


// ── TemplatesPage ───────────────────────────────────────────────────────

export function TemplatesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("tutti");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const userEmail = useAuthStore((s) => s.user?.email);

  // v3.1.2 audit-fix L2-3 + L2-6: useMutation per clone template.
  // (a) disabled button via isPending → no doppio-click race
  // (b) invalidazione query ["models"] su success → Dashboard recenti aggiornato
  const qc = useQueryClient();
  const cloneMutation = useMutation({
    mutationFn: (backendId: string) => modelsApi.fromTemplate(backendId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["models"] });
    },
  });

  const filtered = TEMPLATES_CATALOG.filter((t) => {
    if (activeCategory !== "tutti" && t.category !== activeCategory) return false;
    if (tierFilter !== "all" && tierOf(t) !== tierFilter) return false;
    return true;
  });

  // Contatori per chip filter
  const counts: Record<CategoryFilter, number> = {
    tutti: TEMPLATES_CATALOG.length,
    acciaio: TEMPLATES_CATALOG.filter((t) => t.category === "acciaio").length,
    ca: TEMPLATES_CATALOG.filter((t) => t.category === "ca").length,
    legno: TEMPLATES_CATALOG.filter((t) => t.category === "legno").length,
    sismica: TEMPLATES_CATALOG.filter((t) => t.category === "sismica").length,
    altro: TEMPLATES_CATALOG.filter((t) => t.category === "altro").length,
  };

  const onOpenTemplate = async (t: TemplateEntry) => {
    if (cloneMutation.isPending) return;
    toast("info", `Caricamento template ${t.uc} · ${t.title}…`, 2_500);
    try {
      const cloned = await cloneMutation.mutateAsync(t.backendId);
      // v3.1.2 audit-fix L2-P0#1: passa l'ID via navigate state (no dispatchEvent
      // race — listener non ancora montato perche' App vive solo su path="*").
      navigate("/", { state: { pendingActiveId: cloned.id } });
    } catch (err) {
      toast(
        "error",
        `Impossibile aprire ${t.uc}. Riprova fra qualche secondo o scegli un altro template.`,
        5_000,
      );
      void err;
    }
  };

  return (
    <div className="tg" data-testid="templates-page">
      <header className="tg-topbar">
        <Link to="/" className="tg-brand">
          <span className="tg-brand-square">F</span>
          <span className="tg-brand-name">FEA Pro</span>
        </Link>
        <nav className="tg-bc" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="bc-sep">/</span>
          <span className="bc-now">Template Gallery</span>
        </nav>
        <div className="tg-spacer" />
        <button
          type="button"
          className="cmd-pill"
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }),
            )
          }
        >
          <Search width={13} height={13} aria-hidden="true" />
          <span>Cerca template…</span>
          <kbd>⌘ K</kbd>
        </button>
        <button
          type="button"
          className="tg-avatar"
          aria-label="Profilo"
          onClick={() => window.dispatchEvent(new Event("feapro:open-account-dialog"))}
        >
          {initialsFromEmail(userEmail)}
        </button>
      </header>

      <main className="tg-main">
        <header className="tg-head">
          <div className="tg-head-l">
            <span className="eyebrow">CATALOGO · {TEMPLATES_CATALOG.length} TEMPLATE</span>
            <h1>Modelli FEM pronti all&apos;uso</h1>
            <p>
              Configurati secondo NTC 18 ed Eurocodici. Ogni template è un punto di partenza
              editabile — non un modello chiuso.
            </p>
          </div>
          <div className="tg-head-r">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/", { state: { openNewModel: true } })}
              data-testid="tg-new-model-btn"
            >
              <Plus width={12} height={12} strokeWidth={2.4} aria-hidden="true" />
              Modello vuoto
            </button>
          </div>
        </header>

        <div className="tg-filters">
          <div className="filters-l">
            {(["tutti", "acciaio", "ca", "legno", "sismica", "altro"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip${activeCategory === cat ? " is-active" : ""}`}
                onClick={() => setActiveCategory(cat)}
                data-testid={`tg-filter-${cat}`}
              >
                {CATEGORY_LABELS[cat]}
                <span className="fc-count">{counts[cat]}</span>
              </button>
            ))}
          </div>
          <div className="filters-r">
            <div className="tier-toggle" role="group" aria-label="Tier">
              {(["free", "pro", "all"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  className={`tier-toggle-btn${tierFilter === tier ? " is-active" : ""}`}
                  onClick={() => setTierFilter(tier)}
                  data-testid={`tg-tier-${tier}`}
                >
                  {tier === "all" ? "Tutti" : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="tg-grid" data-testid="tg-grid">
          {filtered.map((t) => {
            const Thumb = VARIANT_THUMBS[t.variant];
            const isFeatured = t.badge === "POPOLARE";
            return (
              <article
                key={t.id}
                className={`tpl-card${isFeatured ? " tpl-card-featured" : ""}`}
                data-testid={`tpl-card-${t.uc.toLowerCase()}`}
              >
                <div className="tpl-thumb">
                  <Thumb />
                  {t.badge && (
                    <span className={`tpl-pill tpl-pill-${pillClass(t.badge)}`}>{t.badge}</span>
                  )}
                </div>
                <div className="tpl-body">
                  <span className="tpl-id">{t.uc}</span>
                  <h3>{t.title}</h3>
                  <p>{t.desc}</p>
                  <div className="tpl-meta">
                    <span className={`meta-pill ${matClass(t.category)}`}>
                      {matLabel(t.category)}
                    </span>
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
                  onClick={() => onOpenTemplate(t)}
                  disabled={cloneMutation.isPending}
                  data-testid={`tpl-cta-${t.uc.toLowerCase()}`}
                >
                  {cloneMutation.isPending ? "Caricamento…" : (
                    <>
                      Apri template
                      <ArrowRight width={11} height={11} strokeWidth={2.4} aria-hidden="true" />
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}


// ── Helpers ─────────────────────────────────────────────────────────────

function initialsFromEmail(email?: string): string {
  if (!email) return "??";
  const handle = email.split("@")[0];
  const parts = handle.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return handle.substring(0, 2).toUpperCase();
}

function pillClass(pill: TemplateBadge): string {
  return pill === "POPOLARE" ? "pop" : pill === "PRO" ? "pro" : "new";
}

function matClass(category: TemplateCategory): string {
  if (category === "ca") return "mp-mat mp-mat-ca";
  if (category === "legno") return "mp-mat mp-mat-wood";
  if (category === "acciaio") return "mp-mat";
  return "";
}

function matLabel(category: TemplateCategory): string {
  if (category === "ca") return "CA";
  if (category === "legno") return "legno";
  if (category === "acciaio") return "acciaio";
  if (category === "sismica") return "sismica";
  return "altro";
}
