# Empty states catalog

> Closes utile **B.1**. 7 empty state canonici della webapp FEA Pro
> con title + body + illustration spec + CTA. Tone: tecnico, imperativo,
> niente marketing speak.
>
> Component ref: `<EmptyState />` (handoff originale Atoms).

---

## 1 · Props recap

```ts
type EmptyStateProps = {
  variant: "neutral" | "muted";    // neutral = primary surface, muted = nested
  illustration: "grid" | "node" | "doc" | "search" | "bell" | "users" | "spark" | "none";
  eyebrow?: string;                // mono uppercase, optional
  title: string;                   // display-sm, sentence case
  body?: string;                   // ink-muted, text-sm, 1-2 righe max
  primaryAction?: ActionDef;       // CTA principale
  secondaryAction?: ActionDef;     // opzionale, ghost
};

type ActionDef = {
  label: string;       // verbo imperativo
  onClick?: () => void;
  href?: string;
};
```

### Illustration

Tutte le illustrazioni sono **SVG vettoriali deterministici** in `currentColor`,
`stroke 1.5` (più sottile delle icone UI per non competere visivamente).
Dimensione fissa `96×96px`, color `var(--ink-faint)`. Nessuna foto, nessun
3D, nessun colored emoji.

| Key | Soggetto | Dove usato |
|---|---|---|
| `grid` | Grid pattern 4×4 + un nodo evidenziato | Dashboard 0 modelli |
| `node` | Nodo + 2 elementi convergenti (schema FEM) | ModelsTable 0 results |
| `doc` | Foglio A4 + pieghe in alto a destra | VerifyPanel 0 analisi |
| `search` | Lente + linee oblique sottostanti | Palette 0 match |
| `bell` | Campanella outline + linea attraversante | Notifiche 0 |
| `users` | 2 cerchi sovrapposti (avatar abstract) | Collab 0 utenti |
| `spark` | 4 linee diagonali con punto centrale | ResultsPanel 0 risultati |
| `none` | nessuna illustrazione | Empty state dense (sub-row tabella) |

---

## 2 · I 7 use case

### 2.1 · Home dashboard · 0 modelli salvati

**Surface**: `Dashboard.tsx` body, quando `models.length === 0`.

```tsx
<EmptyState
  variant="neutral"
  illustration="grid"
  eyebrow="DASHBOARD"
  title="Nessun modello salvato"
  body="Inizia da Studio Pro per controllo totale, o segui un Percorso guidato."
  primaryAction={{ label: "Apri Studio Pro", onClick: () => router.push("/studio") }}
  secondaryAction={{ label: "Scegli un percorso", onClick: () => router.push("/percorsi") }}
/>
```

**Note**:
- È l'unico empty state con **due action** — la dashboard è il bivio principale dell'app.
- Body cita le due vie (Studio Pro / Percorsi) — coerente con il claim hero.

---

### 2.2 · ModelsTable · 0 modelli filtered

**Surface**: `ModelsTable.tsx`, quando un filtro o search ha 0 match.

```tsx
<EmptyState
  variant="muted"
  illustration="node"
  title="Nessun modello corrisponde al filtro"
  body={`Nessun risultato per "${query}". Prova a rimuovere alcuni filtri o cerca per nome.`}
  primaryAction={{ label: "Pulisci filtri", onClick: clearFilters }}
/>
```

**Note**:
- `variant="muted"` perché è dentro una tabella, non a tutto-schermo.
- Body **dinamico** con la query. Se la query è vuota (filtro normativa, status, ecc.), riformula: `"Nessun modello corrisponde ai filtri selezionati."`.
- Non offrire `"Crea un nuovo modello"` qui — l'utente sta filtrando, non creando.

---

### 2.3 · VerifyPanel · 0 analisi eseguite

**Surface**: `VerifyPanel.tsx`, quando `analyses.length === 0`.

```tsx
<EmptyState
  variant="neutral"
  illustration="doc"
  eyebrow="VERIFICHE"
  title="Nessuna analisi ancora eseguita"
  body="Esegui un'analisi statica o modale dal workspace Solve per attivare le verifiche normative."
  primaryAction={{ label: "Vai a Solve", onClick: () => router.push("/solve") }}
/>
```

**Note**:
- Title: stato fatto + temporale (`ancora`) — implica "succederà".
- Body cita le **analisi minime** che attivano le verifiche (statica / modale). NON elenca tutte le 10.
- Action porta dove va eseguito il pre-requisito.

---

### 2.4 · ResultsPanel · 0 risultati disponibili

**Surface**: `ResultsPanel.tsx`, quando l'utente apre un modello che ha
analisi ma nessun risultato in cache (es. cache invalidata, modello modificato dopo solve).

```tsx
<EmptyState
  variant="neutral"
  illustration="spark"
  eyebrow="RISULTATI"
  title="Risultati non disponibili"
  body="Il modello è stato modificato dopo l'ultima analisi. Rilancia il solver per aggiornare i risultati."
  primaryAction={{ label: "Rilancia analisi statica", onClick: rerunStatic }}
  secondaryAction={{ label: "Storico analisi", onClick: openHistory }}
/>
```

**Note**:
- **Diagnostica** nel body: l'utente capisce **perché** è vuoto, non solo che lo è.
- Action primaria è "fai la cosa ovvia" (rerun). Secondary porta allo storico per chi vuole capire cosa è cambiato.
- Caso edge: se nessuna analisi è mai stata eseguita, ricicla **2.3** (`VerifyPanel`-style), non questo.

---

### 2.5 · Command palette · 0 match

**Surface**: `CommandPalette.tsx`, dropdown dei risultati search.

```tsx
<EmptyState
  variant="muted"
  illustration="search"
  title="Nessun comando trovato"
  body={`"${query}" non corrisponde a nessuna azione, modello o norma.`}
  // niente action — l'utente continua a digitare
/>
```

**Note**:
- **No action**. La palette è uno strumento di input continuo: l'azione è "premere un altro tasto".
- Body è **specifico** (cita la query). Helps debugging mentale ("ah, ho scritto male").
- Variant `muted` — è dentro un dropdown, non a tutto-schermo.
- Se la query è < 2 char: mostrare invece i suggerimenti di default (no empty state).

---

### 2.6 · NotificationsPanel · 0 notifiche

**Surface**: `NotificationsPanel.tsx`, popover topbar, quando `notifications.length === 0`.

```tsx
<EmptyState
  variant="muted"
  illustration="bell"
  title="Nessuna notifica"
  body="Solver, errori e collaboratori compaiono qui in tempo reale."
  // niente action
/>
```

**Note**:
- Body **didattico**: l'utente impara cosa apparirà qui.
- No action — non si "creano" notifiche.
- Variant `muted`, illustration dimezzata (`72×72px`) per il popover stretto.

---

### 2.7 · CollabPanel · 0 utenti connessi

**Surface**: `CollabPanel.tsx`, sidebar, quando l'utente è solo sul modello.

```tsx
<EmptyState
  variant="muted"
  illustration="users"
  title="Sei l'unico sul modello"
  body="Condividi il link per invitare un collaboratore in real-time."
  primaryAction={{ label: "Copia link condivisione", onClick: copyShareLink }}
/>
```

**Note**:
- Title affermativo, non difettoso (`"Sei l'unico"` > `"Nessun collaboratore"`).
- Action principale = **passo successivo logico** (condividi).
- Quando arrivano collaboratori, l'empty state sparisce → mostra avatar list normale.

---

## 3 · Tabella rapida ref

| UC | Surface | Illustration | Variant | Action |
|---|---|---|---|---|
| 1 | Dashboard | `grid` | `neutral` | Studio Pro + Percorsi |
| 2 | ModelsTable filtered | `node` | `muted` | Pulisci filtri |
| 3 | VerifyPanel | `doc` | `neutral` | Vai a Solve |
| 4 | ResultsPanel | `spark` | `neutral` | Rilancia + Storico |
| 5 | Palette no-match | `search` | `muted` | — |
| 6 | Notifications | `bell` | `muted` | — |
| 7 | CollabPanel | `users` | `muted` | Copia link |

---

## 4 · Regole di copy

- **Title**: 3–6 parole, sentence case, mai punto finale.
- **Body**: 1–2 righe, max ~30 parole, ink-muted, termina con punto.
- **Eyebrow**: opzionale, solo se la surface non ha già un header chiaro. Mono uppercase.
- **Action label**: verbo imperativo + oggetto (`Vai a Solve`, `Pulisci filtri`, `Copia link`). Mai `OK`, `Continua`.
- **Niente smiley, niente *"oops"***, niente *"sembra che..."*. Stato di fatto + azione.

---

## 5 · Acceptance checklist (per QA)

- [ ] Ogni surface elencata ha esattamente uno `<EmptyState />` quando vuota.
- [ ] Illustration corretta secondo tabella §3.
- [ ] Action label sempre verbo imperativo.
- [ ] Empty state in popover (notifiche, palette, collab) usa `variant="muted"`.
- [ ] Nessun empty state ha emoji.
- [ ] Dark mode: illustration `currentColor` legge come `var(--ink-faint)` dark (`#555C66`).

---

**Implementazione stimata Claude Code**: ~1h (wrap 7 surface + creazione 8 SVG illustration).
