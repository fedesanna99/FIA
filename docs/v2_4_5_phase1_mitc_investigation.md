# v2.4.5 · Phase 1 Investigation — MITC K_shear convention

**Data**: 2026-05-24
**Sprint**: `v2.4.5-mitc-shear-and-sign-calibration`
**Phase**: 1 di 4
**Tipo**: investigation + diagnostic (no fix in this phase)

> **Output**: root cause confermato = **Scenario D combinato** (DOF swap
> idx 1 ↔ idx 2 + sign flip γ_xz) in `_Bs_at`. Fix isolato e chirurgico
> in 2 righe.

---

## Mappatura codice rilevante

```
backend/core/elements/shell_quad4.py:
  ShellQuad4._bending_stiffness (riga 81-110)
    riga  88: Ds = (5/6) · E·t / [2(1+ν)] · I     ← k_s presente
    riga 101: Bb[0, 3*i+1] = dN[0]                ← κ_x da DOF idx 1
    riga 102: Bb[1, 3*i+2] = dN[1]                ← κ_y da DOF idx 2
    riga 105: Bs[0, 3*i]   = dN[0]                ← γ_xz = ∂w/∂x ...
    riga 106: Bs[0, 3*i+1] = -N[i]                ← ... - (DOF idx 1)
    riga 107: Bs[1, 3*i]   = dN[1]                ← γ_yz = ∂w/∂y ...
    riga 108: Bs[1, 3*i+2] = -N[i]                ← ... - (DOF idx 2)

backend/core/elements/shell_quad4_mitc.py:
  ShellQuad4MITC._Bs_at (riga 111-130)
    riga 126: Bs[0, 3*i]   = dN[0]                ← γ_xz = ∂w/∂x ...
    riga 127: Bs[0, 3*i+2] = +N[i]                ← ... + (DOF idx 2)  ❌
    riga 128: Bs[1, 3*i]   = dN[1]                ← γ_yz = ∂w/∂y ...
    riga 129: Bs[1, 3*i+1] = -N[i]                ← ... - (DOF idx 1)  ❌
  ShellQuad4MITC._bending_stiffness (riga 133-177)
    riga 141: Ds = (5/6) · E·t / [2(1+ν)] · I     ← k_s presente
    riga 164: Bb[0, 3*i+1] = dN[0]                ← κ_x da DOF idx 1 (= Q4)
    riga 165: Bb[1, 3*i+2] = dN[1]                ← κ_y da DOF idx 2 (= Q4)
```

---

## Convention comparata

| Aspetto | Q4 (`shell_quad4.py`) | MITC (`shell_quad4_mitc.py`) |
|---|---|---|
| `D_s` scalare | `(5/6)·E·t / [2(1+ν)]` | `(5/6)·E·t / [2(1+ν)]` |
| `Bb` row κ_x | `Bb[0, 3*i+1] = dN[0]` | `Bb[0, 3*i+1] = dN[0]` |
| `Bb` row κ_y | `Bb[1, 3*i+2] = dN[1]` | `Bb[1, 3*i+2] = dN[1]` |
| `Bs` row γ_xz, parte rot | `Bb[0, 3*i+1] = -N[i]` (idx 1, -) | **`Bs[0, 3*i+2] = +N[i]`** (idx 2, +) |
| `Bs` row γ_yz, parte rot | `Bs[1, 3*i+2] = -N[i]` (idx 2, -) | **`Bs[1, 3*i+1] = -N[i]`** (idx 1, -) |

In sostanza:
- Q4: γ_xz coppia con DOF idx 1, segno −. γ_yz con DOF idx 2, segno −.
- MITC: γ_xz coppia con DOF idx 2, segno **+**. γ_yz con DOF idx 1, segno −.

Q4 è coerente con `B_b`: la stessa DOF idx 1 entra in κ_x (curvatura associata a σ_xx) e in γ_xz. Mindlin Bathe §5.4 effettivo, dove `θ_y` di Bathe coincide con il nome locale `rx` (per via della scelta DOF locali). MITC ha **DOF index swap + sign flip** sulla riga γ_xz.

---

## Diagnostic numerico

`backend/scripts/mitc_kshear_diagnostic.py` esegue:

1. **D_s sanity**: confermato `(5/6)·E·t/[2(1+ν)]` = `6.73e9 Pa·m` in entrambi.
2. **Energy probe ry=1**: identica fra Q4 e MITC (3.37e9 J). Atteso, perché `u^T K u` è quadratica e simmetrica sui DOF permutati.
3. **Reaction probe `w(x)=x`**: rivela la differenza.

```
Q4   reaction per nodo (f_w, M_rx, M_ry):
  ( ±3.37e9,  -1.68e9,   0.00e0 )    # M sul DOF idx 1 (rx) con segno −

MITC reaction per nodo:
  ( ±3.37e9,   0.00e0,  +1.68e9 )    # M sul DOF idx 2 (ry) con segno +
```

→ **DOF swap confermato** (Q4 carica idx 1, MITC carica idx 2) **e sign flip confermato** (Q4 −, MITC +).

---

## Verdetto sui 4 scenari di hypothesis

| Scenario | Esito | Note |
|---|---|---|
| A · `k_s` mancante | ESCLUSO | k_s = 5/6 presente in entrambi i file (riga 88 Q4, riga 141 MITC). |
| B · Tying point sign | CONFERMATO derivato | Tying points usano `_Bs_at`, ereditano il bug. |
| C · Scaling `t` vs `t³` | ESCLUSO | K_shear usa `t` lineare (corretto per Reissner), K_bend usa `t³` (corretto). |
| D · Sign / convention mismatch | **CONFERMATO PRIMARIO** | DOF index swap (idx 1 ↔ idx 2) + sign flip γ_xz. |

**Root cause primario**: Scenario D in `_Bs_at`. Lo Scenario B è una conseguenza, non un bug indipendente: i tying points stessi sono semplicemente valutazioni di `_Bs_at` ai 4 punti `(ξ, η)` predeterminati, quindi un fix in `_Bs_at` corregge automaticamente anche i tying.

---

## Spiegazione di "perché MITC pre-v2.4.4 aveva segno corretto"

Pre-v2.4.4 (Q4 e MITC con sign formula vecchia `σ_top = σ_m + 6M/t²`):
- Q4: B_b corretta → M_x corretto → σ_top sbagliato (sign formula errata) → segno **sbagliato**
- MITC: B_b corretta + B_s con sign flip → genera campo di rotazioni θ con segno opposto → M_x con segno opposto → σ_top **fortuitamente corretto** perché il segno della formula veniva compensato dal segno opposto di M_x.

Post-v2.4.4 (formula corretta `σ_top = σ_m − 6M/t²`):
- Q4: M_x corretto + formula corretta → σ_top **corretto** ✅
- MITC: M_x sbagliato (sign flip in B_s che propaga a B_b → ε_b → M) + formula corretta → σ_top **sbagliato** ❌

Il fix di v2.4.4 ha rimosso la compensazione fortuita, esponendo finalmente il bug latente in `_Bs_at`.

---

## Fix Phase 2 proposto

Modificare 2 righe in `_Bs_at` per allinearsi alla convenzione Q4 (Mindlin Bathe §5.4):

```python
# Prima:
Bs[0, 3 * i + 2] = N[i]      # γ_xz contribution: +DOF idx 2
Bs[1, 3 * i + 1] = -N[i]     # γ_yz contribution: -DOF idx 1

# Dopo:
Bs[0, 3 * i + 1] = -N[i]     # γ_xz contribution: -DOF idx 1
Bs[1, 3 * i + 2] = -N[i]     # γ_yz contribution: -DOF idx 2
```

Tutto il resto di `_Bs_at` e `_bending_stiffness` resta invariato (i tying points ereditano automaticamente la correzione, K_b è invariante).

**Impatto atteso fix**:
- MITC σ_y_top LE10: da +75 MPa → ~−75 MPa (sign atteso corretto). Magnitudo coerente con valori Q4 fix-residual (309% target). Calibrazione poi entro Reissner-Mindlin analytical su 3 thickness ratios (Phase 3).
- MITC w_max LE10: incognita. Si potrebbe riallineare automaticamente a Q4 (fattore ~37× cancellato) **se** la causa del 37× era effettivamente il sign mismatch che generava un campo di rotazioni mal-orientato sotto la pressione.

---

## Riferimenti

- v2.4.4 closure (sintesi sorpresa): `docs/v2_4_4_shell_sign_and_mitc_cluster_report.md`
- Sintomo origine 37×: `docs/v2_4_3a_shell_pressure_mitc_fix_report.md` sezione "Anomalia inattesa"
- Diagnostic Q4: `backend/scripts/shell_b_bending_convention_diagnostic.py`
- Diagnostic MITC (questa fase): `backend/scripts/mitc_kshear_diagnostic.py`
