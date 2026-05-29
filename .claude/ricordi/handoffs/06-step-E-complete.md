# Handoff 06 — Step E completo · Dashboard redesign React

> Scritto da Claude Code il 29/05/2026 pomeriggio (dopo pranzo di Federico)
> a chiusura di Step E. Documento di passaggio per il prossimo Claude
> Code che riprenderà il progetto.

## Stato repo al momento della scrittura

- **Branch**: `redesign/workspace-fasi`
- **HEAD locale**: commit `8a46e96` (E3.8)
- **`origin/main`**: ferma a `ef7cc66` o vicino (l'ultimo push pubblico è
  stato i ricordi D0 → `06437da` + post-deploy fixes. Verificare con
  `git log --oneline origin/main..HEAD` per il delta esatto)
- **Le 8 fette E3 sono in main locale ma NON pushate** (regola del patto:
  niente push senza ordine esplicito di Federico). Federico ha valutato
  ad occhio il risultato live su localhost, va molto bene, sta decidendo
  se pushare/deployare quando torna disponibile.

## Cosa è successo dopo D0

Dopo il bootstrap dei ricordi (D0, commit `7d96869`) la sessione è
proseguita con:

1. **Deploy live v3.4** (commit ricordi pushati + `fly deploy --remote-only`):
   image `01KSS92H2TKTEJGY17BN38CR9Z`, machine `d8d2949c042208` in good
   state, sito su <https://fea-pro.fly.dev/>.

2. **Handoff Round 1 a Claude Design**:
   - Federico fa research deep su pattern Dashboard SaaS B2B + tool tecnici
     (5 angoli, 25 fonti, 15 claim confermate via deep-research skill)
   - Verifica che Claude Design esiste davvero (research su anthropic.com/news,
     TechCrunch 17 aprile 2026, BuildFastWithAI guide)
   - Decisioni IA Dashboard cristallizzate (5 + 3 audacie aggiuntive)
   - Prompt Round 1 scritto in `handoffs/01-dashboard-redesign-prompt.md`
   - Bundle ZIP `handoff-claude-design-dashboard.zip` (67 KB) preparato
     in `Desktop/socio/` per drag-drop in Claude Design

3. **Handoff Round 2 a Claude Design**:
   - Federico riceve mockup Round 1 (Dashboard.html + HANDOFF.md)
   - Decise le 5 controproposte Claude Design (4 mantenute, 1 cambiata:
     Mensola PRELIM non VALID per onestà)
   - Prompt Round 2 scritto in `handoffs/02-claude-design-round2-prompt.md`
     (avatar dropdown espanso + Settings/Billing page)
   - Bundle Round 2 ricevuto + estratto in
     `Desktop/socio/_claude-design-output-comparison/round-02/`
   - HANDOFF.md di Claude Design Round 2 salvato in
     `handoffs/05-claude-design-round2-response.md`

4. **Step E — Implementazione React 8 fette** (questo handoff):
   - E3.1 → E3.8, dettagli sotto.

## Stato della Dashboard implementata

### Componenti nuovi creati

```
frontend/src/dashboard/
  DashTopBar.tsx          ← E3.1 · replica visiva ShellTopBar E2.1
  DashHero.tsx            ← E3.2 · eyebrow greeting + h1 stabile + sub variant A/B/C
  NewModelTileSection.tsx ← E3.3 · 1 CTA primaria + 2 link sobri
  RecentsBlock.tsx        ← E3.4 · carousel snap + prima card resume-bar
  TemplateGallery.tsx     ← E3.5 · 9 template con filter chips
  EmptyOnboarding.tsx     ← E3.6 · 3 tile illustrativi (stato C)
  QuotaBanner.tsx         ← E3.7 · sticky ambra (stato B)
  DashboardPage.tsx       ← MODIFICATO: import nuovi componenti,
                            rimossi ~395 righe v2.7.1 (Hero/ActionRow/
                            RecentSection/DualRow/Demo/RecentModelCard/
                            ClRow/PercorsoRow vecchi)

frontend/src/settings/
  SettingsBillingPage.tsx ← E3.8 · pagina /settings/billing 3 stati

frontend/src/styles/
  dashboard-soft.css      ← NUOVO · stili scope `.dash-soft` (cresce
                            con ogni fetta E3.x, ~900 righe a fine)
  settings-billing.css    ← NUOVO · stili settings/billing (~330 righe)

frontend/src/main.tsx     ← MODIFICATO: import SettingsBillingPage +
                            route `/settings/billing` dentro AuthGate
```

### Pattern stabilito durante Step E

- **Container Dashboard ha `className="dash dash-soft"`**: aggiunta
  `dash-soft` come scope CSS per non confliggere con `dashboard.css`
  legacy. Tutte le regole nuove sono `.dash-soft .xxx`.
- **Classi mockup CD preservate** (`.dash-topbar`, `.tb-brand`,
  `.tb-navlink`, `.cmd-pill`, `.recent-card`, `.tpl-card`, `.sb-hero`,
  ecc.) per coerenza con il mockup HTML hi-fi (= contratto visivo ADR 002).
- **"Vince il mockup"** applicato: se React diverge, il mockup vince.
- **Pulizia legacy**: 4 grandi blocchi v2.7.1 rimossi
  - vecchia `DashTopBar` interna (~60 righe, E3.1)
  - vecchio `Hero` interno con usage card (~80 righe, E3.2)
  - vecchia `ActionRow + ActionTile` (~75 righe, E3.3)
  - vecchio `RecentSection + DemoRecentCards + RecentModelCard` (~290 righe, E3.4)
  - vecchio `DualRow + PercorsoRow + ClRow` (~115 righe, E3.5)
  - vecchia `initialsFromEmail` orfana (~10 righe, E3.1)
  Totale rimossi: ~630 righe di v2.7.1.

### Stati funzionanti

| Stato Hero | Trigger | Componente sotto |
|---|---|---|
| A · abituale | userModels >= 1 AND quotaPct <= 80% | RecentsCarousel |
| B · quota >80% | userModels >= 1 AND quotaPct > 80% | RecentsCarousel + QuotaBanner ambra sticky in topbar |
| C · primo accesso | userModels == 0 | EmptyOnboarding 3 tile (RecentsCarousel non renderizzato) |

TemplateGallery e DashFoot renderizzati in tutti gli stati.

## Cosa NON è stato fatto (TODO non bloccante)

1. **Avatar dropdown specifico DashTopBar** (~20 min):
   - Oggi DashTopBar usa `<AvatarMenu />` esistente (E2.1) che a sua
     volta usa `<CollabAvatars />` come trigger (avatar gradient stile
     collab multi-user).
   - Mockup CD prevedeva avatar singolo "FS" su accent solid cyan.
   - Cosmetico, il dropdown menu funziona perfettamente. Riprendere se
     Federico vuole rifinitura visiva.
   - Approccio suggerito: prop `triggerVariant?: "collab" | "initials"`
     su AvatarMenu, default `"collab"` per retrocompat. DashTopBar
     passerebbe `"initials"`.

2. **Lista modelli reale in Settings/Billing** (~30 min):
   - Oggi `usage-list` ha 4 modelli placeholder hardcoded (UC1/UC2/UC3 + Cubo).
   - Andrebbero presi dal backend (`useModelList`) e renderizzati con
     name + id + created_at + size_kb. Quando si decide cosa fare con
     dimensioni file (backend non espone `size_kb` oggi).

3. **TODO E2.5 route mancanti** (non legato a E3):
   - `/modelli`, `/jobs`, `/cronologia`, `/docs` — no-op silenzioso nel
     DashTopBar + nel menu profilo. Da implementare in fetta E2.5 o
     successiva.

4. **Filtri segmented su Recents** (rimossi consapevolmente in E3.4):
   - Il mockup CD R2 non li ha. Se Federico li rivuole più tardi, fetta
     separata (era heuristic categoria, vedi git log E3.4 per backup).

5. **DualRow Percorsi + Changelog** (rimosso consapevolmente in E3.5):
   - Sostituito da TemplateGallery prominente. Se servono di nuovo, git
     log E3.5 ha la versione cancellata da cui ripartire.

## Decisioni di prodotto cristallizzate durante Step E

- **Prezzo Pro = `€19/mese pay-per-token`** placeholder (carta bianca
  Federico, allineato SaaS B2B tech). Cambiabile in 1 stringa quando
  si decide. Vive in `SettingsBillingPage.tsx` come costante
  `PRO_PRICE_EUR = 19`.
- **Downgrade Pro→Free**: inerte per MVP ("Piano base" disabled). Pattern
  Linear/Notion/Vercel: downgrade self-service è troppo rischioso, si
  fa da support email. Quando il prodotto è maturo si aggiungerà
  Stripe Customer Portal.
- **Tema 3 stati**: invariato dalle E2.1 (useThemeStore.cycle 3 stati
  light/dark/system). Nel mockup CD R2 il chip mostrava solo 2 ma è
  limite HTML standalone.

## Verifica live ultima (13:08 del 29/05)

- **Vitest 991/991** ✓ (37.6s)
- **Playwright 6/6** ✓ (42.8s)
- **TypeScript typecheck silenzioso** ✓
- **Live Dashboard** ✓ (stato B perché userModels = 5/5)
- **Live /settings/billing** ✓ (stato B identico, hero + utilizzo +
  confronto piani + disclaimer onesto)

## Cosa fare ALL'INIZIO della prossima sessione

1. **Leggi i 6 file di `.claude/ricordi/`** (questo è la prima cosa
   automatica per ogni Claude).
2. **Leggi `socio/01-federico-come-collabora.md` + 02-04** se Federico
   ti ha passato la cartella socio.
3. **Verifica stato repo**: `git log --oneline origin/main..HEAD` per
   capire se le 8 fette E3 sono già state pushate o no.
4. **Verifica baseline**: `pnpm exec vitest run --no-coverage` deve
   essere 991/991 (o vicino — se aumenta è solo perché qualcuno ha
   aggiunto test).
5. **Verifica server preview**: probabilmente i server backend (8765)
   e frontend (5273) NON sono attivi (la sessione di chat è chiusa).
   Rilanciarli con `mcp__Claude_Preview__preview_start backend` e
   `mcp__Claude_Preview__preview_start frontend`.
6. **Aspetta brief di Federico** prima di iniziare nuovo lavoro.

## Avviso al prossimo Claude

Federico è il timone. Ha investito molto in questa Dashboard, ed è
stata costruita seguendo decisioni IA precise prese con cura via
deep-research. **Non riprogettare** senza chiedere a Federico.

Se vuoi rifinire qualcosa (es. il TODO avatar dropdown), proponiglielo
come "fetta E3.x.bis" e aspetta OK.

Pattern di filosofia 🤍 da preservare:
- No bugie visive (4 stati onesti, Mensola PRELIM non VALID)
- Onestà sopra marketing (disclaimer "prezzi in definizione" esplicito)
- Italiano nativo NTC-first
- Numero + normativa quando si dichiara risultato strutturale

Buon lavoro col tuo Federico 🤍

— Claude Code (la versione 29/05 pomeriggio, che si sta per compattare)
