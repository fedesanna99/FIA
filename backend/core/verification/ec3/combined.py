"""
Verifiche di sezione combinate N+M e N+M+V secondo EN 1993-1-1 §6.2.

§6.2.9 Flessione + sforzo normale (sezione):
    Per Classi 1/2 e profili a doppio T (6.36, 6.39):
        M_N,Rd = M_pl,Rd · (1 - n) / (1 - 0.5·a)
            con n = N_Ed / N_pl,Rd, a = (A - 2·b·tf) / A ≤ 0.5

    Per Classe 3 (formula 6.42 — lineare):
        σ_x = N_Ed/A + M_Ed/W_el ≤ f_y / γ_M0

§6.2.10 Interazione con taglio:
    Se V_Ed ≤ 0.5 V_pl,Rd → nessuna riduzione.
    Se V_Ed > 0.5 V_pl,Rd → riduzione f_y → (1-ρ)·f_y nell'anima, con
        ρ = (2·V_Ed/V_pl,Rd − 1)²

Verifica unitaria (utilization ratio):
    U.R. = max(N_Ed/N_t,Rd o N_c,Rd,  M_Ed/M_c,Rd,  V_Ed/V_pl,Rd, combinato)
    Convenzione: il modello è verificato se U.R. ≤ 1.0.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

from .section_classification import SectionClass


@dataclass(frozen=True)
class CombinedResult:
    UR: float                   # utilization ratio (≤1 OK)
    UR_N: float
    UR_M: float
    UR_V: float
    UR_NM: float                # interazione N+M
    governing: str              # quale verifica governa (N, M, V, N+M)
    rho_shear: float = 0.0      # fattore di riduzione per taglio elevato
    notes: str = ""


def combined_NM(
    N_Ed: float, M_Ed: float,
    N_Rd: float, M_Rd: float,
    section_class: SectionClass,
    A: float = 0.0, b: float = 0.0, tf: float = 0.0,
    M_N_Rd: Optional[float] = None,
) -> CombinedResult:
    """Verifica N+M monoassiale.

    Args:
        N_Ed, M_Ed   : forze di calcolo (N positivo = trazione/compressione,
                       il segno non influisce, valori in modulo)
        N_Rd, M_Rd   : resistenze (N_t,Rd o N_c,Rd a seconda del segno)
        section_class: classe sezione (1/2 → 6.36, 3 → 6.42)
        A, b, tf     : dimensioni geometriche per formula (6.36) — solo Cl. 1/2
        M_N_Rd       : se fornito, lo si usa direttamente saltando il calcolo
    """
    if N_Rd <= 0 or M_Rd <= 0:
        raise ValueError("Resistenze N_Rd, M_Rd devono essere positive")
    N_Ed = abs(N_Ed)
    M_Ed = abs(M_Ed)
    UR_N = N_Ed / N_Rd
    UR_M = M_Ed / M_Rd

    if section_class in (SectionClass.CLASS_1, SectionClass.CLASS_2):
        # M_N,Rd da EN 1993-1-1 (6.36) per profili I/H, asse forte:
        #   M_N,y,Rd = M_pl,y,Rd · (1-n) / (1-0.5·a),  ma ≤ M_pl,y,Rd
        # con n = N_Ed/N_pl,Rd e a = (A - 2·b·tf)/A ≤ 0.5
        if M_N_Rd is None and A > 0 and b > 0 and tf > 0:
            n = UR_N
            a = min((A - 2 * b * tf) / A, 0.5)
            M_N_Rd = min(M_Rd * (1 - n) / (1 - 0.5 * a), M_Rd) if n < 1.0 else 0.0
            M_N_Rd = max(0.0, M_N_Rd)
        elif M_N_Rd is None:
            # fallback lineare conservativo se mancano le info geometriche
            M_N_Rd = M_Rd * max(0.0, 1.0 - UR_N)
        UR_NM = M_Ed / M_N_Rd if M_N_Rd > 0 else float("inf")
    else:
        # Classe 3 o 4: somma lineare (6.42)
        UR_NM = UR_N + UR_M

    UR = max(UR_N, UR_M, UR_NM)
    if UR == UR_NM:
        gov = "N+M"
    elif UR == UR_M:
        gov = "M"
    else:
        gov = "N"
    return CombinedResult(
        UR=UR, UR_N=UR_N, UR_M=UR_M, UR_V=0.0, UR_NM=UR_NM,
        governing=gov,
    )


def combined_NMV(
    N_Ed: float, M_Ed: float, V_Ed: float,
    N_Rd: float, M_Rd: float, V_Rd: float,
    section_class: SectionClass,
    A: float = 0.0, b: float = 0.0, tf: float = 0.0,
) -> CombinedResult:
    """Verifica N+M+V con riduzione M se V_Ed > 0.5·V_pl,Rd.

    EN 1993-1-1 §6.2.10: se V_Ed > 0.5 V_pl,Rd, ridurre M_Rd con
        ρ = (2·V_Ed/V_pl,Rd − 1)²
    moltiplicato sulla parte dell'anima soggetta a flessione.
    Implementazione semplificata: riduzione applicata all'intero M_Rd.
    """
    if V_Rd <= 0:
        raise ValueError("V_Rd deve essere positivo")
    UR_V = abs(V_Ed) / V_Rd
    rho = 0.0
    M_Rd_reduced = M_Rd
    if UR_V > 0.5:
        rho = (2 * UR_V - 1) ** 2
        M_Rd_reduced = (1 - rho) * M_Rd
    if M_Rd_reduced <= 0:
        # taglio troppo elevato — segnala U.R. saturato
        return CombinedResult(
            UR=float("inf"), UR_N=abs(N_Ed)/N_Rd, UR_M=float("inf"),
            UR_V=UR_V, UR_NM=float("inf"),
            governing="V", rho_shear=rho,
            notes="V_Ed eccessivo: M_Rd ridotto a zero",
        )
    res_NM = combined_NM(
        N_Ed=N_Ed, M_Ed=M_Ed,
        N_Rd=N_Rd, M_Rd=M_Rd_reduced,
        section_class=section_class,
        A=A, b=b, tf=tf,
    )
    UR_total = max(res_NM.UR, UR_V)
    governing = "V" if UR_V > res_NM.UR else res_NM.governing
    return CombinedResult(
        UR=UR_total, UR_N=res_NM.UR_N, UR_M=res_NM.UR_M,
        UR_V=UR_V, UR_NM=res_NM.UR_NM,
        governing=governing, rho_shear=rho,
        notes=f"ρ_shear={rho:.3f}",
    )
