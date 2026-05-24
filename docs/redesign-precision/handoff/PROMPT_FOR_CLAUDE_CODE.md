# Prompt per Claude Code · FEA Pro Redesign Precision

> Copia e incolla questo blocco intero in Claude Code come primo messaggio,
> allegando il pacchetto `FEAPRO_HANDOFF.zip`.

---

```
Sei chiamato a implementare il redesign UI completo di FEA Pro nel codebase
esistente. Il design è stato sviluppato in una sessione separata e ti arriva
già finito — il tuo lavoro è la TRADUZIONE in codice React/TypeScript, NON
la riprogettazione.

CONTESTO
FEA Pro è una piattaforma FEM (Finite Element Method) browser-first per
ingegneri strutturisti italiani. Backend Python/FastAPI + frontend React 18
+ TypeScript + Vite + Tailwind + Three.js + Zustand. Repo: feapro, branch
test. Live: https://fea-pro.fly.dev/. Stato: v1.8.0-product-alignment.
Test: 660+ pytest verdi (backend), 447 vitest verdi (frontend).

DIREZIONE VISIVA
La direzione si chiama "Precision" — Apple/CAD industrial. Caratteristiche:
- Light theme canonical, dark paritetico via [data-theme="dark"]
- Accento singolo cyan (#0891B2 light / #5DD7F2 dark)
- Spigoli vivi (radius 0)
- Hairline-only borders, shadow minimali
- Inter (body) + Inter Tight (display) + JetBrains Mono (numerici)
- Italiano predominante, inglese solo per termini universali
- Tono sobrio, no entusiasmo, no emoji decorative

VINCOLI CRITICI
1. Tutte le funzionalità preservate (solver, viewport, verifiche, Studio Pro,
   Percorsi). Zero rimozioni.
2. Backend: zero modifiche.
3. Studio Pro e Percorsi restano due assi semantici sullo stesso modello.
4. Italiano nei testi visibili. Codici norma EN/EC restano in inglese.
5. Trust Layer: report sempre DRAFT finché qualifica non confermata.
6. Niente crocette X nei modal (ESC + click backdrop).
7. Performance: bundle gzip <400kB main chunk, lighthouse >80.
8. Accessibilità WCAG AA.
9. Test vitest devono restare verdi (snapshot da aggiornare dove necessario).

CONSEGNA E LETTURA DEL PACCHETTO

Allegato trovi FEAPRO_HANDOFF.zip. Leggi in questo ordine:

1. README.md — overview generale (5 min)
2. implementation.md — mapping completo tokens, Tailwind config, lista
   componenti React da toccare con stima sforzo (15 min)
3. migration-risks.md — cosa rompe, cosa no, breaking changes (10 min)
4. tokens.css — la versione production-ready dei design tokens
5. tailwind.config.snippet.js — estensione Tailwind da mergiare
6. precision.css — design system completo (riferimento sorgente)
7. screens/*.html — 17 schermate HTML di riferimento. APRI OGNUNA in browser
   prima di toccare il componente React corrispondente. Sono pixel-faithful.

PROCESSO RACCOMANDATO

Step 0 — Esplora il codebase
- Trova tailwind.config.js esistente
- Trova src/index.css o equivalente con i CSS variables attuali
- Mappa la struttura src/components/ vs i nomi che trovi in implementation.md

Step 1 — Proponi piano di PR
Prima di scrivere codice, proponimi una suddivisione in 5 PR atomiche
ordinate per dipendenze. La sezione 4 di implementation.md ha già una
proposta. Adatta in base a quello che trovi nel repo reale.

Step 2 — Apri branch feature/redesign-precision dal branch test.

Step 3 — Esegui PR una alla volta. Per ogni PR:
- Implementa
- Esegui vitest, fixa snapshot
- Verifica visivamente confrontando con screens/*.html (apri in browser
  side-by-side col dev server)
- Aggiorna eventuale documentazione interna
- Apri PR, scrivi cambiamenti chiave + breaking changes nel description
- Fermati e aspetta review dell'utente prima di passare alla prossima PR

Step 4 — Dopo l'ultima PR, esegui:
- lighthouse audit (main chunk e Studio Pro workspace)
- visual regression vs screenshots/ se esiste
- check WCAG con axe-core o equivalente

COSE DA EVITARE
- Non introdurre nuove dipendenze pesanti (es. UI library nuova) senza
  chiedere prima. Tailwind + Lucide (già presenti) bastano.
- Non riscrivere logica di business mentre rifai UI. Solo CSS/JSX, mai
  toccare reducer/store senza dichiararlo.
- Non rimuovere componenti "perché obsoleti". Se uno è davvero rimosso dal
  design, dichiaralo in migration-risks della PR.
- Non mergiare le PR senza approvazione esplicita dell'utente.

QUANDO FERMARTI E CHIEDERE
- Se trovi un componente non documentato in implementation.md
- Se una funzionalità nel codebase non è rappresentata in nessuna schermata
- Se ci sono conflitti con shadcn/ui o altre librerie già installate
- Se i token Tailwind esistenti hanno nomi che collidono con quelli nuovi

Inizia leggendo README.md, poi implementation.md, poi proponimi il piano
di PR adattato al codebase reale.
```

---

## Note per Riccardo (umano)

Quando Claude Code propone il piano:

1. **Controlla che la PR1 (tokens) sia atomica** — solo tokens + utility classes,
   nessun componente toccato. Se prova ad accorpare, dividi.

2. **Conferma una PR per volta** — non lasciare che Claude Code esegua tutto
   d'un fiato. È più sicuro merging frequente.

3. **Per la PR3 (schermate)** — Claude Code potrebbe voler fare tutte e 14 in
   un colpo. Forza la divisione: A* prima, poi B*, poi C*, poi D*+E*.

4. **Quando Claude Code chiede chiarimenti** — non improvvisare risposte. Apri
   il file `screens/` corrispondente e usa quello come fonte di verità.

5. **Snapshot di test vitest**: probabilmente molti vanno rigenerati. Non è un
   problema — ma verifica almeno una manciata a mano che non stiano nascondendo
   regressioni vere.

6. **Backend pytest deve restare 660+ verdi** dopo ogni PR. Se ne salta uno,
   stop e investiga.
