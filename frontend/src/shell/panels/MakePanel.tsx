/**
 * MakePanel (Sprint 5 G9 / alpha.24) — brief v1.2.1 Step 7.2.
 *
 * Panel laterale sinistra workflow "Make" (Modeling). 5 tab:
 *   - Geometria: ModelTree (gerarchia + selezione entita')
 *   - Mesh: shortcut a MeshWizardDialog + descrizione 4 modalita'
 *   - Carichi: shortcut Add Load dialog + ClimateContextBadge inline
 *   - Vincoli: shortcut Add Constraint dialog + tabella vincoli
 *   - I/O: import/export menu inline
 *
 * Wrappa componenti v1.2 esistenti, non duplica logica. La maggior parte
 * dei tab usa "shortcut buttons" che aprono i dialog modali esistenti.
 */
import {
  IconShape3, IconHierarchy, IconWand, IconLoader, IconLock,
  IconArrowsLeftRight, IconPlus,
} from "@tabler/icons-react";
import { useUIStore } from "../../store/uiStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { useModelStore } from "../../store/modelStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useAnalysisStore } from "../../store/analysisStore";
import { ModelTree } from "../../components/panels/ModelTree";
import { EmptyState } from "../../components/ui/EmptyState";
import { ModelStatsBadge } from "../../components/ui/ModelStatsBadge";
import { PanelChrome } from "./PanelChrome";
import { PanelHub, PanelBreadcrumb, type HubCard } from "../../components/shell/panels/PanelHubNav";
import { InsightPanel } from "../../components/shell/InsightPanel";
import { Box, Layers as LayersIcon, ArrowDownToLine, Anchor, ArrowRightLeft as Swap, Check, AlertTriangle, Circle, Play } from "lucide-react";


// v1.8 (post-T6): rimosso TABS array — Make drill-in usa solo
// PanelBreadcrumb come navigation, coerente con InspectPanel (v1.7 T2).
// Tab bar orizzontale eliminata per evitare ridondanza con breadcrumb.


// v2.5.8 cluster E (BUG-016+017+018): hub-first navigation. Sub-text in
// italiano user-facing, niente jargon dev ("Albero", "Wizard", "Fixed",
// "Climate apply"). Card "I/O" rinominata "Importa modello" — l'export è
// solo nel rail destro Strumenti (chiude doppia destinazione I/O).
const HUB_CARDS: HubCard[] = [
  { id: "geometria", label: "Geometria",         sub: "Vista gerarchica · nodi, elementi, materiali",     icon: Box,             tone: "info" },
  { id: "mesh",      label: "Mesh",              sub: "Genera mesh strutturate (beam · piastra · solido)", icon: LayersIcon,      tone: "success" },
  { id: "carichi",   label: "Carichi",           sub: "Concentrati · distribuiti · climatici (neve/vento)", icon: ArrowDownToLine, tone: "purple" },
  { id: "vincoli",   label: "Vincoli",           sub: "Incastri · cerniere · carrelli · molle elastiche", icon: Anchor,          tone: "coral" },
  { id: "io",        label: "Importa modello",   sub: "Da file DXF · IFC · JSON FEA Pro",                 icon: Swap,            tone: "warn" },
];


const TAB_LABELS: Record<string, string> = {
  geometria: "Geometria",
  mesh:      "Mesh",
  carichi:   "Carichi",
  vincoli:   "Vincoli",
  io:        "Importa",
};


export function MakePanel() {
  // alpha.31 Task 25: la X deve chiudere SIA il flag workspace SIA il
  // rail openSection — altrimenti LeftSlidePanel resta montato.
  const closeLeft = () => {
    useWorkspaceStore.getState().closeLeftPanel();
    useLeftRailStore.getState().close();
  };
  const setTab    = useWorkspaceStore((s) => s.setLeftTab);
  // v1.5.2 Task 39: tab=null = hub mode (5 card iniziali, I/O incluso).
  const tabRaw    = useWorkspaceStore((s) => s.currentLeftTab);
  const isHub     = tabRaw === null || tabRaw === undefined;
  const tab       = tabRaw ?? "geometria";
  const model     = useModelStore((s) => s.model);
  const setDialog = useUIStore((s) => s.setOpenDialog);
  // v2.5.8 cluster E: `counts` derivati ora vivono in <ModelStatsBadge>,
  // niente più CountsRow locale. Tengo solo `loads` e `constraints` count
  // per i titoli "Carichi (N)" / "Vincoli (N)" dei tab.
  const loadsCount = model?.loads.length ?? 0;
  const constraintsCount = model?.constraints.length ?? 0;

  if (isHub) {
    return (
      <PanelChrome
        side="left"
        title="Make"
        Icon={IconShape3}
        subtitle={model ? "Modello attivo" : "—"}
        onClose={closeLeft}
        testId="panel-make"
      >
        {/* v2.6.4 A.3 UC1/UC2: status insight sopra le hub-cards (solo se modello caricato). */}
        {model && <MakeStatusInsight />}
        <PanelHub
          cards={HUB_CARDS}
          onSelect={(id) => setTab(id)}
          testId="make-hub"
        />
      </PanelChrome>
    );
  }

  return (
    <PanelChrome
      side="left"
      title="Make"
      Icon={IconShape3}
      subtitle={model ? "Modello attivo" : "—"}
      onClose={closeLeft}
      testId="panel-make"
    >
      <PanelBreadcrumb
        root="Make"
        current={TAB_LABELS[tab] ?? tab}
        onBack={() => setTab(null)}
      />
      {/* GEOMETRIA */}
      {tab === "geometria" && (
        <div className="flex flex-col h-full min-h-0">
          {!model ? (
            <EmptyState
              title="Nessun modello caricato"
              description="Crea un nuovo modello dalla TopBar o seleziona un esempio."
            />
          ) : (
            <>
              <Section title="Struttura del modello">
                {/* v2.5.8 cluster E (BUG-039+045): CountsRow inline sostituito
                    da <ModelStatsBadge> centralizzato in components/ui. */}
                <ModelStatsBadge
                  variant="detailed"
                  show={["nodes", "elements", "loads", "constraints"]}
                  data-testid="make-stats-badge"
                />
              </Section>
              <div className="flex-1 overflow-auto px-2 pb-2">
                <ModelTree />
              </div>
            </>
          )}
        </div>
      )}

      {/* MESH */}
      {tab === "mesh" && (
        <div className="p-3 space-y-3">
          <Section title="Mesh wizard">
            <p className="text-[11px] text-ink-3 leading-relaxed mb-2">
              Genera mesh strutturate: linea (beam/truss), rettangolo
              (shell Q4/T3), box (solido H8), parametrica
              (L/T/cerchio/anello via Delaunay).
            </p>
            <PrimaryButton
              icon={IconWand}
              label="Apri wizard mesh…"
              onClick={() => setDialog("mesh")}
              disabled={!model}
              testId="make-open-mesh-wizard"
            />
          </Section>
        </div>
      )}

      {/* CARICHI */}
      {tab === "carichi" && (
        <div className="p-3 space-y-3">
          <Section title={`Carichi (${loadsCount})`}>
            <PrimaryButton
              icon={IconLoader}
              label="Aggiungi carico…"
              onClick={() => setDialog("load")}
              disabled={!model}
              shortcut="L"
              testId="make-add-load"
            />
            <p className="text-[12px] text-ink-2 mt-2.5 leading-relaxed">
              Per Climate Loads (vento / neve / sismica): apri la palette{" "}
              <kbd className="font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">⌘ K</kbd>{" "}
              e cerca{" "}
              <kbd className="font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">Location</kbd>
              {" "}· oppure dall'AvatarMenu → "Loads location".
            </p>
          </Section>
        </div>
      )}

      {/* VINCOLI */}
      {tab === "vincoli" && (
        <div className="p-3 space-y-3">
          <Section title={`Vincoli (${constraintsCount})`}>
            <PrimaryButton
              icon={IconLock}
              label="Aggiungi vincolo…"
              onClick={() => setDialog("constraint")}
              disabled={!model}
              shortcut="C"
              testId="make-add-constraint"
            />
            <p className="text-[11px] text-ink-3 mt-2 leading-relaxed">
              Supporti: fissi, mobili, molla (winkler/compression-only).
            </p>
          </Section>
        </div>
      )}

      {/* IMPORTA · v2.5.8 cluster E (BUG-016): card "Import / Export" diventa
          solo "Importa modello". Export totalmente delegato al rail destro
          Strumenti (chiude doppia destinazione I/O). */}
      {tab === "io" && (
        <div className="p-3 space-y-3">
          <Section title="Importa modello">
            <p className="text-[11px] text-ink-3 leading-relaxed mb-2">
              Carica geometria da file DXF, IFC o JSON FEA Pro tramite procedura
              guidata in 4 passi. Per esportare il modello o i risultati, apri
              il rail destro "Strumenti".
            </p>
            <SecondaryButton
              icon={IconArrowsLeftRight}
              label="Apri procedura guidata di import…"
              onClick={() => {
                // v1.5.2 Task 35: rimosso panel I/O legacy. Import via wizard
                // 4-step (custom event globale gestito da App.tsx).
                window.dispatchEvent(new CustomEvent("feapro:open-import-wizard"));
              }}
              testId="make-open-import-wizard"
            />
          </Section>
        </div>
      )}
    </PanelChrome>
  );
}


// ── Componenti interni ──────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold px-3 pt-3 pb-2">
        {title}
      </h3>
      <div className="px-3 pb-1.5">{children}</div>
    </section>
  );
}


function PrimaryButton({
  icon: Icon, label, onClick, disabled, shortcut, testId,
}: {
  icon: typeof IconPlus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-accent text-white border border-accent hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Icon size={14} />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <kbd className="font-mono text-[10px] uppercase tracking-wide-1 bg-white/20 border border-white/30 text-white px-1 py-0.5 font-medium">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}


function SecondaryButton({
  icon: Icon, label, onClick, testId,
}: {
  icon: typeof IconPlus;
  label: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="w-full inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border-light text-ink-2 hover:text-ink hover:bg-bg-hover hover:border-accent/40 transition-colors"
    >
      <Icon size={14} className="text-ink-3" />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}


/**
 * v2.6.4 A.3 UC1+UC2 (c6 spec): InsightPanel status sopra le hub-cards.
 *
 * Logica di switching dinamico tra UC1 (warn, modello in costruzione) e UC2
 * (success, modello pronto al solve). Item glyph mapping da spec a LucideIcon:
 *   - ✓  → Check
 *   - ⚠  → AlertTriangle
 *   - ○  → Circle
 *
 * Action della UC1 punta al primo gap bloccante (vincoli > carichi > materiali).
 * Action della UC2 lancia direttamente l'analisi statica.
 */
function MakeStatusInsight() {
  const model = useModelStore((s) => s.model);
  const setTab = useWorkspaceStore((s) => s.setLeftTab);
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  const runAnalysis = useRunAnalysis();
  if (!model) return null;

  const nNodes = model.nodes.length;
  const nElems = model.elements.length;
  const nConstraints = model.constraints.length;
  const nLoads = model.loads.length;
  // FEAModel.elements ha materialId opzionale; un elemento è "assegnato"
  // se ha un materialId truthy (può essere null/undefined/empty string).
  const assignedMaterials = model.elements.filter(
    (e) => Boolean((e as { material_id?: unknown }).material_id) ||
           Boolean((e as { materialId?: unknown }).materialId),
  ).length;

  const hasConstraints = nConstraints > 0;
  const hasLoads = nLoads > 0;
  const allMaterialsAssigned = assignedMaterials === nElems && nElems > 0;
  const isReady = hasConstraints && hasLoads && allMaterialsAssigned && nNodes >= 2;

  if (isReady) {
    return (
      <div className="px-3 pt-3" data-testid="make-insight-ready">
        <InsightPanel
          tone="success"
          eyebrow="MODELLO · PRONTO AL SOLVE"
          title="Modello pronto"
          items={[
            { icon: Check, text: `${nNodes} nodi · ${nElems} elementi` },
            { icon: Check, text: `${nConstraints} vincoli definiti` },
            { icon: Check, text: `${nLoads} carichi applicati` },
            { icon: Check, text: `Materiali assegnati a ${assignedMaterials}/${nElems} elementi` },
          ]}
          action={{
            label: "Esegui analisi statica",
            onClick: () => {
              setAnalysisType("static");
              void runAnalysis();
            },
          }}
        />
      </div>
    );
  }

  // UC1 — incompleto. Primo gap bloccante (vincoli > carichi > materiali).
  const firstGap: "vincoli" | "carichi" | "geometria" =
    !hasConstraints ? "vincoli"
    : !hasLoads ? "carichi"
    : "geometria"; // materiali sotto "geometria" tab

  return (
    <div className="px-3 pt-3" data-testid="make-insight-incomplete">
      <InsightPanel
        tone="warn"
        eyebrow="MODELLO · IN COSTRUZIONE"
        title="Modello incompleto"
        items={[
          {
            icon: nNodes > 0 ? Check : Circle,
            text: `${nNodes} nodi · ${nElems} elementi`,
          },
          {
            icon: hasConstraints ? Check : AlertTriangle,
            text: hasConstraints
              ? `${nConstraints} vincoli definiti`
              : "0 vincoli definiti · obbligatorio",
          },
          {
            icon: hasLoads ? Check : Circle,
            text: hasLoads ? `${nLoads} carichi applicati` : "0 carichi applicati",
          },
          {
            icon: allMaterialsAssigned ? Check : Circle,
            text: `Materiali assegnati a ${assignedMaterials}/${nElems} elementi`,
          },
        ]}
        action={{
          label: firstGap === "vincoli"
            ? "Vai a Vincoli"
            : firstGap === "carichi"
            ? "Vai a Carichi"
            : "Vai a Geometria",
          onClick: () => setTab(firstGap),
        }}
      />
    </div>
  );
}
