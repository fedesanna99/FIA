"""
Solver-level exceptions.

Sollevate quando il solver rileva condizioni numericamente invalide
(matrice singolare, NaN/Inf nei risultati, struttura labile).
"""
from __future__ import annotations


class SolverError(Exception):
    """Base class per errori del solver."""


class SingularMatrixError(SolverError):
    """
    Matrice di rigidezza singolare o quasi-singolare.

    Cause comuni:
    - Struttura sottovincolata (mancano vincoli sufficienti)
    - Meccanismo (corpi rigidi liberi di muoversi)
    - Elementi degeneri (lunghezza nulla, area zero, materiale con E≈0)

    Attributes:
        cause: identificativo causale ("rank_deficient",
               "nan_in_solution", "huge_displacement", ...)
        n_free_dofs: numero di DOF liberi nel sistema (None se non noto)
        condition_estimate: stima del numero di condizionamento o magnitude
                            spostamenti (None se non calcolato)
        message_it: messaggio in italiano per l'utente finale
    """

    def __init__(
        self,
        cause: str,
        n_free_dofs: int | None = None,
        condition_estimate: float | None = None,
    ) -> None:
        self.cause = cause
        self.n_free_dofs = n_free_dofs
        self.condition_estimate = condition_estimate

        # Messaggio italiano user-facing
        suggestions: list[str] = []
        if cause == "rank_deficient":
            suggestions.append("Verifica che la struttura abbia vincoli sufficienti")
            suggestions.append("Controlla che non ci siano corpi rigidi liberi")
        elif cause == "nan_in_solution":
            suggestions.append("Soluzione contiene NaN — la matrice K è probabilmente singolare")
            suggestions.append("Verifica vincoli e proprietà materiali (E, A, I devono essere > 0)")
        elif cause == "huge_displacement":
            suggestions.append("Spostamenti irrealistici (> 10⁶ m) — probabile meccanismo")
            suggestions.append("La struttura potrebbe essere labile: aggiungi vincoli")
        else:
            suggestions.append("Verifica vincoli, materiali e geometria")

        self.message_it = (
            f"Sistema non risolvibile: {cause}. "
            f"Suggerimenti: {' · '.join(suggestions)}"
        )

        super().__init__(self.message_it)


class NumericalInstabilityError(SolverError):
    """
    Risultati numericamente instabili (Inf, NaN dopo solve).

    Distinta da SingularMatrixError perché qui il solve è completato senza
    crash di scipy, ma il risultato contiene valori non finiti.
    """

    def __init__(self, location: str, n_invalid: int) -> None:
        self.location = location
        self.n_invalid = n_invalid
        self.message_it = (
            f"Instabilità numerica: trovati {n_invalid} valori NaN/Inf in {location}. "
            "Possibile causa: matrice mal condizionata o vincoli insufficienti."
        )
        super().__init__(self.message_it)
