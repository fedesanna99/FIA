"""
Solver per analisi time-history sismica multi-componente.

Orchestra il DynamicSolver Newmark-β iniettando uno o più accelerogrammi
GROUND_ACCEL nel modello su direzioni ortogonali (X, Y, Z). I tre carichi
vengono sommati internamente dal DynamicSolver via la formula:

    F_eff(t) = -M · Σ_i r_i · a_g,i(t)

dove r_i è il vettore di influenza per la direzione i-esima.

Convenzioni di input:
    Si passano gli accelerogrammi come dict {"X": [(t, ag), ...],
                                              "Y": [(t, ag), ...],
                                              "Z": [(t, ag), ...]}
    (qualsiasi sottoinsieme di X, Y, Z, di lunghezze diverse).

Output:
    Reusa schemas.results.DynamicResults (storie nodali ux/uy/uz/ax/ay/az,
    max_displacement, ecc.) — il chiamante decide cosa post-processare
    (drift, accelerazioni di piano, …).
"""
from __future__ import annotations
import copy
from typing import Mapping, Sequence

from schemas import FEAModel, Load, LoadType
from schemas.results import DynamicResults
from .dynamic_solver import DynamicSolver


_AXIS_DIRECTION: dict[str, list[float]] = {
    "X": [1.0, 0.0, 0.0],
    "Y": [0.0, 1.0, 0.0],
    "Z": [0.0, 0.0, 1.0],
}


def _next_load_id(model: FEAModel) -> int:
    if not model.loads:
        return 1
    return max(l.id for l in model.loads) + 1


def _inject_ground_accels(
    model: FEAModel,
    components: Mapping[str, Sequence[tuple[float, float]]],
) -> FEAModel:
    """Restituisce una copia del modello con i carichi GROUND_ACCEL aggiunti."""
    m = copy.deepcopy(model)
    next_id = _next_load_id(m)
    for axis, hist in components.items():
        axis_u = axis.upper()
        if axis_u not in _AXIS_DIRECTION:
            raise ValueError(f"Asse '{axis}' non valido. Usa X / Y / Z.")
        if not hist or len(hist) < 2:
            raise ValueError(f"Time history per '{axis}' deve avere ≥ 2 punti.")
        # target_id arbitrario: per GROUND_ACCEL non viene letto come nodo, ma il
        # modello richiede comunque un valore intero coerente con lo schema.
        target_id = (m.nodes[0].id if m.nodes else 1)
        m.loads.append(Load(
            id=next_id,
            type=LoadType.GROUND_ACCEL,
            target_id=target_id,
            time_history=[(float(t), float(a)) for t, a in hist],
            direction=_AXIS_DIRECTION[axis_u],
            label=f"GA_{axis_u}",
        ))
        next_id += 1
    return m


class SeismicTimeHistorySolver:
    """Solver sismico time-history multi-componente.

    Args:
        model       : modello FEA
        components  : dizionario {asse: time_history} con asse in {'X','Y','Z'}
        dt          : passo di integrazione Newmark [s]
        t_end       : istante finale [s]
        damping_xi  : smorzamento modale unico (Rayleigh equiv.) per i due modi
                      principali. Se 0 → analisi non smorzata (sconsigliata).
        omega_lo    : pulsazione bassa per Rayleigh damping [rad/s] (default 2π·0.5)
        omega_hi    : pulsazione alta per Rayleigh damping [rad/s] (default 2π·10)
        save_every  : sottocampionamento delle storie nodali
        store_nodes : se None, salva tutti i nodi
    """

    def __init__(
        self,
        model: FEAModel,
        components: Mapping[str, Sequence[tuple[float, float]]],
        *,
        dt: float = 0.01,
        t_end: float | None = None,
        damping_xi: float = 0.05,
        omega_lo: float = 2 * 3.14159265358979 * 0.5,
        omega_hi: float = 2 * 3.14159265358979 * 10.0,
        save_every: int = 1,
        store_nodes: list[int] | None = None,
    ):
        if not components:
            raise ValueError("Almeno una componente sismica richiesta.")
        self.model = model
        self.components = dict(components)
        self.dt = float(dt)
        # auto t_end = durata massima dei time-history forniti
        if t_end is None:
            t_end = max(hist[-1][0] for hist in components.values())
        self.t_end = float(t_end)
        self.damping_xi = float(damping_xi)
        self.omega_lo = float(omega_lo)
        self.omega_hi = float(omega_hi)
        self.save_every = save_every
        self.store_nodes = store_nodes

    def _rayleigh_alpha_beta(self) -> tuple[float, float]:
        """Calcola coefficienti Rayleigh (α, β) per smorzamento ξ
        costante su 2 frequenze:
            α = 2ξ ω_lo ω_hi / (ω_lo + ω_hi)
            β = 2ξ / (ω_lo + ω_hi)
        """
        if self.damping_xi <= 0:
            return 0.0, 0.0
        w_lo, w_hi, xi = self.omega_lo, self.omega_hi, self.damping_xi
        alpha = 2.0 * xi * w_lo * w_hi / (w_lo + w_hi)
        beta = 2.0 * xi / (w_lo + w_hi)
        return alpha, beta

    def solve(self, progress_cb=None) -> DynamicResults:
        m_with_loads = _inject_ground_accels(self.model, self.components)
        alpha, beta = self._rayleigh_alpha_beta()
        solver = DynamicSolver(
            m_with_loads,
            dt=self.dt, t_end=self.t_end,
            rayleigh_alpha=alpha, rayleigh_beta=beta,
            save_every=self.save_every,
            store_nodes=self.store_nodes,
        )
        return solver.solve(progress_cb=progress_cb)
