"""Test end-to-end su tutti i modelli precaricati.

Ogni esempio è risolto staticamente e modale (dove ha senso) e i risultati
sono verificati con criteri di sanity: spostamenti finiti, reazioni che bilanciano
i carichi esterni, frequenze ordinate, ecc.
"""
import pytest

from examples import (
    example_simple_beam_2d,
    example_portal_frame_2d,
    example_truss_3d,
    example_shell_plate,
    example_tower_3d,
)
from core.solver import StaticSolver, ModalSolver


ALL_EXAMPLES = [
    ("simple_beam_2d", example_simple_beam_2d),
    ("portal_frame_2d", example_portal_frame_2d),
    ("truss_3d", example_truss_3d),
    ("shell_plate", example_shell_plate),
    ("tower_3d", example_tower_3d),
]


@pytest.mark.parametrize("name,builder", ALL_EXAMPLES)
def test_static_runs_without_errors(name, builder):
    """Ogni esempio deve risolvere e produrre spostamenti finiti."""
    import math
    model = builder()
    r = StaticSolver(model).solve()
    assert r.max_displacement > 0, f"{name}: nessuno spostamento (probabile vincolo errato)"
    assert math.isfinite(r.max_displacement), f"{name}: spostamento non finito"
    assert r.max_displacement < 10.0, (
        f"{name}: spostamento spropositato ({r.max_displacement:.3e} m) "
        f"— probabile meccanismo non vincolato"
    )
    for d in r.displacements:
        for v in (d.ux, d.uy, d.uz, d.rx, d.ry, d.rz):
            assert math.isfinite(v), f"{name}: NaN/Inf nel nodo {d.node_id}"


def test_simple_beam_reactions_balance_loads():
    """Σ Fy reazioni == Σ qL del carico distribuito."""
    model = example_simple_beam_2d()
    r = StaticSolver(model).solve()
    total_reactions_y = sum(rx.fy for rx in r.reactions)
    q = 10000.0
    L = 6.0
    expected = q * L
    assert total_reactions_y == pytest.approx(expected, rel=1e-3)


def test_portal_frame_reactions_balance():
    """ΣFx reazioni == -F_wind; ΣFy == -Σq_tetto·L."""
    model = example_portal_frame_2d()
    r = StaticSolver(model).solve()
    total_rx = sum(rx.fx for rx in r.reactions)
    total_ry = sum(rx.fy for rx in r.reactions)
    assert total_rx == pytest.approx(-15000.0, abs=1.0), "vento bilanciato"
    assert total_ry == pytest.approx(2 * 8000.0 * 3.0, rel=0.01), "carichi tetto"


def test_truss_3d_only_axial():
    """Per un reticolo, ogni elemento ha solo N (no momenti)."""
    model = example_truss_3d()
    r = StaticSolver(model).solve()
    for f in r.element_forces:
        assert f.My_i == 0 and f.Mz_i == 0
        assert f.Vy_i == 0 and f.Vz_i == 0
    n_total = sum(abs(f.N_j) for f in r.element_forces)
    assert n_total > 0, "almeno alcune aste devono lavorare"


def test_shell_plate_symmetric_deflection():
    """Piastra quadrata incastrata su 4 lati: il centro deve avere la massima freccia."""
    model = example_shell_plate()
    r = StaticSolver(model).solve()
    n_grid = 5
    center_id = (n_grid // 2) * n_grid + (n_grid // 2) + 1
    center = next(d for d in r.displacements if d.node_id == center_id)
    others = [d for d in r.displacements if d.node_id != center_id]
    max_other = max(abs(d.uz) for d in others)
    assert abs(center.uz) >= max_other - 1e-9, "Il centro deve avere uz massimo"


@pytest.mark.parametrize("name,builder", [
    ("simple_beam_2d", example_simple_beam_2d),
    ("portal_frame_2d", example_portal_frame_2d),
    ("tower_3d", example_tower_3d),
])
def test_modal_first_freq_positive(name, builder):
    """Prima frequenza propria > 0 e modi ordinati crescenti."""
    model = builder()
    r = ModalSolver(model, n_modes=4).solve()
    assert len(r.modes) >= 1
    assert r.modes[0].frequency_hz > 0, f"{name}: f1 deve essere > 0"
    freqs = [m.frequency_hz for m in r.modes]
    assert freqs == sorted(freqs), f"{name}: frequenze non ordinate"


def test_tower_first_mode_horizontal():
    """Per la torre, il primo modo deve avere componente orizzontale (Mx_eff > 0)."""
    model = example_tower_3d()
    r = ModalSolver(model, n_modes=4).solve()
    m1 = r.modes[0]
    assert m1.effective_mass_x > 0 or m1.effective_mass_y > 0, (
        "Il primo modo della torre deve essere flessionale orizzontale"
    )
