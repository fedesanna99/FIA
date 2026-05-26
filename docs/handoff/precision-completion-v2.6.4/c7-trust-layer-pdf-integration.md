# c7 · TrustLayerBadge — Integrazione PDF flow

> Closes Tier 4 carry-over **TrustLayerBadge watermark (PDF preview)**.
> Stato pre-v2.6.4: 40% (variant `watermark` esiste, ma non è wired al
> `ReportExportDialog`). Target post-v2.6.4: 100%.

---

## 1 · Architettura

**Decisione**: il watermark è **client-only**. Nessuna modifica al backend
`pdf_generator.py` (reportlab) — il PDF generato server-side resta pulito.

**Perché**: il watermark "preliminary" è un **avviso UI/UX di stato**, non
un marker legale. L'utente vede il watermark mentre **valuta** il report
nella preview; quando lo esporta è perché ha deciso che è pronto — il file
finale deve essere consegnabile a Sportello Unico Edilizia senza vergogna
visiva.

```
┌──────────────────────────────────────────────────┐
│  ReportExportDialog                              │
│  ┌────────────────────────────────────────────┐  │
│  │  [TrustLayerBadge variant="banner"]        │  │  ← z-10
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │     <iframe src="blob:…/preview.pdf"/>     │  │  ← z-0
│  │                                            │  │
│  │     ╲                                      │  │
│  │      ╲  PRELIMINARY  (SVG diagonal)        │  │  ← z-5 overlay
│  │       ╲                                    │  │     pointer-events: none
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│  [Annulla]                          [Esporta PDF] │  ← z-10
└──────────────────────────────────────────────────┘
```

Tre layer ordinati:

- **z-0**: `<iframe>` con `blob:` URL della preview reportlab.
- **z-5**: `<div class="trust-watermark">` overlay SVG diagonale, `position: absolute`, `pointer-events: none`.
- **z-10**: chrome del dialog (`banner` in top, footer `[Annulla] [Esporta]`).

---

## 2 · Implementazione React

### 2.1 · `ReportPreview.tsx` (wrapper nuovo)

```tsx
// src/components/report/ReportPreview.tsx
import { TrustLayerBadge } from "@/components/ui/TrustLayerBadge";

type Props = {
  blobUrl: string;
  preliminary: boolean; // true se l'analisi non è stata validata
};

export function ReportPreview({ blobUrl, preliminary }: Props) {
  return (
    <div className="report-preview">
      <iframe
        src={blobUrl}
        title="Anteprima report"
        className="report-preview__frame"
      />
      {preliminary && (
        <TrustLayerBadge
          variant="watermark"
          label="PRELIMINARY"
          className="report-preview__watermark"
        />
      )}
    </div>
  );
}
```

### 2.2 · `ReportExportDialog.tsx` (modifica)

```tsx
// src/components/report/ReportExportDialog.tsx — patch
import { ReportPreview } from "./ReportPreview";

// ...dentro il render del dialog:
<DialogHeader>
  <TrustLayerBadge
    variant="banner"
    label="Anteprima del report"
    tone={preliminary ? "warn" : "info"}
  />
</DialogHeader>

<DialogBody className="report-export-dialog__body">
  <ReportPreview blobUrl={previewBlob} preliminary={preliminary} />
</DialogBody>

<DialogFooter>
  <Button variant="ghost" onClick={onClose}>Annulla</Button>
  <Button variant="primary" onClick={onExport}>Esporta PDF</Button>
</DialogFooter>
```

### 2.3 · CSS (`report-preview.css` o token-scoped)

```css
.report-preview {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg-viewport);
  border: 1px solid var(--border);
}

.report-preview__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  z-index: 0;
}

.report-preview__watermark {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;   /* CRITICO — non bloccare scroll iframe */
  display: grid;
  place-items: center;
}

/* Print: leggermente più visibile, per dichiarare lo stato nel printout */
@media print {
  .report-preview__watermark {
    opacity: 0.10;
  }
}
```

Z-index sono già consistenti con la scala globale (`viewport 0`, `panel 10`,
`dialog 40`). Il watermark `z-5` resta sotto il `DialogHeader/Footer`
perché il footer è dentro al `Dialog` (z-40 a livello root) — il `z-5` è
locale al `.report-preview` stacking context.

---

## 3 · Variant del badge (recap)

| Variant | Dove | Trigger | Tone |
|---|---|---|---|
| `inline` | Topbar chip (sempre presente) | analisi flagged preliminary | `warn` / `success` |
| `banner` | Header `ReportExportDialog` | apertura dialog | matcha lo stato analisi |
| `watermark` | Sopra `<iframe>` PDF preview | `preliminary === true` | `warn` (fissato) |

Il props `variant="watermark"` deve già esistere in `TrustLayerBadge.tsx`
(handoff originale, blocco SVG diagonale 220×220, `opacity: 0.06`, `fill:
var(--warn)`). Se non c'è ancora, riusa lo snippet di `e1-e2-animations.md`
§ "Watermark layer".

---

## 4 · Print CSS

**Decisione**: il watermark **deve apparire** se l'utente stampa la pagina
dialog dal browser (Cmd+P). È UI signal, non chrome — quindi va preservato.

```css
@media print {
  .report-preview__watermark { opacity: 0.10; }   /* da 0.06 → 0.10 */

  /* nascondi il chrome del dialog ma non l'iframe + watermark */
  .dialog-header,
  .dialog-footer,
  [data-no-print] {
    display: none !important;
  }
}
```

Lo `0.10` print-only compensa la differente resa di toner/inkjet vs schermo
(`0.06` su schermo è leggibile, su carta sparisce).

---

## 5 · Z-index reference

| Layer | z-index | Note |
|---|---|---|
| iframe PDF preview | `0` | dentro `.report-preview` |
| watermark overlay | `5` | dentro `.report-preview`, pointer-events none |
| dialog header / footer | locale `10` | parent dialog è z-40 globale |
| dialog backdrop | `40` (globale) | `--z-dialog` da tokens |

---

## 6 · Pointer events

**Sempre `pointer-events: none`** sul watermark.

Senza questa regola:
- L'utente non può scrollare il PDF perché il watermark intercetta il drag.
- Le selezioni di testo dell'iframe vengono "mangiate" dal layer.
- Cmd+F del browser nell'iframe può finire fuori focus.

Test rapido: aprire la preview, fare scroll del PDF con la rotella dentro
il watermark. Deve scrollare l'iframe sottostante.

---

## 7 · Caveat (cosa NON fare)

- **NON portare il watermark nel PDF server-side** finché il design del
  badge non viene rivisto per print-quality (vector geometry, font
  embedding, sizing per A4/Letter). Il watermark attuale è SVG ottimizzato
  per schermo @ 1× DPR — su un PDF 300 DPI rischia di apparire pixellato
  o di stamparsi come blob nero su stampanti monocromatiche.
- **NON aggiungere watermark anche al PDF "quick export"** (export diretto
  senza dialog). Il quick export è scelta deliberata: l'utente sa già cosa
  vuole. Il watermark è feedback **prima** della decisione, non dopo.
- **NON usare `backdrop-filter` o `mix-blend-mode`** sul watermark — su
  Safari ≤ 16 il render dell'iframe + filter è instabile (flicker su
  scroll). `opacity` puro è sufficiente.
- **NON inserire testo dinamico** nel watermark (es. data, username). Il
  watermark è **un solo stato** (`PRELIMINARY`) — se in futuro servono
  più stati (`DRAFT`, `INTERNAL ONLY`, `EXPIRED`), torna a questo doc e
  aggiungi una variant table prima di toccarlo.

---

## 8 · Acceptance checklist (per QA)

- [ ] Aprire `ReportExportDialog` su un'analisi flagged preliminary → vedo `banner` warn in alto + `watermark` "PRELIMINARY" diagonale sopra l'iframe.
- [ ] Scroll della preview con rotella → l'iframe scrolla, il watermark resta fisso.
- [ ] Click dentro il watermark → click passa all'iframe (no event swallow).
- [ ] Cmd+P sulla preview → printout include watermark @ opacity 0.10.
- [ ] Click "Esporta PDF" → file scaricato dal backend è **senza** watermark (verificare con un viewer esterno, non solo il browser).
- [ ] Analisi NON preliminary → niente banner warn, niente watermark.
- [ ] Dark mode → watermark resta leggibile (il `--warn` dark è `#FBBF24`, l'opacity 0.06 lo mantiene visibile su `--bg-viewport` dark).

---

**Implementazione stimata Claude Code**: ~45 min (wrapper + 2 patch + CSS + QA).
