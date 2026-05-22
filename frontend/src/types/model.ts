export type ElementType =
  | "beam2d" | "beam3d"
  | "truss2d" | "truss3d"
  | "cable2d" | "cable3d"
  | "shell_q4" | "shell_q4_mitc"
  | "solid_h8" | "solid_t4" | "solid_t10"
  | "tri3";

export type LoadType =
  | "nodal" | "distributed" | "self_weight"
  | "nodal_mass" | "dynamic" | "pressure" | "ground_accel" | "temperature";

export type ConstraintType =
  | "fixed" | "pinned"
  | "roller_x" | "roller_y" | "roller_z"
  | "custom" | "spring";

export interface Node {
  id: number;
  x: number; y: number; z: number;
  label?: string;
}

export interface Element {
  id: number;
  type: ElementType;
  nodes: number[];
  material_id: string;
  section_id?: string;
  orientation?: number[];
  releases?: number[];
  /**
   * Coefficiente di Winkler distribuito sull'elemento [N/m²] (solo BEAM2D).
   * Aggiunge rigidezza elastica trasversale del suolo.
   * Vedi FASE 8 (Hetényi).
   */
  winkler_k?: number;
  /**
   * Pretensione iniziale per cavi (CABLE2D/CABLE3D) [N]. Positiva = trazione.
   * Usata dal NonLinearStaticSolver per inizializzare lo stato (BL-1).
   */
  pretension?: number;
}

export interface Load {
  id: number;
  type: LoadType;
  target_id: number;
  fx?: number; fy?: number; fz?: number;
  mx?: number; my?: number; mz?: number;
  qx?: number; qy?: number; qz?: number;
  distribution?: "uniform" | "triangular" | "trapezoidal";
  pressure?: number;
  mass?: number;
  delta_t?: number;
  time_history?: [number, number][];
  direction?: number[];
  label?: string;
}

export interface Constraint {
  id: number;
  type: ConstraintType;
  node_id: number;
  dofs?: boolean[];
  /** Rigidezza molla per ciascun GdL [N/m] (solo type=spring). */
  spring_k?: number[];
  /**
   * Se true e type=spring: la molla si disattiva quando in trazione.
   * Usato per modellare terreno (no-tension), gap di contatto, ecc.
   * Richiede risolutore unilaterale (active-set).
   */
  compression_only?: boolean;
  label?: string;
}

export interface FEAModel {
  id: string;
  name: string;
  description?: string;
  units: "SI" | "kN-m" | "N-mm";
  is_3d: boolean;
  nodes: Node[];
  elements: Element[];
  loads: Load[];
  constraints: Constraint[];
  /**
   * v1.7-polish T3: libreria materiali del modello.
   * Opzionale per retrocompatibilità con modelli serializzati prima
   * dell'introduzione del campo. Quando assente, il consumer mostra
   * placeholder neutro (es. "—" in ViewportHud) — vedi follow-up
   * alpha.30 Task 3 (rimuove cast `as unknown` precedente).
   */
  materials?: { id?: string; name?: string; color?: string }[];
}
