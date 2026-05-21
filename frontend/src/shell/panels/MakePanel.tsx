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
import { useMemo } from "react";
import {
  IconShape3, IconHierarchy, IconWand, IconLoader, IconLock,
  IconArrowsLeftRight, IconPlus,
} from "@tabler/icons-react";
import { useUIStore } from "../../store/uiStore";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { useModelStore } from "../../store/modelStore";
import { ModelTree } from "../../components/panels/ModelTree";
import { EmptyState } from "../../components/ui/EmptyState";
import { PanelChrome, type PanelTab } from "./PanelChrome";


const TABS: PanelTab[] = [
  { id: "geometria", label: "Geometria" },
  { id: "mesh",      label: "Mesh" },
  { id: "carichi",   label: "Carichi" },
  { id: "vincoli",   label: "Vincoli" },
  { id: "io",        label: "I/O" },
];


export function MakePanel() {
  // alpha.31 Task 25: la X deve chiudere SIA il flag workspace SIA il
  // rail openSection — altrimenti LeftSlidePanel resta montato.
  const closeLeft = () => {
    useWorkspaceStore.getState().closeLeftPanel();
    useLeftRailStore.getState().close();
  };
  const setTab    = useWorkspaceStore((s) => s.setLeftTab);
  const tab       = useWorkspaceStore((s) => s.currentLeftTab) ?? "geometria";
  const model     = useModelStore((s) => s.model);
  const setDialog = useUIStore((s) => s.setOpenDialog);

  const counts = useMemo(() => ({
    nodes:       model?.nodes.length ?? 0,
    elements:    model?.elements.length ?? 0,
    loads:       model?.loads.length ?? 0,
    constraints: model?.constraints.length ?? 0,
  }), [model]);

  return (
    <PanelChrome
      side="left"
      title="Make"
      Icon={IconShape3}
      subtitle={model ? "Modello attivo" : "—"}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      onClose={closeLeft}
      testId="panel-make"
    >
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
              <Section title="Albero modello">
                <CountsRow counts={counts} />
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
            <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
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
          <Section title={`Carichi (${counts.loads})`}>
            <PrimaryButton
              icon={IconLoader}
              label="Aggiungi carico…"
              onClick={() => setDialog("load")}
              disabled={!model}
              shortcut="L"
              testId="make-add-load"
            />
            <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
              Per Climate Loads (vento / neve / sismica) usa{" "}
              <span className="kbd">Loads</span> nella TopBar.
            </p>
          </Section>
        </div>
      )}

      {/* VINCOLI */}
      {tab === "vincoli" && (
        <div className="p-3 space-y-3">
          <Section title={`Vincoli (${counts.constraints})`}>
            <PrimaryButton
              icon={IconLock}
              label="Aggiungi vincolo…"
              onClick={() => setDialog("constraint")}
              disabled={!model}
              shortcut="C"
              testId="make-add-constraint"
            />
            <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
              Supporti: fissi, mobili, molla (winkler/compression-only).
            </p>
          </Section>
        </div>
      )}

      {/* I/O */}
      {tab === "io" && (
        <div className="p-3 space-y-3">
          <Section title="Import / Export">
            <p className="text-[11px] text-ink-muted leading-relaxed mb-2">
              Import: DXF, IFC, JSON. Export: DXF, IFC, XLSX, PDF.
            </p>
            <SecondaryButton
              icon={IconArrowsLeftRight}
              label="Apri menu Export…"
              onClick={() => {
                // alpha.31 hotfix: setWorkspace("io") aggiornava solo lo store
                // legacy, ma LeftSlidePanel monta in base a leftRailStore.openSection.
                // Apriamo entrambi cosi' il pannello I/O viene effettivamente mostrato.
                useWorkspaceStore.getState().setWorkspace("io");
                useLeftRailStore.getState().open("io");
              }}
              testId="make-open-io"
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
      <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold px-3 pt-3 pb-1.5">
        {title}
      </h3>
      <div className="px-3 pb-1.5">{children}</div>
    </section>
  );
}


function CountsRow({ counts }: { counts: { nodes: number; elements: number; loads: number; constraints: number } }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
      {[
        { label: "Nodi",    value: counts.nodes },
        { label: "Elem.",   value: counts.elements },
        { label: "Carichi", value: counts.loads },
        { label: "Vincoli", value: counts.constraints },
      ].map((c) => (
        <div key={c.label} className="bg-bg-hover rounded px-1.5 py-1 border border-border">
          <div className="text-base font-mono font-semibold text-ink leading-none">{c.value}</div>
          <div className="text-[9px] text-ink-muted uppercase tracking-wider mt-0.5">{c.label}</div>
        </div>
      ))}
    </div>
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
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium bg-accent-subtle text-accent hover:bg-accent/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Icon size={14} />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <kbd className="kbd text-[10px]">{shortcut}</kbd>}
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
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium border border-border text-ink hover:bg-bg-hover transition-colors"
    >
      <Icon size={14} className="text-ink-muted" />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}
