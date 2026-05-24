from pydantic import BaseModel, Field
from typing import Optional


class NodalDisplacement(BaseModel):
    node_id: int
    ux: float = 0.0
    uy: float = 0.0
    uz: float = 0.0
    rx: float = 0.0
    ry: float = 0.0
    rz: float = 0.0


class NodalReaction(BaseModel):
    node_id: int
    fx: float = 0.0
    fy: float = 0.0
    fz: float = 0.0
    mx: float = 0.0
    my: float = 0.0
    mz: float = 0.0


class ElementForces(BaseModel):
    element_id: int
    N_i: float = 0.0
    Vy_i: float = 0.0
    Vz_i: float = 0.0
    Mx_i: float = 0.0
    My_i: float = 0.0
    Mz_i: float = 0.0
    N_j: float = 0.0
    Vy_j: float = 0.0
    Vz_j: float = 0.0
    Mx_j: float = 0.0
    My_j: float = 0.0
    Mz_j: float = 0.0


class ElementStress(BaseModel):
    element_id: int
    sigma_x: float = 0.0
    sigma_y: float = 0.0
    sigma_z: float = 0.0
    tau_xy: float = 0.0
    tau_yz: float = 0.0
    tau_xz: float = 0.0
    von_mises: float = 0.0
    sigma_max: float = 0.0
    sigma_min: float = 0.0
    principal_angle_deg: float = 0.0  # angolo σ1 nel piano locale
    centroid: list[float] = []         # baricentro dell'elemento [x, y, z]
    principal_dir1: list[float] = []   # versore 3D globale di σ1
    principal_dir2: list[float] = []   # versore 3D globale di σ2

    # === Bending shell — additivo da v2.4.3b (NEW-4 audit v2.3.7) ============
    # Campi Optional, None per elementi non-shell (beam, truss, solid).
    # I campi `sigma_*` esistenti sopra restano la componente MEMBRANA
    # (back-compat con frontend e test esistenti).
    # `sigma_*_top/bot` sono stress in fibra estrema z = ±t/2:
    #   sigma_top = sigma_membrana + 6 * M / t^2
    #   sigma_bot = sigma_membrana - 6 * M / t^2
    sigma_x_top: Optional[float] = None
    sigma_y_top: Optional[float] = None
    tau_xy_top: Optional[float] = None
    sigma_x_bot: Optional[float] = None
    sigma_y_bot: Optional[float] = None
    tau_xy_bot: Optional[float] = None
    # Momenti flettenti / torcente per unità di lunghezza [N·m/m]
    M_x: Optional[float] = None
    M_y: Optional[float] = None
    M_xy: Optional[float] = None


class NodalShellStress(BaseModel):
    """v2.4.3c: stress shell consistent-averaged a un nodo specifico.

    Differente da ElementStress (che è per-elemento). Qui ogni entry è
    un nodo + valori membrana + bending mediati sugli elementi adiacenti.
    Usato per stress recovery accurato in punti di gradient (es. NAFEMS LE1
    punto D al bordo del foro).
    """
    node_id: int
    sigma_x: float = 0.0
    sigma_y: float = 0.0
    tau_xy: float = 0.0
    sigma_x_top: Optional[float] = None
    sigma_y_top: Optional[float] = None
    tau_xy_top: Optional[float] = None
    sigma_x_bot: Optional[float] = None
    sigma_y_bot: Optional[float] = None
    tau_xy_bot: Optional[float] = None
    M_x: Optional[float] = None
    M_y: Optional[float] = None
    M_xy: Optional[float] = None


class StaticResults(BaseModel):
    analysis_type: str = "static"
    model_id: str
    displacements: list[NodalDisplacement] = Field(default_factory=list)
    reactions: list[NodalReaction] = Field(default_factory=list)
    element_forces: list[ElementForces] = Field(default_factory=list)
    element_stresses: list[ElementStress] = Field(default_factory=list)
    # v2.4.3c (NEW-1): stress shell consistent-averaged ai nodi. Vuoto
    # quando il modello non contiene shell elements. Usato per stress
    # recovery accurato in punti di gradient elevato.
    shell_nodal_stresses: list[NodalShellStress] = Field(default_factory=list)
    max_displacement: float = 0.0
    max_stress: float = 0.0
    n_dofs: int = 0
    solve_time_ms: float = 0.0


class ModeShape(BaseModel):
    mode: int
    frequency_hz: float
    omega: float
    period: float
    displacements: list[NodalDisplacement] = Field(default_factory=list)
    participation_x: float = 0.0
    participation_y: float = 0.0
    participation_z: float = 0.0
    effective_mass_x: float = 0.0
    effective_mass_y: float = 0.0
    effective_mass_z: float = 0.0


class ModalResults(BaseModel):
    analysis_type: str = "modal"
    model_id: str
    n_modes: int
    modes: list[ModeShape] = Field(default_factory=list)
    total_mass: float = 0.0
    solve_time_ms: float = 0.0


class TimeStep(BaseModel):
    time: float
    displacements: list[NodalDisplacement] = Field(default_factory=list)


class DynamicResults(BaseModel):
    analysis_type: str = "dynamic"
    model_id: str
    dt: float
    n_steps: int
    times: list[float] = Field(default_factory=list)
    node_history: dict[int, dict[str, list[float]]] = Field(default_factory=dict)
    max_displacement: float = 0.0
    max_displacement_node: int = 0
    max_displacement_time: float = 0.0
    solve_time_ms: float = 0.0
