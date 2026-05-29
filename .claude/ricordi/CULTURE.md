# CULTURE — Filosofia 🤍 e patto Federico-Claude

## La filosofia 🤍

### 1. No bugie visive

L'UI **non dice mai cose che non sono vere**. Niente falsi positivi,
niente falsi negativi.

- 0 verifiche eseguite ≠ "Tutto in sicurezza". Si scrive `—` o `n/a`.
- Δ equilibrio su carichi distribuiti esclusi dal computo ≠ `Δ ✗` rosso.
  Si usa un tono `info` neutro che spiega perché.
- UR mancante perché EC3 non applicabile a quel tipo di sezione ≠ `0.00 ✓`.
  Si scrive `n/a` con motivazione esplicita.

Pattern operativo cristallizzato: **4 STATI ONESTI**

| Stato | Quando | Esempio UI |
|---|---|---|
| `—` | Non ancora calcolato | Pre-Run |
| `n/a` | Non applicabile | Sezione fuori EC3 |
| warn ambra | Sospetto, da verificare | 0/0 verifiche, mesh dubbia |
| valore vero | Calcolato + valido | `UR = 0.42` mono |

### 2. Fatto = lo vedo a schermo

Niente "implementato ma non testato live". Ogni fetta chiude solo se
c'è uno screenshot o un E2E verde che dimostra il comportamento sul
sito reale. La baseline test (vitest + Playwright) deve **restare verde
dopo ogni fetta**, mai dopo "tutto il PR".

### 3. Numero + normativa sempre

Quando l'app dichiara un risultato strutturale, vicino al numero c'è la
**fonte normativa** (EC3 §6.2.5, NTC 2018 §4.2.4, ecc.). Niente numeri
nudi. Se la fonte non c'è, il numero è solo informativo e va etichettato
come tale.

### 4. Onestà sopra marketing

- Trust badge "Preliminary" sempre visibile finché il capitolo di
  validazione corrispondente non è chiuso.
- Bug strutturali noti documentati pubblicamente (`docs/nafems_truth_audit.md`,
  `.claude/ricordi/BACKLOG.md`). Niente sweep-under-the-rug.
- Commit messages onesti: `fix(shell): reactions equilibrium box — honest
  neutral instead of scary ✗` è il tipo di linguaggio canonico.

## Il patto operativo Federico-Claude

### Divisione del lavoro

| Strumento | Cosa fa | Cosa NON fa |
|---|---|---|
| **Chat (Claude.ai)** | Strategia, decisioni di prodotto, brief delle fette, redesign UX, ADR | Esecuzione codice, edit massivi |
| **Claude Code (CLI)** | Esecuzione disciplinata, commit atomici, verifica live, test | Decisioni di scope (le chiede a Federico) |
| **Claude in Chrome / QA explor.** | Audit visivo, screenshot, bug discovery, smoke manuali | Codice |

### Disciplina di fette

- **Una fetta = un commit atomico**. Mai monster commit. Mai più
  feature mescolate nello stesso commit.
- **Baseline verde sempre**: vitest + playwright devono restare al
  contatore precedente (o aumentare) dopo ogni fetta. Se non lo sono,
  si ferma e si sistema prima.
- **Fermati e segnala**: se durante l'esecuzione i numeri non tornano
  (es. test pre-existing che fallisce, design system che si rompe), Claude
  Code **deve fermarsi e riportare**, non improvvisare un fix.
  Pattern usato in passato per evitare regressioni invisibili (ricordo:
  diagnosi `--c-*` come binario alpha intenzionale, salvata in extremis).

### Regole non negoziabili

- **Mai push, merge o deploy** senza ordine esplicito di Federico.
- **Mai toccare il workspace Risultati** (2b/2c/2d) o il solver / store
  di dominio / `useAnalysis` / viewport engine senza ordine esplicito.
- **Test credentials**: `federico@feapro-qa.com` / `Verifica2026!` (ENV
  di sviluppo, mai uso production).
- **Commit messages** in italiano per le fette interne, ma il body può
  contenere riferimenti tecnici in inglese (Co-Authored-By restano in
  inglese).

## Come spiegare il FEM a Federico

Federico è **web dev, non ingegnere strutturale**. Quando si parla di
calcolo FEM, valgono queste regole:

1. **Analogie prima di formule**. Esempio: "shear locking Q4" → "gli
   elementi shell di tipo Q4 sotto-stimano la deformazione perché
   resistono più del dovuto al taglio — come una molla virtualmente
   troppo rigida". Solo dopo arriva la formula.
2. **Numeri reali, non simboli**. Non `σ = M·y/I` astratto, ma "la
   trave si flette di **3.2 mm a metà**, e la tensione massima è di
   **125 MPa** sull'estremità superiore — il limite acciaio S275 è
   275 MPa, quindi UR=0.45".
3. **Confronta con qualcosa di noto**. "Questo modello dà −32% di
   errore vs il riferimento NAFEMS LE1, che è il benchmark canonico
   per piastre con foro — è oltre la tolleranza ufficiale ±5%, quindi
   FAIL onesto, vedi ADR 001".
4. **Niente gergo da ingegnere senza glossa**. "MITC4", "stress
   recovery", "Newton-Raphson" vanno glossati la prima volta che
   compaiono nella conversazione.
5. **Mostra l'immagine quando puoi**. Uno screenshot del viewport con
   colormap > 100 righe di spiegazione.
