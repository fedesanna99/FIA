# FEA Pro — Backlog tecnico

> Stato aggiornato: **2026-05-23** (riconciliato in v2.3.3-docs-sync da
> v1.0.0 audit del 2026-05-19).
>
> Voci storiche chiuse nelle versioni post v1.0.0 sono nella sezione
> `## Chiuso (v1.x → v2.x)` in coda.

Voci **non bloccanti per v1.0.0**, già note e documentate. Vanno implementate prima
di promettere coperture su strutture tese, layered, non-lineari geometriche o iso-surfaces
3D. Ordine indicativo per priorità di valore strutturale; le complessità sono stime
in tempo "a regime" (codice + test + validazione contro caso analitico).

---

## 🔴 Alta priorità (sbloccano classi di problemi)

(Tutte le voci alta priorità del backlog v1.0.0 sono state chiuse in v1.3 → v2.3.
Vedi sezione `## Chiuso (v1.x → v2.x)` in coda.)

---

## 🟡 Media priorità

(Tutte le voci media priorità v1.0.0 sono chiuse — vedi `## Chiuso`.)

---

## 🟢 Bassa priorità — Carry-over esterni / sicurezza

### BL-9 · jsPDF CVE GHSA-* — frontend
**Stato:** open · **Complessità:** ~10 min (bump dipendenza)

- Versione attuale `jspdf@^4.2.1`. La 4.x mitigates parte dei CVE precedenti
  ma scan SCA periodici potrebbero ancora segnalare GHSA su release minor.
- Impatto reale: nullo (gira solo client-side, input controllato dall'utente).
- Mitigazione: bump alla prossima patch alla rev del package.json.
- Tracciato qui per non perdersi negli scan SCA periodici.

---

## 🔮 Voci aperte da scoperta v2.x

### Tech debt v2.4.x (alpha.30 follow-ups)
- `jobsStore` unificato (oggi storage frammentato fra panels)
- `useModelHistory` → history push wiring nei restanti store
- `notificationsStore` dedicato (separare da toastStore)
- `rightRailStore` solo statico (sposta logica fuori)
- Cleanup legacy `ExportMenu.tsx`, `Breadcrumb.tsx`
- `materials` field in `FEAModel` (oggi accesso difensivo in ViewportHud)

### Test funzionali completi (v2.5.x — quality checkpoint)
- L1 audit dead clicks (Playwright crawler)
- L2 audit funzionale per area (~10 happy path + 5 edge case)
- Report bug consolidato + fix sprint dedicato

---

## Chiuso (v1.x → v2.x)

### BL-1 · Newton-Raphson + Cable 2D/3D — non-linearità geometrica
**Chiuso**: v1.5 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**:
- `backend/core/elements/cable2d.py`, `backend/core/elements/cable3d.py`
- `backend/core/solver/nonlinear_solver.py`
**Test di riferimento**:
- `backend/tests/test_cable2d.py`, `backend/tests/test_cable3d.py`
- `backend/tests/test_nonlinear_solver.py`

### BL-2 · Solver non-lineare generico + arc-length (post-snap-through)
**Chiuso**: v1.6 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**:
- `backend/core/solver/arclength_solver.py` (Crisfield/Riks)
- `backend/core/solver/nonlinear_solver.py` (Newton-Raphson base)
**Test di riferimento**: `backend/tests/test_arclength.py`
**Nota**: test Williams toggle frame specifico non rilevato — da aggiungere
in v2.4.x come check di validazione mirato (vedi tech debt sopra).

### BL-3 · Elementi Tet4 / T10 (solidi tetraedrici)
**Chiuso**: v1.6 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**:
- `backend/core/elements/solid_tet4.py`
- `backend/core/elements/solid_tet10.py`
**Test di riferimento**: `backend/tests/test_solid_tet*.py`

### BL-4 · Shell layered (composite stack-up)
**Chiuso**: v1.7 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**: `backend/core/elements/shell_quad4_layered.py`
**Test di riferimento**: `backend/tests/test_shell_quad4_layered.py`

### BL-5 · Q4 MITC4 / reduced integration (shear locking)
**Chiuso**: v1.7 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**: `backend/core/elements/shell_quad4_mitc.py`
**Test di riferimento**: NAFEMS LE10 (thin plate h/L=1/500) — verificato in
`backend/tests/nafems/`.

### BL-6 · NAFEMS LE1 / LE2 / LE10 con geometria ellittica
**Chiuso**: v1.3 (D1) · 9 test verdi in `backend/tests/nafems/`
- LE1 elliptic membrane Q4/Tri3 + convergenza
- LE2 cantilever beam3D + convergenza + reazioni
- LE10 thick plate Q4 + h-refinement + linear scaling
Mesh generata via `quarter_ellipse_with_hole` (Coons patch transfinita).

### BL-7 · 3D iso-surfaces (marching tetra / cubes)
**Chiuso**: v1.8 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**:
- `backend/core/postprocess/isosurfaces.py` (marching tetrahedra esplicito,
  decomposizione canonica Hex8→5 tetraedri tramite `tetrahedralize_hex8`)
- `backend/core/postprocess/isolines.py` (marching triangles 2D)
- Frontend: `frontend/src/components/panels/IsosurfacePanel.tsx`
**Riferimenti normativi** documentati inline: Lorensen-Cline 1987, Doi-Koide 1991.

### BL-8 · DXF layer → material/section mapping
**Chiuso**: v1.8 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**: `backend/core/io/dxf_importer.py` accetta parametri
`layer_material_map: dict[str, str]` e `layer_section_map: dict[str, str]`;
lookup case-sensitive su `dxf.layer`; fallback su default.
**Test di riferimento**: vedere `backend/tests/test_dxf_importer.py`.

---

## Convenzioni

- Apertura di un carry-over BL-N → cambia stato a `in-progress` qui e crea
  branch `feat/bl-N-<slug>`.
- Chiusura → muove la voce in `CHANGELOG.md` sotto la nuova versione minor,
  e qui in `## Chiuso (v1.x → v2.x)`.
- Ogni implementazione deve includere **almeno un test di validazione
  contro una formula analitica o benchmark normativo**, coerentemente con la
  filosofia delle 25 fasi.
