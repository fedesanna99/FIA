# FEA Pro · Handoff Package per Claude Code

> Pacchetto pronto da consegnare a Claude Code (o sviluppatore React/TypeScript)
> per implementare il redesign UI nel codebase esistente di FEA Pro.

---

## Cosa c'è dentro

| File | A cosa serve | Quando leggerlo |
|---|---|---|
| **`PROMPT_FOR_CLAUDE_CODE.md`** | Il prompt da incollare in Claude Code come primo messaggio | Per primo |
| `implementation.md` | Mapping completo: tokens → CSS variables → Tailwind, componenti React da toccare con stima sforzo | Subito dopo il prompt |
| `migration-risks.md` | Cosa rompe, cosa no, breaking changes, ordine di intervento | Prima di toccare codice |
| `tokens.css` | Design tokens production-ready · formato RGB triple compatibile col codebase esistente | Sostituisce `colors_and_type.css` |
| `tailwind.config.snippet.js` | Estensione `theme` di Tailwind da mergiare con la config esistente | Quando si esegue `tailwind.config.js` |
| `precision.css` | Design system sorgente (sviluppato in Claude Design). Usato dalle 17 schermate di riferimento | Riferimento — non da deployare così com'è |
| `screens/` | 17 schermate HTML di riferimento, pixel-faithful, navigabili in browser | Riferimento visivo. Aprire ognuna per vedere il design target |
| `screens/autoscale.js` | Helper di scaling per le schermate, non parte del codebase | Solo per visualizzazione |

---

## Come usare con Claude Code

1. **Apri Claude Code** in una nuova sessione collegata al repo `feapro` branch `test` (o crea un branch `redesign-v1.9-precision`).

2. **Allega questo intero zip** al messaggio iniziale.

3. **Incolla il prompt da `PROMPT_FOR_CLAUDE_CODE.md`** — è già strutturato per:
   - dire a Claude Code l'ordine in cui leggere i file
   - dichiarare i vincoli (no rimozione feature, no nuove dipendenze pesanti)
   - chiedere uno sprint plan diviso in PR atomiche
   - definire i check di success (visual diff, lighthouse, vitest verdi)

4. **Lascia che Claude Code generi il piano**, poi approva PR per PR.

---

## Riassunto delle decisioni di design

- **Direzione visiva**: Precision (Apple/CAD industrial)
- **Tema default**: light (era dark). Dark theme paritetico via `[data-theme="dark"]` su `<html>`
- **Accento**: cyan singolo (`#0891B2` light · `#5DD7F2` dark) — Studio Pro e Percorsi si distinguono per layout, non per colore
- **Geometria**: spigoli vivi (radius 0 ovunque)
- **Borders**: hairline only — shadow ridotte al minimo, mai gradient
- **Tipografia**: Inter (body) + Inter Tight (display) + JetBrains Mono (numerici)
- **Italiano**: predominante nei testi. Inglese solo per termini universali (FEM, REST, kN, ⌘K)
- **Trust Layer**: report sempre `DRAFT` finché qualifica utente non confermata, con watermark grafico
- **Compute profile**: costo trasparente prima del run (crediti + ETA + hardware)

---

## Stima sforzo totale

**~17 giorni-uomo** di un engineer React/TypeScript, suddivisi in 5 PR:

1. **Tokens + atoms** (2.5g) — sostituzione `colors_and_type.css`, classi Tailwind base, 8 atoms
2. **Chrome navigazionale** (3g) — TopBar, LeftRail, RightRail, StatusBar, MissionBar, ModelInfoCard
3. **Schermate principali** (5g) — Dashboard A1, Modelli A2, Workspace B1, Verify B3, Galleria C1, Percorsi C2-C7, Critical C6, Report C7
4. **Animazioni + stati** (3g) — Loading C5b, Command Palette E2, Onboarding E1, hover/focus/disabled
5. **Mobile/tablet + polish** (3.5g) — D1, D2, edge cases, QA, lighthouse

Dettaglio task-by-task in `implementation.md` sezione 4.

---

## Cosa NON cambia nel codice esistente

- Backend Python/FastAPI · 0 modifiche
- Solver, viewport-engine, FEM math · 0 modifiche
- Logica Studio Pro vs Percorsi · 0 modifiche
- Routing applicativo · 0 modifiche (le 14 schermate del brief mantengono path attuali)
- Zustand store · 0 modifiche
- Test pytest · 0 modifiche · 660+ test devono restare verdi
- Test vitest · alcuni snapshot vanno aggiornati ma logica intatta

---

## Domande prima di iniziare

Se qualcosa è ambiguo, fermati e chiedi all'utente:
- Quale tipografia ha licenza usabile? Inter è OFL, JetBrains Mono è OFL → ok. Inter Tight è OFL → ok.
- Esistono già token Tailwind custom in `tailwind.config.js`? Mergiare, non sostituire.
- I componenti shadcn/ui presenti vanno tenuti? Vanno ri-stilati con i nuovi token, non rimossi.
- C'è una persona di brand/marketing che deve firmare il dark vs light default?

---

**Buon lavoro.**
