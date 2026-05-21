/**
 * MeasureSnapshotView (v1.5 Task 28).
 *
 * Sub-view del Tools hub: Misurazioni + Snapshot uniti in 2 sezioni
 * separate da divider.
 */
import { Ruler, Camera } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useLeftRailStore } from "../../../store/leftRailStore";
import { useRightRailStore } from "../../../store/rightRailStore";
import { useModelStore } from "../../../store/modelStore";


export function MeasureSnapshotView() {
  const model = useModelStore((s) => s.model);

  const openMeasure = () => {
    // Le misurazioni live vivono nel workspace Make / Geometria (alpha.20).
    useWorkspaceStore.getState().setWorkspace("model");
    useLeftRailStore.getState().open("model");
    useRightRailStore.getState().close();
  };

  const openSnapshot = () => {
    useWorkspaceStore.getState().setWorkspace("results");
    useLeftRailStore.getState().open("results");
  };

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      <ToolSection
        icon={Ruler}
        title="Misurazioni"
        description="Misura distanze 3D, angoli tra elementi, lunghezze totali. Si attiva nel viewport del workspace Make."
        ctaLabel="Apri viewport Make"
        onAction={openMeasure}
        disabled={!model}
        hint="Richiede un modello caricato."
      />

      <div className="border-t border-border" />

      <ToolSection
        icon={Camera}
        title="Snapshot"
        description="Congela lo stato corrente dei risultati (deformata + stress + colormap) per confrontarli con un run successivo."
        ctaLabel="Apri pannello Risultati"
        onAction={openSnapshot}
        disabled={!model}
        hint="Disponibile dopo aver eseguito un'analisi."
      />
    </div>
  );
}


function ToolSection({
  icon: Icon, title, description, ctaLabel, onAction, disabled, hint,
}: {
  icon: typeof Ruler;
  title: string;
  description: string;
  ctaLabel: string;
  onAction: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-ink-info" />
        <h3 className="text-xs font-semibold text-ink">{title}</h3>
      </div>
      <p className="text-[11px] text-ink-muted leading-relaxed mb-2">{description}</p>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="w-full bg-accent-subtle text-accent border border-accent/30 hover:bg-accent/15 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-medium py-1.5 rounded-md transition-colors"
      >
        {ctaLabel}
      </button>
      {disabled && hint && (
        <p className="text-[10px] text-ink-dim mt-1 italic">{hint}</p>
      )}
    </section>
  );
}
