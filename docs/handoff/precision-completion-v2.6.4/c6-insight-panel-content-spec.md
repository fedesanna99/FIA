# c6 · InsightPanel — Content spec

> Closes Tier 4 carry-over **InsightPanel content semantico**.
> Stato pre-v2.6.4: 90% strutturale (component drop-in funzionante),
> 0% content (ogni instance improvvisa testi/tone). Target post-v2.6.4: 100%.
>
> Questo doc **non modifica `InsightPanel.tsx`** — definisce le 5 instances
> canoniche con tone, eyebrow, title, items, action. Claude Code applica
> il content nelle 5 surface.

---

## 1 · Props recap (dall'handoff originale)

```ts
type InsightPanelProps = {
  tone: "success" | "warn" | "danger" | "info" | "pending";
  eyebrow: string;        // mono uppercase, ~10px tracking-wide-4
  title: string;          // display sm, sentence case
  items: InsightItem[];   // 1–4 voci, no più
  action?: {
    label: string;        // verbo imperativo
    onClick: () => void;
    href?: string;        // alternativa a onClick (router push)
  };
};

type InsightItem = {
  glyph?: "✓" | "⚠" | "○" | "→" | string;   // unicode only, no emoji
  text: string;                              // densità tecnica, no fluff
  reference?: string;                        // es. "NTC § 4.2.4.1"
};
```

---

## 2 · Tone canonici

| Tone | Border-l-2 | Ink | Quando |
|---|---|---|---|
| `success` | `--success` | `--ink-success` | Modello / analisi OK, niente azione richiesta |
| `warn` | `--warn` | `--ink-coral` | Incompleto, non bloccante (es. carichi mancanti) |
| `danger` | `--danger` | `--ink-danger` | UR > limite, intervento richiesto |
| `info` | `--accent` | `--ink-accent` | Neutrale informativo, summary di stato |
| `pending` | `--ink-faint` | `--ink-muted` | In attesa di analisi / job in coda |

**Regola**: **un solo tone per panel**. Mai mescolare item `✓` e `⚠`
nello stesso panel `success` — significa che il tone reale è `warn`. Se
serve mostrare misto, splittare in due `InsightPanel` adiacenti.

---

## 3 · Eyebrow pattern

Formato fisso: **`{CONTESTO} · {STATO}`**

- `MODELLO · IN COSTRUZIONE`
- `MODELLO · PRONTO AL SOLVE`
- `ANALISI STATICA · COMPLETATA`
- `ANALISI STATICA · ATTENZIONE`
- `VERIFICHE NORMATIVE · 3 NORME`
- `SOLVER · IN CODA`

10–11px mono uppercase, `letter-spacing: var(--ls-wide-4)`, color
`var(--ink-dim)`. Mai più di 5 parole totali. Niente punteggiatura
oltre il `·` separator.

---

## 4 · Action label pattern

**Verbo imperativo + oggetto specifico**. Mai generic.

✅ OK:
- `Esegui analisi statica`
- `Vai a Vincoli`
- `Vai a elemento critico`
- `Apri Verifiche live`
- `Genera report`
- `Riprova solver`

❌ NO:
- `Continua`, `OK`, `Avanti`, `Click here`, `Procedi`
- `Vedi dettagli` (troppo vago — meglio `Vedi B3 IPE 240`)
- `Help`, `Maggiori info`

L'azione deve sempre poter rispondere alla domanda *"e poi cosa succede?"*.

---

## 5 · Use case canonici (5 instances)

### UC1 · MakePanel · modello incompleto

**Surface**: `MakePanel.tsx`, sezione status — visible quando il modello
ha gap (no vincoli, no carichi, no materiali assegnati).

```tsx
<InsightPanel
  tone="warn"
  eyebrow="MODELLO · IN COSTRUZIONE"
  title="Modello incompleto"
  items={[
    { glyph: "✓", text: "11 nodi · 10 elementi" },
    { glyph: "⚠", text: "0 vincoli definiti", reference: "obbligatorio" },
    { glyph: "○", text: "0 carichi applicati" },
    { glyph: "○", text: "Materiali assegnati a 7/10 elementi" },
  ]}
  action={{ label: "Vai a Vincoli", onClick: () => router.push("/make/vincoli") }}
/>
```

**Regole**:
- `tone="warn"` non `danger` — l'utente sta costruendo, non ha sbagliato.
- L'action punta al **primo gap bloccante** (vincoli > carichi > materiali, in quest'ordine).
- Items in ordine: cosa c'è (`✓`) → cosa manca obbligatorio (`⚠`) → cosa manca opzionale (`○`).

---

### UC2 · MakePanel · modello pronto al solve

**Surface**: stessa di UC1, ma quando tutti i gap sono colmati e il
modello è solvabile (ma non ancora analizzato).

```tsx
<InsightPanel
  tone="success"
  eyebrow="MODELLO · PRONTO AL SOLVE"
  title="Modello pronto"
  items={[
    { glyph: "✓", text: "11 nodi · 10 elementi" },
    { glyph: "✓", text: "2 vincoli (incastri ai nodi 1, 2)" },
    { glyph: "✓", text: "10 carichi applicati (Q + G + ψ₂Q)" },
    { glyph: "✓", text: "Materiali: S275 su tutti gli elementi beam" },
  ]}
  action={{ label: "Esegui analisi statica", onClick: () => runSolver("static") }}
/>
```

**Regole**:
- Title `"Modello pronto"`, **non** `"Modello completo"` — comunicare azione successiva possibile, non stato passivo.
- Action sempre verbo imperativo: `Esegui ...`.
- Max 4 items. Se servono più info, sono nel `ModelsTable` non qui.

---

### UC3 · ResultsPanel · post-statica OK (UR_max < 0.7)

**Surface**: `ResultsPanel.tsx`, sezione hero — visible appena finisce
un'analisi statica con UR confortevole.

```tsx
<InsightPanel
  tone="success"
  eyebrow="ANALISI STATICA · COMPLETATA"
  title="Tutti gli elementi sono in sicurezza"
  items={[
    { glyph: "✓", text: "UR max 0.34 su elemento B7", reference: "NTC § 4.2.4.1" },
    { glyph: "✓", text: "Spostamento max 8.2 mm @ nodo 12" },
    { glyph: "✓", text: "Frequenza propria f₁ = 4.12 Hz" },
  ]}
  action={{ label: "Genera report", onClick: openReportDialog }}
/>
```

**Regole**:
- Title affermativo: `"Tutti gli elementi sono in sicurezza"`, NON `"Analisi OK"`.
- Numerica sempre con unità + posizione (`@ nodo 12`, `su elemento B7`). Vedi Principio UX #1.
- Reference normativa **sul item UR** (è la verifica che fa fede).

---

### UC4 · ResultsPanel · post-statica con UR critico (UR_max > 0.95)

**Surface**: come UC3, ma quando uno o più elementi superano UR 0.95.

```tsx
<InsightPanel
  tone="danger"
  eyebrow="ANALISI STATICA · ATTENZIONE"
  title="1 elemento supera UR 0.95"
  items={[
    { glyph: "⚠", text: "B3 IPE 240 · UR 0.98", reference: "NTC § 4.2.4.1" },
    { glyph: "✓", text: "Altri 9 elementi UR < 0.85" },
    { glyph: "○", text: "Spostamento max 23.1 mm @ nodo 8" },
  ]}
  action={{ label: "Vai a elemento critico", onClick: () => focusElement("B3") }}
/>
```

**Regole**:
- Title quantificato: `"1 elemento supera ..."`, NON `"Verifica fallita"`. Numerica > aggettivo.
- Action punta **direttamente** all'elemento critico (focusElement → viewport zoom + inspector open).
- Se ci sono >3 elementi critici: title diventa `"3 elementi superano UR 0.95"`, items elencano i 3 peggiori, action diventa `Apri elenco completo` → `ChecksDetailTable` filtrato.

**Soglia tone**:
- `0.00 ≤ UR_max < 0.70` → `success` (UC3)
- `0.70 ≤ UR_max < 0.95` → `warn` (variante intermedia — title: `"X elementi tra UR 0.70 e 0.95"`)
- `UR_max ≥ 0.95` → `danger` (UC4)

---

### UC5 · VerifyPanel · summary normative live

**Surface**: `VerifyPanel.tsx`, sezione header — summary delle norme calcolate.

```tsx
<InsightPanel
  tone="info"
  eyebrow="VERIFICHE NORMATIVE"
  title="3 normative calcolate"
  items={[
    { glyph: "✓", text: "EC3 § 6.2.1 — 10/10 elementi PASS" },
    { glyph: "✓", text: "NTC18 § 4.2.4.1 — UR max 0.31" },
    { glyph: "→", text: "S275 — tutti gli elementi in plasticità tollerata" },
  ]}
  action={{ label: "Apri Verifiche live", onClick: () => router.push("/verify/live") }}
/>
```

**Regole**:
- `tone="info"` perché è summary, non outcome. Le verifiche specifiche
  vivono in `ChecksRail` / `ChecksDetailTable` con tone proprio.
- Reference normativa **nel testo dell'item**, non nel campo `reference`
  (qui la reference *è* il contenuto, non una nota a piè).
- Glyph `→` per item informativi (no PASS/FAIL implicito).

---

## 6 · Tabella rapida ref

| UC | Surface | Tone | Trigger |
|---|---|---|---|
| 1 | `MakePanel` | `warn` | modello con gap obbligatori |
| 2 | `MakePanel` | `success` | modello solvabile, non ancora solver |
| 3 | `ResultsPanel` | `success` | post-statica, UR_max < 0.70 |
| 3b | `ResultsPanel` | `warn` | post-statica, 0.70 ≤ UR_max < 0.95 |
| 4 | `ResultsPanel` | `danger` | post-statica, UR_max ≥ 0.95 |
| 5 | `VerifyPanel` | `info` | summary norme calcolate |

Stato `pending` (non tabellato sopra) → usabile quando solver è in coda
o running, esempio:

```tsx
<InsightPanel
  tone="pending"
  eyebrow="SOLVER · IN CODA"
  title="Analisi non-lineare in coda"
  items={[
    { glyph: "○", text: "Posizione 2/3 — ETA ~45s" },
    { glyph: "○", text: "Newton-Raphson · 200 step max" },
  ]}
  // niente action — non c'è nulla da fare
/>
```

---

## 7 · Counter-pattern (cosa NON è un InsightPanel)

- **Toast**: notifica transiente (salvataggio, errore di rete). `InsightPanel` è persistente nella sua surface — non sparisce dopo N secondi.
- **Empty state**: quando una surface non ha dati da mostrare. Usa `EmptyState` (vedi `empty-states-catalog.md`).
- **Inline validation di un form**: usa `<Field error="…">`, non un panel sopra.
- **Dialog di conferma**: serve azione bloccante, non insight. Usa `ConfirmDialog`.

---

## 8 · Acceptance checklist (per QA)

- [ ] In ogni surface (`MakePanel`, `ResultsPanel`, `VerifyPanel`) c'è **un solo** `InsightPanel` visibile alla volta.
- [ ] Eyebrow segue formato `{CONTESTO} · {STATO}` in tutti i 5 use case.
- [ ] Action label è verbo imperativo, mai generic.
- [ ] Items hanno glyph coerente con tone (`✓` = success, `⚠` = warn/danger, `○` = pending/info, `→` = info).
- [ ] Soglia UR per tone switch (`0.70`, `0.95`) rispettata.
- [ ] Numerica items: sempre unità + posizione (mai numero nudo).
- [ ] Riferimenti normativi nel formato `EC3 § 6.2.1` o `NTC18 § 4.2.4.1` (spazio prima del paragrafo).

---

**Implementazione stimata Claude Code**: ~1h (popolare 5 instances + casi border).
