# Handoff 03 — Round 2 a Claude Design · chiusura cerchio Dashboard

> Generato 29/05/2026 dopo aver ricevuto il primo mockup Dashboard
> (Handoff 02 da Claude Design). Round 2 focalizzato: 2 pezzi soli
> per alta qualità.

---

## 📋 PROMPT (copia-incolla integrale in chat Claude Design)

Ciao Claude Design 🤍

Sono Claude Code, di nuovo. Il tuo Handoff 02 sulla Dashboard è
stato **eccellente** — Federico e io abbiamo deciso le 5
controproposte che hai lasciato nel `HANDOFF.md` sezione 6. Questo
è Round 2, focalizzato su 2 pezzi soli per alta qualità.

## 1 · Conferma controproposte Round 1

Decisioni finali su tutto quello che hai chiesto:

| # | La tua controproposta | Decisione |
|---|---|---|
| 1 | Greeting in eyebrow mono sopra h1 | ✅ **Mantieni così** — più sobrio, h1 invariante dà ritmo |
| 2 | `action-aside` come card 2 righe vs link puri | ✅ **Mantieni card** — più affordance per nuovi utenti, sobrio quanto basta |
| 3 | Trust `VALID` (verde) sulla Mensola | ⚠️ **Cambia a `PRELIM`** — la Mensola demo non è realmente validata. Mettere VALID violerebbe "no bugie visive" (CULTURE.md §1) e contraddice ADR 001 NAFEMS-honest. Trust VALID compare SOLO su modelli realmente validati contro benchmark NAFEMS chiusi (LE2/Cantilever/Euler). Per la Mensola va `DRAFT` (utente la sta lavorando) o `PRELIM` (default). |
| 4 | Recents come carosello orizzontale snap-scroll | ✅ **Mantieni** — scopribile, scalabile a >4 modelli |
| 5 | Menu avatar espanso | 🆕 **Sì espandi**, vedi pezzo 1 sotto |

## 2 · PEZZO 1 — DashTopBar avatar dropdown espanso

La voce `.tb-avatar` in DashTopBar deve aprire un dropdown menu Radix-style.

### Voci richieste (replica fedele di `AvatarMenu.tsx` di ShellTopBar E2.1)

Ordine esatto, con divider tra gruppi:

```
┌────────────────────────────────┐
│ CONNESSO COME                  │  ← header eyebrow mono uppercase
│ federico@feapro-qa.com         │  ← email
├────────────────────────────────┤
│ 👁  Modalità focus     ⇧ Space │  ← icone lucide stroke 1.8 16px
│ 👤  Account & quota            │
│ 📍  Loads location             │
│ ☀  Tema              [LIGHT]  │  ← chip mono uppercase con stato corrente
│ 🧭  Percorsi guidati           │
├────────────────────────────────┤
│ 📄  Esporta JSON               │
│ 📊  Esporta CSV                │
│ 📑  Esporta report PDF         │
├────────────────────────────────┤
│ ⚙   Impostazioni              │
│ ❓  Aiuto e shortcut           │
├────────────────────────────────┤
│ 🕓  Cronologia                 │  ← gruppo nuovo IA prototipo v3 (E2.1)
│ 📐  Template                   │
│ 📖  Docs                       │
├────────────────────────────────┤
│ 🔓  Logout                     │  ← rosso `--danger`
└────────────────────────────────┘
```

### Stile

- **Container**: `bg-bg-elevated`, `border-border-light`, `shadow-dialog`,
  radius `--r-md` (8px), min-width 260px, `animate-slide-down` su open
- **Header** (`CONNESSO COME / email`): bg leggermente diverso (`bg-bg-panel`),
  eyebrow mono 10px tracking-wide-1, email font-semibold text-sm
- **Item**: hover `bg-bg-hover`, padding 12px verticale + 12px orizzontale,
  font-size sm (13px), icona lucide 14px ink-3 + label ink
- **Kbd chip** (per "⇧ Space"): mono font 10px uppercase tracking-wide-1,
  bg-bg-hover, border-border-light, padding 1px 4px
- **Theme chip** (LIGHT/DARK/SYSTEM): stesso stile kbd ma sulla destra
- **Logout**: testo `--danger`, hover `bg-bg-hover` (NO bg rosso)

### Deliverable

HTML standalone in `dropdown-avatar.html` (o integrato in `Dashboard.html`
aggiornato con classe `.is-menu-open` su `.tb-avatar` mostrato come stato).

## 3 · PEZZO 2 — Pagina Settings/Billing

Pagina full che il banner sticky quota della Dashboard linka tramite il
bottone "Scopri Pro" (`/settings/billing`).

### Topbar

**DashTopBar** (stessa di Dashboard, non ShellTopBar) — è una pagina
app-level, non workspace.

### Contenuto

**Hero sobrio**:
- eyebrow mono `PIANO` (uppercase mono 11px tracking-wide-1)
- h1 `Piano FREE` (Plus Jakarta 30-44px) — diventa `Piano Pro` se utente attivo
- sub 1 riga: descrizione breve del piano corrente

**Card "Utilizzo corrente"** (`.usage-card`):
- Progress bar visiva `▓▓▓░░ 2/5 progetti` (mono numerico tabular)
- Numeri grandi e leggibili
- Lista breakdown 2-5 modelli: nome + creato + size MB
  ```
  · Trave bi-appoggiata 2D   creato 24/05   12 KB
  · Cubo H8 test             creato 26/05   45 KB
  ```
- CTA "Scopri Pro" come bottone primary cyan (solo se Free)

**Card "Confronto piani"** (`.plans-card`):
- 2 colonne side-by-side: **Free** vs **Pro**
- Per ogni piano:
  - Nome + prezzo (es. "Free · €0/mese" vs "Pro · €X/mese" — prezzo TBD,
    metti `€XX/mese` come placeholder)
  - Lista feature inclusi (icona ✓ verde per included, — grigio per non incl.)
  - Esempi feature da listare:
    - Free: 5 progetti, calcolo statico, EC3 verifica base
    - Pro: progetti illimitati, AI suggest, NAFEMS reference suite,
      audit log, support priority
- CTA "Passa a Pro" / "Già attivo" (mono uppercase)

**Footer**:
- Disclaimer onesto: *"Prezzi e feature in definizione. Pricing finale
  da confermare con il team. Per ora il piano Free copre il 90% dei
  flussi di sviluppo e prototipazione."*
- Link a `/preliminary` per spiegazione validazione

### 3 stati richiesti

| Stato | Cosa cambia |
|---|---|
| **A** · Free utente standard (quota OK, es. 2/5) | layout base, niente banner |
| **B** · Free quota >80% (es. 4/5) | + banner sticky ambra in alto (stesso `.quota-banner` della Dashboard) + h1 sub variante "Stai per raggiungere il limite" |
| **C** · Pro attivo | h1 "Piano Pro", card utilizzo `∞ progetti`, niente CTA upgrade, "Gestisci abbonamento" link |

### Stile tokens

Stessi di Round 1 — Soft v2.1, cyan singular, mono numerici,
Plus Jakarta hero, hairline border, shadow soft.
Sharp opt-in via `data-radius="sharp"` su `<html>`.

## 4 · Filosofia 🤍 onesta (invariata)

- **No bugie**: niente "Upgrade now!!" aggressivo, sì "Scopri Pro"
- **Pricing TBD**: disclaimer onesto sui prezzi (è la verità — sono ancora
  in discussione)
- **Italian-first**: tutta UI in italiano nativo
- **NTC prima classe**: se cit. un esempio, usa terminologia NTC (es. "Verifica EC3
  resistenza" non solo "Stress check")

## 5 · Deliverable Round 2

Aspettativa:
- `dropdown-avatar.html` (o `Dashboard.html` aggiornato con stato menu aperto)
- `Settings-Billing.html` con i 3 stati A/B/C togglabili (`body[data-state="A/B/C"]`
  come hai già fatto in Dashboard.html)
- `styles/settings-billing.css` (su tokens.css esistente)
- HANDOFF.md aggiornato → "Handoff 04" che chiude Round 2

## 6 · Cosa NON ti chiedo (per ora)

- Pagine `/modelli`, `/jobs`, `/cronologia`, `/docs` — vivranno in
  **Round 3** quando arriveremo a fetta E2.5 del workspace-fasi. Per
  ora le 4 icone topbar (Home/Modelli/Jobs/avatar) cliccano ma non
  navigano dappertutto. Non urgente.
- Loading skeletons, error states (backend down) — Round 4 eventuale.
- Rifare ShellTopBar workspace — è già implementata in E2.1.

## 7 · Canale Q&A

Se hai domande/dubbi → li scrivi in `HANDOFF.md` sezione "Note /
controproposte" → Federico me li rilancia in chat Claude Code →
ti rispondo entro 1-2 ore.

Token economy: meglio chiedere chiarimenti che produrre mockup larghi
che poi vanno rifatti. Sei autorizzato a dire "ho un dubbio prima di
partire, mi chiarisci X?".

Grazie Claude Design — il primo round è stato un capolavoro, in attesa
del secondo 🤍🎨

— Claude Code (per Federico Sanna)

---

# 📎 NOTA OPERATIVA PER FEDERICO

Per il Round 2 con Claude Design:

1. **Apri la stessa chat** dove avete fatto Round 1 (Claude Design mantiene
   il contesto del bundle precedente). Se non riesci a riaprire, **nuovo
   chat nello stesso Design System** "FEA Pro Soft v2.1" che hai pubblicato.
2. **Allegati extra** se chat nuova:
   - Il bundle `fea-pro-dashboard-redesign-handoff.zip` di Round 1
   - Il file `AvatarMenu.tsx` da `frontend/src/components/shell/topbar/`
     (così vede le voci esatte che ho implementato in E2.1)
3. **Copia-incolla questo prompt** dall'inizio (`Ciao Claude Design`) alla
   firma (`— Claude Code (per Federico Sanna)`)
4. Aspetta il nuovo bundle, scegli **sempre la versione "-handoff"** (come
   abbiamo deciso oggi)
5. Mi passi il bundle → io implemento Step E

Niente fretta. Qualità sopra velocità. 🤍
