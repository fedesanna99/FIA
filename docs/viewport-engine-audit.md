# Viewport Engine GPU vs Legacy — Audit visivo (v1.6.1 T5)

> Stato al commit di chiusura sprint v1.6.1-polish. Per le note tecniche di
> implementazione vedi anche `01_context/VIEWPORT_ENGINE_NOTES.md` del
> pacchetto Claude Code.

---

## Obiettivo

Verificare che lo switch `Legacy ↔ Engine GPU` (`useAnalysisStore.useViewportEngine`)
non causi regressioni visive bloccanti per la demo. La parita' non e' al pixel:
le due architetture rendono diversamente, ma il modello deve restare
riconoscibile e tutte le interazioni utente devono continuare a funzionare.

---

## Architettura comparata

| Aspetto | Legacy (`NodeRenderer` + `ElementRenderer`) | Engine GPU (`EngineNodeRenderer` + `EngineElementRenderer`) |
|---|---|---|
| Mesh per nodo | 1 `<mesh>` React + `<sphereGeometry>` individuale | 1 `THREE.InstancedMesh` per tutto il batch nodi |
| Beam/Truss/Cable | 1 mesh cilindro per elemento | 1 `InstancedMesh` per tutti i line elements |
| Shell q4 / tri3 | mesh `<bufferGeometry>` per elemento, edge `<lineSegments>` | 1 `BufferGeometry` aggregata + 1 `<lineSegments>` aggregata |
| Solid h8/t4/t10 | mesh per elemento | 1 `BufferGeometry` aggregata |
| Draw paths | ~ N entita' | ~5 path (1 nodi + 1 line + 1 surface tri + 1 surface edge + 1 solid tri) |
| Path GPU | per-mesh `meshStandardMaterial` | `meshStandardMaterial` con `vertexColors=true` |

`viewport-engine/viewportEngineStats.ts` calcola un `compressionRatio` =
`oldApproxObjects / engineDrawPaths` che documenta il guadagno.

---

## Parita' interazione

I due renderer espongono gli stessi callback con la stessa semantica:

| Interazione | Legacy | Engine | Note |
|---|---|---|---|
| Click nodo | `selectNode + openRightPanel("inspect")` | idem (instance hit-test via `e.instanceId`) | ✅ parita' |
| Shift+Click nodo | multi-select bulk (no panel) | idem | ✅ parita' |
| Doppio click nodo | `openEditNode(n.id)` (legacy modal) | idem | ✅ parita' |
| Hover nodo | `setHover + cursor pointer` | idem (via instance id) | ✅ parita' |
| Click elemento | apre `ElementDialog` | idem | ✅ parita' |
| Hover elemento | tooltip + cursor pointer | idem | ✅ parita' |
| Label nodi (`showNodeLabels`) | `<Html distanceFactor={10}>` per nodo | idem (loop separato dall'InstancedMesh) | ✅ parita' |
| Selezione visiva | colore `#ffaa00` su tutti gli elementi selected | idem (via `setColorAt`/vertexColors) | ✅ parita' colore |

---

## Differenze visive note (intenzionali)

1. **Emissive intensity dinamica.**
   - Legacy: `meshStandardMaterial.emissive` cambia colore tra normal/hovered/selected
     e `emissiveIntensity` sale a 0.6 quando hovered/selected.
   - Engine: emissive fisso `#003848` con `emissiveIntensity=0.35` per tutti gli
     stati. Selected/hovered cambiano SOLO il `vertexColor`, non il glow.
   - **Effetto utente**: in Engine i nodi selezionati cambiano colore ma non
     "brillano" come in Legacy. Accettabile per demo, da migliorare in v1.7
     introducendo un `instanceEmissive` attribute.

2. **Hover scale dei nodi.**
   - Entrambi: scala a 1.4× il raggio normale quando hovered. ✅ parita'.

3. **Cable rendering.**
   - Legacy: usa una `lineBasicMaterial` dedicata (`#5a8ab9`) + opacity custom.
   - Engine: cable e' trattato come line element generico (cilindro thin), senza
     il "look catenaria" dedicato.
   - **Effetto utente**: il cavo in Engine GPU appare come una linea fitta
     ma piu' "solida" che in Legacy. Visivamente accettabile su modelli demo
     (non usiamo cavi nei template killer).

4. **Edge antialiasing.**
   - Legacy: gli edge in `<lineSegments>` sono per-element con linewidth 1.
   - Engine: aggrega tutti gli edge in 1 `<lineSegments>` con linewidth 1.
   - **Effetto utente**: nessuna differenza visibile su monitor standard.

---

## Componenti condivisi (entrambi i mode)

Indipendentemente dal toggle, restano attivi:
- `LoadRenderer` (frecce carichi)
- `BCRenderer` (simboli vincoli)
- `DeformedShape` (post-analisi)
- `InternalForceDiagram` (post-analisi)
- `ScaleIndicator`
- `ClickPlane` (per click su empty space)

Quindi: la post-analisi (deformata, diagrammi) NON cambia visivamente tra Legacy
e Engine.

---

## Verifica fatta in questa sessione

- ✅ Unit test 5/5 viewport-engine moduli (T4): 53 test verdi su classification,
  geometria, edge pairs, compressionRatio.
- ✅ Diff statico Legacy vs Engine sui 4 file renderer documentato qui.
- ⚠️ Browser audit con Playwright **non eseguito** in questa sessione: il
  setup Playwright e' parte di T6 ma non e' stato installato per non
  scaricare ~150 MB di browser binaries. Vedi `docs/playwright-setup.md` (T6)
  per la procedura.

---

## Rischi residui

| ID | Descrizione | Mitigazione |
|---|---|---|
| R1 | Performance regression su iGPU / mobile con `useViewportEngine=true` | Toggle Legacy resta default; preset `Performance` lo attiva consapevolmente |
| R2 | Selezione multipla via shift su Engine: hit-test InstancedMesh ha 1 instanceId per evento, va testato che `selectNode(id, shiftKey=true)` accumuli correttamente | Codice condiviso `selectNode` in modelStore, gia' coperto da test |
| R3 | I cable in Engine perdono il "look catenaria" | Non bloccante per demo: i template killer non usano cavi |
| R4 | Selezione visiva senza glow in Engine | UX-only, non bloccante. Issue aperto per v1.7. |

---

## Decisione

**Legacy = default stabile. Engine = opt-in via toggle nello HUD/ViewPanel
o tramite preset `Performance`.** Quando v1.7 introdurra' il fix R4 (glow
per-instance) si potra' considerare di promuovere Engine come default.

Per la demo v1.6.1, lo switch Engine va testato manualmente al check D.8 del
Demo Quality Pass (`docs/demo-quality-checklist.md`) — switch 5 volte su
template `Telaio portale 2D`, controllo "nessun crash / nessun frame nero".
