/**
 * Dashboard (alpha.30) — empty state pre-modello, mockup v1.3.
 *
 * Mostrato quando l'utente non ha ancora selezionato un modello attivo,
 * al posto del Viewport3D. Ha:
 *  - Hero "Buongiorno" + summary (n modelli, n job in corso)
 *  - QuotaCard con used/total (lo stesso dato di CreditsBadge)
 *  - 4 ActionBtn quick-action (Nuovo, Template, Importa, Esempi)
 *  - 2 sezioni: Jobs in corso + Modelli recenti (lista cliccabile)
 *
 * Niente jobsStore/quotaStore dedicati: leggiamo getQuota via react-query
 * (stesso pattern di CreditsBadge) e analysisStore.isRunning come proxy
 * dei job attivi. Quando arriveranno store dedicati basta sostituire le
 * sorgenti.
 */
import { useQuery } from "@tanstack/react-query";
import { Plus, FileUp, Layers, FlaskConical, RefreshCcw, WifiOff, ArrowRight, type LucideIcon } from "lucide-react";
import type { FEAModel } from "../../types/model";
import { getQuota } from "../../api/billing";
import { useAuthStore } from "../../store/authStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { ModelsTable, type ModelTableRow } from "./ModelsTable";

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

  // v1.5 Task 29: "Importa file" ora apre l'ImportWizard 4-step via
  // custom event globale. Il file picker hidden + mutation locale che
  // l'alpha.31 hotfix aveva introdotto sono stati rimossi: la logica
  // vive nel wizard (DXF/IFC/JSON nativo/Template).

  // v1.6 S0 B01: "Esempi" e "Da template" ora puntano allo stesso entry
  // point — la galleria template dedicata che mostra i 9 modelli precaricati
  // dal backend (ex_*). Le card del Dashboard non aprono piu' il
  // NewModelDialog vuoto come fallback.
  const openTemplateGallery = () =>
    window.dispatchEvent(new Event("feapro:open-template-gallery"));

  const totalCap = (quota?.cap_credits ?? 100) + (quota?.bonus_credits ?? 0);
  const used = quota?.used_credits ?? 0;
  const nJobs = isRunning ? 1 : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto p-6 sm:p-8 bg-bg-viewport">
      {/* Hero */}
      <div className="flex items-end justify-between mb-7 max-w-5xl mx-auto gap-4 flex-wrap">
        <div className="space-y-4">
          {/* v2.0 Precision PR13: hero allineato al mockup A1 Claude Design.
              Eyebrow con dot tonale → "Nessun modello attivo" / "{N} modelli, {M} job".
              H1 "Inizia un'analisi." (font-display 4xl tracking-tight-4).
              Sub paragraph con il claim "Algoritmo prima, AI per accelerare". */}
          <span
            className="inline-flex items-center gap-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide-4 text-ink-3 border border-border bg-bg-panel"
            data-testid="dashboard-hero-eyebrow"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${models.length === 0 ? "bg-warn" : "bg-success"}`} />
            {models.length === 0
              ? "Nessun modello attivo"
              : `${models.length} ${models.length === 1 ? "modello" : "modelli"} · ${nJobs} job in corso${authUser ? ` · ${authUser.email.split("@")[0]}` : ""}`}
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight-4 text-ink leading-[1.02]">
            Inizia un'analisi.
          </h1>
          <p className="text-md text-ink-2 leading-relaxed max-w-[56ch]">
            Due modi per costruire e analizzare un modello strutturale.
            Algoritmo prima, AI per accelerare — niente black box, tutti
            i calcoli tracciabili a formule normative.
          </p>
        </div>
        {/* v1.6.1 T2 · BUG-2: "View" button inline rimosso. Il ViewPanel
            si apre dalla RightRail (tasto "View") o dal chip preset nello
            HUD del Viewport: una sola via di accesso e' meno confusa. */}
        <QuotaCard used={used} total={totalCap} tier={quota?.tier ?? "free"} />
      </div>

      {modelsUnavailable && (
        <div className="max-w-5xl mx-auto mb-4 border border-warn/35 bg-bg-warn text-ink-warn rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-medium">Backend/database non disponibile.</span>{" "}
            <span className="text-ink-muted">
              La UI resta navigabile, ma modelli, template e salvataggi richiedono le API.
            </span>
          </div>
          {onRetryModels && (
            <button
              type="button"
              onClick={onRetryModels}
              disabled={modelsRefreshing}
              className="h-7 px-2 rounded-md border border-warn/30 bg-bg-panel/60 text-[11px] font-medium text-ink hover:bg-bg-panel disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5 flex-shrink-0"
            >
              <RefreshCcw className={`w-3 h-3 ${modelsRefreshing ? "animate-spin" : ""}`} />
              Riprova
            </button>
          )}
        </div>
      )}

      {/* v2.0 Precision PR13: hub Studio Pro + Percorsi allineati al mockup
          A1 Claude Design. Entrambi white panel + hairline border + axis-tag
          in top-left (cyan per Studio Pro, ink per Percorsi). Titolo 2 righe,
          sub paragraph, bullets mono, CTA inline con freccia. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7 max-w-5xl mx-auto">
        {/* Studio Pro Hub */}
        <div
          className="relative bg-bg-panel border border-border p-6 pt-7 flex flex-col gap-3 min-h-[220px] hover:border-ink-3 transition-colors"
          data-testid="home-hub-studio-pro"
        >
          <span className="absolute top-0 left-0 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide-2 font-semibold bg-accent text-white">
            / Studio Pro
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight-3 text-ink leading-[1.1] mt-3">
            Controllo totale<br />sul modello.
          </h2>
          <p className="text-md text-ink-2 leading-relaxed max-w-[36ch]">
            Modalità expert. Tutti gli strumenti, qualsiasi ordine, senza guardrail.
            Per chi sa già cosa fare.
          </p>
          <ul className="flex flex-col gap-1.5 text-[11px] font-mono text-ink-2">
            <li className="flex items-center gap-2 before:content-[''] before:w-2 before:h-px before:bg-ink-3 before:flex-shrink-0">
              Geometria · materiali · sezioni
            </li>
            <li className="flex items-center gap-2 before:content-[''] before:w-2 before:h-px before:bg-ink-3 before:flex-shrink-0">
              Solver Lineare, Modale, Sismica, Non-lineare
            </li>
            <li className="flex items-center gap-2 before:content-[''] before:w-2 before:h-px before:bg-ink-3 before:flex-shrink-0">
              Verifiche EC2 / EC3 / EC8 / NTC18
            </li>
          </ul>
          <div className="mt-auto pt-2">
            <button
              type="button"
              onClick={() => !modelsUnavailable && window.dispatchEvent(new Event("feapro:open-new-model"))}
              disabled={modelsUnavailable}
              data-testid="home-cta-studio-pro"
              className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 text-md font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Apri Studio Pro
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Percorsi Hub */}
        <div
          className="relative bg-bg-panel border border-border p-6 pt-7 flex flex-col gap-3 min-h-[220px] hover:border-ink-3 transition-colors"
          data-testid="home-hub-percorsi"
        >
          <span className="absolute top-0 left-0 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide-2 font-semibold bg-ink text-white">
            / Percorsi
          </span>
          <h2 className="font-display text-2xl font-semibold tracking-tight-3 text-ink leading-[1.1] mt-3">
            Guidato, senza<br />perdere controllo.
          </h2>
          <p className="text-md text-ink-2 leading-relaxed max-w-[36ch]">
            Step persistenti, validation per step, sempre passabile a Studio Pro.
            Per chi vuole una traccia chiara.
          </p>
          <ul className="flex flex-col gap-1.5 text-[11px] font-mono text-ink-2">
            <li className="flex items-center gap-2 before:content-[''] before:w-2 before:h-px before:bg-ink-3 before:flex-shrink-0">
              Verifica telaio 2D · Beam check
            </li>
            <li className="flex items-center gap-2 before:content-[''] before:w-2 before:h-px before:bg-ink-3 before:flex-shrink-0">
              Smart defaults · best practice integrata
            </li>
            <li className="flex items-center gap-2 before:content-[''] before:w-2 before:h-px before:bg-ink-3 before:flex-shrink-0">
              Lettura risultati assistita
            </li>
          </ul>
          <div className="mt-auto pt-2">
            <button
              type="button"
              onClick={() => !modelsUnavailable && window.dispatchEvent(new Event("feapro:open-percorsi"))}
              disabled={modelsUnavailable}
              data-testid="home-cta-percorsi"
              className="inline-flex items-center gap-2 bg-bg-elevated text-ink border border-border px-4 py-2 text-md font-medium hover:bg-bg-hover hover:border-ink-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Scegli un percorso
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick actions (azioni secondarie sotto la CTA doppia) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7 max-w-5xl mx-auto">
        <ActionBtn
          icon={Plus}
          label="Nuovo modello"
          sub="Da zero · Ctrl+N"
          onClick={() => window.dispatchEvent(new Event("feapro:open-new-model"))}
          disabled={modelsUnavailable}
          testId="dashboard-action-new"
        />
        <ActionBtn
          icon={Layers}
          label="Da template"
          sub="9 preset didattici"
          onClick={openTemplateGallery}
          disabled={modelsUnavailable}
          testId="dashboard-action-template"
        />
        <ActionBtn
          icon={FileUp}
          label="Importa file"
          sub="DXF · IFC · JSON"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("feapro:open-import-wizard"))
          }
          disabled={modelsUnavailable}
          testId="dashboard-action-import"
        />
        <ActionBtn
          icon={FlaskConical}
          label="Esempi"
          sub="Modelli demo"
          onClick={openTemplateGallery}
          disabled={modelsUnavailable}
          testId="dashboard-action-examples"
        />
      </div>

      {/* Jobs + Modelli */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7 max-w-5xl mx-auto">
        <JobsSection isRunning={isRunning} hasActiveModel={models.length > 0} />
        <ModelsSection
          models={models}
          modelsUnavailable={modelsUnavailable}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

function QuotaCard({ used, total, tier }: { used: number; total: number; tier: string }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const tone = pct >= 100 ? "danger" : pct >= 80 ? "warn" : "ok";
  const barColor = tone === "danger" ? "bg-danger" : tone === "warn" ? "bg-warn" : "bg-accent";

  // alpha.31 Task 24: rimossa la percentuale numerica in header — era
  // ridondante con la barra di progress visibile in basso. Card piu'
  // asciutta: label + numero + barra (3 livelli invece di 4).
  return (
    <div className="bg-bg-panel border border-border rounded-lg p-3.5 min-w-[200px] shadow-pop">
      <div className="text-[10px] uppercase tracking-wider text-ink-dim font-semibold mb-2">
        Crediti {tier}
      </div>
      <div className="text-2xl font-bold font-mono text-ink">
        {used.toFixed(0)}
        <span className="text-ink-muted text-base font-normal"> / {total.toFixed(0)}</span>
      </div>
      <div className="mt-2 h-1 bg-bg rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  sub,
  primary,
  onClick,
  disabled,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  primary?: boolean;
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
      title={disabled ? "Richiede backend/database disponibile" : undefined}
      className={[
        "flex items-start gap-3 p-3.5 rounded-lg border transition-colors text-left",
        disabled
          ? "bg-bg-panel/60 border-border text-ink-dim opacity-60 cursor-not-allowed"
          : primary
          ? "bg-accent text-white border-accent-hover/30 hover:bg-accent-hover shadow-pop"
          : "bg-bg-panel border-border hover:bg-bg-hover hover:border-accent/30 text-ink",
      ].join(" ")}
    >
      <div
        className={[
          "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0",
          disabled ? "bg-bg-hover text-ink-dim" : primary ? "bg-white/20" : "bg-bg-info text-info",
        ].join(" ")}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        <div className={`text-[11px] font-mono mt-0.5 ${primary && !disabled ? "text-white/80" : "text-ink-dim"}`}>
          {sub}
        </div>
      </div>
    </button>
  );
}

function JobsSection({ isRunning, hasActiveModel }: { isRunning: boolean; hasActiveModel: boolean }) {
  return (
    <div className="bg-bg-panel border border-border rounded-lg p-4 shadow-pop">
      <div className="text-[11px] uppercase tracking-wider text-ink-dim font-semibold mb-3">
        Job in corso
      </div>
      {isRunning ? (
        <div className="flex items-center gap-2 text-sm text-ink">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Analisi in esecuzione…
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-ink-dim">Nessun job attivo.</div>
          {/* v1.8.4 T3: CTA inline "Apri Solve" quando c'e' almeno un modello
              ma nessun job in corso. Click → dispatch event ascoltato dal
              workspaceStore via CommandPalette (open-solve action). */}
          {hasActiveModel && (
            <button
              type="button"
              onClick={() => {
                useWorkspaceStore.getState().openLeftPanel("solve");
              }}
              data-testid="jobs-section-open-solve"
              className="text-[11px] text-ink-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-sm"
            >
              Apri Solve →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ModelsSection({
  models,
  modelsUnavailable,
  onSelect,
}: {
  models: FEAModel[];
  modelsUnavailable: boolean;
  onSelect: (id: string) => void;
}) {
  // v1.6 S0 B01: separa modelli utente (NON id "ex_*") da esempi
  // didattici (id "ex_*"). Cosi' la sezione "Modelli recenti" mostra
  // davvero i modelli che l'utente ha creato/importato, non i preset.
  const userModels  = models.filter((m) => !m.id.startsWith("ex_"));
  const exampleModels = models.filter((m) => m.id.startsWith("ex_"));

  // v2.0 Precision PR15 T1: mapping FEAModel -> ModelTableRow per la
  // ModelsTable Claude Design. Stato derivato euristicamente:
  //  - "draft" se model senza nodi
  //  - "ok" altrimenti
  // ucMax sara' popolato da resultsStore in futuro (oggi tutti undefined).
  const recentRows: ModelTableRow[] = userModels.slice(0, 8).map((m) => ({
    id: m.id,
    name: m.name,
    kind: m.is_3d ? "3D" : "2D",
    nodes: m.nodes?.length ?? 0,
    elements: m.elements?.length ?? 0,
    status: (m.nodes?.length ?? 0) === 0 ? "draft" : "ok",
    modifiedAt: m.description ?? "—",
    ownerName: undefined,
  }));

  return (
    <div className="bg-bg-panel border border-border" data-testid="dashboard-models-section">
      <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold border-b border-border">
        Modelli recenti
      </div>
      {modelsUnavailable ? (
        <div className="text-sm text-ink-3 px-3 py-4">
          Lista non caricabile finche' il backend non risponde.
        </div>
      ) : recentRows.length === 0 ? (
        <div className="text-sm text-ink-3 px-3 py-4">
          Nessun modello ancora. Clicca "Apri Studio Pro" o "Scegli un percorso" per iniziare.
        </div>
      ) : (
        <ModelsTable
          rows={recentRows}
          onSelect={onSelect}
          onCreate={() => window.dispatchEvent(new Event("feapro:open-new-model"))}
          className="border-0"
        />
      )}

      {/* Esempi didattici — sezione separata visivamente sotto la tabella */}
      {exampleModels.length > 0 && (
        <div className="border-t border-border px-3 py-3">
          <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold mb-2 flex items-center gap-1.5">
            Esempi didattici
            <span className="text-ink-4 font-normal">· {exampleModels.length} totali</span>
          </div>
          <div className="space-y-0.5">
            {exampleModels.slice(0, 5).map((m) => (
              <ModelRow key={m.id} model={m} onSelect={onSelect} />
            ))}
            {exampleModels.length > 5 && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("feapro:open-template-gallery"))}
                className="w-full text-left text-[11px] text-accent hover:underline px-2.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                Vedi tutti i {exampleModels.length} template →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function ModelRow({ model, onSelect }: { model: FEAModel; onSelect: (id: string) => void }) {
  return (
    <button
      key={model.id}
      type="button"
      onClick={() => onSelect(model.id)}
      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-bg-hover text-left transition-colors"
    >
      <span className="text-sm text-ink truncate">{model.name}</span>
      <span className="text-[11px] font-mono text-ink-dim flex-shrink-0">
        {model.nodes?.length ?? 0} N · {model.elements?.length ?? 0} EL
      </span>
    </button>
  );
}
