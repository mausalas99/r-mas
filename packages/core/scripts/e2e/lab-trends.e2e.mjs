#!/usr/bin/env node
/* global document, Chart, createImageBitmap, CanvasRenderingContext2D */
/**
 * E2E: lab trend arrows and the Tendencias screen, driven through the real
 * Electron app. Synthetic DEMO patient and a made-up expediente only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Arrows in the Laboratorio view
 *     - an arrow shows on the first day, with no earlier value to compare
 *     - the arrow points the wrong way (up vs down)
 *     - an unchanged value still gets an arrow
 *     - a later day leaks into an older day's comparison
 *     - an earlier set of the SAME day is used instead of the previous day
 *     - a set with no value for the field (a day with no blood count) blocks the comparison
 *   Tendencias cards
 *     - the retired key QS|BUNCR comes back as a card, or BUN/CR is lost
 *     - the % change is wrong, or shows raw deltas instead of a percent
 *     - the colour follows up/down instead of "closer to normal" (good/bad)
 *     - movement inside the normal range is coloured good/bad
 *     - a flat value still shows a change
 *   Hide / collapse
 *     - a hidden card still shows, or is missing from "Analitos ocultos"
 *     - hidden cards or collapsed sections are forgotten after a restart
 *     - "Mostrar todos" does not bring the cards back
 *     - a full browser storage (quota error) breaks the screen instead of a warning
 *     - with full storage, hide / re-open silently do nothing
 *     - re-drawing the small charts leaks chart objects
 *   Detail chart and events
 *     - the detail chart lacks the normal-range band (Leucocitos 4–11)
 *     - two draws of one day collapse into one point, or its labels show the time
 *     - the same report pasted twice shows as two points
 *     - LCR Glu and QS Glu (same field key) merge into one pivot row
 *     - a ref range printed for one row (TTP) leaks onto a sibling row with no
 *       range of its own (INR), because both sit under the same lab section
 *     - an event saves with a required field empty (biopsia site, procedimiento)
 *       (a transfusion always has a product picked: the UI cannot send it empty)
 *     - "Otro" refuses to save with no detail
 *     - an edit opens empty, or saves a new event instead of changing the old one
 *     - two events on one day show as two day rows
 *     - the event date shows the lab draw time
 *     - Cancel on delete still deletes; Eliminar does not delete
 *     - events are lost after a restart
 *     - Enter on a focused card does not open the detail (keyboard users)
 *   Tendencias por Grupo (multi-analyte chart + table)
 *     - BH does not split into its absolute/quality panels
 *     - a hidden panel keeps showing, or "Mostrar todo" does not bring it back
 *     - a threshold line does not push the chart's Y axis past its value
 *     - "agrupar por día" does not collapse two same-day draws into the most
 *       recent one
 *     - a column hidden "en copia" still lands in the copied table text
 *     - an analyte from another section, added to the table, does not stick
 *       after the modal is closed and reopened
 *     - the date-range filter does not narrow the table, or "Quitar rango"
 *       does not restore it
 *     - a day with an event loses its tag in the copied table text
 *
 * Artifact: e2e-artifacts/lab-trends/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:lab-trends
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, dismissLearnHub, goArea, quietHints } from './harness.mjs';
import { TABLE, header, fullLabs, gas } from './some-fixtures.mjs';

const P = { exp: '7000003-3', name: 'DEMO TENDENCIA', room: '303' };

function cbc(p, when, { wbc, hgb, plt, mcv }) {
  const flag = (v, lo, hi) => (v < lo ? 'B' : v > hi ? 'A' : '*');
  return (
    header(p, when) +
    'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    `HGB\t\t${flag(hgb, 12.2, 18.1)}\t${hgb.toFixed(2)}\tg/dL\t12.20 - 18.10\n` +
    `HCT\t\t*\t${(hgb * 3).toFixed(1)}\t%\t37.7 - 53.7\n` +
    `MCV\t\t*\t${mcv}\tfL\t80 - 97\n` +
    `WBC\t\t${flag(wbc, 4, 11)}\t${wbc.toFixed(2)}\tK/uL\t4.00 - 11.00\n` +
    `PLT\t\t${flag(plt, 142, 424)}\t${plt}\tK/uL\t142.00 - 424.00\n`
  );
}

/** The demo report without its blood count: chemistry only (for QS trends). */
function chemistryOnly(p, when) {
  const t = fullLabs(p, when);
  return t.slice(0, t.indexOf('HEMATOLOGIA\n')) + t.slice(t.indexOf('QUIMICA CLINICA\n'));
}

/** Coag panel: TP has its own ref range, INR (right after it) does not — must not steal TTP's. */
function coag(p, when) {
  return (
    header(p, when) +
    'HEMATOLOGIA\n' +
    'TIEMPO DE PROTROMBINA Y TROMBOPLASTINA\n' +
    'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
    'TIEMPO DE PROTROMBINA\nA\n15.40\nSEG.\t10.25 - 13.20\n' +
    'TESTIGO\n*\n11.76\nSEG\n' +
    'INR\n*\n1.32\n' +
    'TIEMPO DE TROMBOPLASTINA\nA\n36.2\nSEG\t28.9 - 34.1\n' +
    'TESTIGO\n*\n31.5\nSEG\n' +
    'OBSERVACIONES\n*\n'
  );
}

/** Fibrinógeno alone, moving further outside range 200-400 across two days ("bad" tone). */
function fib(p, when, val) {
  return (
    header(p, when) +
    'HEMATOLOGIA\nCOAGULACION\n' + TABLE +
    `FIBRINOGENO\n*\n${val}\nMG/DL\t200 - 400\n`
  );
}

/** A blood-count report reporting only PLT, for a same-day full-draw + partial-draw pair. */
function pltOnly(p, when, plt) {
  return (
    header(p, when) +
    'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    `PLT\t\t*\t${plt}\tK/uL\t142.00 - 424.00\n`
  );
}

/** Synthetic CSF report as the hospital portal sends it (one cell per line, blank line between); values differ per day. */
function csf(p, when, { cells, glu, prot }) {
  const q =
    header(p, when) +
    'QUIMICA CLINICA\nCITOQUIMICO DE LCR\n' + TABLE +
    'pH\n*\n8.5\nASPECTO\n*\nRECUENTO CELULAR\n*\nPOLIMORFONUCLEARES\n*\nLINFOCITOS\n*\n' +
    'TINTA CHINA\n*\nERITROCITOS\n*\nCOAGLUTINACION\n*\nGRAM\n*\n' +
    `GLUCOSA\nB\n${glu}\nmg/dL\t45 - 80\nPROTEINAS\nA\n${prot}\nmg/dL\t15 - 45\n` +
    'CLORURO\nB\n109.3\nmmol/L\t118.1 - 132.0\nOTROS\n*\n';
  const b =
    header(p, when) +
    'BACTERIOLOGIA\nCITOQUIMICO LIQ. LCR\n' + TABLE +
    'LCR\n*\nASPECTO\n*\nCLARO\nRECUENTO CELULAR\n*\n' + cells + '\nLEUCOCITOS/MM\n' +
    'LEUCOCITOS POLIMORFONUCLEARES\n*\n26\n%PMN\nLINFOCITOS\n*\n74\n%LINFOCITOS\n' +
    'TINTA CHINA\n*\nNEGATIVO\nERITROCITOS\n*\nAUSENTES\nCOAGLUTINACION\n*\nGRAM\n*\nMODERADOS LEUCOCITOS\nCOMENTARIOS\n*\n';
  const portal = (t) => t.replace(/\n/g, '\n\n');
  return portal(q) + '\n\n' + portal(b);
}

/** Blood count with a MANUAL differential (Segmentados, Linfocitos %, Metamielocitos) + Fibrinógeno and Dímero D, one report per draw. */
function diffCoag(p, when, { seg, lin, meta, fibv, dd }) {
  return (
    header(p, when) +
    'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    'RBC\t\t4.10\tM/uL\t4.04 - 6.13\n' +
    'HGB\t\t*\t12.50\tg/dL\t12.20 - 18.10\n' +
    'HCT\t\t*\t38.0\t%\t37.7 - 53.7\n' +
    'MCV\t\t*\t85\tfL\t80 - 97\n' +
    'WBC\t\t*\t9.10\tK/uL\t4.00 - 11.00\n' +
    `SEGMENTADOS\t\t*\t${seg}\t%\t37.0 - 80.0\n` +
    `LINFOCITOS\t\t*\t${lin}\t%\t10.0 - 50.0\n` +
    `METAMIELOCITOS\t\t*\t${meta}\t%\t0.0 - 0.0\n` +
    'PLT\t\t*\t250\tK/uL\t142.00 - 424.00\n\n' +
    'HEMATOLOGIA\nCOAGULACION\n' + TABLE +
    `FIBRINOGENO\n*\n${fibv}\nMG/DL\t200 - 400\n` +
    `DIMERO D\t\nA\n${dd}\nng/mL\t0 - 500\n`
  );
}

const r = createRun('lab-trends');
const { check } = r;
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

await r.finish('Lab trend arrows + Tendencias', async () => {
  let { app, page, pageErrors } = await r.launch();
  await quietHints(page); // the ⌘K hint bubble sits over the page toolbar under the top bar
  await onboardLocalOnly(page);
  await goArea(page, 'lab');

  // ── History: 5 days, one day with two sets, one day with no blood count ──────────────
  // One report for a new expediente: saved straight away as a new patient.
  await pasteAndSave(page, fullLabs(P, 'Dec 30 2025 8:00AM'));
  await openPatient(page, P);
  await goArea(page, 'lab');
  await pasteAndSave(
    page,
    [
      cbc(P, 'Jan 2 2026 8:00AM', { wbc: 18, hgb: 7.7, plt: 100, mcv: 82 }),
      cbc(P, 'Jan 3 2026 8:00AM', { wbc: 22, hgb: 7.3, plt: 100, mcv: 82 }),
      cbc(P, 'Jan 3 2026 3:00PM', { wbc: 20, hgb: 7.4, plt: 100, mcv: 82 }),
      gas(P, 'Jan 4 2026 8:00AM', '7.35'),
      chemistryOnly(P, 'Jan 4 2026 8:05AM'),
      cbc(P, 'Jan 5 2026 8:00AM', { wbc: 12, hgb: 9, plt: 100, mcv: 85 }),
      coag(P, 'Jan 6 2026 8:00AM'),
      coag(P, 'Jan 7 2026 8:00AM'),
    ].join('\n\n')
  );
  await openPatient(page, P);
  if (!(await page.locator('#lab-history-date-select').isVisible())) await goArea(page, 'lab');
  const days = await page.locator('#lab-history-date-select option').allTextContents();
  check('all 7 lab days saved', ['30/12/2025', '02/01/2026', '03/01/2026', '04/01/2026', '05/01/2026', '06/01/2026', '07/01/2026'].every((d) => days.includes(d)), days);

  /** Arrows of one day, per lab set: [{ hora, arrows: { label: 'up'|'down' } }]. */
  async function arrowsFor(date) {
    await page.locator('#lab-history-date-select').selectOption(`day:${date}`);
    await page.waitForTimeout(500);
    return page.locator('#lab-output-box').evaluate((box) => {
      const out = [];
      let cur = { hora: '', arrows: {} };
      out.push(cur);
      for (const el of box.querySelectorAll('.lab-hour-group-h, .lab-trend-arrow')) {
        if (el.classList.contains('lab-hour-group-h')) {
          cur = { hora: el.textContent.trim(), arrows: {} };
          out.push(cur);
          continue;
        }
        const cell = el.closest('.lab-row-value');
        const label = cell && cell.previousElementSibling ? cell.previousElementSibling.textContent.trim() : '?';
        cur.arrows[label] = el.classList.contains('lab-trend-up') ? 'up' : 'down';
      }
      return out.filter((s) => s.hora || Object.keys(s.arrows).length);
    });
  }
  const all = (sets) => Object.assign({}, ...sets.map((s) => s.arrows));

  const d0 = await arrowsFor('30/12/2025');
  check('first day has no arrows', Object.keys(all(d0)).length === 0, d0);
  const d1 = await arrowsFor('02/01/2026');
  await r.shot(page, 'arrows-jan2');
  check('WBC 6.12 → 18 is "up" (a later day does not leak in)', all(d1).Leu === 'up', d1);
  const d2 = await arrowsFor('03/01/2026');
  const late = d2.find((s) => /^15:00/.test(s.hora)) || d2[d2.length - 1];
  check('15:00 set compares with the day before, not 08:00 same day', late && late.arrows.Leu === 'up' && late.arrows.Hb === 'down', d2);
  check('unchanged PLT 100 has no arrow', late && !late.arrows.Plt, d2);
  const d4 = await arrowsFor('05/01/2026');
  await r.shot(page, 'arrows-jan5');
  check('day with no blood count is skipped: WBC 20 → 12 "down", Hb 7.4 → 9 "up"', all(d4).Leu === 'down' && all(d4).Hb === 'up', d4);

  // Fibrinógeno alone, two more days, moving further OUTSIDE its range — an
  // organic "bad" tone case that doesn't touch any already-checked field.
  await pasteAndSave(page, fib(P, 'Jan 8 2026 8:00AM', 450));
  await pasteAndSave(page, fib(P, 'Jan 9 2026 8:00AM', 600));

  // ── Tendencias ───────────────────────────────────────────────────────────
  async function openTend() {
    await closeToasts(page);
    await page.locator('#lab-inner-tend-btn').click();
    await page.locator('#tendencias-container .tend-row, #lab-inner-tend-mount .tend-row').first().waitFor({ state: 'visible' });
  }
  const card = (key) => page.locator(`.tend-row[data-series-key="${key}"]`).locator('visible=true');
  // The detail/group/pivot panels live in the side pane (#tend-pane), not in a modal. X closes the current mode.
  const closePane = async () => {
    await page.locator('#tend-pane .tend-pane-close:visible').first().click();
    await page.locator('#tend-pane').waitFor({ state: 'hidden' }).catch(() => {});
  };
  await openTend();
  await r.shot(page, 'tendencias');
  const keys = await page.locator('.tend-row[data-series-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-series-key')));
  check('BUN/CR card present, retired QS|BUNCR not', keys.includes('QS|BUN/CR') && !keys.includes('QS|BUNCR'), keys);
  check('a dynamic non-catalog analyte (SODIO) gets its own card', keys.includes('ESC|Na'), keys);
  // Default card order follows the SOME report order, not alphabetical / insertion order.
  const inOrder = (prefix, seq) => {
    const idx = seq.map((f) => keys.indexOf(`${prefix}|${f}`)).filter((i) => i >= 0);
    return idx.length >= 2 && idx.every((v, i) => i === 0 || idx[i - 1] < v);
  };
  check('BH cards follow the SOME order (RBC, Hb, ... Plt)', inOrder('BH', ['RBC', 'Hb', 'Hto', 'VCM', 'HCM', 'CHCM', 'RDW', 'Leu', 'Neu', 'NeuPct', 'Lin', 'LinPct', 'Plt', 'MPV']), keys.filter((k) => k.startsWith('BH|')));
  check('QS cards follow the SOME order (Glu, BUN, Cr, BUN/CR, ... lipids)', inOrder('QS', ['Glu', 'BUN', 'Cr', 'BUN/CR', 'eTFG', 'AU', 'COL', 'HDL', 'LDL', 'TGL', 'IA', 'CTHDL']), keys.filter((k) => k.startsWith('QS|')));
  // Toolbar: search filters rows client side; segmented control mirrors the abnormal-only pref.
  await page.locator('.tend-search-input').fill('plaq');
  const searchVisible = await page.locator('.tend-row:visible').count();
  check('search «plaq» narrows the list to the platelet row(s)', searchVisible > 0 && searchVisible < keys.length, searchVisible);
  await page.locator('.tend-search-input').fill('');
  check('clearing search restores all rows', (await page.locator('.tend-row:visible').count()) >= searchVisible);
  check('segmented «Todos» is pressed by default', (await page.locator('.tend-seg-btn[data-tend-filter="all"]').getAttribute('aria-pressed')) === 'true');

  const insight = (key) =>
    card(key).first().evaluate((el) => {
      const i = el.querySelector('.tend-insight');
      return i ? { text: i.textContent.trim(), cls: i.innerHTML } : null;
    }).catch(() => 'missing card');
  const wbc = await insight('BH|Leu');
  check('WBC card: −40%, down, good (closer to normal)', !!wbc && /−40%/.test(wbc.text) &&
    /tend-insight-delta--down/.test(wbc.cls) && /tend-insight-delta--good/.test(wbc.cls), wbc);
  check('WBC card shows percent only, no raw delta', !!wbc && !/[+−-]8\b/.test(wbc.text), wbc);
  check('WBC −40% is a "jump" (≥15%)', !!wbc && /tend-insight-delta--jump/.test(wbc.cls), wbc);
  check('insight card never shows the raw lab-value flag text', !!wbc && !/Fuera de rango/.test(wbc.text), wbc);
  const hb = await insight('BH|Hb');
  check('Hb card: +22%, good (low but rising)', !!hb && /\+22%/.test(hb.text) && /tend-insight-delta--good/.test(hb.cls), hb);
  const mcv = await insight('BH|VCM');
  check('MCV 82 → 85 inside normal range is neutral', mcv === null || (/tend-insight-delta--neutral/.test(mcv.cls) && !/--good|--bad/.test(mcv.cls)), mcv);
  const plt = await insight('BH|Plt');
  check('flat PLT shows no change', plt === null, plt);

  // Hide WBC, collapse the QS section.
  await card('BH|Leu').first().hover();
  await card('BH|Leu').first().locator('.tend-row-hide-btn').click();
  await page.waitForTimeout(300);
  check('hidden WBC card is gone', (await card('BH|Leu').count()) === 0);
  const qsToggle = page.locator('.tend-section[data-section="QS"] .tend-section-toggle');
  await qsToggle.click();
  check('QS section collapses', (await qsToggle.getAttribute('aria-expanded')) === 'false');

  const chartCount = () => page.evaluate(() => (typeof Chart === 'function' ? Object.keys(Chart.instances || {}).length : -1));
  const visibleCanvases = () => page.locator('.tend-spark-canvas-cell canvas').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).length);
  const bhToggle = page.locator('.tend-section[data-section="BH"] .tend-section-toggle');
  for (let i = 0; i < 4; i++) {
    await bhToggle.click();
    await page.waitForTimeout(250);
  }
  const charts = await chartCount();
  const canvases = await visibleCanvases();
  check('re-drawing sparks does not leak charts', charts >= 0 && charts <= canvases + 1, { charts, canvases });

  // Toggle two sections back to back with NO wait between clicks: a stale async
  // spark-mount job (bumped mountGen) must bail out instead of drawing into a
  // canvas that no longer belongs to it.
  const qsToggle2 = page.locator('.tend-section[data-section="QS"] .tend-section-toggle');
  await bhToggle.click();
  await qsToggle2.click();
  await bhToggle.click();
  await qsToggle2.click();
  await page.waitForTimeout(600);
  const chartsNoWait = await chartCount();
  const canvasesNoWait = await visibleCanvases();
  check('stale spark mount batch (no wait between toggles) does not leak or duplicate charts',
    chartsNoWait >= 0 && chartsNoWait <= canvasesNoWait + 1, { chartsNoWait, canvasesNoWait });
  check('no page errors after rapid toggling', pageErrors.length === 0, pageErrors.slice(0, 5));

  // Full storage: every write throws. The screen must keep working and warn.
  const warns = [];
  page.on('console', (m) => { if (m.type() === 'warning') warns.push(m.text()); });
  const errsBefore = pageErrors.length;
  await page.evaluate(() => {
    globalThis.__realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
  });
  await card('BH|Hb').first().hover();
  await card('BH|Hb').first().locator('.tend-row-hide-btn').click();
  await bhToggle.click();
  await bhToggle.click();
  await page.waitForTimeout(300);
  const hbHiddenInSession = (await card('BH|Hb').count()) === 0;
  const bhOpenAgain = (await bhToggle.getAttribute('aria-expanded')) === 'true';
  await page.evaluate(() => { Storage.prototype.setItem = globalThis.__realSetItem; });
  check('full storage: hide and re-open still work in this session', hbHiddenInSession && bhOpenAgain, { hbHiddenInSession, bhOpenAgain });
  check('full storage: no crash, a "failed to write" warning', pageErrors.length === errsBefore && warns.some((w) => /failed to write/.test(w)),
    { newErrors: pageErrors.slice(errsBefore), warns: warns.slice(0, 3) });
  // Hb stays hidden only in memory; put it back so the restart check is clean.
  // (Hb re-shown below by "Mostrar todos".)

  // ── Detail chart + events ────────────────────────────────────────────────
  await page.waitForTimeout(800);
  await card('BH|Plt').first().scrollIntoViewIfNeeded();
  await card('BH|Plt').first().click({ position: { x: 20, y: 24 } });
  let detail = page.locator('#tend-detail-backdrop');
  await detail.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  const band = await page.evaluate(() => {
    const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
    return c && c.options.plugins.tendRefBand;
  });
  check('detail chart has the normal band 142–424', !!band && band.display === true && band.lo === 142 && band.hi === 424, band);
  // 03/01 has two draws (08:00, 15:00), same PLT 100: both stay as points, labels carry the date only.
  const pltLabels = await page.evaluate(() => Chart.getChart(document.getElementById('tend-detail-canvas')).data.labels);
  check('detail chart keeps both same-day draws (two 03/01 points), date-only labels', pltLabels.filter((l) => l === '03/01').length === 2 && pltLabels.every((l) => !/\d:\d\d/.test(l)), pltLabels);

  // Pasting labs never auto-creates an eventualidad: the events legend is empty
  // even though this patient already has 10+ pasted lab reports.
  const noAutoEventCount = await page.locator('#tend-detail-events-slot .tend-event-legend-item').count();
  check('no auto eventualidad after pasting labs', noAutoEventCount === 0, noAutoEventCount);

  // Compare overlay: pick another BH analyte in the detail chart, verify a second
  // dataset appears aligned to the primary chart's labels.
  const compareSelect = page.locator('#tend-detail-compare-select');
  if (await compareSelect.count()) {
    const before = await page.evaluate(() => {
      const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
      return c ? c.data.datasets.length : -1;
    });
    await compareSelect.selectOption({ label: /Hb|Hemoglobina/ }).catch(() => compareSelect.selectOption({ index: 1 }));
    await page.waitForTimeout(400);
    const afterCompare = await page.evaluate(() => {
      const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
      return c ? { count: c.data.datasets.length, len0: c.data.labels.length, len1: (c.data.datasets[1] && c.data.datasets[1].data.length) || 0 } : null;
    });
    check('picking a compare analyte adds a second, aligned dataset', before === 1 && !!afterCompare && afterCompare.count === 2 && afterCompare.len1 === afterCompare.len0, { before, afterCompare });
  }

  // Tooltip delta: hover the last real data point, read Chart.js's own tooltip body.
  const tipInfo = await page.evaluate(() => {
    const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
    if (!c) return null;
    const meta = c.getDatasetMeta(0);
    const pts = meta.data.filter((el) => el && Number.isFinite(el.x));
    if (pts.length < 2) return null;
    const el = pts[pts.length - 1];
    return { x: el.x, y: el.y };
  });
  if (tipInfo) {
    const canvasBox = await page.locator('#tend-detail-canvas').boundingBox();
    if (canvasBox) {
      await page.mouse.move(canvasBox.x + tipInfo.x, canvasBox.y + tipInfo.y);
      await page.waitForTimeout(200);
      const tooltipBody = await page.evaluate(() => {
        const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
        return c && c.tooltip && c.tooltip.body ? c.tooltip.body.map((b) => b.lines.join(' ')).join(' | ') : null;
      });
      check('hovering the detail chart shows a Δ tooltip delta', !!tooltipBody && /Δ/.test(tooltipBody), tooltipBody);
    }
  }

  const compose = page.locator('#tend-event-compose-backdrop');
  const toast = (re) => page.locator('.toast', { hasText: re }).first().waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false);
  async function newEvent(kind) {
    await closeToasts(page);
    await page.locator('#tend-detail-add-event').click();
    await compose.waitFor({ state: 'visible' });
    await compose.locator(`.tend-event-kind-pill[data-kind="${kind}"]`).click();
  }
  const save = () => compose.locator('#tend-event-compose-save').click();

  await newEvent('biopsia');
  await save();
  check('biopsia without site is refused', (await toast(/Indica de dónde fue la biopsia/)) && (await compose.isVisible()));
  await compose.locator('#tend-event-compose-biopsia-site').fill('riñón');
  await save();
  check('biopsia saves', await toast(/Eventualidad guardada/));
  await compose.waitFor({ state: 'detached' }).catch(() => {});

  await newEvent('procedimiento');
  await save();
  check('procedimiento without text is refused', await toast(/Describe el procedimiento/));
  await compose.locator('#tend-event-compose-procedimiento-text').fill('toracocentesis');
  await save();
  await compose.waitFor({ state: 'detached' }).catch(() => {});

  const legend = page.locator('#tend-detail-events-slot');
  const legendState = () =>
    legend.evaluate((el) => ({
      days: [...el.querySelectorAll('.tend-event-legend-item')].map((d) => ({
        date: d.querySelector('.tend-event-legend-date')?.textContent.trim(),
        tags: [...d.querySelectorAll('.tend-event-tag')].map((t) => (t.getAttribute('title') || t.textContent).trim()),
      })),
    }));
  let lg = await legendState();
  await r.shot(page, 'events-two');
  check('two events of one day share one day row', lg.days.length === 1 && lg.days[0].tags.length === 2, lg);
  check('event date has no draw time', lg.days.length === 1 && !/\d:\d\d/.test(lg.days[0].date || ''), lg);
  check('texts saved in capitals', flat(JSON.stringify(lg)).includes('RIÑÓN') && flat(JSON.stringify(lg)).includes('TORACOCENTESIS'), lg);

  // Edit the biopsia into a platelet transfusion.
  await closeToasts(page);
  await legend.locator('.tend-event-tag--biopsia .tend-event-tag__edit').click();
  await compose.waitFor({ state: 'visible' });
  const editTitle = await compose.locator('#tend-event-compose-title').innerText();
  const prefilled = await compose.locator('#tend-event-compose-biopsia-site').inputValue();
  check('edit opens filled: "Editar eventualidad", site RIÑÓN', /Editar eventualidad/.test(editTitle) && /RIÑÓN/i.test(prefilled), { editTitle, prefilled });
  await compose.locator('.tend-event-kind-pill[data-kind="transfusion"]').click();
  await compose.locator('.tend-event-product-pill[data-product="plaquetas"]').click();
  await compose.locator('#tend-event-compose-transfusion-detail').fill('1 pool');
  await save();
  check('edit saves as update', await toast(/Eventualidad actualizada/));
  await compose.waitFor({ state: 'detached' }).catch(() => {});
  lg = await legendState();
  const tags = lg.days.flatMap((d) => d.tags).join(' | ');
  check('edit replaced the biopsia (still 2 events, PLAQUETAS — 1 POOL)', lg.days.flatMap((d) => d.tags).length === 2 &&
    /PLAQUETAS — 1 POOL/.test(tags) && !/RIÑÓN/.test(tags), lg);

  // Delete: Cancel keeps it, Eliminar removes it.
  const confirmDlg = page.locator('.wb-confirm-modal').filter({ hasText: '¿Eliminar esta eventualidad?' });
  await legend.locator('.tend-event-tag--procedimiento .tend-event-tag__del').click();
  await confirmDlg.waitFor({ state: 'visible' });
  await confirmDlg.locator('[data-wb-confirm-cancel]').click();
  await page.waitForTimeout(300);
  check('Cancel keeps the event', (await legendState()).days.flatMap((d) => d.tags).length === 2);
  await legend.locator('.tend-event-tag--procedimiento .tend-event-tag__del').click();
  await confirmDlg.waitFor({ state: 'visible' });
  await confirmDlg.locator('[data-wb-confirm-ok]').click();
  check('Eliminar deletes it', (await toast(/Eventualidad eliminada/)) && (await legendState()).days.flatMap((d) => d.tags).length === 1);
  await newEvent('otro');
  await save();
  check('"Otro" saves with no detail, as OTRO', (await toast(/Eventualidad guardada/)) &&
    (await legendState()).days.flatMap((d) => d.tags).some((t) => /OTRO/.test(t)), await legendState());
  await compose.waitFor({ state: 'detached' }).catch(() => {});
  await r.shot(page, 'events-after-delete');

  // A 3rd event on the same day, for the "3 tags on one day" PNG column-width check below.
  await newEvent('procedimiento');
  await compose.locator('#tend-event-compose-procedimiento-text').fill('cateterismo');
  await save();
  await compose.waitFor({ state: 'detached' }).catch(() => {});

  await closePane();
  await detail.waitFor({ state: 'hidden' }).catch(() => {});

  // Pane close rules: selected row tint, compact list, Esc, click the selected row again, X.
  await card('BH|Plt').first().click({ position: { x: 20, y: 24 } });
  await detail.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  check('selected row is tinted while the pane is open', await card('BH|Plt').first().evaluate((e) => e.classList.contains('is-selected')));
  check('list narrows to ~410px while the pane is open', await page.locator('#tendencias-container').evaluate((e) => e.getBoundingClientRect().width < 430));
  check('compact rows hide the Estado column', !(await card('BH|Plt').first().locator('.tend-row-status').isVisible()));
  check('pane shows «Rango de referencia» and readings', /Rango de referencia/.test(await page.locator('#tend-detail-ref').innerText()) && (await page.locator('#tend-detail-readings .tend-rd-row').count()) > 2);
  const pane = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#tend-detail-readings .tend-rd-row:not(.tend-rd-head)')].map((r) => [...r.children].map((c) => c.textContent.trim()));
    return {
      badge: document.getElementById('tend-detail-badge').textContent.trim(),
      hero: document.getElementById('tend-detail-hero').textContent.trim(),
      range: document.getElementById('tend-detail-ref').textContent.trim(),
      rows,
    };
  });
  const num = (t) => Number(String(t).replace('−', '-').replace(/[^\d.+-]/g, ''));
  check('detail badge is a word + arrow from the range (▼ Bajo / ▲ Alto / En rango)', /^(▼ Bajo|▲ Alto|En rango)$/.test(pane.badge), pane.badge);
  check('detail readings: newest first, each change = value minus the previous reading, oldest has none',
    pane.rows.length > 2 && pane.rows.slice(0, -1).every((r, i) => Math.abs(num(r[2]) - (num(r[1]) - num(pane.rows[i + 1][1]))) < 0.011) && pane.rows.at(-1)[2] === '—', pane.rows);
  check('detail hero names the change since the previous reading only when the value moved', /desde el/.test(pane.hero) === (num(pane.rows[0][2]) !== 0), { hero: pane.hero, first: pane.rows[0] });
  await page.keyboard.press('Escape');
  await detail.waitFor({ state: 'hidden' });
  check('Esc closes the pane', true);
  await card('BH|Plt').first().click({ position: { x: 20, y: 24 } });
  await detail.waitFor({ state: 'visible' });
  await card('BH|Plt').first().click({ position: { x: 20, y: 24 } });
  await detail.waitFor({ state: 'hidden' });
  check('clicking the selected row again closes the pane', true);
  await card('BH|Plt').first().click({ position: { x: 20, y: 24 } });
  await detail.waitFor({ state: 'visible' });
  await closePane();
  await detail.waitFor({ state: 'hidden' });
  check('X closes the pane', true);

  // Estudio pane: scale toggle Valores | Relativa al rango.
  await page.locator('.tend-section-chart-btn:visible').first().click();
  await page.locator('#tend-group-backdrop').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  const chartInfo = () => page.evaluate(() => {
    const cs = [...document.querySelectorAll('#tend-group-panel-charts canvas')].map((cv) => Chart.getChart(cv)).filter(Boolean);
    const first = cs[0];
    return {
      charts: cs.length,
      datasets: cs.reduce((n, c) => n + c.data.datasets.length, 0),
      allRel: cs.every((c) => c.data.datasets.every((d) => !!d.relRef)),
      tick: first ? String(first.options.scales.y.ticks.callback(50)) : '',
      noRef: [...document.querySelectorAll('.tend-group-rel-note')].map((n) => n.textContent),
      yBounds: cs.map((c) => [c.scales.y.min, c.scales.y.max]),
      series: cs.flatMap((c) => c.data.datasets.map((d) => ({ k: (((c.canvas.closest('[data-panel-family]') || {}).dataset || {}).panelFamily) + '|' + d.label, data: d.data.map((p) => (p && typeof p === 'object' ? p.y : p)), ref: d.relRef || null }))),
    };
  });
  const valuesInfo = await chartInfo();
  check('estudio defaults to «Valores» scale', (await page.locator('#tend-group-panel-charts [data-scale="values"]').getAttribute('aria-pressed')) === 'true' && !valuesInfo.allRel, valuesInfo);
  await page.locator('#tend-group-panel-charts [data-scale="relative"]').click();
  await page.waitForTimeout(600);
  const relInfo = await chartInfo();
  check('relative scale: every plotted analyte has a range and the axis is in %', relInfo.charts > 0 && relInfo.allRel && /%/.test(relInfo.tick), relInfo);
  check('relative y axis always spans 0 to 100', relInfo.yBounds.every(([lo, hi]) => lo <= 0 && hi >= 100), relInfo.yBounds);
  // 0 = low limit, 100 = high limit, blanks stay blank.
  const relMismatch = relInfo.series.filter((r) => {
    const v = valuesInfo.series.find((x) => x.k === r.k);
    if (!v || !r.ref || v.data.length !== r.data.length) return true;
    return r.data.some((y, i) => {
      const raw = v.data[i];
      if (raw == null || y == null) return (raw == null) !== (y == null);
      return Math.abs(y - ((raw - r.ref[0]) / (r.ref[1] - r.ref[0])) * 100) > 0.01;
    });
  });
  check('relative scale maps each value to 0 (low limit) .. 100 (high limit), blanks kept', relInfo.series.length > 0 && relMismatch.length === 0, relMismatch.slice(0, 2));
  const skippedCount = relInfo.noRef.reduce((n, t) => n + t.replace(/^[^:]*:\s*/, '').split(',').length, 0);
  check('relative scale: analytes without a range are named in a note, none silently lost', relInfo.datasets + skippedCount === valuesInfo.datasets, { valuesInfo, relInfo });
  check('relative scale hides «+ Umbral»', (await page.locator('#tend-group-panel-charts .tend-group-threshold-add-btn').count()) === 0);
  await page.locator('#tend-group-panel-charts [data-scale="values"]').click();
  await page.waitForTimeout(400);
  check('back to «Valores» restores the raw axis', !(await chartInfo()).allRel);
  await page.keyboard.press('Escape');
  await page.locator('#tend-group-backdrop').waitFor({ state: 'hidden' });

  // New draws added here (after the insight-card checks above, which read the
  // latest Leu/Hb/Plt) so they don't shift what "latest" means for those checks.
  // (#btn-lab-paste lives on the Labs inner tab; openTend() above switched to
  // the Tendencias inner tab, where it's hidden — switch back first.)
  await page.locator('#lab-inner-labs-btn').click();
  await page.locator('#btn-lab-repo-batch').waitFor({ state: 'visible' });
  // A 2nd GASES draw makes GASES eligible for its own Tendencias por Grupo chart.
  await pasteAndSave(page, gas(P, 'Jan 10 2026 8:00AM', '7.30'));
  // Same-day full draw + later partial draw: groupByDay must take each field from
  // its own draw (Hb from the full one, Plt from the later partial one).
  await pasteAndSave(page, cbc(P, 'Jan 11 2026 8:00AM', { wbc: 14, hgb: 8, plt: 120, mcv: 83 }));
  await pasteAndSave(page, pltOnly(P, 'Jan 11 2026 3:00PM', 90));
  await openTend();

  // ── Tendencias por Grupo: multi-analyte chart + table for one section ────
  await closeToasts(page);
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  const groupModal = page.locator('#tend-group-backdrop');
  await groupModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const panelFamily = (fam) => page.locator(`.tend-group-panel-card[data-panel-family="${fam}"]`);
  // Gráficas B: one chart tab per panel family, only the active family's card renders.
  const famTabs = () => page.locator('.tend-chart-tab[data-panel-family]').evaluateAll((els) => els.map((e) => e.getAttribute('data-panel-family')));
  const openFam = async (fam) => {
    const tab = page.locator(`.tend-chart-tab[data-panel-family="${fam}"]`);
    if (!(await tab.count()) || (await tab.getAttribute('aria-selected')) === 'true') return;
    await tab.click();
    await page.waitForTimeout(400);
  };
  let famList = await famTabs();
  await r.shot(page, 'group-modal-bh');
  check('BH group chart splits into absolute + quality panels', famList.includes('bh-absolute') && famList.includes('bh-quality'), famList);
  check('BH default panel order: absolute, quality, diff-manual, coag', famList.join(',') === 'bh-absolute,bh-quality,bh-diff-manual,bh-coag', famList);
  const defaultColors = await panelFamily('bh-absolute').locator('canvas').first().evaluate((cv) => {
    const c = Chart.getChart(cv);
    return c ? c.data.datasets.map((d) => String(d.borderColor)) : [];
  });
  check('default series colours: the first 8 series of a panel are all different', defaultColors.length > 1 && new Set(defaultColors.slice(0, 8)).size === Math.min(8, defaultColors.length), defaultColors);

  // Hide a panel; "Mostrar todo" brings it back.
  await openFam('bh-quality');
  await panelFamily('bh-quality').hover();
  await panelFamily('bh-quality').locator('.tend-group-panel-eye').click();
  await page.waitForTimeout(300);
  check('hidden panel disappears from the chart grid', (await panelFamily('bh-quality').count()) === 0 && !(await famTabs()).includes('bh-quality'));
  const showAllPanels = page.locator('.tend-group-panels-show-all');
  check('hidden-panels bar offers "Mostrar todo"', await showAllPanels.isVisible().catch(() => false));
  await showAllPanels.click().catch(() => {});
  await openFam('bh-quality');
  await panelFamily('bh-quality').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  await r.shot(page, 'group-modal-show-all');
  check('"Mostrar todo" brings the quality panel back', (await panelFamily('bh-quality').count()) === 1);

  // Per-panel "Ocultar eventos": toggles that one panel's event markers, tracked
  // on the Chart.js instance itself (chart._tendEventsHidden).
  await openFam('bh-quality');
  const qualityCanvas = panelFamily('bh-quality').locator('canvas').first();
  const eventsToggleBtn = panelFamily('bh-quality').locator('.tend-group-panel-events-toggle');
  if (await eventsToggleBtn.count()) {
    const readHidden = () => qualityCanvas.evaluate((cv) => {
      const c = Chart.getChart(cv);
      return c ? !!c._tendEventsHidden : null;
    });
    const before = await readHidden();
    await eventsToggleBtn.click();
    await page.waitForTimeout(200);
    const afterOn = await readHidden();
    const ariaOn = await eventsToggleBtn.getAttribute('aria-pressed');
    await eventsToggleBtn.click();
    await page.waitForTimeout(200);
    const afterOff = await readHidden();
    check('"Ocultar eventos" toggles that one panel\'s events on/off', before === false && afterOn === true && ariaOn === 'true' && afterOff === false,
      { before, afterOn, ariaOn, afterOff });

    // Prefs that persist across a close/reopen of the modal: "Ocultar eventos" state,
    // a changed series color, and a renamed panel title.
    await eventsToggleBtn.click();
    await page.waitForTimeout(200);
    await openFam('bh-absolute');
    const absLegendColorInput = panelFamily('bh-absolute').locator('.tend-group-legend-color[data-field="Leu"]');
    await absLegendColorInput.evaluate((el) => { el.value = '#123456'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(200);
    await openFam('bh-quality');
    const qualityTitle = panelFamily('bh-quality').locator('[contenteditable]').first();
    if (await qualityTitle.count()) {
      await qualityTitle.click();
      await qualityTitle.evaluate((el) => { el.textContent = 'Calidad TEST'; });
      await qualityTitle.evaluate((el) => el.blur());
    }
    await page.waitForTimeout(300);
    await closePane();
    await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
    await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
    await groupModal.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    await openFam('bh-quality');
    const eventsHiddenAfterReopen = await panelFamily('bh-quality').locator('canvas').first().evaluate((cv) => {
      const c = Chart.getChart(cv);
      return c ? !!c._tendEventsHidden : null;
    });
    check('"Ocultar eventos" persists after reopen', eventsHiddenAfterReopen === true, eventsHiddenAfterReopen);
    await openFam('bh-absolute');
    const colorAfterReopen = await panelFamily('bh-absolute').locator('.tend-group-legend-color[data-field="Leu"]').inputValue();
    check('a changed series color persists after reopen', colorAfterReopen.toLowerCase() === '#123456', colorAfterReopen);
    await openFam('bh-quality');
    const titleAfterReopen = flat(await panelFamily('bh-quality').locator('[contenteditable]').first().innerText().catch(() => ''));
    check('a renamed panel title persists after reopen', titleAfterReopen === 'Calidad TEST', titleAfterReopen);
    // Undo the rename so DEFAULT_PANEL_LABELS.gases ("Gasometría") stays the reference
    // default for any later check that assumes stock panel titles.
    await openFam('bh-quality');
    const qualityTitle2 = panelFamily('bh-quality').locator('[contenteditable]').first();
    if (await qualityTitle2.count()) {
      await qualityTitle2.click();
      await qualityTitle2.evaluate((el) => { el.textContent = 'Calidad eritrocitaria (índices)'; });
      await qualityTitle2.evaluate((el) => el.blur());
      await page.waitForTimeout(200);
    }
  }
  // UNREACHABLE from this file: clampTagBoxX's edge-clamping and the bucket
  // kind→color pick (pickHigherPriorityKind) only affect pixels drawn straight
  // into the canvas 2D context by createTendEventMarkerPlugin — nothing DOM
  // exposes the drawn box position or chosen color to assert against. Same for
  // the "2-draw-day, marker only on the first index" rule (mapEventMarkersToChartIndices) —
  // it changes which array index gets a canvas dot, not any DOM/JS state.
  // inferEventualidadKind (biopsia parsed from free text) belongs to the Guardia
  // handoff screen, not Tendencias — real coverage for it lives in guardia-handoff.e2e.mjs.

  // A threshold line takes effect on the panel's next render (y-scale is fixed at chart creation).
  // (Guard on the modal/panel still being there: a prior render hiccup must not abort the rest of the run.)
  await openFam('bh-absolute');
  const absPanel = panelFamily('bh-absolute');
  if ((await groupModal.isVisible().catch(() => false)) && (await absPanel.count())) {
    const thresholdBtn = absPanel.locator('.tend-group-threshold-add-btn');
    if (await thresholdBtn.count()) {
      await thresholdBtn.click();
      await absPanel.locator('.tend-group-threshold-field-select').selectOption('Leu');
      await absPanel.locator('.tend-group-threshold-value-input').fill('30');
      await absPanel.locator('.tend-group-threshold-submit-btn').click();
      check('threshold chip appears (Leu: 30)', /Leu.*30|30.*Leu/i.test(await absPanel.locator('.tend-group-threshold-chips').innerText()));
    }
  }
  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  await openFam('bh-absolute');
  const yMaxAfterThreshold = await panelFamily('bh-absolute').locator('canvas').first().evaluate((cv) => {
    const c = Chart.getChart(cv);
    return c && c.options.scales.y.max;
  });
  check('threshold at 30 pushes the Y axis past the data (WBC tops at 22)', typeof yMaxAfterThreshold === 'number' && yMaxAfterThreshold > 30, yMaxAfterThreshold);

  // A threshold BELOW the data max must not shrink the axis under the data.
  await openFam('bh-absolute');
  const absPanel2 = panelFamily('bh-absolute');
  if ((await groupModal.isVisible().catch(() => false)) && (await absPanel2.count())) {
    const thresholdBtn2 = absPanel2.locator('.tend-group-threshold-add-btn');
    if (await thresholdBtn2.count()) {
      await thresholdBtn2.click();
      await absPanel2.locator('.tend-group-threshold-field-select').selectOption('Hb');
      await absPanel2.locator('.tend-group-threshold-value-input').fill('5');
      await absPanel2.locator('.tend-group-threshold-submit-btn').click();
      await page.waitForTimeout(300);
    }
  }
  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  await openFam('bh-absolute');
  const yMaxWithLowThreshold = await panelFamily('bh-absolute').locator('canvas').first().evaluate((cv) => {
    const c = Chart.getChart(cv);
    return c && c.options.scales.y.max;
  });
  check('a threshold below the data max keeps the Y axis at/above the data max', typeof yMaxWithLowThreshold === 'number' && yMaxWithLowThreshold >= 22, yMaxWithLowThreshold);

  // Removing a threshold chip drops it, and it stays removed after a reopen.
  await openFam('bh-absolute');
  const absPanel3 = panelFamily('bh-absolute');
  if ((await groupModal.isVisible().catch(() => false)) && (await absPanel3.count())) {
    await absPanel3.locator('.tend-group-threshold-chip', { hasText: 'Hb' }).locator('.tend-group-threshold-chip-remove').first().click().catch(() => {});
    const hbChipGone = () => absPanel3.locator('.tend-group-threshold-chips').innerText().then((t) => !/Hb.*5\b|5\b.*Hb/i.test(t));
    check('removing a threshold chip drops it', await hbChipGone());
    await closePane();
    await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
    await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
    await groupModal.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    check('a removed threshold stays removed after reopen', await hbChipGone());
  }

  // bh-coag legend: unchecking a field drops the day-columns whose only value was that field.
  // Jan 8/9 2026 have Fib only (no TP/TTP/INR); Jan 6/7 have TP/TTP/INR (no Fib).
  await openFam('bh-coag');
  const coagPanel = panelFamily('bh-coag');
  let beforeLabels = null;
  if ((await groupModal.isVisible().catch(() => false)) && (await coagPanel.count())) {
    const coagCanvas = coagPanel.locator('canvas').first();
    const labelCount = () => coagCanvas.evaluate((cv) => {
      const c = Chart.getChart(cv);
      return c ? c.data.labels.length : null;
    });
    beforeLabels = await labelCount();
    const fibCheck = coagPanel.locator('.tend-group-legend-check[data-field="Fib"]');
    await fibCheck.uncheck();
    await page.waitForTimeout(300);
    const afterUncheck = await labelCount();
    check('unchecking Fib in bh-coag legend drops the two Fib-only day columns', beforeLabels != null && afterUncheck === beforeLabels - 2, { beforeLabels, afterUncheck });
    await fibCheck.check();
    await page.waitForTimeout(300);
    const afterRecheck = await labelCount();
    check('re-checking Fib restores the columns', afterRecheck === beforeLabels, { beforeLabels, afterRecheck });
  }

  // A stored visibleFields set with no field present in the current data must fall back to showing all fields.
  // Prefs are keyed by the real numeric activeId, not the exp string — pull it
  // from a map the app already wrote via the real "hide bh-quality" click above.
  const realGroupKey = await page.evaluate(() => {
    const map = JSON.parse(localStorage.getItem('rpc-tend-group-panel-hidden') || '{}');
    return Object.keys(map)[0] || null;
  });
  await page.evaluate((groupKey) => {
    const map = JSON.parse(localStorage.getItem('rpc-tend-group-visible') || '{}');
    map[groupKey] = ['NoSuchField'];
    localStorage.setItem('rpc-tend-group-visible', JSON.stringify(map));
  }, realGroupKey);
  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  // isLegendFieldVisible checks per-field membership (so Fib's own checkbox stays
  // unchecked, since "Fib" isn't in the stale set) — the real fallback is in
  // rebuildPanelColumns: when NO field matches, it shows every field's columns
  // instead of an empty chart. Same column count as the untouched baseline above.
  await openFam('bh-coag');
  const coagPanel2 = panelFamily('bh-coag');
  const staleFallbackLabels = await coagPanel2.locator('canvas').first().evaluate((cv) => {
    const c = Chart.getChart(cv);
    return c ? c.data.labels.length : null;
  });
  check('stale visibleFields (no matching field) falls back to showing all fields', staleFallbackLabels === beforeLabels, { beforeLabels, staleFallbackLabels });
  await page.evaluate(() => localStorage.removeItem('rpc-tend-group-visible'));

  // Table tab: "agrupar por día" collapses 03/01's two draws (8am WBC 22, 3pm WBC 20) into the later one.
  await page.locator('.tend-group-tab[data-tab="table"]').click();
  const groupTable = page.locator('#tend-group-table');
  await groupTable.waitFor({ state: 'visible' });
  const headerTexts = await groupTable.locator('thead th').allTextContents();
  check('group table column headers show no time', headerTexts.every((h) => !/\d{1,2}:\d\d/.test(h)), headerTexts);
  const dayModeInput = page.locator('#tend-group-daymode-input');
  check('«agrupar por día» is off by default', !(await dayModeInput.isChecked()));
  const colCount = () => groupTable.locator('.tend-group-col-toggle').count();
  const beforeCols = await colCount();
  await dayModeInput.check();
  await page.waitForTimeout(400);
  const afterCols = await colCount();
  check('"agrupar por día" merges same-day columns (03/01 and 11/01, 2 drops)', afterCols === beforeCols - 2, { beforeCols, afterCols });
  const leuRow = groupTable.locator('tr', { hasText: 'Leu' }).first();
  const leuText = flat((await leuRow.count()) ? await leuRow.innerText() : '');
  check('grouped 03/01 keeps the later draw (WBC 20), drops the earlier (22)', /\b20\b/.test(leuText) && !/\b22\b/.test(leuText), leuText);

  // 11/01 has a full draw (Hb 8, Plt 120) then a later same-day partial draw
  // (Plt 90 only): grouped-by-day must take each field from its own draw.
  const hbRow = groupTable.locator('tr', { hasText: 'Hb' }).first();
  const pltRow = groupTable.locator('tr', { hasText: /Plaquetas|Plt/ }).first();
  const hbRowText = flat((await hbRow.count()) ? await hbRow.innerText() : '');
  const pltRowText = flat((await pltRow.count()) ? await pltRow.innerText() : '');
  check('grouped 11/01: Hb comes from the full draw (8)', /\b8(\.0)?\b/.test(hbRowText), hbRowText);
  check('grouped 11/01: Plt comes from the later partial draw (90), not the full draw\'s (120)', /\b90\b/.test(pltRowText) && !/\b120\b/.test(pltRowText), pltRowText);

  // "Ocultar fila": hiding a row marks it is-hidden and drops it from the copied text.
  const leuRowToggle = leuRow.locator('.tend-group-row-toggle button[data-field-key]');
  await leuRowToggle.click();
  await page.waitForTimeout(300);
  check('"Ocultar fila" marks the row is-hidden', /is-hidden/.test((await leuRow.getAttribute('class')) || ''));
  await closeToasts(page);
  await page.locator('[data-onclick="copyTendGroupTableText"]').click();
  await page.locator('.toast', { hasText: /copiad/i }).first().waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  let hiddenRowClip = '';
  try {
    hiddenRowClip = await page.evaluate(() => navigator.clipboard.readText());
  } catch (_e) { void _e; }
  if (hiddenRowClip) {
    check('a hidden row is left out of the copied table text', !/\bLeu\b/.test(hiddenRowClip), hiddenRowClip.slice(0, 200));
  }
  // Hidden rows and «agrupar por día» are saved per patient + section: same after closing and reopening.
  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.locator('.tend-group-tab[data-tab="table"]').click();
  await groupTable.waitFor({ state: 'visible' });
  check('a hidden table row stays hidden after reopen', /is-hidden/.test((await leuRow.getAttribute('class')) || ''));
  check('«agrupar por día» stays on after reopen', await dayModeInput.isChecked());
  // The hidden row itself is now display:none (its own checkbox is unclickable);
  // "Mostrar todo" in the hidden-items bar is the real way back.
  await closeToasts(page);
  await page.locator('.tend-hidden-trigger').click(); // hidden items now sit behind a chip popover
  await page.locator('.tend-group-show-all-btn').click();
  await page.waitForTimeout(300);

  const colsBeforeUncheck = await colCount();
  await dayModeInput.uncheck();
  await page.waitForTimeout(300);
  const colsAfterUncheck = await colCount();
  check('unchecking "agrupar por día" brings the per-draw columns back', colsAfterUncheck === colsBeforeUncheck + 2, { colsBeforeUncheck, colsAfterUncheck });

  // "Tablas Dinámicas" is its own modal (not this one): add an analyte from another
  // section (QS Glu) there; it survives a close/reopen.
  await groupModal.locator('.tend-pane-close').click();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
  await page.locator('.tend-dynamic-table-trigger').click();
  const dynModal = page.locator('#tend-dynamic-table-backdrop');
  await dynModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await dynModal.locator('.tend-analyte-picker-add-btn').click();
  await page.waitForTimeout(200);
  check('analyte picker opens to a study-first screen (no fields yet)',
    (await dynModal.locator('[data-section-key]').count()) > 1 && (await dynModal.locator('[data-field-key]').count()) === 0);
  const pickerBox = await dynModal.locator('.tend-analyte-picker-dropdown').boundingBox();
  const modalBox = await dynModal.boundingBox();
  check('picker dropdown is anchored inside the modal (not off-screen)',
    !!pickerBox && !!modalBox && pickerBox.x >= modalBox.x - 4 && pickerBox.x + pickerBox.width <= modalBox.x + modalBox.width + 4,
    { pickerBox, modalBox });
  const dynPickerBH = dynModal.locator('[data-section-key="BH"]');
  if (await dynPickerBH.count()) {
    await dynPickerBH.first().click();
    await page.waitForTimeout(200);
    const backBtn = dynModal.locator('.tend-analyte-picker-back');
    check('picking a study shows its fields, with a back button', (await backBtn.count()) > 0 && (await dynModal.locator('[data-field-key]').count()) > 0);
    await backBtn.click();
    await page.waitForTimeout(200);
    check('back button returns to the study list, fields still pickable', (await dynModal.locator('[data-section-key]').count()) > 1 && (await dynModal.locator('[data-field-key]').count()) === 0);
  }
  const dynPickerStudy = dynModal.locator('[data-section-key="QS"]');
  if (await dynPickerStudy.count()) {
    await dynPickerStudy.first().click();
    const dynGluField = dynModal.locator('[data-field-key="Glu"]');
    if (await dynGluField.count()) {
      await dynGluField.first().click();
      await page.waitForTimeout(300);
      check('Tablas Dinámicas: cross-section analyte (QS Glu) added', /Glu/.test(flat(await dynModal.innerText())));
      const gluRow = dynModal.locator('tr', { hasText: 'Glu' }).first();
      const gluRowText = flat((await gluRow.count()) ? await gluRow.innerText() : '');
      check('cross-section row shows its own section\'s value (Glu 94)', /\b94\b/.test(gluRowText), gluRowText);
      await dynModal.locator('.tend-pane-close').click();
      await dynModal.waitFor({ state: 'hidden' }).catch(() => {});
      await page.locator('.tend-dynamic-table-trigger').click();
      await dynModal.waitFor({ state: 'visible' });
      await page.waitForTimeout(300);
      check('extra analyte survives closing and reopening Tablas Dinámicas', /Glu/.test(flat(await dynModal.innerText())));

      // An extra whose field no longer resolves in the current catalog (renamed/removed)
      // is dropped silently: no thrown error, the still-valid extra (Glu) keeps rendering.
      await dynModal.locator('.tend-pane-close').click();
      await dynModal.waitFor({ state: 'hidden' }).catch(() => {});
      const pageErrorsBeforeStaleExtra = [];
      const onPageError = (err) => pageErrorsBeforeStaleExtra.push(String(err));
      page.on('pageerror', onPageError);
      await page.evaluate(() => {
        const map = JSON.parse(localStorage.getItem('rpc-tend-group-extra-fields') || '{}');
        const key = Object.keys(map).find((k) => k.endsWith('|__DYNAMIC__'));
        if (key) map[key].push({ sectionKey: 'QS', fieldKey: 'NoSuchField' });
        localStorage.setItem('rpc-tend-group-extra-fields', JSON.stringify(map));
      });
      await page.locator('.tend-dynamic-table-trigger').click();
      await dynModal.waitFor({ state: 'visible' });
      await page.waitForTimeout(300);
      page.off('pageerror', onPageError);
      check('a stale extra that no longer resolves is dropped with no page error', pageErrorsBeforeStaleExtra.length === 0, pageErrorsBeforeStaleExtra);
      check('the still-valid extra (Glu) keeps rendering next to the dropped one', /Glu/.test(flat(await dynModal.innerText())) && !/NoSuchField/.test(flat(await dynModal.innerText())));

      // Tablas Dinámicas has its own copy actions, distinct from the group modal's.
      await closeToasts(page);
      await dynModal.locator('[data-onclick="copyTendDynamicTableText"]').click();
      const dynCopiedToast = await page.locator('.toast', { hasText: /copiad/i }).first().waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false);
      check('Tablas Dinámicas "Copiar como texto" confirms with a toast', dynCopiedToast);
      await closeToasts(page);
      await dynModal.locator('[data-onclick="copyTendDynamicTablePng"]').click();
      const dynPngToast = await page.locator('.toast', { hasText: /copiad|imagen|png/i }).first().waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false);
      check('Tablas Dinámicas "Copiar" (PNG) confirms with a toast', dynPngToast);

      // __DYNAMIC__ extras are isolated from real sections: the QS Glu column
      // added here must not leak into the BH group modal's own extras.
      await dynModal.locator('.tend-pane-close').click();
      await dynModal.waitFor({ state: 'hidden' }).catch(() => {});
      await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
      await groupModal.waitFor({ state: 'visible' });
      await page.waitForTimeout(300);
      check('BH group modal does not inherit the __DYNAMIC__ extra (QS Glu)', !/Glu/.test(flat(await groupModal.innerText())));
      await groupModal.locator('.tend-pane-close').click();
      await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
      await page.locator('.tend-dynamic-table-trigger').click();
      await dynModal.waitFor({ state: 'visible' });
      await page.waitForTimeout(300);
    }
  }
  await dynModal.locator('.tend-pane-close').click();
  await dynModal.waitFor({ state: 'hidden' }).catch(() => {});

  // Pivot pane: tick-in-list. Ticking a row adds its analyte to the table, unticking removes it.
  await page.locator('.tend-dynamic-table-trigger').click();
  await dynModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  const pivotRows = () => dynModal.locator('#tend-group-table tbody tr[data-field]').evaluateAll((trs) => trs.map((t) => t.getAttribute('data-field')));
  const tick = (key) => page.locator(`.tend-row[data-series-key="${key}"] .tend-row-tick`).locator('visible=true');
  // Glu lives in the QS section, which may be collapsed: open it so its tick is reachable.
  const qsTog = page.locator('.tend-section[data-section="QS"] .tend-section-toggle');
  if ((await qsTog.getAttribute('aria-expanded')) !== 'true') { await qsTog.click(); await page.waitForTimeout(300); }
  const rowsBeforeTick = await pivotRows();
  check('pivot pane shows a checkbox on every list row', (await tick('BH|VCM').count()) === 1 && (await tick('BH|Plt').count()) === 1);
  check('rows already in the table show as ticked when the pane opens', rowsBeforeTick.includes('QS|Glu') ? await tick('QS|Glu').isChecked() : true, rowsBeforeTick);
  await tick('BH|VCM').check();
  await tick('BH|Plt').check();
  await page.waitForTimeout(300);
  const rowsTicked = await pivotRows();
  check('ticking two list rows adds two analyte rows to the pivot table', rowsTicked.includes('BH|VCM') && rowsTicked.includes('BH|Plt') && rowsTicked.length === rowsBeforeTick.length + 2, rowsTicked);
  check('each ticked analyte gets a chip with an accessible «Quitar» button', (await dynModal.locator('.tend-pivot-chip-x[aria-label^="Quitar"]').count()) === rowsTicked.length);
  await tick('BH|VCM').uncheck();
  await page.waitForTimeout(300);
  check('unticking a list row removes its analyte from the table', !(await pivotRows()).includes('BH|VCM'));
  await dynModal.locator('.tend-pivot-chip-x').last().click();
  await page.waitForTimeout(300);
  check('removing a chip unticks the matching list row (both ways in sync)', !(await tick('BH|Plt').isChecked()));
  await card('BH|Plt').first().click({ position: { x: 240, y: 24 } });
  await page.waitForTimeout(300);
  check('row click in pivot mode toggles the row and does not open the analito pane',
    (await tick('BH|Plt').isChecked()) && (await page.locator('#tend-pane').getAttribute('data-mode')) === 'pivot' && !(await page.locator('#tend-detail-backdrop').isVisible()));
  const abnormalCells = await dynModal.locator('#tend-group-table td .tend-val--hi, #tend-group-table td .tend-val--lo').allInnerTexts();
  check('out-of-range cells carry an arrow (same text goes to «Copiar como texto»)', abnormalCells.length > 0 && abnormalCells.every((t) => /^[▼▲] /.test(flat(t))), abnormalCells.slice(0, 4));
  // Esc must close the pane even while a list tick has focus (it is a checkbox, not a text field).
  await tick('BH|VCM').focus();
  await page.keyboard.press('Escape');
  await dynModal.waitFor({ state: 'hidden' }).catch(() => {});
  check('Esc closes the pivot pane while a list tick has focus', !(await dynModal.isVisible()));
  await page.locator('.tend-dynamic-table-trigger').click();
  await dynModal.waitFor({ state: 'visible' });
  await qsTog.click(); // back to collapsed, as the restart checks below expect
  await page.waitForTimeout(300);
  await closePane();
  await dynModal.waitFor({ state: 'hidden' }).catch(() => {});
  check('closing the pane removes the list checkboxes', (await page.locator('.tend-row-tick:visible').count()) === 0);

  // «Agregar a tabla dinámica» from the analito pane opens the pivot pane with that analyte in.
  await card('BH|Plt').first().click({ position: { x: 240, y: 24 } });
  await detail.waitFor({ state: 'visible' });
  await page.locator('#tend-detail-pivot').click();
  await dynModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  check('«Agregar a tabla dinámica» adds the open analyte to the pivot table', (await pivotRows()).includes('BH|Plt') && (await tick('BH|Plt').isChecked()));
  await closePane();
  await dynModal.waitFor({ state: 'hidden' }).catch(() => {});

  // Back to "Tendencias por Grupo" for the date-range/copy checks below.
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.locator('.tend-group-tab[data-tab="table"]').click();
  await page.waitForTimeout(300);

  // Date range filter narrows the table; "Quitar rango" restores it.
  // (#tend-group-range-from/to are hidden inputs behind a custom calendar popover, not <input type="date">.)
  async function pickGroupRangeDate(inputId, iso) {
    await page.locator(`.rpc-date-field:has(#${inputId}) .rpc-date-field__trigger`).click();
    const day = page.locator(`.rpc-date-popover__day[data-iso="${iso}"]`);
    for (let i = 0; i < 24 && !(await day.count()); i++) {
      await page.locator('.rpc-date-popover [data-nav="-1"]').click();
    }
    await day.click();
    await page.locator('.rpc-date-popover').waitFor({ state: 'hidden' }).catch(() => {});
  }
  const fullRowText = flat(await groupTable.innerText());
  await pickGroupRangeDate('tend-group-range-from', '2026-01-05');
  await pickGroupRangeDate('tend-group-range-to', '2026-01-07');
  await page.waitForTimeout(400);
  const narrowedText = flat(await groupTable.innerText());
  check('date range narrows the table (30/12 no longer shown)', narrowedText !== fullRowText && !/30\/12/.test(narrowedText), narrowedText.slice(0, 200));
  const rangeClear = page.locator('#tend-group-range-clear');
  check('"Quitar rango" appears once a range is set', await rangeClear.isVisible());
  await rangeClear.click();
  await page.waitForTimeout(400);
  check('"Quitar rango" restores the full table', /30\/12/.test(flat(await groupTable.innerText())));

  // Boundary days of the range are inclusive: from=06/01 to=09/01 keeps both edge days.
  await pickGroupRangeDate('tend-group-range-from', '2026-01-06');
  await pickGroupRangeDate('tend-group-range-to', '2026-01-09');
  await page.waitForTimeout(400);
  const boundedText = flat(await groupTable.innerText());
  check('date range keeps the "from" boundary day (06/01)', /06\/01/.test(boundedText), boundedText.slice(0, 200));
  check('date range keeps the "to" boundary day (09/01)', /09\/01/.test(boundedText), boundedText.slice(0, 200));
  check('date range excludes a day before the boundary (05/01)', !/05\/01/.test(boundedText), boundedText.slice(0, 200));
  await rangeClear.click();
  await page.waitForTimeout(400);

  // Copy as text carries the event tag on its day.
  await closeToasts(page);
  await page.locator('[data-onclick="copyTendGroupTableText"]').click();
  const copiedToast = await page.locator('.toast', { hasText: /copiad/i }).first().waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false);
  check('"Copiar como texto" confirms with a toast', copiedToast);
  let clipboardText = '';
  try {
    clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  } catch (_e) { void _e; }
  if (clipboardText) {
    check('copied table keeps the event tag on its date column', /\[.*(Plaq|Otro).*\]/i.test(clipboardText), clipboardText.slice(0, 300));
    check('exact "<date> [tag · tag · tag]" header for the multi-event day', /05\/01\/2026 \[[^[\]]+ · [^[\]]+ · [^[\]]+\]/.test(clipboardText), clipboardText.slice(0, 300));
    const noEventCol = clipboardText.split('\t').find((c) => /^30\/12\/2025/.test(c));
    check('a date with no event has no trailing "["', !!noEventCol && !noEventCol.includes('['), noEventCol);
    check('BH copy has no "Interpretación" row (that\'s an LCR-only row)', !/Interpretaci[oó]n/i.test(clipboardText), clipboardText.slice(0, 300));
  }

  // "Copiar" (PNG): the 3-tag day's column must render wide enough to fit its whole tag row.
  await closeToasts(page);
  await page.locator('[data-onclick="copyTendGroupTablePng"]').click();
  const pngToast = await page.locator('.toast', { hasText: /copiad|imagen|png/i }).first().waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false);
  check('group table "Copiar" (PNG) confirms with a toast', pngToast);
  const pngDims = await page.evaluate(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (!type) continue;
        const blob = await item.getType(type);
        const bmp = await createImageBitmap(blob);
        return { width: bmp.width, height: bmp.height };
      }
    } catch { /* clipboard image read unsupported in this run */ }
    return null;
  });
  // 8 visible date columns × a sane per-column minimum, generous enough that a badly
  // clipped 3-tag column (the old bug this covers) would still fail this floor.
  check('PNG table image is wide enough for a 3-tag day column (no silent clip)', !pngDims || pngDims.width >= 700, pngDims);

  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});

  // GASES group chart → its own "gases" panel family. QS group chart → the
  // generic "absolute" panel family (no gases/percent split for chemistry).
  await page.locator('.tend-section[data-section="GASES"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const gasesFamList = await famTabs();
  check('GASES group chart renders the "gases" panel family', gasesFamList.includes('gases'), gasesFamList);
  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});

  await page.locator('.tend-section[data-section="QS"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const qsFamList = await famTabs();
  check('QS group chart renders the generic "absolute" panel family', qsFamList.includes('absolute'), qsFamList);
  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});

  // Reordering panels, the legend, or the spark cards persists after a reopen.
  // (Drag-and-drop is simulated by writing the same prefs Sortable's own
  // "onEnd" handler would write, then re-rendering from that saved order —
  // the real assertion is that the saved order is read back and applied.)
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const bhFamListBeforeReorder = await famTabs();
  await openFam('bh-absolute');
  const bhAbsoluteFieldsBeforeReorder = await panelFamily('bh-absolute').locator('.tend-group-legend-check').evaluateAll((els) => els.map((e) => e.getAttribute('data-field')));
  const reversedFams = bhFamListBeforeReorder.slice().reverse();
  const reversedLegend = bhAbsoluteFieldsBeforeReorder.slice().reverse();
  await page.evaluate(({ fams, legend, groupKey }) => {
    const panelMap = JSON.parse(localStorage.getItem('rpc-tend-group-panel-order') || '{}');
    panelMap[groupKey] = fams;
    localStorage.setItem('rpc-tend-group-panel-order', JSON.stringify(panelMap));
    const legendMap = JSON.parse(localStorage.getItem('rpc-tend-group-legend-order') || '{}');
    legendMap[groupKey + '|bh-absolute'] = legend;
    localStorage.setItem('rpc-tend-group-legend-order', JSON.stringify(legendMap));
  }, { fams: reversedFams, legend: reversedLegend, groupKey: realGroupKey });
  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  await groupModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const bhFamListAfterReorder = await famTabs();
  check('a reordered panel order persists after reopen', bhFamListAfterReorder.join(',') === reversedFams.join(','), { reversedFams, bhFamListAfterReorder });
  await openFam('bh-absolute');
  const bhAbsoluteFieldsAfterReorder = await panelFamily('bh-absolute').locator('.tend-group-legend-check').evaluateAll((els) => els.map((e) => e.getAttribute('data-field')));
  check('a reordered legend persists after reopen', bhAbsoluteFieldsAfterReorder.join(',') === reversedLegend.join(','), { reversedLegend, bhAbsoluteFieldsAfterReorder });
  await closePane();
  await groupModal.waitFor({ state: 'hidden' }).catch(() => {});

  // Same for the spark-card order in one section (BH), and it does not touch other sections.
  // A same-session tab switch takes the cheap DOM-patch path (renderKey and
  // series-key list unchanged), which never re-sorts existing cards — a real
  // drag reorders the DOM directly, the saved order only matters on the next
  // *cold* render. So write it here but only check it after the restart below.
  // Hb and Leu are hidden earlier in the script (restored only by "Mostrar
  // todos" near the end), so read the keys actually rendered right now, not
  // the stale full-set snapshot from before any card was hidden.
  const bhKeysBeforeReorder = (await page.locator('.tend-row[data-series-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-series-key')))).filter((k) => k && k.startsWith('BH|'));
  const reversedCardOrder = bhKeysBeforeReorder.slice().reverse();
  await page.evaluate(({ order, groupKey }) => {
    const map = JSON.parse(localStorage.getItem('rpc-tend-card-order') || '{}');
    map[groupKey] = order;
    localStorage.setItem('rpc-tend-card-order', JSON.stringify(map));
  }, { order: reversedCardOrder, groupKey: realGroupKey });
  const qsKeysBefore = keys.filter((k) => k && k.startsWith('QS|'));

  check('before restart: QS is collapsed', (await page.locator('.tend-section[data-section="QS"] .tend-section-toggle').getAttribute('aria-expanded')) === 'false');

  // ── Restart: hidden card, collapsed section, saved card order and the event persist ──
  await app.close();
  ({ app, page, pageErrors } = await r.launch());
  detail = page.locator('#tend-detail-backdrop'); // the old one points at the closed window
  await page.locator('.topbar-area-btn').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(page);
  await openPatient(page, P);
  await goArea(page, 'lab');
  await openTend();
  await r.shot(page, 'after-restart');
  check('after restart: WBC still hidden', (await card('BH|Leu').count()) === 0);
  check('after restart: QS still collapsed', (await page.locator('.tend-section[data-section="QS"] .tend-section-toggle').getAttribute('aria-expanded')) === 'false');
  const bhKeysAfterReorder = (await page.locator('.tend-row[data-series-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-series-key')))).filter((k) => k && k.startsWith('BH|'));
  // Hb's earlier hide was session-only, so it's back after restart and gets
  // appended after the saved keys — check only the relative order of the
  // keys that were actually in the saved order, not the full, now-longer list.
  const bhKeysAfterReorderSaved = bhKeysAfterReorder.filter((k) => reversedCardOrder.includes(k));
  check('a reordered spark-card order persists after reopen', bhKeysAfterReorderSaved.join(',') === reversedCardOrder.join(','), { reversedCardOrder, bhKeysAfterReorder });
  const qsKeysAfter = (await page.locator('.tend-row[data-series-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-series-key')))).filter((k) => k && k.startsWith('QS|'));
  check('reordering BH cards does not touch QS card order', qsKeysAfter.join(',') === qsKeysBefore.join(','), { qsKeysBefore, qsKeysAfter });
  // Keyboard: Enter on a focused card opens the detail. The card's focus
  // target is its open button (.tend-row-open), not the card div.
  await card('BH|Plt').first().locator('.tend-row-open').focus();
  await page.keyboard.press('Enter');
  check('Enter on a focused card opens the detail', await page.locator('#tend-detail-backdrop').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false));
  await page.waitForTimeout(400);
  const after = await page.locator('#tend-detail-events-slot').innerText();
  check('after restart: the events are still there', /\bPlaq\b/.test(after) && /\bEv\b/.test(after) && !/Toracoc/i.test(after), flat(after));
  await closePane();

  // "Mostrar todos" brings every hidden card back.
  const openHidden = page.locator('.tend-ocultos-trigger').first();
  await openHidden.click();
  const hiddenModal = page.locator('#tend-hidden-modal-backdrop');
  await hiddenModal.waitFor({ state: 'visible' });
  const chips = await page.locator('#tend-hidden-modal-chips [data-series-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-series-key')));
  check('"Analitos ocultos" lists WBC', chips.includes('BH|Leu'), chips);
  await hiddenModal.locator('[data-tend-action="reset-hidden"]').click();
  await page.waitForTimeout(300);
  check('"Mostrar todos" brings WBC back', (await card('BH|Leu').count()) === 1);
  await r.shot(page, 'restored');

  // Leu detail chart: 6 draws with a Leu value (30/12, 02/01, 03/01x2, 05/01,
  // 11/01), the two 03/01 draws stay as distinct points, not merged into one.
  await card('BH|Leu').first().scrollIntoViewIfNeeded();
  await card('BH|Leu').first().click({ position: { x: 20, y: 24 } });
  await detail.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  const leuDetailLabels = await page.evaluate(() => {
    const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
    return c ? c.data.labels : null;
  });
  check('Leu detail chart has 6 points', Array.isArray(leuDetailLabels) && leuDetailLabels.length === 6, leuDetailLabels);
  const jan3Labels = Array.isArray(leuDetailLabels) ? leuDetailLabels.filter((l) => /03\/01/.test(String(l))) : [];
  check('the 2 draws of 03/01 are distinct x-axis points (not merged)', jan3Labels.length === 2, leuDetailLabels);
  check('chart labels on a 2-draw day are date only, no time', jan3Labels.every((l) => !/:\d\d/.test(String(l))), jan3Labels);
  await closePane();
  await detail.waitFor({ state: 'hidden' }).catch(() => {});

  // ── TTP prints its own ref range right after INR, which prints none ──────
  // TP/TTP/INR are hiddenByDefault, same "user hidden" store as WBC above —
  // only visible now that "Mostrar todos" has reset it. (coag cards need a
  // chartable BH|TP/TTP/INR series; skip cleanly if this build does not
  // surface one, instead of aborting the rest of the run.)
  await closeToasts(page);
  const coagCounts = [await card('BH|TP').count(), await card('BH|TTP').count(), await card('BH|INR').count()];
  check('TP, TTP and INR cards are shown after "Mostrar todos" (the band checks below really run)', coagCounts.every((n) => n === 1), coagCounts);
  const tpCard = card('BH|TP');
  if (await tpCard.count()) {
    await tpCard.first().scrollIntoViewIfNeeded();
    await tpCard.first().click({ position: { x: 20, y: 24 } });
    await detail.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await detail.isVisible()) {
      await page.waitForTimeout(400);
      const tpBand = await page.evaluate(() => {
        const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
        return c && c.options.plugins.tendRefBand;
      });
      check('TP keeps its own band 10.25–13.20', !!tpBand && tpBand.lo === 10.25 && tpBand.hi === 13.2, tpBand);
      await closePane();
      await detail.waitFor({ state: 'hidden' }).catch(() => {});
    }
  }
  const ttpCard = card('BH|TTP');
  if (await ttpCard.count()) {
    await ttpCard.first().scrollIntoViewIfNeeded();
    await ttpCard.first().click({ position: { x: 20, y: 24 } });
    await detail.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await detail.isVisible()) {
      await page.waitForTimeout(400);
      const ttpBand = await page.evaluate(() => {
        const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
        return c && c.options.plugins.tendRefBand;
      });
      check('TTP keeps its own band 28.9–34.1', !!ttpBand && ttpBand.lo === 28.9 && ttpBand.hi === 34.1, ttpBand);
      await closePane();
      await detail.waitFor({ state: 'hidden' }).catch(() => {});
    }
  }
  const inrCard = card('BH|INR');
  if (await inrCard.count()) {
    await inrCard.first().scrollIntoViewIfNeeded();
    await inrCard.first().click({ position: { x: 20, y: 24 } });
    await detail.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await detail.isVisible()) {
      await page.waitForTimeout(400);
      const inrBand = await page.evaluate(() => {
        const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
        return c && c.options.plugins.tendRefBand;
      });
      check("INR (no printed range) does not inherit TTP's band", !(inrBand && inrBand.lo === 28.9 && inrBand.hi === 34.1), inrBand);
      await closePane();
      await detail.waitFor({ state: 'hidden' }).catch(() => {});
    }
  }

  // ── Event markers on the Plt detail chart: canvas tag, legend, tooltip, priority ──
  await card('BH|Plt').first().scrollIntoViewIfNeeded();
  await card('BH|Plt').first().click({ position: { x: 20, y: 24 } });
  await detail.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  const composeEv = page.locator('#tend-event-compose-backdrop');
  const addEv = async (iso, kind, fillSel, text) => {
    await closeToasts(page);
    await page.locator('#tend-detail-add-event').click();
    await composeEv.waitFor({ state: 'visible' });
    // the date field is a custom picker over a hidden input; set its value the way a pick does
    await composeEv.locator('#tend-event-compose-date').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, iso);
    await composeEv.locator(`.tend-event-kind-pill[data-kind="${kind}"]`).click();
    if (fillSel) await composeEv.locator(fillSel).fill(text);
    await composeEv.locator('#tend-event-compose-save').click();
    await composeEv.waitFor({ state: 'detached' });
  };
  // first lab day: otro + procedimiento; the 2-draw day (03/01): one biopsia; last day: procedimiento.
  await addEv('2025-12-30', 'otro');
  await addEv('2025-12-30', 'procedimiento', '#tend-event-compose-procedimiento-text', 'sutura');
  await addEv('2026-01-03', 'biopsia', '#tend-event-compose-biopsia-site', 'hígado');
  await addEv('2026-01-11', 'procedimiento', '#tend-event-compose-procedimiento-text', 'drenaje');
  await page.waitForTimeout(400);
  // Spy on the canvas while the chart redraws itself: what the user sees painted as tags.
  const drawn = await page.evaluate(() => {
    const P = CanvasRenderingContext2D.prototype;
    const rec = { texts: [], boxes: [] };
    const { fillText, roundRect } = P;
    P.fillText = function (t, ...a) { rec.texts.push(String(t)); return fillText.call(this, t, ...a); };
    P.roundRect = function (x, y, w, h, ...a) { if (h === 15) rec.boxes.push({ x, w, color: this.fillStyle }); return roundRect.call(this, x, y, w, h, ...a); };
    const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
    c.draw();
    P.fillText = fillText;
    P.roundRect = roundRect;
    return { texts: rec.texts, boxes: rec.boxes.sort((a, b) => a.x - b.x), left: c.chartArea.left, right: c.chartArea.right };
  });
  const tagTexts = drawn.texts.filter((t) => /^(\d+ )?(Ev|Proc|Bx|Transf|Plaq|CE|Plas|AfP)\b/.test(t)).map((t) => t.split(' · ').sort().join('|'));
  check('canvas paints one abbreviated tag per event day, joined by " · "',
    ['Ev|Proc', 'Bx', '1 Plaq|Ev|Proc', 'Proc'].every((t) => tagTexts.includes(t)) && tagTexts.length === 4, tagTexts);
  check('the 2-draw day 03/01 gets ONE marker (first draw only): 4 event days = 4 tags', drawn.boxes.length === 4, drawn.boxes);
  const R = 'rgba(248, 113, 113, 0.9)', A = 'rgba(251, 191, 36, 0.95)', B = 'rgba(96, 165, 250, 0.95)';
  check('marker colour follows kind priority: procedimiento > otro, biopsia, transfusion > otro + procedimiento',
    drawn.boxes.map((b) => b.color).join('|') === [B, A, R, B].join('|'), drawn.boxes.map((b) => b.color));
  check('tags at the first and last day stay inside the chart area (clamped)',
    drawn.boxes.every((b) => b.x >= drawn.left - 0.5 && b.x + b.w <= drawn.right + 0.5), { boxes: drawn.boxes, left: drawn.left, right: drawn.right });
  const legendChips = await page.locator('#tend-detail-events-slot .tend-event-tag').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check('legend rows show the same abbreviations (1 Plaq, Ev, Proc, Bx)',
    ['1 Plaq', 'Ev', 'Proc', 'Bx'].every((t) => legendChips.some((c) => c.startsWith(t))), legendChips);
  check('legend has one row per event day (4)', (await page.locator('#tend-detail-events-slot .tend-event-legend-item').count()) === 4);
  const markerTip = await page.evaluate(async () => {
    const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
    const idx = c.data.labels.findIndex((l) => /05\/01/.test(String(l)));
    const pt = c.getDatasetMeta(0).data[idx];
    const box = c.canvas.getBoundingClientRect();
    return idx < 0 || !pt ? null : { x: box.x + pt.x, y: box.y + pt.y };
  });
  if (markerTip) {
    await page.mouse.move(markerTip.x, markerTip.y);
    await page.waitForTimeout(250);
    const tipText = await page.evaluate(() => {
      const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
      return JSON.stringify([c.tooltip.body, c.tooltip.afterBody, c.tooltip.footer]);
    });
    check('hovering a marker day lists its events in the tooltip (kind: text)', /Transfusión: PLAQUETAS — 1 POOL/.test(tipText) && /Procedimiento: CATETERISMO/.test(tipText), tipText);
  } else check('marker point for 05/01 found on the chart', false);
  await closePane();
  await detail.waitFor({ state: 'hidden' }).catch(() => {});

  // Fib 450 → 600, both further outside 200-400: the "bad" tone (moving away from normal).
  const fibInsight = await insight('BH|Fib');
  check('Fib rising further out of range is "bad", not "good"', !!fibInsight && /tend-insight-delta--up/.test(fibInsight.cls) && /tend-insight-delta--bad/.test(fibInsight.cls), fibInsight);

  // ── Second DEMO patient: tone cases that cross the range ──
  const P2 = { exp: '7000004-4', name: 'DEMO TONO', room: '304' };
  await goArea(page, 'lab');
  await page.locator('#lab-inner-labs-btn').click(); // leave Tendencias: the paste button lives on the Labs view
  await pasteAndSave(
    page,
    [
      cbc(P2, 'Jan 2 2026 8:00AM', { wbc: 15, hgb: 7, plt: 100, mcv: 90 }),
      cbc(P2, 'Jan 3 2026 8:00AM', { wbc: 8, hgb: 6, plt: 300, mcv: 105 }),
    ].join('\n\n')
  );
  await openPatient(page, P2);
  await goArea(page, 'lab');
  await openTend();
  const tone = async (key) => {
    const i = await insight(key);
    return i && i.cls ? i.cls : String(i);
  };
  const hbTone = await tone('BH|Hb');
  check('Hb 7 → 6 (low, falling further): down + bad', /--down/.test(hbTone) && /--bad/.test(hbTone), hbTone);
  const pltTone = await tone('BH|Plt');
  check('PLT 100 → 300 (low into range): up + good', /--up/.test(pltTone) && /--good/.test(pltTone), pltTone);
  const mcvTone = await tone('BH|VCM');
  check('MCV 90 → 105 (in range to high): up + bad', /--up/.test(mcvTone) && /--bad/.test(mcvTone), mcvTone);
  const wbcTone = await tone('BH|Leu');
  check('WBC 15 → 8 (high into range): down + good', /--down/.test(wbcTone) && /--good/.test(wbcTone), wbcTone);
  // OPEN: "<0.01" / "0,08" in a gas value drops the card (pCO2 and Lactato each vanish when their value uses that form). Not proven app bug vs. parser rule; no check until decided.

  // ── Laboratorio inner tabs: Labs | Tendencias | Cultivos ──
  const innerState = async () => {
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      const on = [...document.querySelectorAll('[data-lab-inner]')].filter((b) => b.getAttribute('aria-selected') === 'true').map((b) => b.getAttribute('data-lab-inner'));
      const vis = (id) => { const el = document.getElementById(id); return !!el && !el.hidden; };
      return { on, labs: vis('lab-inner-labs'), tend: vis('lab-inner-tend-mount'), cult: vis('lab-inner-cult-mount') };
    });
  };
  const isOnly = (st, k) => st.on.length === 1 && st.on[0] === k && ['labs', 'tend', 'cult'].every((x) => st[x] === (x === k));
  await page.locator('#lab-inner-cult-btn').click();
  check('Cultivos tab: only its panel shows and its tab is selected', isOnly(await innerState(), 'cult'), await innerState());
  await page.locator('#lab-inner-labs-btn').click();
  check('Labs tab: only its panel shows and its tab is selected', isOnly(await innerState(), 'labs'), await innerState());
  await page.locator('#lab-inner-tend-btn').click();
  check('Tendencias tab: only its panel shows and its tab is selected', isOnly(await innerState(), 'tend'), await innerState());
  await page.keyboard.press('Meta+2');
  check('⌘2 on Laboratorio cycles Tendencias → Cultivos', isOnly(await innerState(), 'cult'), await innerState());
  await page.keyboard.press('Meta+2');
  check('⌘2 again: Cultivos → Labs', isOnly(await innerState(), 'labs'), await innerState());
  await page.keyboard.press('Meta+2');
  check('⌘2 again: Labs → Tendencias', isOnly(await innerState(), 'tend'), await innerState());
  // Leaving Laboratorio from Tendencias: the first tab area does not open on Tendencias / Cultivos.
  await goArea(page, 'nota');
  await page.waitForTimeout(400);
  const notaTab = await page.evaluate(() => {
    const act = (sel) => [...document.querySelectorAll(sel)].map((e) => e.id || e.className).join(',');
    return act('#appcontent-nota [aria-selected="true"]') + ' | ' + act('#appcontent-nota .active') + ' | tendVisible=' + !!document.querySelector('#appcontent-nota .tend-row');
  });
  check('leaving Laboratorio from Tendencias: the note area shows Resumen, not Tendencias/Cultivos', /itab-content-paciente/.test(notaTab) && !/tend|cult/.test(notaTab.split('|')[1]), notaTab);
  await goArea(page, 'lab');
  check('coming back to Laboratorio opens on Labs', isOnly(await innerState(), 'labs'), await innerState());

  // ── LCR: the table and its copy carry a per-day «Interpretación» row (LCR only) ──
  const P3 = { exp: '7000005-5', name: 'DEMO LIQUIDO', room: '305' };
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, [csf(P3, 'Jan 2 2026 8:00AM', { cells: 215, glu: 21, prot: 200 }), csf(P3, 'Jan 3 2026 8:00AM', { cells: 12, glu: 55, prot: 30 })].join('\n\n'));
  await openPatient(page, P3);
  await goArea(page, 'lab');
  await openTend();
  const groupModalP3 = page.locator('#tend-group-backdrop');
  const groupTableP3 = page.locator('#tend-group-table');
  const lcrBtn = page.locator('.tend-section[data-section="LCR"] .tend-section-chart-btn');
  check('LCR section has a group chart button', (await lcrBtn.count()) === 1, await page.locator('.tend-section').evaluateAll((els) => els.map((e) => e.getAttribute('data-section'))));
  if (await lcrBtn.count()) {
    await closeToasts(page);
    await lcrBtn.click();
    await groupModalP3.waitFor({ state: 'visible' });
    await page.locator('.tend-group-tab[data-tab="table"]').click();
    await groupTableP3.waitFor({ state: 'visible' });
    const lcrRows = await groupTableP3.locator('tbody tr').evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, ' ').trim()));
    check('LCR table ends with an «Interpretación» row', /^Interpretaci[oó]n/i.test(lcrRows[lcrRows.length - 1] || ''), lcrRows);
    await closeToasts(page);
    await page.locator('[data-onclick="copyTendGroupTableText"]').click();
    await page.locator('.toast', { hasText: /copiad/i }).first().waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
    let lcrClip = '';
    try { lcrClip = await page.evaluate(() => navigator.clipboard.readText()); } catch (_e) { void _e; }
    if (lcrClip) check('LCR copied table text has the «Interpretación» row', /Interpretaci[oó]n/i.test(lcrClip), lcrClip.slice(0, 300));
    await closePane();
  }

  // ── Homonym rows: LCR Glu and QS Glu share the field key "Glu" (Tablas Dinámicas) ──
  await page.locator('#lab-inner-labs-btn').click();
  // Tendencias lists a series only from its 2nd draw, so QS needs two chemistry draws.
  await pasteAndSave(page, [chemistryOnly(P3, 'Jan 2 2026 8:10AM'), chemistryOnly(P3, 'Jan 3 2026 8:10AM')].join('\n\n'));
  // The same 03/01 report pasted again: the duplicate draw must not add a point.
  await pasteAndSave(page, chemistryOnly(P3, 'Jan 3 2026 8:10AM'));
  await openPatient(page, P3);
  await goArea(page, 'lab');
  await openTend();
  // The LCR-only rows from before the paste stay on screen until the re-render lands: wait for it.
  await page.locator('.tend-section[data-section="QS"]').waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
  const p3Secs =await page.locator('.tend-section').evaluateAll((els) => els.map((e) => e.getAttribute('data-section')));
  check('LCR patient with two chemistry draws shows both LCR and QS sections', p3Secs.includes('LCR') && p3Secs.includes('QS'), p3Secs);
  if (p3Secs.includes('QS')) {
    // QS was left collapsed above (a global pref): open it to reach the Glu row, then fold it back.
    const qsTog3 = page.locator('.tend-section[data-section="QS"] .tend-section-toggle');
    const qsWasClosed = (await qsTog3.getAttribute('aria-expanded')) === 'false';
    if (qsWasClosed) await qsTog3.click();
    await card('QS|Glu').first().click({ position: { x: 20, y: 24 } });
    await page.locator('#tend-detail-backdrop').waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
    const gluLabels = await page.evaluate(() => Chart.getChart(document.getElementById('tend-detail-canvas')).data.labels);
    check('a re-pasted identical draw is not a second point (QS Glu: 02/01, 03/01)', gluLabels.join(',') === '02/01,03/01', gluLabels);
    await closePane();
    if (qsWasClosed) await qsTog3.click();
  }
  await page.locator('.tend-dynamic-table-trigger').click();
  const homDyn = page.locator('#tend-dynamic-table-backdrop');
  await homDyn.waitFor({ state: 'visible' });
  const addPicked = async (section, field) => {
    await homDyn.locator('.tend-analyte-picker-add-btn').click();
    await homDyn.locator(`[data-section-key="${section}"]`).first().click();
    await homDyn.locator(`[data-field-key="${field}"]`).first().click();
    await page.waitForTimeout(300);
  };
  if (p3Secs.includes('QS')) {
    await addPicked('LCR', 'Glu');
    await addPicked('QS', 'Glu');
    const homRows = await homDyn.locator('tbody tr[data-field]').evaluateAll((trs) => trs.map((t) => ({ key: t.getAttribute('data-field'), text: t.innerText.replace(/\s+/g, ' ').trim() })));
    const lcrGlu = homRows.find((x) => x.key === 'LCR|Glu');
    const qsGlu = homRows.find((x) => x.key === 'QS|Glu');
    check('homonym rows: LCR Glu and QS Glu are two separate rows', !!lcrGlu && !!qsGlu, homRows);
    check('homonym rows: each keeps its own section values (LCR 21/55, QS 94)', !!lcrGlu && !!qsGlu && /\b21\b/.test(lcrGlu.text) && /\b55\b/.test(lcrGlu.text) && !/\b94\b/.test(lcrGlu.text) && /\b94\b/.test(qsGlu.text) && !/\b21\b/.test(qsGlu.text), homRows);
  }
  await homDyn.locator('.tend-pane-close').click();
  await homDyn.waitFor({ state: 'hidden' }).catch(() => {});

  // ── LCR panel family: percent analytes (PMN, Linf) stay in the generic "absolute" panel ──
  await lcrBtn.click();
  await groupModalP3.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const lcrFams = await page.locator('.tend-group-panel-card[data-panel-family]').evaluateAll((els) => els.map((e) => ({ fam: e.getAttribute('data-panel-family'), fields: [...e.querySelectorAll('.tend-group-legend-check')].map((c) => c.getAttribute('data-field')) })));
  check('LCR group chart: one generic "absolute" panel (no percent split)', lcrFams.length === 1 && lcrFams[0].fam === 'absolute', lcrFams);
  check('LCR "absolute" panel holds the percent analytes PMN and Linf', !!lcrFams[0] && lcrFams[0].fields.some((f) => /PMN/.test(f)) && lcrFams[0].fields.some((f) => /Linf/.test(f)), lcrFams);
  await closePane();
  await groupModalP3.waitFor({ state: 'hidden' }).catch(() => {});

  // ── New DEMO patient: manual differential + coag extras (Fib, DD) reach Tendencias ──
  const P4 = { exp: '7000006-6', name: 'DEMO DIFERENCIAL', room: '306' };
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(
    page,
    [
      diffCoag(P4, 'Jan 2 2026 8:00AM', { seg: 71, lin: 25, meta: 3, fibv: 405, dd: 2227 }),
      diffCoag(P4, 'Jan 3 2026 8:00AM', { seg: 78, lin: 18, meta: 2, fibv: 450, dd: 1800 }),
      diffCoag(P4, 'Jan 3 2026 3:00PM', { seg: 84, lin: 12, meta: 1, fibv: 520, dd: 1500 }),
    ].join('\n\n')
  );
  await openPatient(page, P4);
  await goArea(page, 'lab');
  await openTend();
  await page.locator('.tend-ocultos-trigger').first().click().catch(() => {});
  await page.locator('#tend-hidden-modal-backdrop [data-tend-action="reset-hidden"]').click().catch(() => {});
  await page.locator('#tend-hidden-modal-backdrop').waitFor({ state: 'hidden' }).catch(() => {});
  const k4 = await page.locator('.tend-row[data-series-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-series-key')));
  const idx4 = (f) => k4.indexOf(`BH|${f}`);
  check('manual differential cards exist: Segmentados (NeuPct), LinPct, Metamielo', idx4('NeuPct') >= 0 && idx4('LinPct') >= 0 && idx4('Metamielo') >= 0, k4);
  check('coag extras cards exist: Fib and DD', idx4('Fib') >= 0 && idx4('DD') >= 0, k4);
  check('card order: RBC comes before Hb', idx4('RBC') >= 0 && idx4('RBC') < idx4('Hb'), k4);
  check('card order: NeuPct comes before Lin and LinPct', idx4('NeuPct') >= 0 && idx4('NeuPct') < idx4('Lin') && idx4('NeuPct') < idx4('LinPct'), k4);
  const cardText = async (f) => flat(await page.locator(`.tend-row[data-series-key="BH|${f}"]`).first().innerText().catch(() => ''));
  const segText = await cardText('NeuPct');
  check('Segmentados card: title and latest value 84', /Segmentados/.test(segText) && /\b84\b/.test(segText), segText);
  check('Metamielo card carries the latest value 1', /\b1\b/.test(await cardText('Metamielo')), await cardText('Metamielo'));
  check('Fib card carries the latest value 520', /\b520\b/.test(await cardText('Fib')), await cardText('Fib'));
  check('DD card carries the latest value 1500', /\b1500\b/.test(await cardText('DD')), await cardText('DD'));

  await closeToasts(page);
  await page.locator('.tend-section[data-section="BH"] .tend-section-chart-btn').click();
  await groupModalP3.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  const fams4 = await page.locator('.tend-group-panel-card[data-panel-family]').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute('data-panel-family'), [...e.querySelectorAll('.tend-group-legend-check')].map((c) => c.getAttribute('data-field'))])));
  const has = (fam, re) => (fams4[fam] || []).some((f) => re.test(f));
  check('BH panel order with all 4 families', Object.keys(fams4).join(',') === 'bh-absolute,bh-quality,bh-diff-manual,bh-coag', Object.keys(fams4));
  check('manual differential (Segmentados, Linfocitos %, Metamielo) lands in "bh-diff-manual"', has('bh-diff-manual', /NeuPct/) && has('bh-diff-manual', /LinPct/) && has('bh-diff-manual', /Metamielo/), fams4);
  check('coag extras (Fib, DD) land in "bh-coag"', has('bh-coag', /Fib/) && has('bh-coag', /DD/), fams4);
  check('Hb and Plt land in "bh-absolute"; Hto and VCM in "bh-quality"', has('bh-absolute', /Hb/) && has('bh-absolute', /Plt/) && has('bh-quality', /Hto/) && has('bh-quality', /VCM/), fams4);
  await page.locator('.tend-group-tab[data-tab="table"]').click();
  await page.locator('#tend-group-table').waitFor({ state: 'visible' });
  const heads4 = await page.locator('#tend-group-table thead th').evaluateAll((ths) => ths.map((t) => t.innerText.replace(/\s+/g, ' ').trim()));
  check('group table headers are date only (2 draws on 03/01, no time)', heads4.filter((h) => /03\/01/.test(h)).length >= 1 && heads4.slice(1).every((h) => !/\d:\d\d/.test(h)), heads4);
  const lab4 = await page.locator('#tend-group-table tbody tr[data-field]').evaluateAll((trs) => Object.fromEntries(trs.map((t) => [t.getAttribute('data-field'), t.querySelector('td').innerText.replace(/\s+/g, ' ').trim()])));
  check('row label: unit once, in brackets ("Hb (g/dL)")', /^Hb \(g\/dL\)$/.test(lab4['BH|Hb'] || ''), lab4);
  check('row label: percent analyte has no duplicated unit ("Segmentados", no "%")', lab4['BH|NeuPct'] === 'Segmentados', lab4);
  await closePane();
  await groupModalP3.waitFor({ state: 'hidden' }).catch(() => {});

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
