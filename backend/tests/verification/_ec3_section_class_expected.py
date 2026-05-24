"""Expected EC3 §5.5 section class — ground truth derivata manualmente
da EN 1993-1-1 Tab. 5.2 applicata al catalogo profili reale di FEA Pro.

Catalogo reale (`backend/schemas/material.py`):
- IPE: 100, 200, 240, 270, 300, 360, 400, 500 (8 profili)
- HEA: 100, 200, 240, 300 (4 profili)
- HEB: 100, 200, 240, 300 (4 profili)

NB: il brief v2.4.8 stimava 18 IPE + 19 HEA, ma il codebase ne ha 8+4+4.
Coverage adattata al catalogo reale. Brief future quando catalogo verrà
esteso (es. IPE 80/120/140/.../600 dal catalogo Arcelor completo).

Convenzione tupla: (sid, fy_MPa, expected_class_compression, expected_class_bending)

Per ogni profilo i valori expected sono **calcolati a mano** applicando
le formule EC3 §5.5 alle dimensioni del catalogo (h, b, tw, tf, r).
Procedura:
    ε = √(235 / fy)
    c_f = (b - tw - 2r) / 2                 [ala outstand]
    c_w = h - 2 tf - 2 r                    [anima netta]
    flange_class = thresholds(c_f/tf, ε, "outstand")
    web_class = thresholds(c_w/tw, ε, loading)
    section_class = max(flange_class, web_class)
Thresholds (Tab. 5.2 EN 1993-1-1):
    Outstand flange (compr.): 9ε / 10ε / 14ε     (Cl 1 / 2 / 3, else 4)
    Web (compression):       33ε / 38ε / 42ε
    Web (bending):           72ε / 83ε / 124ε
"""

# IPE S235 (ε = 1.0) — manuale da EC3 Tab. 5.2
IPE_S235 = [
    # sid       fy   exp_comp  exp_bend
    ("ipe_100", 235, 1, 1),   # c_f/tf=3.24, c_w/tw=18.2 → Cl 1
    ("ipe_200", 235, 1, 1),   # c_f/tf=4.14, c_w/tw=28.4 → Cl 1
    ("ipe_240", 235, 1, 1),   # c_f/tf=4.28, c_w/tw=30.7 → Cl 1
    ("ipe_270", 235, 2, 1),   # c_w/tw=33.3 → comp Cl 2 (>33), bend Cl 1
    ("ipe_300", 235, 2, 1),   # c_w/tw=35.0 → comp Cl 2
    ("ipe_360", 235, 2, 1),   # c_w/tw=37.3 → comp Cl 2 (<38)
    ("ipe_400", 235, 3, 1),   # c_w/tw=38.5 → comp Cl 3 (>38)
    ("ipe_500", 235, 3, 1),   # c_w/tw=41.8 → comp Cl 3 (<42, borderline)
]

# HEA S235 (ε = 1.0)
HEA_S235 = [
    ("hea_100", 235, 1, 1),   # c_f/tf=4.44, c_w/tw=11.2 → Cl 1
    ("hea_200", 235, 1, 1),   # c_f/tf=7.88, c_w/tw=20.6 → Cl 1
    ("hea_240", 235, 1, 1),   # c_f/tf=7.94, c_w/tw=21.9 → Cl 1
    ("hea_300", 235, 1, 1),   # c_f/tf=8.48, c_w/tw=24.5 → Cl 1
]

# HEB S235 (ε = 1.0) — più tozzi di HEA, sempre Cl 1
HEB_S235 = [
    ("heb_100", 235, 1, 1),   # c_f/tf=3.50, c_w/tw=9.33 → Cl 1
    ("heb_200", 235, 1, 1),   # c_f/tf=5.17, c_w/tw=14.9 → Cl 1
    ("heb_240", 235, 1, 1),   # c_f/tf=5.53, c_w/tw=16.4 → Cl 1
    ("heb_300", 235, 1, 1),   # c_f/tf=6.18, c_w/tw=18.9 → Cl 1
]

# IPE S355 (ε = √(235/355) = 0.814) — più severo per la compressione anima
# Thresholds attesi: 33ε=26.9, 38ε=30.9, 42ε=34.2, 72ε=58.6, 83ε=67.5, 124ε=100.9
IPE_S355 = [
    ("ipe_100", 355, 1, 1),   # c_w/tw=18.2 → Cl 1 in compr (<26.9)
    ("ipe_200", 355, 2, 1),   # c_w/tw=28.4 → comp Cl 2 (>26.9, <30.9)
    ("ipe_240", 355, 2, 1),   # c_w/tw=30.7 → comp Cl 2 (borderline 30.9)
    ("ipe_270", 355, 3, 1),   # c_w/tw=33.3 → comp Cl 3 (>30.9, <34.2)
    ("ipe_300", 355, 4, 1),   # c_w/tw=35.0 → comp Cl 4 (>34.2)
    ("ipe_360", 355, 4, 1),   # c_w/tw=37.3 → comp Cl 4
    ("ipe_400", 355, 4, 1),   # c_w/tw=38.5 → comp Cl 4
    ("ipe_500", 355, 4, 1),   # c_w/tw=41.8 → comp Cl 4
]

# HEA S355 (ε = 0.814)
HEA_S355 = [
    ("hea_100", 355, 1, 1),   # c_w/tw=11.2 → Cl 1
    ("hea_200", 355, 2, 2),   # c_f/tf=7.88 (>7.32) → flange Cl 2; web Cl 1
    ("hea_240", 355, 2, 2),   # c_f/tf=7.94 → flange Cl 2
    ("hea_300", 355, 3, 3),   # c_f/tf=8.48 → flange Cl 3 (>8.14, <11.4)
]

# HEB S355
HEB_S355 = [
    ("heb_100", 355, 1, 1),
    ("heb_200", 355, 1, 1),
    ("heb_240", 355, 1, 1),
    ("heb_300", 355, 1, 1),
]
