"""
Taglio in elementi in CA — EN 1992-1-1 §6.2.

Procedura:
    V_Rd,c  : resistenza senza armatura a taglio (cls solo)        (6.2)
    V_Rd,s  : resistenza con staffe verticali, modello truss        (6.8)
    V_Rd,max: limite superiore (rottura bielle)                     (6.9)

Formula V_Rd,c (EN 1992-1-1 6.2a):
    V_Rd,c = [C_Rd,c · k · (100 · ρ_l · f_ck)^(1/3)  + k_1 · σ_cp] · b_w · d
    ≥ (v_min + k_1 · σ_cp) · b_w · d

Con:
    C_Rd,c = 0.18 / γ_C
    k = 1 + √(200/d)   ≤ 2.0     (d in mm)
    ρ_l = A_sl / (b_w · d)        ≤ 0.02
    k_1 = 0.15
    v_min = 0.035 · k^(3/2) · √f_ck

Formula V_Rd,s (staffe verticali):
    V_Rd,s = (A_sw / s) · z · f_ywd · cot(θ)
con z ≈ 0.9·d, cot(θ) tipicamente tra 1.0 e 2.5 (default 2.5 lato sicurezza).

V_Rd,max (compressione delle bielle):
    V_Rd,max = α_cw · b_w · z · ν1 · f_cd · cot(θ) / (1 + cot²(θ))
con ν1 = 0.6 · (1 - f_ck/250) [MPa].
"""
from __future__ import annotations
from dataclasses import dataclass
import math

GAMMA_C = 1.5
GAMMA_S = 1.15


@dataclass(frozen=True)
class ShearResult:
    V_Rd: float            # [N] valore di calcolo (governante)
    V_Rd_c: float          # senza staffe
    V_Rd_s: float          # con staffe (se presenti)
    V_Rd_max: float        # limite bielle
    needs_stirrups: bool   # True se richieste strutturalmente
                           # (V_Ed > V_Rd_c quando V_Ed noto,
                           #  altrimenti fallback legacy se A_sw > 0)
    notes: str = ""
    # v2.4.1: campi opzionali valorizzati quando V_Ed è passato.
    # Restano None per i caller capacity-side (es. test esistenti).
    UR: float | None = None       # utilization ratio = V_Ed / V_Rd
    V_Ed: float | None = None     # taglio sollecitante applicato [N]


def V_Rd_c(
    b_w: float, d: float, A_sl: float,
    fck: float, sigma_cp: float = 0.0,
    gamma_C: float = GAMMA_C,
) -> float:
    """Resistenza a taglio senza staffe (cls non fessurato) — formula 6.2a.

    Args:
        b_w     : larghezza dell'anima [m]
        d       : altezza utile [m]
        A_sl    : area armatura tesa longitudinale [m²]
        fck     : f_ck [Pa]
        sigma_cp: tensione di compressione media (positiva se compressione) [Pa]

    Returns:
        V_Rd,c [N]
    """
    if min(b_w, d, A_sl, fck) <= 0:
        raise ValueError("b_w, d, A_sl, fck devono essere positivi")

    C_Rd_c = 0.18 / gamma_C
    d_mm = d * 1000.0
    k = min(1 + math.sqrt(200.0 / d_mm), 2.0)
    rho_l = min(A_sl / (b_w * d), 0.02)
    fck_MPa = fck / 1e6
    k_1 = 0.15
    v_min = 0.035 * k ** 1.5 * math.sqrt(fck_MPa)  # in MPa

    # Termine principale (in MPa)
    term_main = C_Rd_c * k * (100.0 * rho_l * fck_MPa) ** (1.0 / 3.0)
    term_compr = k_1 * sigma_cp / 1e6  # in MPa
    v_calc = term_main + term_compr
    v_min_full = v_min + term_compr

    v_Rd_c_MPa = max(v_calc, v_min_full)
    return v_Rd_c_MPa * 1e6 * b_w * d  # N


def V_Rd_s(
    b_w: float, d: float,
    A_sw: float, s: float,
    fywk: float,
    cot_theta: float = 2.5,
    gamma_S: float = GAMMA_S,
) -> float:
    """Resistenza a taglio con staffe verticali — formula 6.8.

    Args:
        b_w       : larghezza anima [m]
        d         : altezza utile [m]
        A_sw      : area di una sezione di staffa (es. 2·A_φ8 = 2·π·φ²/4) [m²]
        s         : passo staffe [m]
        fywk      : f_yk acciaio staffe [Pa]
        cot_theta : cotangente dell'inclinazione delle bielle (1.0 ÷ 2.5)
    """
    if min(b_w, d, A_sw, s, fywk) <= 0:
        raise ValueError("Tutti i parametri devono essere positivi")
    if not 1.0 <= cot_theta <= 2.5:
        raise ValueError("cot(θ) deve essere fra 1.0 e 2.5")
    z = 0.9 * d
    fywd = fywk / gamma_S
    return (A_sw / s) * z * fywd * cot_theta


def V_Rd_max(
    b_w: float, d: float, fck: float,
    cot_theta: float = 2.5,
    alpha_cw: float = 1.0,
    gamma_C: float = GAMMA_C,
) -> float:
    """Limite di rottura bielle compresse — formula 6.9.

        V_Rd,max = α_cw · b_w · z · ν1 · f_cd · cot(θ) / (1 + cot²(θ))
    """
    if min(b_w, d, fck) <= 0:
        raise ValueError("b_w, d, fck devono essere positivi")
    fcd = 0.85 * fck / gamma_C  # con α_cc=0.85 per NTC
    z = 0.9 * d
    fck_MPa = fck / 1e6
    nu1 = 0.6 * (1 - fck_MPa / 250.0)
    return alpha_cw * b_w * z * nu1 * fcd * cot_theta / (1.0 + cot_theta ** 2)


def shear_check(
    b_w: float, d: float, A_sl: float, fck: float,
    A_sw: float = 0.0, s: float = 1.0, fywk: float = 450e6,
    cot_theta: float = 2.5,
    sigma_cp: float = 0.0,
    V_Ed: float | None = None,
) -> ShearResult:
    """Verifica taglio completa (con o senza staffe).

    Args:
        b_w, d, A_sl, fck, sigma_cp: vedi ``V_Rd_c`` (EN 1992-1-1 §6.2.2).
        A_sw, s, fywk, cot_theta: vedi ``V_Rd_s`` / ``V_Rd_max`` (§6.2.3).
        V_Ed: sollecitazione di taglio applicata [N]. Quando passato,
            ``needs_stirrups`` viene determinato strutturalmente come
            ``V_Ed > V_Rd_c``. Quando ``None`` (default), si ricade sul
            comportamento legacy (``A_sw > 0``) — usato solo dai test
            capacity-side che non hanno V_Ed.

    Returns:
        ShearResult con ``UR`` e ``V_Ed`` valorizzati se V_Ed è stato passato,
        altrimenti ``None``.

    Note:
        Bug #6 fix (audit v2.3.5): prima ``needs_stirrups = (A_sw > 0)``
        diceva solo "ho modellato staffe?" anche con V_Ed > V_Rd_c. Ora
        risponde correttamente "servono staffe per equilibrio?".
    """
    Vc = V_Rd_c(b_w=b_w, d=d, A_sl=A_sl, fck=fck, sigma_cp=sigma_cp)
    Vmax = V_Rd_max(b_w=b_w, d=d, fck=fck, cot_theta=cot_theta)
    if A_sw > 0:
        Vs = V_Rd_s(b_w=b_w, d=d, A_sw=A_sw, s=s, fywk=fywk, cot_theta=cot_theta)
        # con staffe, V_Rd governato dal minimo fra V_Rd,s e V_Rd,max
        V_Rd = min(Vs, Vmax)
    else:
        Vs = 0.0
        V_Rd = Vc

    # Logica needs_stirrups (v2.4.1 fix bug #6):
    #   - se V_Ed noto (caso reale via API): semantica strutturale
    #     "servono staffe per equilibrio?" = V_Ed > V_Rd_c
    #   - se V_Ed=None (test capacity-side legacy): fallback "ho staffe?"
    if V_Ed is not None:
        needs = V_Ed > Vc
        # Edge case V_Rd=0: in pratica V_Rd_c ha sempre v_min>0,
        # ma protezione difensiva contro ZeroDivisionError.
        UR = V_Ed / V_Rd if V_Rd > 0 else float("inf")
    else:
        needs = A_sw > 0
        UR = None

    return ShearResult(
        V_Rd=V_Rd, V_Rd_c=Vc, V_Rd_s=Vs, V_Rd_max=Vmax,
        needs_stirrups=needs,
        notes=f"cot(θ)={cot_theta}",
        UR=UR,
        V_Ed=V_Ed,
    )
