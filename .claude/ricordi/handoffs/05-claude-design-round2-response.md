# Handoff 05 — Claude Design risponde · Round 2 (avatar dropdown + Settings/Billing)

> Salvato 29/05/2026 nei ricordi del repo per persistenza.
>
> **Provenienza**: `HANDOFF.md` letterale di Claude Design Round 2,
> ricevuto come parte del bundle export (versione `-handoff`) dopo il
> prompt Round 2 (vedi `02-claude-design-round2-prompt.md`).
>
> **Status del bundle**: estratto in
> `Desktop/socio/_claude-design-output-comparison/round-02/fea-pro-dashboard-redesign/`
> nel filesystem locale di Federico. Bundle completo (Dashboard.html
> aggiornato + Settings-Billing.html + styles + 9 screenshots + uploads)
> NON committato nel repo per peso. Solo questo file Markdown (human-readable)
> è versionato qui.
>
> **Risposta Claude Design**: dichiarata da Claude Design come "verifier
> agent check completed · verifica passata · tutto confermato funzionante"
> — i 3 stati Billing, l'avatar dropdown, light/dark, niente errori console.
>
> **Decisioni post-handoff (Federico carta bianca)**:
> - Prezzo Pro → **€19/mese** placeholder, allineato a SaaS B2B tech, easy da cambiare
> - Tema 3 stati → pre-deciso, il TSX cicla light/dark/system, il mockup mostra 2 (no `prefers-color-scheme` in HTML)
> - Downgrade Pro→Free → inerte per MVP ("Piano base"), Stripe Customer Portal in futuro maturo
>
> **Step E avviato**: implementazione React fetta-per-fetta secondo strategia
> "DashTopBar first" suggerita da Claude Design (vedi `01-federico-come-collabora.md`
> sezione tips operativi).

---

# Handoff 02 — Dashboard redesign (mockup → Claude Code)

> Da **Claude Design** per Federico + Claude Code · risposta al brief
> `reference/BRIEF.md` (Handoff 01).
> **Contratto visivo**: `Dashboard.html` + `styles/dashboard.css` (su
> `styles/tokens.css` Soft v2.1). Quando il codice React diverge dal
> mockup, **vince il mockup** (ADR 002).

---

## 0 · Cosa c'è qui

| File | Ruolo |
|---|---|
| `Dashboard.html` | Mockup hi-fi standalone della nuova Dashboard — 3 stati + dark + sharp |
| `styles/dashboard.css` | Stili dei componenti, su CSS variables Soft v2.1 |
| `styles/tokens.css` | Fonte unica token (copiata dal handoff, invariata) |
| `reference/DESIGN_HANDOFF.md` | Spec DS Soft v2.1 (riferimento) |
| `reference/BRIEF.md` | Il brief originale (Handoff 01) |

**Aprire**: `Dashboard.html` nel browser. In basso a destra c'è una
**barra DEMO** (non fa parte del prodotto) per cambiare stato A/B/C,
tema light/dark e radius soft/sharp. Va rimossa in produzione
(`.demo-bar` + il `<script>` finale).

---

## 1 · I 3 stati richiesti

| Stato | Trigger | Cosa cambia |
|---|---|---|
| **A** · abituale (caso 90%) | `body[data-state="A"]` | RecentsCarousel visibile, niente banner |
| **B** · quota > 80% | `body[data-state="B"]` | + QuotaBanner sticky ambra; sottotitolo hero variante "quota" |
| **C** · primo accesso (0 modelli) | `body[data-state="C"]` | Recents → EmptyOnboarding (3 tile template più semplici); sottotitolo hero variante "onboarding" |

In React questo è uno `switch` su `recentModels.length` + `quotaPct`,
non un attributo: lo stato del mockup è solo un comodo proxy di demo.

---

## 2 · Mappa componenti (mockup → React)

Tutti i blocchi hanno classi semantiche con prefisso parlante.

| Componente React | Classe radice mockup | Note |
|---|---|---|
| `DashTopBar` | `.dash-topbar` | Replica visiva di `ShellTopBar` E2.1. Brand + 3 nav fisse (Home/Modelli/Jobs) + `.cmd-pill` (⌘K) + help + notifiche + `.tb-avatar` (apre menu profilo: Cronologia/Template/Impostazioni/Docs). **NIENTE** model selector, save chip, Run, undo/redo, toggle Albero/Focus → sono workspace-only. |
| `QuotaBanner` (cond.) | `.quota-banner` | Render solo se `quotaPct > 0.8`. Sticky `top: 48px`. Dismissibile (per-sessione). Usa `--warn` / `--bg-warn`, mai cyan. |
| `DashHero` | `.dash-hero` | eyebrow greeting dinamico (`Buongiorno`/`Buon pomeriggio`/`Buonasera`/`Notte fonda`, vedi script) + h1 1 riga + sub 1 riga. Sobrio, non dominante. |
| `NewModelTile` | `.new-model-tile` | **Unica** CTA primaria grande. ⌘N. A fianco `.action-aside` con 2 link sobri (Apri da template · Segui un percorso). |
| `RecentsCarousel` | `.recents` | Scroll orizzontale, snap. **Prima card** `.recent-card.is-resume` ha la `.resume-bar` ("Ultima sessione · …" + bottone **Riprendi** → apre il workspace nella fase salvata). |
| `RecentCard` | `.recent-card` | Thumb (schema SVG deterministico) + trust badge + meta mono. |
| `EmptyOnboarding` | `.empty-onboard` | Stato C. 3 `.empty-tile` ai template più semplici (Trave bi-appoggiata, Mensola, Telaio 2D) con CTA dirette. Non splash decorativo. |
| `TemplateGallery` | `#template-gallery` | Fondo dashboard, prominente. `.tg-filters` (chip) + `.tg-grid` (auto-fill, 9 `.tpl-card`). Card featured = `.is-featured`. |
| `DashFoot` | `.dash-foot` | Minimale + disclaimer "Preliminary release" onesto. |

### Trust badge & onestà
I badge `PRELIM / DRAFT / VALID` (`.trust-prelim/.trust-draft/.trust-valid`)
e gli stati recenti seguono i **4 stati onesti** (CULTURE.md): mai "tutto
OK" se non è vero. `VALID` (success) compare solo su modello realmente
validato.

---

## 3 · Token & regole rispettate

- **Cyan singular** (`--accent`): CTA primarie, link, selezione, focus. I
  semantici (`--warn` banner/preliminary, `--coral` carichi, `--purple`
  verifiche/sismica) non sono mai usati come CTA.
- **Triade font**: display Plus Jakarta Sans (hero/h2/h3), body Inter,
  **mono JetBrains Mono** per tutti i numerici (`tabular-nums`), eyebrow,
  kbd, unità, ID modello, meta.
- **Soft**: radius 8–20, hairline border, `--shadow-card/-hover` morbide.
  `data-radius="sharp"` azzera tutto (toggle demo lo prova).
- **Motion**: solo `--d-fast/-mid`, `--ease-standard`. Niente bounce, niente
  scale su hover (solo `translateY(-1/-2px)` + border/shadow).
- **Niente emoji** nella UI; icone lucide (stroke 1.8, currentColor). Le
  SVG dei thumbnail sono **schemi strutturali deterministici** in
  `currentColor` su `--bg-viewport` (coerente col DNA "geometria pura").

---

## 4 · Responsive

| Target | Larghezza | Comportamento |
|---|---|---|
| **Primary** | 1200–1920px | `.dash-wrap` max-width 1440 centrato; `.action-zone` 1.5fr+1fr; recents 4-up scroll; gallery auto-fill ~4 col |
| **Secondary** | 768–1199px | `≤1100`: `.action-zone` e `.empty-grid` → 1 colonna; gallery riflette in 2–3 col; `≤860`: nav topbar icon-only, `.cmd-pill` → solo icona |
| **Mobile** | <768px | **Fuori scope** (come da brief). Mantenere `MobileTabbar` + `DashboardPage` mobile esistenti. |

Breakpoint del DS: `sm 768 · md 1024 · lg 1280 · xl 1440`. I miei
breakpoint CSS (1100/860) sono di comodità del mockup — in React usare la
scala Tailwind del progetto.

---

## 5 · Dati (placeholder → backend)

I numeri sono **placeholder** (come da §9 del DESIGN_HANDOFF): UR=0.24,
δ=4.2mm, f₁=1.82 Hz, "5/5 modelli", "giovedì 18:42" ecc. vengono da:
`recentModels` (con `lastSession`, `phase`), `quota` (`used/limit`),
`templates` (catalogo 9). Le thumbnail sono **pre-rendered** (qui SVG
inline; in prod PNG/SVG pre-generati, niente viewport live-render — riduce
il costo backend per utenti free che spulciano, audacia (b) del brief).

---

## 6 · Note / controproposte (decidi tu, Federico)

1. **Greeting nell'eyebrow, non in h1.** Il brief voleva il greeting
   "sobrio, non dominante": l'ho messo come eyebrow mono e ho dato all'h1
   una domanda stabile ("Da dove ricominci?"). Se preferisci il greeting
   come titolo, è uno scambio di 2 righe.
2. **`action-aside` come card a 2 righe** invece di link puramente
   testuali. Il brief diceva "link sobri testuali": la mia versione resta
   sobria ma dà area di click e affordance. Se vuoi testo puro inline
   (stile Linear `Apri da template · Segui un percorso`) lo semplifico.
3. **Trust `VALID` (verde) introdotto** sulla Mensola per mostrare i 4
   stati. Verifica che sia coerente con la realtà del modello demo —
   altrimenti torna a `PRELIM`/`DRAFT` per non violare "no bugie visive".
4. **Carosello vs griglia recenti.** Ho scelto carosello orizzontale
   (recents-first, scansione veloce). Se preferisci una griglia 2×2 fissa
   sopra-piega, è un cambio di `.recents` (grid invece di scroll).
5. **Menu avatar non espanso** nel mockup (è solo il bottone). Le voci
   sono in §2; posso aggiungere il dropdown se serve come riferimento.

---

## 7 · Da rimuovere in produzione

- `.demo-bar` (markup) + lo `<script>` finale (state/theme/radius toggle).
- Il greeting dinamico nello script va ricablato lato React (hook su `Date`).
- `style="display:contents"` sugli `<a>` interni alle recent-card è una
  scorciatoia mockup: in React usa un wrapper o `onClick` sul Card.

---
---

# Handoff 04 — Round 2 (chiusura cerchio Dashboard)

> Risposta al prompt `02-claude-design-round2-prompt.md`. Due pezzi:
> avatar dropdown espanso + pagina Settings/Billing. Le 5 controproposte
> di Round 1 sono confermate (vedi sotto).

## R2.0 · Controproposte Round 1 — stato applicato

| # | Decisione Federico/Claude Code | Fatto |
|---|---|---|
| 1 | Greeting in eyebrow | ✅ invariato |
| 2 | `action-aside` come card 2 righe | ✅ invariato |
| 3 | **Mensola → `PRELIM`** (non VALID) | ✅ **corretto in `Dashboard.html`** — niente bugie visive |
| 4 | Recents carosello | ✅ invariato |
| 5 | Avatar menu espanso | ✅ vedi R2.1 |

## R2.1 · PEZZO 1 — Avatar dropdown (in `Dashboard.html`)

Replica fedele di **`AvatarMenu.tsx`** (E2.1) — l'ho letto dal repo, non
inventato. Voci, ordine, divider e icone lucide combaciano.

- Markup: `.tb-avatar-wrap > #avatarBtn + .avatar-menu`. Apertura via
  classe `.is-open` sul wrap (JS: click toggle, outside-click + `Esc`
  chiudono). In React = `@radix-ui/react-dropdown-menu` (`align="end"`,
  `sideOffset={6}`, `animate-slide-down`).
- Gruppi (con `.am-sep` tra l'uno e l'altro):
  1. header `Connesso come / federico@feapro-qa.com`
  2. Modalità focus (`⇧ Space` kbd) · Account & quota · Loads location ·
     Tema (chip `Light/Dark`) · Percorsi guidati
  3. Esporta JSON · CSV · report PDF
  4. **Impostazioni → `Settings-Billing.html`** · Aiuto e shortcut
  5. Cronologia · Template · Docs (gruppo IA prototipo v3)
  6. Logout (`--danger`)
- Stile: `.avatar-menu` = `bg-elevated` + `border-light` + `shadow-dialog`
  + `r-md`, min-width 260. `.am-item` 13px, icona lucide 14px `ink-dim`.
  Theme chip mirrora il tema corrente.
- Nota: in prod le voci Cronologia/Docs sono `// TODO E2.5` (no route);
  Template → `/templates`, Impostazioni → `/settings`. Come nel TSX.

## R2.2 · PEZZO 2 — `Settings-Billing.html` + `styles/settings-billing.css`

Pagina app-level con **DashTopBar** (stessa della Dashboard, riusa
`dashboard.css`) + `QuotaBanner` riusato. 3 stati via `body[data-state]`:

| Stato | Quota | Cosa cambia |
|---|---|---|
| **A** · Free standard | 2/5 | barra cyan 40%, CTA "Scopri Pro", 2 modelli, niente banner |
| **B** · Free >80% | 4/5 | + QuotaBanner ambra sticky; barra ambra 80%; h1-sub "Stai per raggiungere il limite"; 4 modelli |
| **C** · Pro attivo | ∞ | h1 "Piano Pro", barra verde, "Gestisci abbonamento", niente CTA upgrade; Pro card = `PIANO ATTIVO` |

Blocchi (classi `.sb-*`):
- `.sb-hero` — eyebrow `PIANO` + h1 `Piano Free`/`Piano Pro` (split
  `.show-free`/`.show-pro`) + sub per-stato (`.only.A/.B/.C`).
- `.sb-card` "Utilizzo corrente" — `.usage-figure` (mono tabular) `2/5`,
  `.usage-bar`/`.usage-fill` (width+colore per stato), breakdown
  `.usage-list` (nome + ID + creato + size KB; righe `.extra` solo B/C).
- `.sb-card#plans` "Confronto piani" — `.plans-grid` 2 col Free vs Pro,
  `.feature-list` con ✓ `--success` / — `ink-faint`, `.plan-current-chip`
  + `.plan-cta` per stato. Prezzo Pro = **`€XX/mese`** placeholder onesto.
- `.sb-disclaimer` — pricing "in definizione", link a `/preliminary`.

### Helper di stato (importante per il porting React)
La visibilità per-stato usa classi `.show-free/.show-pro`, `.only.A/.B/.C`
e `.uf-variant.A/.B/.C` con `display:…!important` (servono a battere le
regole element-level che settano `display`, es. `.sb-tier` inline-flex,
`.usage-figure` flex). In React **non** servono: è uno `switch` su
`plan`/`quotaPct`, niente `!important`.

## R2.3 · Da rimuovere in produzione (Round 2)
- `.demo-bar` + `<script>` finale di entrambe le pagine.
- Gli `style="width:auto;…"` inline sulla CTA "Scopri Pro" della usage-card
  (scorciatoia mockup → variante size in `Button`).

## R2.4 · Note / dubbi per il prossimo giro
- **Prezzo Pro**: lasciato `€XX/mese · pay-per-token`. Quando avete il
  numero lo cablo (o lo fa Claude Code dal billing store).
- **Tema a 3 stati** (light/dark/**system**): il `AvatarMenu.tsx` cicla
  3 modi; nel mockup il chip mostra solo Light/Dark (no `system`, perché
  l'HTML non ha il match `prefers-color-scheme`). In React tenere il ciclo
  a 3 come nel TSX.
- **Downgrade Pro→Free**: nel mockup la card Free in stato C mostra "Piano
  base" inerte. Se volete un flusso di downgrade esplicito, ditemelo.
