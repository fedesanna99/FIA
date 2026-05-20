import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { verifyApi } from "../../api/client";
import type { EC3ElementVerification } from "../../api/client";
import { useModelStore } from "../../store/modelStore";


function urColor(ur: number): string {
  if (!isFinite(ur)) return "text-accent-danger";
  if (ur > 1.0) return "text-accent-danger";
  if (ur >= 0.8) return "text-accent-warning";
  return "text-accent-success";
}


function fmtN(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)} MN`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)} kN`;
  return v.toFixed(0);
}


function fmtM(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)} kN·m`;
  return `${v.toFixed(1)} N·m`;
}


export function VerificationPanel() {
  const model = useModelStore((s) => s.model);
  const selectElement = useModelStore((s) => s.selectElement);
  const [gammaM0, setGammaM0] = useState(1.05);
  const [gammaM1, setGammaM1] = useState(1.05);
  const [details, setDetails] = useState<EC3ElementVerification | null>(null);

  const runMutation = useMutation({
    mutationFn: () =>
      verifyApi.ec3(model!.id, { gamma_M0: gammaM0, gamma_M1: gammaM1 }),
  });

  if (!model) {
    return (
      <div className="p-4 text-xs text-ink-dim">
        Nessun modello caricato.
      </div>
    );
  }

  const data = runMutation.data;

  return (
    <div className="text-xs">
      <div className="px-3 py-2 border-b border-border space-y-2">
        <div className="font-semibold text-ink">Verifica EC3 — Acciaio</div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            γ_M0
            <input
              type="number" step="0.01" min="0.5" max="2.0"
              value={gammaM0}
              onChange={(e) => setGammaM0(parseFloat(e.target.value) || 1.05)}
              className="w-16 px-1 py-0.5 bg-surface-2 border border-border rounded numeric"
            />
          </label>
          <label className="flex items-center gap-1">
            γ_M1
            <input
              type="number" step="0.01" min="0.5" max="2.0"
              value={gammaM1}
              onChange={(e) => setGammaM1(parseFloat(e.target.value) || 1.05)}
              className="w-16 px-1 py-0.5 bg-surface-2 border border-border rounded numeric"
            />
          </label>
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="ml-auto px-2 py-1 bg-accent-primary text-white rounded hover:opacity-90 disabled:opacity-50"
          >
            {runMutation.isPending ? "Verifica…" : "Esegui verifica"}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="px-3 py-2 border-b border-border flex items-center gap-3">
            <span>
              Elementi verificati: <span className="numeric font-semibold">{data.n_elements_checked}</span>
            </span>
            <span>
              Failures:{" "}
              <span className={`numeric font-semibold ${data.n_failures > 0 ? "text-accent-danger" : "text-accent-success"}`}>
                {data.n_failures}
              </span>
            </span>
          </div>

          {data.n_elements_checked === 0 ? (
            <div className="p-4 text-ink-dim">
              Nessun elemento beam in acciaio con profilo a doppio T.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-surface-2 text-ink-dim border-b border-border">
                <tr>
                  <th className="px-2 py-1">ID</th>
                  <th className="px-2 py-1">Sezione</th>
                  <th className="px-2 py-1">Cl.</th>
                  <th className="px-2 py-1 text-right">M_Ed</th>
                  <th className="px-2 py-1 text-right">U.R.</th>
                  <th className="px-2 py-1">Governing</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((v) => (
                  <tr
                    key={v.element_id}
                    onClick={() => { selectElement(v.element_id, false); setDetails(v); }}
                    className="border-b border-border/50 hover:bg-surface-2 cursor-pointer"
                  >
                    <td className="px-2 py-1 numeric">{v.element_id}</td>
                    <td className="px-2 py-1">{v.section_id}</td>
                    <td className="px-2 py-1 numeric">{v.section_class ?? "—"}</td>
                    <td className="px-2 py-1 numeric text-right">{fmtM(v.M_Ed)}</td>
                    <td className={`px-2 py-1 numeric text-right font-semibold ${urColor(v.UR_max)}`}>
                      {isFinite(v.UR_max) ? v.UR_max.toFixed(3) : "∞"}
                    </td>
                    <td className="px-2 py-1 text-ink-dim">{v.governing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {details && (
        <DetailsModal
          v={details}
          onClose={() => setDetails(null)}
        />
      )}
    </div>
  );
}


function DetailsModal({
  v, onClose,
}: { v: EC3ElementVerification; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-border rounded p-4 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold text-ink mb-2">
          Elemento {v.element_id} — {v.section_id} ({v.material_id})
        </div>
        <table className="w-full text-xs">
          <tbody>
            <tr><td className="text-ink-dim pr-2">L</td><td className="numeric">{v.L.toFixed(3)} m</td></tr>
            <tr><td className="text-ink-dim pr-2">Classe sezione</td><td className="numeric">C{v.section_class ?? "—"}</td></tr>
            <tr><td className="text-ink-dim pr-2">N_Ed</td><td className="numeric">{fmtN(v.N_Ed)}</td></tr>
            <tr><td className="text-ink-dim pr-2">M_Ed</td><td className="numeric">{fmtM(v.M_Ed)}</td></tr>
            <tr><td className="text-ink-dim pr-2">V_Ed</td><td className="numeric">{fmtN(v.V_Ed)}</td></tr>
            <tr><td className="text-ink-dim pr-2">N_Rd</td><td className="numeric">{fmtN(v.N_Rd)}</td></tr>
            <tr><td className="text-ink-dim pr-2">M_c,Rd</td><td className="numeric">{fmtM(v.M_c_Rd)}</td></tr>
            <tr><td className="text-ink-dim pr-2">V_c,Rd</td><td className="numeric">{fmtN(v.V_c_Rd)}</td></tr>
            <tr><td className="text-ink-dim pr-2">N_b,Rd</td><td className="numeric">{fmtN(v.N_b_Rd)}</td></tr>
            <tr><td className="text-ink-dim pr-2">M_b,Rd (LTB)</td><td className="numeric">{fmtM(v.M_b_Rd)}</td></tr>
            <tr className="border-t border-border">
              <td className="text-ink-dim pr-2 pt-1">U.R. resistenza</td>
              <td className={`numeric pt-1 ${urColor(v.UR_resistance)}`}>{v.UR_resistance.toFixed(3)}</td>
            </tr>
            {v.UR_buckling != null && (
              <tr>
                <td className="text-ink-dim pr-2">U.R. instabilità</td>
                <td className={`numeric ${urColor(v.UR_buckling)}`}>{v.UR_buckling.toFixed(3)}</td>
              </tr>
            )}
            {v.UR_LTB != null && (
              <tr>
                <td className="text-ink-dim pr-2">U.R. LTB</td>
                <td className={`numeric ${urColor(v.UR_LTB)}`}>{v.UR_LTB.toFixed(3)}</td>
              </tr>
            )}
            <tr className="border-t border-border font-semibold">
              <td className="text-ink-dim pr-2 pt-1">U.R. max</td>
              <td className={`numeric pt-1 ${urColor(v.UR_max)}`}>
                {isFinite(v.UR_max) ? v.UR_max.toFixed(3) : "∞"} ({v.governing})
              </td>
            </tr>
          </tbody>
        </table>
        <button
          onClick={onClose}
          className="mt-3 w-full py-1 bg-surface-2 border border-border rounded hover:bg-surface-3"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
