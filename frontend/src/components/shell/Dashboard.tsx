/**
 * Dashboard (Precision v2.0 PR16 T1) — A1 mockup parity 95%.
 *
 * Layout pixel-faithful al mockup A1-dashboard.html di Claude Design:
 *  - Grid main 1fr + 304px sidebar destra (desktop), stack su mobile
 *  - Hero: eyebrow chip + h1 4xl + p sub max 56ch
 *  - Hubs: Studio Pro + Percorsi con axis-tag in top-left, bullets mono
 *  - Quick actions: 4 cards con icon, name+sub, foot tag+shortcut
 *  - Recent projects: 4 cards con thumb SVG vector + status badge (RUN/OK/ERR)
 *  - Dropzone in fondo
 *  Sidebar destra:
 *  - Crediti widget (numero + barra + meta + CTA fatturazione)
 *  - Per iniziare (checklist 4 step, done/numerati)
 *  - Copilot (BETA)
 *  - Suggerimento (⌘K tip)
 *
 * Animazioni: slide-up al mount sulle sezioni (delayed), hover lift sui
 * hub cards, animate-pulse sui dot live.
 */
import { useQuery } from "@tanstack/react-query";
import { Plus, FileUp, Layers, FlaskConical, RefreshCcw, WifiOff, ArrowRight, MessageSquare } from "lucide-react";
import type { FEAModel } from "../../types/model";
import { getQuota } from "../../api/billing";
import { useAuthStore } from "../../store/authStore";
import { useAnalysisStore } from "../../store/analysisStore";

interface Props {
  models: FEAModel[];
  modelsUnavailable?: boolean;
  modelsRefreshing?: boolean;
  onRetryModels?: () => void;
  onSelect: (id: string) => void;
}

export function Dashboard({
  models,
  modelsUnavailable = false,
  modelsRefreshing = false,
  onRetryModels,
  onSelect,
}: Props) {
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id ?? "demo_user";

  const { data: quota } = useQuery({
    queryKey: ["billing-quota", userId],
    queryFn: () => getQuota(userId),
    staleTime: 30_000,
    retry: 1,
  });

  // v1.6 S0 B01: "Esempi" e "Da template" → galleria template dedicata
  const openTemplateGallery = () =>
    window.dispatchEvent(new Event("feapro:open-template-gallery"));

  const totalCap = (quota?.cap_credits ?? 100) + (quota?.bonus_credits ?? 0);
  const used = quota?.used_credits ?? 0;
  const pct = totalCap > 0 ? (used / totalCap) * 100 : 0;
  const tier = quota?.tier ?? "free";
  const nJobs = isRunning ? 1 : 0;

  // Separazione user models / examples (id "ex_*")
  const userModels = models.filter((m) => !m.id.startsWith("ex_"));
  const recentModels = userModels.slice(0, 4);

  // Get Started checklist (heuristic basata su stato modello)
  const hasModel = userModels.length > 0;
  const hasResults = false; // futuro: leggere resultsStore
  const completedSteps = (hasModel ? 1 : 0) + (hasResults ? 2 : 0);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-bg">
      <div
        className="grid gap-4 md:gap-6 lg:gap-8 px-3 sm:px-5 md:px-6 lg:px-8 pt-5 md:pt-7 lg:pt-9 pb-14 max-w-[1440px] mx-auto grid-cols-1 lg:grid-cols-[minmax(0,1fr)_304px]"
        data-testid="dashboard-root"
      >
        {/* ── COLONNA SINISTRA: content ────────────────────────────── */}
        <div className="flex flex-col gap-8 min-w-0">
          {/* Hero */}
          <section className="flex flex-col gap-4 animate-fade-in" data-testid="dashboard-hero">
            <span
              className="inline-flex self-start items-center gap-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide-4 font-semibold text-ink-3 border border-border bg-bg-panel"
              data-testid="dashboard-hero-eyebrow"
            >
              <span className={`w-1.5 h-1.5 ${models.length === 0 ? "bg-warn" : "bg-success"}`} />
              {models.length === 0
                ? "Nessun modello attivo"
                : `${models.length} ${models.length === 1 ? "modello" : "modelli"} · ${nJobs} job in corso${authUser ? ` · ${authUser.email.split("@")[0]}` : ""}`}
            </span>
            <h1
              className="font-display font-semibold tracking-tight-4 text-ink text-[32px] sm:text-[40px] lg:text-[48px] leading-[1.02]"
            >
              Inizia un'analisi.
            </h1>
            <p className="text-md text-ink-2 leading-relaxed max-w-[56ch]">
              Due modi per costruire e analizzare un modello strutturale.
              Algoritmo prima, AI per accelerare — niente black box,
              tutti i calcoli tracciabili a formule normative.
            </p>
          </section>

          {/* Backend down banner */}
          {modelsUnavailable && (
            <div className="border border-warn/35 bg-bg-warn text-warn px-3.5 py-2.5 flex items-center gap-2.5 text-sm animate-fade-in">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">Backend/database non disponibile.</span>{" "}
                <span className="text-ink-3">
                  La UI resta navigabile, ma modelli e salvataggi richiedono le API.
                </span>
              </div>
              {onRetryModels && (
                <button
                  type="button"
                  onClick={onRetryModels}
                  disabled={modelsRefreshing}
                  className="h-7 px-2 border border-warn/30 bg-bg-panel/60 text-[11px] font-medium text-ink hover:bg-bg-panel disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5 flex-shrink-0"
                >
                  <RefreshCcw className={`w-3 h-3 ${modelsRefreshing ? "animate-spin" : ""}`} />
                  Riprova
                </button>
              )}
            </div>
          )}

          {/* Hubs Studio Pro / Percorsi */}
          <section
            className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up"
            data-testid="dashboard-hubs"
          >
            {/* Studio Pro */}
            <div
              className="relative bg-bg-panel border border-border p-[22px] pt-[22px] flex flex-col gap-3 min-h-[200px] hover:border-ink-3 transition-colors duration-fast"
              data-testid="home-hub-studio-pro"
            >
              <span className="absolute top-0 left-0 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide-2 font-semibold bg-accent text-white">
                / Studio Pro
              </span>
              <h2 className="font-display text-[28px] font-semibold tracking-tight-3 text-ink leading-[1.1] mt-[18px]">
                Controllo totale<br />sul modello.
              </h2>
              <p className="text-md text-ink-2 leading-relaxed max-w-[36ch]">
                Modalità expert. Tutti gli strumenti, qualsiasi ordine, senza guardrail.
                Per chi sa già cosa fare.
              </p>
              <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
                <li className="font-mono text-[11px] text-ink-2 flex items-center gap-2">
                  <span className="w-2 h-px bg-ink-3 flex-shrink-0" />
                  Geometria · materiali · sezioni
                </li>
                <li className="font-mono text-[11px] text-ink-2 flex items-center gap-2">
                  <span className="w-2 h-px bg-ink-3 flex-shrink-0" />
                  Solver Lineare, Modale, Sismica, Non-lineare
                </li>
                <li className="font-mono text-[11px] text-ink-2 flex items-center gap-2">
                  <span className="w-2 h-px bg-ink-3 flex-shrink-0" />
                  Verifiche EC2 / EC3 / EC8 / NTC18
                </li>
              </ul>
              <div className="mt-auto pt-1.5">
                <button
                  type="button"
                  onClick={() => !modelsUnavailable && window.dispatchEvent(new Event("feapro:open-new-model"))}
                  disabled={modelsUnavailable}
                  data-testid="home-cta-studio-pro"
                  className="inline-flex items-center gap-1.5 bg-accent text-white px-4 py-[9px] text-md font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Apri Studio Pro
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Percorsi */}
            <div
              className="relative bg-bg-panel border border-border p-[22px] pt-[22px] flex flex-col gap-3 min-h-[200px] hover:border-ink-3 transition-colors duration-fast"
              data-testid="home-hub-percorsi"
            >
              <span className="absolute top-0 left-0 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide-2 font-semibold bg-ink text-white">
                / Percorsi
              </span>
              <h2 className="font-display text-[28px] font-semibold tracking-tight-3 text-ink leading-[1.1] mt-[18px]">
                Guidato, senza<br />perdere controllo.
              </h2>
              <p className="text-md text-ink-2 leading-relaxed max-w-[36ch]">
                Step persistenti, validation per step, sempre passabile a Studio Pro.
                Per chi vuole una traccia chiara.
              </p>
              <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
                <li className="font-mono text-[11px] text-ink-2 flex items-center gap-2">
                  <span className="w-2 h-px bg-ink-3 flex-shrink-0" />
                  Verifica telaio 2D · Beam check
                </li>
                <li className="font-mono text-[11px] text-ink-2 flex items-center gap-2">
                  <span className="w-2 h-px bg-ink-3 flex-shrink-0" />
                  Smart defaults · best practice integrata
                </li>
                <li className="font-mono text-[11px] text-ink-2 flex items-center gap-2">
                  <span className="w-2 h-px bg-ink-3 flex-shrink-0" />
                  Lettura risultati assistita
                </li>
              </ul>
              <div className="mt-auto pt-1.5">
                <button
                  type="button"
                  onClick={() => !modelsUnavailable && window.dispatchEvent(new Event("feapro:open-percorsi"))}
                  disabled={modelsUnavailable}
                  data-testid="home-cta-percorsi"
                  className="inline-flex items-center gap-1.5 bg-bg-elevated text-ink border border-border-light px-4 py-[9px] text-md font-medium hover:border-ink-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Scegli un percorso
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section data-testid="dashboard-quick-actions">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl font-semibold tracking-tight-1 text-ink">
                Inizia da qui
              </h2>
              <button
                type="button"
                onClick={openTemplateGallery}
                className="font-mono text-[11px] text-ink-3 hover:text-accent"
              >
                Vedi tutti i template →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickAct
                icon={<Plus className="w-3.5 h-3.5" />}
                name="Nuovo modello"
                sub="Da zero · empty workspace"
                tag="NEW"
                shortcut="⌘ N"
                onClick={() => window.dispatchEvent(new Event("feapro:open-new-model"))}
                disabled={modelsUnavailable}
                testId="dashboard-action-new"
              />
              <QuickAct
                icon={<Layers className="w-3.5 h-3.5" />}
                name="Da template"
                sub="9 schemi resistenti pre-impostati"
                tag="9 TPL"
                shortcut="↗"
                onClick={openTemplateGallery}
                disabled={modelsUnavailable}
                testId="dashboard-action-template"
              />
              <QuickAct
                icon={<FileUp className="w-3.5 h-3.5" />}
                name="Importa IFC / DXF"
                sub="Wizard 4 step · geometria + metadata"
                tag="IMPORT"
                shortcut="↗"
                onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-import-wizard"))}
                disabled={modelsUnavailable}
                testId="dashboard-action-import"
              />
              <QuickAct
                icon={<FlaskConical className="w-3.5 h-3.5" />}
                name="Esempi"
                sub="NAFEMS LE1 / LE2 / LE10 · benchmark"
                tag="DEMO"
                shortcut="↗"
                onClick={openTemplateGallery}
                disabled={modelsUnavailable}
                testId="dashboard-action-examples"
              />
            </div>
          </section>

          {/* Modelli recenti (cards con thumb) */}
          {recentModels.length > 0 && (
            <section data-testid="dashboard-recent-projects">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-display text-xl font-semibold tracking-tight-1 text-ink">
                  Modelli recenti
                </h2>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("feapro:open-models-list"))}
                  className="font-mono text-[11px] text-ink-3 hover:text-accent"
                >
                  Vedi tutti →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-stagger>
                {recentModels.map((m) => (
                  <ProjCard key={m.id} model={m} onSelect={onSelect} />
                ))}
              </div>
            </section>
          )}

          {/* Dropzone */}
          <div
            className="px-[18px] py-[14px] bg-bg-panel border border-dashed border-border-strong font-mono text-[11px] text-ink-3 flex items-center gap-2.5 cursor-pointer hover:border-accent hover:text-accent transition-colors"
            data-testid="dashboard-dropzone"
            onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-import-wizard"))}
          >
            <FileUp className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Trascina file <b className="text-ink">.fea · .ifc · .dxf · .json</b> in qualsiasi punto della pagina per importarli.
            </span>
          </div>
        </div>

        {/* ── COLONNA DESTRA: sidebar 304px ─────────────────────────── */}
        <aside className="flex flex-col gap-4 min-w-0" data-testid="dashboard-sidebar" data-sidebar="right">
          {/* Crediti widget */}
          <div className="bg-bg-panel border border-border p-3.5 flex flex-col gap-2.5 animate-slide-up" data-testid="widget-credits">
            <div className="flex items-center justify-between">
              <div className="text-md font-semibold text-ink">Crediti · Maggio</div>
              <span className="inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide-1 font-semibold text-accent bg-transparent border border-accent">
                {tier.toUpperCase()}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="font-mono text-[32px] font-semibold text-accent tracking-tight-2 leading-none">
                {used.toFixed(0)}
              </span>
              <span className="text-[14px] text-ink-3">/ {totalCap.toFixed(0)}</span>
            </div>
            <div className="relative h-1 bg-bg-hover border border-border overflow-hidden">
              <div
                className="absolute top-0 left-0 bottom-0 bg-accent transition-all duration-mid"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="font-mono text-[10px] text-ink-3 flex justify-between">
              <span>€{(used * 0.1).toFixed(2).replace(".", ",")} spesi</span>
              <span>reset 1 giu</span>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-billing"))}
              className="w-full justify-center inline-flex items-center gap-1.5 bg-bg-elevated text-ink border border-border-light px-3 py-1.5 text-md font-medium hover:border-ink-3 transition-colors"
            >
              Vedi fatturazione
            </button>
          </div>

          {/* Per iniziare checklist */}
          <div className="bg-bg-panel border border-border p-3.5 flex flex-col gap-2.5" data-testid="widget-get-started">
            <div className="flex items-center justify-between">
              <div className="text-md font-semibold text-ink">Per iniziare</div>
              <span className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold">
                {completedSteps} / 4
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <ChecklistItem
                done={hasModel}
                num={1}
                name="Crea o importa un modello"
                sub="Da zero, template o file .ifc/.dxf"
              />
              <ChecklistItem
                done={hasModel}
                num={2}
                name="Definisci appoggi e carichi"
                sub="Vincoli + casi di carico + combinazioni"
              />
              <ChecklistItem
                done={hasResults}
                num={3}
                name="Lancia l'analisi"
                sub="Scegli solver e compute profile"
              />
              <ChecklistItem
                done={hasResults}
                num={4}
                name="Verifica risultati"
                sub="UC, σ, δ + checks normativi"
              />
            </div>
          </div>

          {/* Copilot widget */}
          <div className="bg-bg-panel border border-border p-3.5 flex flex-col gap-2.5" data-testid="widget-copilot">
            <div className="flex items-center justify-between">
              <div className="text-md font-semibold text-ink flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
                Copilot
              </div>
              <span className="inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide-1 font-semibold text-accent bg-transparent border border-accent">
                BETA
              </span>
            </div>
            <p className="text-xs text-ink-2 leading-[1.55]">
              Chiedi spiegazioni su un risultato, una norma o un workflow.
              L'algoritmo resta fonte di verità.
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-ai-copilot"))}
              className="w-full justify-center inline-flex items-center gap-1.5 bg-bg-elevated text-ink border border-border-light px-3 py-1.5 text-md font-medium hover:border-ink-3 transition-colors"
            >
              Apri Copilot
              <ArrowRight className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>

          {/* Suggerimento ⌘K */}
          <div className="bg-bg-panel border border-border p-3.5 flex flex-col gap-2" data-testid="widget-tip">
            <div className="flex items-center justify-between">
              <div className="text-md font-semibold text-ink">Suggerimento</div>
              <span className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold">⌘ K</span>
            </div>
            <p className="text-xs text-ink-2 leading-[1.55]">
              La <b className="text-ink">command palette</b> esegue qualsiasi azione: cerca per nome
              ("esegui", "ispeziona", "report") senza sapere dove sta nel menu.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function QuickAct({
  icon,
  name,
  sub,
  tag,
  shortcut,
  onClick,
  disabled,
  testId,
}: {
  icon: React.ReactNode;
  name: string;
  sub: string;
  tag: string;
  shortcut: string;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      data-testid={testId}
      title={disabled ? "Richiede backend disponibile" : undefined}
      className={[
        "group grid gap-2 p-3.5 bg-bg-panel border border-border min-h-[110px] text-left transition-colors duration-fast",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:border-accent cursor-pointer",
      ].join(" ")}
      style={{ gridTemplateRows: "auto 1fr auto" }}
    >
      <div
        className={[
          "w-7 h-7 border border-border-light grid place-items-center text-ink-2",
          disabled ? "" : "group-hover:text-accent group-hover:border-accent",
        ].join(" ")}
      >
        {icon}
      </div>
      <div>
        <div className="text-md font-semibold text-ink">{name}</div>
        <div className="font-mono text-xs text-ink-3 leading-[1.5] mt-0.5">{sub}</div>
      </div>
      <div className="flex items-center justify-between pt-1.5 border-t border-border font-mono text-[10px] text-ink-3">
        <span>{tag}</span>
        <span>{shortcut}</span>
      </div>
    </button>
  );
}

function ChecklistItem({
  done,
  num,
  name,
  sub,
}: {
  done: boolean;
  num: number;
  name: string;
  sub: string;
}) {
  return (
    <div
      className="grid items-start gap-2.5 py-2 border-t border-border first:border-t-0 first:pt-0"
      style={{ gridTemplateColumns: "18px 1fr" }}
    >
      <span
        className={[
          "w-[18px] h-[18px] grid place-items-center font-mono text-[9px] font-semibold border",
          done
            ? "bg-success text-white border-success"
            : "bg-transparent text-ink-3 border-border-light",
        ].join(" ")}
      >
        {done ? "✓" : num}
      </span>
      <div>
        <div className="text-sm text-ink font-medium">{name}</div>
        <div className="text-[11px] text-ink-3 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function ProjCard({ model, onSelect }: { model: FEAModel; onSelect: (id: string) => void }) {
  const nNodes = model.nodes?.length ?? 0;
  const nEls = model.elements?.length ?? 0;
  const status = nNodes === 0 ? "draft" : "ok";
  const statusLabel = status === "draft" ? "DRAFT" : "OK";
  const statusCls =
    status === "draft"
      ? "text-warn border-warn"
      : "text-success border-success";

  return (
    <button
      type="button"
      onClick={() => onSelect(model.id)}
      data-testid={`proj-card-${model.id}`}
      className="bg-bg-panel border border-border flex flex-col cursor-pointer hover:border-accent transition-colors duration-fast text-left"
    >
      <div className="h-[110px] bg-bg-viewport border-b border-border relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.06) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 110"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Schema deterministico: 2D rect frame se !is_3d, 3D box altrimenti */}
          {model.is_3d ? (
            <g stroke="currentColor" strokeWidth="1.5" fill="none" className="text-ink-2">
              <rect x="40" y="25" width="120" height="60" />
              <line x1="40" y1="25" x2="60" y2="15" />
              <line x1="160" y1="25" x2="180" y2="15" />
              <line x1="40" y1="85" x2="60" y2="75" />
              <line x1="160" y1="85" x2="180" y2="75" />
              <rect x="60" y="15" width="120" height="60" />
            </g>
          ) : (
            <g stroke="currentColor" strokeWidth="1.5" fill="none" className="text-ink-2">
              <line x1="30" y1="90" x2="30" y2="30" />
              <line x1="170" y1="90" x2="170" y2="30" />
              <line x1="30" y1="30" x2="170" y2="30" />
              <line x1="30" y1="90" x2="170" y2="90" />
            </g>
          )}
        </svg>
      </div>
      <div className="px-3 py-2.5 grid items-center gap-2" style={{ gridTemplateColumns: "1fr auto" }}>
        <div className="min-w-0">
          <div className="text-base font-medium text-ink truncate" title={model.name}>
            {model.name}
          </div>
          <div className="font-mono text-[10px] text-ink-3 tracking-wide-1 truncate">
            {nNodes} N · {nEls} EL
          </div>
        </div>
        <span
          className={`font-mono text-[9px] uppercase tracking-wide-2 px-1.5 py-0.5 border ${statusCls} flex-shrink-0`}
        >
          {statusLabel}
        </span>
      </div>
    </button>
  );
}
