"""
Solver per problemi con vincoli unilaterali (molle solo-compressione).

Algoritmo active-set:
    1. Si parte assumendo TUTTE le molle unilaterali attive.
    2. Si risolve la statica lineare.
    3. Per ogni molla unilaterale: se lo spostamento del dof corrispondente
       indica trazione (spost. nel senso opposto alla compressione), la molla
       si "stacca" → la si esclude dall'insieme attivo.
    4. Si ri-risolve. Si itera finché l'insieme attivo non cambia più
       (convergenza in genere ≤ 5 iterazioni per problemi piccoli).

Caso d'uso classico: trave in fondazione che può sollevarsi dal terreno
(parte tesa del bedding).

Convenzione segni:
    Una molla solo-compressione su un dof è "attiva" se lo spostamento di
    quel dof è ≤ 0 (compressione). Se diventa > 0 (sollevamento), si stacca.
    Il segno convenzionalmente assume che l'asse del dof punti "verso l'alto"
    (positiva = sollevamento).

Limiti:
    - Solo molle ai nodi (Constraint type=SPRING con compression_only=True).
    - Non gestisce molle distribuite Winkler unilaterali (Fase 8.x estesa).
    - Gap elements (chiusura di gioco) NON implementati qui.
"""
from __future__ import annotations
from dataclasses import dataclass, field
import copy
import time

from schemas import FEAModel, ConstraintType
from schemas.results import StaticResults
from .static_solver import StaticSolver


@dataclass
class UnilateralResults:
    static: StaticResults
    n_iterations: int
    detached_springs: list[int] = field(default_factory=list)
    converged: bool = True
    solve_time_ms: float = 0.0


def _unilateral_constraints(model: FEAModel) -> list[int]:
    """ID dei Constraint che sono SPRING con compression_only=True."""
    return [
        c.id for c in model.constraints
        if c.type == ConstraintType.SPRING and c.compression_only
    ]


def _dof_axes(spring_k: list[float] | None) -> list[int]:
    """Restituisce gli indici dei dof attivi della molla (k > 0)."""
    if not spring_k:
        return []
    return [i for i, k in enumerate(spring_k) if k and k > 0]


class UnilateralSolver:
    """Solver iterativo a active-set per molle solo-compressione.

    Args:
        model         : modello FEA con almeno una molla con compression_only=True
        max_iterations: limite di sicurezza al loop active-set
        uplift_axis   : asse del dof "sollevamento" (default 1 = uy).
                        Se uy > 0 sul nodo, la molla si stacca.
    """

    def __init__(self, model: FEAModel,
                 max_iterations: int = 20,
                 uplift_axis: int = 1):
        self.model = copy.deepcopy(model)
        self.max_iterations = max_iterations
        self.uplift_axis = uplift_axis

    def solve(self, progress_cb=None) -> UnilateralResults:
        t0 = time.time()
        # ID delle molle che sono unilaterali (tutte attive all'inizio)
        unilateral_ids = _unilateral_constraints(self.model)
        if not unilateral_ids:
            # Nessun unilaterale → solve normale
            r = StaticSolver(self.model).solve()
            return UnilateralResults(
                static=r, n_iterations=1, detached_springs=[],
                solve_time_ms=(time.time() - t0) * 1000.0,
            )

        detached: set[int] = set()
        last_static: StaticResults | None = None
        converged = False

        for it in range(1, self.max_iterations + 1):
            if progress_cb:
                progress_cb(it / self.max_iterations,
                            f"iterazione {it}, staccate: {len(detached)}")
            # Costruisci modello con le molle "staccate" rese inattive
            # (semplicemente cambiando il loro tipo a SPRING con spring_k=[0,...,0])
            m_iter = copy.deepcopy(self.model)
            for c in m_iter.constraints:
                if c.id in detached:
                    c.spring_k = [0.0] * 6
            r = StaticSolver(m_iter).solve()
            last_static = r

            # Determina quali molle dovrebbero essere staccate
            disp_by_node = {d.node_id: d for d in r.displacements}
            new_detached = set()
            still_active = set()
            for c in self.model.constraints:
                if c.id not in unilateral_ids:
                    continue
                disp = disp_by_node.get(c.node_id)
                if disp is None:
                    continue
                # uy positiva = sollevamento → molla in trazione → stacca
                u_axis = (
                    disp.ux if self.uplift_axis == 0
                    else disp.uy if self.uplift_axis == 1
                    else disp.uz
                )
                if u_axis > 1e-9:
                    new_detached.add(c.id)
                else:
                    still_active.add(c.id)

            if new_detached == detached:
                converged = True
                break
            detached = new_detached

        return UnilateralResults(
            static=last_static, n_iterations=it,
            detached_springs=sorted(detached),
            converged=converged,
            solve_time_ms=(time.time() - t0) * 1000.0,
        )
