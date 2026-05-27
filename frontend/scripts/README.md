# Frontend tooling scripts

Throwaway-tolerant tooling per il design system audit (v2.7.0+).

## visual-audit.mjs

Genera un report HTML side-by-side **live vs mockup** per tutte le ~23 schermate del pack
handoff Claude Design v0.3. Output statico navigabile: `.../visual-audit/index.html`.

### Setup prereq (una volta)

```bash
# 1. Estrai il pack handoff in una temp dir (i mockup HTML linkano
#    `../../src/tokens.css` con path relativo, va preservata la struttura)
cd .claude && \
  mkdir -p tmp-mockup-full && \
  unzip ../docs/design_handoff/FEA_Pro_Design_System-handoff_aggiornato.zip -d tmp-mockup-full

# 2. Avvia un mini server HTTP per servire i mockup
cd .claude/tmp-mockup-full && \
  python -m http.server 8765 --bind 127.0.0.1 &

# 3. (opzionale, per route auth-protected) Estrai storage state dal tuo
#    browser loggato e salvalo in .claude/tmp-screenshots/storage-state.json
#    Schema: { cookies: [], origins: [{ origin, localStorage: [{ name, value }] }] }
#    Il file è gitignored.
```

### Run

```bash
cd frontend
node scripts/visual-audit.mjs
# Output:
#   .claude/tmp-screenshots/visual-audit/*.png    (~50 screenshot)
#   .claude/tmp-screenshots/visual-audit/index.html
```

Apri l'`index.html` in browser per navigare i side-by-side.

### Coverage attesa (post v2.7.0)

| Pair | Status |
|---|---|
| Auth × 4 (login/signup/forgot/verify) | ✓ live + mockup |
| Dashboard / | ✓ live + mockup (gap visibile · brief v2.7.1 atteso) |
| 404 | ✓ live + mockup |
| Mobile auth/dashboard (375px) | ✓ live + mockup |
| Studio × 5 / Dialogs × 4 / Settings / States 3 | ⚠ mockup-only (Phase 4.2-6 attesi) |

### Quando ri-eseguire

Dopo ogni brief Phase 4.2-6.3 (es. `v2.7.1-dashboard-mockup-driven`), ri-esegui
per verificare il match live↔mockup. Sostituisce il "smoke visivo manuale 46/46"
che storicamente veniva saltato.

---

## extract-sitemap.mjs

Estrae lista delle 23 schermate dal `Sitemap.html` del pack (label + href mockup +
status DONE). Output JSON su stdout. Utile per generare BRIEF Phase 4-6 successivi
o per estendere `visual-audit.mjs` con nuovi pair.

```bash
cd frontend
node scripts/extract-sitemap.mjs > /tmp/sitemap-cards.json
```

Richiede mockup server attivo su `:8765` (vedi prereq sopra).
