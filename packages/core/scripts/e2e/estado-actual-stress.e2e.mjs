#!/usr/bin/env node
/* global document, window, getComputedStyle */
/**
 * E2E stress: worst-case input into every Estado actual field and list, in the
 * real Electron app on a throwaway profile. Synthetic DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - odd text (1 kB, emoji, NFD accents, RTL/zero-width, HTML, SQL-ish,
 *     Δ ≥ ≤ µ →) throws a page error in a med list, dieta, an I/O source name
 *     or a turn-event detail
 *   - HTML typed into a field runs (window.__xss) or renders as a real tag
 *   - odd text is dropped, cut, or mangled on save (µ → Greek Μ turns µg into
 *     "MG" — a 1000× dose error in the note)
 *   - odd text or volume makes a row overlap its neighbour, or makes the panel
 *     or page scroll sideways at 1440×902
 *   - a med block leaves its column in the multi-column med grid, or
 *     "+ Receta"/"+ Manual" on hover leave their column
 *   - an NM antidiabetic with odd text does not land in "Antidiabéticos"
 *   - number junk ('<0.01', '1,234.5', '', '-', '1e5', '∞') in vitals,
 *     glucometrías, turn volumes or evacuaciones throws, or prints
 *     NaN/undefined/Infinity in the snapshot or Historial
 *   - a junk registro is neither saved nor refused (form hangs)
 *   - volume (26 meds in one category, 52 registros, 32 events in one turn,
 *     a 5 kB dieta) throws, overflows sideways, or makes Copiar slow
 *   - "Copiar" / "Enviar a nota" drop or mangle the odd characters, or put
 *     raw HTML into the clipboard HTML
 *   - odd text or volume does not survive a real app restart
 *   - any page error
 *
 * Artifact: e2e-artifacts/estado-actual-stress/<run-id>/ — report.json,
 * report.html (checks + screenshots), one screenshot per step.
 *
 *   node scripts/e2e/estado-actual-stress.e2e.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRun, onboardLocalOnly, openPatient, pasteAndSave, closeToasts, until, dismissLearnHub } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const d = new Date();
const TODAY = (h) => `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${h}:05AM`;
const bh = (hgb) => 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + `HGB\t\tA\t${hgb}\tg/dL\t12.20 - 18.10\n`;

const ALFA = { exp: '7300001-1', name: 'DEMO ESTRES ALFA', room: '801' };
const BETA = { exp: '7300002-2', name: 'DEMO ESTRES BETA', room: '802' };

const INPUTS = [
  ['long 1 kB', 'DEMO ' + 'LARGUISIMO '.repeat(90)],
  ['emoji', 'DEMO 😀 🩺'],
  ['NFD accents', 'JOSÉ PEÑA'.normalize('NFD')],
  ['RTL + zero-width', 'DEMO ‮OCIXEM ​'],
  ['html', '<img src=x onerror="window.__xss=1"><b>X</b>'],
  ['sql', `O'BRIEN "EL"; DROP TABLE patients;--`],
  ['symbols', 'Δ ≥ ≤ µ →'],
].map(([label, text]) => ({ label, text }));
const NUM_JUNK = ['<0.01', '1,234.5', '', '-', '1e5', '∞', '12'];
const MED_CATS = ['antihta', 'abx', 'diureticos', 'antitromboticos', 'analgesia', 'nm', 'vasop'];
const NM_ANTIDIABETIC = 'METFORMINA 850 MG VO C/12 H 😀 Δ µ';
const DIETA_COMBO = INPUTS.map((x) => x.text.trim()).join(' / ');
const LONG_DIETA = 'DEMO ' + 'LARGUISIMO '.repeat(500);

/** Compare the way the app shows text (upper case, NFC) but keep µ distinct from Greek Μ. */
const fold = (s) => String(s).normalize('NFC').trim().replace(/µ/g, '§MICRO§').toUpperCase();
const has = (haystack, needle) => fold(haystack).includes(fold(needle));

const r = createRun('estado-actual-stress');
const { check, shot } = r;

/** Close-up of one part of the screen, saved as proof-<label>.png: shows a fix at a glance. */
async function proof(loc, label) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.screenshot({ path: path.join(r.artifactDir, `proof-${label}.png`) }).catch((e) => console.log('proof shot failed:', label, e.message));
}

// report.html next to report.json: finish() exits the process, so write it on exit.
process.on('exit', () => {
  try {
    writeHtmlReport(r.artifactDir);
  } catch (e) {
    console.error('report.html failed:', e.message);
  }
});

// ── Page probes ────────────────────────────────────────────────────────────

/** Layout issues under `rootSel`: sideways scroll, spill, sibling overlap, med grid columns. */
function layoutProbe(rootSel) {
  const root = document.querySelector(rootSel);
  if (!root) return ['no ' + rootSel];
  const issues = [];
  const desc = (el) =>
    (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className || '').split(/\s+/).slice(0, 2).join('.')) +
    ' «' + (el.textContent || '').trim().slice(0, 24) + '»';
  const shown = (el) => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  // The part of el a user can see: clipped by every overflow≠visible ancestor.
  const visibleRect = (el) => {
    const b = el.getBoundingClientRect();
    let { left, right, top, bottom } = b;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible') {
        const ab = a.getBoundingClientRect();
        left = Math.max(left, ab.left);
        right = Math.min(right, ab.right);
      }
      if (cs.overflowY !== 'visible') {
        const ab = a.getBoundingClientRect();
        top = Math.max(top, ab.top);
        bottom = Math.min(bottom, ab.bottom);
      }
    }
    return { left, right, top, bottom, empty: right - left < 1 || bottom - top < 1 };
  };
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) issues.push('page scrolls sideways +' + (de.scrollWidth - de.clientWidth));
  const rb = root.getBoundingClientRect();
  const all = [root, ...root.querySelectorAll('*')].filter(shown);
  for (const el of all) {
    const ox = getComputedStyle(el).overflowX;
    // Historial is one row of cards that scrolls sideways on purpose.
    const designed = el.classList.contains('ea-historial-list');
    if ((ox === 'auto' || ox === 'scroll' || el === root) && !designed && el.scrollWidth > el.clientWidth + 1) {
      issues.push('scrolls sideways ' + desc(el) + ' +' + (el.scrollWidth - el.clientWidth));
    }
    const v = visibleRect(el);
    if (!v.empty && (v.right > rb.right + 1 || v.left < rb.left - 1)) issues.push('spills out ' + desc(el));
  }
  for (const parent of all) {
    const kids = [...parent.children].filter((k) => {
      const cs = getComputedStyle(k);
      // A block split across med columns has one union box: skip it, its rows are checked.
      return shown(k) && k.getClientRects().length === 1 && cs.position !== 'absolute' && cs.position !== 'fixed' && cs.display !== 'inline' && cs.display !== 'contents' && k.tagName !== 'OPTION';
    });
    if (kids.length < 2) continue;
    const rects = kids.map(visibleRect);
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        const a = rects[i];
        const b = rects[j];
        if (a.empty || b.empty) continue;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2) issues.push('overlap ' + desc(kids[i]) + ' × ' + desc(kids[j]));
      }
    }
  }
  const grid = root.querySelector('.ea-clinico-med-grid');
  if (grid) {
    const g = grid.getBoundingClientRect();
    for (const cat of grid.querySelectorAll('.ea-med-cat')) {
      const c = cat.getBoundingClientRect();
      // A title may not be left alone: its first med sits either under it (stacked,
      // narrow window) or on the same row, right of its label column (wide window).
      const sum = cat.querySelector(':scope > summary');
      const first = cat.querySelector('.ea-med-item');
      if (sum && first && sum.getBoundingClientRect().width > 1) {
        const s = sum.getBoundingClientRect();
        const f = first.getBoundingClientRect();
        const stacked = Math.abs(s.left - f.left) <= 2;
        const sameRow = f.left >= s.right - 1 && f.top < s.bottom && f.bottom > s.top;
        if (!stacked && !sameRow) issues.push('med title left alone in another column ' + desc(sum));
      }
      if (c.right > g.right + 1 || c.left < g.left - 1 || c.bottom > g.bottom + 1) issues.push('med block outside grid ' + desc(cat));
      for (const el of cat.querySelectorAll('*')) {
        if (!shown(el)) continue;
        const v = visibleRect(el);
        if (!v.empty && (v.right > c.right + 1 || v.left < c.left - 1)) issues.push('leaves its med column ' + desc(el));
      }
    }
  }
  return [...new Set(issues)].slice(0, 12);
}

/** Hover each med block; its add row ("+ Receta", "+ Manual") must stay inside the block. */
async function hoverMedColumns(page) {
  const issues = [];
  const cats = page.locator('.estado-actual-panel .ea-med-cat');
  const n = await cats.count();
  for (let i = 0; i < n; i++) {
    const cat = cats.nth(i);
    await cat.locator('.ea-med-cat-summary').hover({ force: true });
    await page.waitForTimeout(150);
    issues.push(
      ...(await cat.evaluate((el) => {
        const c = el.getBoundingClientRect();
        return [...el.querySelectorAll('.ea-med-add-row, .ea-med-add-row > *')]
          .filter((x) => x.getBoundingClientRect().width > 0)
          .filter((x) => {
            const b = x.getBoundingClientRect();
            return b.right > c.right + 1 || b.left < c.left - 1;
          })
          .map((x) => el.getAttribute('data-ea-med-cat') + ': ' + x.className + ' ' + (x.textContent || '').trim().slice(0, 12));
      }))
    );
  }
  await page.mouse.move(5, 5);
  return issues;
}

const injected = (page) =>
  page.evaluate(() => ({
    xss: !!window.__xss,
    img: [...document.querySelectorAll('img')].some((i) => (i.getAttribute('src') || '').toLowerCase() === 'x'),
    b: [...document.querySelectorAll('b')].some((b) => b.textContent.toUpperCase() === 'X'),
  }));
const clean = (inj) => !inj.xss && !inj.img && !inj.b;

/** Junk that must never be printed as data. */
const JUNK_RE = /\bNaN\b|\bundefined\b|Infinity|\[object Object\]/;

// ── Navigation ─────────────────────────────────────────────────────────────

async function sizeWindow(app, page) {
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w.isMaximized()) w.unmaximize();
    w.setContentSize(1440, 902);
  });
  await page.waitForTimeout(300);
  return page.evaluate(() => [window.innerWidth, window.innerHeight]);
}

/** Sala has the patient sidebar; Interconsulta has "Enviar a nota". */
async function setMode(page, mode) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const btn = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
  await btn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await btn.click();
  await page.waitForTimeout(600);
  await page.mouse.move(5, 5);
  await closeToasts(page);
}

async function openBySearch(page, p) {
  await closeToasts(page);
  await page.locator('#patient-search').fill(p.exp);
  await page.waitForTimeout(400);
  await openPatient(page, p);
  await page.locator('#patient-search').fill('');
}

async function openEstadoActual(page, p) {
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.waitForTimeout(500);
  // The board shows a short name ("DEMO ALFA"): match on the last word.
  const card = page.getByText(new RegExp('^DEMO.*' + p.name.split(' ').pop() + '$')).locator('visible=true').first();
  if (await card.isVisible().catch(() => false)) await card.click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  await page.mouse.move(5, 5);
}

async function addManualMed(page, cat, text) {
  const block = page.locator(`.estado-actual-panel [data-ea-med-cat="${cat}"]`);
  if (!(await block.count())) {
    await page.locator('[data-ea-med-pick-category]').selectOption(cat);
    await block.waitFor({ state: 'visible' });
  }
  await block.locator(`[data-ea-med-manual-toggle="${cat}"]`).click();
  await block.locator(`[data-ea-med-manual-input="${cat}"]`).fill(text);
  await block.locator(`[data-ea-med-manual-save="${cat}"]`).click();
}

const medTitles = (page, cat) =>
  page
    .locator(`.estado-actual-panel [data-ea-med-cat="${cat}"] .ea-med-item-text`)
    .evaluateAll((els) => els.map((e) => e.getAttribute('title') || ''));

async function openRegistro(page) {
  await closeToasts(page);
  await page.getByRole('button', { name: 'Registro manual' }).click();
  const form = page.locator('#ea-form');
  await form.waitFor({ state: 'visible' });
  return form;
}

async function setRecordedAt(page, hoursAgo) {
  await page.evaluate((h) => {
    const t = new Date(Date.now() - h * 3600e3);
    const pad = (n) => String(n).padStart(2, '0');
    const el = document.getElementById('ea-recorded-at');
    el.value = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('rpc-datetime-sync'));
  }, hoursAgo);
}

/** Type like a user: number inputs refuse .fill() of non-numbers. */
async function typeInto(page, loc, text) {
  await loc.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  if (text) await page.keyboard.type(text);
}

async function submitRegistro(page, form) {
  await page.locator('.ea-registro-submit').click();
  const closed = await form.waitFor({ state: 'hidden', timeout: 6000 }).then(
    () => true,
    () => false
  );
  const toasts = (await page.locator('.toast').allInnerTexts()).join(' | ');
  if (!closed) {
    await page.keyboard.press('Escape');
    await form.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
  await closeToasts(page);
  return { closed, toasts };
}

/** FC readings in the vital history modal: the full record, Historial shows only 8. */
async function fcHistoryCount(page) {
  await page.locator('#ea-snapshot [data-ea-vital-history="fc"]').click();
  const modal = page.locator('#ea-vital-history-backdrop.open');
  await modal.waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  const n = await modal.locator('.ea-vital-history-metric').count();
  await page.keyboard.press('Escape');
  await modal.waitFor({ state: 'hidden' });
  return n;
}

async function historialText(page) {
  const h = page.locator('#ea-historial');
  if (!(await h.evaluate((el) => el.open))) await page.locator('#ea-historial > summary').click();
  await page.waitForTimeout(200);
  return h.innerText();
}

const panelText = (page) => page.locator('.estado-actual-panel').innerText();

async function readClipboard(app) {
  return app.evaluate(({ clipboard }) => ({ text: clipboard.readText(), html: clipboard.readHTML() }));
}

// ── Scenario ───────────────────────────────────────────────────────────────

await r.finish('Estado actual worst-case input, volume, restart', async () => {
  let { app, page, pageErrors } = await r.launch({ lanPort: 3795 });
  const userClipboard = await app.evaluate(({ clipboard }) => clipboard.readText()).catch(() => '');
  await onboardLocalOnly(page);
  const vp = await sizeWindow(app, page);
  check('window is 1440×902', vp[0] === 1440 && vp[1] === 902, vp);

  for (const p of [ALFA, BETA]) await pasteAndSave(page, header(p, TODAY(1)) + bh('9.1'));
  await openBySearch(page, ALFA);
  await setMode(page, 'interconsulta');
  await openEstadoActual(page, ALFA);
  await shot(page, 'alfa-empty');

  /** One step's four checks: page errors, HTML, value, layout. */
  async function stepChecks(label, errBefore, valueOk, valueDetail, rootSel = '.estado-actual-panel') {
    check(`${label}: no page error`, pageErrors.length === errBefore, pageErrors.slice(errBefore));
    const inj = await injected(page);
    check(`${label}: HTML does not run or render`, clean(inj), inj);
    if (valueOk !== undefined) check(`${label}: value kept`, valueOk, valueDetail);
    const lay = await page.evaluate(layoutProbe, rootSel);
    check(`${label}: no overlap, no sideways scroll`, lay.length === 0, lay);
  }

  // ── Meds: one odd line per category, + an NM antidiabetic ────────────────
  for (let i = 0; i < INPUTS.length; i++) {
    const { label, text } = INPUTS[i];
    const cat = MED_CATS[i];
    const before = pageErrors.length;
    await addManualMed(page, cat, text);
    await until(async () => (await medTitles(page, cat)).some((t) => has(t, text)), 3000, 100);
    const titles = await medTitles(page, cat);
    await shot(page, `med-${cat}-${label.replace(/\W+/g, '-')}`);
    await stepChecks(`med ${cat} [${label}]`, before, titles.some((t) => has(t, text)), titles.map((t) => t.slice(0, 60)));
  }
  {
    const before = pageErrors.length;
    await addManualMed(page, 'nm', NM_ANTIDIABETIC);
    await page.waitForTimeout(300);
    const sub = await page
      .locator('.estado-actual-panel .ea-med-subcat--antidiabeticos .ea-med-item-text')
      .evaluateAll((els) => els.map((e) => e.getAttribute('title')));
    await stepChecks('NM antidiabetic with odd text', before, sub.some((t) => has(t, NM_ANTIDIABETIC)), sub);
  }
  await proof(page.locator('.estado-actual-panel .ea-clinico-med-grid'), 'med-long-line-column');
  const hov = await hoverMedColumns(page);
  await page.locator('.estado-actual-panel .ea-med-cat-summary').first().hover({ force: true });
  await shot(page, 'meds-hover');
  await page.mouse.move(5, 5);
  check('"+ Receta"/"+ Manual" on hover stay inside their column', hov.length === 0, hov);

  // ── Dieta: each odd input, then all of them at once ──────────────────────
  const dieta = page.locator('.estado-actual-panel [data-ea-ec="dieta"]');
  for (const { label, text } of [...INPUTS, { label: 'all combined', text: DIETA_COMBO }]) {
    const before = pageErrors.length;
    await dieta.fill(text);
    await dieta.press('Tab');
    await page.waitForTimeout(200);
    await stepChecks(`dieta [${label}]`, before, has(await dieta.inputValue(), text), (await dieta.inputValue()).slice(0, 60));
  }
  await shot(page, 'dieta-combo');

  // ── Registros: odd I/O source name + event detail, number junk ───────────
  for (let i = 0; i < INPUTS.length; i++) {
    const { label, text } = INPUTS[i];
    const junk = NUM_JUNK[i];
    const before = pageErrors.length;
    const form = await openRegistro(page);
    await setRecordedAt(page, 20 - i * 2);
    await typeInto(page, form.locator('[data-ea-vital="tas"][data-ea-layer-idx="0"]'), junk);
    // The app allows at most 4 FC readings per turn. With 2 h spacing, a run after
    // ~08:00 puts 5+ of these in the night turn, so only the first 4 carry FC.
    if (i < 4) await typeInto(page, form.locator('[data-ea-vital="fc"][data-ea-layer-idx="0"]'), String(80 + i));
    await typeInto(page, form.locator('[data-ea-glu-value]').first(), junk);
    await form.locator('#ea-io-ing-t1').fill(junk);
    await form.locator('#ea-io-egr-t1').fill(NUM_JUNK[(i + 3) % NUM_JUNK.length]);
    await form.locator('#ea-io-evac').fill(junk);
    await form.locator('#ea-add-io-extra').selectOption('__custom__');
    const src = form.locator('[data-ea-io-extra-row]').last();
    await src.locator('[data-ea-io-extra-custom]').fill(text);
    await src.locator('[data-ea-io-extra-value]').fill(junk || '100');
    await form.locator('[data-ea-io-event-add]').selectOption('otro');
    const ev = form.locator('[data-ea-io-event-row]').last();
    await ev.locator('[data-ea-io-event-turno]').selectOption('t1');
    await ev.locator('[data-ea-io-event-detail]').fill(text);
    await shot(page, `registro-${label.replace(/\W+/g, '-')}`);
    const formLay = await page.evaluate(layoutProbe, '#ea-form');
    check(`registro form [${label}]: no overlap, no sideways scroll`, formLay.length === 0, formLay);
    const sub = await submitRegistro(page, form);
    check(`registro [${label}] with junk "${junk}": saved, or refused with a message`, sub.closed || !!sub.toasts, sub);
    const hist = await historialText(page);
    const snapText = await page.locator('#ea-snapshot').innerText();
    await shot(page, `historial-${label.replace(/\W+/g, '-')}`);
    if (label === 'html' || label === 'symbols') {
      // Rows clip at 2 lines: unclip this one row so the close-up shows the whole event text.
      const rowIdx = await page.evaluate(() =>
        [...document.querySelectorAll('.ea-historial-row')].findIndex((r) => /ONERROR|OTRO Δ/i.test(r.textContent))
      );
      const row = page.locator('.ea-historial-row').nth(Math.max(rowIdx, 0));
      await row.locator('.ea-historial-summary').evaluate((el) => { el.style.display = 'block'; el.style.overflow = 'visible'; });
      await proof(row, `historial-${label}`);
    }
    await stepChecks(`registro [${label}]`, before, has(hist, text), hist.slice(0, 120));
    check(`registro [${label}]: no NaN/undefined/Infinity shown`, !JUNK_RE.test(hist + snapText), (hist + snapText).match(JUNK_RE)?.[0]);
  }

  // ── Copiar / Enviar a nota with the odd characters ───────────────────────
  {
    const before = pageErrors.length;
    await page.evaluate(() => { window.__e2eClipboardHtml = null; });
    await page.locator('#ea-copy-fab').click();
    await page.waitForTimeout(400);
    const clip = await readClipboard(app);
    const missing = INPUTS.filter((x) => !has(clip.text, x.text)).map((x) => x.label);
    check('Copiar: every odd med/dieta text is in the plain text', missing.length === 0, missing);
    check('Copiar: µ stays µ (not Greek Μ)', /µ/.test(clip.text) && !/Μ/.test(clip.text), clip.text.match(/.{0,20}[µΜ].{0,10}/g));
    check('Copiar: HTML in fields is escaped in the clipboard HTML', !/<img\b/i.test(clip.html || '') && !/<b>X<\/b>/.test(clip.html || ''), (clip.html || '').match(/.{0,30}(img|<b>X).{0,30}/i)?.[0]);
    check('Copiar: no NaN/undefined/Infinity', !JUNK_RE.test(clip.text), clip.text.match(JUNK_RE)?.[0]);
    check('Copiar: no page error', pageErrors.length === before, pageErrors.slice(before));
    fs.writeFileSync(path.join(r.artifactDir, 'copiar-alfa.txt'), clip.text);
  }
  {
    const before = pageErrors.length;
    await page.getByRole('button', { name: 'Enviar a nota' }).click();
    const replace = page.getByRole('button', { name: 'Reemplazar', exact: true });
    await replace.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await replace.isVisible().catch(() => false)) await replace.click();
    await page.waitForTimeout(800);
    await shot(page, 'enviar-a-nota');
    // Scroll the note so the Vasopresores line (Δ ≥ ≤ µ →) is on screen.
    const noteIdx = await page.evaluate(() => [...document.querySelectorAll('textarea')].findIndex((t) => t.value.includes('VASOPRESORES')));
    const noteBox = page.locator('textarea').nth(Math.max(noteIdx, 0));
    await noteBox.evaluate((t) => {
      const i = t.value.indexOf('VASOPRESORES');
      t.scrollTop = Math.max(0, (t.scrollHeight * i) / t.value.length - 40);
    }).catch(() => {});
    await proof(noteBox, 'nota-micro');
    const note = await page.evaluate(() => [...document.querySelectorAll('textarea')].map((t) => t.value).join('\n'));
    fs.writeFileSync(path.join(r.artifactDir, 'nota-alfa.txt'), note);
    const missing = INPUTS.filter((x) => !has(note, x.text)).map((x) => x.label);
    check('Enviar a nota: every odd med/dieta text is in the note', missing.length === 0, missing);
    check('Enviar a nota: µ stays µ (not Greek Μ)', /µ/.test(note) && !/Μ/.test(note), note.match(/.{0,20}[µΜ].{0,10}/g));
    check('Enviar a nota: no NaN/undefined/Infinity', !JUNK_RE.test(note), note.match(JUNK_RE)?.[0]);
    const inj = await injected(page);
    check('Enviar a nota: HTML does not run or render', clean(inj), inj);
    check('Enviar a nota: no page error', pageErrors.length === before, pageErrors.slice(before));
    const lay = await page.evaluate(() => {
      const de = document.documentElement;
      return de.scrollWidth - de.clientWidth;
    });
    check('Enviar a nota: page does not scroll sideways', lay <= 1, lay);
  }

  // ── Volume on BETA ────────────────────────────────────────────────────────
  await setMode(page, 'sala');
  await openBySearch(page, BETA);
  await openEstadoActual(page, BETA);
  check('BETA is the open patient', !(await page.locator('.estado-actual-panel').innerText()).includes('LARGUISIMO'));
  {
    const before = pageErrors.length;
    const t = Date.now();
    for (let i = 0; i < 26; i++) {
      await addManualMed(page, 'antihta', `DEMO MED ${i + 1} LOSARTÁN 50 MG VO C/12 H Δ µ`);
      await until(async () => (await medTitles(page, 'antihta')).length === i + 1, 3000, 50);
    }
    const n = (await medTitles(page, 'antihta')).length;
    await shot(page, 'beta-26-meds');
    await stepChecks('26 meds in one category', before, n === 26, { n, ms: Date.now() - t });
    const hovB = await hoverMedColumns(page);
    check('26 meds: "+ Receta"/"+ Manual" on hover stay inside their column', hovB.length === 0, hovB);
    await dieta.fill(LONG_DIETA);
    await dieta.press('Tab');
    await page.waitForTimeout(200);
    await shot(page, 'beta-5kB-dieta');
    await stepChecks('5 kB dieta', before, has(await dieta.inputValue(), LONG_DIETA));
  }
  {
    const before = pageErrors.length;
    const t = Date.now();
    const sinceMidnight = Math.max((Date.now() - new Date().setHours(0, 0, 0, 0)) / 3600e3 - 0.05, 0.05);
    for (let i = 0; i < 52; i++) {
      const form = await openRegistro(page);
      // The app caps a vital at 4 readings in yesterday 08:00–today 00:00; today's are not capped.
      await setRecordedAt(page, (i / 52) * sinceMidnight);
      await typeInto(page, form.locator('[data-ea-vital="tas"][data-ea-layer-idx="0"]'), String(100 + i));
      await typeInto(page, form.locator('[data-ea-vital="tad"][data-ea-layer-idx="0"]'), String(60 + (i % 30)));
      await typeInto(page, form.locator('[data-ea-vital="fc"][data-ea-layer-idx="0"]'), String(70 + (i % 40)));
      const sub = await submitRegistro(page, form);
      if (!sub.closed) check(`vitals registro ${i + 1} saves`, false, sub);
    }
    const ms = Date.now() - t;
    await historialText(page);
    await shot(page, 'beta-52-registros');
    const fcN = await fcHistoryCount(page);
    await stepChecks('52 vitals registros', before, fcN >= 52, { fcHistory: fcN, ms });
  }
  {
    const before = pageErrors.length;
    const form = await openRegistro(page);
    await setRecordedAt(page, 0);
    await form.locator('#ea-io-ing-t1').fill('1200');
    await form.locator('#ea-io-egr-t1').fill('900');
    const kinds = ['otro', 'carga', 'transfusion', 'fuera', 'perdidas', 'furosemida', 'hemodialisis'];
    for (let i = 0; i < 32; i++) {
      const kind = kinds[i % kinds.length];
      await form.locator('[data-ea-io-event-add]').selectOption(kind);
      const ev = form.locator('[data-ea-io-event-row]').last();
      await ev.locator('[data-ea-io-event-turno]').selectOption('t1');
      const detail = ev.locator('[data-ea-io-event-detail]');
      if (await detail.isVisible()) await detail.fill(i === 31 ? 'DEMO EVENTO 32 ' + 'LARGUISIMO '.repeat(90) : `DEMO EVENTO ${i + 1} Δ µ`);
      const ml = ev.locator('[data-ea-io-event-ml]');
      if (await ml.isVisible()) await ml.fill(String(50 + i));
    }
    await shot(page, 'beta-32-events-form');
    const formLay = await page.evaluate(layoutProbe, '#ea-form');
    check('32 events: registro form has no overlap, no sideways scroll', formLay.length === 0, formLay);
    const sub = await submitRegistro(page, form);
    check('32 events in T1: registro saves', sub.closed, sub);
    await page.locator('[data-onclick="openEaTurnosBalanceModal"]').click();
    const modal = page.locator('#ea-vital-history-backdrop.open');
    await modal.waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    const t1 = (await modal.locator('.ea-turnos-table tbody tr').allInnerTexts())[0] || '';
    await shot(page, 'beta-32-events-balance');
    const lay = await page.evaluate(layoutProbe, '#ea-vital-history-backdrop.open');
    check('32 events: balance por turno lists all of them in T1', /EVENTO 1 /.test(t1) && /EVENTO 32 LARGUISIMO/.test(t1), t1.slice(0, 160));
    check('32 events: balance por turno has no overlap, no sideways scroll', lay.length === 0, lay);
    await page.keyboard.press('Escape');
    await modal.waitFor({ state: 'hidden' });
    await stepChecks('32 events in T1', before);
  }
  {
    const before = pageErrors.length;
    const t = Date.now();
    await page.locator('#ea-copy-fab').click();
    await page.waitForTimeout(300);
    const clip = await readClipboard(app);
    const ms = Date.now() - t;
    check('Copiar at volume: has the 26 meds, under 2 s, no error', /DEMO MED 26 /.test(clip.text) && ms < 2000 && pageErrors.length === before, { ms, len: clip.text.length });
    const txt = await panelText(page);
    check('volume panel: no NaN/undefined/Infinity shown', !JUNK_RE.test(txt), txt.match(JUNK_RE)?.[0]);
  }

  check('no page errors in session 1', pageErrors.length === 0, pageErrors);
  await app.evaluate(({ clipboard }, t) => clipboard.writeText(t), userClipboard).catch(() => {});
  await app.close();

  // ── Restart: same profile ────────────────────────────────────────────────
  ({ app, page, pageErrors } = await r.launch({ lanPort: 3795 }));
  await dismissLearnHub(page);
  await sizeWindow(app, page);
  await setMode(page, 'sala');
  await page.locator('.p-name').first().waitFor({ timeout: 15000 }).catch(() => {});
  await openBySearch(page, ALFA);
  await openEstadoActual(page, ALFA);
  await shot(page, 'restart-alfa');
  const lost = [];
  for (let i = 0; i < INPUTS.length; i++) {
    if (!(await medTitles(page, MED_CATS[i])).some((t) => has(t, INPUTS[i].text))) lost.push('med ' + INPUTS[i].label);
  }
  const nmSub = await page.locator('.estado-actual-panel .ea-med-subcat--antidiabeticos .ea-med-item-text').evaluateAll((els) => els.map((e) => e.getAttribute('title')));
  if (!nmSub.some((t) => has(t, NM_ANTIDIABETIC))) lost.push('NM antidiabetic');
  const dietaAfter = await page.locator('.estado-actual-panel [data-ea-ec="dieta"]').inputValue();
  if (fold(dietaAfter) !== fold(DIETA_COMBO)) lost.push('dieta combo');
  const histA = await historialText(page);
  for (const x of INPUTS) if (!has(histA, x.text)) lost.push('registro ' + x.label);
  check('restart: every odd text survives (meds, NM antidiabetic, dieta, I/O names, events)', lost.length === 0, lost);
  const layA = await page.evaluate(layoutProbe, '.estado-actual-panel');
  check('restart ALFA: no overlap, no sideways scroll', layA.length === 0, layA);

  await openBySearch(page, BETA);
  await openEstadoActual(page, BETA);
  const medsB = (await medTitles(page, 'antihta')).length;
  const dietaB = await page.locator('.estado-actual-panel [data-ea-ec="dieta"]').inputValue();
  await historialText(page);
  await shot(page, 'restart-beta');
  const fcB = await fcHistoryCount(page);
  check('restart: 26 meds, 5 kB dieta and 52 FC readings survive', medsB === 26 && fold(dietaB) === fold(LONG_DIETA) && fcB >= 52, { medsB, dietaLen: dietaB.length, fcB });
  const layB = await page.evaluate(layoutProbe, '.estado-actual-panel');
  check('restart BETA: no overlap, no sideways scroll', layB.length === 0, layB);
  check('no page errors in session 2', pageErrors.length === 0, pageErrors);
  await app.close();
});

// ── HTML report ────────────────────────────────────────────────────────────

function writeHtmlReport(dir) {
  const rep = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const shots = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  const rows = rep.checks
    .map((c) => `<tr class="${c.ok ? 'ok' : 'bad'}"><td>${c.ok ? 'PASS' : 'FAIL'}</td><td>${esc(c.name)}</td><td><code>${c.detail == null ? '' : esc(JSON.stringify(c.detail)).slice(0, 400)}</code></td></tr>`)
    .join('\n');
  const figs = shots.map((f) => `<figure><a href="${esc(f)}"><img src="${esc(f)}" loading="lazy" alt="${esc(f)}"></a><figcaption>${esc(f.replace(/\.png$/, ''))}</figcaption></figure>`).join('\n');
  fs.writeFileSync(
    path.join(dir, 'report.html'),
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Estado actual stress</title>
<style>
:root{--bg:#fff;--fg:#1d2327;--muted:#646970;--ok:#1a7f37;--bad:#cf222e;--line:#d0d7de}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#8b949e;--ok:#3fb950;--bad:#f85149;--line:#30363d}}
body{background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;margin:0 auto;max-width:1200px;padding:16px}
h1{font-size:20px;margin:0 0 4px} p{color:var(--muted);margin:0 0 16px}
table{border-collapse:collapse;width:100%;table-layout:fixed} td{border-bottom:1px solid var(--line);padding:4px 6px;vertical-align:top;overflow-wrap:anywhere}
td:first-child{width:48px;font-weight:600} td:nth-child(2){width:40%}
tr.ok td:first-child{color:var(--ok)} tr.bad td:first-child{color:var(--bad)} tr.bad{background:color-mix(in srgb,var(--bad) 8%,transparent)}
code{font-size:12px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px;margin-top:20px}
figure{margin:0} img{width:100%;border:1px solid var(--line);border-radius:6px} figcaption{font-size:12px;color:var(--muted)}
</style>
<h1>Estado actual stress — ${rep.passed}/${rep.passed + rep.failed} passed</h1>
<p>${esc(rep.scenario)} · run ${esc(rep.runId)} · synthetic DEMO patients only</p>
<table>${rows}</table>
<div class="grid">${figs}</div>
`
  );
}
