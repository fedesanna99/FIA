# Design tokens audit · v1.6.1-polish vs mockup v0.3

> Sorgente attuale: `frontend/src/index.css` (CSS variables `--c-*` + alias
> semantici). Light + dark theme.
> Sorgente mockup: campionamento eyedropper visivo su `01..08` PNG.

---

## Tokens attuali — light theme (default mockup)

### Surfaces
| Token | RGB | Hex | Note |
|---|---|---|---|
| `--c-bg` | `247 247 245` | `#F7F7F5` | warm neutral page |
| `--c-bg-panel` | `255 255 255` | `#FFFFFF` | card / panel surface |
| `--c-bg-elevated` | `255 255 255` | `#FFFFFF` | dropdown / dialog |
| `--c-bg-hover` | `241 239 232` | `#F1EFE8` | hover state |
| `--c-bg-viewport` | `250 250 248` | `#FAFAF8` | viewport canvas bg |
| `--c-bg-active` | `230 241 251` | `#E6F1FB` | selected rail item |

### Borders
| Token | Hex |
|---|---|
| `--c-border` | `#E4E2DB` (warm tinted black 8%) |
| `--c-border-light` | `#D2CFC6` |
| `--c-border-strong` | `#B4B2A9` |

### Ink (4 livelli)
| Token | Hex | Uso |
|---|---|---|
| `--c-ink` | `#1A1A1A` | primary text |
| `--c-ink-muted` | `#5F5E5A` | secondary |
| `--c-ink-dim` | `#888780` | meta / placeholder |
| `--c-ink-faint` | `#B4B2A9` | disabled |

### Accent (info blu)
| Token | Hex | Note |
|---|---|---|
| `--c-accent` | `#185FA5` | primary CTA color |
| `--c-accent-hover` | `#124882` | hover |
| `--c-accent-subtle` | `#E6F1FB` | bg tinted |

### Semantic
| Token | Hex | Famiglia |
|---|---|---|
| `--c-success` | `#3B6D11` | green dark — *NON* il "Percorsi green" del mockup |
| `--c-warn` | `#854F0B` | warning / orange |
| `--c-coral` | `#993C1D` | collab/load — coral scuro |
| `--c-purple` | `#534AB7` | AI/annotation |
| `--c-danger` | `#C62828` | errori |
| `--c-info` | `#185FA5` | alias accent |

### Semantic backgrounds (tint chiaro)
`--c-bg-success #EAF3DE`, `--c-bg-warn #FAEEDA`, `--c-bg-coral #FAECE7`,
`--c-bg-purple #EEEDFE`, `--c-bg-info #E6F1FB`.

### Shadow / radius
- `--shadow-pop`: `0 2px 12px -4px rgba(0,0,0,.08), 0 8px 24px -6px rgba(0,0,0,.06)`
- `--shadow-elev`: idem più intenso
- `--shadow-dialog`: `0 24px 64px -12px rgba(0,0,0,.18)`
- `--r-sm 4px · --r-md 6px · --r-lg 10px · --r-xl 14px`

### Tipografia
- Font famiglia body: `Inter, IBM Plex Sans, system-ui` (caricata da
  `<link>` Google Fonts in `index.html`).
- Font famiglia mono: `JetBrains Mono` (chip versione, counts, kbd).
- **Font display / hero**: stessa famiglia Inter, no famiglia dedicata.
- `font-size body`: `13px` (settato globalmente su `body`).

---

## Tokens osservati nei mockup v0.3 (eyedropper)

### Surfaces
| Token osservato | Hex stimato | Note |
|---|---|---|
| page bg | `#F7F7F5` / `#FAFAF8` | identico al `--c-bg` attuale |
| card surface | `#FFFFFF` | identico |
| sidebar bg | `#FFFFFF` con bordo sx | identico |
| viewport bg | `#FAFAF8` con grid sottile | identico |
| hover/elevated | `#F4F2EC` | leggermente più caldo dell'attuale `#F1EFE8` |

### Accent (doppia famiglia!)
| Token osservato | Hex stimato | Uso nel mockup |
|---|---|---|
| **Studio Pro blue** | `#1E3A8A` → `#1E40AF` | CTA "Studio Pro", primary buttons, accent generale |
| **Percorsi green** | `#10B981` → `#34D399` | CTA "Percorsi", route cards header, success/algorithmic guidance |
| AI purple | `#7C3AED` → `#8B5CF6` | "AI Copilot" promo card, AI badge |
| Credits orange | `#F59E0B` → `#F97316` | crediti counter, billing chip |
| Critical red | `#EF4444` → `#DC2626` | UC max, critical element (mockup 06) |

### Tipografia mockup
- Body: Inter regular 400 / medium 500
- Heading hero ("Start your analysis", "Choose a path", "Critical view"):
  Inter SemiBold 600 / Bold 700, ~32-40px
- Heading card titles: Inter SemiBold 600, ~18-22px
- Meta / labels: Inter Medium 500 uppercase, tracking wider, ~11px (es.
  "WORKSPACES", "MAKE", "ANALYSIS SETUP" in sidebar mockup 06/08)
- Numeric / mono: Inter Tabular Numbers, **non** un mono font (es. "0.88
  UC max" è Inter, non mono)
- Density: heading e meta usano stesso font Inter ma con weight molto
  diversi → contrasto tipografico ALTO

### Componenti distintivi mockup
- **Sidebar sx con sezioni "WORKSPACES / MAKE / ANALYSIS SETUP / RESULTS /
  TEMPLATES" come uppercase labels** (mockup 06/08): rail organizzato per
  categoria, non per modal/panel come ora.
- **Sidebar dx persistent**: card grandi (Model information, Analysis
  summary, Results overview, Synced with Percorsi note), non rail con
  icone.
- **Card route Percorsi** (mockup 02): tre etichette "Step-by-step ·
  Algorithmic guidance · Always in control" + thumbnail + "Start path"
  pill verde.
- **Critical/UC chip** (mockup 06): "B1 · 0.88 UC max" in card prominente
  con accent red.
- **Bottom legend colormap** + toggle Deformata/Wireframe come bottom bar.

---

## Mapping e gap

| Token | Attuale | Mockup | Severity | Note |
|---|---|---|---|---|
| `bg-page` | `#F7F7F5` | `#F7F7F5` | ✅ ok | identico |
| `bg-surface` | `#FFFFFF` | `#FFFFFF` | ✅ ok | identico |
| `bg-viewport` | `#FAFAF8` | `#FAFAF8` | ✅ ok | identico |
| `bg-hover` | `#F1EFE8` | `#F4F2EC` | 🟢 P3 polish | leggera differenza, polish |
| `border` | `#E4E2DB` | `#E5E5E5` cooler | 🟢 P3 polish | warm vs cool, polish |
| `ink-1` | `#1A1A1A` | `#0F172A` | 🟢 P3 polish | leggermente meno saturo dell'attuale |
| `ink-2` | `#5F5E5A` | `#475569` | 🟢 P3 polish | warm vs cool slate |
| `accent (primary)` | `#185FA5` | `#1E40AF` | 🟡 P2 visible | mockup è **più scuro e più saturo** (navy vs azure) |
| **`accent-secondary` (Percorsi)** | **mancante** | `#10B981` (emerald) | 🔴 **P0 missing** | Il sistema attuale ha SOLO 1 accent. Mockup ha **dualità Studio Pro blu / Percorsi verde** come asse semantico del prodotto |
| `success` | `#3B6D11` | `#10B981` | 🟡 P2 visible | mockup verde più "fresh emerald", attuale verde oliva scuro |
| `warn` | `#854F0B` | `#F59E0B` | 🟡 P2 visible | mockup arancio brillante, attuale terra siena |
| `coral` | `#993C1D` | n/a | — | famiglia non usata visibilmente nei mockup |
| `purple (AI)` | `#534AB7` | `#7C3AED` | 🟡 P2 visible | mockup viola più saturo, attuale tendente al blu |
| `danger` | `#C62828` | `#DC2626` | ✅ ok | molto vicino |
| `font-body` | Inter | Inter | ✅ ok | identico |
| `font-display` | Inter (default) | Inter SemiBold/Bold | 🟡 P2 | manca distinzione semantica display vs body |
| `font-mono` | JetBrains Mono | n/a (mockup usa Inter Tabular) | 🟢 P3 polish | i mockup non usano mono come l'attuale lo usa (chip versione, counts) |
| `font-size base` | 13px | ~14px stimato | 🟢 P3 polish | tipografia attuale leggermente più piccola |
| `shadow-pop` | warm soft | leggermente più "lifted" | 🟢 P3 polish | quasi identico |
| `r-sm/md/lg/xl` | 4/6/10/14 | 6/8/12/16 | 🟢 P3 polish | mockup leggermente più rotondi |

---

## Tokens MANCANTI nel sistema attuale (= gap strutturale)

1. **`--c-accent-percorsi` (emerald `#10B981`)** — P0
   Il sistema non ha un secondo accent. La dualità Studio Pro / Percorsi è
   uno degli assi semantici principali del prodotto futuro: serve come
   token, non solo come uso di `success`.
2. **`--c-credits` / `--c-billing`** — P2
   I crediti nei mockup hanno un colore tonale dedicato (orange `#F59E0B`)
   distinto da warn. Attualmente "Crediti FREE" usa stesso colore di card
   neutra.
3. **`--c-critical`** — P1 (per mockup 06 GPS Strutturale)
   Il "critical element" UC max ha un trattamento visivo distintivo (red
   saturated `#EF4444` + tinted bg). Attualmente esiste solo `danger`
   generico per errori HTTP.
4. **Tokens stato Percorsi** (`--c-path-active`, `--c-path-soon`,
   `--c-path-locked`) — P1
   Mockup 02 mostra card route con stati visivi distinti (active/recommended,
   soon/disabled). Attualmente non esistono nemmeno gli stati semantici.

---

## Raccomandazione

I tokens attuali sono **strutturalmente corretti** (4-livelli ink, 5
famiglie semantic, alias R-G-B per Tailwind, dark/light dual theme). La
distanza dai mockup è **principalmente di sfumatura cromatica + un asse
mancante (Percorsi green)**, non architetturale.

Per allineamento futuro:
- **Polish chirurgico (1-2 giorni)**: tweak hex per accent/success/warn,
  font-size body 13→14, radius scale +2.
- **Strutturale (5-10 giorni)**: introdurre famiglia `--c-accent-percorsi`
  + `--c-credits` + `--c-critical` + tokens stato Percorsi.
- **Tipografico (2-3 giorni)**: introdurre `--font-display` distinto +
  weights heading dedicati (600/700) per hero text.

Stima cumulativa allineamento token: **~2 settimane di lavoro UX-frontend
dedicato**. Da fare in "Product Alignment Sprint", non ora.
