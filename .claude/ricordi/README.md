# `.claude/ricordi/` — Memoria di progetto

Cartella versionata che contiene la **memoria operativa di Claude** per
questo progetto: contesto, cultura, roadmap, backlog e decisioni
architetturali numerate (ADR). Pensata per essere caricata all'inizio
di ogni nuova conversazione con Claude (Web/Desktop o Claude Code) così
che ogni Claude erediti subito lo stato della collaborazione invece di
ripartire da zero.

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
