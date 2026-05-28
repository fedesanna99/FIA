"""Elemento trave 2D Euler-Bernoulli con 3 GdL per nodo (u, v, θ)."""
import numpy as np

DOFS_PER_NODE = 3
NODES_PER_ELEMENT = 2


def _condensate_releases(K: np.ndarray, releases: list[int]) -> np.ndarray:
    """Condensazione statica dei dof rilasciati (release di momento ecc.).

    Per i dof k in releases, si annulla la rigidezza condensando staticamente:
    K_aa_new = K_aa - K_ar · K_rr^{-1} · K_ra

    Restituisce una matrice della stessa dimensione, con riga/colonna nulle
    per i dof rilasciati (così l'assemblaggio non vede contributo da quei dof).
    """
    rel = sorted(set(int(r) for r in releases if 0 <= int(r) < K.shape[0]))
    if not rel:
        return K
    n = K.shape[0]
    keep = [i for i in range(n) if i not in set(rel)]
    K_aa = K[np.ix_(keep, keep)]
    K_ar = K[np.ix_(keep, rel)]
    K_ra = K[np.ix_(rel, keep)]
    K_rr = K[np.ix_(rel, rel)]
    try:
        K_rr_inv = np.linalg.inv(K_rr)
    except np.linalg.LinAlgError:
        return K
    K_condensed_small = K_aa - K_ar @ K_rr_inv @ K_ra
    out = K.copy()
    out[np.ix_(keep, keep)] = K_condensed_small
    for r in rel:
        out[r, :] = 0.0
        out[:, r] = 0.0
    return out


class Beam2D:
    """Trave 2D nel piano XY.

    GdL per nodo: u (asse X locale), v (asse Y locale), θz (rotazione).
    Stiffness combina componente assiale (truss) + componente flessionale (Euler-Bernoulli).
    """

    def __init__(self, n1: np.ndarray, n2: np.ndarray, E: float, A: float, I: float, rho: float = 0.0):
        self.n1 = np.array(n1, dtype=float)[:2]
        self.n2 = np.array(n2, dtype=float)[:2]
        self.E = float(E)
        self.A = float(A)
        self.I = float(I)
        self.rho = float(rho)
        dx, dy = self.n2 - self.n1
        self.L = float(np.hypot(dx, dy))
        if self.L == 0:
            # v3.3.0 audit-fix L4-P0-4: messaggio user-friendly con context
            # (element id non disponibile qui ma il GlobalAssembler lo aggiunge).
            # routes/analysis.py traduce ValueError → 422 con detail.
            raise ValueError(
                "Elemento beam2d con lunghezza nulla: i due nodi coincidono. "
                "Controllare le coordinate dei nodi."
            )
        self.cos = dx / self.L
        self.sin = dy / self.L

    def local_stiffness(self) -> np.ndarray:
        E, A, I, L = self.E, self.A, self.I, self.L
        EA_L = E * A / L
        EI = E * I
        L2, L3 = L * L, L * L * L
        k = np.array([
            [ EA_L,           0,          0, -EA_L,           0,          0],
            [    0,  12 * EI / L3,  6 * EI / L2,     0, -12 * EI / L3,  6 * EI / L2],
            [    0,   6 * EI / L2,  4 * EI / L,      0,  -6 * EI / L2,  2 * EI / L ],
            [-EA_L,           0,          0,  EA_L,           0,          0],
            [    0, -12 * EI / L3, -6 * EI / L2,     0,  12 * EI / L3, -6 * EI / L2],
            [    0,   6 * EI / L2,  2 * EI / L,      0,  -6 * EI / L2,  4 * EI / L ],
        ], dtype=float)
        return k

    def local_mass_consistent(self) -> np.ndarray:
        rho, A, L = self.rho, self.A, self.L
        m_total = rho * A * L
        if m_total == 0:
            return np.zeros((6, 6))
        factor = m_total / 420.0
        L2 = L * L
        m = factor * np.array([
            [140,    0,      0,  70,    0,      0],
            [  0,  156,   22 * L,   0,   54,  -13 * L],
            [  0, 22 * L, 4 * L2,   0, 13 * L, -3 * L2],
            [ 70,    0,      0, 140,    0,      0],
            [  0,   54,  13 * L,   0,  156,  -22 * L],
            [  0, -13 * L, -3 * L2,  0, -22 * L, 4 * L2],
        ], dtype=float)
        return m

    def transformation_matrix(self) -> np.ndarray:
        c, s = self.cos, self.sin
        T = np.array([
            [ c, s, 0, 0, 0, 0],
            [-s, c, 0, 0, 0, 0],
            [ 0, 0, 1, 0, 0, 0],
            [ 0, 0, 0, c, s, 0],
            [ 0, 0, 0,-s, c, 0],
            [ 0, 0, 0, 0, 0, 1],
        ], dtype=float)
        return T

    def stiffness_global(self, releases: list[int] | None = None,
                         winkler_k: float | None = None) -> np.ndarray:
        T = self.transformation_matrix()
        k_local = self.local_stiffness()
        if winkler_k and winkler_k > 0:
            k_local = k_local + self.local_winkler_stiffness(winkler_k)
        if releases:
            k_local = _condensate_releases(k_local, releases)
        return T.T @ k_local @ T

    def mass_global(self) -> np.ndarray:
        T = self.transformation_matrix()
        m_local = self.local_mass_consistent()
        return T.T @ m_local @ T

    def internal_forces(self, u_global: np.ndarray) -> dict:
        """Calcola N, V, M agli estremi i, j data la deformazione globale del beam."""
        T = self.transformation_matrix()
        u_local = T @ u_global
        f_local = self.local_stiffness() @ u_local
        return {
            "N_i": -f_local[0], "Vy_i": -f_local[1], "Mz_i": -f_local[2],
            "N_j":  f_local[3], "Vy_j":  f_local[4], "Mz_j":  f_local[5],
        }

    def local_winkler_stiffness(self, k_w: float) -> np.ndarray:
        """Matrice di rigidezza Winkler consistent (suolo elastico distribuito).

        Per beam Euler-Bernoulli con k_w costante (N/m²) distribuito lungo
        l'elemento, la matrice di "foundation stiffness" è:

            K_w = ∫_0^L N^T · k_w · N dx

        dove N sono le funzioni di forma cubiche di Hermite. Risultato:

            K_w (4×4 sui DOF trasversali uy/rotz) = k_w·L/420 ·
                [[ 156,  22L,   54,  -13L],
                 [ 22L, 4L²,   13L, -3L²],
                 [  54,  13L,  156, -22L],
                 [-13L, -3L², -22L, 4L²]]

        Espansa a 6×6 con zero sui DOF assiali. Stessa forma della matrice di
        massa consistent (con k_w al posto di ρA).
        """
        if k_w <= 0:
            return np.zeros((6, 6))
        L = self.L
        L2 = L * L
        factor = k_w * L / 420.0
        kw = factor * np.array([
            [0,    0,        0,        0,     0,        0      ],
            [0,  156,    22 * L,      0,    54,   -13 * L     ],
            [0,  22 * L,  4 * L2,     0,   13 * L, -3 * L2    ],
            [0,    0,        0,        0,     0,        0      ],
            [0,   54,   13 * L,      0,   156,   -22 * L     ],
            [0, -13 * L, -3 * L2,    0,  -22 * L,  4 * L2    ],
        ], dtype=float)
        return kw

    def local_geometric_stiffness(self, N: float) -> np.ndarray:
        """Matrice di rigidezza geometrica K_G in coordinate locali.

        Per beam Euler-Bernoulli (interpolazione cubica) con forza assiale N
        (positiva trazione, negativa compressione):

            K_G = (N/L) · [[0, 0,       0,       0, 0,       0      ],
                           [0, 6/5,     L/10,    0, -6/5,    L/10   ],
                           [0, L/10,    2L²/15,  0, -L/10,  -L²/30  ],
                           [0, 0,       0,       0, 0,       0      ],
                           [0, -6/5,   -L/10,    0, 6/5,    -L/10   ],
                           [0, L/10,   -L²/30,   0, -L/10,   2L²/15 ]]

        Riferimento: Bathe, "Finite Element Procedures" (2014) §6.6.3.
        """
        L = self.L
        L2 = L * L
        factor = N / L
        kg = factor * np.array([
            [0,  0,       0,       0,  0,       0      ],
            [0,  6/5,     L/10,    0, -6/5,     L/10   ],
            [0,  L/10,    2*L2/15, 0, -L/10,   -L2/30  ],
            [0,  0,       0,       0,  0,       0      ],
            [0, -6/5,    -L/10,    0,  6/5,    -L/10   ],
            [0,  L/10,   -L2/30,   0, -L/10,    2*L2/15],
        ], dtype=float)
        return kg

    def geometric_stiffness_global(self, N: float) -> np.ndarray:
        """K_G in coordinate globali: T^T · K_G_local · T."""
        T = self.transformation_matrix()
        return T.T @ self.local_geometric_stiffness(N) @ T

    def equivalent_load_uniform(self, qy_local: float) -> np.ndarray:
        """Vettore forze nodali equivalenti per carico distribuito uniforme qy [N/m] in locale."""
        L = self.L
        return np.array([
            0, qy_local * L / 2.0,  qy_local * L * L / 12.0,
            0, qy_local * L / 2.0, -qy_local * L * L / 12.0,
        ], dtype=float)
