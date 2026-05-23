/**
 * VerifyChecksLive (Precision v2.0 PR15 T7).
 *
 * Layout B3 Verify cablato dal vivo: deriva i 3 check normativi (S275, EC3,
 * NTC) dal `staticResults` corrente + lista di element-by-element con UC bar.
 * Composto da `ChecksRail` (sinistra 280px) + `ChecksDetailTable` (destra
 * resto). Usato come drill-in dentro VerifyPanel hub-card "Live".
 *
 * Per ogni check normativo crea una row "modello globale" con UC = sigma_max
 * / fyd_norma. Quando il backend fornira' element-wise stress recovery,
 * espandiamo a rows per element.
 *
 * Stateless: legge `useResultsStore` direttamente. Se no results, mostra
 * empty state.
 */
import { useMemo, useState } from "react";
import { useResultsStore } from "../../store/resultsStore";
import { useModelStore } from "../../store/modelStore";
import { GPS_FYD } from "../../lib/gpsTrust";
import { ChecksRail, type CheckItem } from "./ChecksRail";
import { ChecksDetailTable, type CheckRow } from "./ChecksDetailTable";

interface CheckSpec {
  id: string;
  name: string;
  reference: string;
  /** fyd in MPa */
  fyd: number;
  /** Titolo del detail panel quando selezionato. */
  detailTitle: string;
  detailSub?: string;
}

const CHECK_SPECS: readonly CheckSpec[] = [
  {
    id: "s275",
    name: "S275 · UC tensionale",
    reference: "fyk = 275 MPa",
    fyd: GPS_FYD.s275,
    detailTitle: "S275 · UC tensionale",
    detailSub: "fyk = 275 MPa, riferimento base",
  },
  {
    id: "ec3",
    name: "EC3 · §6.2.1 base",
    reference: "EN 1993-1-1",
    fyd: GPS_FYD.ec3,
    detailTitle: "EC3 §6.2.1 · Resistenza tensionale base S235",
    detailSub: "EN 1993-1-1 · classi sezionali assumed",
  },
  {
    id: "ntc",
    name: "NTC18 · §4.2.4.1",
    reference: "γM0 = 1.05",
    fyd: GPS_FYD.ntc,
    detailTitle: "NTC 2018 §4.2.4.1 · S275 fyd",
    detailSub: "S275 con γM0 = 1.05 → fyd ≈ 261 MPa",
  },
];

function stateOf(uc: number): CheckItem["state"] {
  if (uc >= 1.0) return "fail";
  if (uc >= 0.85) return "warn";
  return "pass";
}

export function VerifyChecksLive() {
  const staticRes = useResultsStore((s) => s.staticResults);
  const model = useModelStore((s) => s.model);
  const [activeId, setActiveId] = useState<string>("s275");

  const checks = useMemo<readonly CheckItem[]>(() => {
    if (!staticRes) return [];
    const sigmaMPa = staticRes.max_stress / 1e6;
    return CHECK_SPECS.map((spec) => {
      const uc = sigmaMPa / spec.fyd;
      return {
        id: spec.id,
        name: spec.name,
        reference: spec.reference,
        state: stateOf(uc),
        meta: `UC ${uc.toFixed(2)}`,
      };
    });
  }, [staticRes]);

  const detailRows = useMemo<readonly CheckRow[]>(() => {
    if (!staticRes || !model) return [];
    const activeSpec = CHECK_SPECS.find((s) => s.id === activeId);
    if (!activeSpec) return [];
    const sigmaMPa = staticRes.max_stress / 1e6;
    const uc = sigmaMPa / activeSpec.fyd;
    // v2.0 PR15 T7: per ora una riga "modello globale" — quando il backend
    // emetterà element-wise stress recovery, sostituiamo con map sui elementi.
    return [
      {
        elementId: "global",
        section: `${model.elements.length} elementi · ${model.is_3d ? "3D" : "2D"}`,
        forces: { N: undefined, V: undefined, M: sigmaMPa },
        uc,
        note: `σ_max = ${sigmaMPa.toFixed(1)} MPa / fyd = ${activeSpec.fyd} MPa`,
      },
    ];
  }, [staticRes, model, activeId]);

  if (!staticRes) {
    return (
      <div className="p-6 bg-bg-panel border border-border" data-testid="verify-checks-live-empty">
        <h3 className="font-display text-lg font-semibold tracking-tight-1 text-ink mb-2">
          Nessuna verifica disponibile
        </h3>
        <p className="text-md text-ink-2 leading-relaxed max-w-[56ch]">
          Lancia un&apos;analisi statica per popolare le verifiche normative.
          I check vengono calcolati live dai risultati post-solve.
        </p>
      </div>
    );
  }

  const activeSpec = CHECK_SPECS.find((s) => s.id === activeId) ?? CHECK_SPECS[0];

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 p-4 bg-bg-viewport min-h-[400px]"
      data-testid="verify-checks-live"
    >
      <ChecksRail
        checks={checks}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <ChecksDetailTable
        checkId={activeSpec.id}
        title={activeSpec.detailTitle}
        subtitle={activeSpec.detailSub}
        rows={detailRows}
        ucLimit={1.0}
      />
    </div>
  );
}
