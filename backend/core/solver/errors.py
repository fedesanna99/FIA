"""
Solver-level exceptions + safe wrapper per scipy spsolve.

Sollevate quando il solver rileva condizioni numericamente invalide
(matrice singolare, NaN/Inf nei risultati, struttura labile).
"""
from __future__ import annotations

import warnings

import numpy as np
import scipy.sparse.linalg as spla
from scipy.sparse import csc_matrix
from scipy.sparse.linalg import MatrixRankWarning


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


# === safe_spsolve helper · v2.4.0bis-safe-spsolve-extend =====================

# Soglia oltre cui consideriamo che siamo davanti a un meccanismo silente.
# 10^6 m = 1000 km. Nessuna struttura civile reale supera questo limite,
# nemmeno modelli cable molto stretchy. Scelta volutamente conservativa
# per evitare falsi positivi su problemi geometricamente non-lineari.
MAX_REASONABLE_DISPLACEMENT_M = 1.0e6


def safe_spsolve(
    K_ff,
    F_f,
    *,
    n_free_dofs: int | None = None,
    context: str = "solve",
    check_magnitude: bool = True,
):
    """
    Wrapper sicuro attorno a scipy.sparse.linalg.spsolve.

    Cattura matrici singolari, NaN, Inf, spostamenti irrealistici e solleva
    SingularMatrixError o NumericalInstabilityError invece di restituire
    silenziosamente risultati invalidi.

    Args:
        K_ff: matrice di rigidezza ridotta (sparse, deve essere CSC o convertibile)
        F_f: vettore forze ridotto
        n_free_dofs: dimensione attesa di u_free (per messaggi diagnostici).
            Se None, derivato da K_ff.shape[0].
        context: stringa che descrive il contesto di chiamata
            (es. "static", "arclength_predictor", "newmark_step_42").
            Usata SOLO per debug e logging, non per controllo flow.
        check_magnitude: se True (default), solleva SingularMatrixError
            quando max|u_free| > 10^6 m. Disabilitabile in casi speciali
            (es. soluzioni intermedie arc-length dove valori grandi
            sono fisiologici e già normalizzati upstream).

    Returns:
        u_free: vettore soluzione (numpy array), garantito finito e
        ragionevole in magnitudine se check_magnitude=True.

    Raises:
        SingularMatrixError: con cause in {rank_deficient, nan_in_solution,
            huge_displacement}.
        NumericalInstabilityError: se Inf appare nella soluzione.

    Note:
        - Se K_ff ha shape (0, 0), restituisce array vuoto senza errori
          (caso degenere: tutti i DOF vincolati).
        - Non converte K_ff a CSC se è già CSC: rispetta input.
    """
    if K_ff.shape[0] == 0:
        return np.array([], dtype=float)

    if n_free_dofs is None:
        n_free_dofs = int(K_ff.shape[0])

    # Assicura formato CSC per spsolve (idempotente se già CSC)
    if not isinstance(K_ff, csc_matrix):
        K_ff_csc = K_ff.tocsc()
    else:
        K_ff_csc = K_ff

    # 1. Solve protetto: cattura MatrixRankWarning come eccezione
    with warnings.catch_warnings():
        warnings.simplefilter("error", MatrixRankWarning)
        try:
            u_free = spla.spsolve(K_ff_csc, F_f)
        except MatrixRankWarning:
            raise SingularMatrixError(
                cause="rank_deficient",
                n_free_dofs=n_free_dofs,
            ) from None
        except RuntimeError as e:
            # scipy a volte solleva RuntimeError invece di warning su matrici
            # severamente singolari
            raise SingularMatrixError(
                cause="rank_deficient",
                n_free_dofs=n_free_dofs,
            ) from e

    # spsolve di scalare restituisce scalare invece di array; normalizza
    u_free = np.atleast_1d(u_free)

    # 2. Check NaN/Inf nel risultato
    if not np.all(np.isfinite(u_free)):
        n_invalid = int(np.sum(~np.isfinite(u_free)))
        # Se ci sono Inf (non NaN), è instabilità numerica più che singolarità
        if np.any(np.isinf(u_free)):
            raise NumericalInstabilityError(
                location=f"safe_spsolve output ({context})",
                n_invalid=n_invalid,
            )
        # Altrimenti NaN → matrice singolare
        raise SingularMatrixError(
            cause="nan_in_solution",
            n_free_dofs=n_free_dofs,
        )

    # 3. Check magnitude: spostamenti irrealistici (meccanismo silente)
    if check_magnitude:
        max_abs = float(np.max(np.abs(u_free)))
        if max_abs > MAX_REASONABLE_DISPLACEMENT_M:
            raise SingularMatrixError(
                cause="huge_displacement",
                n_free_dofs=n_free_dofs,
                condition_estimate=max_abs,
            )

    return u_free
