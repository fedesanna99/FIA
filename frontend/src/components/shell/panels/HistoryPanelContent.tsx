/**
 * HistoryPanelContent — alpha.17, esteso v2.3.1.
 *
 * Mostra gli snapshot storici del modello (`snapshotStore`):
 *  - Bottone "Crea snapshot" in cima (se modello + risultati disponibili).
 *  - Inline rename per ogni snapshot (pencil → input → blur/Enter salva).
 *  - Mini-diff inline: scegli 2 snapshot e visualizza Δ% per
 *    max_u, max_σ, f₁ (v2.3.1).
 *  - Eliminazione singola con conferma soft (X compare on hover).
 */
import { useState, useMemo } from "react";
import { Camera, GitCompare, Pencil, Plus, X, Check } from "lucide-react";
import { useSnapshotStore } from "../../../store/snapshotStore";
import { useModelStore } from "../../../store/modelStore";
import { useResultsStore } from "../../../store/resultsStore";
import { modelHash } from "../../../utils/geometry";
import { toast } from "../../../store/toastStore";
import { cn } from "../../ui/cn";


function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return `${Math.floor(diff / 86400)}g fa`;
}


export function HistoryPanelContent() {
  const snapshots = useSnapshotStore((s) => s.snapshots);
  const take = useSnapshotStore((s) => s.takeSnapshot);
  const rename = useSnapshotStore((s) => s.renameSnapshot);
  const remove = useSnapshotStore((s) => s.removeSnapshot);

  const model = useModelStore((s) => s.model);
  const staticResults = useResultsStore((s) => s.staticResults);
  const modalResults = useResultsStore((s) => s.modalResults);

  const canSnapshot = !!(model && (staticResults || modalResults));

  // v2.3.1: rename inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  // v2.3.1: diff inline
  const [diffOpen, setDiffOpen] = useState(false);
  const [snapA, setSnapA] = useState<number | "">("");
  const [snapB, setSnapB] = useState<number | "">("");

  const handleTake = () => {
    if (!model) return;
    const lbl = `Snapshot · ${new Date().toLocaleTimeString("it-IT", { hour12: false })}`;
    take(lbl, model.id, model.name, modelHash(model), staticResults, modalResults);
    toast("success", `Snapshot "${lbl}" salvato`);
  };

  const handleStartRename = (id: number, currentLabel: string) => {
    setEditingId(id);
    setDraftLabel(currentLabel);
  };

  const handleCommitRename = () => {
    if (editingId !== null) {
      rename(editingId, draftLabel);
    }
    setEditingId(null);
    setDraftLabel("");
  };

  // Snapshot diff metrics (v2.3.1)
  const diff = useMemo(() => {
    if (snapA === "" || snapB === "" || snapA === snapB) return null;
    const a = snapshots.find((s) => s.id === snapA);
    const b = snapshots.find((s) => s.id === snapB);
    if (!a || !b) return null;
    return [
      {
        key: "max_u",
        label: "Max spostamento",
        unit: "mm",
        a: a.staticResults ? a.staticResults.max_displacement * 1000 : null,
        b: b.staticResults ? b.staticResults.max_displacement * 1000 : null,
      },
      {
        key: "max_sigma",
        label: "Max tensione σ",
        unit: "MPa",
        a: a.staticResults ? a.staticResults.max_stress / 1e6 : null,
        b: b.staticResults ? b.staticResults.max_stress / 1e6 : null,
      },
      {
        key: "f1",
        label: "Frequenza f₁",
        unit: "Hz",
        a: a.modalResults?.modes[0]?.frequency_hz ?? null,
        b: b.modalResults?.modes[0]?.frequency_hz ?? null,
      },
    ];
  }, [snapA, snapB, snapshots]);

  return (
    <div className="space-y-3">
      {/* v2.3.1: bottone "Crea snapshot" sempre visibile in testa */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleTake}
          disabled={!canSnapshot}
          data-testid="history-take-snapshot"
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2 text-xs font-medium border transition-colors flex-1",
            canSnapshot
              ? "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20"
              : "bg-bg-hover border-border text-ink-4 cursor-not-allowed",
          )}
          title={canSnapshot ? "Salva snapshot dei risultati correnti" : "Esegui un'analisi per abilitare gli snapshot"}
        >
          <Plus className="w-3 h-3" /> Crea snapshot
        </button>
        {snapshots.length >= 2 && (
          <button
            type="button"
            data-testid="history-toggle-diff"
            onClick={() => setDiffOpen((o) => !o)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2 text-xs font-medium border transition-colors",
              diffOpen
                ? "bg-percorsi/15 border-percorsi/40 text-percorsi"
                : "bg-bg-hover border-border text-ink-3 hover:bg-bg-elevated hover:text-ink",
            )}
            title="Confronta due snapshot"
          >
            <GitCompare className="w-3 h-3" /> Confronta
          </button>
        )}
      </div>

      {!canSnapshot && snapshots.length === 0 && (
        <p className="text-[11px] text-ink-4 leading-relaxed">
          Esegui un'analisi (statica/modale) per abilitare gli snapshot.
        </p>
      )}

      {/* v2.3.1: diff inline */}
      {diffOpen && snapshots.length >= 2 && (
        <div
          className="border border-percorsi/30 bg-percorsi/5 rounded-sm p-2 space-y-2"
          data-testid="history-diff-panel"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <SnapshotSelect
              testId="diff-select-a"
              snapshots={snapshots}
              value={snapA}
              onChange={setSnapA}
              placeholder="Snapshot A…"
            />
            <SnapshotSelect
              testId="diff-select-b"
              snapshots={snapshots}
              value={snapB}
              onChange={setSnapB}
              placeholder="Snapshot B…"
            />
          </div>
          {snapA !== "" && snapB !== "" && snapA === snapB && (
            <div className="text-[10px] text-warn">Scegli due snapshot diversi.</div>
          )}
          {diff && (
            <div className="space-y-1">
              {diff.map((row) => {
                const { key, ...rest } = row;
                return <DiffRow key={key} {...rest} />;
              })}
            </div>
          )}
        </div>
      )}

      {snapshots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
          <Camera className="h-8 w-8 text-ink-4" strokeWidth={1.5} />
          <p className="text-ink-3">Nessuno snapshot salvato.</p>
          <p className="text-[11px] text-ink-4 leading-relaxed max-w-[240px]">
            Crea snapshot per congelare lo stato dei risultati e confrontarli in
            seguito.
          </p>
        </div>
      )}

      {snapshots.length > 0 && (
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
                {editingId === snap.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      data-testid={`history-rename-input-${snap.id}`}
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleCommitRename(); }
                        if (e.key === "Escape") { e.preventDefault(); setEditingId(null); }
                      }}
                      onBlur={handleCommitRename}
                      className="flex-1 h-6 px-1.5 text-xs bg-bg-elevated border border-accent/40 rounded-sm text-ink focus:outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleCommitRename}
                      aria-label="Conferma rename"
                      className="w-5 h-5 flex items-center justify-center text-success hover:bg-success/20 rounded-sm"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="text-xs font-medium truncate flex-1">
                        {snap.label || `Snapshot #${snap.id}`}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartRename(snap.id, snap.label)}
                        aria-label="Rinomina snapshot"
                        data-testid={`history-rename-${snap.id}`}
                        className="w-5 h-5 flex items-center justify-center text-ink-4 hover:text-accent hover:bg-bg-elevated opacity-0 group-hover:opacity-100 rounded-sm transition-opacity"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[11px] text-ink-3 truncate">
                      {snap.modelName} · {formatRelative(snap.timestamp)}
                    </div>
                    <div className="flex gap-1 mt-1 text-[10px] text-ink-4">
                      {snap.staticResults && <span className="chip chip-success">statica</span>}
                      {snap.modalResults && <span className="chip chip-purple">modale</span>}
                    </div>
                  </>
                )}
              </div>
              {editingId !== snap.id && (
                <button
                  type="button"
                  onClick={() => remove(snap.id)}
                  aria-label="Elimina snapshot"
                  data-testid={`history-delete-${snap.id}`}
                  className="w-6 h-6 rounded flex items-center justify-center text-ink-4 hover:text-danger hover:bg-bg-hover opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function SnapshotSelect({
  testId, snapshots, value, onChange, placeholder,
}: {
  testId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshots: any[];
  value: number | "";
  onChange: (v: number | "") => void;
  placeholder: string;
}) {
  return (
    <select
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className="h-7 px-1.5 rounded-sm text-[11px] bg-bg-elevated border border-border text-ink"
    >
      <option value="">{placeholder}</option>
      {snapshots.map((s) => (
        <option key={s.id} value={s.id}>
          {(s.label || `#${s.id}`).slice(0, 28)}
        </option>
      ))}
    </select>
  );
}


function DiffRow({
  label, unit, a, b,
}: {
  label: string;
  unit: string;
  a: number | null;
  b: number | null;
}) {
  if (a == null || b == null) {
    return (
      <div className="text-[10px] text-ink-4 flex justify-between border-t border-border pt-1">
        <span>{label}</span>
        <span className="italic">— dati incompleti</span>
      </div>
    );
  }
  const delta = b - a;
  const pct = a !== 0 ? (delta / Math.abs(a)) * 100 : null;
  const same = Math.abs(delta) < Math.abs(a) * 1e-9; // tollerance numerica
  return (
    <div
      className="grid grid-cols-[1fr_auto_auto] gap-1.5 items-center text-[10px] border-t border-border pt-1"
      data-testid={`diff-row-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="text-ink-3">{label}</div>
      <div className="font-mono tabular-nums text-ink">
        {a.toExponential(2)} → {b.toExponential(2)} {unit}
      </div>
      <div
        className={cn(
          "font-mono px-1 rounded text-[10px]",
          same
            ? "text-ink-3 bg-bg-hover"
            : delta > 0
              ? "text-warn bg-warn/15"
              : "text-success bg-success/15",
        )}
      >
        {same || pct === null ? "=" : `${delta > 0 ? "+" : ""}${pct.toFixed(1)}%`}
      </div>
    </div>
  );
}
