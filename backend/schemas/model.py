from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class ElementType(str, Enum):
    BEAM2D = "beam2d"
    BEAM3D = "beam3d"
    TRUSS2D = "truss2d"
    TRUSS3D = "truss3d"
    CABLE2D = "cable2d"      # cavo 2D — tension-only (BL-1)
    CABLE3D = "cable3d"      # cavo 3D — tension-only (BL-1)
    SHELL_Q4 = "shell_q4"
    SHELL_Q4_MITC = "shell_q4_mitc"   # MITC4 anti shear-locking (BL-5)
    SOLID_H8 = "solid_h8"
    SOLID_T4 = "solid_t4"        # Tet4 lineare (BL-3)
    SOLID_T10 = "solid_t10"      # Tet10 quadratico (BL-3)
    TRI3 = "tri3"


class LoadType(str, Enum):
    NODAL = "nodal"
    DISTRIBUTED = "distributed"
    SELF_WEIGHT = "self_weight"
    NODAL_MASS = "nodal_mass"
    DYNAMIC = "dynamic"
    PRESSURE = "pressure"
    GROUND_ACCEL = "ground_accel"
    TEMPERATURE = "temperature"


class ConstraintType(str, Enum):
    FIXED = "fixed"
    PINNED = "pinned"
    ROLLER_X = "roller_x"
    ROLLER_Y = "roller_y"
    ROLLER_Z = "roller_z"
    CUSTOM = "custom"
    SPRING = "spring"


class Node(BaseModel):
    id: int
    x: float
    y: float
    z: float = 0.0
    label: Optional[str] = None


class Element(BaseModel):
    id: int
    type: ElementType
    nodes: list[int]
    material_id: str
    section_id: Optional[str] = None
    orientation: Optional[list[float]] = None
    releases: Optional[list[int]] = None
    winkler_k: Optional[float] = Field(
        None,
        description="Coefficiente di Winkler distribuito sull'elemento [N/m²]. "
                    "Se presente, aggiunge una rigidezza elastica del suolo "
                    "lungo la direzione trasversale dell'elemento (solo BEAM2D)."
    )
    pretension: Optional[float] = Field(
        None,
        description="Pretensione iniziale per cavi (CABLE2D/CABLE3D) [N]. "
                    "Positiva = trazione. Se assente o ≤0, il cavo parte rilassato. "
                    "Usata dal NonLinearStaticSolver per inizializzare lo stato (BL-1)."
    )


class Load(BaseModel):
    id: int
    type: LoadType
    target_id: int
    fx: float = 0.0
    fy: float = 0.0
    fz: float = 0.0
    mx: float = 0.0
    my: float = 0.0
    mz: float = 0.0
    qx: float = 0.0
    qy: float = 0.0
    qz: float = 0.0
    distribution: Literal["uniform", "triangular", "trapezoidal"] = "uniform"
    pressure: float = 0.0
    mass: float = 0.0
    delta_t: float = 0.0  # variazione termica [°C]
    time_history: Optional[list[tuple[float, float]]] = None
    direction: Optional[list[float]] = None
    label: Optional[str] = None


class Constraint(BaseModel):
    id: int
    type: ConstraintType
    node_id: int
    dofs: Optional[list[bool]] = None
    spring_k: Optional[list[float]] = None
    compression_only: bool = Field(
        False,
        description="Se True e type=SPRING: la molla si disattiva quando in trazione "
                    "(usato per terreno che non resiste a trazione, gap, ecc.). "
                    "Richiede UnilateralSolver per la risoluzione iterativa."
    )
    label: Optional[str] = None


class FEAModel(BaseModel):
    id: str
    name: str = "Untitled Model"
    description: Optional[str] = None
    units: Literal["SI", "kN-m", "N-mm"] = "SI"
    is_3d: bool = True
    nodes: list[Node] = Field(default_factory=list)
    elements: list[Element] = Field(default_factory=list)
    loads: list[Load] = Field(default_factory=list)
    constraints: list[Constraint] = Field(default_factory=list)
    # v2.4.6 #22bis: owner per GDPR cascade. Optional/None = modello
    # pubblico/demo (es. esempi pre-popolati). Popolato al POST/PUT da
    # API routes models quando l'utente è autenticato.
    owner_id: Optional[str] = None
    # v3.1.1 audit-fix L2-4: timestamp ISO-8601 di creazione/ultimo update.
    # Popolato da `storage.save_model` (touch automatico). Permette al
    # frontend Dashboard di ordinare la lista "recenti" per data di modifica.
    # Optional per retrocompat con modelli serializzati pre-migration.
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    units: Optional[str] = None
    is_3d: Optional[bool] = None
