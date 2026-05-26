# FEA Pro v3 · Piano Operativo Fase 1

> Piano formale per la Fase 1 del lavoro di UX Architecture vera su FEA Pro.
> Sostituisce l'approccio "fix incrementale 64 bug" e l'approccio "redesign
> visivo Precision". Va al livello sottostante: modello mentale dell'utente.
>
> Documento fonte autoritativa. Da non modificare se non con decisione esplicita.
> 2026-05-25 — Federico + Claude

---

## CONTESTO STRATEGICO

### Il salto di livello

Le sessioni precedenti hanno chiarito che FEA Pro ha problemi a **3 livelli sovrapposti**:

- **Livello 1** · Visual design (token, colori, font, radius)
- **Livello 2** · Interaction design (animazioni, feedback, transitions)
- **Livello 3** · UX architecture (modello mentale dell'utente, information architecture)

Il **redesign Precision precedente** (brief Chat A "Greeting in Italian", 24/05 pomeriggio) operava al 70% sul Livello 1 + 20% Livello 2. È stato fermato dopo S1 perché Federico ha intuito — senza poterlo nominare — che **lavorava sulla pelle, non sullo scheletro**.

L'**audit founder-driven** (24/05 sera, in questa chat) ha trovato 64 bug. ~70% sono bug di Livello 3 mascherati da bug di Livello 1.

La Fase 1 affronta il **Livello 3 davvero**: ricostruire il modello mentale dell'ingegnere strutturista, e da lì derivare la Information Architecture giusta per FEA Pro v3.

### Decisione di metodo

Federico ha scelto:
- **NO Paolo come informatore primario** durante Fase 1. Paolo arriverà come tester quando avremo qualcosa di solido da fargli provare
- **SÌ Claude come ricercatore + IA architect**, basato su web research rigorosa
- **Profondità massima** (Opzione C): 30+ query, paper academici, competitor analysis estesa
- **Lingua mista**: italiano per modello mentale local + inglese per UX research seria
- **Output**: 3 documenti grezzi, da rielaborare insieme dopo lettura

### Rischio accettato

Senza Paolo come informatore, ricostruiamo il modello mentale dell'ingegnere italiano da **fonti indirette**. Margine di errore esiste. Mitigato da:
1. Federico è ingegnere strutturista freelance — può fungere da proxy parziale per validare assunzioni
2. La validazione finale con Paolo arriva alla fine, prima dell'implementazione vera (Fase 6)
3. Se al check con Paolo qualcosa non torna, ricalibriamo prima di sprecare mesi di codice

---

## OUTPUT ATTESI · 3 DOCUMENTI

### Documento 1 · UX_RESEARCH_RAW.md

**Cosa è**: materiale grezzo della ricerca, da consultazione

**Dimensione attesa**: 60-100 pagine

**Struttura**:

1. **Sezione A · Workflow ingegnere FEM**
   - Forum (Eng-Tips, Reddit r/StructuralEngineering, Ingegneri.info)
   - Blog professionali italiani e internazionali
   - Tutorial video YouTube più visti per software FEM
   - Discussion LinkedIn ingegneri strutturali

2. **Sezione B · Software FEM analizzati**
   - **Top mainstream**: SAP2000, MIDAS Civil/Gen, STAAD.Pro, RFEM, Autodesk Robot, ETABS, Strand7
   - **Specializzati IT**: Sismicad, PRO_SAP, EdiLus, CDS Win, ModeSt, EasyBeam
   - **Specializzati EU**: Dlubal, IDEA StatiCa, FEM-Design (StruSoft), SCIA Engineer
   - **High-end**: ANSYS Mechanical, Abaqus, Femap, Nastran
   - Per ognuno: workflow tipico, IA, screenshot chiave, pain point riportati

3. **Sezione C · Innovatori del settore**
   - Browser-based: SkyCiv, ClearCalcs, WeStatiX
   - AI-driven: TestFit, Hypar, Augmenta (architettura adiacente)
   - No-code/simplified: nuove startup in spazio
   - Mobile-first: nessuno serio, ma esperimenti
   - AI assistance: come integrare LLM in workflow strutturale

4. **Sezione D · Pain point ricorrenti FEM**
   - I 10-20 problemi che ricorrono in tutti i FEM (da forum + reviews)
   - Cosa frustra gli ingegneri (UI lenta, output cripico, file enormi, learning curve)
   - Cosa fa loro perdere tempo (workflow rotti, export, debug modelli)
   - Cosa li fa sbagliare (errori silenti, default pericolosi, mancanza di sanity check)

5. **Sezione E · Paper UX academici**
   - Engineering software usability studies
   - CAD UX research (CAD ha decenni di studi UX rilevanti)
   - Scientific computing UI patterns
   - Cognitive load nell'engineering software
   - Mental model studies per software tecnici

6. **Sezione F · Modello mentale ingegnere strutturista (deduzione)**
   - Come pensa l'ingegnere quando "fa il modello"
   - Sequenza canonica del workflow (geometria → carichi → analisi → verifica → report)
   - Concetti primari (combinazione, scenario, elemento critico)
   - Caveat sui limiti della deduzione senza informatore primario

---

### Documento 2 · UX_RESEARCH_SYNTHESIS.md

**Cosa è**: sintesi strutturata per la lettura attenta. Da qui escono principi.

**Dimensione attesa**: 20-30 pagine

**Struttura**:

1. **5-7 principi UX architetturali per software FEM**
   - Es. "Principio 1 · L'elemento critico al centro, non l'astrazione"
   - Es. "Principio 2 · Combinazioni come cittadine primarie"
   - Es. "Principio 3 · Output normativo come obiettivo, non setting"
   - Ogni principio: descrizione, esempi da competitor, anti-pattern, applicazione FEA Pro

2. **Pattern di workflow consolidati**
   - La sequenza canonica che ogni FEM rispetta (e perché)
   - Le varianti accettabili
   - I punti dove i FEM divergono e perché

3. **Pain point ricorrenti**
   - I 10-15 problemi che TUTTI i FEM hanno
   - Quali può evitare FEA Pro
   - Quali sono inerenti al dominio e non risolvibili

4. **Innovazioni promettenti osservate**
   - Cose nuove osservate nei competitor
   - Cosa vale la pena considerare per FEA Pro
   - Cosa è hype senza sostanza (no AI per AI)

5. **Modello mentale dell'ingegnere ricostruito**
   - Mappa concettuale finale (entità, relazioni, sequenze)
   - Profili di utenti tipici (junior, senior, freelance, studio, consulente)
   - Differenze italiano vs europeo vs americano

6. **Vincoli normativi che impattano UX**
   - Anticipazione di Fonte 3 (NTC18 + EC) a livello di workflow
   - Cose che le norme impongono come struttura del processo
   - Implicazioni per l'IA del software

---

### Documento 3 · INFORMATION_ARCHITECTURE_PROPOSAL.md

**Cosa è**: proposta concreta di IA per FEA Pro v3 basata sui principi del Doc 2.

**Dimensione attesa**: 30-40 pagine

**Struttura**:

1. **Entità primarie del modello mentale**
   - Cosa l'utente manipola davvero (Modello, Scenario, Combinazione, Elemento critico, Verifica, Report)
   - Come queste entità si collegano fra loro
   - Naming italiano vs gergo developer attuale

2. **Viste primarie dell'app (concettuali, non visuali)**
   - 4-6 schermate primarie con scopo chiaro
   - Es. "Vista 1 · Dashboard modello" — cosa l'ingegnere vede appena apre l'app
   - Es. "Vista 2 · Workspace verifica" — il cuore del lavoro
   - Es. "Vista 3 · Elemento critico" — quando approfondisce
   - Es. "Vista 4 · Report builder" — quando consegna

3. **Flow utente principali**
   - Flow 1 · Prima volta (onboarding nuovo utente)
   - Flow 2 · Modello veloce (dimensionamento rapido senza ottimizzare)
   - Flow 3 · Verifica completa (lavoro serio fino al report)
   - Flow 4 · Modifica modello esistente
   - Flow 5 · Apertura modello collega/socio

4. **Pattern di interazione**
   - Selezione (singola, multipla, per tipo, per criterio)
   - Edit (inline, modal, panel)
   - Navigazione (gerarchica, tabbed, command-driven)
   - Undo/redo (granularità, persistence)
   - Salvataggio (auto-save, esplicito, versioning)

5. **Mapping con backend esistente**
   - Per ogni entità primaria, quali endpoint backend già la supportano
   - Cosa serve estendere (schema fields, query parameters)
   - Cosa è completamente nuovo

6. **Rapporto con i 64 bug del UX_AUDIT**
   - Quali bug si dissolvono nella nuova IA (probabilmente 60-70%)
   - Quali restano e richiedono fix esplicito
   - Quali erano sintomi di problemi più profondi ora indirizzati

7. **Anti-pattern da NON adottare**
   - Cosa abbiamo visto fare nei competitor che NON facciamo
   - Perché (con argomenti, non solo "non mi piace")

---

## VINCOLI OPERATIVI

### Cosa LA CHAT "FEA UX Research" FA

- Web research rigorosa con 30+ query
- Lettura paper academici (citati con DOI/URL)
- Analisi competitor con screenshot descritti
- Sintesi strutturata
- Proposta IA basata su principi derivati

### Cosa LA CHAT "FEA UX Research" NON FA

- ❌ NO codice (zero righe di TypeScript/Python)
- ❌ NO mockup pixel-perfect (Figma, HTML)
- ❌ NO decisioni visual (colori, font, layout)
- ❌ NO brief Claude Code
- ❌ NO modifica PROJECT_STATE.md o altri file project
- ❌ NO opinioni su singoli bug dei 64
- ❌ NO claim sostitutivo della validazione Paolo (è ricerca, non verità)

### Cosa FEDERICO FA durante Fase 1

- **Setup iniziale**: legge il prompt di apertura, conferma allineamento
- **Monitoring leggero**: legge query mentre vengono fatte, può suggerire correzioni
- **Validazione passiva**: legge i documenti man mano che vengono prodotti
- **Validazione attiva DOPO Doc 1**: dice "ok continua" o "fermati e rivedi qui"
- **Validazione attiva DOPO Doc 2**: dice "i principi mi tornano" o "ricalibra principio X"
- **Validazione attiva DOPO Doc 3**: dice "IA accettabile" o "ridiscutiamo entità Y"

---

## TIMELINE REALISTICA

| Fase | Tempo lavoro Claude | Tempo Federico | Note |
|---|---|---|---|
| Setup chat + lettura project knowledge | 30 min | 15 min review | Chat nuova "FEA UX Research" |
| Documento 1 · Research raw | 5-6 ore | 1 ora lettura | Distribuito su 1-2 sessioni chat |
| Validazione intermedia Doc 1 | - | 30 min | Federico dice "continua" o "rivedi" |
| Documento 2 · Synthesis | 3-4 ore | 1.5 ore lettura | Sessione dedicata |
| Validazione intermedia Doc 2 | - | 1 ora discussione | Cruciale, qui escono i principi |
| Documento 3 · IA Proposal | 3-4 ore | 1 ora lettura | Può richiedere chat separata |
| Validazione finale Doc 3 | - | 2 ore discussione | Approvazione IA per Fase 2 |

**Totale lavoro Claude**: 11-14 ore  
**Totale lavoro Federico**: 7-8 ore  
**Calendar time**: 1-2 settimane se 1-2 sessioni al giorno  

Non è un lavoro da farsi in un giorno. Richiede pause, riflessione, discussione.

---

## PREREQUISITI PRIMA DI APRIRE LA CHAT "FEA UX Research"

### File obbligatori nel project knowledge

1. ✓ `PROJECT_STATE.md` (già lì)
2. ✓ `FEA_PRO_CAPABILITY_MAP.md` (già lì)
3. ✓ `UX_AUDIT_AND_FIX_BRIEF.md` (già lì)
4. ⚠ `DESIGN_DECISIONS_HISTORY.md` (da caricare, consegnato nelle outputs)
5. ⚠ `PLAN_OPERATIVO_FASE_1.md` (questo documento, da caricare)

### File opzionali ma utili

6. `ARCHITECTURE_AUDIT_2026_05_25.md` (da FEA 2 quando finisce — può anche essere caricato dopo che Fase 1 è partita)
7. `OPERATING_RULES.md` (già lì, per metodo generale)
8. `HANDOFF_MESSAGE.md` (già lì)

### File storici (di riferimento)

- `UX_REDESIGN_BRIEF.md` (brief Precision originale, utile per capire cosa NON facciamo)
- `CLAUDE_CODE_BRIEF_v1_5.md` (storico)
- `EXPORT_STATE_v1_2.md` (storico)
- `FEM_Business_Plan_Pay_Per_Use.pdf` (visione commerciale)
- `IMPORTANTISSIMO_AGGIORNAMENTO_DOPO_TEST` (feedback Paoletto)

---

## PROMPT DA INCOLLARE NELLA CHAT "FEA UX Research"

```
Ciao. Sono Federico. Apro questa chat per la Fase 1 del piano FEA Pro v3:
UX Research approfondita per ricostruire il modello mentale dell'ingegnere
strutturista italiano e definire l'Information Architecture giusta.

CONTESTO CRITICO: ho fermato il redesign Precision precedente perché ho
intuito che lavorava solo sul livello visivo (token, colori, layout) senza
toccare il modello mentale dell'utente. NON vogliamo redesign cosmetico.
Vogliamo UX architecture vera.

LEGGI NELL'ORDINE prima di rispondere:
1. project_knowledge_search "PLAN_OPERATIVO_FASE_1.md" — questo è il tuo
   piano operativo, contiene tutto quello che devi fare
2. project_knowledge_search "PROJECT_STATE.md" — stato attuale progetto
3. project_knowledge_search "FEA_PRO_CAPABILITY_MAP.md" — mappa onesta
4. project_knowledge_search "UX_AUDIT_AND_FIX_BRIEF.md" — 64 bug observed
5. project_knowledge_search "DESIGN_DECISIONS_HISTORY.md" — storia chat
   passate (brief Precision Chat A pianificato e mai implementato)
6. Opzionale: project_knowledge_search "ARCHITECTURE_AUDIT_2026_05_25.md"
   se Federico l'ha caricato dopo FEA 2

IL TUO RUOLO: UX RESEARCHER + IA ARCHITECT (NON developer, NON visual designer)

Vincoli operativi: vedi PLAN_OPERATIVO_FASE_1.md sezione "Vincoli operativi"

Output atteso: 3 documenti markdown grezzi descritti in PLAN

Quando hai letto i 5-6 file, rispondi:
1. "Allineato" + 3 righe di riassunto stato
2. Proposta del piano operativo delle PRIME 3 ORE di lavoro tuo:
   - Quali query web farai (5-8 query iniziali in lingua mista)
   - In che ordine
   - Quale sezione del Documento 1 inizierai a popolare
3. Aspetta mio "via libera" prima di iniziare le query

NON iniziare con codice, mockup, decisioni visual.
NON usare emoji (eccetto ✓ ✗ ⚠ in tabelle).
Tono sobrio italiano professionale.
```

---

## METRICHE DI SUCCESSO DELLA FASE 1

Alla fine della Fase 1, dovresti poter dire:

### Test 1 · Posso descrivere il modello mentale?

> "L'ingegnere strutturista italiano pensa il suo lavoro così: [3-5 frasi chiave]"

Se sì → Doc 2 ha funzionato.

### Test 2 · L'IA proposta risolve i 64 bug?

> "Dei 64 bug del UX_AUDIT, [X] si dissolvono nella nuova IA perché [motivo strutturale], [Y] restano come fix tattici, [Z] non erano davvero bug ma sintomi di un altro problema"

Se X ≥ 40 → Doc 3 ha funzionato.

### Test 3 · La proposta è applicabile al backend esistente?

> "Per ogni entità primaria della nuova IA, esiste backend pronto o estensione minima"

Se sì → non stiamo proponendo un'app diversa, stiamo proponendo la STESSA app con IA giusta.

### Test 4 · Paolo (anche se non l'abbiamo intervistato) la riconoscerà?

> "Quando Paolo vedrà i wireframe Fase 3, dirà 'ah, finalmente, è come deve essere' oppure 'non capisco cosa avete fatto'"

Test ipotetico, ma utile come bussola. Se i nostri principi sono troppo "alieni" rispetto a SAP2000/MIDAS che Paolo conosce, qualcosa non va.

---

## DOPO LA FASE 1

Quando Fase 1 sarà chiusa con 3 documenti validati, il piano prevede:

### Fase 2 · Wireframe low-fidelity (1-2 settimane)
Da IA proposal → schermate scarne in Excalidraw o HTML semplice. 15-20 mockup.

### Fase 3 · Validazione Paolo informale (30-60 min)
Paolo guarda wireframe, dice se il modello mentale gli torna.

### Fase 4 · Iterazione mockup (opzionale, se Paolo ha obiezioni)
Aggiustamento basato su feedback Paolo.

### Fase 5 · Visual design (1 settimana)
Solo a questo punto applichiamo il bundle Precision (tokens, colori, font) sopra wireframe approvati.

### Fase 6 · Implementazione
Brief Claude Code precisi per pezzo, sprint atomici, quality gate.

**Totale piano**: 4-6 mesi di lavoro serio. Non veloce, ma giusto.

---

## REGOLE DI PROCESSO

### Quando questa chat si satura

Se la chat "FEA UX Research" si riempie prima di finire Doc 3:
1. Claude finisce il documento corrente al meglio possibile
2. Salva quello che ha in `/mnt/user-data/outputs/`
3. Federico carica nel project knowledge
4. Apre chat nuova "FEA UX Research 2" con prompt simile + reference al lavoro fatto
5. Continua

### Se emergono dubbi sui principi

Federico può fermare il lavoro in qualsiasi momento e dire "fermati, ridiscutiamo principio X". È normale e atteso. La ricerca non è lineare.

### Se i documenti raw sono "grezzi"

Federico ha accettato di ricevere documenti grezzi. Non aspettarsi perfezione di prosa al primo giro. La rielaborazione viene **dopo** la validazione di Federico.

### Se Claude trova qualcosa che non torna nel piano

Se durante la ricerca emerge che il piano stesso è sbagliato (es. un principio fondamentale è errato), Claude deve fermarsi e dirlo a Federico. Non procedere per inerzia.

---

## RICONOSCIMENTI

Questo piano è il risultato di una sessione di 8+ ore (2026-05-24 sera + 2026-05-25 notte) tra Federico e Claude in chat "PROJECT INSTRUCTIONS · FEA Pro", che ha incluso:

- Audit founder-driven di 64 bug
- Costruzione Capability Map onesta
- Recupero storia decisioni da chat "Greeting in Italian"
- Discussione strategica fix vs rebuild
- Riconoscimento che il problema è UX architecture, non visual

Quel lavoro non è stato sprecato. È la **base solida** su cui poggia questa Fase 1.

Quello che cambia rispetto al passato: **disciplina di processo**. Documenti consolidati nel project knowledge, fonti di verità chiare, no più reinvenzione fra chat, no più lavoro perso.

---

**Documento generato**: 2026-05-25
**Origine**: chat "PROJECT INSTRUCTIONS · FEA Pro" sessione 24/25 maggio 2026
**Da NON modificare** senza decisione esplicita Federico
**Versione**: 1.0
