# Confronto · Mockup 01 — Home / no model

**Mockup target**: `docs/mockups-reference/01_home_no_model_studio_pro_vs_percorsi.png`
**Screenshot attuali**: `desktop-01-dashboard-empty.png` + tablet + mobile

---

## Layout e struttura

### Cosa coincide
- TopBar con logo `FEA Pro`, search bar centrale, area destra con AI button + crediti + avatar.
- Empty state senza modello attivo (LeftRail Make/Solve/Verify disabled).
- Sezione "Modelli recenti" sotto le quick actions.
- StatusBar bassa con indicatore connessione.

### Cosa diverge nella struttura
- **Hero centrale**: target ha `Start your analysis` + sottotitolo descrittivo + **due grandi CTA Studio Pro / Percorsi** come pannello hero dominante. Attuale ha solo "Buongiorno" + counter "0 modelli · 0 job in corso".
- **Sidebar destra persistente**: target ha colonna fissa con `Credits 47/100 · Free billing`, `Get started` bullet list (Workflow guidato · Suggerimenti intelligenti · Tieni tutto sotto controllo), e card promo `AI Copilot · BETA`. Attuale ha solo RightRail sottile con icone (View/Inspect/Tools disabled).
- **Quick actions**: target le ha come **4 card minori sotto le CTA principali** (New model · Templates · Import BIM/IFC · Examples). Attuale le ha come azione primaria al centro.
- **Recent projects**: target le mostra come 4 thumbnail card orizzontali con preview viewport + nome + metadata. Attuale solo placeholder testo `Nessun modello ancora`.
- **LeftRail**: target ha sezioni a categorie con label uppercase (`WORKSPACES / MAKE / ANALYSIS SETUP / RESULTS / TEMPLATES / EXAMPLES / DOCUMENTATION / RELEASE NOTES`). Attuale ha solo 3-4 icone (Make/Solve/Verify/Search/Compass) senza sezioni.
- **Tips card** in basso a destra (target): box dedicato con tip rotante. Attuale: nessun equivalente.
- **Footer status**: target mostra "All systems operational" verde. Attuale: "Offline" rosso (corretto per stato backend offline catturato).

### Cosa è completamente mancante (attuale)
- CTA doppia Studio Pro vs Percorsi (l'**asse semantico principale** del prodotto futuro).
- Card promo AI Copilot in sidebar.
- Tips card.
- Recent projects come thumbnail card.
- LeftRail sezioni a categorie label-uppercase.

---

## Tipografia
- Heading hero target: ~36px SemiBold "Start your analysis" / attuale: ~24px Bold "Buongiorno"
- Subtitle target presente, attuale solo counter
- LeftRail labels: target uppercase tracking-wider 11px / attuale: solo icone con tooltip

## Colore
- Target: dualità accent **Studio Pro blue `#1E40AF`** + **Percorsi green `#10B981`**.
- Attuale: solo blu accent `#185FA5` (Studio Pro blu più chiaro), nessun verde Percorsi.

## Densità informativa
| | Target | Attuale | Conclusione |
|---|---|---|---|
| Card visibili in viewport above-fold | ~12 | ~5 | Attuale **molto più sparso** |
| Sezioni distinte | 5 (hero/quick/sidebar/recent/tips) | 3 (hero/quick/recent) | Mancano 2 sezioni |
| Stati visivi | 4 famiglie (default/recommended/active/soon) | 2 (default/disabled) | Mancano stati intermedi |

## Mobile/tablet
- Target NON ha screenshot dedicato mobile per home (i mockup mobile sono `02_mockups_old_reference/03_old_reference_mobile_tablet.png`, riferimento storico).
- Attuale (`mobile-01`): tabbar bottom 5-tab visibile, hero compatto, quick actions in 2 colonne. Sostanzialmente OK come responsive, ma stesse mancanze strutturali (no Studio Pro/Percorsi).

---

## Severity gap

| # | Gap | Severity |
|---|---|---|
| 1 | Manca CTA doppia Studio Pro / Percorsi (asse semantico prodotto) | **P0** |
| 2 | Manca sidebar destra densa (Credits card + Get started + AI Copilot promo) | **P0** |
| 3 | LeftRail senza sezioni categoriali uppercase | **P1** |
| 4 | Recent projects come testo invece di thumbnail card | **P1** |
| 5 | Manca Tips card | **P2** |
| 6 | Hero senza titolo descrittivo+subtitle | **P2** |
| 7 | Footer "Offline" rosso al boot vs "All systems operational" verde | **P2** (è correttezza, non bug) |
| 8 | Accent Percorsi green mancante come token | **P0** (vedi tokens audit) |

## Stima sforzo per allineare (per allineamento futuro, non in audit)

- Layout: M · 16-24 h (CTA doppia + sidebar destra)
- Tipografia: S · 4 h (font-size hero + LeftRail labels)
- Colore: M · 8 h (token Percorsi green + applicazione)
- Densità: M · 12-16 h (Tips, Recent thumbnail)
- Nuovi componenti: `StudioProCard`, `PercorsiCard`, `AICopilotPromoCard`, `TipsCard`, `RecentModelCard` (5 nuovi)
- **Totale stimato**: 40-60 h (~1-1.5 settimane)

## Raccomandazione

**Refactor visivo orientato a Product Alignment Sprint**: la struttura
attuale è una dashboard "neutra" ben fatta ma non riflette l'asse Studio
Pro/Percorsi che è il differenziatore del prodotto futuro. Da fare nel
prossimo sprint dedicato, non ora.
