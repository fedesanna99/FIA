# Guida utente — FEA Pro

> **Versione**: v2.2.2 · 2026-05-23
> **Per chi**: ingegneri strutturisti italiani, progettisti, studenti
> **Live**: https://fea-pro.fly.dev/
> **Prerequisiti**: browser moderno (Chrome / Firefox / Safari / Edge), account email valido

---

## 1. Cos'è FEA Pro

**FEA Pro** è una piattaforma di analisi agli elementi finiti (FEM) **browser-first**.
Niente installazione, niente licenza, niente cloud opaco. Apri il sito, ti
registri con email e password, e in 10 secondi sei dentro un modellatore 3D
che gira nel browser con solver Python sul backend.

**Cosa puoi fare:**
- Modellare strutture 2D/3D (travi, telai, shell, solidi)
- Calcolare statica · modale · dinamica Newmark · buckling · pushover ·
  sismica time-history · non-lineare (Newton-Raphson · arc-length Crisfield)
- Verificare secondo **EC2 / EC3 / EC5 / EC8 / NTC 2018** + GPS Strutturale live
- Esportare PDF tracciabili · XLSX multi-sheet · DXF · IFC · CSV
- Lavorare offline-tolerant (il viewport regge anche se il backend è giù)

**Filosofia**: algoritmo > AI. Niente black box. Ogni numero è verificabile
contro le formule analitiche o i benchmark NAFEMS (5/5 PASS nell'app stessa,
vedi *Tools › Validation*).

---

## 2. Primo accesso

Quando apri https://fea-pro.fly.dev/ vedi una schermata **full-page di
login/registrazione** — non puoi entrare nell'app finché non sei autenticato.

### Registrazione (prima volta)

1. Click sulla tab **"Crea account"** in alto a destra del riquadro
2. Inserisci:
   - **Email** valida (formato standard `utente@dominio.com`)
   - **Password** minimo 8 caratteri
3. Click **"Crea account →"**

Vieni portato direttamente dentro l'app. **Niente conferma email richiesta**
(è una piattaforma per ingegneri, non un social network).

### Login (accessi successivi)

1. Tab **"Accedi"** attiva di default
2. Email + password
3. Click **"Accedi →"**

> 💡 **Token persistente**: dopo il login il token JWT resta salvato sul tuo
> browser (localStorage). Chiudendo il tab non perdi la sessione. Per uscire
> usa l'avatar in alto a destra → *"Logout (disconnetti)"*.

> ⚠️ **Sessione scaduta**: se ricevi un errore 401 (token vecchio), l'app
> ti riporta automaticamente alla schermata di login senza messaggi
> spaventevoli.

---

## 3. Tour dell'interfaccia (desktop)

Dopo il login vedi la **Dashboard** (home page senza modello attivo) o il
**Studio Pro** (quando hai un modello selezionato). Il layout fisso è:

```
┌─────────────────────────────────────────────────────────────┐
│ TopBar 48px · logo F · model picker · ▶ Esegui · 🔍 · 👤 │  ← navigation
├──┬──────────────────────────────────────────────────┬──────┤
│M │                                                  │ Side │  ← workspace
│a │                                                  │ bar  │
│k │              Viewport 3D Three.js                │ dx   │
│e │              (drag, zoom, rotate)                │ info │
│  │                                                  │      │
├──┴──────────────────────────────────────────────────┴──────┤
│ StatusBar 24px · pronti · jobs · ws · v1.4               │  ← status
└─────────────────────────────────────────────────────────────┘
```

### TopBar (48px)

| Elemento | Cosa fa |
|---|---|
| **Logo F** + version | identità app + tier badge (free/starter/pro/enterprise) |
| **Model picker** | dropdown lista modelli salvati · ✏️ inline edit nome |
| **▶ Esegui** | bottone verde — lancia l'analisi corrente sul modello attivo (F5) |
| **Save chip** | "✓ Salvato HH:MM" — l'app autosalva ogni mutation |
| **Cerca strumenti** | apre la **command palette** (`Ctrl+K` o `⌘+K`) |
| **🤖 AI Copilot** | (placeholder beta) |
| **👤 Avatar** | menu account · loads location · tema · export · logout |
| **🔔 Bell** | notifiche non lette (visibile solo se >0) |

### LeftRail (48px, sinistra)

Tre icone di workflow:
- **🔨 Make** — geometria, mesh, materiali, sezioni, vincoli, carichi
- **⚡ Solve** — solver di tutti i tipi
- **🛡 Verify** — verifiche normative

Più sotto: comando palette (`Ctrl+K`), tema dark/light, aiuto.

Click su un'icona apre il **LeftSlidePanel** (panel laterale 340px) con i
sotto-strumenti. Click di nuovo sulla stessa icona = chiude.

### RightRail (48px, destra)

- **👁 Inspect** — leggi i risultati (spostamenti, stress, modi)
- **🎨 View** — toggle viewport (deformata, colormap, diagrammi N/V/M)
- **🔧 Tools** — export, validation, compare A/B, snapshot, AI copilot
- **⏱ History** — snapshot timeline

### Sidebar destra always-on (md+ desktop)

3 card sempre visibili quando hai un modello attivo:
- **Model info** — nome, descrizione, counts nodi/elementi, tier badge
- **Analysis summary** — ultimo solver lanciato, tempo, status
- **Results overview** — max u, max σ (con safety hint S235), GPS Strutturale 3 verifiche live

### Statusbar (24px in basso)

Counts modello, jobs attivi (con %), connessione WebSocket, versione.

---

## 4. Tour mobile

Su mobile (`< 768px`) i rail laterali spariscono. Hai:

- **TopBar** ridotta (logo, model picker, ▶ run, 🔍, 👤)
- **MobileTabbar** in basso: `Modello | Make | Solve | Risultati | Altro`
- Tap "Altro" → menu con `Verifiche | Strumenti | View | …`
- I panel si aprono **full-screen**, con header dual-line "VERIFICHE / Live"
  e back-arrow smart che torna prima al hub poi chiude

> 💡 **Swipe back**: scorri da bordo sinistro → 80px verso destra per
> chiudere il panel (gesture iOS-style).

---

## 5. 3 modi per partire

### 🎯 Percorsi guidati (raccomandato per il primo utilizzo)

Dalla Dashboard click sulla CTA **emerald "Percorsi"**. Si apre un wizard
**6-step** che ti porta dal nulla al report PDF tracciabile:

1. **Geometria** — scegli un percorso preset: *Trave bi-appoggiata UC1*,
   *Telaio portale 2D*, *Reticolo 3D griglia*
2. **Vincoli/Carichi** — riepilogo configurazione
3. **Materiali/Sezioni** — conferma e carica template
4. **Esegui** — l'analisi statica parte automaticamente, vedi progress live
5. **Critical** — visualizza UC GPS Strutturale (S275 / EC3 §6.2.1 / NTC §4.2.4.1)
   con tone OK / Attenzione / Critico
6. **Report** — apri il dialog export PDF con tutte le sezioni

Tempo medio: **2-3 minuti** dal click iniziale al PDF in mano.

### 📚 Template gallery

Sempre dalla Dashboard, click **"+ Da template"** o usa la palette
(`Ctrl+K` → "template"). Si apre una galleria di **9 modelli precaricati**:
- Trave 2D semplice, doppia, mensola
- Telaio portale 2D, telaio multi-piano
- Reticolo 3D, capannone industriale
- Lastra shell, solido 3D test

Click su un template → diventa il modello attivo. Da lì puoi modificare,
analizzare, verificare.

### 🛠 Studio Pro (controllo esperto)

Dalla Dashboard click sulla CTA **cyan "Studio Pro"** o crea un nuovo modello
(`Ctrl+N` o "+ Nuovo modello"). Ti dà controllo totale sull'ordine:
geometria, vincoli, carichi, materiali — nessun guardrail.

---

## 6. Costruire il modello (Make)

Apri il LeftRail → **🔨 Make**. Il pannello si apre con un **hub** di 5 card:

### 6.1. Geometria

Dialog **Nodo** (shortcut `N`) — crea nodi puntuali con coordinate XYZ.
Dialog **Elemento** (`E`) — connetti nodi in elementi:

| Tipo | Quando usarlo |
|---|---|
| `beam2d` | trave / pilastro planare (3 GdL per nodo: ux, uy, rz) |
| `beam3d` | trave 3D (6 GdL: ux, uy, uz, rx, ry, rz) |
| `truss2d/3d` | bielle (solo assiale) |
| `cable2d/3d` | cavi (solo trazione, con pretensione) |
| `shell_q4` / `shell_q4_mitc` | lastra/piastra Mindlin-Reissner |
| `tri3` | membrana 2D plane-stress |
| `solid_h8` | esaedro 3D Gauss 2×2×2 |
| `solid_t4` / `t10` | tetraedro lineare / quadratico |

### 6.2. Mesh wizard

Apre `MeshWizardDialog` (anche da CTA "Mesh") — generatore parametrico:
- **Linea**: da P0 a P1 con N divisioni → N+1 nodi + N beam
- **Shell rettangolare**: 4 vertici + griglia NX × NY → 4-node quads
- **Tri**: 4 vertici + suddivisione → triangoli
- **Box solid**: origine + sizes XYZ + NX × NY × NZ → esaedri

Conferma → mesh aggiunta al modello attivo.

### 6.3. Materiali (libreria + custom)

10 preset di default: `steel_s235`, `s275`, `s355`, `concrete_c25`, `c30`,
`c35`, `wood_c24`, `aluminum_6061`, `cable_steel`, ecc.

**+ Crea custom**: apre `CustomMaterialDialog` — inserisci nome, E (GPa),
ν, ρ (kg/m³), fy/fck opzionali. Auto-slug, salvato come `custom_<nome>_<ts>`.

### 6.4. Sezioni (libreria + custom)

40+ profili: IPE, HEA, HEB, HEM, UPN, rect, circ, SHS, RHS, CHS, shell,
cable, RC, wood.

**+ Crea custom**: apre `CustomSectionDialog` con 3 modalità:
- **Rettangolare**: input `h, b` in mm → calcolo automatico
  `A = b·h`, `Iy = bh³/12`, `Iz = hb³/12`, `Wely`, `Welz`, `J` (Saint-Venant)
- **Circolare**: input `D` → `A = πD²/4`, `Iy = Iz = πD⁴/64`, `J = πD⁴/32`
- **Custom**: input diretto `A`, `Iy`, `Iz`, `J` in cm² / cm⁴ per profili
  speciali (caisson, multi-cell, ecc.)

Preview delle proprietà calcolate **live** sotto il form.

### 6.5. Vincoli

Dialog `ConstraintDialog` (`C`). 7 tipi:

| Tipo | Cosa blocca |
|---|---|
| **Incastro** (`fixed`) | tutti i 6 GdL (ux, uy, uz, rx, ry, rz) |
| **Cerniera** (`pinned`) | 3 traslazioni (ux, uy, uz) — rotazioni libere |
| **Carrello — blocca uₓ** (`roller_x`) | solo uₓ vincolato · libero in Y, Z |
| **Carrello — blocca uᵧ** (`roller_y`) | solo uᵧ vincolato · libero in X, Z · **classico carrello bi-appoggiata** |
| **Carrello — blocca u_z** (`roller_z`) | solo u_z vincolato · libero in X, Y |
| **Personalizzato** (`custom`) | scegli quali GdL bloccare via checkbox |
| **Molla elastica** (`spring`) | K elastico per ogni GdL (kN/m, kN·m/rad) |

Il dialog mostra un **hint dinamico** sotto il select che spiega cosa fa
ogni tipo — utile per evitare errori di convention.

> ⚠️ **Convention chiave**: `roller_X` blocca X (libero in Y, Z) — non è
> "carrello con asse di scorrimento X". Per trave bi-appoggiata orizzontale
> classica (lungo X, gravità −Y) il carrello a destra è **`roller_y`**
> non `roller_x`.

### 6.6. Carichi

Dialog `LoadDialog` (`L`). 8 tipi:

| Tipo | Su cosa |
|---|---|
| `nodal` | nodo · fx, fy, fz, mx, my, mz [N, N·m] |
| `distributed` | elemento beam · qx, qy, qz [N/m] |
| `self_weight` | elemento beam/shell · `ρ·A·g` automatico |
| `pressure` | shell · pressione normale [Pa] |
| `nodal_mass` | nodo · massa concentrata [kg] (per modale/dinamica) |
| `dynamic` | nodo · forzante F(t) time-history |
| `ground_accel` | base · accelerogramma sismica [m/s²] |
| `temperature` | elemento · ΔT [°C] · espansione termica |

#### Carichi automatici (vento/neve/sismica NTC)

Click su 👤 avatar → **"Loads location"** → si apre `LocationPickerDialog`:
- Inserisci città italiana (geocoding Open-Meteo + Nominatim)
- L'app calcola **altitudine** (USGS Elevation), **vento NTC** (4 direzioni
  envelope), **carico neve NTC**, **sismica NTC** (a_g, F_0, T_C*)
- Click "Applica" → si apre `ApplyClimateLoadsDialog` per distribuire i
  carichi sul modello

---

## 7. Lanciare l'analisi (Solve)

LeftRail → **⚡ Solve**. Hub di 4 card:

### Lineari
- **Statica** → spostamenti, reazioni, forze elementari, stress
- **Modale** → frequenze, periodi, modi, partecipazioni X/Y/Z, masse efficaci
- **Buckling** → fattori di carico critico, modi instabilità

### Dinamica
- **Newmark β-γ** → time-history con damping Rayleigh (auto α/β da 2 freq)
- **Pushover** → curva capacity con cerniere plastiche (NTC §7.3.4.1)
- **Sismica time-history** → multi-componente X/Y/Z con accelerogrammi
  PEER / ESM / sintetici (libreria 50+ record)

### Non-lineare
- **Newton-Raphson** → incrementale + iterativo
- **Arc-Length Crisfield** → snap-through / cavi compressione-only

### Rapide
- **FFT** su node time-history
- **Spettro di risposta** (Sd/Sv/Sa)
- **Rayleigh damping calc** → α/β da 2 frequenze + ξ

### Esecuzione

Click **▶ Esegui** in topbar (o F5). Si apre il **LoadingScreen** overlay
con:
- Phase animata (validation → discretization → assembly → factorization →
  solve → postprocess)
- Progress bar 0-100% (WebSocket `/ws/jobs/{user_id}` live)
- Log stream stdout
- ETA proxy basato su elapsed/progress
- Tasto Cancel (job persistente, può essere killato)

Quando finisce, i risultati vanno nello store e la **Results Overview** in
sidebar destra mostra:
- max u [mm]
- max σ [MPa] (con safety hint tonale S235 = 235 MPa)
- GPS Strutturale 3 verifiche live (S275, EC3 §6.2.1, NTC §4.2.4.1)

---

## 8. Verifiche normative (Verify)

LeftRail → **🛡 Verify**. Hub di 6 card:

### Verifiche live · UC normativi

Card cyan "Live" — apre `VerifyChecksLive` con `ChecksRail` (lista a
sinistra) + `ChecksDetailTable` (dettaglio elementi a destra). I 3 check
normativi sono derivati live dal `staticResults`:

| Norma | fyd (MPa) | Cosa controlla |
|---|---:|---|
| **S275 UC tensionale** | 261 | σ_max / fyd con γM0 = 1.05 |
| **EC3 §6.2.1 base** | 235 | EN 1993-1-1 — resistenza tensionale S235 |
| **NTC 2018 §4.2.4.1** | 261 | S275 con γM0 = 1.05 |

### Verifiche per famiglia normativa

- **EC2 Calcestruzzo** — flessione, taglio, armatura minima
- **EC3 Acciaio** — resistenza + stabilità (LTB) + classi sezionali
- **EC5 Legno** — k_mod, classi servizio, UR combinati
- **EC8 Sismica** — spettro elastico/design, fattore q
- **NTC 2018** — combinazioni SLU/SLE/sismica + envelope

Ogni verifica ritorna **UR (Utilization Ratio)** per ogni elemento:
- UR ≥ 1.0 → **FAIL** (rosso) · l'elemento non passa
- UR ≥ 0.85 → **Attenzione** (giallo)
- UR < 0.85 → **OK** (verde)

---

## 9. Leggere i risultati (Inspect)

RightRail → **👁 Inspect**. Hub di 5 card:

### Statica
- **Spostamenti nodali** — `ux, uy, uz, rx, ry, rz` per ogni nodo
- **Reazioni vincoli** — forze risultanti sui vincoli
- **Forze elementari** — N, V, M nei nodi i e j di ogni beam
- **Stress** — σ_x, σ_y, σ_z, τ_xy, τ_yz, τ_xz, Von Mises, σ_principali

### Modale
- Tabella frequenze, periodi, partecipazioni
- Animazione modi 3D (slider velocità)
- Masse efficaci per la combinazione modale

### Dinamica
- **Drift** time-history (deriva di piano)
- **Convergence** Zienkiewicz-Zhu (errore relativo z² per shell/solid)

### Iso 3D
- Surface iso Von Mises in 3D con livelli configurabili
- Isolinee 2D

### Fatigue
- Verifica EC3-1-9 (cycle counting, Δσ Mises)

---

## 10. View — visualizzazione viewport

RightRail → **🎨 View**. Hub di 4 preset:
- **Tecnica** — wireframe, no decoration, focus modello
- **CAD** — orto, wire, vincoli + carichi visibili
- **Review** — prospettica, solid, deformata visibile
- **Performance** — wireframe + nodi semplificati per modelli >10k

Toggle libere:
- ✅ **Deformata** (richiede analisi eseguita)
- ✅ **Colormap Von Mises** (rosso = alto, blu = basso)
- ✅ **Diagrammi N/V/M** (lungo le travi, con scala configurabile)
- ✅ **Tensioni principali σ₁/σ₂** (vettori 3D su shell)
- ✅ **Griglia** XY
- ✅ **Vincoli** (icone 3D)
- ✅ **Carichi** (vettori freccia)
- ✅ **Etichette nodi** (numeri ID)
- ✅ **Etichette elementi**

Mode rendering:
- **Wire** (default) · **Solid** · **Transp** (semitrasparente)
- **Orto** ↔ **Prospettica**

Switch motore:
- **Legacy** (Three.js default)
- **Engine GPU** (InstancedMesh, gestisce 100k+ elementi)

---

## 11. Esportare (Tools)

RightRail → **🔧 Tools**. Hub con 5+ export:

### 📄 Report PDF
Apre `ReportExportDialog` (multi-sezione preview):
- Cover con metadata modello
- Viewport snapshot (alta risoluzione)
- Tabelle risultati statici/modali
- Verifiche EC3 con UC bar grafici
- **Trust Layer**: ogni report mostra "DRAFT" finché non lo confermi come
  "qualifica firmata" (default DRAFT per beta)

### 📊 Excel multi-sheet
Workbook XLSX con **fino a 7 sheet** auto-generati:
1. Summary (metadata + counts + risultati top)
2. Nodes (id, x, y, z, label)
3. Elements (id, type, nodes, material, section)
4. Constraints (id, type, node, dofs)
5. Loads (id, type, target, forze)
6. Displacements (se staticResults)
7. Modes (se modalResults)

### 📂 CSV separati
- CSV displacements (solo statica)
- CSV modi (solo modale)

### 🗂 DXF (AutoCAD)
Lines + polylines per nodi/elementi. Importabile in qualsiasi CAD.

### 🏗 IFC4 (BIM)
Server-side · IfcBeam/Column/Member · scambio con Revit/Tekla.

### 📋 JSON nativo
Modello + risultati in formato FEA Pro. Re-import lossless garantito.

### Validation NAFEMS

Tools → "Apri report HTML" — esegue 5 benchmark:
- **LE1** Elliptic membrane (NAFEMS)
- **LE2** Cylindrical cantilever (NAFEMS)
- **Cantilever PL³/3EI** (analitico)
- **Simply supported 5wL⁴/384EI** (analitico)
- **Euler buckling π²EI/L²** (analitico)

Tutti i 5 passano con errori `< 1%` (eccetto LE1 a 48.85% — tolleranza
NAFEMS originale 50%). Il report.html è scaricabile, il .json è leggibile
dal frontend per UI dinamica.

---

## 12. Convention importanti

### Unità di misura
**SI di default**: m, m², N, Pa, kg/m³, °C. Niente conversioni implicite.

Switchable a `kN-m` o `N-mm` dal model header (raro, default consigliato SI).

### Sign convention
- Coordinate destrorse XYZ
- Forze positive nel verso degli assi
- Momenti positivi via right-hand rule
- **Gravità di default in `−Y`** (verticale verso il basso)

### Convention vincoli (CRITICO)
`ROLLER_<asse_bloccato>`:
- `roller_x` = blocca uₓ → libero in Y, Z
- `roller_y` = blocca uᵧ → libero in X, Z ← **classico carrello bi-appoggiata orizzontale**
- `roller_z` = blocca u_z → libero in X, Y

Questo è **opposto** alla convention Ansys / SAP2000 dove "roller asse X"
significa "asse di scorrimento X" (libero in X). Il dialog ha un hint
esplicativo per evitare errori.

### Convention elementi beam
- **Asse locale 1** = asse trave (da nodo `i` a `j`)
- **Asse locale 2** = asse maggiore inerzia (Iy)
- **Asse locale 3** = asse minore (Iz)
- Rotazione locale: `orientation` parametro elemento (default 0°)

### Trust Layer
Ogni report PDF nasce **DRAFT**. Per promuoverlo a "qualifica firmata"
serve conferma esplicita dell'ingegnere abilitato. Questo è il vincolo
deontologico FEA Pro: il software non sostituisce mai la firma.

---

## 13. Shortcut tastiera

| Tasto | Azione |
|---|---|
| `Ctrl+K` / `⌘+K` | Apre command palette (~180 voci ricercabili) |
| `Ctrl+N` / `⌘+N` | Nuovo modello |
| `F5` / `▶` | Esegui analisi |
| `N` | Dialog nuovo nodo |
| `E` | Dialog nuovo elemento |
| `L` | Dialog nuovo carico |
| `C` | Dialog nuovo vincolo |
| `M` | Dialog nuovo materiale |
| `1` | Workspace Make |
| `2` | Workspace Solve |
| `3` | Workspace Verify |
| `F` | Focus mode (full viewport) |
| `Shift+Space` | Toggle focus mode |
| `Escape` | Chiudi panel / dialog corrente |
| `?` | Cheat sheet shortcut |

---

## 14. FAQ e troubleshooting

### "Backend/database non disponibile" banner
Significa che il backend Fly.io è scaduto/freddo (cold start ~10s) o
offline. La UI resta navigabile, ma le mutation non vengono persistite.
Click **"Riprova"** dopo 30 secondi.

### Spostamenti enormi nonsensical (10¹¹ m)
Quasi sempre **vincoli mal piazzati** che lasciano gradi di libertà rigid
body. Per una trave orizzontale ricorda: cerniera a sinistra (`pinned`) +
carrello a destra che blocca **Y** (`roller_y`), non X.

### Frequenze modali tutte zero o NaN
Vedi sopra — sistema mal-vincolato. Aggiungi un vincolo per ogni modo di
rigid body (3 in 2D, 6 in 3D).

### EC3 LTB ritorna "section_class: null"
Le sezioni custom personalizzate non sempre hanno tutti i parametri per
EC3 §6.3 (Wply, classi). Usa una sezione standard (IPE/HEA/HEB) o popola
manualmente i campi `Wply`, `Wplz`.

### Il workbook XLSX si scarica vuoto
Capita raramente se la libreria SheetJS non riesce a caricare (lazy chunk
fallisce). Fai un hard refresh (`Ctrl+Shift+R`) e riprova. Il bundle xlsx
è ~96 KB gzip, dovrebbe caricarsi in <1s con connessione decente.

### Run "Esegui" non parte
- Verifica modello attivo (model picker in topbar)
- Verifica analysisType selezionato (statica/modale/dinamica)
- Apri console browser (F12) → cerca errori 422 (validation: nodi/elementi/
  vincoli mancanti) o 500 (errore solver)

### "Token scaduto" durante l'uso
Il JWT dura tipicamente 24h. Se vedi un 401, l'app ti ributta sulla
schermata di login. **I tuoi dati restano salvati** lato backend, basta
riaccedere.

---

## 15. Risorse aggiuntive

- **CHANGELOG**: storico completo release in `CHANGELOG.md`
- **API docs**: https://fea-pro.fly.dev/docs (Swagger UI · OpenAPI)
- **NAFEMS validation report**: https://fea-pro.fly.dev/api/validation/report (HTML)
- **GitHub repo**: `fedesanna99/FIA` branch `feature/redesign-precision`
- **README tecnico**: vedi `README.md` per stack tecnologico e roadmap

---

## 16. Glossario rapido

| Termine | Significato |
|---|---|
| **DOF** (Degree Of Freedom) | grado di libertà di un nodo (max 6: 3 translazioni + 3 rotazioni) |
| **UR / UC** (Utilization Ratio) | rapporto σ_attuale / σ_ammissibile · ≥1 = struttura non passa |
| **NAFEMS** | benchmark internazionali per validare codici FEM |
| **GPS Strutturale** | scorciatoia visiva FEA Pro per UC normativi base (S275 / EC3 / NTC) live sul modello |
| **Trust Layer** | sistema FEA Pro di qualifica report (DRAFT default, firma esplicita per promuovere) |
| **MITC** (Mixed Interpolation Tensorial Components) | tecnica anti-shear-locking per shell sottili |
| **β-γ Newmark** | metodo integrazione implicita per dinamica (β=0.25 γ=0.5 = trapezoidale, incondizionatamente stabile) |
| **k_mod** | coefficiente correttivo legno EC5 per durata carico e classe servizio |

---

**Buon lavoro!** Per feedback o bug report apri una issue sul repo GitHub.
La piattaforma è in continuo sviluppo e le tue segnalazioni guidano la
roadmap.

*FEA Pro v2.2.2 · 2026-05-23 · made in Italy con cuore tecnico verificabile.*
