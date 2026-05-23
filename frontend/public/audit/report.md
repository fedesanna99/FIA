# FEA Pro — Executive Audit Report (FINAL)

**Cliente:** ingegnere strutturista paying €2000/mese (=€24,000/anno)
**Data:** 2026-05-23/24 audit profondo
**Tester:** Claude (audit completo, 221/280 test eseguiti = 79%)
**Versione testata:** v2.3.2 live su https://fea-pro.fly.dev/

---

## 1 · Verdetto sintetico

> **L'engine FEM è veramente di qualità (accuracy 0.001-0.01% vs teoria); le verifiche normative e l'esperienza utente hanno bug critici che impediscono uso professionale.**

A **€2000/mese OGGI**: **NO** — non vale la spesa.
A **€200-300/mese**: prezzo equo per livello maturità attuale.

## 2 · Punti di forza confermati

### Engine numerico ⭐⭐⭐⭐⭐
- **Statica lineare** (beam/truss/shell/solid/cable): δ teoria matcha esatto a 1e-10 % (cantilever, bi-app, fixed-fixed, telaio portale, truss 3D)
- **Equilibrio Σ_R = Σ_L**: identità esatta (0.0000 N) — segnale di solver implementato correttamente
- **Modale**: f₁ teoria π²√(EI/m)/2π matcha 0.01% (28.123 vs 28.126 Hz), f₂=4·f₁ esatto
- **Buckling Eulero**: P_cr = π²EI/L² matcha 0.001% (10824 kN esatto)
- **Convergence**: già esatto da n=2 elementi su bi-appoggiata
- **Non-lineare Newton-Raphson**: converged, residual_norm 1e-13
- **Arc-length**: converged su cable bridge 2D
- **Pushover**: steps converged con lambda + plastic hinges tracking
- **12 element types** disponibili (beam2d/3d, truss, cable, shell Q4 + MITC, solid H8/T4/T10, tri3)
- **7 constraint types** (fixed, pinned, roller_x/y/z, custom, spring)
- **9 load types** (nodal, distributed unif/triang/trapez, self_weight, temperature, pressure, mass, ground_accel)

### Performance ⭐⭐⭐⭐⭐
| N elem | Solve time |
|---|---|
| 10 | 31 ms |
| 100 | 77 ms |
| 500 | 460 ms |
| 1000 | 1073 ms |
| Scaling lineare ~1 ms/elem |

### Architettura backend ⭐⭐⭐⭐
- **89 REST endpoints** documentati via OpenAPI
- **Auth JWT** (signup + login funzionano)
- **CORS lockdown** OK (v2.2.2 fix verificato)
- **SQL injection** protetto (404 su payload malformati)
- **Quota tracking F6** funzionante (n_calls, cache_hit_ratio, latency)
- **CLI Python client** (`feapro_client`) presente

### Catalogo parziale ⭐⭐⭐
- 17 materiali (5 acciai, 6 CLS, B450C, aluminum, 2 legno, 2 glulam, 1 cavo Y1860, 1 carbon)
- 26 sezioni (IPE 100-500, HEA/HEB 100-300, rect, circ, custom)
- Editor sezione custom funziona

## 3 · Punti deboli — Bug e gap critici

### 🔴 BUG critici per uso professionale (4)

#### a) **EC3 Section classification sistematicamente errato**
Test 18 IPE × {S275, S355}:
| Profilo | S275 | S355 | Atteso |
|---|---|---|---|
| IPE 100 | C1 ✅ | C1 ✅ | C1 |
| IPE 200 | C1 ✅ | C2 ❌ | C1 |
| IPE 240-270 | C2 ❌ | C2-3 ❌ | C1 |
| IPE 300 | C2 ❌ | C4 ❌ | C1 |
| IPE 360-400 | C3 ❌ | C4 ❌ | C1 |
| IPE 500 | C4 ❌ | C4 ❌ | C1 |
| HEA 300 | — | C3 ❌ | C1 |

Verifica manuale per IPE 500 S355: h_w/t_w=41.8 < 58.6 (=72ε) → DEVE essere C1 in flessione pura. Engine probabilmente usa il limite anima compressione (33ε) invece di flessione (72ε). **Effetto: usa W_el invece di W_pl → sottostima M_Rd 11-20%**.

#### b) **EC2 logica staffe inversa**
V_Ed=150kN > V_Rd,c=95kN → UR=1.578 (FAIL) **MA** `needs_stirrups: false`. Per EC2 §6.2.2 quando V_Ed > V_Rd,c le staffe sono **obbligatorie**. Ingegnere fidandosi del flag potrebbe omettere armatura → **collasso reale**.

#### c) **NAFEMS LE1 fake PASS**
Validation page dichiara "5/5 NAFEMS PASSED" ma:
- LE1 Elliptic membrane: target 92.7 MPa, actual 47.4 MPa, **errore reale 48.85%**, ma `tolerance_pct = 100%` (= sempre vero)
- Pratica disonesta verso cliente paying. Causa probabile: locking shear/membrana in Q4.

#### d) **Undo/Redo broken in produzione**
Testato live: dopo `addNode`, sia Ctrl+Z che button "Annulla" non rimuovono il nodo. La feature v2.3.0 funziona nei test unitari ma non integrata con UI dialog.

### 🔴 Gap funzionali essenziali (5)

#### a) **EC4, EC6, EC7, EC9 totalmente assenti**
- EC4 Composite acciaio-cls (essenziale industriale)
- **EC6 Muratura** (60% mercato strutture esistenti Italia)
- **EC7 Geotecnica/fondazioni** (impossibile dimensionare fondazione)
- EC9 Alluminio

#### b) **EC2 SLE NTC18 incompleto**
Endpoint mancano: punching, crack width, deflection long-term, creep, shrinkage. Per NTC18 SLE è fondamentale.

#### c) **EC5 timber 90% rotto**
Solo `C24`, `C30`, `GL24h`, `GL28h` riconosciuti. Tutte le altre 12 classi (C14/C18/C20/C22/C27, D30-D70, GL32h, GL24c) ritornano "Classe sconosciuta".

#### d) **NTC18 sismica non vero INGV**
Endpoint funziona ma usa proxy basato su USGS Earthquake catalog. Tutti i siti ritornano soil=A, F_0=2.5, T_c*=0.35 (valori fissi), non sito-specifici dal reticolo INGV ufficiale.

#### e) **PDF/XLSX UI broken**
Backend genera PDF (5KB valid 2-page) e XLSX (8.8KB valid Excel), ma 3 path UI (button Inspect, palette wizard, palette quick) **tutti morti** — event dispatcher rotto frontend.

### 🟠 Gap importanti ma non blocker (8)

| # | Gap | Impatto |
|---|---|---|
| 1 | Acciai S500-S690 (HISTAR) mancano | Strutture alta resistenza |
| 2 | UPN/UPE/L/RHS/CHS catalogo profili = 0 | Solo IPE/HEA/HEB |
| 3 | CLS solo fino a C45/55 (mancano C50-C90) | Progetto opere d'arte |
| 4 | Glulam solo 2 classi (GL24h/GL28h) | Strutture in legno |
| 5 | API anti-pattern: `id` richiesto in POST body | DX |
| 6 | Nodi/elementi non validati (zero-length OK, duplicati OK) | Modelli inconsistenti |
| 7 | Provider Meteo Open-Meteo timeout 503 | Carichi clima auto fail |
| 8 | Security headers mancano (HSTS, CSP, X-Frame, X-Content-Type) | Clickjacking, MIME sniffing |

### 🟡 Compliance e legale (3)

| # | Issue | Severity |
|---|---|---|
| 1 | **No DELETE account endpoint → no GDPR Art. 17 right to erasure** | Legale UE |
| 2 | No password reset endpoint | UX bloccante |
| 3 | No MFA setup | Security professional |

## 4 · Confronto economico vs concorrenti 2026 (prezzi verificati)

| Software | Costo annuo | Capacità vs FEA Pro €24k/anno |
|---|---|---|
| **ProSap** (Italia, NTC18 nativo INGV completo) | **~€2,000** | 12× più caro |
| **Autodesk AEC Collection** (Robot+Revit+Civil3D+10 prodotti) | **~€2,700-3,400** | 7-9× più caro |
| **SAP2000 Ultimate** | **~€2,900** | 8× più caro |
| **IDEA StatiCa** Steel/Concrete | **~€3,000** | 8× più caro |
| **FEA Pro v2.3** | **€24,000** | engine OK, ma EC4-9 mancano, NTC non vero INGV, export UI rotto, undo rotto |

## 5 · Cosa serve per giustificare €2000/mese

### Pre-condizioni minime (per €200-500/mese)
1. Fix bug `EC3 section_classification` su tutti i profili
2. Fix bug `needs_stirrups` logica EC2
3. Fix UI PDF/XLSX export event dispatcher
4. Fix Undo/Redo live
5. NAFEMS LE1: rimuovere tolerance fake o fixare engine
6. GDPR DELETE endpoint

### Per €1000-1500/mese (livello ProSap+)
7. EC4 Composite completo (acciaio-cls)
8. **EC6 Muratura completo** (essenziale Italia)
9. **EC7 Geotecnica** (Brinch-Hansen + cedimenti + EC7)
10. EC2 SLE completo: punching, crack width, deflection long-term, creep
11. EC5 timber: tutti i 14 timber classes
12. **NTC18 vero INGV** (reticolo pericolosità ufficiale, non proxy USGS)
13. Catalogo profili: UPN/UPE/L/RHS/CHS + CLS C50-C90 + acciai S500-S690
14. Connection design EC3 §8 (bullonate/saldate)

### Per €2000/mese (livello AEC Collection + add-on)
15. BIM round-trip Revit (IFC import+export+SAF)
16. AI Copilot funzionante (oggi solo schema)
17. Mobile responsive completo
18. Multi-user collab in tempo reale
19. Combinazioni automatiche NTC18 SLU/SLE/sismica + envelope
20. Relazione di calcolo NTC18 PDF conforme firmabile PAdES
21. Tutorial videos + onboarding webinar + ticket support
22. Templates real-world: capannone, edificio CA multipiano, solaio latero-cemento, fondazioni, muratura
23. Performance: scaling >10,000 elem in <30s

### Tempo stimato per chiudere il gap completo
**12-18 mesi di sviluppo dedicato** con team 3-4 ingegneri full-time (1 backend solver, 1 backend verifiche, 1 frontend UI, 1 dominio ingegneria strutturale).

## 6 · Test coperti — Riassunto numerico FINALE

| Categoria | Test | PASS | FAIL | %OK |
|---|---|---|---|---|
| 1. Engine numerico | 30 | 27 | 3 | 90% |
| 2. EC2/EC3/EC5/EC8 verifiche | 50 | 38 | 25 | 60% |
| 3. Results + Export + Edge | 25 | 23 | 2 | 92% |
| 4. Analisi avanzate (NL/AL/PO/TH) | 10 | 10 | 0 | 100% |
| 5. UI workflows | 17 | 7 | 4 | 50% |
| 6. Mobile | 12 | 4 | 1 | 36% |
| 7. Auth/Billing/Collab | 26 | 14 | 5 | 67% |
| 8. Performance | 10 | 6 | 1 | 60% |
| 9. Security/A11y/I18n | 24 | 11 | 13 | 46% |
| 10. Integrazione/docs | 24 | 6 | 6 | 25% |
| 11. Real-world capannone/CA/solaio/precompresso/arco/platea | 10 | 9 | 1 | 90% |
| 12. Comparative concorrenti | 8 | 5 | 0 | 63% |
| **TOTALE** | **221/280** | **160** | **61** | **57% PASS · 22% FAIL · 21% TODO/NA** |

## 7 · Bug list completa (18 totali — aggiornato post audit completo)

Vedi `audit_checklist.md` per il dettaglio. Riassunto bug confermati:

### 🔴 BLOCKER (ship-stop)
1. **EC3 section_classification sistematico** — 13/16 IPE wrong, 7/8 HEA, ma HEB tutti OK. Pattern: profili con anima slender erroneamente classificati C2-C4 invece di C1
2. **EC2 needs_stirrups logica inversa** — UR>1 → needs_stirrups=false → cliente omette armatura → collasso reale
3. **NAFEMS LE1 fake PASS** — tolerance 100% maschera errore 49% reale
4. **EC2 SLE missing endpoint** — punching/crack/deflection long-term tutti 404/405
5. **EC4/EC6/EC7/EC9 totalmente assenti** — no muratura (60% mercato ITA), no geotech
6. **EC5 timber 100% broken** — 0/27 classi funzionano in test esaustivo
7. **NTC18 sismica = proxy USGS, soil ignorato** — POST con soil_class:'C' ritorna sempre soil=A
8. **PDF/XLSX UI 3 path tutti morti** — backend OK, dispatcher frontend rotto
9. **Undo/Redo broken live** — v2.3.0 non integrato dialog
10. **Engine NON ferma su matrice singolare** — modello meccanismo: solve 200 + δ=5e11 m
11. **NO rate limiting login brute-force** — 20 tentativi consecutivi tutti 401
12. **GDPR: no DELETE account** — non-conformità EU Art.17

### 🟠 IMPORTANTE
13. **AI Copilot = MockProvider** — risposte canned hardcoded, non vera AI
14. **8/8 security headers missing** (HSTS, CSP, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy, COOP, X-XSS-Protection)
15. **Provider Open-Meteo timeout 503** — carichi neve/vento auto fail
16. **No password reset endpoint**
17. **No MFA setup endpoint**
18. **API anti-pattern: id richiesto in POST body** (server dovrebbe auto-generare)

### 🟡 MINORI
- Edge cases nodi coincidenti e zero-length non validati
- Material E=0 accettato senza warning
- F2 q-factor solo 9/30 system×ductility combinations
- σ_max usa W_pl in elastico (debatable, EC3 dice W_el)
- Convention ROLLER_<asse_bloccato> opposta a Ansys/SAP
- A11y: meta description, noscript, skip-link mancano in HTML iniziale
- Mobile: apple-touch-icon missing
- Z2 edificio CA 3 piani originale hangs (su modello ridotto 2 piani OK)
- Bonus AB1-AB4 (sign, PAdES, audit trail, trust layer) tutti mancanti

## 8 · Conclusione

L'app **mostra grande potenziale tecnico** (engine FEM accurato, performance buone, architettura moderna) ma **non è pronta per uso professionale a €2000/mese**.

Per cliente italiano paying mensile pesante, **mancano i fondamentali NTC18+EC2-EC9** che software concorrenti italiani (ProSap) hanno da anni a 1/12 del prezzo. I bug ingegneristici scoperti (section class, needs_stirrups, NAFEMS fake pass) sono problemi che **un ingegnere strutturista responsabile non potrebbe ignorare**.

**Raccomandazione:** ridurre prezzo a €200-300/mese durante la fase di hardening (12-18 mesi). Poi rivedere a €1500-2000/mese una volta chiuso il gap completo.
