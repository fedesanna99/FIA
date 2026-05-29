# Handoff 01 — Prompt per Claude Design · FEA Pro Dashboard redesign

> Generato il 29/05/2026 al termine di una sessione Federico + Claude Code.
> Pronto per copia-incolla in chat Claude Design su claude.ai/design/.
> Allegati indicati a fondo prompt.

---

## 📋 PROMPT (copia-incolla integrale qui sotto)

Ciao Claude Design 🤍

Sono Claude Code che lavora con Federico Sanna su **FEA Pro**, una webapp FEM
(calcolo strutturale a elementi finiti) per ingegneri italiani. Ti chiedo
un mockup HTML hi-fi per il redesign della home Dashboard.

Federico ti passa questo prompt + gli allegati elencati in fondo. Se hai
domande, Federico me le rilancia in chat (canale asincrono).

---

## 1 · Contesto prodotto

- **FEA Pro** è un FEM browser-first cloud-aware. Single-page React + TS frontend,
  FastAPI + Python backend, deploy su Fly.io.
- **Pubblico**: ingegneri strutturali italiani che oggi usano SAP2000/Midas/Robot
  per piccoli/medi modelli. Norme prime classe: NTC 2018 + Eurocodici.
- **Stato attuale**: v3.3.1 live su <https://fea-pro.fly.dev/>. Branch in lavoro
  `redesign/workspace-fasi`. La **Shell custom** (workspace post-apertura modello)
  è già stata redisegnata in Soft v2.1 + IA prototipo v3 (vedi mockup
  "Nuovo Guscio.html" in allegato).
- **La home Dashboard NON è ancora stata redisegnata** — è la cosa che ti chiedo.

### Filosofia 🤍 del prodotto

- **No bugie visive**: niente "tutto OK" se non è vero. 4 stati onesti
  `— / n/a / warn ambra / valore vero`.
- **Onestà sopra marketing**: trust badge "Preliminary" sempre acceso finché
  la validazione strutturale non è chiusa.
- **Algoritmo > AI**: il cuore di calcolo è deterministico verificabile, non
  black box. AI aiuta nell'UX (palette, autosuggest), mai nel calcolo.
- **Modello business pay-per-token**: utenti pagano in proporzione al consumo
  reale (pricing Fly.io-style). Engagement con i template è leva di conversione.

---

## 2 · Stato attuale Dashboard (cosa rifare)

Vedi allegati: screenshot live + mockup "Dashboard new.html" v2.7.1 mockup-driven.
Riassunto operativo:

- Hero "Buongiorno, Federico" con sottotitolo "Da dove ricominci oggi?"
- Piano FREE bar con utilizzo 2/5 progetti
- 3 CTA tile grandi: "Nuovo modello vuoto", "Apri un template", "Segui un percorso"
- Sezione "Modelli recenti" (cards con thumbnail SVG placeholder)
- ChangeLog interno (ClRow rows con novità prodotto: "Dashboard mockup-driven
  v2.7.1 — oggi", ecc.)
- Footer minimal

Stile estetico: usa già tokens.css ma è di sprint precedente (non allineato
a Soft v2.1 strict).

---

## 3 · Decisioni IA cristallizzate (questi sono i vincoli IA)

Prese da Federico + Claude Code dopo deep-research su 25 fonti (GitHub, Linear,
Figma, Vercel, Onshape/3DEXPERIENCE, Retool, NN/g, uxpatterns.dev) — pattern
2024-2026 convergenti su recents-first, ⌘K additivo, topbar uniforme.

| # | Decisione | Razionale |
|---|---|---|
| 1 | **Hero greeting dinamico** (Buongiorno/Buonasera/Notte fonda) + sottotitolo: tenere ma sobrio, NON dominante. Rivedibile dopo dati d'uso. | Compromesso calore vs funzionalità |
| 2 | **1 sola CTA tile primaria "+ Nuovo modello"** grande, + sotto link sobri testuali "Apri da template · Segui un percorso" | Pattern Linear/GitHub: niente proliferazione tile |
| 3 | **DashTopBar replica ShellTopBar E2.1**: brand FEA Pro + 3 icone fisse 🏠 Home / ⬜ Modelli / ⚙ Jobs + ⌘K search pill + ❓ help + 🔔 notifications + avatar menu. NIENTE model selector / save chip / Run / undo / redo / toggle Albero-Focus (quelli sono workspace-only). | Pattern Linear marzo 2026: cross-workspace consistency |
| 4 | **Piano/usage NON in home**: spostato in `/settings/billing` dedicato. Banner sticky ambra appare in home solo se quota >80% usata. | Pattern Vercel /usage, niente rumore quando non serve |
| 5 | **Fondo Dashboard = Galleria Template prominente** (≥8 template visibili). Pattern Vercel/Figma/Bolt.new: leva engagement-per-token. Thumbnail PNG pre-rendered (NO backend hit a chi spulcia, mitigazione costi). Click apre il template direttamente nel workspace. | Engagement-per-token; allineato a business model |

### Tre audacie aggiuntive che ti chiedo di considerare

a) **"Riprendi dove avevi lasciato"** sul primo modello in Recents — mini-badge
   "Ultima sessione · giovedì 18:42" + bottone CTA "Riprendi" che apre nel
   workspace nella stessa fase in cui l'utente aveva chiuso (Costruisci/Esegui/
   Risultati). Pattern Linear/GitHub.

b) **Thumbnail PNG pre-rendered per Recents + Template** (no viewport
   live-render). Riduce backend cost per utenti free che spulciano.

c) **Empty state primo login** (utente con 0 modelli): NON splash decorativo,
   ma tile illustrativi grandi con CTA dirette ai 3 template più semplici
   (Trave bi-appoggiata, Mensola, Telaio 2D). Pattern NN/g empty-state-as-
   in-context-onboarding.

---

## 4 · Design System Soft v2.1 (vedi allegati)

Riassunto essenziale (i dettagli sono nel `DESIGN_HANDOFF.md`):

- **Tono**: Soft (radius non-zero, hairline border, shadow morbida)
- **Tema default**: Light (`#FAFAFA` bg, `#15161A` ink); Dark opt-in via `data-theme`
- **Accent singular**: Cyan `#0891B2` (light) / `#6EDDF5` (dark). Mai usare
  semantic colors (success/warn/danger) per CTA — solo cyan
- **Triade font**:
  - Display: **Plus Jakarta Sans** 700 (hero, h1-h3)
  - Body: **Inter** 400/500/600
  - Mono: **JetBrains Mono** 500/600/700 (numerici tabular-nums, eyebrow
    labels, kbd, units, status bar)
- **Radius scale**: `--r-xs:4 / sm:6 / md:8 / lg:10 / xl:12 / 2xl:16 / 3xl:20 / full:9999`
- **Sharp opt-in**: `<html data-radius="sharp">` azzera tutti i radii (per
  utenti che amano Precision strict)
- **Token CSS**: fonte unica `src/tokens.css`. **NON** abolire i token
  RGB-triplet `--c-*` — sono il binario alpha intenzionale per Tailwind
  (`bg-accent/50` risolve a `rgb(var(--c-accent) / 0.5)`)

### Convention chiave

> **Vince il mockup**: quando il codice React diverge dai mockup HTML hi-fi,
> vince il mockup. Quello che produci diventa il **contratto visivo** del
> redesign Dashboard.

---

## 5 · Deliverable richiesto

1. **File HTML standalone hi-fi** della nuova Dashboard, idealmente con stati
   multipli mostrati per chiarezza:
   - Stato A: utente abituale con 2-5 modelli recenti (caso 90%)
   - Stato B: utente con quota >80% (banner ambra sticky visibile)
   - Stato C: utente primo login con 0 modelli (empty state in-context)

2. **Handoff bundle per Claude Code** (è il formato ufficiale Claude Design
   per consegnare a un Claude implementatore). Idealmente con:
   - HTML strutturato con classi semantiche
   - Componenti separati identificabili: `DashTopBar`, `DashHero`, `RecentsCarousel`,
     `NewModelTile`, `TemplateGallery`, `QuotaBanner` (cond.)
   - Note di responsive behavior

3. **Responsive targets**:
   - **Primary**: desktop 1200-1920px (caso 90% utente ingegnere)
   - **Secondary**: tablet ~768-1199px (graceful collapse via grid responsive)
   - **Mobile <768px**: NON in questo brief. Mantenere comportamento mobile
     esistente (MobileTabbar + DashboardPage v2.7.x mobile verticale). Fetta
     mobile-revamp dedicata arriverà DOPO con dati d'uso reali.

---

## 6 · Vincoli hard (cosa NON fare)

- ❌ **NON ridisegnare il design system Soft v2.1**. È consolidato in ADR 002,
  va usato così com'è. Eventuali proposte di evoluzione DS in nota separata.
- ❌ **NON inventare nuovi colori semantici**. Cyan è singular accent.
- ❌ **NON cambiare la ShellTopBar** (è già in produzione, vedi mockup
  "Nuovo Guscio.html"). La DashTopBar deve allinearsi ad essa, non viceversa.
- ❌ **NON usare splash hero decorativo full-bleed**. Il hero c'è ma è sobrio
  (eyebrow + 1 riga + sottotitolo 1 riga max).
- ❌ **NON aggiungere AI-suggest panel**. Federico vuole "algoritmo > AI" nel
  cuore del prodotto. AI in UX può servire solo nella ⌘K palette.
- ❌ **NON usare ombre drammatiche**. Filosofia DS: hairline border + shadow
  morbida. Vedi `--shadow-pop / elev / card / hover / dialog`.

---

## 7 · Allegati che Federico ti passa

Federico drag-droppa questi file all'inizio della tua chat:

1. **`DESIGN_HANDOFF.md`** — design system spec completa Soft v2.1 (26 KB)
2. **`tokens.css`** — fonte unica CSS variables (binario tecnico)
3. **Mockup HTML hi-fi "Nuovo Guscio.html"** — riferimento Shell custom
   workspace, da cui la DashTopBar deve ereditare l'estetica della topbar
4. **Mockup HTML hi-fi "Dashboard new.html"** — baseline attuale Dashboard
   (cosa stiamo rifacendo)
5. **Screenshot live `https://fea-pro.fly.dev/`** Dashboard attuale (per
   confronto baseline visiva)
6. **`CONTEXT.md`** + **`CULTURE.md`** + **ADR 002 + ADR 003** dai ricordi
   `.claude/ricordi/` — contesto cultura e decisioni storiche

---

## 8 · Canale Q&A

Se hai domande:
- Falle esplicite nella tua risposta a Federico
- Federico me le rilancia in chat
- Ti rispondo io (Claude Code) in massimo 1-2 ore
- Procediamo iterativi

Se invece partono dubbi sostanziali sul brief (es. "questa decisione IA non
mi convince, propongo X invece"), va benissimo: scrivi la tua controproposta
con razionale, Federico decide.

---

## 9 · Cosa succede dopo

1. Tu produci il mockup HTML hi-fi + handoff bundle
2. Federico ti dà feedback, iteriamo fino a OK
3. Federico mi passa il bundle finito
4. Io (Claude Code) implemento in React fetta-per-fetta in `redesign/workspace-fasi`,
   pattern stabilito: una fetta = un commit atomico, baseline test verde sempre,
   verifica live obbligatoria
5. Deploy su fly.dev quando tutte le fette sono chiuse

Grazie Claude Design — sono curioso di vedere cosa esce 🤍

— Claude Code (per Federico Sanna)

---

# 📎 NOTA OPERATIVA PER FEDERICO

Quando entri in chat Claude Design su <https://claude.ai/design/>:

1. **Crea nuova chat**
2. **Allega prima i 6 file**:
   - `design-handoff/DESIGN_HANDOFF.md`
   - `frontend/src/styles/tokens.css`
   - I 2 mockup HTML hi-fi (Nuovo Guscio + Dashboard new) da `design-handoff/`
   - Screenshot live Dashboard `fea-pro.fly.dev/`
   - `.claude/ricordi/CONTEXT.md` + `CULTURE.md` + ADR 002 + 003
3. **Copia-incolla il prompt qui sopra** (dal `Ciao Claude Design 🤍` fino a
   `— Claude Code (per Federico Sanna)`)
4. **Aspetta**: lui produrrà il primo draft. Se ha domande, segnala in chat
   e me le rilanci. Se è già ok, scarica handoff bundle e me lo passi
5. **Mi rilanci il bundle** e parto con l'implementazione fetta-per-fetta

Pronto socio? 🚀
