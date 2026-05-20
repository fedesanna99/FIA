"""Test dell'endpoint `POST /api/verify/ec3/{model_id}`."""
import pytest
from fastapi.testclient import TestClient

from main import app
import storage
from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _cantilever_steel(model_id: str, section_id: str = "ipe_300",
                      material_id: str = "steel_s355",
                      P: float = -1000.0, L: float = 3.0,
                      n_div: int = 5) -> FEAModel:
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [
        Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                material_id=material_id, section_id=section_id)
        for i in range(n_div)
    ]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=n_div + 1, fy=P)]
    return FEAModel(
        id=model_id, name="ec3 test", is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


@pytest.fixture
def cantilever_model(client):
    """Crea un cantilever IPE 300 S355 e ritorna l'id."""
    m = _cantilever_steel(model_id="ec3_test_cantilever")
    storage.save_model(m)
    yield m.id
    storage.delete_model(m.id)


def test_verify_ec3_runs_on_cantilever(client, cantilever_model):
    r = client.post(f"/api/verify/ec3/{cantilever_model}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["model_id"] == cantilever_model
    assert data["n_elements_checked"] == 5  # 5 elementi del cantilever
    assert len(data["results"]) == 5


def test_verify_ec3_returns_UR_per_element(client, cantilever_model):
    r = client.post(f"/api/verify/ec3/{cantilever_model}")
    data = r.json()
    for v in data["results"]:
        assert v["section_id"] == "ipe_300"
        assert v["material_id"] == "steel_s355"
        assert v["section_class"] in (1, 2, 3, 4)
        assert v["UR_max"] >= 0
        assert v["governing"] in ("resistance", "buckling", "LTB", "serviceability")
        assert v["status"] in ("OK", "FAIL")


def test_verify_ec3_governing_element_at_clamp(client, cantilever_model):
    """Nel cantilever, l'elemento all'incastro ha il M_Ed più grande."""
    r = client.post(f"/api/verify/ec3/{cantilever_model}")
    data = r.json()
    # ordina per M_Ed decrescente
    by_M = sorted(data["results"], key=lambda v: v["M_Ed"], reverse=True)
    # il primo elemento (id=1) è quello all'incastro
    assert by_M[0]["element_id"] == 1


def test_verify_ec3_no_steel_returns_zero_checks(client):
    """Modello senza elementi acciaio → nessuna verifica."""
    nodes = [Node(id=1, x=0, y=0, z=0), Node(id=2, x=2, y=0, z=0)]
    elements = [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                        material_id="concrete_c25",  # non acciaio
                        section_id="rect_300x500")]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=2, fy=-1000.0)]
    m = FEAModel(id="ec3_no_steel", name="cls", is_3d=False,
                 nodes=nodes, elements=elements,
                 constraints=constraints, loads=loads)
    storage.save_model(m)
    try:
        r = client.post(f"/api/verify/ec3/{m.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["n_elements_checked"] == 0
        assert data["results"] == []
    finally:
        storage.delete_model(m.id)


def test_verify_ec3_model_not_found_returns_404(client):
    r = client.post("/api/verify/ec3/inesistente_xyz")
    assert r.status_code == 404


def test_verify_ec3_failing_element_has_status_fail(client):
    """Carico altissimo → almeno un elemento deve essere FAIL."""
    m = _cantilever_steel(
        model_id="ec3_overload",
        section_id="ipe_100",       # sezione piccola
        P=-500e3,                    # 500 kN, sproporzionato
        L=4.0,
    )
    storage.save_model(m)
    try:
        r = client.post(f"/api/verify/ec3/{m.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["n_failures"] > 0
        assert any(v["status"] == "FAIL" for v in data["results"])
    finally:
        storage.delete_model(m.id)


def test_verify_ec3_with_custom_gamma_factors(client, cantilever_model):
    """γ_M0=1.00 (EC) deve dare U.R. più bassi rispetto al default 1.05."""
    r_ntc = client.post(f"/api/verify/ec3/{cantilever_model}").json()
    r_ec = client.post(
        f"/api/verify/ec3/{cantilever_model}",
        json={"gamma_M0": 1.0, "gamma_M1": 1.0},
    ).json()
    # Confronto sul primo elemento (quello all'incastro)
    e1_ntc = next(v for v in r_ntc["results"] if v["element_id"] == 1)
    e1_ec = next(v for v in r_ec["results"] if v["element_id"] == 1)
    assert e1_ec["UR_max"] < e1_ntc["UR_max"], (
        f"UR EC ({e1_ec['UR_max']}) deve essere < UR NTC ({e1_ntc['UR_max']})"
    )
