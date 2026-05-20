/**
 * ZZErrorPanel — stima Zienkiewicz-Zhu a posteriori (FASE 19).
 *
 * Input: campo scalare per elemento (di solito σ_VM dai risultati statici).
 * Calcola automaticamente da `staticResults.element_stresses` se disponibile.
 * Mostra: errore globale, errore relativo η, top 20% elementi candidati per
 * rifinitura mesh.
 */
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ScanSearch } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { postprocessApi, type ZZResponse } from "../../api/postprocess";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

export function ZZErrorPanel() {
  const model = useModelStore((s) => s.model);
  const { staticResults } = useResultsStore();
  const [refineFrac, setRefineFrac] = useState(0.2);
  const [result, setResult] = useState<ZZResponse | null>(null);

  // Build element_values automaticamente da σ_VM se disponibile, altrimenti da N
  const elementValues = useMemo(() => {
    if (!staticResults) return null;
    const sigVM = (staticResults as any).element_stresses;
    if (Array.isArray(sigVM) && sigVM.length > 0) {
      const out: Record<number, number> = {};
      for (const s of sigVM) {
        if (s.element_id != null && (s.sigma_vm != null || s.von_mises != null)) {
          out[s.element_id] = s.sigma_vm ?? s.von_mises ?? 0;
        }
      }
      if (Object.keys(out).length > 0) return out;
    }
    // fallback: |N| da element_forces
    const forces = staticResults.element_forces;
    if (Array.isArray(forces) && forces.length > 0) {
      const out: Record<number, number> = {};
      for (const f of forces) {
        out[f.element_id] = Math.abs(f.N_i ?? 0);
      }
      return out;
    }
    return null;
  }, [staticResults]);

  const mut = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      if (!elementValues || Object.keys(elementValues).length === 0)
        throw new Error("Nessun campo scalare disponibile (esegui statica)");
      return postprocessApi.zzError(model.id, {
        element_values: elementValues,
        refine_fraction: refineFrac,
      });
    },
    onSuccess: (r) => {
      setResult(r);
      toast("success", `ZZ: η=${(r.relative_error * 100).toFixed(2)}%, ${r.refinement_candidates.length} candidati`);
    },
    onError: (e) => toast("error", `Errore ZZ: ${(e as Error).message}`),
  });

  if (!staticResults) {
    return (
      <div className="p-3">
        <EmptyState
          title="Nessun risultato statico"
          description="Esegui un'analisi statica per ottenere il campo di tensione su cui basare l'errore ZZ."
        />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Stima errore Zienkiewicz-Zhu"
        description="Errore a posteriori semplificato basato su smoothing nodale dei valori discontinui per elemento. Indica dove rifinire la mesh."
      >
        <Field label="Frazione rifinitura" hint="Top 20% = candidati per h-refinement">
          <NumericInput value={refineFrac} step={0.05} min={0.05} max={1} onChange={setRefineFrac} />
        </Field>
        <div className="mt-2 text-[10px] text-ink-dim">
          Campo scalare estratto: <span className="font-mono">
            {elementValues ? `${Object.keys(elementValues).length} elementi` : "non disponibile"}
          </span>
        </div>
        <div className="mt-3">
          <Button variant="primary" size="sm" iconLeft={<ScanSearch className="h-3.5 w-3.5" />}
                  disabled={!elementValues || mut.isPending} loading={mut.isPending}
                  onClick={() => mut.mutate()}>
            Stima errore
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card title="Risultato globale">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="η relativo"
                    value={`${(result.relative_error * 100).toFixed(3)}%`}
                    highlight={result.relative_error > 0.1 ? "warn" : "ok"} />
              <Stat label="Err. globale" value={result.global_error.toExponential(2)} />
              <Stat label="Elementi" value={String(result.n_elements)} />
            </div>
          </Card>

          {result.refinement_candidates.length > 0 && (
            <Card title="Elementi da rifinire"
                  description={`Top ${(refineFrac * 100).toFixed(0)}% (ordinati per errore)`}>
              <div className="space-y-0.5 max-h-48 overflow-auto">
                {result.refinement_candidates.slice(0, 30).map((eid) => (
                  <div key={eid} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ink-dim">El. #{eid}</span>
                    <Badge size="sm" variant="warn">
                      ε={result.element_errors[eid]?.toExponential(2) ?? "?"}
                    </Badge>
                  </div>
                ))}
                {result.refinement_candidates.length > 30 && (
                  <div className="text-[10px] text-ink-dim italic">
                    +{result.refinement_candidates.length - 30} altri non mostrati
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "ok" | "warn" }) {
  const color = highlight === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-dim">{label}</div>
      <div className={`text-sm font-mono ${color}`}>{value}</div>
    </div>
  );
}
