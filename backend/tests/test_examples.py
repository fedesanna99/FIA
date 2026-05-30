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
    example_rc_building_4st,        # TPL-1
    example_steel_portal_hall,      # TPL-2
    example_steel_truss_pratt_24m,  # TPL-3
    example_rc_frame_2d_pushover,   # TPL-4
    example_rc_floor_with_beams,    # TPL-5
    example_retaining_wall_2d,      # TPL-6
)
from core.solver import StaticSolver, ModalSolver


ALL_EXAMPLES = [
    ("simple_beam_2d", example_simple_beam_2d),
    ("portal_frame_2d", example_portal_frame_2d),
    ("truss_3d", example_truss_3d),
    ("shell_plate", example_shell_plate),
    ("tower_3d", example_tower_3d),
    ("rc_building_4st", example_rc_building_4st),               # TPL-1
    ("steel_portal_hall", example_steel_portal_hall),           # TPL-2
    ("steel_truss_pratt_24m", example_steel_truss_pratt_24m),   # TPL-3
    ("rc_frame_2d_pushover", example_rc_frame_2d_pushover),     # TPL-4
    ("rc_floor_with_beams", example_rc_floor_with_beams),       # TPL-5
    ("retaining_wall_2d", example_retaining_wall_2d),           # TPL-6
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


# === TPL-1 · Edificio CA 4 piani ===
def test_rc_building_4st_geometry():
    """Verifica geometria nominale: 585 nodi (5 piani × 13×9), 500 elementi."""
    model = example_rc_building_4st()
    assert len(model.nodes) == 585, f"Nodi attesi 585, trovati {len(model.nodes)}"
    assert len(model.elements) == 500, f"Elementi attesi 500, trovati {len(model.elements)}"
    assert len(model.constraints) == 12, f"12 pilastri incastrati alla base"
    # Verifica mix tipologie: pilastri+travi BEAM3D + solai SHELL_Q4
    n_beam = sum(1 for e in model.elements if str(e.type).endswith("BEAM3D"))
    n_shell = sum(1 for e in model.elements if str(e.type).endswith("SHELL_Q4"))
    assert n_beam == 116, f"Pilastri 48 + travi 68 = 116 BEAM3D, trovati {n_beam}"
    assert n_shell == 384, f"Solai 12×8×4 = 384 SHELL_Q4, trovati {n_shell}"


def test_rc_building_4st_reactions_balance_floor_loads():
    """Σ Fz reazioni == -Σ carichi solaio (5 kN/m² × 96 m² × 4 piani = 1920 kN)."""
    model = example_rc_building_4st()
    r = StaticSolver(model).solve()
    total_rz = sum(rx.fz for rx in r.reactions)
    # Carichi totali: q × area solaio × n_piani = 5000 N/m² × 96 m² × 4 = 1.92 MN
    expected = 5000.0 * 12.0 * 8.0 * 4
    assert total_rz == pytest.approx(expected, rel=1e-2), (
        f"Reazioni Fz {total_rz:.0f} N devono bilanciare carichi {expected:.0f} N "
        f"(scarto >1%)"
    )


# === TPL-2 · Capannone acciaio 1 campata ===
def test_steel_portal_hall_geometry():
    """Verifica geometria: 81 nodi (9 telai × 9 slot), 100 elem (96 BEAM3D + 4 TRUSS3D)."""
    model = example_steel_portal_hall()
    assert len(model.nodes) == 81, f"Nodi attesi 81, trovati {len(model.nodes)}"
    assert len(model.elements) == 100, f"Elementi attesi 100, trovati {len(model.elements)}"
    assert len(model.constraints) == 18, f"18 pilastri base incastrati (9 telai × 2)"
    # Verifica mix tipologie
    n_beam = sum(1 for e in model.elements if str(e.type).endswith("BEAM3D"))
    n_truss = sum(1 for e in model.elements if str(e.type).endswith("TRUSS3D"))
    assert n_beam == 96, f"72 telai + 24 arcarecci = 96 BEAM3D, trovati {n_beam}"
    assert n_truss == 4, f"4 controventi facciate, trovati {n_truss}"
    # Bounding box: x=[0, 20], y=[0, 40], z=[0, 9.68]
    xs = [n.x for n in model.nodes]
    ys = [n.y for n in model.nodes]
    zs = [n.z for n in model.nodes]
    assert min(xs) == 0.0 and max(xs) == 20.0, "luce 20m"
    assert min(ys) == 0.0 and max(ys) == 40.0, "lunghezza 40m (9 telai × 5m interasse)"
    assert min(zs) == 0.0 and max(zs) == pytest.approx(9.68, abs=0.01), "colmo ~9.68m"


# === TPL-6 · Muro sostegno plane-strain ===
def test_retaining_wall_2d_geometry():
    """186 nodi (6×31), 150 SHELL_Q4 (5×30), 6 vincoli base."""
    model = example_retaining_wall_2d()
    assert len(model.nodes) == 186
    assert len(model.elements) == 150
    assert len(model.constraints) == 6
    n_shell = sum(1 for e in model.elements if str(e.type).endswith("SHELL_Q4"))
    assert n_shell == 150, "tutti SHELL_Q4"


def test_retaining_wall_2d_balance():
    """Σ Fx reazioni base == -Σ spinta terreno (Rankine, ~108 kN nominali)."""
    model = example_retaining_wall_2d()
    r = StaticSolver(model).solve()
    total_rx = sum(rx.fx for rx in r.reactions)
    # Σ carichi: 0.5 × γ × Ka × H² = 0.5 × 18000 × 0.33 × 36 = 106.92 kN
    # (approssimazione discreta su 31 nodi → leggermente sotto i 108 nominali)
    expected = 18000.0 * 0.33 * 6.0 * 6.0 / 2.0  # 106920 N
    assert total_rx == pytest.approx(expected, rel=1e-2)


# === TPL-5 · Solaio CA gettato + travi ===
def test_rc_floor_with_beams_geometry():
    """425 nodi (17×25), 440 elem (384 SHELL_Q4 + 56 BEAM3D), 50 vincoli bordo."""
    model = example_rc_floor_with_beams()
    assert len(model.nodes) == 425
    assert len(model.elements) == 440
    assert len(model.constraints) == 50
    n_shell = sum(1 for e in model.elements if str(e.type).endswith("SHELL_Q4"))
    n_beam = sum(1 for e in model.elements if str(e.type).endswith("BEAM3D"))
    assert n_shell == 384, "16×24 = 384 shell"
    assert n_beam == 56, "24 trave principale + 32 nervature = 56"


def test_rc_floor_with_beams_balance():
    """Σ Fz reazioni == -Σ carichi solaio (8×12 m × 3 kN/m² = 288 kN)."""
    model = example_rc_floor_with_beams()
    r = StaticSolver(model).solve()
    total_rz = sum(rx.fz for rx in r.reactions)
    expected = 3000.0 * 8.0 * 12.0  # 288 kN
    assert total_rz == pytest.approx(expected, rel=1e-2)


# === TPL-4 · Telaio CA 2D 5×3 pushover EC8 ===
def test_rc_frame_2d_pushover_geometry():
    """24 nodi (6×4), 33 BEAM2D (18 pilastri + 15 travi), 6 incastri base."""
    model = example_rc_frame_2d_pushover()
    assert len(model.nodes) == 24
    assert len(model.elements) == 33
    assert len(model.constraints) == 6
    n_beam2d = sum(1 for e in model.elements if str(e.type).endswith("BEAM2D"))
    assert n_beam2d == 33, "tutti BEAM2D"


def test_rc_frame_2d_pushover_balance():
    """Σ Fy reazioni == Σ carichi gravita' (18 nodi × 8 kN = 144 kN)."""
    model = example_rc_frame_2d_pushover()
    r = StaticSolver(model).solve()
    total_ry = sum(rx.fy for rx in r.reactions)
    expected = 8000.0 * 18  # 144 kN
    assert total_ry == pytest.approx(expected, rel=1e-3)


# === TPL-3 · Capriata Pratt 24m ===
def test_steel_truss_pratt_geometry():
    """Verifica geometria: 24 nodi (13 inf + 11 sup), 45 elem (tutti TRUSS3D)."""
    model = example_steel_truss_pratt_24m()
    assert len(model.nodes) == 24, f"Nodi attesi 24, trovati {len(model.nodes)}"
    assert len(model.elements) == 45, f"Elementi attesi 45, trovati {len(model.elements)}"
    assert len(model.constraints) == 2, "2 cerniere ai 2 nodi inf estremi"
    n_truss = sum(1 for e in model.elements if str(e.type).endswith("TRUSS3D"))
    assert n_truss == 45, f"Tutti TRUSS3D (puro reticolare), trovati {n_truss}"
    # Bounding box: x=[0,24] z=[0,2.4]
    xs = [n.x for n in model.nodes]
    zs = [n.z for n in model.nodes]
    assert min(xs) == 0.0 and max(xs) == 24.0, "luce 24m"
    assert min(zs) == 0.0 and max(zs) == pytest.approx(2.4, abs=0.01), "altezza H=2.4m"


def test_steel_truss_pratt_only_axial():
    """Capriata reticolare: ogni elemento ha solo N (no momenti, no taglio)."""
    model = example_steel_truss_pratt_24m()
    r = StaticSolver(model).solve()
    for f in r.element_forces:
        assert f.My_i == 0 and f.Mz_i == 0, f"elemento {f.element_id}: momento non zero"
        assert f.Vy_i == 0 and f.Vz_i == 0, f"elemento {f.element_id}: taglio non zero"
    n_total = sum(abs(f.N_j) for f in r.element_forces)
    assert n_total > 0, "almeno alcune aste devono lavorare"


def test_steel_truss_pratt_reactions_balance_loads():
    """Σ Fz reazioni == -Σ carichi copertura (11 nodi × -10 kN = +110 kN)."""
    model = example_steel_truss_pratt_24m()
    r = StaticSolver(model).solve()
    total_rz = sum(rx.fz for rx in r.reactions)
    expected = 10000.0 * 11  # 110 kN totali
    assert total_rz == pytest.approx(expected, rel=1e-3), (
        f"Reazioni Fz {total_rz:.0f} N devono bilanciare {expected:.0f} N "
        f"(scarto >0.1%)"
    )


def test_steel_portal_hall_reactions_balance_roof_loads():
    """Σ Fz reazioni == -Σ carichi copertura.
    Carico copertura: -3 kN/m² su 20×40 = 800 m² → 2400 kN totali.
    """
    model = example_steel_portal_hall()
    r = StaticSolver(model).solve()
    total_rz = sum(rx.fz for rx in r.reactions)
    expected = 3000.0 * 20.0 * 40.0  # 3 kN/m² × area capannone
    # Tolleranza leggermente più alta: i nodi laterali (bordo telai) hanno area
    # dimezzata, e l'inclinazione delle falde può introdurre lieve discrepanza
    # con la proiezione semplice in pianta.
    assert total_rz == pytest.approx(expected, rel=2e-2), (
        f"Reazioni Fz {total_rz:.0f} N devono bilanciare carichi {expected:.0f} N "
        f"(scarto >2%)"
    )
