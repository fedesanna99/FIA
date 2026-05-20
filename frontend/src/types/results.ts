export interface NodalDisplacement {
  node_id: number;
  ux: number; uy: number; uz: number;
  rx: number; ry: number; rz: number;
}

export interface NodalReaction {
  node_id: number;
  fx: number; fy: number; fz: number;
  mx: number; my: number; mz: number;
}

export interface ElementForces {
  element_id: number;
  N_i: number; Vy_i: number; Vz_i: number;
  Mx_i: number; My_i: number; Mz_i: number;
  N_j: number; Vy_j: number; Vz_j: number;
  Mx_j: number; My_j: number; Mz_j: number;
}

export interface ElementStress {
  element_id: number;
  sigma_x: number; sigma_y: number; sigma_z: number;
  tau_xy: number; tau_yz: number; tau_xz: number;
  von_mises: number;
  sigma_max: number; sigma_min: number;
  principal_angle_deg?: number;
  centroid?: number[];
  principal_dir1?: number[];
  principal_dir2?: number[];
}

export interface StaticResults {
  analysis_type: "static";
  model_id: string;
  displacements: NodalDisplacement[];
  reactions: NodalReaction[];
  element_forces: ElementForces[];
  element_stresses: ElementStress[];
  max_displacement: number;
  max_stress: number;
  n_dofs: number;
  solve_time_ms: number;
}

export interface ModeShape {
  mode: number;
  frequency_hz: number;
  omega: number;
  period: number;
  displacements: NodalDisplacement[];
  participation_x: number; participation_y: number; participation_z: number;
  effective_mass_x: number; effective_mass_y: number; effective_mass_z: number;
}

export interface ModalResults {
  analysis_type: "modal";
  model_id: string;
  n_modes: number;
  modes: ModeShape[];
  total_mass: number;
  solve_time_ms: number;
}

export interface DynamicResults {
  analysis_type: "dynamic";
  model_id: string;
  dt: number;
  n_steps: number;
  times: number[];
  node_history: Record<number, { ux: number[]; uy: number[]; uz: number[]; ax: number[]; ay: number[]; az: number[] }>;
  max_displacement: number;
  max_displacement_node: number;
  max_displacement_time: number;
  solve_time_ms: number;
}

export type AnalysisType = "static" | "modal" | "dynamic" | "buckling";
