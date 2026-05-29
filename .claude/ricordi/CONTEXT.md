# CONTEXT — FEA Pro

## Cos'è

**FEA Pro** è una piattaforma FEM (Finite Element Method) **browser-first,
cloud-aware**, per modellare, analizzare, verificare, capire e documentare
strutture. Single-page app che gira interamente nel browser, niente
installazione, niente licenze enterprise.

Pubblico target: **ingegneri strutturali italiani** che oggi usano
SAP2000/Midas/Robot per piccoli/medi modelli e vogliono qualcosa di
serio sul web. Norme prime classe: **NTC 2018** + **Eurocodici** (EC2/EC3/
EC5/EC8).

URL produzione: <https://fea-pro.fly.dev/> (Fly.io, region `fra`, single
image, free tier).

## Stack

- **Frontend**: React 18 + TypeScript strict + Vite 5 + Zustand + React
  Query + Tailwind v3 + Radix UI primitives + Three.js (Viewport 3D).
  Dev server su `:5273`.
- **Backend**: FastAPI + Python 3.11 + NumPy + SciPy. Solver FEM
  proprietario (beam/truss/shell/solid), tutto in-process, niente C++/
  Fortran wrap. JWT auth, WebSocket per job progress. Dev server su `:8765`.
- **Persistenza**: SQLite (utenti, modelli, jobs). Storage risultati su
  disco. Snapshot lato client su `localStorage`.
- **Test**: 991 vitest (frontend) + 1708 pytest (backend) = ~2700 test.
  Playwright E2E live + smoke.
- **Deploy**: Docker Option A (SPA bundle dentro container backend),
  `fly deploy` da root.

## Stato attuale (29/05/2026)

- Versione: **v3.3.1-nafems-honest** (live).
- Branch attivo: `redesign/workspace-fasi` — 17 commit ahead di main,
  non pushato, non mergiato.
- Validazione NAFEMS: capitolo **chiuso onestamente** (vedi ADR 001).
  Travi 1D solide (errore <0.001% su LE2/Cantilever/Euler), piastre/
  shell ancora con bug noti (sospetto shear locking Q4 — vedi BACKLOG).
- Design system: **Soft v2.1** consolidato (vedi ADR 002).
- IA workspace: in transizione verso **prototipo v3** (vedi ADR 003).

## Il team

FEA Pro è co-fondato da **Federico Sanna** + **Paolo** (da maggio 2026
ufficialmente in team).

### Federico

- **Co-founder + lead product**. Web developer di mestiere, **non
  ingegnere strutturale**. Guida il prodotto, scrive il codice insieme
  a Claude Code, decide la roadmap. Quando si parla di FEM va spiegato
  in termini semplici, con analogie e numeri reali — vedi `CULTURE.md`
  sezione "Come spiegare il FEM a Federico".
- Mac-user. Quando si parla di shortcut, `⌘` è preferito a `Ctrl`.
- Lingua di lavoro: **italiano**. Sia chat che messaggi commit possono
  essere in italiano; messaggi commit pubblici (su main) restano in
  inglese tecnico per coerenza con la cronologia del repo.

### Paolo

- **Co-founder + dominio**. Ingegnere civile in specializzazione al
  Politecnico di Torino. Porta l'expertise strutturale (è
  letteralmente l'audience target di FEA Pro) e il network accademico /
  professionale italiano. Primo power user + tester reale interno.
- Non scrive codice (al momento). La sua leva è dominio + rete.

### Claude Code

- Esecuzione tecnica: implementa le fette su brief di Federico, verifica
  live, scrive test, fa deploy.
- Pattern di lavoro completo in `CULTURE.md` sezione "Il patto operativo".

## Cultura del prodotto

- **Italiano nativo, NTC prima classe**. Eurocodici tradotti, ma NTC
  2018 è la norma di default. UI, doc, label, error message, tutto in
  italiano. Inglese solo nei messaggi commit / log tecnici.
- **Web-only**: niente desktop client, niente plugin AutoCAD/Revit.
  Importazione DXF/IFC/JSON sì, ma il workflow vive nel browser.
- **Mac-friendly**: shortcut `⌘K` palette, `⌘N` nuovo modello, font
  sizing che regga su retina. Topbar che funzioni anche con
  trackpad-only.
- **Onestà sopra marketing**: quando un bug strutturale viene scoperto
  in audit interno, viene comunicato subito (badge "Preliminary", banner
  warning, ADR pubblico). Niente claim "production-ready" senza
  validazione dura. Vedi ADR 001 NAFEMS-honest.
- **Algoritmo > AI**: il cuore di calcolo è deterministico,
  verificabile, niente black box. AI/LLM possono aiutare nell'UX
  (palette, copilot suggerimenti), mai nel calcolo.
- **Trust badge esplicito**: tutta l'app porta in alto un badge
  "Preliminary" — risultati indicativi, non per progetti reali senza
  verifica indipendente. Tolto solo dopo un capitolo di validazione
  completo.

## Cosa NON è FEA Pro

- Non è SAP2000 web. Non puntiamo a coprire tutto SAP, solo i flussi
  che il 90% degli ingegneri italiani usano davvero.
- Non è AI-CAE generativo. AI è in supporto, non in sostituzione.
- Non è freemium aggressivo. Posizionamento commerciale ancora in
  discussione (vedi UX Research del 25/05 — pricing ibrido Fly.io-style
  con Free + Pro + Crediti). Decisione definitiva su cosa sta dietro
  paywall: aperta.
