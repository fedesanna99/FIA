from pydantic import BaseModel, Field
from typing import Optional, Literal


class Material(BaseModel):
    id: str
    name: str
    E: float = Field(..., description="Modulo di Young [Pa]")
    nu: float = Field(0.3, description="Coefficiente di Poisson")
    rho: float = Field(..., description="Densità [kg/m^3]")
    fy: Optional[float] = Field(None, description="Tensione di snervamento [Pa]")
    fck: Optional[float] = Field(None, description="Resistenza caratteristica cls [Pa]")
    alpha_t: float = Field(1.2e-5, description="Coefficiente dilatazione termica [1/°C]")
    color: str = "#cccccc"

    @property
    def G(self) -> float:
        """Modulo di taglio derivato"""
        return self.E / (2.0 * (1.0 + self.nu))


class CompositeLayerSpec(BaseModel):
    """Specifica di uno strato di laminato (BL-4)."""
    E1: float = Field(..., description="Modulo elastico longitudinale (fibra) [Pa]")
    thickness: float = Field(..., description="Spessore strato [m]")
    theta_deg: float = Field(0.0, description="Angolo fibra rispetto all'asse x [deg]")
    E2: Optional[float] = Field(None, description="Modulo trasversale [Pa]. None=isotropo")
    nu12: float = Field(0.3, description="Coefficiente di Poisson principale")
    G12: Optional[float] = Field(None, description="Modulo shear in-plane [Pa]")
    rho: float = Field(0.0, description="Densità strato [kg/m³]")


class Section(BaseModel):
    id: str
    name: str
    type: Literal["rectangular", "circular", "circular_hollow", "I_profile", "custom"] = "custom"
    A: float = Field(..., description="Area [m^2]")
    Iy: float = Field(..., description="Momento d'inerzia rispetto a y [m^4]")
    Iz: float = Field(..., description="Momento d'inerzia rispetto a z [m^4]")
    J: float = Field(0.0, description="Costante torsionale [m^4]")
    Wply: float = Field(0.0, description="Modulo plastico y [m^3]")
    Wplz: float = Field(0.0, description="Modulo plastico z [m^3]")
    Wely: float = Field(0.0, description="Modulo elastico y [m^3] — per EC3")
    Welz: float = Field(0.0, description="Modulo elastico z [m^3] — per EC3")
    h: Optional[float] = None
    b: Optional[float] = None
    t: Optional[float] = None
    thickness: Optional[float] = Field(None, description="Spessore (per shell) [m]")
    # Campi geometrici aggiuntivi per profili a doppio T (richiesti da EC3 §5.5)
    tf: Optional[float] = Field(None, description="Spessore ali [m]")
    tw: Optional[float] = Field(None, description="Spessore anima [m]")
    r: Optional[float] = Field(None, description="Raggio di raccordo ala-anima [m]")
    Iw: Optional[float] = Field(None, description="Costante warping [m^6] — per LTB")
    # BL-4 — laminato composito (shell stratificato)
    layers: Optional[list[CompositeLayerSpec]] = Field(
        None,
        description="Strati di laminato (BL-4) per shell composito. Se presente, "
                    "l'assembler costruisce uno ShellQuad4Layered invece di un ShellQuad4."
    )


MATERIALS_DB: dict[str, Material] = {
    # Acciai strutturali EN 10025-2 — f_y per t ≤ 40 mm (EN 1993-1-1 Tab. 3.1)
    "steel_s235": Material(
        id="steel_s235", name="Acciaio S235",
        E=210e9, nu=0.3, rho=7850, fy=235e6, color="#7a8896",
    ),
    "steel_s275": Material(
        id="steel_s275", name="Acciaio S275",
        E=210e9, nu=0.3, rho=7850, fy=275e6, color="#6a7888",
    ),
    "steel_s355": Material(
        id="steel_s355", name="Acciaio S355",
        E=210e9, nu=0.3, rho=7850, fy=355e6, color="#5a6878",
    ),
    "steel_s420": Material(
        id="steel_s420", name="Acciaio S420",
        E=210e9, nu=0.3, rho=7850, fy=420e6, color="#4a5868",
    ),
    "steel_s460": Material(
        id="steel_s460", name="Acciaio S460",
        E=210e9, nu=0.3, rho=7850, fy=460e6, color="#3a4858",
    ),
    # Calcestruzzi EN 206 / EN 1992-1-1 Tab. 3.1
    "concrete_c20": Material(
        id="concrete_c20", name="Calcestruzzo C20/25",
        E=30e9, nu=0.2, rho=2500, fck=20e6, alpha_t=1.0e-5, color="#b8b8b8",
    ),
    "concrete_c25": Material(
        id="concrete_c25", name="Calcestruzzo C25/30",
        E=31e9, nu=0.2, rho=2500, fck=25e6, alpha_t=1.0e-5, color="#a8a8a8",
    ),
    "concrete_c30": Material(
        id="concrete_c30", name="Calcestruzzo C30/37",
        E=33e9, nu=0.2, rho=2500, fck=30e6, alpha_t=1.0e-5, color="#909090",
    ),
    "concrete_c35": Material(
        id="concrete_c35", name="Calcestruzzo C35/45",
        E=34e9, nu=0.2, rho=2500, fck=35e6, alpha_t=1.0e-5, color="#808080",
    ),
    "concrete_c40": Material(
        id="concrete_c40", name="Calcestruzzo C40/50",
        E=35e9, nu=0.2, rho=2500, fck=40e6, alpha_t=1.0e-5, color="#707070",
    ),
    "concrete_c45": Material(
        id="concrete_c45", name="Calcestruzzo C45/55",
        E=36e9, nu=0.2, rho=2500, fck=45e6, alpha_t=1.0e-5, color="#606060",
    ),
    # Acciaio armatura (NTC 2018 §11.3)
    "rebar_b450c": Material(
        id="rebar_b450c", name="Acciaio armatura B450C",
        E=200e9, nu=0.3, rho=7850, fy=450e6, alpha_t=1.2e-5, color="#404040",
    ),
    "aluminum_6061": Material(
        id="aluminum_6061", name="Alluminio 6061-T6",
        E=69e9, nu=0.33, rho=2700, fy=276e6, alpha_t=2.36e-5, color="#c0c8d0",
    ),
    # Legno strutturale EN 338 / EN 14080
    "timber_c24": Material(
        id="timber_c24", name="Legno massiccio C24",
        E=11e9, nu=0.3, rho=420, alpha_t=5.0e-6, color="#b08560",
    ),
    "timber_c30": Material(
        id="timber_c30", name="Legno massiccio C30",
        E=12e9, nu=0.3, rho=460, alpha_t=5.0e-6, color="#a07550",
    ),
    "glulam_gl24h": Material(
        id="glulam_gl24h", name="Legno lamellare GL24h",
        E=11.5e9, nu=0.3, rho=420, alpha_t=5.0e-6, color="#c09570",
    ),
    "glulam_gl28h": Material(
        id="glulam_gl28h", name="Legno lamellare GL28h",
        E=12.6e9, nu=0.3, rho=425, alpha_t=5.0e-6, color="#b08560",
    ),
    # Acciaio armonico per stay cables (EN 10138 / fib bulletin 30)
    "cable_steel_y1860": Material(
        id="cable_steel_y1860", name="Trefolo Y1860 (cavo)",
        E=195e9, nu=0.3, rho=7850, fy=1860e6, color="#d4d4d4",
    ),
    # Fibra unidirezionale per laminati compositi (BL-4)
    "carbon_uni": Material(
        id="carbon_uni", name="Fibra di carbonio uni (T300)",
        E=135e9, nu=0.28, rho=1600, color="#1a1a1a",
    ),
}


def _rect(b: float, h: float) -> dict:
    A = b * h
    Iy = b * h**3 / 12.0
    Iz = h * b**3 / 12.0
    a, c = max(b, h), min(b, h)
    J = a * c**3 * (1.0 / 3.0 - 0.21 * (c / a) * (1.0 - (c**4) / (12.0 * a**4)))
    return dict(A=A, Iy=Iy, Iz=Iz, J=J, Wply=b * h**2 / 4.0, Wplz=h * b**2 / 4.0, b=b, h=h)


def _circ(D: float) -> dict:
    import math
    A = math.pi * D**2 / 4.0
    I = math.pi * D**4 / 64.0
    J = math.pi * D**4 / 32.0
    Wpl = D**3 / 6.0
    return dict(A=A, Iy=I, Iz=I, J=J, Wply=Wpl, Wplz=Wpl, b=D, h=D)


def _i_profile(
    sid: str, name: str,
    h: float, b: float, tw: float, tf: float, r: float,
    A: float, Iy: float, Iz: float, J: float,
    Wely: float, Welz: float, Wply: float, Wplz: float,
    Iw: float,
) -> Section:
    """Crea un profilo a doppio T con tutti i parametri richiesti da EC3.
    Tutti i valori in unità SI (m, m², m⁴, m⁶).
    """
    return Section(
        id=sid, name=name, type="I_profile",
        h=h, b=b, tw=tw, tf=tf, r=r,
        A=A, Iy=Iy, Iz=Iz, J=J,
        Wely=Wely, Welz=Welz, Wply=Wply, Wplz=Wplz, Iw=Iw,
    )


# Dati da EN 10365:2017 / catalogo Arcelor-Mittal. Unità SI.
# Ordine arg: (h, b, tw, tf, r, A, Iy, Iz, J, Wely, Welz, Wply, Wplz, Iw)
_IPE_DATA: dict[str, tuple] = {
    # name : (h, b, tw, tf, r,  A,         Iy,         Iz,        J,        Wely,      Welz,      Wply,      Wplz,      Iw)
    "ipe_100": (0.100, 0.055, 0.0041, 0.0057, 0.007, 10.32e-4,  171.0e-8,   15.92e-8,   1.20e-8,  34.20e-6,   5.79e-6,   39.41e-6,   9.15e-6,   0.351e-9),
    "ipe_200": (0.200, 0.100, 0.0056, 0.0085, 0.012, 28.48e-4,  1943.0e-8,  142.4e-8,   6.98e-8,  194.3e-6,   28.47e-6,  220.6e-6,   44.61e-6,  13.0e-9),
    "ipe_240": (0.240, 0.120, 0.0062, 0.0098, 0.015, 39.12e-4,  3892.0e-8,  283.6e-8,   12.88e-8, 324.3e-6,   47.27e-6,  366.6e-6,   73.92e-6,  37.4e-9),
    "ipe_270": (0.270, 0.135, 0.0066, 0.0102, 0.015, 45.94e-4,  5790.0e-8,  419.9e-8,   15.94e-8, 428.9e-6,   62.21e-6,  484.0e-6,   96.95e-6,  70.6e-9),
    "ipe_300": (0.300, 0.150, 0.0071, 0.0107, 0.015, 53.81e-4,  8356.0e-8,  603.8e-8,   20.12e-8, 557.1e-6,   80.50e-6,  628.4e-6,   125.2e-6,  126.0e-9),
    "ipe_360": (0.360, 0.170, 0.0080, 0.0127, 0.018, 72.73e-4,  16270.0e-8, 1043.0e-8,  37.32e-8, 903.6e-6,   122.8e-6,  1019.0e-6,  191.1e-6,  313.0e-9),
    "ipe_400": (0.400, 0.180, 0.0086, 0.0135, 0.021, 84.46e-4,  23130.0e-8, 1318.0e-8,  51.08e-8, 1156.0e-6,  146.4e-6,  1307.0e-6,  229.0e-6,  490.0e-9),
    "ipe_500": (0.500, 0.200, 0.0102, 0.0160, 0.021, 115.5e-4,  48200.0e-8, 2142.0e-8,  89.29e-8, 1928.0e-6,  214.2e-6,  2194.0e-6,  335.9e-6,  1249.0e-9),
}

_HEA_DATA: dict[str, tuple] = {
    "hea_100": (0.096, 0.100, 0.0050, 0.0080, 0.012, 21.24e-4,  349.2e-8,   133.8e-8,   5.24e-8,  72.76e-6,   26.76e-6,  83.01e-6,   41.14e-6,  2.58e-9),
    "hea_200": (0.190, 0.200, 0.0065, 0.0100, 0.018, 53.83e-4,  3692.0e-8,  1336.0e-8,  20.98e-8, 388.6e-6,   133.6e-6,  429.5e-6,   203.8e-6,  108.0e-9),
    "hea_240": (0.230, 0.240, 0.0075, 0.0120, 0.021, 76.84e-4,  7763.0e-8,  2769.0e-8,  41.55e-8, 675.1e-6,   230.7e-6,  744.6e-6,   351.7e-6,  328.5e-9),
    "hea_300": (0.290, 0.300, 0.0085, 0.0140, 0.027, 112.5e-4,  18260.0e-8, 6310.0e-8,  85.17e-8, 1260.0e-6,  420.6e-6,  1383.0e-6,  641.2e-6,  1200.0e-9),
}

_HEB_DATA: dict[str, tuple] = {
    "heb_100": (0.100, 0.100, 0.0060, 0.0100, 0.012, 26.04e-4,  449.5e-8,   167.3e-8,   9.25e-8,  89.91e-6,   33.45e-6,  104.2e-6,   51.42e-6,  3.375e-9),
    "heb_200": (0.200, 0.200, 0.0090, 0.0150, 0.018, 78.08e-4,  5696.0e-8,  2003.0e-8,  59.28e-8, 569.6e-6,   200.3e-6,  642.5e-6,   305.8e-6,  171.1e-9),
    "heb_240": (0.240, 0.240, 0.0100, 0.0170, 0.021, 106.0e-4,  11260.0e-8, 3923.0e-8,  102.7e-8, 938.3e-6,   326.9e-6,  1053.0e-6,  498.4e-6,  486.9e-9),
    "heb_300": (0.300, 0.300, 0.0110, 0.0190, 0.027, 149.1e-4,  25170.0e-8, 8563.0e-8,  185.0e-8, 1678.0e-6,  570.9e-6,  1869.0e-6,  870.1e-6,  1688.0e-9),
}


def _build_steel_profiles() -> dict[str, Section]:
    out: dict[str, Section] = {}
    for series, data in (("IPE", _IPE_DATA), ("HEA", _HEA_DATA), ("HEB", _HEB_DATA)):
        for sid, params in data.items():
            sz = sid.split("_")[1]
            out[sid] = _i_profile(sid, f"{series} {sz}", *params)
    return out


SECTIONS_DB: dict[str, Section] = {
    "rect_300x500": Section(id="rect_300x500", name="Rettangolare 300×500 mm",
                            type="rectangular", **_rect(0.30, 0.50)),
    "rect_200x400": Section(id="rect_200x400", name="Rettangolare 200×400 mm",
                            type="rectangular", **_rect(0.20, 0.40)),
    "rect_150x300": Section(id="rect_150x300", name="Rettangolare 150×300 mm",
                            type="rectangular", **_rect(0.15, 0.30)),
    "circ_200": Section(id="circ_200", name="Circolare Ø200 mm",
                        type="circular", **_circ(0.20)),
    "circ_100": Section(id="circ_100", name="Circolare Ø100 mm",
                        type="circular", **_circ(0.10)),
    **_build_steel_profiles(),
    "shell_t100": Section(id="shell_t100", name="Shell t=100mm",
                          type="custom", A=0.1, Iy=0, Iz=0, J=0, thickness=0.10),
    "shell_t200": Section(id="shell_t200", name="Shell t=200mm",
                          type="custom", A=0.2, Iy=0, Iz=0, J=0, thickness=0.20),
    # Cavi per BL-1: solo area assiale, niente inerzia (tension-only)
    "cable_d20": Section(
        id="cable_d20", name="Cavo Ø20 mm (tension-only)",
        type="custom",
        A=3.14159e-4,  # π·0.01²
        Iy=0.0, Iz=0.0, J=0.0,
    ),
    "cable_d50": Section(
        id="cable_d50", name="Cavo Ø50 mm (tension-only)",
        type="custom",
        A=1.9635e-3,  # π·0.025²
        Iy=0.0, Iz=0.0, J=0.0,
    ),
    # Laminato cross-ply 0/90/0 per BL-4 (3 strati simmetrici, 1 mm ciascuno)
    "laminate_cross_ply": Section(
        id="laminate_cross_ply", name="Laminato cross-ply [0/90/0] 3×1 mm",
        type="custom",
        A=3e-3, Iy=0.0, Iz=0.0, J=0.0, thickness=3e-3,
        layers=[
            CompositeLayerSpec(E1=135e9, thickness=1e-3, theta_deg=0.0,
                               E2=10e9, nu12=0.28, G12=5e9, rho=1600),
            CompositeLayerSpec(E1=135e9, thickness=1e-3, theta_deg=90.0,
                               E2=10e9, nu12=0.28, G12=5e9, rho=1600),
            CompositeLayerSpec(E1=135e9, thickness=1e-3, theta_deg=0.0,
                               E2=10e9, nu12=0.28, G12=5e9, rho=1600),
        ],
    ),
}
