# ADR 003 — IA prototipo v3 (Information Architecture)

- **Data**: 29/05/2026 (sera)
- **Stato**: ✅ **CHIUSO 29/05/2026 notte** (Fetta E2-IA completata
  end-to-end, 7 commit + 3 polish)
- **Commit chiave finale**: `c4d2f2f` — `feat(shell): 4 route
  placeholder + cablaggio handler topbar (Fetta E2.5d)`. Vitest
  1058/1058, TypeScript silenzioso.
- **Catena commit Fetta E2-IA**: `4f9e0a8` (E2.1 topbar) → `912e285`
  (E2.2 panel DX 2 stati) → `1415f03` (E2.4 Albero) → `5776f05` (polish
  spina + Albero allineato prototipo) → `e61facd` (E2.5a+b rail cleanup
  6→3 + rinomina) → `87800b5` (E2.5c panel DX accordion) → `c4d2f2f`
  (E2.5d 4 route placeholder)
- **NB**: E2.3 (inspector contestuale + foglie Albero per selezione
  bidirezionale viewport↔panel) NON e' incluso nella chiusura — vive
  come scope futuro perche' tocca lo store di selezione viewport
  (zona delicata). Vedi "Cosa resta fuori" sotto.

## Contesto

Pre-decisione: il workspace ha attraversato **5 handoff falliti**
prima di trovare un'IA che reggesse. Ognuno aveva il suo difetto
(troppo rail, troppo tab, panel destro inconsistente, command palette
non scopribile, mobile sacrificato). Tutti riusavano la stessa
architettura di base e ne ereditavano i limiti.

Il "prototipo v3" è il sesto tentativo, sviluppato come HTML hi-fi
fuori dal repo React. Mette in discussione l'architettura di base,
non solo le pillole visive.

## Problema diagnosticato

Limiti riscontrati nei 5 handoff precedenti (sintesi operativa, non
elenco esaustivo):

- **Rail SX sempre presente**: ruba spazio al viewport, duplica voci
  della topbar, costringe a scegliere "dove va una cosa".
- **Panel DX a stato unico** ("aperto" / "chiuso"): non sa adattarsi
  al contesto. Quando hai un elemento selezionato vorresti l'inspector
  contestuale, ma il panel resta generico.
- **Albero modello sempre visibile**: dominante in viewport piccoli,
  non collassa, non si nasconde quando lavori in focus mode.
- **Command palette nascosta**: esiste `⌘K` ma non c'è scopribilità
  visiva nella topbar. Utenti nuovi non la trovano.
- **Affordance navigazionale duplicata**: Home/Modelli/Jobs raggiungibili
  da rail SX, dashboard, palette, ma niente entry-point sempre-visibile.

## Decisione

### Architettura — IA prototipo v3 (sintesi)

| Cardine | Cosa |
|---|---|
| Workspace-behind + intent-modal | Le azioni grosse (Run, Solve config, Export) aprono **intent-modal** sopra il workspace, non panel laterali. Il workspace resta sempre visibile dietro come contesto. |
| Panel DX contestuale 3 stati | `closed` / `reopen-tab` / `inspector`. Stato inspector cambia in base alla selezione (elemento, nodo, risultato). Selezione bidirezionale viewport ↔ inspector. |
| Albero collassabile | Albero modello in panel SX **collassato di default**. Toggle dedicato in topbar (cabla la fetta E2.4). |
| Rail SX eliminato | Le voci che vivevano nel rail SX vanno ridistribuite (vedi sotto). |

### Estetica — Opzione B

Mantenere **estetica Soft v2.1** consolidata in ADR 002. Non riprogettare
da zero il design system: il prototipo v3 prende l'IA, non la pelle.
Le 3 opzioni esaminate erano:

- A — adottare IA + estetica prototipo v3 (rifare anche il DS)
- **B — adottare IA, mantenere Soft v2.1** ← scelta
- C — adottare solo parti dell'IA + Soft v2.1

Razionale B: il design system ha già **assorbito un audit di
foundation** completo (E0-fix). Rifare l'estetica vuol dire ripartire
da zero anche su quello. Il costo non è giustificato dal valore — l'IA
è il problema, non la pelle.

### Distribuzione voci rail SX — Opzione (c) mix gerarchizzato

Le voci che il rail SX conteneva vanno distribuite per **gerarchia
d'uso**, non in un unico luogo nuovo:

| Voce | Destinazione | Motivazione |
|---|---|---|
| Home | Topbar (3 icone fisse) | Navigazione globale, sempre visibile |
| Modelli | Topbar (3 icone fisse) | Idem |
| Jobs | Topbar (3 icone fisse) | Idem |
| Cronologia | Menu profilo (avatar) | Uso occasionale, contestuale al profilo |
| Template | Menu profilo (avatar) | Idem |
| Settings | Menu profilo (avatar, come "Impostazioni") | Idem |
| Docs | Menu profilo (avatar) | Idem |
| Tutto il resto | ⌘K command palette | Scopribilità via search, niente UI rumore |

Le 3 opzioni esaminate erano (a) tutto in palette, (b) tutto in menu
profilo, **(c) mix gerarchizzato per uso**. (c) ha vinto perché
rispecchia la frequenza d'uso reale: navigazione = sempre visibile,
profilo = occasionale, resto = via search.

## Conseguenze

### Fetta E2-IA (5 commit)

- ✅ **E2.1** Topbar: 3 icone fisse + menu profilo + 2 toggle Albero/Focus
  (chiuso, SHA `4f9e0a8`, vitest 991/991, Playwright 6/6)
- ⏳ **E2.2** Panel DX stato "closed" + reopen tab verticale destra
- ⏳ **E2.3** Panel DX stato "inspector" contestuale (selezione bidirezionale)
- ⏳ **E2.4** Albero modello in panel SX collassato di default (cabla il
  toggle Albero placeholder di E2.1)
- ⏳ **E2.5** Rail SX eliminazione + verifica accorpamento voci
  (chiude le 4 TODO route segnalate da E2.1: `/modelli`, `/jobs`,
  `/cronologia`, `/docs`)

### Effetti collaterali noti

- Le 6 voci `Home/Modelli/Jobs/Cronologia/Template/Docs` sono **temporaneamente
  duplicate** in topbar (E2.1) e in rail SX. La duplicazione è
  intenzionale durante la transizione — la pulizia è E2.5. Pattern
  "additivo prima, sottrattivo dopo" per non rompere la baseline.
- I toggle Albero / Focus in topbar oggi sono parzialmente operativi:
  Focus è cablato a `workspaceStore` (Fetta 0), Albero è placeholder
  fino a E2.4. La differenza è esplicita nei commenti TODO inline.

### Revisione 29/05/2026 sera — regola spina cambiata + mockup recuperati

Dopo il recupero dei 3 mockup HTML originali del prototipo v3 (vedi
`socio/05-prototipi-workspace-v3/`), Federico ha rivisto due decisioni
prese in fase Fetta 1 / Fetta E2.4:

- **Spina · regola del wizard vs mappa**: in Fetta 1 era cristallizzato
  *"Ogni passo è SEMPRE cliccabile (mai disabilitare). È una mappa,
  non un wizard"*. **Revisione**: bloccare lo skip in avanti — non deve
  essere possibile cliccare "Risultati" senza aver mai eseguito, e
  "Esegui" senza modello completo. Costruisci resta sempre cliccabile.
  Active escape: la fase attiva resta cliccabile anche se diventa
  bloccata (l'utente può rimanere dov'è dopo reset). Vedi commit
  `5776f05`.
- **Albero E2.4 · ordine sezioni**: in E2.4 (`1415f03`) avevo
  interpretato l'ordine come Nodi/Elementi/Materiali/Vincoli/Carichi
  (5 sezioni, ordine inventato). Il mockup originale dice **6 sezioni**
  in ordine canonico: Nodi → Elementi → **Sezioni · materiali**
  (combinati) → Carichi → Vincoli → **Combinazioni**. Fix in commit
  `5776f05` (E2.4-bis polish).

Convention cristallizzata: **"il prototipo HTML è il riferimento per
l'IA, il mockup CD è il riferimento per l'estetica"** vale come una
regola di confronto — se i due divergono su una decisione di IA, il
prototipo v3 vince.

## Convention cristallizzate dalla Fetta E2-IA (29-30/05/2026)

Cinque pattern emersi durante la chiusura della Fetta E2-IA. Il prossimo
Claude deve averli in tasca PRIMA di mettere mano al codice — vivono
qui (ADR 003) e in versione narrativa in `socio/06-cose-belle-fetta-e2-ia.md`.

### 1. Prototipo HTML vince sull'IA, mockup CD vince sull'estetica

Se in qualsiasi momento i due artefatti divergono su una decisione, il
prototipo v3 (`socio/05-prototipi-workspace-v3/`) è il riferimento
canonico per **layout / ordine sezioni / icone / count / testo**; il
mockup Claude Design è il riferimento per **colori / font / spacing /
radius**. Caso reale che ha consacrato la regola: l'Albero modello
E2.4 avevo 5 sezioni in ordine inventato, il prototipo ne dichiarava 6
in ordine canonico — fetta E2.4-bis polish per allineare (commit `5776f05`).

### 2. Junior fuori, senior dentro

Nei panel multi-livello (es. panel DX di Verifica), il dato fondamentale
è SEMPRE visibile in cima (verdict, UR, σmax — per studente / ingegnere
junior), gli approfondimenti sono in sezioni collassabili sotto (per
chi vuole scavare). Non è solo UX, è una postura filosofica: chi non sa
niente vede subito il verdetto, chi sa di più scava. Vedi
`ResultsTabsPanel.tsx` accordion E2.5c (commit `87800b5`).

### 3. Active escape

Quando un controllo diventa logicamente disabilitato (es. fase spina
quando il modello viene resettato, voci menu quando un prerequisito
sparisce), la posizione **ATTIVA dell'utente resta sempre raggiungibile**.
Non scaravelarlo via. Click su passo bloccato e' no-op silenzioso, ma
se sei già là, resti. Vedi `ShellPhaseStepper.tsx` `canEnter` + `isActive`
escape (commit `5776f05`).

### 4. Onora il testo del designer (copia VERBATIM)

Quando il prototipo include note / tooltip / empty-state con testo
letterale, copialo verbatim. Non riformulare per "professionalità": la
voce del designer originale ha valore di per sé. Caso paradigmatico: la
tree-note del panel SX *"Di default questo pannello è chiuso: il
workspace resta pulito. Si apre a richiesta — e comparirà da solo sui
modelli grandi (oltre ~50 elementi)"* viene letteralmente dal prototipo
v2-strato-esperto.html.

### 5. 4 stati onesti applicato OVUNQUE

Non solo nei numeri strutturali (era ADR 001 NAFEMS). Applica anche a:
- **Routing**: pagine placeholder con razionale + dove la feature vive
  oggi, NON "Coming soon" generici (E2.5d)
- **Count nel chrome**: count = `null` → render `"—"` quando la feature
  non è implementata nel modello dominio (es. Combinazioni in Albero E2.4)
- **Stati visivi**: cursor-not-allowed + tooltip esplicativo + click no-op
  silenzioso quando un controllo è disabilitato (E2.5b spina blocco skip)
- **Persistenza**: store con default che NON rompe il comportamento
  esistente di tutti gli utenti già installati (es. rightPanelStore
  default "open", leftTreeStore default "closed")

## Cosa ha sbloccato

- **Convention "additivo prima, sottrattivo dopo"**: in transizioni
  IA grandi è meno rischioso aggiungere le voci nuove dove devono
  stare e poi rimuovere le vecchie in un secondo passaggio, che fare
  un sostitutivo monoblocco. La baseline test rimane verde a ogni
  commit.
- **Convention "il prototipo HTML è il riferimento per l'IA, il
  mockup HTML è il riferimento per l'estetica"**: due artefatti, due
  livelli di vincolo. Soft v2.1 vince sull'estetica del prototipo v3,
  il prototipo v3 vince sull'IA dei vecchi mockup. Va detto a un
  Claude futuro che potrebbe vedere il prototipo v3 come "nuova base
  totale" e provare a riprogettare anche colori/font.
- Evidenza che **"separare l'asse IA dall'asse estetica"** è
  praticabile: l'opzione B funziona perché abbiamo già consolidato
  separatamente la foundation in ADR 002. Senza quel pre-requisito,
  l'opzione B non sarebbe stata fattibile.
- Le 4 route mancanti (`/modelli`, `/jobs`, `/cronologia`, `/docs`)
  sono segnalate con TODO inline `// TODO E2.5` invece di placeholder
  inventati: pattern "**meglio onesto-vago che falso-preciso**" applicato
  a routing (idem ADR 001 per le tolerance numeriche).
