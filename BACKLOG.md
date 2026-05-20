# FEA Pro — Backlog tecnico

Voci **non bloccanti per v1.0.0**, già note e documentate. Vanno implementate prima
di promettere coperture su strutture tese, layered, non-lineari geometriche o iso-surfaces
3D. Ordine indicativo per priorità di valore strutturale; le complessità sono stime
in tempo "a regime" (codice + test + validazione contro caso analitico).

Stato aggiornato: **2026-05-19** (post-audit v1.0.0).

---

## 🔴 Alta priorità (sbloccano classi di problemi)

### BL-1 · Newton-Raphson + Cable 2D/3D — non-linearità geometrica
**Stato:** carry-over · **Complessità:** ~2-3 h · **Sblocca:** ponti sospesi, strapazzi, tiranti, coperture leggere

- Implementare `NonLinearStaticSolver` con loop Newton-Raphson sulla tangente
  K_T(u) = K_e + K_G(N) — già presente la `K_G` per beam; manca l'assembly
  con stato (`N` corrente) e il loop NR.
- Aggiungere `CableElement` (2 nodi, 3 DOF traslazionali per nodo in 3D):
  - Formulazione catenaria piana o funicolare iterativa (Irvine 1981).
  - Modulo equivalente E_eq con correzione Ernst per sag.
  - Solo trazione: se `N < 0` durante iterazione → element exclusion.
- Test: catenaria orizzontale tra 2 supporti, confronto sag analitico
  `f = wL²/(8H)` con errore < 0.5%; cavo singolo sotto peso proprio.

### BL-2 · Solver non-lineare generico + arc-length (post-snap-through)
**Stato:** carry-over (parzialmente coperto da push-over λ-incrementale) ·
**Complessità:** ~3-4 h · **Sblocca:** instabilità con softening, frame Williams

- Estendere `PushoverSolver` con metodo arc-length di Crisfield/Riks per
  superare punti limite e snap-through.
- Test classico: **Williams toggle frame** (due bielle a vertice), confronto
  con soluzione analitica di Williams (1964) per il post-buckling.

---

## 🟡 Media priorità (coperture standard mancanti)

### BL-3 · Elementi Tet4 / T10 (solidi tetraedrici)
**Stato:** carry-over · **Complessità:** ~2 h · **Sblocca:** mesh 3D Delaunay/Gmsh diretta

- Lo schema `Element.type` già contempla `solid_h8`. Aggiungere `solid_tet4`
  e `solid_t10` con matrici B/N standard (4 punti Gauss per T10, 1 per Tet4).
- Aggiornare assembler per dispatch su nuovo tipo.
- Test: cubo unitario sotto trazione monoassiale (consistency); patch test 3D.
- Side-benefit: `gmsh_mesher.py` produce già Tet4 → mesh 3D arbitrari diventano
  utilizzabili dal solver.

### BL-4 · Shell layered (composite stack-up)
**Stato:** carry-over · **Complessità:** ~3 h · **Sblocca:** laminati, pannelli sandwich

- Schema `Section.layers: list[Layer]` (mat_id, t_k, θ_k).
- Integrazione attraverso lo spessore con quadratura Simpson o trapezi sui layer.
- Restituzione `σ` per layer top/middle/bottom in postprocess.
- Test: piastra simmetrica cross-ply, confronto con [Reddy "Mechanics of
  Laminated Composite Plates"] caso semplice 0°/90°.

### BL-5 · Q4 MITC4 / reduced integration (shear locking)
**Stato:** carry-over · **Complessità:** ~2 h · **Sblocca:** piastre sottili
(L/t > 50) senza locking

- L'attuale `shell_quad4` è Mindlin-Reissner 2×2 → soffre di shear-locking
  per piastre sottili.
- Implementare formulazione MITC4 (Bathe-Dvorkin): interpolazione mista del
  taglio trasverso lungo i mid-side points.
- Test: NAFEMS **LE10** thin plate (h/L = 1/500), già parzialmente in
  `tests/validation/`, attualmente con tolleranza larga.

---

## 🟢 Bassa priorità (validation suite + UX)

### BL-6 · NAFEMS LE1 / LE2 / LE10 con geometria ellittica
**Stato:** ✅ **chiuso v1.3 (D1)** · vedi `backend/tests/nafems/`
(9 test verdi: LE1 elliptic membrane Q4/Tri3+convergenza, LE2 cantilever
beam3D+convergenza+reazioni, LE10 thick plate Q4 + h-refinement + linear scaling).
Mesh generata via `quarter_ellipse_with_hole` (Coons patch transfinita).

### BL-7 · 3D iso-surfaces (marching tetra / cubes)
**Stato:** carry-over · **Complessità:** ~2 h · **Sblocca:** visualizzazione
stress 3D di solidi

- Le iso-linee 2D ci sono (`isolines.py` con marching triangles).
- Per iso-superfici 3D servono **marching tetra/cubes** sulla mesh solida.
- Alternativa: integrazione con `pyvista` (dipendenza pesante, +50 MB).
- Decisione: implementazione nativa marching tetra (più snello).

### BL-8 · DXF layer → material/section mapping
**Stato:** carry-over (TODO esplicito in `dxf_importer.py:18`) ·
**Complessità:** ~30 min

- Parametro `layer_material_map: dict[str, str]` per `import_dxf()`.
- Lookup per ogni LINE/POLYLINE: layer name → material_id/section_id.
- Fallback su default attuali se mapping assente.
- Test: DXF con 2 layer ("Acciaio", "Legno") → 2 materiali diversi.

---

## 🔵 Carry-over esterni (non codice nostro)

### BL-9 · jsPDF CVE GHSA-* — frontend
- La versione di `jspdf` ha un CVE noto (DoS via input crafted).
- Impatto reale: nullo (gira solo client-side, input controllato dall'utente).
- Mitigazione: bump a versione patched alla prossima rev del package.json.
- Tracciato qui per non perdersi negli scan SCA periodici.

---

## Convenzioni

- Apertura di un carry-over BL-N → cambia stato a `in-progress` qui e crea
  branch `feat/bl-N-<slug>`.
- Chiusura → muove la voce in `CHANGELOG.md` sotto la nuova versione minor.
- Ogni implementazione deve includere **almeno un test di validazione
  contro una formula analitica o benchmark normativo**, coerentemente con la
  filosofia delle 25 fasi.
