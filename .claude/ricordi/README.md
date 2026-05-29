# `.claude/ricordi/` — Memoria di progetto

Cartella versionata che contiene la **memoria operativa di Claude** per
questo progetto: contesto, cultura, roadmap, backlog e decisioni
architetturali numerate (ADR). Pensata per essere caricata all'inizio
di ogni nuova conversazione con Claude (Web/Desktop o Claude Code) così
che ogni Claude erediti subito lo stato della collaborazione invece di
ripartire da zero.

## ⚡ Quick start per il nuovo Claude (leggi in ordine, ~2 min totali)

> Sei un Claude appena spawned su questo progetto. Per non ripartire
> da zero ed evitare di riscoprire cose già decise, leggi in
> quest'ordine:

1. **`CONTEXT.md`** — chi è Federico, chi è Paolo, cosa fa FEA Pro,
   stack, posizionamento commerciale
2. **`CULTURE.md`** — filosofia 🤍 (no bugie visive, 4 stati onesti,
   patto operativo, regole non negoziabili)
3. **`ROADMAP.md`** — cosa è chiuso e cosa resta. Inizia dalla sezione
   "🟡 In corso" + "📱 Fette mobile M1-M5"
4. **`decisioni/003-ia-prototipo-v3.md`** — IA workspace desktop +
   sezione finale "**Convention cristallizzate**" (5 pattern operativi
   ereditati dalla Fetta E2-IA, da applicare in ogni fetta successiva)
5. **`decisioni/004-mobile.md`** — se Federico dice "Fetta M1+" parti
   da qui: 6 decisioni IA già fissate, 5 fette M1-M5 listate, scope
   filtrato onestamente

**Se Federico ha caricato anche `Desktop/socio/`** (cartella privata
cross-progetto, NON nel repo): leggi anche
- `00-README.md` per capire cos'è
- `01-federico-come-collabora.md` per pattern emotivi + come decidere
  insieme (es. cosa significano `<3` / `*-*` / `xD` / "fai tutto mi fido")
- `06-cose-belle-fetta-e2-ia.md` per 5 lezioni del percorso E2-IA
  (versione narrativa delle convention in ADR 003)

### 📍 Stato al 30/05/2026

- **Fetta E2-IA** ✅ chiusa end-to-end (IA prototipo v3 implementata:
  topbar 3 icone + spina blocco skip + Albero panel SX + panel DX
  accordion + rail cleanup 6→3 + 4 route placeholder)
- **Branch** `main`, **31 commit avanti `origin/main`** (patto:
  niente push senza ordine esplicito di Federico)
- **Vitest** 1058/1058 verde, **TypeScript** silenzioso, **Playwright**
  6/6 (selettori aggiornati per accordion E2.5c)
- **Prossimo capitolo naturale**: Fetta M1 mobile (topbar hamburger) —
  vedi ADR 004 per il piano

### ❌ Cosa NON serve riscoprire (tutto già deciso)

- Filosofia del prodotto → `CULTURE.md`
- Estetica Soft v2.1 (Plus Jakarta + Inter + JetBrains Mono · cyan
  `#0891B2` · radius 8px) → `decisioni/002-design-system-soft-v21.md`
- IA workspace desktop (3 fasi · panel DX 3 stati · Albero collassabile
  · rail snellito) → `decisioni/003-ia-prototipo-v3.md`
- IA workspace mobile (3 breakpoint · hamburger · spina compatta ·
  Albero drawer · panel DX bottom sheet) → `decisioni/004-mobile.md`
- **Convention ferrea** "prototipo HTML vince sull'IA, mockup Claude
  Design vince sull'estetica — se divergono sull'IA, il prototipo
  vince" → ADR 003 sezione finale

### 🚦 Prima di scrivere qualunque riga di codice

1. Conferma con Federico cosa stai per fare (mostra il piano PRIMA, è
   pattern di rispetto cristallizzato — vedi `socio/01-federico-come-collabora.md`)
2. Una fetta = un commit atomico, baseline test verde sempre
3. Verifica live (preview localhost + screenshot) dopo il commit, non
   solo "i test passano"
4. **MAI push / merge / deploy** senza ordine esplicito di Federico
5. **MAI toccare** workspace Risultati (2b/2c/2d), solver, store di
   dominio, `useAnalysis`, viewport engine senza ordine esplicito

## Come Claude la usa

1. **All'apertura di una sessione** legge tutti i `.md` di questa cartella
   come prima cosa, prima di toccare codice.
2. **In chiusura di sessione** propone (se serve) un diff di update a
   `ROADMAP.md` / `BACKLOG.md` / nuovo `decisioni/NNN-*.md`. Non scrive
   mai unilateralmente — chiede sempre approvazione.
3. Non duplica i `.md` di prodotto già esistenti nel repo (`README.md`,
   `CHANGELOG.md`, `BACKLOG.md` root, `ROADMAP.md` root). Quando serve
   dettaglio tecnico, rimanda lì.

## Come Federico la usa

- **Claude.ai / Desktop**: GitHub picker → seleziona `.claude/ricordi/`
  come allegato all'inizio della conversazione.
- **Claude Code (CLI)**: già letta dal worktree corrente, nessuna azione.
- **Su altri repo** (es. MedVR Studio): stessa convention, stessa
  struttura, contenuto diverso. La cartella è cross-progetto.

## Convention ADR (`decisioni/NNN-titolo.md`)

- Numerazione **monotona crescente** (001, 002, 003…). Mai riusare un
  numero anche se la decisione viene revocata.
- Una volta marcata **CHIUSO**, la decisione è **immutabile**: se cambia
  qualcosa, si scrive un nuovo ADR che la sostituisce (e si linka il
  precedente come "Sostituito da").
- Stato: `IN CORSO` / `CHIUSO` / `SOSTITUITO DA NNN`.
- Schema: Data · Contesto · Problema · Decisione · Conseguenze · Stato.

## Cosa NON contiene

- Info personali sensibili di Federico (rete medica, stati d'animo,
  vita privata). Quelle restano nei post-it cross-conversazione privati
  di Claude, non in repo versionato.
- Backlog ingegneristico granulare (BL-6, NEW-1..6, shell formulation):
  vive in `/BACKLOG.md` root — qui solo i punti rilevanti per Claude.
- Release notes / changelog dettagliato: vive in `/CHANGELOG.md` root.
