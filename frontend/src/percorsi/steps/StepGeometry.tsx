/**
 * StepGeometry · v3.5 Fetta D3 (30/05/2026)
 *
 * Step 1 del Percorso "Verifica telaio 2D": form parametrico per la
 * geometria del telaio + preview SVG live + 3 preset visivi.
 *
 * Pattern visivo (mockup 03_percorso_telaio_2d_step_geometry.png):
 *   - Body left: form 4 campi (bays · span · height · slope) con tip
 *   - Body right: preview SVG live del telaio (ridisegna su ogni change)
 *   - Aside help (passato a PercorsoStep): 3 preset "What are you building?"
 *
 * State locale (useState) sui params + validation (tutti > 0).
 * Submit: genera FEAModel via buildFrameModel → scrive a modelStore.setModel
 * → callback onSubmit per avanzare step.
 *
 * SCOPE D3: form + preview + preset. NO backend mesh (auto-mesh in D7).
 */
import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";

import { useModelStore } from "../../store/modelStore";
import {
  buildFrameModel,
  FRAME_PRESETS,
  type FrameParams,
  type FramePresetId,
} from "../geometry/buildFrameModel";


const DEFAULT_PARAMS: FrameParams = {
  numberOfBays: 1,
  spanPerBay: 5,
  columnHeight: 4,
  roofSlope: 0,
};


interface Props {
  /** Callback chiamato quando l'utente clicca "Done with Geometry" e
   *  i parametri sono validi. Il modello e' gia' stato scritto a
   *  modelStore.setModel — il caller deve solo avanzare lo step. */
  onSubmit?: () => void;
}


export function StepGeometry({ onSubmit }: Props) {
  const [params, setParams] = useState<FrameParams>(DEFAULT_PARAMS);
  const setModel = useModelStore((s) => s.setModel);

  // Validation: tutti i params devono essere > 0 e rispettare i range.
  const validation = useMemo(() => {
    const { numberOfBays, spanPerBay, columnHeight, roofSlope } = params;
    if (numberOfBays < 1 || numberOfBays > 3) {
      return { ok: false, reason: "Numero campi: 1-3" };
    }
    if (spanPerBay < 3 || spanPerBay > 8) {
      return { ok: false, reason: "Luce per campo: 3-8 m" };
    }
    if (columnHeight < 3 || columnHeight > 6) {
      return { ok: false, reason: "Altezza colonna: 3-6 m" };
    }
    if (roofSlope < 0 || roofSlope > 30) {
      return { ok: false, reason: "Pendenza copertura: 0-30°" };
    }
    return { ok: true, reason: "" };
  }, [params]);

  // Genera modello derivato dai params (memo) — usato per preview SVG +
  // submit. NB: NON viene scritto a modelStore qui (solo al submit).
  const generatedModel = useMemo(() => {
    if (!validation.ok) return null;
    return buildFrameModel(params);
  }, [params, validation.ok]);

  const handlePresetClick = (id: FramePresetId) => {
    setParams(FRAME_PRESETS[id].params);
  };

  const handleSubmit = () => {
    if (!validation.ok || !generatedModel) return;
    setModel(generatedModel);
    onSubmit?.();
  };

  return (
    <div className="ptd-geom-body" data-testid="step-geometry-body">
      {/* ── LEFT · form parametrico ── */}
      <div className="ptd-geom-form">
        <NumberField
          label="Numero campi"
          value={params.numberOfBays}
          onChange={(v) => setParams({ ...params, numberOfBays: v })}
          min={1}
          max={3}
          step={1}
          unit=""
          testid="ptd-geom-bays"
        />
        <NumberField
          label="Luce per campo"
          value={params.spanPerBay}
          onChange={(v) => setParams({ ...params, spanPerBay: v })}
          min={3}
          max={8}
          step={0.5}
          unit="m"
          testid="ptd-geom-span"
        />
        <NumberField
          label="Altezza colonna"
          value={params.columnHeight}
          onChange={(v) => setParams({ ...params, columnHeight: v })}
          min={3}
          max={6}
          step={0.5}
          unit="m"
          testid="ptd-geom-height"
        />
        <NumberField
          label="Pendenza copertura"
          value={params.roofSlope}
          onChange={(v) => setParams({ ...params, roofSlope: v })}
          min={0}
          max={30}
          step={5}
          unit="°"
          testid="ptd-geom-slope"
        />

        <div className="ptd-geom-tip" data-testid="ptd-geom-tip">
          <Lightbulb size={14} strokeWidth={1.8} aria-hidden />
          <p>
            Tieni luce ≤ 6 m e altezza ≤ 4 m per le verifiche
            didattiche. Per scenari reali, vedi <strong>Settings →
            Limiti modello</strong>.
          </p>
        </div>

        <button
          type="button"
          className="ptd-geom-submit"
          onClick={handleSubmit}
          disabled={!validation.ok}
          data-testid="step-geometry-submit"
        >
          Done with Geometry
        </button>

        {!validation.ok && (
          <p className="ptd-geom-error" data-testid="step-geometry-error">
            ⚠ {validation.reason}
          </p>
        )}
      </div>

      {/* ── CENTER · preview SVG live ── */}
      <div className="ptd-geom-preview" data-testid="step-geometry-preview">
        <div className="ptd-geom-preview-title">2D Portal Frame Preview</div>
        {generatedModel ? (
          <FramePreviewSvg model={generatedModel} params={params} />
        ) : (
          <div className="ptd-geom-preview-error">
            Correggi i parametri per vedere l'anteprima
          </div>
        )}
        <div className="ptd-geom-preview-summary">
          {generatedModel ? (
            <>
              <span>{generatedModel.nodes.length} nodi</span>
              <span>·</span>
              <span>{generatedModel.elements.length} elementi</span>
              <span>·</span>
              <span>S275 · IPE 300</span>
            </>
          ) : null}
        </div>
      </div>

      {/* ── RIGHT · aside preset + about ── */}
      <aside className="ptd-geom-aside" data-testid="step-geometry-aside">
        <div className="ptd-geom-aside-eyebrow">WHAT ARE YOU BUILDING?</div>
        <div className="ptd-geom-presets" role="list">
          {(Object.keys(FRAME_PRESETS) as FramePresetId[]).map((id) => {
            const preset = FRAME_PRESETS[id];
            return (
              <button
                key={id}
                type="button"
                role="listitem"
                className="ptd-geom-preset"
                onClick={() => handlePresetClick(id)}
                data-testid={`step-geometry-preset-${id}`}
              >
                <div className="ptd-geom-preset-label">{preset.label}</div>
                <div className="ptd-geom-preset-desc">{preset.description}</div>
              </button>
            );
          })}
        </div>

        <div className="ptd-geom-about" data-testid="step-geometry-about">
          <div className="ptd-geom-aside-eyebrow">ABOUT THIS STEP</div>
          <p>
            La geometria definisce la <strong>scheletratura</strong> del
            telaio: posizione di nodi e elementi. Vincoli e carichi li
            aggiungi negli step successivi.
          </p>
          <p className="ptd-geom-about-hint">
            La mesh è generata <strong>automaticamente</strong> al click
            "Esegui" (step 4).
          </p>
        </div>
      </aside>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  testid: string;
}

function NumberField({ label, value, onChange, min, max, step, unit, testid }: NumberFieldProps) {
  return (
    <div className="ptd-geom-field">
      <label className="ptd-geom-field-label">
        {label}
        {unit && <span className="ptd-geom-field-unit">({unit})</span>}
      </label>
      <input
        type="number"
        className="ptd-geom-field-input"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        data-testid={testid}
      />
    </div>
  );
}


/**
 * Preview SVG del telaio: disegna nodi (cerchietti) + elementi (linee).
 * Calcola un viewBox dinamico per fittare il telaio nello spazio
 * disponibile con padding. Asse Y SVG va invertito (top-down) rispetto
 * a Y modello (bottom-up).
 */
function FramePreviewSvg({
  model,
  params,
}: {
  model: { nodes: Array<{ id: number; x: number; y: number }>; elements: Array<{ nodes: number[] }> };
  params: FrameParams;
}) {
  const PADDING = 0.5; // metri di padding intorno al telaio nel viewBox

  // viewBox: [minX, minY, width, height] in unità modello (metri)
  const { minX, minY, maxX, maxY } = useMemo(() => {
    if (model.nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    }
    let mx = Infinity, MX = -Infinity, my = Infinity, MY = -Infinity;
    for (const n of model.nodes) {
      if (n.x < mx) mx = n.x;
      if (n.x > MX) MX = n.x;
      if (n.y < my) my = n.y;
      if (n.y > MY) MY = n.y;
    }
    return { minX: mx, minY: my, maxX: MX, maxY: MY };
  }, [model.nodes]);

  const widthM = (maxX - minX) + 2 * PADDING;
  const heightM = (maxY - minY) + 2 * PADDING;

  // Inverti asse Y per SVG (bottom-up → top-down): y_svg = maxY - y_model
  const toSvg = (x: number, y: number) => ({
    x: x - minX + PADDING,
    y: (maxY - y) + PADDING,
  });

  return (
    <svg
      className="ptd-geom-svg"
      viewBox={`0 0 ${widthM} ${heightM}`}
      preserveAspectRatio="xMidYMid meet"
      data-testid="step-geometry-svg"
    >
      {/* Griglia di base (linea terra) */}
      <line
        x1={0}
        y1={heightM - PADDING}
        x2={widthM}
        y2={heightM - PADDING}
        stroke="currentColor"
        strokeWidth={0.02}
        strokeDasharray="0.1 0.1"
        opacity={0.3}
      />
      {/* Elementi (linee tra nodi connessi) */}
      {model.elements.map((el, i) => {
        const n1 = model.nodes.find((n) => n.id === el.nodes[0]);
        const n2 = model.nodes.find((n) => n.id === el.nodes[1]);
        if (!n1 || !n2) return null;
        const p1 = toSvg(n1.x, n1.y);
        const p2 = toSvg(n2.x, n2.y);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="var(--accent)"
            strokeWidth={0.08}
            strokeLinecap="round"
          />
        );
      })}
      {/* Nodi (cerchietti) */}
      {model.nodes.map((n) => {
        const p = toSvg(n.x, n.y);
        return (
          <circle
            key={n.id}
            cx={p.x}
            cy={p.y}
            r={0.12}
            fill="var(--bg-panel)"
            stroke="var(--accent)"
            strokeWidth={0.04}
          />
        );
      })}
      {/* Dim text bay 1 sotto (solo prima bay per chiarezza) */}
      {params.numberOfBays >= 1 && (
        <text
          x={(0 + params.spanPerBay) / 2 - minX + PADDING}
          y={heightM - PADDING + 0.3}
          textAnchor="middle"
          fontSize={0.25}
          fill="var(--ink-dim)"
          fontFamily="JetBrains Mono, monospace"
        >
          Bay · {params.spanPerBay.toFixed(1)} m
        </text>
      )}
    </svg>
  );
}
