/**
 * HistoryPanelContent — alpha.17.
 *
 * Mostra gli snapshot storici del modello (`snapshotStore`). Click su uno
 * snapshot → mostra dettagli. Eliminazione con conferma.
 */
import { Camera, X } from "lucide-react";
import { useSnapshotStore } from "../../../store/snapshotStore";


function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return `${Math.floor(diff / 86400)}g fa`;
}


export function HistoryPanelContent() {
  const snapshots = useSnapshotStore((s) => s.snapshots);
  const remove = useSnapshotStore((s) => s.removeSnapshot);

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <Camera className="h-8 w-8 text-ink-faint" strokeWidth={1.5} />
        <p className="text-ink-3">Nessuno snapshot salvato.</p>
        <p className="text-[11px] text-ink-faint leading-relaxed max-w-[240px]">
          Crea snapshot dal pannello Tools per congelare lo stato dei
          risultati e confrontarli in seguito.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-ink-3 leading-relaxed mb-2">
        <span className="chip chip-info text-[10px] mr-1">{snapshots.length}</span>
        snapshot salvati nella sessione corrente.
      </p>

      {snapshots.slice().reverse().map((snap) => (
        <div
          key={snap.id}
          className="group flex items-start gap-2 px-2 py-2 rounded-sm hover:bg-bg-hover transition-colors border border-transparent hover:border-border"
          data-testid={`history-row-${snap.id}`}
        >
          <Camera className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">{snap.label || `Snapshot #${snap.id}`}</div>
            <div className="text-[11px] text-ink-3 truncate">
              {snap.modelName} · {formatRelative(snap.timestamp)}
            </div>
            <div className="flex gap-1 mt-1 text-[10px] text-ink-faint">
              {snap.staticResults && <span className="chip chip-success">statica</span>}
              {snap.modalResults && <span className="chip chip-purple">modale</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => remove(snap.id)}
            aria-label="Elimina snapshot"
            data-testid={`history-delete-${snap.id}`}
            className="w-6 h-6 rounded flex items-center justify-center text-ink-faint hover:text-danger hover:bg-bg-hover opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
