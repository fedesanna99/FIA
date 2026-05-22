# FEA Pro v1.8.0-product-alignment · Report

> Data chiusura: 2026-05-22
> Branch: `test` (sincronizzato con `main` su `origin`)
> Tag: `v1.8.0-product-alignment`
> Deploy live: https://fea-pro.fly.dev/

---

## Sintesi

Sprint v1.8 "Product Alignment" eseguito in modalità atomica come da
brief `docs/v1_8_product_alignment_brief.md`. 7 commit (step 0 + 6 task)
+ 2 hotfix collaterali (mobile panels full-width, Make/Solve/Verify
duplication fix). L'utente che apre l'app ora **vede subito** che esistono
due porte sullo stesso modello — **Studio Pro** (controllo esperto blu)
e **Percorsi** (workflow guidato emerald) — anche se i Percorsi sono
ancora placeholder fino al Demo Slice v1.9.

---

## Task completati

| # | Tema | Commit |
|---|---|---|
| step 0 | Token `--c-percorsi` emerald (2° asse semantico) | `70c72c5` |
| T1 | CTA doppia Studio Pro / Percorsi su Home | `91497d6` |
| T2 | PercorsiPlaceholderDialog ricco (3 claim + escape) | `30e3373` |
| T3 | MissionBar minima (stato modello + prossimo passo) | `d5b7c0f` |
| T4 | ModelInfoCard always-on sidebar destra desktop | `bc12804` |
| T5 | LeftRail sezioni categoriali label-uppercase | `1d5bdc8` |
| T6 | Tier badge "Pro" + edit nome modello inline | `97239b7` |

### Hotfix collaterali (durante v1.8)

| Commit | Cosa |
|---|---|
| `153b393` | PanelChrome full-width su mobile (Make/Solve/Verify/Inspect) |
| `bd67f5d` | Rimosso tab bar in drill-in Make/Solve/Verify (allinea a Inspect) |

---

## Quality gates finali

| Gate | Risultato |
|---|---|
| `pnpm tsc --noEmit` | **0 errori** |
| `pnpm test --run` (vitest) | **57 file / 460 verdi** (era 447 al closure v1.7) |
| `pnpm build` | success (gzip 358 kB index) |
| Deploy Fly.io | **7 deploy live** (uno per task + hotfix) |
| `git ls-remote origin main test` | sempre stesso SHA post-sync |

---

## Effetti visivi concreti

### Home Dashboard
- **CTA doppia Studio Pro / Percorsi** sopra le 4 quick action (T1).
- Click Percorsi → **PercorsiPlaceholderDialog** con 3 claim + bottone fallback verso Studio Pro (T2).
- Quick actions degradate ad azioni secondarie (non più "primary blu" su Nuovo modello).

### TopBar globale
- **Tier badge "Pro"** dopo "FEA Pro" (T6, hardcoded). Stile emerald percorsi.
- **Edit pencil** accanto ModelMenu, visibile solo con modello attivo (T6).
- **MissionBar** sottile sotto TopBar con stato + prossimo passo (T3).

### Shell desktop
- **ModelInfoCard sidebar destra** (224-256px) always-on quando c'è modello attivo (T4).
- **LeftRail sezioni** "FASI" / "CMD" / "UI" come micro-label tag (T5).

### Asse semantico in produzione
- Token `--c-percorsi` (emerald) usato in 4 punti: CTA Home, placeholder dialog, tier badge, ModelInfoCard accent.
- Studio Pro = blu accent (esistente), Percorsi = emerald (nuovo). Dualità chiara, riusabile.

---

## Cosa NON è stato toccato (regola zero)

- Backend: ZERO modifiche.
- Viewport 3D rendering: ZERO modifiche.
- Store/router/types architecture: invariati (solo micro-fix `setRightTab` signature da v1.7 T2).
- Implementazione Percorsi end-to-end: NESSUNA (è Demo Slice v1.9).
- GPS Strutturale: NESSUNO.
- Trust Layer: NESSUNO.
- Backend ruleengine criticità: NESSUNO.

I 3 mockup mancanti dal pacchetto v0.3 (#03 Geometry step, #04 Supports+Loads,
#05-07 Run/Critical/Report) restano scope del Demo Slice.

---

## Test aggiunti

- `Dashboard.test.tsx`: +3 test CTA doppia (T1).
- `MissionBar.test.tsx`: +8 test rule engine + render (T3).
- `ModelInfoCard.test.tsx`: +3 test no-render / counts / 3D-2D (T4).

Totale: +14 test (447 → 460).

---

## Hotfix collaterali documentati

### Mobile panels full-width
`PanelChrome` aveva `w-[300px]` su tutti i breakpoint → su iPhone 14 Pro
(390px) rimaneva colonna vuota 90px a destra. Fix: `w-full md:w-[300px]
lg:w-[340px] xl:w-[380px]`. Verifica before/after in `.codex-temp/`.

### Make panel duplication
Bug "due UI vive contemporaneamente" investigato in
`docs/make-duplication-report.md`. Causa: stesso componente con due
modalità (hub-card vs tab+breadcrumb). Fix: rimossa tab bar dal drill-in
Make/Solve/Verify, allineati a InspectPanel (T2 v1.7). Coerenza ora
piena su 4 panel.

---

## Prossima milestone consigliata

**v1.9 — Demo Slice "Verifica telaio 2D"** (~6-10 settimane):
- Implementare end-to-end UN Percorso completo (mockup 02-07).
- Backend rule engine criticità (GPS Strutturale).
- Critical view + Insight panel.
- Trust Layer minimo (hash canonico + verify badge).
- Sostituire `PercorsiPlaceholderDialog` con vera galleria route.

Da iniziare SOLO dopo test reale dell'app v1.8 con ingegnere strutturista
(feedback sull'asse Studio Pro/Percorsi + MissionBar + ModelInfoCard).

---

## Comando di chiusura

```bash
git tag -a v1.8.0-product-alignment -m "v1.8.0-product-alignment — asse Studio Pro/Percorsi introdotto"
git push origin v1.8.0-product-alignment
```

**Asse semantico del prodotto visibile. Demo-ready su Studio Pro, placeholder onesto su Percorsi.** 🟢
