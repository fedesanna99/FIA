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
import { Plus, FileUp, Layers, FlaskConical, type LucideIcon } from "lucide-react";
import type { FEAModel } from "../../types/model";
import { getQuota } from "../../api/billing";
import { useAuthStore } from "../../store/authStore";
import { useAnalysisStore } from "../../store/analysisStore";

interface Props {
  models: FEAModel[];
  onSelect: (id: string) => void;
}

export function Dashboard({ models, onSelect }: Props) {
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Buongiorno{authUser ? `, ${authUser.email.split("@")[0]}` : ""}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {models.length} {models.length === 1 ? "modello" : "modelli"} · {nJobs} job in corso
          </p>
        </div>
        <QuotaCard used={used} total={totalCap} tier={quota?.tier ?? "free"} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7 max-w-5xl mx-auto">
        <ActionBtn
          icon={Plus}
          label="Nuovo modello"
          sub="Da zero · Ctrl+N"
          primary
          onClick={() => window.dispatchEvent(new Event("feapro:open-new-model"))}
          testId="dashboard-action-new"
        />
        <ActionBtn
          icon={Layers}
          label="Da template"
          sub="9 preset didattici"
          onClick={openTemplateGallery}
          testId="dashboard-action-template"
        />
        <ActionBtn
          icon={FileUp}
          label="Importa file"
          sub="DXF · IFC · JSON"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("feapro:open-import-wizard"))
          }
          testId="dashboard-action-import"
        />
        <ActionBtn
          icon={FlaskConical}
          label="Esempi"
          sub="Modelli demo"
          onClick={openTemplateGallery}
          testId="dashboard-action-examples"
        />
      </div>

      {/* Jobs + Modelli */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7 max-w-5xl mx-auto">
        <JobsSection isRunning={isRunning} />
        <ModelsSection models={models} onSelect={onSelect} />
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
  testId,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  primary?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={[
        "flex items-start gap-3 p-3.5 rounded-lg border transition-colors text-left",
        primary
          ? "bg-accent text-white border-accent-hover/30 hover:bg-accent-hover shadow-pop"
          : "bg-bg-panel border-border hover:bg-bg-hover hover:border-accent/30 text-ink",
      ].join(" ")}
    >
      <div
        className={[
          "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0",
          primary ? "bg-white/20" : "bg-bg-info text-info",
        ].join(" ")}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        <div className={`text-[11px] font-mono mt-0.5 ${primary ? "text-white/80" : "text-ink-dim"}`}>
          {sub}
        </div>
      </div>
    </button>
  );
}

function JobsSection({ isRunning }: { isRunning: boolean }) {
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
        <div className="text-sm text-ink-dim">Nessun job attivo.</div>
      )}
    </div>
  );
}

function ModelsSection({
  models,
  onSelect,
}: {
  models: FEAModel[];
  onSelect: (id: string) => void;
}) {
  // v1.6 S0 B01: separa modelli utente (NON id "ex_*") da esempi
  // didattici (id "ex_*"). Cosi' la sezione "Modelli recenti" mostra
  // davvero i modelli che l'utente ha creato/importato, non i preset.
  const userModels  = models.filter((m) => !m.id.startsWith("ex_"));
  const exampleModels = models.filter((m) => m.id.startsWith("ex_"));
  const recent = userModels.slice(0, 5);
  const examples = exampleModels.slice(0, 5);

  return (
    <div className="bg-bg-panel border border-border rounded-lg p-4 shadow-pop">
      <div className="text-[11px] uppercase tracking-wider text-ink-dim font-semibold mb-3">
        Modelli recenti
      </div>
      {recent.length === 0 ? (
        <div className="text-sm text-ink-dim">
          Nessun modello ancora. Clicca "Nuovo modello" per iniziare.
        </div>
      ) : (
        <div className="space-y-0.5">
          {recent.map((m) => (
            <ModelRow key={m.id} model={m} onSelect={onSelect} />
          ))}
        </div>
      )}

      {/* Esempi didattici — sezione separata visivamente */}
      {examples.length > 0 && (
        <>
          <div className="border-t border-border mt-4 pt-3" />
          <div className="text-[11px] uppercase tracking-wider text-ink-dim font-semibold mb-2 flex items-center gap-1.5">
            <span>📚 Esempi didattici</span>
            <span className="text-ink-muted font-normal">· {exampleModels.length} totali</span>
          </div>
          <div className="space-y-0.5">
            {examples.map((m) => (
              <ModelRow key={m.id} model={m} onSelect={onSelect} />
            ))}
            {exampleModels.length > 5 && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("feapro:open-template-gallery"))}
                className="w-full text-left text-[11px] text-ink-info hover:underline px-2.5 py-1"
              >
                Vedi tutti i {exampleModels.length} template →
              </button>
            )}
          </div>
        </>
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
