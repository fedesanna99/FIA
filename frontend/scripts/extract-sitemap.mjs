/** Estrae lista 23 schermate da Sitemap.html via DOM scraping. */
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.goto("http://localhost:8765/fea-pro-design-system/project/Sitemap.html", {
  waitUntil: "networkidle",
  timeout: 30_000,
});

const data = await page.evaluate(() => {
  const out = { sections: [], cards: [] };
  // Strategia: ogni "section" sembra avere un header h2 o title con numero "00 Foundation"
  // Le card sono divs con link al mockup file
  const sectionHeads = document.querySelectorAll("h2, .section-title, [class*='section']");
  // Provo a leggere tutto links a *.html dentro la pagina (sono i mockup)
  const links = Array.from(document.querySelectorAll("a[href*='.html'], a[href*='ui_kits']"));
  for (const a of links) {
    out.cards.push({
      label: (a.textContent || "").trim().slice(0, 120),
      href: a.getAttribute("href"),
      rect: a.getBoundingClientRect ? `${Math.round(a.getBoundingClientRect().top)}` : "",
    });
  }
  // Tutti i node con classe "section" o con titolo numerico (es. "00 Foundation")
  const allText = document.body.innerText.split("\n").map(s => s.trim()).filter(Boolean);
  out.sections = allText.filter(s => /^\d{2}\s+/.test(s));
  // Conta card status (DONE/WIP)
  const statusEls = document.querySelectorAll("[class*='status'], [class*='badge'], [class*='tag']");
  out.statuses = Array.from(statusEls).map(e => (e.textContent || "").trim()).filter(Boolean).slice(0, 50);
  // Titles di tutte le "card" candidate (div con class che include 'card' o 'item')
  const cardEls = document.querySelectorAll("[class*='card'], [class*='item'], [class*='tile']");
  out.cardLabels = Array.from(cardEls).map(c => {
    const t = (c.querySelector("h3, h4, .title, [class*='title']") || {}).textContent;
    return t ? t.trim() : null;
  }).filter(Boolean).slice(0, 50);
  return out;
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
