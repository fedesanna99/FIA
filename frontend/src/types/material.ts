export interface Material {
  id: string;
  name: string;
  E: number;
  nu: number;
  rho: number;
  fy?: number;
  fck?: number;
  color: string;
}

export interface Section {
  id: string;
  name: string;
  type: "rectangular" | "circular" | "circular_hollow" | "I_profile" | "custom";
  A: number;
  Iy: number;
  Iz: number;
  J: number;
  Wply: number;
  Wplz: number;
  h?: number;
  b?: number;
  t?: number;
  thickness?: number;
}
