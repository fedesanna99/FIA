# Handoff 03 — Claude Design risponde · Round 1 mockup Dashboard

> Salvato 29/05/2026 nei ricordi del repo per persistenza.
>
> **Provenienza**: `HANDOFF.md` letterale di Claude Design, ricevuto
> come parte del bundle export (versione `-handoff`) dopo il prompt
> Round 1 (vedi `01-dashboard-redesign-prompt.md`).
>
> **Status del bundle**: estratto in
> `Desktop/socio/_claude-design-output-comparison/handoff/fea-pro-dashboard-redesign/`
> nel filesystem locale di Federico. Bundle completo (Dashboard.html +
> styles + screenshots + uploads) NON committato nel repo per peso.
> Solo questo file Markdown (human-readable) è versionato qui.
>
> **Decisioni post-handoff**:
> - 4 controproposte mantenute, 1 cambiata (Trust VALID Mensola → PRELIM)
> - Round 2 chiesto: avatar dropdown espanso + pagina /settings/billing
>   (vedi `02-claude-design-round2-prompt.md`)
> - Strategia implementazione Step E (suggerita da Claude Design):
>   partire da DashTopBar per confronto pixel-by-pixel vs ShellTopBar
>   live (vedi `socio/01-federico-come-collabora.md` sezione tips)

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
