"""
Diagnostic v2.4.5 Phase 1 · MITC K_shear convention vs Q4

Confronta:
1. D_s scalar (Reissner-Mindlin shear modulus * k_s * t)
2. Convenzione B_s DOF indices / signs fra Q4 e MITC

Hypothesis brief v2.4.5:
  A. k_s = 5/6 mancante in D_s → SCALING_BUG
  B. Tying point coefficients con segno errato → SIGN_BUG
  C. Scaling t vs t^3 sbagliato → DIMENSIONAL_BUG
  D. Sign convention mismatch Bs vs Bb → CONVENTION_BUG

Strategia: stampare D_s del codice + righe Bs di Q4 e MITC + verifica
empirica K_shear MITC vs Q4 su quad piatto 1x1.
"""
from __future__ import annotations
import os
import sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))

import numpy as np

from core.elements.shell_quad4 import ShellQuad4
from core.elements.shell_quad4_mitc import ShellQuad4MITC


def main() -> None:
    print("=" * 80)
    print("MITC K_shear diagnostic — v2.4.5 Phase 1")
    print("=" * 80)

    # ── parametri test ──────────────────────────────────────────────────────
    E = 210e9
    nu = 0.3
    t = 0.1            # thickness
    G = E / (2 * (1 + nu))
    k_s = 5.0 / 6.0

    print(f"\nE  = {E:.3e} Pa")
    print(f"nu = {nu}")
    print(f"t  = {t} m")
    print(f"G  = E / [2(1+nu)]  = {G:.3e} Pa")
    print(f"k_s (Reissner shear correction) = 5/6 = {k_s:.5f}")
    print(f"D_s diagonal atteso (Reissner) = G·k_s·t = {G * k_s * t:.3e} Pa·m")
    print(f"D_s diagonal SENZA k_s         = G·t     = {G * t:.3e} Pa·m")

    # ── ispezione D_s scalar nei due file ────────────────────────────────────
    # Quad piatto 1x1 m, piano xy globale
    coords = [
        np.array([0.0, 0.0, 0.0]),
        np.array([1.0, 0.0, 0.0]),
        np.array([1.0, 1.0, 0.0]),
        np.array([0.0, 1.0, 0.0]),
    ]
    q4 = ShellQuad4(coords, E=E, nu=nu, t=t)
    mitc = ShellQuad4MITC(coords, E=E, nu=nu, t=t)

    print("\n" + "-" * 80)
    print("D_s scalar (riga 88 Q4, riga 141 MITC):")
    print("  Q4   : (5.0/6.0) * E * t / (2 * (1 + nu)) = "
          f"{(5.0/6.0) * E * t / (2 * (1 + nu)):.3e}")
    print("  MITC : (5.0/6.0) * E * t / (2 * (1 + nu)) = "
          f"{(5.0/6.0) * E * t / (2 * (1 + nu)):.3e}")
    print("  → SCENARIO A escluso (k_s presente in entrambi)")

    # ── B_s convention check via probe vector ─────────────────────────────────
    # Costruisco vettore probe locale: w=0 ovunque, ry=1 ovunque (rotazione
    # costante intorno asse y, no curvatura, no shear se DOF==θ_y).
    print("\n" + "-" * 80)
    print("Test convention check · probe ry=1 (constant), w=0, rx=0")
    print("  Atteso fisica Mindlin Bathe §5.4 con γ_xz = ∂w/∂x - θ_y:")
    print("    γ_xz = 0 - 1 = -1 in ogni Gauss point")
    print()

    # Costruisco vettore u_local 24 con solo ry=1 su tutti i 4 nodi
    # DOF layout per nodo: (u, v, w, rx, ry, rz) indici (0,1,2,3,4,5)
    u_loc_24 = np.zeros(24)
    for i in range(4):
        u_loc_24[6 * i + 4] = 1.0   # ry = 1

    # Estrai 12-DOF bending block (w, rx, ry per nodo)
    u_bend_12 = np.zeros(12)
    for i in range(4):
        u_bend_12[3 * i + 0] = u_loc_24[6 * i + 2]   # w
        u_bend_12[3 * i + 1] = u_loc_24[6 * i + 3]   # rx
        u_bend_12[3 * i + 2] = u_loc_24[6 * i + 4]   # ry

    # ── Q4 _Bs implicit (in _bending_stiffness loop) — replico inline ─────────
    # Q4 Bs:
    #   Bs[0, 3*i]     = dN[0]       γ_xz part 1: ∂w/∂x
    #   Bs[0, 3*i + 1] = -N[i]       γ_xz part 2: -DOF idx 1
    #   Bs[1, 3*i]     = dN[1]       γ_yz part 1: ∂w/∂y
    #   Bs[1, 3*i + 2] = -N[i]       γ_yz part 2: -DOF idx 2
    print("Convention Q4 (riga 105-108 di shell_quad4.py):")
    print("  γ_xz = ∂w/∂x - (DOF idx 1)   ← idx 1 trattato come θ_y/Mindlin")
    print("  γ_yz = ∂w/∂y - (DOF idx 2)   ← idx 2 trattato come θ_x/Mindlin")

    # MITC _Bs_at:
    #   Bs[0, 3*i]     = dN[0]       γ_xz part 1: ∂w/∂x
    #   Bs[0, 3*i + 2] = +N[i]       γ_xz part 2: +DOF idx 2
    #   Bs[1, 3*i]     = dN[1]       γ_yz part 1: ∂w/∂y
    #   Bs[1, 3*i + 1] = -N[i]       γ_yz part 2: -DOF idx 1
    print()
    print("Convention MITC (riga 126-129 di shell_quad4_mitc.py):")
    print("  γ_xz = ∂w/∂x + (DOF idx 2)   ← idx 2 con segno opposto a Q4!")
    print("  γ_yz = ∂w/∂y - (DOF idx 1)   ← idx 1 invece di idx 2!")

    # ── Calcolo numerico: K_shear di MITC vs Q4 con probe vector ─────────────
    print("\n" + "-" * 80)
    print("Test numerico: contributo K_shear @ DOF ry,ry tramite probe ry=1")
    print("  Se MITC è coerente con Q4 → energy similar")
    print("  Se MITC ha sign flip → energy può essere identica (quadratica)")
    print("  ma il SEGNO del moment di reaction sarà invertito")
    print()

    K_q4 = q4._bending_stiffness()
    K_mitc = mitc._bending_stiffness()

    # Energy = 0.5 * u^T K u  (no membrane part, only bending block 12x12)
    E_q4 = 0.5 * u_bend_12 @ K_q4 @ u_bend_12
    E_mitc = 0.5 * u_bend_12 @ K_mitc @ u_bend_12
    print(f"  Q4   energy con probe ry=1: {E_q4:.4e} J")
    print(f"  MITC energy con probe ry=1: {E_mitc:.4e} J")
    print(f"  Ratio MITC/Q4: {E_mitc/E_q4 if E_q4!=0 else float('inf'):.3f}")

    # Probe complementare: rx=1 constant
    u_bend_12_rx = np.zeros(12)
    for i in range(4):
        u_bend_12_rx[3 * i + 1] = 1.0
    E_q4_rx = 0.5 * u_bend_12_rx @ K_q4 @ u_bend_12_rx
    E_mitc_rx = 0.5 * u_bend_12_rx @ K_mitc @ u_bend_12_rx
    print(f"  Q4   energy con probe rx=1: {E_q4_rx:.4e} J")
    print(f"  MITC energy con probe rx=1: {E_mitc_rx:.4e} J")
    print(f"  Ratio MITC/Q4: {E_mitc_rx/E_q4_rx if E_q4_rx!=0 else float('inf'):.3f}")

    # ── Reaction moment per probe w_linear ──────────────────────────────────
    # Applichiamo w(x) = x lineare, derivata costante ∂w/∂x = 1
    # Atteso (rigid body): γ_xz = ∂w/∂x - θ_y. Se θ_y libero=0 → γ_xz = 1
    # Atteso (no rotation): K@u dà reaction = G·k_s·t · γ_xz²/2 = ...
    print("\n" + "-" * 80)
    print("Test reaction direction · probe w(x)=x lineare, rx=ry=0")
    print("  Atteso: shear γ_xz = ∂w/∂x = +1, energy positiva grande")
    print("  Reaction sui DOF: forza in direzione che 'risale' contro γ_xz")
    print()

    u_bend_lin_w = np.zeros(12)
    # w al nodo i = x_i
    for i, c in enumerate(coords):
        u_bend_lin_w[3 * i + 0] = float(c[0])   # w = x
    f_q4 = K_q4 @ u_bend_lin_w
    f_mitc = K_mitc @ u_bend_lin_w

    print("  Q4 force vector (3 DOF per nodo: f_w, M_rx, M_ry):")
    for i in range(4):
        print(f"    nodo {i}: f_w={f_q4[3*i+0]:+.3e}  M_rx={f_q4[3*i+1]:+.3e}  "
              f"M_ry={f_q4[3*i+2]:+.3e}")

    print("\n  MITC force vector:")
    for i in range(4):
        print(f"    nodo {i}: f_w={f_mitc[3*i+0]:+.3e}  M_rx={f_mitc[3*i+1]:+.3e}  "
              f"M_ry={f_mitc[3*i+2]:+.3e}")

    print()
    print("INTERPRETAZIONE:")
    print("  Se in MITC il M_ry ha segno OPPOSTO a Q4 ai nodi sx (x=0) o dx (x=1),")
    print("  → conferma sign flip in γ_xz (Scenario D)")
    print("  Se M_ry MITC è ~0 dove Q4 è ~K·1 → conferma DOF swap (Bs uses idx 2 instead of idx 1)")
    print()

    # ── verdict ──────────────────────────────────────────────────────────────
    print("=" * 80)
    print("VERDETTO")
    print("=" * 80)
    print()
    print("Da ispezione codice (Phase 1.1):")
    print("  - Scenario A (k_s mancante): ESCLUSO. k_s = 5/6 presente in entrambi.")
    print("  - Scenario C (t vs t^3): ESCLUSO. K_shear in entrambi usa t lineare, K_bend usa t^3.")
    print("  - Scenario B (tying sign): CONFERMATO ricorsivamente — `_Bs_at` ha sign + ")
    print("                              su γ_xz, ed è usata per costruire Bs ai tying points.")
    print("  - Scenario D (convention DOF/sign): CONFERMATO. MITC _Bs_at:")
    print("                * γ_xz usa idx 2 (Q4 usa idx 1)")
    print("                * γ_xz usa segno + (Q4 usa segno -)")
    print("                * γ_yz usa idx 1 (Q4 usa idx 2)")
    print("                * γ_yz usa segno - (= Q4)")
    print()
    print("ROOT CAUSE: MITC _Bs_at convention DOF swap (idx 1 ↔ idx 2) + sign flip su γ_xz.")
    print()
    print("FIX (Phase 2): rendere MITC _Bs_at coerente con Q4 (Mindlin Bathe §5.4):")
    print("  Bs[0, 3*i + 1] = -N[i]    # γ_xz = ∂w/∂x - (DOF idx 1)   ← era idx 2 +")
    print("  Bs[1, 3*i + 2] = -N[i]    # γ_yz = ∂w/∂y - (DOF idx 2)   ← era idx 1 -")


if __name__ == "__main__":
    main()
