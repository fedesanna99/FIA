# b3 · ChecksDetailTable — Content spec per element type

> Closes utile **B.2**. Definisce il mapping header dinamico di
> `ChecksDetailTable` in base a `element.type`. Oggi `Elemento | Sezione |
> N | V | M` è hard-coded per beam — su shell/solid/truss è sbagliato o
> insufficiente.

---

## 1 · Problema

`ChecksDetailTable.tsx` (post v2.6.3.1) ha header fisso:

```
| Elemento | Sezione | N | V | M | UR | Norma |
```

Va bene per `beam2D`. Per altri element type:
- `shell` non ha `N/V/M` scalari — ha tensioni di membrana e flessione su 2 assi.
- `solid` ha tensore completo σ_x/σ_y/σ_z/τ_xy/τ_yz/τ_xz.
- `truss` ha solo `N` (forza assiale, no taglio, no momento).
- `beam3D` ha 6 componenti (N + Vy + Vz + My + Mz + T).

Mostrare colonne vuote o N/A è UX-rotta. Servono header dinamici.

---

## 2 · Mapping element.type → columns

### 2.1 · `beam2D` (default attuale)

| Elemento | Sezione | N | V | M | UR | Norma |
|---|---|---|---|---|---|---|

```ts
const COLS_BEAM2D: ColumnDef[] = [
  { key: "element", label: "Elemento", width: 80 },
  { key: "section", label: "Sezione", width: 100 },
  { key: "N", label: "N", suffix: "kN", numeric: true, width: 80 },
  { key: "V", label: "V", suffix: "kN", numeric: true, width: 80 },
  { key: "M", label: "M", suffix: "kNm", numeric: true, width: 80 },
  { key: "UR", label: "UR", numeric: true, width: 60, format: "decimal3" },
  { key: "ref", label: "Norma", width: 140 },
];
```

### 2.2 · `beam3D`

| Elemento | Sezione | N | Vy | Vz | My | Mz | T | UR | Norma |
|---|---|---|---|---|---|---|---|---|---|

```ts
const COLS_BEAM3D: ColumnDef[] = [
  { key: "element", label: "Elemento", width: 80 },
  { key: "section", label: "Sezione", width: 100 },
  { key: "N",  label: "N",  suffix: "kN",  numeric: true, width: 70 },
  { key: "Vy", label: "Vy", suffix: "kN",  numeric: true, width: 70 },
  { key: "Vz", label: "Vz", suffix: "kN",  numeric: true, width: 70 },
  { key: "My", label: "My", suffix: "kNm", numeric: true, width: 70 },
  { key: "Mz", label: "Mz", suffix: "kNm", numeric: true, width: 70 },
  { key: "T",  label: "T",  suffix: "kNm", numeric: true, width: 70 },
  { key: "UR", label: "UR", numeric: true, width: 60, format: "decimal3" },
  { key: "ref", label: "Norma", width: 140 },
];
```

**Note**: tabella ampia — abilitare scroll orizzontale (`overflow-x: auto`)
sul container. Header sticky su scroll.

### 2.3 · `shell` (Q4 Mindlin / MITC4 / layered)

| Elemento | Spessore | σ_x_top | σ_y_top | τ_xy | σ_VM_max | UR | Norma |
|---|---|---|---|---|---|---|---|

```ts
const COLS_SHELL: ColumnDef[] = [
  { key: "element", label: "Elemento", width: 80 },
  { key: "thickness", label: "Spessore", suffix: "mm", numeric: true, width: 80 },
  { key: "sigmaXTop", label: "σ_x_top", suffix: "MPa", numeric: true, width: 90 },
  { key: "sigmaYTop", label: "σ_y_top", suffix: "MPa", numeric: true, width: 90 },
  { key: "tauXY",     label: "τ_xy",    suffix: "MPa", numeric: true, width: 80 },
  { key: "sigmaVM",   label: "σ_VM_max", suffix: "MPa", numeric: true, width: 90 },
  { key: "UR", label: "UR", numeric: true, width: 60, format: "decimal3" },
  { key: "ref", label: "Norma", width: 140 },
];
```

**Note**:
- `_top` indica fibra superiore. Per layered shell, aggiungere selector
  `[Top | Mid | Bot]` sopra la tabella per switchare layer.
- `σ_VM` = Von Mises equivalent stress, scalare → confrontabile con `fy`.
- Per legno (Cross-Lam): cols diventano `σ_x_// | σ_y_⟂ | τ_rolling`. Vedi futuro `b4-timber-shell-spec.md`.

### 2.4 · `solid` (H8 / T4 / T10)

| Elemento | σ_x | σ_y | σ_z | τ_xy | σ_VM | UR | Norma |
|---|---|---|---|---|---|---|---|

```ts
const COLS_SOLID: ColumnDef[] = [
  { key: "element", label: "Elemento", width: 80 },
  { key: "sigmaX",  label: "σ_x",  suffix: "MPa", numeric: true, width: 80 },
  { key: "sigmaY",  label: "σ_y",  suffix: "MPa", numeric: true, width: 80 },
  { key: "sigmaZ",  label: "σ_z",  suffix: "MPa", numeric: true, width: 80 },
  { key: "tauXY",   label: "τ_xy", suffix: "MPa", numeric: true, width: 80 },
  { key: "sigmaVM", label: "σ_VM", suffix: "MPa", numeric: true, width: 80 },
  { key: "UR", label: "UR", numeric: true, width: 60, format: "decimal3" },
  { key: "ref", label: "Norma", width: 140 },
];
```

**Note**: τ_yz e τ_xz omessi dalla view di default (raramente governanti);
disponibili in expanded row (click sull'elemento → drawer con tensore completo).

### 2.5 · `truss` (incl. `cable`)

| Elemento | Sezione | N | UR | Norma |
|---|---|---|---|---|

```ts
const COLS_TRUSS: ColumnDef[] = [
  { key: "element", label: "Elemento", width: 80 },
  { key: "section", label: "Sezione", width: 100 },
  { key: "N", label: "N", suffix: "kN", numeric: true, width: 80 },
  { key: "UR", label: "UR", numeric: true, width: 60, format: "decimal3" },
  { key: "ref", label: "Norma", width: 140 },
];
```

**Note**:
- Tabella stretta — colonne residue (Sezione, Norma) prendono più spazio.
- Per `cable`: aggiungere indicatore di stato `[TESO | LASCO]` in caratteri mono, NON come icona — il cable lasco ha `N ≈ 0` ma è valido (non-error).

---

## 3 · Selector logic

`ChecksDetailTable.tsx` riceve `elementType` come prop (o lo deriva da
`selectedElement.type`):

```tsx
function columnsFor(type: ElementType): ColumnDef[] {
  switch (type) {
    case "beam2D": return COLS_BEAM2D;
    case "beam3D": return COLS_BEAM3D;
    case "shell":
    case "shellLayered":
    case "MITC4":  return COLS_SHELL;
    case "solid":
    case "H8":
    case "T4":
    case "T10":    return COLS_SOLID;
    case "truss":
    case "cable":  return COLS_TRUSS;
    default:       return COLS_BEAM2D;
  }
}
```

Se il dataset misto (es. modello con beam + shell), la tabella si splitta
in **due tabelle adiacenti**, ognuna con il suo header. Non mostrare un
header "lowest common denominator" — confonde la lettura.

```
┌─ Beam (10 elementi) ────────────────────────┐
│ Elemento | Sezione | N | V | M | UR | Norma │
│ B1 | IPE 240 | 12.3 | 4.5 | 18.1 | 0.34 | … │
└────────────────────────────────────────────┘

┌─ Shell (4 elementi) ────────────────────────────────────┐
│ Elemento | Spessore | σ_x_top | σ_y_top | τ_xy | … | UR │
│ S1 | 12 mm | 145.2 | 88.7 | 32.1 | … | 0.61              │
└────────────────────────────────────────────────────────┘
```

---

## 4 · Numerica e formattazione

- **Tutti i numerici**: `font-variant-numeric: tabular-nums`, allineati
  a destra, JetBrains Mono.
- **Suffix unità** sempre nel header (`N · kN`, `σ_x · MPa`), mai dopo
  ogni cella — riduce rumore visivo.
- **Decimali**:
  - Forze (`N`, `V`) → 1 decimale (es. `12.3`).
  - Momenti (`M`, `My`, `Mz`, `T`) → 2 decimali (es. `18.12`).
  - Tensioni (`σ`, `τ`) → 1 decimale (es. `145.2`).
  - `UR` → 3 decimali (es. `0.345`).
- **Segno**: sempre esplicito per trazione (+) / compressione (−) in `N`,
  `σ`. Non per momenti (la convenzione di segno dipende dal verso del
  riferimento locale, mostrato altrove).
- **UR ≥ 1.0**: cella colora di `var(--danger-subtle)` background +
  `var(--ink-danger)` text. UR ≥ 0.95 e < 1.0: `var(--warn-subtle)` +
  `var(--ink-coral)`. Sotto 0.95: nessun coloring.

---

## 5 · Riferimento normativo (col `Norma`)

Formato:
```
EC3 § 6.2.1
NTC18 § 4.2.4.1
EC2 § 5.7
EC8 § 3.2.2.2
```

- Sempre spazio prima e dopo `§`.
- Sempre uppercase per la sigla.
- Click sulla cella → apre `NormReference` dialog con estratto della norma.
- Se più norme convergono sullo stesso check: separatore `+` (es. `EC3 § 6.2.1 + NTC18 § 4.2.4.1`).

---

## 6 · Acceptance checklist (per QA)

- [ ] Modello solo-beam → header `N | V | M`.
- [ ] Modello solo-shell → header `σ_x_top | σ_y_top | τ_xy | σ_VM_max`.
- [ ] Modello solo-truss → header `Sezione | N`.
- [ ] Modello misto beam + shell → due tabelle separate, header coerente.
- [ ] Cella `UR ≥ 1.0` colorata danger; `0.95–1.0` colorata warn; sotto, neutra.
- [ ] Numerica tabular-nums right-aligned ovunque.
- [ ] Click su `Norma` → dialog con estratto normativa.
- [ ] Shell layered → selector `[Top | Mid | Bot]` sopra la tabella, funzionante.
- [ ] Header sticky on scroll vertical; scroll orizzontale abilitato su beam3D/solid.

---

**Implementazione stimata Claude Code**: ~45 min (refactor columnsFor switch + 4 nuovi COL set + multi-table split logic + UR cell coloring).
