# v2.4.1-ec2-stirrups-fix · Investigation report (Phase 1)

**Data**: 2026-05-24
**Branch**: test (SHA: `5c11672`)
**Tipo**: investigation only — **zero modifiche al codice**

> **TL;DR**: il fix è chirurgico. 1 solo caller produttivo (`verify_ext.py:96`),
> V_Ed **è già disponibile** nello schema API ma non passato. Nessun altro
> pattern `needs_X = (A_X > 0)` ambiguo nel codice. Raccomandazione: **Option A**
> (add `V_Ed: float | None = None` a `shear_check` con backward-compat).

---

## Sezione 1 · Caller di `shear_check`

### T1.1+T1.2 · grep risultati

```
backend/api/routes/verify_ext.py:18:  from core.verification.ec2.shear import shear_check
backend/api/routes/verify_ext.py:96:  res = shear_check(b_w=..., d=..., A_sl=..., fck=..., A_sw=..., s=..., fywk=..., cot_theta=..., sigma_cp=...)
backend/core/verification/ec2/__init__.py:6: re-export (no caller)
backend/tests/verification/test_ec2_shear.py:126,132,143: 3 chiamate di test
```

### Caller dettaglio

| # | File:riga | Chiamata attuale | V_Ed disponibile? |
|---|---|---|---|
| 1 | `backend/api/routes/verify_ext.py:96` | `shear_check(b_w, d, A_sl, fck, A_sw, s, fywk, cot_theta, sigma_cp)` | **SÌ — già in `EC2ShearRequest.V_Ed` (riga 90), ma non passato!** |
| 2 | `tests/verification/test_ec2_shear.py:126` | `shear_check(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=25e6)` (no stirrups, no V_Ed) | No (test capacity-side) |
| 3 | `tests/verification/test_ec2_shear.py:132` | `shear_check(..., A_sw=1.005e-4, s=0.15, fywk=450e6)` | No (test capacity-side) |
| 4 | `tests/verification/test_ec2_shear.py:143` | `shear_check(..., A_sw=20e-4, s=0.05, fywk=450e6)` | No (test capacity-side) |

### Conclusioni T1

- **Numero caller produttivi**: 1 (`verify_ext.py:96`)
- **Caller test**: 3 (testano `V_Rd_c/V_Rd_s/V_Rd_max` capacity-side, non interessati a V_Ed)
- **Caller con V_Ed disponibile**: 1/1 produttivo
- **Caller senza V_Ed**: 3/3 test (legittimo: test capacity-only)
- **Strategia compatibilità**: aggiungere `V_Ed: float | None = None` default → zero breakage sui test esistenti.

### Scoperta importante T1

L'endpoint `POST /api/verify/ec2/shear` (`verify_ext.py:80-114`):

```python
class EC2ShearRequest(BaseModel):
    b_w: float = Field(..., gt=0)
    d: float = Field(..., gt=0)
    A_sl: float = Field(..., gt=0)
    fck: float = Field(..., gt=0)
    A_sw: float = Field(default=0.0, ge=0)
    s: float = Field(default=0.2, gt=0)
    fywk: float = Field(default=450e6, gt=0)
    cot_theta: float = Field(default=2.5, ge=1.0, le=2.5)
    sigma_cp: float = Field(default=0.0)
    V_Ed: float = Field(default=0.0, ge=0, description="Taglio sollecitante [N]")  # ← già qui!
```

L'API **riceve già `V_Ed`** dal frontend ma `shear_check()` non lo usa. La response
calcola `UR = req.V_Ed / res.V_Rd` (riga 103) e lo restituisce — quindi il **frontend
oggi mostra contemporaneamente "UR=1.5 (FAIL rosso)" e "staffe: Non nec."** quando
l'utente fornisce A_sw=0 e V_Ed > V_Rd_c. Output **logicamente incoerente**, esattamente
il bug #6 documentato nel audit.

---

## Sezione 2 · Pattern ambigui simili in altre verifiche

### T2.1 — `needs_*` in `backend/core/verification/`

Solo **1 occorrenza**:

```
backend/core/verification/ec2/shear.py:149: needs_stirrups=needs,
```

### T2.2 — `requires_*`

Zero occorrenze.

### T2.3 — `A_* > 0` (decisioni booleane da armatura presente)

Solo **1 occorrenza**:

```
backend/core/verification/ec2/shear.py:138: if A_sw > 0:
```

Che è esattamente la stessa riga del bug #6.

### T2.4 — Inventario file di verifica

```
backend/core/verification/
├── ec2/                  (bending.py + shear.py)
├── ec3/                  (combined.py + ltb.py + resistance.py +
│                          section_classification.py + serviceability.py +
│                          stability.py)
├── ec5/                  (resistance.py + timber_grades.py)
└── ec8/                  (behavior_factor.py + combinations.py +
                          spectrum.py + zones.py)
```

### Conclusioni T2 — Lista bug paralleli candidate

| File:riga | Pattern | Severità potenziale | Note |
|---|---|---|---|
| (vuoto) | — | — | **Nessun pattern `needs_X = (A_X > 0)` analogo in altri file verifica.** EC3 usa `UR/value/chi` numerici, EC5 idem, EC8 spettro pure formula. Il bug #6 è isolato a `ec2/shear.py`. |

**Bug paralleli da tracciare in BACKLOG**: nessuno. Il fix di #6 chiude completamente
questa classe di anti-pattern.

---

## Sezione 3 · Impatto frontend & schema ShearResult

### T3.1 — Definizione `ShearResult` attuale

```python
@dataclass(frozen=True)
class ShearResult:
    V_Rd: float            # [N] valore di calcolo (governante)
    V_Rd_c: float          # senza staffe
    V_Rd_s: float          # con staffe (se presenti)
    V_Rd_max: float        # limite bielle
    needs_stirrups: bool
    notes: str = ""
```

### T3.2 — Serializzazione

`ShearResult` è restituita da `shear_check()` SOLO al chiamante API
(`verify_ext.py:96`). L'API costruisce un dict response manuale (non usa Pydantic
response_model), quindi i campi sono già "spianati" prima di andare al frontend.

Aggiungere campi a `ShearResult` (es. `UR_no_stirrups: float`) **non rompe** il
contratto API perché l'API serializza esplicitamente solo i campi che vuole esporre.

### T3.3 — Frontend uso di `needs_stirrups`

```
frontend/src/api/verify_ext.ts:42:   needs_stirrups: boolean;
frontend/src/components/panels/EC2Panel.tsx:172:
    <Stat label="staffe" value={r.needs_stirrups ? "Necessarie" : "Non nec."} />
```

Mostrato come badge testuale nella card EC2:

```
[ V_Rd: 270.5 kN ]  [ UR: 1.524 (FAIL rosso) ]  [ staffe: Non nec. (??)] ← incoerente
[ V_Rd,c: 67.2 kN ] [ V_Rd,s: 0 kN ]            [ V_Rd,max: 328 kN ]
```

**Conferma sul campo**: l'utente strutturista vede UR=1.52 (≈ collasso a taglio)
con "staffe Non nec." dichiarato — output ingannevole.

### Raccomandazione su schema

Mantenere campo `needs_stirrups: bool` con **nuova semantica strutturale**:

```
needs_stirrups = (V_Ed > V_Rd_c) if V_Ed is not None else (A_sw > 0)
```

- Backward-compat con caller test (V_Ed=None → fallback al vecchio comportamento)
- Frontend non cambia (legge stesso campo, ma ora significa "strutturalmente necessarie")
- Niente field rename → no breaking change su API o ts type

Eventuali campi additivi opzionali (NICE-to-have, non bloccanti):
- `UR_no_stirrups: float = V_Ed / V_Rd_c` (se V_Ed fornito) — chiarisce il rapporto
- `has_stirrups_modeled: bool = (A_sw > 0)` — distingue intent utente da check strutturale

Non li aggiungo come obbligatori; lascio decidere al brief Phase 2.

---

## Sezione 4 · Decisione tecnica per Fase 2

### Option A · Add `V_Ed: float | None = None` a `shear_check` (RACCOMANDATA)

**Pro**:
- 1 solo caller produttivo da aggiornare (verify_ext.py:96)
- V_Ed già disponibile nell'API request schema (zero refactor caller)
- Backward-compat: V_Ed=None mantiene comportamento attuale → test esistenti
  continuano a passare senza modifiche
- Frontend non cambia (stesso campo `needs_stirrups`, semantica corretta)

**Contro**:
- "Doppia semantica" (V_Ed fornito vs no) può creare confusione → mitigato
  con docstring chiara
- Optional `V_Ed` rende facile dimenticare di passarlo

**Implementazione fase 2 prevista** (NON ancora applicata):

```python
def shear_check(
    b_w: float, d: float, A_sl: float, fck: float,
    A_sw: float = 0.0, s: float = 1.0, fywk: float = 450e6,
    cot_theta: float = 2.5,
    sigma_cp: float = 0.0,
    V_Ed: float | None = None,           # NUOVO
) -> ShearResult:
    Vc = V_Rd_c(...)
    Vmax = V_Rd_max(...)
    if A_sw > 0:
        Vs = V_Rd_s(...)
        V_Rd = min(Vs, Vmax)
    else:
        Vs = 0.0
        V_Rd = Vc

    # Nuova logica needs_stirrups
    if V_Ed is not None:
        # Semantica strutturale: servono staffe se V_Ed eccede capacità senza staffe
        needs = V_Ed > Vc
    else:
        # Fallback retrocompatibile: presenza staffe modellate
        needs = A_sw > 0

    return ShearResult(V_Rd=V_Rd, V_Rd_c=Vc, V_Rd_s=Vs, V_Rd_max=Vmax,
                      needs_stirrups=needs, notes=...)
```

E in `verify_ext.py:96`:
```python
res = shear_check(
    b_w=req.b_w, d=req.d, A_sl=req.A_sl, fck=req.fck,
    A_sw=req.A_sw, s=req.s, fywk=req.fywk,
    cot_theta=req.cot_theta, sigma_cp=req.sigma_cp,
    V_Ed=req.V_Ed,    # ← aggiunto
)
```

**Test nuovi richiesti** in `test_ec2_shear.py`:
1. `test_needs_stirrups_true_when_V_Ed_exceeds_V_Rd_c_with_no_stirrups`
2. `test_needs_stirrups_false_when_V_Ed_below_V_Rd_c_with_no_stirrups`
3. `test_backward_compat_no_V_Ed_falls_back_to_A_sw_gt_0`
4. `test_api_endpoint_passes_V_Ed_to_check` (integration test)

**Stima fase 2**: 2-3 ore (codice + 4 test + API wiring + verifica regression).

### Option B · Refactor caller prima

**Non necessaria**: il solo caller produttivo HA già V_Ed. Skipped.

### Option C · Solo rinomina campi

**Sconsigliata**: lascia il bug strutturale presente. Soluzione cosmetica.

### Scelgo: **Option A**

Motivazione: minimo invasiva, backward-compat garantita, fix strutturalmente
corretto, zero refactor caller. La doppia-semantica V_Ed-present/None è
accettabile perché il default è già "V_Ed=0.0" lato API (Pydantic Field), quindi
in pratica il fallback non viene mai usato in produzione.

---

## Allegati · diff stats

Zero modifiche al codice in questa fase. Solo creato
`docs/v2_4_1_investigation_report.md`.

```
$ git diff HEAD --stat
docs/v2_4_1_investigation_report.md | <N> +++++++++++
1 file changed, <N> insertions(+)
```
