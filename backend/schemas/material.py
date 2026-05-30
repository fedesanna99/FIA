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
    # v2.4.8.2: estensione range EC2 (low-end + high-end)
    "concrete_c12": Material(
        id="concrete_c12", name="Calcestruzzo C12/15",
        E=27e9, nu=0.2, rho=2400, fck=12e6, alpha_t=1.0e-5, color="#d8d8d8",
    ),
    "concrete_c16": Material(
        id="concrete_c16", name="Calcestruzzo C16/20",
        E=29e9, nu=0.2, rho=2450, fck=16e6, alpha_t=1.0e-5, color="#c8c8c8",
    ),
    "concrete_c50": Material(
        id="concrete_c50", name="Calcestruzzo C50/60",
        E=37e9, nu=0.2, rho=2500, fck=50e6, alpha_t=1.0e-5, color="#505050",
    ),
    "concrete_c55": Material(
        id="concrete_c55", name="Calcestruzzo C55/67",
        E=38e9, nu=0.2, rho=2500, fck=55e6, alpha_t=1.0e-5, color="#404040",
    ),
    "concrete_c60": Material(
        id="concrete_c60", name="Calcestruzzo C60/75",
        E=39e9, nu=0.2, rho=2500, fck=60e6, alpha_t=1.0e-5, color="#303030",
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


# Dati da EN 10365:2017 / catalogo Arcelor-Mittal European Sections.
# Unità SI. Ordine arg: (h, b, tw, tf, r, A, Iy, Iz, J, Wely, Welz, Wply, Wplz, Iw)
# v2.4.8.1: catalogo esteso a copertura completa Annex F (~74 profili nuovi).
_IPE_DATA: dict[str, tuple] = {
    # name : (h, b, tw, tf, r,  A,         Iy,         Iz,        J,        Wely,      Welz,      Wply,      Wplz,      Iw)
    "ipe_80":  (0.080, 0.046, 0.0038, 0.0052, 0.005,  7.64e-4,   80.1e-8,    8.49e-8,    0.701e-8, 20.03e-6,   3.69e-6,   23.22e-6,   5.818e-6,  0.118e-9),
    "ipe_100": (0.100, 0.055, 0.0041, 0.0057, 0.007, 10.32e-4,  171.0e-8,   15.92e-8,   1.200e-8, 34.20e-6,   5.79e-6,   39.41e-6,   9.146e-6,  0.351e-9),
    "ipe_120": (0.120, 0.064, 0.0044, 0.0063, 0.007, 13.21e-4,  317.8e-8,   27.67e-8,   1.740e-8, 52.96e-6,   8.65e-6,   60.73e-6,  13.58e-6,   0.890e-9),
    "ipe_140": (0.140, 0.073, 0.0047, 0.0069, 0.007, 16.43e-4,  541.2e-8,   44.92e-8,   2.450e-8, 77.32e-6,  12.31e-6,   88.34e-6,  19.25e-6,   1.981e-9),
    "ipe_160": (0.160, 0.082, 0.0050, 0.0074, 0.009, 20.09e-4,  869.3e-8,   68.31e-8,   3.600e-8, 108.7e-6,  16.66e-6,  123.9e-6,   26.10e-6,   3.960e-9),
    "ipe_180": (0.180, 0.091, 0.0053, 0.0080, 0.009, 23.95e-4, 1317.0e-8,  100.9e-8,    4.790e-8, 146.3e-6,  22.16e-6,  166.4e-6,   34.60e-6,   7.430e-9),
    "ipe_200": (0.200, 0.100, 0.0056, 0.0085, 0.012, 28.48e-4, 1943.0e-8,  142.4e-8,    6.980e-8, 194.3e-6,  28.47e-6,  220.6e-6,   44.61e-6,  13.00e-9),
    "ipe_220": (0.220, 0.110, 0.0059, 0.0092, 0.012, 33.37e-4, 2772.0e-8,  204.9e-8,    9.070e-8, 252.0e-6,  37.25e-6,  285.4e-6,   58.11e-6,  22.67e-9),
    "ipe_240": (0.240, 0.120, 0.0062, 0.0098, 0.015, 39.12e-4, 3892.0e-8,  283.6e-8,   12.88e-8,  324.3e-6,  47.27e-6,  366.6e-6,   73.92e-6,  37.39e-9),
    "ipe_270": (0.270, 0.135, 0.0066, 0.0102, 0.015, 45.94e-4, 5790.0e-8,  419.9e-8,   15.94e-8,  428.9e-6,  62.20e-6,  484.0e-6,   96.95e-6,  70.58e-9),
    "ipe_300": (0.300, 0.150, 0.0071, 0.0107, 0.015, 53.81e-4, 8356.0e-8,  603.8e-8,   20.12e-8,  557.1e-6,  80.50e-6,  628.4e-6,  125.2e-6,  126.0e-9),
    "ipe_330": (0.330, 0.160, 0.0075, 0.0115, 0.018, 62.61e-4,11770.0e-8,  788.1e-8,   28.15e-8,  713.1e-6,  98.52e-6,  804.3e-6,  153.7e-6,  199.1e-9),
    "ipe_360": (0.360, 0.170, 0.0080, 0.0127, 0.018, 72.73e-4,16270.0e-8, 1043.0e-8,   37.32e-8,  903.6e-6, 122.8e-6, 1019.0e-6,  191.1e-6,  313.6e-9),
    "ipe_400": (0.400, 0.180, 0.0086, 0.0135, 0.021, 84.46e-4,23130.0e-8, 1318.0e-8,   51.08e-8, 1156.0e-6, 146.4e-6, 1307.0e-6,  229.0e-6,  490.0e-9),
    "ipe_450": (0.450, 0.190, 0.0094, 0.0146, 0.021, 98.82e-4,33740.0e-8, 1676.0e-8,   66.87e-8, 1500.0e-6, 176.4e-6, 1702.0e-6,  276.4e-6,  791.0e-9),
    "ipe_500": (0.500, 0.200, 0.0102, 0.0160, 0.021,115.50e-4,48200.0e-8, 2142.0e-8,   89.29e-8, 1928.0e-6, 214.2e-6, 2194.0e-6,  335.9e-6, 1249.0e-9),
    "ipe_550": (0.550, 0.210, 0.0111, 0.0172, 0.024,134.40e-4,67120.0e-8, 2668.0e-8,  123.2e-8,  2441.0e-6, 254.1e-6, 2787.0e-6,  400.5e-6, 1884.0e-9),
    "ipe_600": (0.600, 0.220, 0.0120, 0.0190, 0.024,156.00e-4,92080.0e-8, 3387.0e-8,  165.4e-8,  3069.0e-6, 307.9e-6, 3512.0e-6,  485.6e-6, 2846.0e-9),
}

_HEA_DATA: dict[str, tuple] = {
    "hea_100":  (0.096, 0.100, 0.0050, 0.0080, 0.012,  21.24e-4,   349.2e-8,   133.8e-8,    5.24e-8,   72.76e-6,   26.76e-6,    83.01e-6,    41.14e-6,    2.58e-9),
    "hea_120":  (0.114, 0.120, 0.0050, 0.0080, 0.012,  25.34e-4,   606.2e-8,   230.9e-8,    5.99e-8,  106.3e-6,    38.48e-6,   119.5e-6,     58.85e-6,    6.47e-9),
    "hea_140":  (0.133, 0.140, 0.0055, 0.0085, 0.012,  31.42e-4,  1033.0e-8,   389.3e-8,    8.13e-8,  155.4e-6,    55.62e-6,   173.5e-6,     84.85e-6,   15.06e-9),
    "hea_160":  (0.152, 0.160, 0.0060, 0.0090, 0.015,  38.77e-4,  1673.0e-8,   615.6e-8,   12.19e-8,  220.1e-6,    76.95e-6,   245.1e-6,    117.6e-6,    31.41e-9),
    "hea_180":  (0.171, 0.180, 0.0060, 0.0095, 0.015,  45.25e-4,  2510.0e-8,   924.6e-8,   14.80e-8,  293.6e-6,   102.7e-6,    324.9e-6,    156.5e-6,    60.21e-9),
    "hea_200":  (0.190, 0.200, 0.0065, 0.0100, 0.018,  53.83e-4,  3692.0e-8,  1336.0e-8,   20.98e-8,  388.6e-6,   133.6e-6,    429.5e-6,    203.8e-6,   108.0e-9),
    "hea_220":  (0.210, 0.220, 0.0070, 0.0110, 0.018,  64.34e-4,  5410.0e-8,  1955.0e-8,   28.46e-8,  515.2e-6,   177.7e-6,    568.5e-6,    270.6e-6,   193.3e-9),
    "hea_240":  (0.230, 0.240, 0.0075, 0.0120, 0.021,  76.84e-4,  7763.0e-8,  2769.0e-8,   41.55e-8,  675.1e-6,   230.7e-6,    744.6e-6,    351.7e-6,   328.5e-9),
    "hea_260":  (0.250, 0.260, 0.0075, 0.0125, 0.024,  86.82e-4, 10450.0e-8,  3668.0e-8,   52.37e-8,  836.4e-6,   282.1e-6,    919.8e-6,    430.2e-6,   516.4e-9),
    "hea_280":  (0.270, 0.280, 0.0080, 0.0130, 0.024,  97.26e-4, 13670.0e-8,  4763.0e-8,   62.10e-8, 1013.0e-6,   340.2e-6,   1112.0e-6,    518.1e-6,   785.4e-9),
    "hea_300":  (0.290, 0.300, 0.0085, 0.0140, 0.027, 112.50e-4, 18260.0e-8,  6310.0e-8,   85.17e-8, 1260.0e-6,   420.6e-6,   1383.0e-6,    641.2e-6,  1200.0e-9),
    "hea_320":  (0.310, 0.300, 0.0090, 0.0155, 0.027, 124.40e-4, 22930.0e-8,  6985.0e-8,  108.0e-8,  1479.0e-6,   465.7e-6,   1628.0e-6,    709.7e-6,  1512.0e-9),
    "hea_340":  (0.330, 0.300, 0.0095, 0.0165, 0.027, 133.50e-4, 27690.0e-8,  7436.0e-8,  127.2e-8,  1678.0e-6,   495.7e-6,   1850.0e-6,    755.9e-6,  1824.0e-9),
    "hea_360":  (0.350, 0.300, 0.0100, 0.0175, 0.027, 142.80e-4, 33090.0e-8,  7887.0e-8,  148.8e-8,  1891.0e-6,   525.8e-6,   2088.0e-6,    802.3e-6,  2178.0e-9),
    "hea_400":  (0.390, 0.300, 0.0110, 0.0190, 0.027, 158.98e-4, 45070.0e-8,  8564.0e-8,  189.0e-8,  2311.0e-6,   570.9e-6,   2562.0e-6,    872.9e-6,  2942.0e-9),
    "hea_450":  (0.440, 0.300, 0.0115, 0.0210, 0.027, 178.03e-4, 63720.0e-8,  9465.0e-8,  243.8e-8,  2896.0e-6,   631.0e-6,   3216.0e-6,    965.5e-6,  4148.0e-9),
    "hea_500":  (0.490, 0.300, 0.0120, 0.0230, 0.027, 197.54e-4, 86970.0e-8, 10370.0e-8,  309.3e-8,  3550.0e-6,   691.1e-6,   3949.0e-6,   1059.0e-6,  5643.0e-9),
    "hea_550":  (0.540, 0.300, 0.0125, 0.0240, 0.027, 211.76e-4,111900.0e-8, 10820.0e-8,  351.5e-8,  4146.0e-6,   721.3e-6,   4622.0e-6,   1107.0e-6,  7189.0e-9),
    "hea_600":  (0.590, 0.300, 0.0130, 0.0250, 0.027, 226.46e-4,141200.0e-8, 11270.0e-8,  397.8e-8,  4787.0e-6,   751.4e-6,   5350.0e-6,   1156.0e-6,  8978.0e-9),
    "hea_650":  (0.640, 0.300, 0.0135, 0.0260, 0.027, 241.64e-4,175200.0e-8, 11720.0e-8,  448.0e-8,  5474.0e-6,   781.4e-6,   6136.0e-6,   1205.0e-6, 11030.0e-9),
    "hea_700":  (0.690, 0.300, 0.0145, 0.0270, 0.027, 260.50e-4,215300.0e-8, 12180.0e-8,  513.9e-8,  6241.0e-6,   811.4e-6,   7032.0e-6,   1256.0e-6, 13350.0e-9),
    "hea_800":  (0.790, 0.300, 0.0150, 0.0280, 0.030, 285.80e-4,303400.0e-8, 12640.0e-8,  597.4e-8,  7682.0e-6,   842.5e-6,   8699.0e-6,   1312.0e-6, 18290.0e-9),
    "hea_900":  (0.890, 0.300, 0.0160, 0.0300, 0.030, 320.50e-4,422100.0e-8, 13550.0e-8,  737.8e-8,  9485.0e-6,   903.3e-6,  10810.0e-6,   1414.0e-6, 24960.0e-9),
    "hea_1000": (0.990, 0.300, 0.0165, 0.0310, 0.030, 346.80e-4,553800.0e-8, 14000.0e-8,  822.4e-8, 11190.0e-6,   933.6e-6,  12820.0e-6,   1469.0e-6, 31410.0e-9),
}

_HEB_DATA: dict[str, tuple] = {
    "heb_100":  (0.100, 0.100, 0.0060, 0.0100, 0.012,  26.04e-4,   449.5e-8,   167.3e-8,    9.250e-8,   89.91e-6,   33.45e-6,   104.2e-6,    51.42e-6,    3.375e-9),
    "heb_120":  (0.120, 0.120, 0.0065, 0.0110, 0.012,  34.01e-4,   864.4e-8,   317.5e-8,   13.84e-8,   144.1e-6,    52.92e-6,   165.2e-6,     80.97e-6,    9.41e-9),
    "heb_140":  (0.140, 0.140, 0.0070, 0.0120, 0.012,  42.96e-4,  1509.0e-8,   549.7e-8,   20.06e-8,   215.6e-6,    78.52e-6,   245.4e-6,    119.8e-6,    22.48e-9),
    "heb_160":  (0.160, 0.160, 0.0080, 0.0130, 0.015,  54.25e-4,  2492.0e-8,   889.2e-8,   31.24e-8,   311.5e-6,   111.2e-6,   354.0e-6,    170.0e-6,    47.94e-9),
    "heb_180":  (0.180, 0.180, 0.0085, 0.0140, 0.015,  65.25e-4,  3831.0e-8,  1363.0e-8,   42.16e-8,   425.7e-6,   151.4e-6,   481.4e-6,    231.0e-6,    93.75e-9),
    "heb_200":  (0.200, 0.200, 0.0090, 0.0150, 0.018,  78.08e-4,  5696.0e-8,  2003.0e-8,   59.28e-8,   569.6e-6,   200.3e-6,   642.5e-6,    305.8e-6,   171.1e-9),
    "heb_220":  (0.220, 0.220, 0.0095, 0.0160, 0.018,  91.04e-4,  8091.0e-8,  2843.0e-8,   76.57e-8,   735.5e-6,   258.5e-6,   827.0e-6,    393.9e-6,   295.4e-9),
    "heb_240":  (0.240, 0.240, 0.0100, 0.0170, 0.021, 106.00e-4, 11260.0e-8,  3923.0e-8,  102.7e-8,    938.3e-6,   326.9e-6,  1053.0e-6,    498.4e-6,   486.9e-9),
    "heb_260":  (0.260, 0.260, 0.0100, 0.0175, 0.024, 118.40e-4, 14920.0e-8,  5135.0e-8,  123.8e-8,   1148.0e-6,   395.0e-6,  1283.0e-6,    602.2e-6,   753.7e-9),
    "heb_280":  (0.280, 0.280, 0.0105, 0.0180, 0.024, 131.40e-4, 19270.0e-8,  6595.0e-8,  143.7e-8,   1376.0e-6,   471.0e-6,  1534.0e-6,    717.6e-6,  1130.0e-9),
    "heb_300":  (0.300, 0.300, 0.0110, 0.0190, 0.027, 149.10e-4, 25170.0e-8,  8563.0e-8,  185.0e-8,   1678.0e-6,   570.9e-6,  1869.0e-6,    870.1e-6,  1688.0e-9),
    "heb_320":  (0.320, 0.300, 0.0115, 0.0205, 0.027, 161.30e-4, 30820.0e-8,  9239.0e-8,  225.1e-8,   1926.0e-6,   615.9e-6,  2149.0e-6,    939.1e-6,  2069.0e-9),
    "heb_340":  (0.340, 0.300, 0.0120, 0.0215, 0.027, 170.90e-4, 36660.0e-8,  9690.0e-8,  257.2e-8,   2156.0e-6,   646.0e-6,  2408.0e-6,    985.7e-6,  2454.0e-9),
    "heb_360":  (0.360, 0.300, 0.0125, 0.0225, 0.027, 180.60e-4, 43190.0e-8, 10140.0e-8,  292.5e-8,   2400.0e-6,   676.1e-6,  2683.0e-6,   1032.0e-6,  2883.0e-9),
    "heb_400":  (0.400, 0.300, 0.0135, 0.0240, 0.027, 197.78e-4, 57680.0e-8, 10820.0e-8,  355.7e-8,   2884.0e-6,   721.3e-6,  3232.0e-6,   1104.0e-6,  3817.0e-9),
    "heb_450":  (0.450, 0.300, 0.0140, 0.0260, 0.027, 218.00e-4, 79890.0e-8, 11720.0e-8,  440.5e-8,   3551.0e-6,   781.4e-6,  3982.0e-6,   1198.0e-6,  5258.0e-9),
    "heb_500":  (0.500, 0.300, 0.0145, 0.0280, 0.027, 238.64e-4,107200.0e-8, 12620.0e-8,  538.4e-8,   4287.0e-6,   841.6e-6,  4815.0e-6,   1292.0e-6,  7018.0e-9),
    "heb_550":  (0.550, 0.300, 0.0150, 0.0290, 0.027, 254.10e-4,136700.0e-8, 13080.0e-8,  600.3e-8,   4971.0e-6,   871.8e-6,  5591.0e-6,   1341.0e-6,  8856.0e-9),
    "heb_600":  (0.600, 0.300, 0.0155, 0.0300, 0.027, 270.00e-4,171000.0e-8, 13530.0e-8,  667.2e-8,   5701.0e-6,   902.0e-6,  6425.0e-6,   1391.0e-6, 10970.0e-9),
    "heb_650":  (0.650, 0.300, 0.0160, 0.0310, 0.027, 286.30e-4,210600.0e-8, 13980.0e-8,  739.2e-8,   6480.0e-6,   932.0e-6,  7320.0e-6,   1441.0e-6, 13360.0e-9),
    "heb_700":  (0.700, 0.300, 0.0170, 0.0320, 0.027, 306.40e-4,256900.0e-8, 14440.0e-8,  830.5e-8,   7340.0e-6,   962.7e-6,  8327.0e-6,   1495.0e-6, 16060.0e-9),
    "heb_800":  (0.800, 0.300, 0.0175, 0.0330, 0.030, 334.20e-4,359100.0e-8, 14900.0e-8,  945.3e-8,   8977.0e-6,   994.0e-6, 10230.0e-6,   1553.0e-6, 21540.0e-9),
    "heb_900":  (0.900, 0.300, 0.0185, 0.0350, 0.030, 371.30e-4,494100.0e-8, 15820.0e-8, 1138.0e-8,  10980.0e-6,  1054.0e-6, 12580.0e-6,   1658.0e-6, 28860.0e-9),
    "heb_1000": (1.000, 0.300, 0.0190, 0.0360, 0.030, 400.00e-4,644700.0e-8, 16280.0e-8, 1253.0e-8,  12890.0e-6,  1085.0e-6, 14860.0e-6,   1716.0e-6, 36230.0e-9),
}

_HEM_DATA: dict[str, tuple] = {
    "hem_100":  (0.120, 0.106, 0.0120, 0.0200, 0.012,  53.20e-4,  1143.0e-8,   399.2e-8,   68.21e-8,   190.4e-6,   75.31e-6,   235.8e-6,    115.5e-6,    9.93e-9),
    "hem_120":  (0.140, 0.126, 0.0125, 0.0210, 0.012,  66.40e-4,  2018.0e-8,   702.8e-8,   91.66e-8,   288.2e-6,  111.6e-6,    350.6e-6,    171.6e-6,   22.93e-9),
    "hem_140":  (0.160, 0.146, 0.0130, 0.0220, 0.012,  80.60e-4,  3291.0e-8,  1144.0e-8,  120.0e-8,    411.4e-6,  156.7e-6,    493.8e-6,    240.5e-6,   53.95e-9),
    "hem_160":  (0.180, 0.166, 0.0140, 0.0230, 0.015,  97.05e-4,  5098.0e-8,  1759.0e-8,  162.4e-8,    566.5e-6,  211.9e-6,    674.6e-6,    325.5e-6,  108.1e-9),
    "hem_180":  (0.200, 0.186, 0.0145, 0.0240, 0.015, 113.30e-4,  7483.0e-8,  2580.0e-8,  203.3e-8,    748.3e-6,  277.4e-6,    883.4e-6,    425.2e-6,  199.3e-9),
    "hem_200":  (0.220, 0.206, 0.0150, 0.0250, 0.018, 131.30e-4, 10640.0e-8,  3651.0e-8,  259.4e-8,    967.4e-6,  354.5e-6,   1135.0e-6,    543.2e-6,  346.3e-9),
    "hem_220":  (0.240, 0.226, 0.0155, 0.0260, 0.018, 149.40e-4, 14600.0e-8,  5012.0e-8,  315.4e-8,   1217.0e-6,  443.5e-6,   1419.0e-6,    678.6e-6,  572.7e-9),
    "hem_240":  (0.270, 0.248, 0.0180, 0.0320, 0.021, 199.60e-4, 24290.0e-8,  8153.0e-8,  624.8e-8,   1799.0e-6,  657.5e-6,   2117.0e-6,   1006.0e-6, 1153.0e-9),
    "hem_260":  (0.290, 0.268, 0.0180, 0.0325, 0.024, 219.60e-4, 31310.0e-8, 10450.0e-8,  719.3e-8,   2159.0e-6,  779.7e-6,   2524.0e-6,   1192.0e-6, 1728.0e-9),
    "hem_280":  (0.310, 0.288, 0.0185, 0.0330, 0.024, 240.20e-4, 39550.0e-8, 13160.0e-8,  807.3e-8,   2551.0e-6,  914.1e-6,   2966.0e-6,   1397.0e-6, 2520.0e-9),
    "hem_300":  (0.340, 0.310, 0.0210, 0.0390, 0.027, 303.10e-4, 59200.0e-8, 19400.0e-8, 1408.0e-8,   3482.0e-6, 1252.0e-6,   4078.0e-6,   1913.0e-6, 4386.0e-9),
    "hem_320":  (0.359, 0.309, 0.0210, 0.0400, 0.027, 312.00e-4, 68130.0e-8, 19710.0e-8, 1501.0e-8,   3796.0e-6, 1276.0e-6,   4435.0e-6,   1951.0e-6, 5004.0e-9),
    "hem_340":  (0.377, 0.309, 0.0210, 0.0400, 0.027, 315.80e-4, 76370.0e-8, 19710.0e-8, 1506.0e-8,   4052.0e-6, 1276.0e-6,   4717.0e-6,   1953.0e-6, 5584.0e-9),
    "hem_360":  (0.395, 0.308, 0.0210, 0.0400, 0.027, 318.80e-4, 84870.0e-8, 19520.0e-8, 1510.0e-8,   4297.0e-6, 1268.0e-6,   4989.0e-6,   1942.0e-6, 6137.0e-9),
    "hem_400":  (0.432, 0.307, 0.0210, 0.0400, 0.027, 325.80e-4,104100.0e-8, 19340.0e-8, 1515.0e-8,   4820.0e-6, 1260.0e-6,   5571.0e-6,   1934.0e-6, 7410.0e-9),
    "hem_450":  (0.478, 0.307, 0.0215, 0.0405, 0.027, 335.40e-4,131500.0e-8, 19550.0e-8, 1535.0e-8,   5501.0e-6, 1273.0e-6,   6331.0e-6,   1956.0e-6, 9251.0e-9),
    "hem_500":  (0.524, 0.306, 0.0220, 0.0410, 0.027, 344.30e-4,161900.0e-8, 19150.0e-8, 1539.0e-8,   6180.0e-6, 1252.0e-6,   7094.0e-6,   1932.0e-6,11190.0e-9),
    "hem_550":  (0.572, 0.306, 0.0220, 0.0420, 0.027, 354.40e-4,198000.0e-8, 19160.0e-8, 1561.0e-8,   6923.0e-6, 1252.0e-6,   7933.0e-6,   1936.0e-6,13530.0e-9),
    "hem_600":  (0.620, 0.305, 0.0220, 0.0420, 0.027, 363.70e-4,237400.0e-8, 18980.0e-8, 1564.0e-8,   7660.0e-6, 1244.0e-6,   8772.0e-6,   1930.0e-6,15910.0e-9),
    "hem_650":  (0.668, 0.305, 0.0220, 0.0420, 0.027, 374.40e-4,281700.0e-8, 18980.0e-8, 1567.0e-8,   8434.0e-6, 1244.0e-6,   9657.0e-6,   1937.0e-6,18510.0e-9),
    "hem_700":  (0.716, 0.304, 0.0215, 0.0405, 0.027, 383.00e-4,329300.0e-8, 18800.0e-8, 1525.0e-8,   9198.0e-6, 1237.0e-6, 10540.0e-6,   1929.0e-6,21300.0e-9),
    "hem_800":  (0.814, 0.303, 0.0210, 0.0400, 0.030, 404.30e-4,442600.0e-8, 18630.0e-8, 1495.0e-8,  10870.0e-6, 1230.0e-6, 12490.0e-6,   1929.0e-6,28930.0e-9),
    "hem_900":  (0.910, 0.302, 0.0210, 0.0400, 0.030, 423.60e-4,570400.0e-8, 18450.0e-8, 1502.0e-8,  12540.0e-6, 1222.0e-6, 14440.0e-6,   1929.0e-6,37810.0e-9),
    "hem_1000": (1.008, 0.302, 0.0210, 0.0400, 0.030, 444.20e-4,722300.0e-8, 18460.0e-8, 1502.0e-8,  14330.0e-6, 1223.0e-6, 16560.0e-6,   1942.0e-6,48360.0e-9),
}


def _build_steel_profiles() -> dict[str, Section]:
    out: dict[str, Section] = {}
    for series, data in (("IPE", _IPE_DATA), ("HEA", _HEA_DATA),
                          ("HEB", _HEB_DATA), ("HEM", _HEM_DATA)):
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
    "shell_t600": Section(id="shell_t600", name="Shell t=600mm",
                          type="custom", A=0.6, Iy=0, Iz=0, J=0, thickness=0.60),
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
