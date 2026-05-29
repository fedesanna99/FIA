/**
 * DashboardPage · v2.7.1 Phase 4.2 mockup-driven
 *
 * Hub home dell'app, sostituisce `components/shell/Dashboard.tsx` legacy
 * (Tailwind 95% mockup A1) con implementazione mockup-driven secondo
 * `ui_kits/webapp_desktop/Dashboard new.html` del pack handoff v0.3.
 *
 * Composizione (top → bottom):
 *   1. DashTopBar    · brand + 5-link nav + cmd-pill ⌘K + notifications +
 *                      help + avatar
 *   2. Hero          · greeting personalizzato + title + sub + usage-card
 *                      (Free tier 3/5 progetti attivi)
 *   3. ActionRow     · 3 big tile (Nuovo modello / Apri template /
 *                      Percorso guidato) — primary, purple, warn
 *   4. RecentSection · "Continua dove ti sei fermato" + seg filter
 *                      Tutti/Acciaio/CA/Sismica + grid 4 card SVG-thumb
 *   5. DualRow       · Percorsi guidati (list con progress circle) +
 *                      Changelog (4 entries NEW/FIX/IMP)
 *   6. DashFoot      · status + preliminary disclaimer + 3 link
 *
 * Backward compat con Dashboard.tsx legacy: stessi Props (models +
 * modelsUnavailable + modelsRefreshing + onRetryModels + onSelect).
 * L'integrazione in App.tsx è single-line (import alias).
 *
 * Reference: `ui_kits/webapp_desktop/Dashboard new.html` (566 righe) +
 * `dashboard-new.css` (672 righe namespaced sotto `.dash`).
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  // Fetta E3.1+E3.3: rimossi Bell/HelpCircle/Search (DashTopBar) +
  // LayoutGrid/ListChecks/Plus (ActionRow). ArrowRight resta perche'
  // ancora usato in altri sotto-componenti (RecentSection, DashFoot).
  ArrowRight,
} from "lucide-react";

import { getQuota } from "../api/billing";
import { useAuthStore } from "../store/authStore";
import { useAnalysisStore } from "../store/analysisStore";
import { toast } from "../store/toastStore";
import { modelsApi } from "../api/client";
import { APP_TAG, APP_VERSION } from "../lib/version";
import type { FEAModel } from "../types/model";

import "../styles/dashboard.css";

// Fetta E3.1+E3.2 (redesign workspace-fasi): la DashTopBar+Hero interne
// v2.7.1 sono sostituite da componenti esportati che replicano il
// mockup Claude Design Round 2 (Handoff 05). Vedi
// .claude/ricordi/handoffs/05-claude-design-round2-response.md.
import { DashTopBar } from "./DashTopBar";
import { DashHero, type DashHeroState } from "./DashHero";
import { NewModelTileSection } from "./NewModelTileSection";
import { RecentsBlock } from "./RecentsBlock";
import { TemplateGallery } from "./TemplateGallery";
import { EmptyOnboarding } from "./EmptyOnboarding";
import { QuotaBanner } from "./QuotaBanner";


// v2.7.2 Phase 4.3: hook condiviso per navigare a /templates da qualsiasi
// sub-component della DashboardPage (nav link, action tile, "Vedi tutti",
// demo cards). Estratto perché useNavigate si chiama in 4 sub-components
// distinti.
function useGoTemplates(): () => void {
  const navigate = useNavigate();
  return () => navigate("/templates");
}

// v2.7.3 Phase 4.3b: hook condiviso per navigare a /percorsi/uc1 (Percorso
// guidato Use Case 1 · Trave bi-appoggiata). Usato dal tile ActionRow e
// dal link "UC1 · Trave bi-appoggiata" nell'Hero.
function useGoPercorsoUC1(): () => void {
  const navigate = useNavigate();
  return () => navigate("/percorsi/uc1");
}


interface Props {
  models: FEAModel[];
  modelsUnavailable?: boolean;
  modelsRefreshing?: boolean;
  onRetryModels?: () => void;
  onSelect: (id: string) => void;
}


export function DashboardPage({
  models,
  modelsUnavailable = false,
  modelsRefreshing = false,
  onRetryModels,
  onSelect,
}: Props) {
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id ?? "demo_user";

  const { data: quota, isError: quotaError } = useQuery({
    queryKey: ["billing-quota", userId],
    queryFn: () => getQuota(userId),
    staleTime: 30_000,
    retry: 1,
  });

  // v3.1.1 audit-fix L2-3: filtro user-models centralizzato. Esclude i
  // template `ex_*` E filtra per `owner_id` quando autenticato (multi-utente).
  // Ordinati per `updated_at` desc (backend già ordina, ma replichiamo per
  // robustezza con modelli pre-migration senza timestamp).
  const userModels = useMemo(() => {
    const filtered = models.filter((m) => {
      if (m.id.startsWith("ex_")) return false;
      if (authUser?.id && m.owner_id && m.owner_id !== authUser.id) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const aT = a.updated_at ?? "";
      const bT = b.updated_at ?? "";
      if (aT !== bT) return bT.localeCompare(aT);
      return a.id.localeCompare(b.id);
    });
  }, [models, authUser?.id]);

  // v3.1.1 audit-fix L2-10: greeting dinamico. Prima `useMemo([])` fissava
  // il valore al primo mount (utente che lavora dalle 17:59 alle 22:00 vedeva
  // "Buon pomeriggio" tutto il tempo). Ora useState + interval ogni 5 min.
  const [greeting, setGreeting] = useState(() => greetingForHour(new Date().getHours()));
  useEffect(() => {
    const id = window.setInterval(() => {
      setGreeting(greetingForHour(new Date().getHours()));
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const firstName = useMemo(() => extractFirstName(authUser?.email, authUser?.nome), [authUser]);

  // Usage card: deriva da quota.tier + progetti attivi (proxy: userModels.length)
  // v3.1.1 audit-fix L2-19: se quota non disponibile (backend down / errore),
  // mostra placeholder neutro "—" invece del fallback silenzioso "FREE".
  const tierLabel = quotaError ? "—" : (quota?.tier ?? "free").toUpperCase();
  const projCap = quota?.tier === "free" ? 5 : 50;
  const projUsed = Math.min(userModels.length, projCap);

  return (
    <div className="dash dash-soft" data-testid="dashboard-page">
      <DashTopBar tierLabel={tierLabel} />
      <QuotaBanner used={projUsed} limit={projCap} />
      <main className="dash-main">
        <DashHero
          greeting={greeting}
          firstName={firstName}
          state={
            // Fetta E3.2: stato Hero derivato deterministicamente.
            // C = primo accesso (zero modelli utente).
            // B = quota >80% sul piano corrente.
            // A = abituale, default.
            userModels.length === 0
              ? ("C" as DashHeroState)
              : projCap > 0 && projUsed / projCap > 0.8
                ? ("B" as DashHeroState)
                : ("A" as DashHeroState)
          }
          latestModel={userModels[0] ? { id: userModels[0].id, name: userModels[0].name } : null}
          onResume={(id) => onSelect(id)}
          onArchive={() => window.dispatchEvent(new Event("feapro:open-billing"))}
        />
        {/* Fetta E3.2: vecchia <Hero /> v2.7.1 (greeting+h1+sub+usage card)
            rimossa. La nuova <DashHero /> sopra sostituisce la prima parte
            (eyebrow+h1+sub variant). La usage card embedded sara' spostata
            in QuotaBanner (E3.7) e pagina /settings/billing (E3.8). */}
        <NewModelTileSection />
        {/* Fetta E3.6: stato C (0 modelli) mostra EmptyOnboarding al posto
            di RecentsBlock. RecentsBlock gia' torna null se 0 modelli, ma
            esplicito qui lo switch per leggibilita'. */}
        {userModels.length === 0 ? (
          <EmptyOnboarding
            onStart={(backendId, label) => {
              window.dispatchEvent(
                new CustomEvent("feapro:load-template", { detail: { templateId: backendId, label } }),
              );
            }}
            onScrollToGallery={() => {
              const el = document.getElementById("template-gallery");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        ) : (
          <RecentsBlockWired
            models={userModels}
            modelsUnavailable={modelsUnavailable}
            modelsRefreshing={modelsRefreshing}
            onSelect={onSelect}
          />
        )}
        {/* Fetta E3.5: TemplateGallery prominente (decisione IA Dashboard #5,
            leva engagement-per-token). Sostituisce DualRow v2.7.1 che
            mostrava Percorsi+Changelog (commentato in fondo al file). */}
        <TemplateGallery
          onOpenTemplate={(backendId, label) => {
            if (!backendId) {
              window.dispatchEvent(new CustomEvent("feapro:open-template-gallery"));
              return;
            }
            window.dispatchEvent(
              new CustomEvent("feapro:load-template", { detail: { templateId: backendId, label } }),
            );
          }}
          onOpenGallery={() => window.dispatchEvent(new CustomEvent("feapro:open-template-gallery"))}
        />
        {/* DualRow v2.7.1 (Percorsi + Changelog) rimosso dal render in E3.5.
            Funzione e helper restano nel file commentati in fondo come backup. */}
      </main>
      <DashFoot />
    </div>
  );
}


// ── RecentsBlockWired ───────────────────────────────────────────────────
// Fetta E3.4: piccolo wrapper che collega RecentsBlock alle utility
// interne di DashboardPage (useGoTemplates hook + detectVariant/
// thumbForVariant SVG renderer). Mantiene RecentsBlock.tsx puro
// (presentational) — questo wrapper conosce i route + thumbnails specifici
// di FEA Pro.
function RecentsBlockWired(props: {
  models: FEAModel[];
  modelsUnavailable?: boolean;
  modelsRefreshing?: boolean;
  onSelect: (id: string) => void;
}) {
  const goTemplates = useGoTemplates();
  return (
    <RecentsBlock
      models={props.models}
      modelsUnavailable={props.modelsUnavailable}
      modelsRefreshing={props.modelsRefreshing}
      onSelect={props.onSelect}
      onViewAll={() => goTemplates()}
      renderThumb={thumbForVariant}
      inferVariant={detectVariant}
    />
  );
}


// ── DashTopBar legacy v2.7.1 RIMOSSA ────────────────────────────────────
// Sostituita dal componente esportato `./DashTopBar.tsx` (import sopra)
// nella Fetta E3.1 del redesign workspace-fasi. Il nuovo componente
// replica ShellTopBar E2.1 (IA prototipo v3): brand + 3 nav fissi
// (Home/Modelli/Jobs) + ⌘K + help + bell + AvatarMenu Radix. Le 2 route
// mancanti (/modelli /jobs) sono TODO E2.5 segnalati inline.


// ── Hero legacy v2.7.1 RIMOSSO ──────────────────────────────────────────
// Sostituito dal componente esportato `./DashHero.tsx` (Fetta E3.2).
// Il vecchio Hero aveva: greeting+h1+sub con metadati "X progetti in
// lavorazione · N percorsi · ultima sessione su Y" + usage card embedded
// con "Piano FREE · Utilizzo 2/5 · Scopri Pro". La nuova DashHero ha
// solo eyebrow+h1+sub (3 varianti per stato A/B/C). I metadati spariscono
// (info ridondante con RecentsCarousel "Riprendi" che arriva in E3.4),
// la usage card viene spostata a QuotaBanner (E3.7) + pagina
// /settings/billing (E3.8).


// ── ActionRow + ActionTile legacy v2.7.1 RIMOSSE (Fetta E3.3) ───────────
// Sostituite dal componente esportato `./NewModelTileSection.tsx` che
// implementa la decisione IA Dashboard #2 di Federico: "1 sola tile
// primaria 'Nuovo modello' + 2 link sobri laterali (Template/Percorso)".
// Il vecchio pattern "3 tile uguali" e' stato rifiutato in Round 1.


// ── RecentSection + Demo + RecentModelCard legacy v2.7.1 RIMOSSI (E3.4) ─
// Sostituiti da `./RecentsBlock.tsx` + RecentsBlockWired sopra:
// - carousel orizzontale snap-scroll (vs grid 4 col)
// - prima card con resume-bar + bottone "Riprendi" (audacia a)
// - trust badge 4 stati onesti PRELIM/DRAFT/VALID
// - filtri segmented (Acciaio/CA/Sismica) RIMOSSI: non nel mockup CD R2,
//   se servono in futuro li riproponiamo come fetta separata. Il vecchio
//   filter heuristic vs `category` heuristic restera' qui sotto commentato
//   come riferimento (function modelMatchesCategory) ma non e' chiamato.

// vvvvvvvv blocco legacy v2.7.1 (mantenuto solo come backup commentato) vvvvv
/*
interface RecentSectionProps {
  models: FEAModel[];
  modelsUnavailable?: boolean;
  modelsRefreshing?: boolean;
  onRetryModels?: () => void;
  onSelect: (id: string) => void;
}
type RecentFilter = "tutti" | "acciaio" | "ca" | "sismica";

function RecentSection({ models, modelsUnavailable, modelsRefreshing, onRetryModels, onSelect }: RecentSectionProps) {
  // v3.1.1 audit-fix L2-6: filter segmented era pura decorazione. Ora stato
  // reale + filtro su `materials[].name` (heuristic) o `description`.
  const [filter, setFilter] = useState<RecentFilter>("tutti");
  const filteredModels = useMemo(() => {
    if (filter === "tutti") return models;
    return models.filter((m) => modelMatchesCategory(m, filter));
  }, [models, filter]);
  // Top 4 per ordine di mantenimento. Se vuoto, mostra demo cards mockup.
  const recent = useMemo(() => filteredModels.slice(0, 4), [filteredModels]);
  // Demo cards solo se la lista raw (non filtrata) è vuota — se l'utente
  // ha modelli ma il filter li nasconde mostriamo "nessun risultato".
  // v3.1.2 audit-fix L2-9: niente demo se backend è in errore (l'utente
  // vedrebbe sia il banner errore sia 4 modelli fittizi — confusing).
  const showDemos = models.length === 0 && !modelsUnavailable;
  const showEmptyFilter = !showDemos && recent.length === 0;
  const goTemplates = useGoTemplates();

  return (
    <section className="block" data-testid="dash-recent">
      <header className="block-head">
        <div>
          <span className="eyebrow">Progetti recenti</span>
          <h2>Continua dove ti sei fermato</h2>
        </div>
        <div className="block-actions">
          <div className="seg" role="group" aria-label="Filtro categoria">
            {(["tutti", "acciaio", "ca", "sismica"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`seg-btn${filter === k ? " is-active" : ""}`}
                onClick={() => setFilter(k)}
                aria-pressed={filter === k}
                data-testid={`dash-recent-filter-${k}`}
              >
                {k === "tutti" ? "Tutti" : k === "ca" ? "CA" : k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => goTemplates()}>
            Vedi tutti
            <ArrowRight width={12} height={12} aria-hidden="true" />
          </button>
        </div>
      </header>

      {modelsUnavailable && (
        <div className="usage-card" data-testid="dash-recent-error">
          <span className="eyebrow" style={{ color: "var(--danger)" }}>Errore caricamento</span>
          <span className="usage-meta">Impossibile recuperare i modelli. Verifica la connessione.</span>
          {onRetryModels && (
            <button type="button" className="usage-cta" onClick={onRetryModels} style={{ color: "var(--accent)" }}>
              Riprova →
            </button>
          )}
        </div>
      )}

      <div className="recent-grid">
        {showDemos ? (
          <DemoRecentCards onSelect={onSelect} />
        ) : showEmptyFilter ? (
          <div className="usage-card" data-testid="dash-recent-filter-empty" style={{ gridColumn: "1 / -1" }}>
            <span className="eyebrow">Nessun progetto nella categoria selezionata</span>
            <span className="usage-meta">Prova un altro filtro o usa "Tutti" per vedere tutti i progetti.</span>
            <button type="button" className="usage-cta" onClick={() => setFilter("tutti")} style={{ color: "var(--accent)" }}>
              Mostra tutti →
            </button>
          </div>
        ) : (
          recent.map((m, i) => (
            <RecentModelCard
              key={m.id}
              model={m}
              active={i === 0}
              onClick={() => onSelect(m.id)}
            />
          ))
        )}
      </div>

      {modelsRefreshing && !showDemos && (
        <span className="eyebrow" style={{ alignSelf: "flex-end" }}>Aggiornamento…</span>
      )}
    </section>
  );
}


// v3.1.1 audit-fix L2-6: heuristic per filtrare modelli per categoria UI.
// Backend non ha campo `category`, quindi inferiamo da `name`/`description`/
// id template tip. Casi unmatched cadono fuori dal filter (vista "vuota").
function modelMatchesCategory(m: FEAModel, cat: RecentFilter): boolean {
  if (cat === "tutti") return true;
  const haystack = [
    m.name ?? "",
    m.description ?? "",
    m.id,
    ...(m.materials ?? []).map((mat) => mat.name ?? ""),
  ].join(" ").toLowerCase();
  if (cat === "acciaio") return /acciaio|steel|s355|s275|ipe|hea|heb/.test(haystack);
  if (cat === "ca") return /\bca\b|calcestruzzo|concrete|c25|c30|c35|c40/.test(haystack);
  if (cat === "sismica") return /sismic|seismic|ec8|spettro|response.spectrum|modale|modal/.test(haystack);
  return false;
}


// ── DemoRecentCards (mockup hardcoded UC1/UC2/UC3/UC5) ──────────────────
// v3.1.1 audit-fix L2-7: prima ogni card mandava a /templates. Ora clona
// il rispettivo template tramite POST /api/models/from-template/{id} e
// apre il workspace col modello nuovo (vedi onLoadDemo). UC5 non ha
// backend wiring → toast info "in arrivo".
function DemoRecentCards({ onSelect }: { onSelect: (id: string) => void }) {
  // v3.1.2 audit-fix L2-3 + L2-6: useMutation per (a) disabled state contro
  // doppio-click, (b) invalidazione automatica della query ["models"].
  const qc = useQueryClient();
  const cloneMutation = useMutation({
    mutationFn: (backendId: string) => modelsApi.fromTemplate(backendId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["models"] });
    },
  });
  const onLoadDemo = async (backendId: string | null, label: string) => {
    if (!backendId) {
      toast("info", `${label} è ancora in arrivo. Per ora prova UC1, UC2 o UC3.`, 4500);
      return;
    }
    if (cloneMutation.isPending) return;
    toast("info", `Caricamento ${label}…`, 2_500);
    try {
      const cloned = await cloneMutation.mutateAsync(backendId);
      onSelect(cloned.id);
    } catch {
      toast("error", `Impossibile aprire ${label}. Riprova fra qualche secondo.`, 5_000);
    }
  };
  return (
    <>
      <button type="button" className="recent-card recent-card-active" onClick={() => onLoadDemo("ex_simple_beam_2d", "UC1 · Trave bi-appoggiata")}>
        <div className="recent-thumb">
          <BeamThumb />
          <span className="recent-trust trust-prelim">PRELIM</span>
        </div>
        <div className="recent-body">
          <div className="recent-head">
            <span className="recent-id">UC1</span>
            <h3>Trave bi-appoggiata</h3>
            <span className="recent-status status-running">
              <span className="status-dot" />Solved
            </span>
          </div>
          <p className="recent-desc">Statica lineare · q = 10 kN/m · σ_max = 178 MPa · UR EC3 = 0.24</p>
          <div className="recent-meta">
            <span>14:32 · oggi</span>
            <span className="recent-dot" />
            <span>11 nodi · 10 beam</span>
            <span className="recent-dot" />
            <span className="recent-pill recent-pill-ec3">EC3</span>
          </div>
        </div>
      </button>

      <button type="button" className="recent-card" onClick={() => onLoadDemo("ex_portal_frame_2d", "UC2 · Portale 2D")}>
        <div className="recent-thumb">
          <PortalThumb />
          <span className="recent-trust trust-draft">DRAFT</span>
        </div>
        <div className="recent-body">
          <div className="recent-head">
            <span className="recent-id">UC2</span>
            <h3>Portale 2D · vento</h3>
            <span className="recent-status status-modified">
              <span className="status-dot" />In bozza
            </span>
          </div>
          <p className="recent-desc">Da rieseguire · modifiche post-analisi · cerchi statica + modale</p>
          <div className="recent-meta">
            <span>ieri · 18:14</span>
            <span className="recent-dot" />
            <span>9 nodi · 6 beam</span>
            <span className="recent-dot" />
            <span className="recent-pill recent-pill-ec3">EC3</span>
          </div>
        </div>
      </button>

      <button type="button" className="recent-card" onClick={() => onLoadDemo("ex_tower_3d", "UC3 · Torre 8 piani")}>
        <div className="recent-thumb">
          <TowerThumb />
          <span className="recent-trust trust-prelim">PRELIM</span>
        </div>
        <div className="recent-body">
          <div className="recent-head">
            <span className="recent-id">UC3</span>
            <h3>Torre 8 piani · sismica</h3>
            <span className="recent-status status-running">
              <span className="status-dot" />Modale OK
            </span>
          </div>
          <p className="recent-desc">f₁ = 1.82 Hz · modale lineare · pendente verifica EC8 spettro</p>
          <div className="recent-meta">
            <span>2 giorni fa</span>
            <span className="recent-dot" />
            <span>72 nodi · 96 elem</span>
            <span className="recent-dot" />
            <span className="recent-pill recent-pill-ec8">EC8</span>
          </div>
        </div>
      </button>

      <button type="button" className="recent-card" onClick={() => onLoadDemo(null, "UC5 · Mensola incastrata")}>
        <div className="recent-thumb">
          <CantileverThumb />
          <span className="recent-trust trust-prelim">PRELIM</span>
        </div>
        <div className="recent-body">
          <div className="recent-head">
            <span className="recent-id">UC5</span>
            <h3>Mensola incastrata</h3>
            <span className="recent-status status-running">
              <span className="status-dot" />Solved
            </span>
          </div>
          <p className="recent-desc">δ_tip = 4.2 mm · σ_VM = 89 MPa · UR EC3 = 0.31</p>
          <div className="recent-meta">
            <span>5 giorni fa</span>
            <span className="recent-dot" />
            <span>6 nodi · 5 beam</span>
            <span className="recent-dot" />
            <span className="recent-pill recent-pill-ec3">EC3</span>
          </div>
        </div>
      </button>
    </>
  );
}


// ── RecentModelCard (per modelli REALI) ─────────────────────────────────
interface RecentModelCardProps {
  model: FEAModel;
  active?: boolean;
  onClick: () => void;
}
function RecentModelCard({ model, active, onClick }: RecentModelCardProps) {
  // Heuristic: detect "thumbnail variant" from model topology
  const variant = detectVariant(model);
  const thumb = thumbForVariant(variant);
  const nNodes = model.nodes.length;
  const nElems = model.elements.length;
  return (
    <button
      type="button"
      className={`recent-card${active ? " recent-card-active" : ""}`}
      onClick={onClick}
      data-testid={`dash-recent-card-${model.id}`}
    >
      <div className="recent-thumb">
        {thumb}
        <span className="recent-trust trust-prelim">PRELIM</span>
      </div>
      <div className="recent-body">
        <div className="recent-head">
          <span className="recent-id">{model.id.substring(0, 6).toUpperCase()}</span>
          <h3>{model.name}</h3>
        </div>
        {model.description && <p className="recent-desc">{model.description}</p>}
        <div className="recent-meta">
          <span>{nNodes} nodi · {nElems} elem</span>
          <span className="recent-dot" />
          <span className="recent-pill recent-pill-ec3">EC3</span>
        </div>
      </div>
    </button>
  );
}
*/ // ^^^^^^^^^^^ fine blocco commentato legacy v2.7.1 ^^^^^^^^^^^^^^^^^^^^^^


// ── DualRow + PercorsoRow + ClRow legacy v2.7.1 RIMOSSI (Fetta E3.5) ────
// La sezione Percorsi+Changelog del fondo Dashboard e' stata sostituita
// dalla TemplateGallery prominente (decisione IA Dashboard #5 di
// Federico, leva engagement-per-token). Le funzioni sono state
// cancellate (~115 righe). Cerca git log per ripristinare se serve.
// (blocco DualRow+PercorsoRow+ClRow cancellato — ~115 righe)


// ── DashFoot ────────────────────────────────────────────────────────────
function DashFoot() {
  return (
    <footer className="dash-foot" data-testid="dash-foot">
      {/* v3.1.2 audit-fix L2-11: health URL via env (dev/staging puntavano a prod). */}
      <span>FEA Pro {APP_VERSION} · <a href={`${(import.meta.env.VITE_API_URL as string | undefined) || "https://fea-pro.fly.dev"}/api/health`} target="_blank" rel="noreferrer">Status · all green</a></span>
      <span>·</span>
      <span><b>Preliminary release</b> — non raccomandata per progetti reali. <Link to="/preliminary">Perché?</Link></span>
      <span className="foot-spacer" />
      <span><a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("feapro:open-help")); }}>Docs</a></span>
      <span><Link to="/privacy">Privacy</Link> · <Link to="/terms">Termini</Link> · <Link to="/about">About</Link></span>
      <span><a href="https://github.com/fedesanna99/FIA" target="_blank" rel="noreferrer">GitHub</a></span>
    </footer>
  );
}


// ── Thumbnails SVG (estratti verbatim da mockup) ────────────────────────

function BeamThumb() {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="thumb-beam-stress" x1="0" x2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.5" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <rect width={320} height={180} fill="var(--bg-viewport)" />
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.4}>
        <line x1={0} y1={60} x2={320} y2={60} />
        <line x1={0} y1={120} x2={320} y2={120} />
        <line x1={80} y1={0} x2={80} y2={180} />
        <line x1={160} y1={0} x2={160} y2={180} />
        <line x1={240} y1={0} x2={240} y2={180} />
      </g>
      <g stroke="var(--coral)" strokeWidth={1.2} opacity={0.8}>
        <line x1={40} y1={48} x2={280} y2={48} strokeWidth={1.6} />
        {[60, 90, 120, 150, 180, 210, 240, 270].map((x) => (
          <line key={x} x1={x} y1={50} x2={x} y2={76} />
        ))}
      </g>
      <path d="M40 90 Q160 130, 280 90" stroke="url(#thumb-beam-stress)" strokeWidth={6} fill="none" strokeLinecap="round" />
      <g stroke="var(--ink-muted)" strokeWidth={1.2} fill="none">
        <polygon points="40,95 32,108 48,108" />
        <polygon points="280,95 272,107 288,107" />
        <circle cx={276} cy={111} r={2} />
        <circle cx={284} cy={111} r={2} />
      </g>
      <g fontFamily="JetBrains Mono" fontSize={9} fill="var(--ink-dim)">
        <text x={160} y={158} textAnchor="middle">L = 6.00 m · IPE 300 · S355</text>
      </g>
    </svg>
  );
}

function PortalThumb() {
  return (
    <svg viewBox="0 0 320 180">
      <rect width={320} height={180} fill="var(--bg-viewport)" />
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.4}>
        <line x1={0} y1={60} x2={320} y2={60} />
        <line x1={0} y1={120} x2={320} y2={120} />
        <line x1={80} y1={0} x2={80} y2={180} />
        <line x1={240} y1={0} x2={240} y2={180} />
      </g>
      <g stroke="var(--ink)" strokeWidth={2} fill="none">
        <line x1={80} y1={140} x2={80} y2={40} />
        <line x1={80} y1={40} x2={240} y2={40} />
        <line x1={240} y1={40} x2={240} y2={140} />
      </g>
      <g fill="var(--ink)">
        <circle cx={80} cy={40} r={3} />
        <circle cx={240} cy={40} r={3} />
        <circle cx={160} cy={40} r={2.5} />
      </g>
      <g stroke="var(--coral)" strokeWidth={1.2}>
        {[60, 80, 100, 120].map((y) => (
          <g key={y}>
            <line x1={50} y1={y} x2={78} y2={y} strokeWidth={1.5} />
            <polygon points={`78,${y} 72,${y - 3} 72,${y + 3}`} fill="var(--coral)" />
          </g>
        ))}
      </g>
      <g stroke="var(--ink-muted)" strokeWidth={1}>
        <line x1={60} y1={148} x2={100} y2={148} />
        <line x1={220} y1={148} x2={260} y2={148} />
      </g>
      <g fontFamily="JetBrains Mono" fontSize={9} fill="var(--ink-dim)">
        <text x={160} y={168} textAnchor="middle">B = 4 m · H = 5 m · IPE 240</text>
      </g>
    </svg>
  );
}

function TowerThumb() {
  return (
    <svg viewBox="0 0 320 180">
      <rect width={320} height={180} fill="var(--bg-viewport)" />
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.4}>
        <line x1={0} y1={60} x2={320} y2={60} />
        <line x1={0} y1={120} x2={320} y2={120} />
      </g>
      <g stroke="var(--ink)" strokeWidth={1} fill="none" opacity={0.85}>
        <line x1={130} y1={35} x2={115} y2={155} />
        <line x1={190} y1={35} x2={205} y2={155} />
        <line x1={155} y1={25} x2={140} y2={145} opacity={0.5} />
        <line x1={215} y1={25} x2={230} y2={145} opacity={0.5} />
        <g strokeDasharray="2 2">
          <line x1={125} y1={55} x2={200} y2={55} />
          <line x1={123} y1={75} x2={202} y2={75} />
          <line x1={121} y1={95} x2={204} y2={95} />
          <line x1={119} y1={115} x2={206} y2={115} />
        </g>
        <g strokeWidth={1.4}>
          <line x1={117} y1={135} x2={208} y2={135} />
          <line x1={115} y1={155} x2={210} y2={155} />
        </g>
      </g>
      <g stroke="var(--purple)" strokeWidth={1.6} fill="none">
        <path d="M115 155 Q 200 100, 145 35" />
        <path d="M205 155 Q 280 100, 175 35" />
      </g>
      <g stroke="var(--ink-muted)" strokeWidth={1}>
        <line x1={100} y1={160} x2={220} y2={160} />
      </g>
      <g fontFamily="JetBrains Mono" fontSize={9} fill="var(--ink-dim)">
        <text x={160} y={178} textAnchor="middle">Torre · 8 piani · CA</text>
      </g>
    </svg>
  );
}

function CantileverThumb() {
  return (
    <svg viewBox="0 0 320 180">
      <rect width={320} height={180} fill="var(--bg-viewport)" />
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.4}>
        <line x1={0} y1={90} x2={320} y2={90} />
        <line x1={80} y1={0} x2={80} y2={180} />
      </g>
      <rect x={40} y={40} width={20} height={100} fill="var(--ink-dim)" opacity={0.18} />
      <g stroke="var(--ink-muted)" strokeWidth={0.8}>
        {[40, 55, 70, 85, 100, 115, 130].map((y) => (
          <line key={y} x1={60} y1={y} x2={56} y2={y + 4} />
        ))}
      </g>
      <path d="M60 90 Q160 100, 270 124" stroke="var(--ink)" strokeWidth={2} fill="none" />
      <line x1={60} y1={90} x2={270} y2={90} stroke="var(--border)" strokeWidth={1.5} strokeDasharray="2 3" />
      <g stroke="var(--coral)" strokeWidth={1.4}>
        <line x1={270} y1={98} x2={270} y2={135} />
        <polygon points="270,135 266,128 274,128" fill="var(--coral)" />
      </g>
      <text x={278} y={118} fontFamily="JetBrains Mono" fontSize={9} fontWeight={700} fill="var(--coral)">P = 5 kN</text>
      <g fontFamily="JetBrains Mono" fontSize={9} fill="var(--ink-dim)">
        <text x={160} y={170} textAnchor="middle">L = 2.5 m · HEB 200 · S275</text>
      </g>
    </svg>
  );
}


// ── helpers ─────────────────────────────────────────────────────────────

function greetingForHour(h: number): string {
  if (h < 6) return "Notte fonda";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buona sera";
}

function extractFirstName(email?: string, nome?: string | null): string {
  if (nome) return nome;
  if (!email) return "ingegnere";
  const handle = email.split("@")[0];
  // Common patterns: fede.sanna99, federico.s, etc.
  const seg = handle.split(/[._-]/)[0];
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

// Fetta E3.1: `initialsFromEmail` rimossa — era usata SOLO dalla vecchia
// DashTopBar interna (eliminata in questa fetta). Le iniziali in topbar
// adesso vengono dal componente `CollabAvatars` interno di `AvatarMenu`
// (frontend/src/components/shell/topbar/CollabAvatars.tsx, ha la sua
// funzione `initials(email)`). Se serve altrove, riusare quella.

type ThumbVariant = "beam" | "portal" | "tower" | "cantilever";

function detectVariant(model: FEAModel): ThumbVariant {
  // Heuristic basata su topology
  if (model.is_3d && model.nodes.length > 40) return "tower";
  // Single fixed constraint on one end ⇒ cantilever
  const hasFixed = (model.constraints ?? []).some((c) => c.type === "fixed");
  if (hasFixed && model.elements.length <= 8) return "cantilever";
  // Multiple beams forming portal (3+ elements, 2 fixed ends)
  if (model.elements.length >= 3 && model.elements.length <= 6) return "portal";
  return "beam";
}

function thumbForVariant(v: ThumbVariant): ReactNode {
  switch (v) {
    case "tower": return <TowerThumb />;
    case "portal": return <PortalThumb />;
    case "cantilever": return <CantileverThumb />;
    case "beam":
    default: return <BeamThumb />;
  }
}
