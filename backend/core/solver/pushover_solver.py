"""
Analisi di push-over (incremento di carico) con cerniere plastiche concentrate.

Procedura semplificata:
    1. Per λ ∈ [Δλ, 2·Δλ, ..., λ_max]:
        a. Scala i carichi del modello del fattore λ.
        b. Esegui statica lineare.
        c. Per ogni beam, controlla se |M| > M_pl agli estremi.
        d. Se sì → registra hinge event, aggiungi release rotazionale.
        e. Salva (λ, δ_control, n_hinges).
    2. Termina se: K diventa singolare (meccanismo) o λ ≥ λ_max o tutti i
       dof rotazionali release già attivi.

Limiti dell'implementazione attuale:
    - Solo beam2D (e simili).
    - Solo interazione di flessione semplice (nessun N–M).
    - Modello elasto-plastico perfetto (no incrudimento).
    - Push-over a controllo di CARICO (load control); displacement control e
      arc-length sono per iterazioni future.

Riferimento: NTC 2018 §7.3.4.1 (analisi pushover) + EC8 §4.3.3.4.
"""
from __future__ import annotations
from dataclasses import dataclass, field
import copy
import time
import numpy as np
import scipy.sparse.linalg as spla

from schemas import (
    FEAModel, ElementType, MATERIALS_DB, SECTIONS_DB,
)
from schemas.results import StaticResults
from .static_solver import StaticSolver


@dataclass(frozen=True)
class HingeEvent:
    step: int
    lambda_value: float
    element_id: int
    end: str             # "i" o "j"
    M: float             # momento al momento della plasticizzazione
    M_pl: float


@dataclass
class PushoverStep:
    step: int
    lambda_value: float
    delta_control: float
    n_hinges: int
    converged: bool = True


@dataclass
class PushoverResults:
    analysis_type: str = "pushover"
    model_id: str = ""
    steps: list[PushoverStep] = field(default_factory=list)
    hinge_events: list[HingeEvent] = field(default_factory=list)
    collapse_lambda: float | None = None
    collapse_reason: str = ""
    solve_time_ms: float = 0.0


def _plastic_moment(material_id: str, section_id: str) -> float | None:
    """M_pl = W_pl · f_y. Restituisce None se i dati mancano."""
    mat = MATERIALS_DB.get(material_id)
    sec = SECTIONS_DB.get(section_id) if section_id else None
    if mat is None or sec is None:
        return None
    if mat.fy is None or sec.Wply <= 0:
        return None
    return mat.fy * sec.Wply


def _delta_max(static: StaticResults) -> float:
    """Massimo modulo di spostamento traslazionale fra tutti i nodi."""
    if not static.displacements:
        return 0.0
    return max(
        (d.ux ** 2 + d.uy ** 2 + d.uz ** 2) ** 0.5
        for d in static.displacements
    )


class PushoverSolver:
    """Solver pushover a controllo di carico.

    Args:
        model               : modello FEA (i carichi presenti sono il pattern
                              di riferimento, moltiplicato per λ ad ogni step)
        lambda_step         : incremento di λ per step (default 0.05)
        lambda_max          : λ massimo (default 5.0)
        max_steps           : limite di sicurezza al numero di step
        delta_max_for_stop  : se lo spostamento massimo eccede questo valore [m],
                              considera la struttura "collassata" (proxy del
                              meccanismo per modelli senza singolarità esplicita).
    """

    def __init__(
        self,
        model: FEAModel,
        lambda_step: float = 0.05,
        lambda_max: float = 5.0,
        max_steps: int = 200,
        delta_max_for_stop: float = 1.0,
    ):
        if lambda_step <= 0:
            raise ValueError("lambda_step deve essere positivo")
        if lambda_max <= 0:
            raise ValueError("lambda_max deve essere positivo")
        self.model = copy.deepcopy(model)  # non muta il modello originale
        self.lambda_step = lambda_step
        self.lambda_max = lambda_max
        self.max_steps = max_steps
        self.delta_max_for_stop = delta_max_for_stop

    def _scale_loads(self, factor: float) -> FEAModel:
        m = copy.deepcopy(self.model)
        for ld in m.loads:
            ld.fx *= factor; ld.fy *= factor; ld.fz *= factor
            ld.mx *= factor; ld.my *= factor; ld.mz *= factor
            ld.qx *= factor; ld.qy *= factor; ld.qz *= factor
            ld.pressure *= factor
        return m

    def solve(self, progress_cb=None) -> PushoverResults:
        t0 = time.time()
        results = PushoverResults(model_id=self.model.id)

        # Pre-calcolo M_pl per ogni elemento (immutabile durante il run)
        M_pl_by_elem: dict[int, float] = {}
        for el in self.model.elements:
            if el.type not in (ElementType.BEAM2D, ElementType.BEAM3D):
                continue
            mpl = _plastic_moment(el.material_id, el.section_id or "")
            if mpl is not None:
                M_pl_by_elem[el.id] = mpl

        # Set di hinges già attivi: (element_id, end "i"/"j")
        active_hinges: set[tuple[int, str]] = set()

        n_total_steps = int(self.lambda_max / self.lambda_step)
        for step in range(1, min(n_total_steps, self.max_steps) + 1):
            lam = step * self.lambda_step
            if progress_cb:
                progress_cb(step / n_total_steps,
                            f"λ={lam:.3f}, hinges={len(active_hinges)}")
            # Costruisce il modello con i release accumulati
            m_step = self._scale_loads(lam)
            for el in m_step.elements:
                if el.type != ElementType.BEAM2D:
                    continue
                rel: list[int] = []
                if (el.id, "i") in active_hinges:
                    rel.append(2)  # rotz nodo i
                if (el.id, "j") in active_hinges:
                    rel.append(5)  # rotz nodo j
                if rel:
                    el.releases = rel
            try:
                static = StaticSolver(m_step).solve()
            except (RuntimeError, spla.MatrixRankWarning, np.linalg.LinAlgError) as e:
                results.collapse_lambda = lam - self.lambda_step
                results.collapse_reason = f"K singolare (meccanismo): {e}"
                break

            delta = _delta_max(static)
            results.steps.append(PushoverStep(
                step=step, lambda_value=lam, delta_control=delta,
                n_hinges=len(active_hinges),
            ))

            if delta > self.delta_max_for_stop:
                results.collapse_lambda = lam
                results.collapse_reason = (
                    f"Spostamento massimo {delta:.4f} m > soglia "
                    f"{self.delta_max_for_stop} m"
                )
                break

            # Controlla la formazione di nuove cerniere
            new_hinges = 0
            for f in static.element_forces:
                if f.element_id not in M_pl_by_elem:
                    continue
                M_pl = M_pl_by_elem[f.element_id]
                for end, M_val in [("i", f.Mz_i), ("j", f.Mz_j)]:
                    if (f.element_id, end) in active_hinges:
                        continue
                    if abs(M_val) > M_pl * (1.0 + 1e-6):
                        active_hinges.add((f.element_id, end))
                        results.hinge_events.append(HingeEvent(
                            step=step, lambda_value=lam,
                            element_id=f.element_id, end=end,
                            M=M_val, M_pl=M_pl,
                        ))
                        new_hinges += 1

            # Se tutti i dof rotazionali sono rilasciati → stop
            if len(active_hinges) >= 2 * len(M_pl_by_elem):
                results.collapse_lambda = lam
                results.collapse_reason = "Meccanismo completo (tutte le hinges)"
                break
        else:
            # Esaurito il loop senza collasso
            results.collapse_lambda = None
            results.collapse_reason = "λ_max raggiunto senza collasso"

        results.solve_time_ms = (time.time() - t0) * 1000.0
        if progress_cb: progress_cb(1.0, "Completato")
        return results
