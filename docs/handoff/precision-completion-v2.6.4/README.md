# FEA Pro · Precision Completion (v2.6.4)

> Carry-over pack che chiude il **15% mancante** dell'handoff Precision v2.0
> dopo la release v89 (`v2.6.3-precision-handoff`) e la patch v91+
> (`v2.6.3.1`). Tre deliverable essenziali per arrivare al 100% reale, più
> tre utili non bloccanti.
>
> Tono e formato identici all'handoff originale (`FEA_Pro_Design_System__7_.zip`):
> tecnico, pragmatico, snippet concreti, decisioni esplicite. Nessun
> brainstorm — tutte le scelte strategiche sono già in `RICHIESTE v2.6.4`.

**Versione FEA Pro deploy**: `v2.6.3-precision-handoff` (release v89 live)
**Versione attesa post completion**: `v2.6.4-precision-completion`
**Branch suggerito**: `feat/precision-completion-v2.6.4`

---

## 1 · Cosa c'è dentro

```
FEA_Pro_Precision_Completion/
├── README.md                              ← questo file
├── docs/
│   ├── c6-insight-panel-content-spec.md   ← A.3 · ESSENZIALE
│   ├── c7-trust-layer-pdf-integration.md  ← A.1 · ESSENZIALE
│   ├── c8-onboarding-tour-flow.md         ← A.2 · ESSENZIALE
│   ├── b3-checks-content-spec.md          ← B.2 · utile
│   ├── empty-states-catalog.md            ← B.1 · utile
│   └── accessibility-spec.md              ← B.3 · utile (gate WCAG 2.1 AA)
└── react-pack/
    └── shell/
        ├── OnboardingTour.tsx             ← A.2 · ESSENZIALE (drop-in)
        └── _onboarding-hooks.stub.ts      ← A.2 · stub signatures useUser / useMarkOnboardingComplete
```

---

## 2 · Mappa gap → file

| Gap residuo (post v2.6.3.1) | File di riferimento | Tipo |
|---|---|---|
| TrustLayerBadge watermark (PDF preview) — 40% → 100% | `docs/c7-trust-layer-pdf-integration.md` | spec |
| InsightPanel — content semantico nei 5 use case | `docs/c6-insight-panel-content-spec.md` | spec |
| OnboardingTour — pseudocodice → component drop-in (8 step, autoplay, backend user setting) | `react-pack/shell/OnboardingTour.tsx` + `react-pack/shell/_onboarding-hooks.stub.ts` + `docs/c8-onboarding-tour-flow.md` | code + spec |
| ChecksDetailTable — header per element type (B.2) | `docs/b3-checks-content-spec.md` | spec |
| Empty states inconsistenti — catalog (B.1) | `docs/empty-states-catalog.md` | spec |
| A11y gate per Stripe-live (B.3) | `docs/accessibility-spec.md` | spec |

---

## 3 · Sprint suggerito per Claude Code

**Brief consigliato** (`v2.6.4-precision-completion`), tre slot compound:

- **Slot A — Essenziale (3 voci)**
  - A.1 wire `TrustLayerBadge variant="watermark"` dentro `ReportExportDialog` (preview iframe overlay + print CSS) → `docs/c7-…`
  - A.2 monta `OnboardingTour.tsx` in `App.tsx` root + aggiungi 6 `data-tour-target` ai target elements → `react-pack/shell/OnboardingTour.tsx` + `docs/c8-…`
  - A.3 popola le 5 instances `InsightPanel` con i contenuti canonici → `docs/c6-…`

- **Slot B — Utile (2 voci, parallelizzabili)**
  - B.1 wrappa empty state in tutti i 7 surface elencati → `docs/empty-states-catalog.md`
  - B.2 patcha `ChecksDetailTable` con header dinamico per `element.type` → `docs/b3-checks-content-spec.md`

- **Slot C — Opzionale gate WCAG**
  - B.3 audit di tab order + aria-live + contrast dark — solo se Stripe-live richiede compliance dichiarata → `docs/accessibility-spec.md`

Stima Claude Code: **A** ~3h, **B** ~1.5h, **C** ~2h.

---

## 4 · Convenzioni mantenute

- Tutti i radius sono `0` (Precision sharp). Eccezione `--r-full` solo per cerchi.
- Hairline borders. Nessuna ombra multi-layer.
- Cyan singular accent (`#0891B2` light / `#5DD7F2` dark).
- Tone italiano tecnico, imperativo all'utente, riferimenti normativi sempre nominati.
- Type: Inter / Inter Tight / JetBrains Mono. Tabular nums sui dati.
- Nessuna emoji nei deliverable UI. Le emoji nei `docs/*.md` sono solo per categorizzare workspace nei commenti interni.

---

## 5 · Cosa NON è in questo pack

- `b2-make-hub.md` axis-tag pattern → già copribile da `b2` originale, NO richiesta.
- Animazioni palette + tour (parte e2) → `e1-e2-animations.md` originale ha pseudocodice sufficiente.
- Responsive breakpoints → `d1-d2-responsive.md` originale è completo.
- Avatar / Chip / ChipTone / Button types → handoff originale Atoms.

Se Claude Code chiede uno di questi, rispondere: "vedi handoff originale".

---

**Generato**: Claude Design · sessione `Precision Completion v2.6.4`
**Da girare a**: chat Claude Code dedicata `v2.6.4-precision-completion`
