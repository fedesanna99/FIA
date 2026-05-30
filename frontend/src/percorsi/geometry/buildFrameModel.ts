/**
 * buildFrameModel · v3.5 Fetta D3 (30/05/2026)
 *
 * Genera un FEAModel "Telaio portale 2D" parametrico a partire da 4
 * parametri user-facing semplici:
 *   - numberOfBays   (1-3)   numero di campi affiancati
 *   - spanPerBay (m) (3-8)   luce di ogni campo
 *   - columnHeight (m) (3-6) altezza colonne (al livello eaves)
 *   - roofSlope (°)  (0-30)  pendenza copertura (0 = traverso piano)
 *
 * Coordinate XY (Z=0 sempre, telaio 2D):
 *   - origine in (0,0) = base prima colonna sinistra
 *   - X cresce a destra (orizzontale)
 *   - Y cresce in alto (verticale, gravity = -Y)
 *
 * Topologia generata:
 *   - Nodi base: 1 per ogni colonna (n+1 colonne per n bays)
 *   - Nodi top "eaves": 1 per ogni colonna a colonna alta
 *   - Nodi apex: 1 per ogni bay se roofSlope > 0 (centro bay alto)
 *   - Elementi colonna: 1 per ogni colonna (base → eaves)
 *   - Elementi falda: 2 per ogni bay se roofSlope > 0 (eaves → apex,
 *     apex → eaves successivo); 1 se slope = 0 (traverso piano)
 *
 * Output FEAModel parziale (nodes + elements + materials base). I
 * vincoli (incastri base) e i carichi (peso + neve) sono aggiunti
 * negli step 2-3 del Percorso (D6).
 *
 * NB: questa funzione e' PURA — non muta nessuno store. Il caller
 * (StepGeometry) la chiama poi passa il risultato a `modelStore.setModel`.
 */
import type { FEAModel, Node, Element } from "../../types/model";


export interface FrameParams {
  numberOfBays: number;
  spanPerBay: number;
  columnHeight: number;
  roofSlope: number;
}


/** Material default S275 acciaio (id+name+color, signature inline del
 *  FEAModel.materials[]). Le proprietà fisiche (E, nu, ρ) vivono lato
 *  backend nel registry materiali — qui basta l'id per riferirsi. */
const DEFAULT_MATERIAL = {
  id: "s275",
  name: "S275 — Acciaio strutturale",
  color: "#3b82f6",
};

const DEFAULT_MATERIAL_ID = DEFAULT_MATERIAL.id;
const DEFAULT_SECTION_ID = "ipe-300";


export function buildFrameModel(params: FrameParams): FEAModel {
  const { numberOfBays, spanPerBay, columnHeight, roofSlope } = params;
  const slopeRad = (roofSlope * Math.PI) / 180;
  const hasApex = roofSlope > 0;

  const nodes: Node[] = [];
  const elements: Element[] = [];
  let nodeId = 1;
  let elementId = 1;

  // ── Step 1 · genera nodi base + nodi eaves (top colonne) ──────────
  // Per n bays serve (n+1) colonne. Per ogni colonna: 2 nodi (base + eaves).
  const numberOfColumns = numberOfBays + 1;
  const baseNodes: number[] = [];
  const eavesNodes: number[] = [];

  for (let col = 0; col < numberOfColumns; col++) {
    const x = col * spanPerBay;
    // Base
    const baseId = nodeId++;
    nodes.push({ id: baseId, x, y: 0, z: 0 });
    baseNodes.push(baseId);
    // Eaves (top colonna)
    const eavesId = nodeId++;
    nodes.push({ id: eavesId, x, y: columnHeight, z: 0 });
    eavesNodes.push(eavesId);
  }

  // ── Step 2 · genera nodi apex (centro tetto bay) se slope > 0 ───
  // Apex sopra il midpoint di ogni bay, altezza = columnHeight + (spanPerBay/2)*tan(slope)
  const apexNodes: number[] = [];
  if (hasApex) {
    for (let bay = 0; bay < numberOfBays; bay++) {
      const xApex = (bay + 0.5) * spanPerBay;
      const yApex = columnHeight + (spanPerBay / 2) * Math.tan(slopeRad);
      const apexId = nodeId++;
      nodes.push({ id: apexId, x: xApex, y: yApex, z: 0 });
      apexNodes.push(apexId);
    }
  }

  // ── Step 3 · genera elementi colonne (base → eaves per ogni colonna) ──
  for (let col = 0; col < numberOfColumns; col++) {
    elements.push({
      id: elementId++,
      type: "beam2d",
      nodes: [baseNodes[col], eavesNodes[col]],
      material_id: DEFAULT_MATERIAL_ID,
      section_id: DEFAULT_SECTION_ID,
    });
  }

  // ── Step 4 · genera elementi tetto ────────────────────────────────
  for (let bay = 0; bay < numberOfBays; bay++) {
    const leftEaves = eavesNodes[bay];
    const rightEaves = eavesNodes[bay + 1];
    if (hasApex) {
      // Falda sx: eaves left → apex
      elements.push({
        id: elementId++,
        type: "beam2d",
        nodes: [leftEaves, apexNodes[bay]],
        material_id: DEFAULT_MATERIAL_ID,
        section_id: DEFAULT_SECTION_ID,
      });
      // Falda dx: apex → eaves right
      elements.push({
        id: elementId++,
        type: "beam2d",
        nodes: [apexNodes[bay], rightEaves],
        material_id: DEFAULT_MATERIAL_ID,
        section_id: DEFAULT_SECTION_ID,
      });
    } else {
      // Traverso piano: eaves left → eaves right
      elements.push({
        id: elementId++,
        type: "beam2d",
        nodes: [leftEaves, rightEaves],
        material_id: DEFAULT_MATERIAL_ID,
        section_id: DEFAULT_SECTION_ID,
      });
    }
  }

  // ── Output FEAModel completo (nodes + elements + materials,
  //     constraints/loads vuoti — popolati negli step 2-3 del Percorso). ──
  return {
    id: `telaio-2d-${Date.now()}`,
    name: `Telaio 2D · ${numberOfBays} bay${numberOfBays > 1 ? "s" : ""} · ${spanPerBay}m`,
    units: "SI",
    is_3d: false,
    nodes,
    elements,
    loads: [],
    constraints: [],
    materials: [DEFAULT_MATERIAL],
  };
}


/** 3 preset visivi suggeriti nell'aside "What are you building?". */
export const FRAME_PRESETS = {
  "single-warehouse": {
    label: "Single span warehouse",
    description: "Capannone 1 campo · luce 6m · pendenza dolce 10°",
    params: { numberOfBays: 1, spanPerBay: 6, columnHeight: 4, roofSlope: 10 },
  },
  "multi-bay-industrial": {
    label: "Multi-bay industrial",
    description: "Capannone industriale 3 campi · luce 5m · falde 15°",
    params: { numberOfBays: 3, spanPerBay: 5, columnHeight: 5, roofSlope: 15 },
  },
  "canopy": {
    label: "Canopy / Shelter",
    description: "Pensilina 1 campo · luce 4m · traverso piano",
    params: { numberOfBays: 1, spanPerBay: 4, columnHeight: 3, roofSlope: 0 },
  },
} as const;

export type FramePresetId = keyof typeof FRAME_PRESETS;
