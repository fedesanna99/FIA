# v2.4.4 · Phase 1 Investigation — B_b shared vs override

**Data**: 2026-05-24
**Sprint**: v2.4.4-shell-sign-and-mitc-cluster
**Phase**: 1 di 5
**Tipo**: investigation only (no code modified)

> **Output**: identificato **Scenario II — B_b duplicato (non override
> formale)**. Fix sign sarà isolato MA richiederà replica in entrambi i
> file Q4 + MITC. Richiesta conferma utente prima di Phase 2.

---

## Mappatura codice rilevante

```
backend/core/elements/shell_quad4.py:
  class ShellQuad4:                                      (riga 13)
    def _bending_stiffness(self):                        (riga 81-110)
       ↳ B_b inline costruita ai 4 Gauss points
       ↳ Bb[0, 3*i + 1] = dN[0]
       ↳ Bb[1, 3*i + 2] = dN[1]
       ↳ Bb[2, 3*i + 1] = dN[1]
       ↳ Bb[2, 3*i + 2] = dN[0]
    def stresses_at_nodes(self, u_global_24):           (riga 153, v2.4.3c)
       ↳ B_b inline IDENTICA a _bending_stiffness, ma usata linearmente
       ↳ M = Db @ (Bb @ u_bend)  ← qui sign conta!

backend/core/elements/shell_quad4_mitc.py:
  class ShellQuad4MITC:                                  (riga 36, NO parent)
    def _bending_stiffness(self):                        (riga 133-178)
       ↳ B_b inline ALGORITMICAMENTE IDENTICA a Q4 (linee 161-167)
       ↳ Differenza Q4↔MITC solo in B_s (tying points, riga 147-151)
    def stresses_at_nodes(self, u_global_24):           (riga 233, v2.4.3c)
       ↳ B_b inline duplicata identicamente
```

## Verdetto scenario · **Scenario II (B_b override formale = duplicato inline)**

`ShellQuad4MITC` **non eredita** da `ShellQuad4` (`class ShellQuad4MITC:`
senza parent → eredita solo da `object`). Le due classi sono indipendenti.

Tutte le 4 occorrenze di `B_b` sono **identiche** algoritmicamente
(stesso pattern `Bb[0, 3*i + 1] = dN[0]` etc.). Quindi:

- ✅ La **convenzione segno è la stessa** fra Q4 e MITC (entrambe `(+,+)`)
- ❌ Non c'è alcuna ereditarietà che propaghi automaticamente un fix

**Conseguenza pratica**: fix sign deve essere replicato in 4 punti
(2 file × 2 funzioni — `_bending_stiffness` e `stresses_at_nodes`).

## Osservazione importante: K_b è sign-invariant

`_bending_stiffness` usa `B_b` in forma bilineare:
```
K_b = ∫ B_b^T · D_p · B_b · detJ
```

Per cambio segno globale di `B_b`:
```
K_b(−B_b) = (−B_b)^T · D_p · (−B_b) = +B_b^T · D_p · B_b = K_b(+B_b)
```

→ **`K_b` invariante per cambio segno**. Cambiare segno in
`_bending_stiffness` NON ha effetto sui displacement `u`.

`stresses_at_nodes` invece usa `B_b` linearmente:
```
M = D_p · (B_b · u_bend)
```

→ Cambio segno qui PRODUCE cambio segno in `M` e quindi in `σ_top/bot`.

**Strategia ottimale**: fix mirato in `stresses_at_nodes` SOLO. Il `_bending_stiffness` può restare invariato (no effetto numerico). Riduce scope a 2 punti (Q4 stresses_at_nodes + MITC stresses_at_nodes), non 4.

## Convenzione attuale (corrente in entrambe le classi)

Per ogni nodo i del Q4 (DOF locale `[w, θ_x, θ_y]`, indici 0/1/2):

```python
Bb[0, 3*i + 1] = +dN[0]   # κ_x  = +∂θ_x/∂x   ← componente 0
Bb[1, 3*i + 2] = +dN[1]   # κ_y  = +∂θ_y/∂y   ← componente 1
Bb[2, 3*i + 1] = +dN[1]   # κ_xy parte θ_x
Bb[2, 3*i + 2] = +dN[0]   # κ_xy parte θ_y
```

Questa è la convenzione **Mindlin standard "Bathe FEM Procedures §5.4"**
con `θ` definito come "section rotation" tale che `γ_xz = ∂w/∂x − θ_x`
(coerente con `Bs[0, 3*i + 1] = -N[i]` in riga 106 di `_bending_stiffness`).

In questa convenzione `θ_x = ∂w/∂x` al limite Kirchhoff (no shear).
Per piastra in flessione verso il basso (w < 0):
- `∂w/∂x` cambia segno attraverso il centro (positivo a sx, negativo a dx)
- al centro `θ_x ≈ 0` (simmetria)
- al bordo `θ_x ≠ 0`

`κ_x = ∂θ_x/∂x` rappresenta la **derivata seconda di w** (curvatura
seconda). Per piastra concava verso il basso (w<0 al centro):
`∂²w/∂x² > 0` al centro (curva apre verso l'alto).

→ Al centro `κ_x > 0` → `M_x > 0` → `σ_x_top = +6M/t² > 0` (TRAZIONE
fibra top).

⚠ **Questo è il opposto di quello che si attende fisicamente**!

Per piastra sotto pressione `p > 0` (verso il basso), la deflessione
`w < 0`. La fibra TOP (z=+t/2) è in COMPRESSIONE (σ_y_top < 0). Ma la
convenzione Mindlin standard di Bathe **predice σ_y_top > 0**.

Hmm — c'è incoerenza di **convenzione coordinata z** (z up vs z down).

## Spiegazione del segno

Il sintomo "σ_y_top positivo" osservato in v2.4.3c.1 può essere
spiegato in due modi:

1. **Convenzione interna "z down"**: nel solver, `z` punta verso il
   basso e `w > 0` corrisponde a deflessione verso il basso. La fibra
   "top" è quindi quella a `z = +t/2` ma fisicamente in alto. Per
   `w > 0` (deflessione verso il basso), la fibra top è in compressione:
   ma il calcolo `σ_top = σ_m + 6M/t²` con `M > 0` darebbe `σ_top > 0`,
   che in questa convenzione è IL VALORE DI COMPRESSIONE. Numericamente
   positivo, ma fisicamente compressione.

   → In questo caso il "+" non sarebbe un bug ma una **scelta di
   convenzione** non documentata.

2. **Convenzione standard "z up" ma segno B_b sbagliato**: convenzione
   ortodossa, σ_top positivo è trazione. Il valore positivo trovato è
   genuino bug — manca un segno meno nella formula `σ_top = σ_m + 6M/t²`
   o nei coefficienti di B_b.

**Per disambiguare serve evidenza esterna**:
- Decisione design originale del solver: che convenzione z usa?
- Verifica con cantilever singolo elemento: applica `θ_x = 0.01` rad
  costante e vedi se `M_x` risulta positivo o negativo.

## Strategia raccomandata per Phase 2

**Strategia A · Test diretto convenzione (raccomandata)**:
Prima del fix sign, eseguire test diagnostico mirato per accertarsi
quale convenzione il solver implementa:
1. Costruisci un singolo elemento Q4 piatto unitario
2. Applica `θ_x = +0.01` rad costante su tutti e 4 i nodi (rotazione
   rigida)
3. Calcola `M_x` via `D_b @ (B_b @ u_bend)`
4. Se `M_x > 0` → convenzione classica `σ_top > 0 = trazione`
5. Se `M_x < 0` → convenzione opposta

Se test diagnostico mostra che la convenzione "z up" è quella
standard ma B_b ha segno errato → fix sign mettendo "−" sui
componenti appropriati di B_b in `stresses_at_nodes` (Q4 + MITC).

**Strategia B · Fix diretto Kirchhoff "by the book"**:
Cambia B_b in `stresses_at_nodes` (Q4 + MITC) seguendo convenzione
Kirchhoff "z up" standard:
```python
Bb[0, 3*i + 2] = -dN[0]   # κ_x = -∂θ_y/∂x (rotation about y axis)
Bb[1, 3*i + 1] = +dN[1]   # κ_y = +∂θ_x/∂y (rotation about x axis)
Bb[2, 3*i + 1] = -dN[0]   # κ_xy parte θ_x
Bb[2, 3*i + 2] = +dN[1]   # κ_xy parte θ_y
```

Questa convenzione interpreta `θ_x` = rotazione attorno all'asse x
(non più "section rotation"). Cambia anche l'estrazione DOF:
- `u_bend[3*i + 1] ← θ_x` (rotation about X = rx)
- `u_bend[3*i + 2] ← θ_y` (rotation about Y = ry)
- formula `σ_top = σ_m + 6·M/t²` resta invariata

**Rischio B**: incompatibile con convenzione del `_bending_stiffness`
esistente (Mindlin compatibility "θ = section rotation"). Cambiare
solo `stresses_at_nodes` potrebbe rompere coerenza con LE1 (membrana
puro, ma se M influenza bending stress, va testato).

## Richiesta a Federico

**Quesito**: quale strategia adottare per Phase 2?

- **(A)** Test diagnostico convenzione + fix mirato in `stresses_at_nodes`
  basato sull'evidenza (~30 min test + ~1 ora fix)
- **(B)** Fix Kirchhoff "by the book" diretto + verifica regression LE1
  (~30 min fix + ~30 min test)
- **(C)** Altra strategia (suggerimento di Federico)

In particolare: vuoi che riveda anche i `_bending_stiffness` per
coerenza convenzione, o lascio K_b invariato (sign-invariant) e modifico
solo `stresses_at_nodes`?

In attesa di conferma per procedere a Phase 2.
