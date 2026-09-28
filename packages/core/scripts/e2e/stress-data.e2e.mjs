#!/usr/bin/env node
/* global document, window, Chart, MutationObserver */
/**
 * E2E stress, group 2: DATA INPUT with worst-case input through the real app.
 * Synthetic DEMO patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   SOME lab paste
 *     - Windows \r\n line ends read differently from \n
 *     - extra / trailing tabs and tab-only lines change the values read
 *     - a row with missing columns (no flag, unit, ref) loses its value
 *     - a report cut off mid-row crashes, or saves with no word to the user
 *     - a header with no results creates a patient
 *     - two new patients pasted with no separator: saved as one patient, or
 *       mixed values saved (must be refused: patient-safety rule)
 *     - the same report pasted 5 times in one paste makes more than one set
 *     - junk values ('<0.01' '1,234.5' '' '-' '1e5' '∞' 'NEGATIVO') show as
 *       NaN / Infinity / undefined, or throw
 *     - a 400-row report freezes the UI
 *     - unknown analyte rows are dropped with no word to the user
 *     - '<0.01' / '>1000' lose the sign, or a derived value (eTFG) is computed from them
 *   Tendencias
 *     - 180 daily reports: a paste chunk gets slower as history grows
 *     - the day list loses days, or the Hb detail chart drops the one extreme day
 *     - Tendencias takes too long to open
 *   Cultivos
 *     - 32 cultures with 40-drug antibiograms lose or duplicate rows
 *     - pasting all 32 again duplicates rows
 *     - HTML in a culture comment runs
 *   Manejo
 *     - 45 meds with long doses and odd units: a med is lost or merged
 *     - importing the same list again duplicates meds
 *     - HTML / emoji / NFD in a drug name runs, or is lost
 *   Pendientes
 *     - 110 items: add time climbs (last 10 vs first 10)
 *     - odd text (1 kB, emoji, NFD, RTL/zero-width, HTML, SQL quotes, Δ ≥ µ) is lost or changed
 *     - past (2019) / far-future (2099) due dates are refused or misfiled; dated items sit in «Sin fecha»
 *     - a due date alone (no «Recordarme») toasts a reminder, or «Recordarme» never does
 *   Agenda
 *     - 100 procedures: add time climbs, a block is lost or duplicated
 *     - same-hour blocks paint on top of each other
 *     - odd text in procedure / place is lost or runs as HTML
 *     - a past (2019) or far-future (2099) date saves where the board can never show it
 *   Restart
 *     - any count above changes after a real restart on the same profile
 *   Throughout
 *     - window.__xss is ever set
 *     - any page error
 *
 * Artifact: e2e-artifacts/stress-data/<run-id>/ (report.json + screenshots + timings.json).
 *
 *   node scripts/e2e/stress-data.e2e.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRun, onboardLocalOnly, openPatient, pasteAndSave, closeToasts, dismissLearnHub, goArea } from './harness.mjs';
import { header, TABLE, fullLabs } from './some-fixtures.mjs';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const some = (d, h = '8:00AM') => `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${h}`;
const dmy = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const avg = (a) => Math.round(a.reduce((s, x) => s + x, 0) / Math.max(1, a.length));
const bh = (hgb, extra = '') => 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + `HGB\t\tA\t${hgb}\tg/dL\t12.20 - 18.10\n` + extra;

const ODD_TEXT = [
  ['1 kB', ('DEMO ' + 'TEXTO LARGO '.repeat(85)).trim()],
  ['emoji', 'DEMO 😀 revisar 🩺 mañana'],
  ['NFD', 'DEMO JOSÉ PEÑA'],
  ['RTL/zero-width', 'DEMO ‮OCIXEM‬ ​ZW‍'],
  ['HTML', 'DEMO <img src=x onerror="window.__xss=1"><b>NEGRITA</b>'],
  ['SQL quotes', `DEMO O'BRIEN "EL"; DROP TABLE todos;--`],
  ['symbols', 'DEMO Δ ≥ µ ± ° ½'],
];
const P = (exp, name, room) => ({ exp, name, room });
const TODAY = new Date();

const r = createRun('stress-data');
const { check, shot } = r;
const timings = {};

const listCount = async (page) =>
  Number(((await page.locator('#patient-list').innerText()).match(/PACIENTES\s*(\d+)/i) || [])[1] || -1);
async function openBySearch(page, p) {
  await closeToasts(page);
  await page.locator('#patient-search').fill(p.exp);
  await page.waitForTimeout(400);
  await openPatient(page, p);
  await page.locator('#patient-search').fill('');
}
async function labTab(page) {
  await closeToasts(page);
  await goArea(page, 'lab');
  if (await page.locator('#lab-inner-labs-btn').isVisible().catch(() => false)) await page.locator('#lab-inner-labs-btn').click();
}
async function labDays(page, p) {
  await openBySearch(page, p);
  await labTab(page);
  await page.locator('#lab-history-date-select').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  return page.locator('#lab-history-date-select option').allTextContents();
}
/** Lab sets for one day, split by their "HH:MM" headers. */
async function daySets(page, p, date) {
  const opts = await labDays(page, p);
  if (!opts.includes(date)) return [];
  await page.locator('#lab-history-date-select').selectOption(`day:${date}`);
  await page.waitForTimeout(400);
  const sets = [];
  for (const line of (await page.locator('#lab-output-box').innerText()).split('\n')) {
    if (/^\d{1,2}:\d{2}$/.test(line.trim())) sets.push({ hora: line.trim(), text: '' });
    else if (sets.length) sets[sets.length - 1].text += ' ' + line;
    else sets.push({ hora: '', text: line });
  }
  return sets.map((s) => ({ hora: s.hora, text: flat(s.text) }));
}
const xss = (page) => page.evaluate(() => !!window.__xss);

// ── Fixtures ───────────────────────────────────────────────────────────────
const ATB = ['AMIKACINA', 'AMPICILINA', 'AMP/SULBACTAM', 'AZTREONAM', 'CEFAZOLINA', 'CEFEPIMA', 'CEFOTAXIMA', 'CEFOXITINA',
  'CEFTAZIDIMA', 'CEFTRIAXONA', 'CEFUROXIMA', 'CIPROFLOXACINA', 'CLINDAMICINA', 'COLISTINA', 'DAPTOMICINA', 'DORIPENEM',
  'ERTAPENEM', 'ERITROMICINA', 'FOSFOMICINA', 'GENTAMICINA', 'IMIPENEM', 'LEVOFLOXACINA', 'LINEZOLID', 'MEROPENEM',
  'MINOCICLINA', 'MOXIFLOXACINA', 'NITROFURANTOINA', 'OXACILINA', 'PENICILINA', 'PIP/TAZO', 'RIFAMPICINA', 'TEICOPLANINA',
  'TETRACICLINA', 'TIGECICLINA', 'TOBRAMICINA', 'TRIMET/SULFA', 'VANCOMICINA', 'CEFTOLOZANO/TAZO', 'CEFTAZ/AVIBACTAM', 'ACIDO NALIDIXICO'];
const GERMS = ['Klebsiella pneumoniae', 'Escherichia coli', 'Pseudomonas aeruginosa', 'Acinetobacter baumannii'];
const SITES = ['UROCULTIVO POR SONDA', 'ASPIRADO TRAQUEAL', 'LIQUIDO PERITONEAL', 'SECRECION DE HERIDA'];
function culture(p, d, i) {
  const atb = ATB.map((drug, k) => `${drug}\n${['<=1', '>32', '8', '<=0.5/9.5'][(i + k) % 4]}\t${'SRIS'[(i + k) % 4]}\n`).join('');
  return header(p, some(d)) + `BACTERIOLOGIA\n${SITES[i % 4]}\nPRODUCTO\n*\nMICROORGANISMO\n*\n${GERMS[i % 4]}\n` +
    `COMENTARIO:\n*\nDEMO <img src=x onerror="window.__xss=1"> CEPA ${i}\nCUENTA DE KASS\n*\n25,000 UFC/mL\nANTIBIOGRAMA\n*\n${atb}`;
}
const listDay = addDays(TODAY, -1);
const medRow = (t, ...cols) => [`${dmy(listDay)} 08:${t} a.m.`, ...cols, 'NW'].join('\t');
const UNITS = ['MCG/KG/MIN', 'UI/H', 'GOTAS', 'MEQ/L', 'µG', 'MG/M2', 'PUFF', 'ML/H', 'U', '%'];
const ROUTES = ['VIA INTRAVENOSA', 'VIA ORAL', 'VIA SUBCUTANEA', 'VIA INHALATORIA', 'VIA SONDA NASOGASTRICA'];
const MED_NAMES = Array.from({ length: 45 }, (_, i) => {
  if (i < ODD_TEXT.length) return `DEMOFARMACO${pad(i)} ${ODD_TEXT[i][1].replace(/^DEMO /, '').slice(0, i === 0 ? 400 : 80)} 10 MG TABLETA`;
  return `DEMOFARMACO${pad(i)} 100 MG SOL INY`;
});
const MED_LIST = MED_NAMES.map((name, i) =>
  medRow(pad(i), 'MEDICAMENTOS', name, ROUTES[i % ROUTES.length],
    `${(i * 1.25).toFixed(2)} ${UNITS[i % UNITS.length]} // ${'DILUIR EN 250 ML SOL SALINA 0.9% PASAR EN 24 H '.repeat(1 + (i % 4))}`,
    ['CADA 24 HORAS', 'CADA 8 HORAS', 'DOSIS UNICA', 'PRN', 'CADA 4 HORAS'][i % 5])).join('\n');

await r.finish('Data input stress: lab paste, Tendencias, Cultivos, Manejo, Pendientes, Agenda, restart', async () => {
  let { app, page, pageErrors } = await r.launch({ lanPort: 3797 });
  await onboardLocalOnly(page);
  await labTab(page);

  // ── A. SOME lab paste ────────────────────────────────────────────────────
  const LF = P('7300001-1', 'DEMO SALTO LF', '801');
  const CRLF = P('7300002-2', 'DEMO SALTO CRLF', '802');
  const TABS = P('7300003-3', 'DEMO TABS EXTRA', '803');
  const d0 = new Date(2026, 8, 20);
  await pasteAndSave(page, fullLabs(LF, some(d0)));
  await pasteAndSave(page, fullLabs(CRLF, some(d0)).replace(/\n/g, '\r\n'));
  await pasteAndSave(page, fullLabs(TABS, some(d0)).split('\n').map((l) => l + '\t\t\t').join('\n\t\t\n'));
  const base = await daySets(page, LF, dmy(d0));
  const crlf = await daySets(page, CRLF, dmy(d0));
  const tabs = await daySets(page, TABS, dmy(d0));
  const strip = (sets) => sets.map((s) => s.text).join(' | ');
  check('\\r\\n report reads the same values as \\n', base.length > 0 && strip(crlf) === strip(base), { base: strip(base).slice(0, 200), crlf: strip(crlf).slice(0, 200) });
  check('extra / trailing tabs and tab-only lines read the same values', base.length > 0 && strip(tabs) === strip(base), { tabs: strip(tabs).slice(0, 200) });

  const MISS = P('7300004-4', 'DEMO COLUMNAS FALTAN', '804');
  await pasteAndSave(page, header(MISS, some(d0)) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + 'HGB\t9.4\nWBC\t\t\t12.1\nPLT 250\n');
  const miss = strip(await daySets(page, MISS, dmy(d0)));
  check('rows with missing columns keep their values (Hb 9.4, Leu 12.1)', /Hb 9\.4/.test(miss) && /Leu 12\.1/.test(miss), miss);

  const CUT = P('7300005-5', 'DEMO CORTADO', '805');
  const full = fullLabs(CUT, some(d0));
  const cutText = full.slice(0, full.indexOf('QUIMICA CLINICA') + 120);
  let errs = pageErrors.length;
  const cutToast = await pasteAndSave(page, cutText);
  const cutSets = strip(await daySets(page, CUT, dmy(d0)));
  await shot(page, 'cut-off-report');
  check('cut-off report: no page error, the complete rows are kept', pageErrors.length === errs && /\bHb\b/.test(cutSets), { toast: flat(cutToast).slice(0, 160), saved: cutSets.slice(0, 200) });
  check('cut-off report: no NaN / undefined', !/NaN|undefined|Infinity/.test(cutSets), cutSets.slice(-200));

  const HDR = P('7300006-6', 'DEMO SOLO ENCABEZADO', '806');
  let n = await listCount(page);
  const hdrToast = await pasteAndSave(page, header(HDR, some(d0)));
  check('header with no results: no patient created, the user is told', (await listCount(page)) === n && /No se encontraron resultados/.test(hdrToast), { before: n, after: await listCount(page), toast: flat(hdrToast).slice(0, 160) });
  if (await page.locator('#lab-input').isVisible()) await page.keyboard.press('Escape');

  const N1 = P('7300007-7', 'DEMO SIN SEPARADOR UNO', '807');
  const N2 = P('7300008-8', 'DEMO SIN SEPARADOR DOS', '808');
  n = await listCount(page);
  const twoToast = await pasteAndSave(page, header(N1, some(d0)) + bh('9.1') + header(N2, some(d0, '9:00AM')) + bh('13.3'));
  await shot(page, 'two-patients-no-separator');
  check('two new patients, no separator: refused with a clear message, nothing saved',
    (await listCount(page)) === n && /expedientes distintos/.test(twoToast), { before: n, after: await listCount(page), toast: flat(twoToast).slice(0, 200) });
  if (await page.locator('#lab-input').isVisible()) await page.keyboard.press('Escape');

  const FIVE = P('7300009-9', 'DEMO CINCO VECES', '809');
  await pasteAndSave(page, Array(5).fill(fullLabs(FIVE, some(d0))).join('\n\n'));
  const five = await daySets(page, FIVE, dmy(d0));
  check('same report 5× in one paste → one set', five.length === 1, five.map((s) => s.hora));

  const JUNK = P('7300010-0', 'DEMO VALORES BASURA', '810');
  errs = pageErrors.length;
  await pasteAndSave(page, header(JUNK, some(d0)) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    'HGB\t\tA\t<0.01\tg/dL\t12.20 - 18.10\nWBC\t\tA\t1,234.5\tK/uL\t4.00 - 11.00\nPLT\t\t*\t\tK/uL\t142 - 424\n' +
    'MCV\t\t*\t-\tfL\t80 - 97\nHCT\t\t*\t1e5\t%\t37.7 - 53.7\nNEU\t\t*\t∞\tK/uL\t2 - 6.9\n' +
    'QUIMICA CLINICA\nQUIMICA SANGUINEA\n' + TABLE + 'GLUCOSA\t\t*\tNEGATIVO\tmg/dL\t70 - 100\nCREATININA\t\t*\t>1000\tmg/dL\t0.7 - 1.2\n');
  const junk = strip(await daySets(page, JUNK, dmy(d0)));
  await shot(page, 'junk-values');
  check('junk values: no NaN / Infinity / undefined shown, no page error', !/NaN|Infinity|undefined|null/.test(junk) && pageErrors.length === errs, junk);
  check('junk values: "1,234.5" (thousands comma) reads as 1234.5, not 1.234', /Leu 1234\.5/.test(junk), junk);
  check('junk values: "∞" and "1e5" are not shown as a number', !/Neu|Hto/.test(junk), junk);
  check('junk values: "<0.01" / ">1000" keep the sign, no eTFG from ">1000"', /Hb <0\.01/.test(junk) && /Cr >1000/.test(junk) && !/eTFG/.test(junk), junk);

  const BIG = P('7300011-1', 'DEMO 400 FILAS', '811');
  const JV = ['<0.01', '>1000', '1,234.5', '', 'NEGATIVO', '1e5', '-', '∞', '0', '-4.2'];
  let rows = '';
  for (let i = 0; i < 400; i++) rows += `ANALITO ${i}\t\t*\t${JV[i % JV.length]}\tmg/dL\t0.5 - 1.5\n`;
  errs = pageErrors.length;
  let t = Date.now();
  // Catch the warning while it shows: pasteAndSave idles up to 8 s waiting for a «guardad» toast this path never shows.
  const warnLoc = page.locator('.toast', { hasText: /filas no reconocidas/ }).first();
  const unknownToastP = warnLoc.waitFor({ timeout: 20000 })
    .then(async () => { await shot(page, '400-rows-unknown-warning'); return warnLoc.innerText(); })
    .catch(() => '');
  const bigToast = await pasteAndSave(page, header(BIG, some(d0)) + 'QUIMICA CLINICA\nQUIMICA SANGUINEA\n' + TABLE + rows + bh('7.9').split(TABLE)[1]);
  timings.paste400ms = Date.now() - t;
  const unknownToast = await unknownToastP;
  await shot(page, '400-rows-unknown-analytes');
  const big = strip(await daySets(page, BIG, dmy(d0)));
  check('400-row report: Hb kept, no page error, under 15 s', /Hb 7\.9/.test(big) && pageErrors.length === errs && timings.paste400ms < 15000, { ms: timings.paste400ms });
  // 5 of the 10 JV values are numeric ('<0.01' '>1000' '1,234.5' '0' '-4.2') → 200 unknown rows; text/junk rows are not counted.
  check('400-row report: unknown rows are named in a warning ("200 filas no reconocidas no se guardaron: ANALITO 0, …")',
    /200 filas no reconocidas no se guardaron: ANALITO 0, ANALITO 1, ANALITO 2…/.test(flat(unknownToast)), flat(unknownToast).slice(0, 240));
  check('lab paste: HTML never ran', !(await xss(page)));

  // ── B. Tendencias: 180 daily reports ─────────────────────────────────────
  const TR = P('7300020-0', 'DEMO TENDENCIA SEIS MESES', '820');
  const start = new Date(2026, 2, 1);
  const EXTREME_DAY = 77; // one Hb 3.1 day that even-pick sampling used to drop
  const cbc = (i) => header(TR, some(addDays(start, i), '7:00AM')) + bh(i === EXTREME_DAY ? '3.1' : (8 + (i % 50) / 10).toFixed(1),
    `WBC\t\t*\t${(5 + (i % 7)).toFixed(1)}\tK/uL\t4.00 - 11.00\nPLT\t\t*\t${150 + i}\tK/uL\t142 - 424\n`);
  timings.trendChunksMs = [];
  for (let c = 0; c < 6; c++) {
    t = Date.now();
    await pasteAndSave(page, Array.from({ length: 30 }, (_, k) => cbc(c * 30 + k)).join('\n\n'));
    timings.trendChunksMs.push(Date.now() - t);
    if (c === 0) await openBySearch(page, TR);
  }
  const trDays = (await labDays(page, TR)).filter((o) => /^\d{2}\/\d{2}\/\d{4}$/.test(o));
  check('180 daily reports → 180 days in the day list', trDays.length === 180, trDays.length);
  const tc = timings.trendChunksMs;
  check('paste chunk time does not climb (last ≤ 2× first)', tc[5] <= tc[0] * 2, tc);
  t = Date.now();
  await page.locator('#lab-inner-tend-btn').click();
  await page.locator('.tend-card[data-series-key="BH|Hb"]').locator('visible=true').first().waitFor({ timeout: 20000 });
  timings.openTendMs = Date.now() - t;
  check('Tendencias opens in under 5 s with 180 days', timings.openTendMs < 5000, timings.openTendMs);
  await shot(page, 'tendencias-180-days');
  await page.locator('.tend-card[data-series-key="BH|Hb"]').locator('visible=true').first().click({ position: { x: 20, y: 60 } });
  await page.locator('#tend-detail-backdrop').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  const hbPts = await page.evaluate(() => {
    const c = Chart.getChart(document.getElementById('tend-detail-canvas'));
    return c ? c.data.datasets[0].data.filter((v) => v != null && (typeof v !== 'object' || v.y != null)).map((v) => (typeof v === 'object' ? v.y : v)) : [];
  });
  const pts = hbPts.length;
  await shot(page, 'tendencias-hb-detail');
  check('Hb detail chart draws 180 days in ≤ 100 points', pts > 50 && pts <= 100, pts);
  check('Hb detail chart keeps the one extreme day (Hb 3.1)', Math.min(...hbPts.map(Number)) === 3.1, { min: Math.min(...hbPts.map(Number)), pts });
  await page.keyboard.press('Escape');

  // ── C. Cultivos: 32 cultures, 40-drug antibiograms ───────────────────────
  const CU = P('7300030-0', 'DEMO CULTIVOS MUCHOS', '830');
  const cdays = Array.from({ length: 32 }, (_, i) => addDays(new Date(2026, 0, 1), i));
  const allCult = cdays.map((d, i) => culture(CU, d, i)).join('\n\n');
  await labTab(page);
  t = Date.now();
  await pasteAndSave(page, allCult);
  timings.paste32CulturesMs = Date.now() - t;
  await openBySearch(page, CU);
  const cultRows = async () => {
    await closeToasts(page);
    await goArea(page, 'lab');
    await page.locator('#lab-inner-cult-btn').click();
    await page.locator('#cultivos-table-container .cultivos-table').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    return page.locator('#cultivos-table-container .cultivos-table tr:not(.cultivos-section-row)').evaluateAll((trs) =>
      trs.filter((tr) => tr.querySelector('td')).map((tr) => tr.querySelector('td').innerText.trim().slice(0, 5)));
  };
  let cr = await cultRows();
  await shot(page, 'cultivos-32');
  check('32 cultures → 32 rows, one per day', cr.length === 32 && new Set(cr).size === 32, { n: cr.length, unique: new Set(cr).size });
  const chipsHtml = await page.locator('#cultivos-table-container .cultivos-atb-chips').first().innerHTML().catch(() => '');
  check('40-drug antibiogram keeps all 40 drugs', ATB.every((a) => chipsHtml.includes(`>${a}<`)), ATB.filter((a) => !chipsHtml.includes(`>${a}<`)));
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, allCult);
  cr = await cultRows();
  check('pasting the 32 cultures again adds no rows', cr.length === 32, cr.length);
  check('HTML in a culture comment never ran', !(await xss(page)));

  // ── D. Manejo: 45 meds ────────────────────────────────────────────────────
  const MJ = P('7300040-0', 'DEMO MANEJO CUARENTA', '840');
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, fullLabs(MJ, some(d0)));
  await openBySearch(page, MJ);
  const openManejo = async () => {
    await closeToasts(page);
    await goArea(page, 'med');
    await page.locator('#med-itab-receta').click();
    await page.waitForTimeout(300);
  };
  const importSome = async (text) => {
    await closeToasts(page);
    await page.locator('#med-import-open-btn').click();
    await page.locator('#med-input').fill(text);
    await page.getByRole('button', { name: 'Procesar receta' }).click();
    await page.waitForTimeout(600);
  };
  await openManejo();
  t = Date.now();
  await importSome(MED_LIST);
  timings.import45MedsMs = Date.now() - t;
  const medToast = (await page.locator('.toast').allInnerTexts()).join(' | ');
  const medTitle = flat(await page.locator('#med-turno-title-text').innerText().catch(() => ''));
  const medNames = await page.locator('.med-receta-row .med-receta-name').allInnerTexts();
  await shot(page, 'manejo-45');
  check('45 meds → "Medicamentos del turno · 45"', medTitle === 'Medicamentos del turno · 45', { medTitle, toast: flat(medToast).slice(0, 200) });
  const missingMeds = MED_NAMES.map((m) => m.slice(0, 13)).filter((k) => !medNames.some((x) => x.includes(k)));
  check('every DEMOFARMACO row is shown', missingMeds.length === 0, missingMeds);
  const oddMed = medNames.find((x) => x.includes('DEMOFARMACO04')) || '';
  check('HTML in a drug name shows as text, never runs', /<img/i.test(oddMed) && !(await xss(page)), oddMed.slice(0, 120));
  const microRows = (await page.locator('.med-receta-row').allInnerTexts()).filter((x) => /DEMOFARMACO(04|14|24|34|44)/.test(x));
  check('"µG" dose never shows as Greek "ΜG" (reads as MG, a 1000× error); shows MCG', microRows.length === 5 && microRows.every((x) => /MCG/.test(x) && !/Μ/.test(x)), microRows.map((x) => flat(x).slice(0, 90)));
  await importSome(MED_LIST);
  const medTitle2 = flat(await page.locator('#med-turno-title-text').innerText().catch(() => ''));
  check('same 45-med list again: still 45', medTitle2 === 'Medicamentos del turno · 45', medTitle2);

  // ── E. Pendientes: 110 items ─────────────────────────────────────────────
  const PE = P('7300050-0', 'DEMO PENDIENTES CIEN', '850');
  await labTab(page);
  await pasteAndSave(page, fullLabs(PE, some(d0)));
  await openBySearch(page, PE);
  await closeToasts(page);
  await goArea(page, 'nota');
  await page.locator('button:visible', { hasText: /^\s*Pendientes\s*$/ }).first().click();
  await page.locator('.todo-toolbar-add-btn:visible').waitFor();
  const localInput = (d) => `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const PEND = [
    ...ODD_TEXT.map(([, x]) => x),
    ...Array.from({ length: 103 }, (_, i) => `DEMO PENDIENTE ${String(i).padStart(3, '0')}`),
  ];
  const dueFor = (i) => (i % 10 === 1 ? new Date(2019, 0, 2, 8, 0) : i % 10 === 2 ? new Date(2099, 11, 31, 23, 0) : null);
  const REMIND_I = 1; // the only overdue item with «Recordarme»
  const addTimes = [];
  // Count every reminder toast shown: only «Recordarme» reminds, once; a due date alone never does.
  await page.evaluate(() => {
    window.__reminders = 0;
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (/^\s*!?\s*Pendiente ·/.test(n.textContent || '') && n.classList?.contains('toast')) window.__reminders += 1; })
      .observe(document.body, { childList: true, subtree: true });
  });
  for (let i = 0; i < PEND.length; i++) {
    t = Date.now();
    await page.locator('.todo-toolbar-add-btn:visible').click();
    const m = page.locator('.wb-todo-add-modal');
    await m.locator('.wb-todo-add-text').fill(PEND[i]);
    const due = dueFor(i);
    if (due) {
      await m.locator('.todo-due-toggle').click();
      const dt = page.locator('#todo-due-modal-datetime');
      await dt.waitFor({ state: 'visible' });
      await dt.fill(localInput(due));
      if (i === REMIND_I) await page.locator('#todo-due-modal-remind').check();
      await page.locator('#todo-due-modal-save').click();
      await dt.waitFor({ state: 'hidden' });
    }
    await m.locator('[data-wb-todo-add-ok]').click();
    await m.waitFor({ state: 'detached' });
    addTimes.push(Date.now() - t);
  }
  timings.pendienteAddMs = { first10: avg(addTimes.slice(0, 10)), last10: avg(addTimes.slice(-10)), max: Math.max(...addTimes) };
  const pendState = () => page.evaluate(() => [...document.querySelectorAll('.todo-group')]
    .filter((g) => g.getBoundingClientRect().width > 0)
    .map((g) => ({
      title: String(g.querySelector('.todo-group-header')?.textContent || '').replace(/\s+/g, ' ').trim(),
      rows: [...g.querySelectorAll('.wb-todo-row')].map((x) => x.querySelector('.todo-text-input')?.value ?? x.textContent.trim()),
    }))).catch(() => []);
  let ps = await pendState();
  let pRows = ps.flatMap((g) => g.rows);
  await shot(page, 'pendientes-110');
  check('110 pendientes → 110 rows', pRows.length === 110, { n: pRows.length, groups: ps.map((g) => [g.title, g.rows.length]) });
  check('no pendiente duplicated', new Set(pRows).size === pRows.length, pRows.length - new Set(pRows).size);
  const lostOdd = ODD_TEXT.filter(([, x]) => !pRows.includes(x)).map(([l]) => l);
  check('odd pendiente text kept exactly (1 kB, emoji, NFD, RTL, HTML, SQL, Δ≥µ)', lostOdd.length === 0,
    { lost: lostOdd, nfdStoredAs: pRows.find((x) => /JOS/.test(x))?.normalize('NFD') === ODD_TEXT[2][1] ? 'same' : 'changed' });
  const venc = ps.find((g) => /^Vencidos/.test(g.title));
  check('2019 due dates land in «Vencidos» (11 rows)', venc?.rows.length === 11, venc && [venc.title, venc.rows.length]);
  const prox = ps.find((g) => /^Próximos/.test(g.title));
  const sinF = ps.find((g) => /^Sin fecha/.test(g.title));
  check('2099 due dates land in «Próximos» (11 rows); «Sin fecha» holds only the 88 undated',
    prox?.rows.length === 11 && sinF?.rows.length === 88, ps.map((g) => [g.title, g.rows.length]));
  const reminders = await page.evaluate(() => window.__reminders);
  check('11 overdue pendientes, 1 with «Recordarme» → exactly 1 reminder toast', reminders === 1, reminders);
  check('pendiente add time does not climb (last 10 ≤ 2× first 10)', timings.pendienteAddMs.last10 <= timings.pendienteAddMs.first10 * 2, timings.pendienteAddMs);
  check('pendientes: HTML never ran', !(await xss(page)));

  // ── F. Agenda: 100 procedures ────────────────────────────────────────────
  await closeToasts(page);
  await goArea(page, 'agenda');
  await page.locator('#procedure-agenda-range').waitFor();
  const monday = addDays(TODAY, -((TODAY.getDay() + 6) % 7));
  const modal = page.locator('#procedure-agenda-modal');
  async function addProc({ procedure, location, date, hh, mm, raw }) {
    await closeToasts(page);
    await page.locator('#procedure-agenda-new').click();
    await modal.locator('#pa-procedure').waitFor({ state: 'visible' });
    await modal.locator('#pa-procedure').fill(procedure);
    await modal.locator('#pa-location').fill(location);
    if (raw) {
      await page.evaluate((v) => { const el = document.getElementById('pa-start'); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, raw);
    } else {
      await modal.locator('.rpc-date-field__trigger').click();
      const day = page.locator(`.rpc-date-popover__day[data-iso="${iso(date)}"]`);
      for (let k = 0; k < 3 && !(await day.isVisible()); k += 1) await page.locator('.rpc-date-popover__nav[data-nav="1"]').click();
      await day.click();
      const [hour, minute] = await modal.locator('.rpc-time-picker__select').all();
      await hour.selectOption(pad(hh));
      await minute.selectOption(pad(mm));
    }
    await modal.getByRole('button', { name: 'Guardar' }).click();
    const closed = await modal.locator('#pa-procedure').waitFor({ state: 'hidden', timeout: 3000 }).then(() => true, () => false);
    if (!closed) {
      const err = (await modal.locator('#pa-modal-error').textContent().catch(() => '')).trim();
      await page.keyboard.press('Escape');
      return err || 'not closed';
    }
    return '';
  }
  const blocks = () => page.evaluate(() =>
    [...document.querySelectorAll('#procedure-agenda-grid-mount .rpc-proc-agenda-day-col-wrap')].flatMap((col, day) =>
      [...col.querySelectorAll('.rpc-proc-agenda-block')].map((b) => {
        const rc = b.getBoundingClientRect();
        return { day, name: b.querySelector('.rpc-proc-name')?.textContent.trim(), sub: b.querySelector('.rpc-proc-sub')?.textContent.trim(), l: rc.left, t: rc.top, w: rc.width, h: rc.height };
      })));
  const overlaps = (bs) => {
    const out = [];
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i]; const b = bs[j];
      if (a.day === b.day && a.l < b.l + b.w - 1 && b.l < a.l + a.w - 1 && a.t < b.t + b.h - 1 && b.t < a.t + a.h - 1) out.push([a.name, b.name]);
    }
    return out;
  };
  const agTimes = [];
  const agErrors = [];
  const PROCS = [];
  for (let i = 0; i < 100; i++) {
    const week = i < 50 ? 0 : 1;
    const k = i % 50;
    const same = k < 5; // 5 at the same Wednesday 10:00
    const odd = i < ODD_TEXT.length ? ODD_TEXT[i][1] : null;
    const p = {
      procedure: odd ? odd.slice(0, 300) : `DEMO PROC ${String(i).padStart(3, '0')}`,
      location: odd ? `SALA ${ODD_TEXT[i][0]} ' " <b>x</b>` : `QUIROFANO ${i % 9}`,
      date: addDays(monday, week * 7 + (same ? 2 : k % 7)),
      hh: same ? 10 : 6 + (k % 15),
      mm: same ? 0 : (k % 2) * 30,
    };
    PROCS.push({ ...p, week });
    t = Date.now();
    const err = await addProc(p);
    agTimes.push(Date.now() - t);
    if (err) agErrors.push([i, err]);
  }
  timings.agendaAddMs = { first10: avg(agTimes.slice(0, 10)), last10: avg(agTimes.slice(-10)), max: Math.max(...agTimes) };
  const pastErr = await addProc({ procedure: 'DEMO PROC PASADO 2019', location: 'SALA 1', raw: '2019-01-02T08:00' });
  const futErr = await addProc({ procedure: 'DEMO PROC FUTURO 2099', location: 'SALA 2', raw: '2099-12-31T20:00' });
  check('100 agenda saves: none refused', agErrors.length === 0, agErrors.slice(0, 5));
  check('past (2019) and far-future (2099) dates are refused with a message', [pastErr, futErr].every((e) => /solo muestra la semana pasada, esta y la siguiente/.test(e)), { pastErr, futErr });
  await page.keyboard.press('Meta+4');
  await page.waitForTimeout(400);
  const wk0 = await blocks();
  await shot(page, 'agenda-this-week-50');
  await page.locator('#procedure-agenda-next').click();
  await page.waitForTimeout(400);
  const wk1 = await blocks();
  await shot(page, 'agenda-next-week-50');
  await page.keyboard.press('Meta+4');
  check('this week shows 50 blocks, next week 50', wk0.length === 50 && wk1.length === 50, { wk0: wk0.length, wk1: wk1.length });
  const names0 = wk0.map((b) => b.name);
  check('no block duplicated', new Set(names0).size === names0.length && new Set(wk1.map((b) => b.name)).size === wk1.length);
  const lostProc = PROCS.filter((p) => p.week === 0 && !names0.includes(p.procedure.trim())).map((p) => p.procedure.slice(0, 40));
  check('odd procedure text shown exactly (1 kB cut to 300, emoji, NFD, RTL, HTML, SQL, Δ≥µ)', lostProc.length === 0, lostProc);
  check('same-hour blocks never paint on top of each other', overlaps(wk0).length === 0 && overlaps(wk1).length === 0, [...overlaps(wk0), ...overlaps(wk1)].slice(0, 5));
  check('agenda add time does not climb (last 10 ≤ 2× first 10)', timings.agendaAddMs.last10 <= timings.agendaAddMs.first10 * 2, timings.agendaAddMs);
  check('agenda: HTML never ran', !(await xss(page)) && (await page.locator('.rpc-proc-agenda-block b, .rpc-proc-agenda-block img').count()) === 0);

  check('no page errors in session 1', pageErrors.length === 0, pageErrors.slice(0, 5));
  const beforeCount = await listCount(page);
  await app.close();

  // ── Restart ──────────────────────────────────────────────────────────────
  ({ app, page, pageErrors } = await r.launch({ lanPort: 3797 }));
  await dismissLearnHub(page);
  await page.locator('.p-name').first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('restart: patient count unchanged', (await listCount(page)) === beforeCount, { before: beforeCount, after: await listCount(page) });
  const trDays2 = (await labDays(page, TR)).filter((o) => /^\d{2}\/\d{2}\/\d{4}$/.test(o));
  check('restart: 180 lab days kept', trDays2.length === 180, trDays2.length);
  check('restart: \\r\\n patient values kept', strip(await daySets(page, CRLF, dmy(d0))) === strip(base));
  await openBySearch(page, CU);
  cr = await cultRows();
  check('restart: 32 culture rows kept', cr.length === 32, cr.length);
  await openBySearch(page, MJ);
  await openManejo();
  check('restart: 45 meds kept', flat(await page.locator('#med-turno-title-text').innerText().catch(() => '')) === 'Medicamentos del turno · 45');
  await openBySearch(page, PE);
  await closeToasts(page);
  await goArea(page, 'nota');
  await page.locator('button:visible', { hasText: /^\s*Pendientes\s*$/ }).first().click();
  await page.locator('.todo-toolbar-add-btn:visible').waitFor();
  ps = await pendState();
  pRows = ps.flatMap((g) => g.rows);
  check('restart: 110 pendientes kept, odd text exact', pRows.length === 110 && ODD_TEXT.every(([, x]) => pRows.includes(x)), pRows.length);
  await closeToasts(page);
  await goArea(page, 'agenda');
  await page.locator('#procedure-agenda-range').waitFor();
  await page.waitForTimeout(400);
  const wk0b = await blocks();
  await page.locator('#procedure-agenda-next').click();
  await page.waitForTimeout(400);
  const wk1b = await blocks();
  check('restart: agenda 50 + 50 blocks kept', wk0b.length === 50 && wk1b.length === 50, { wk0: wk0b.length, wk1: wk1b.length });
  await shot(page, 'after-restart-agenda');
  check('restart: HTML never ran', !(await xss(page)));
  check('no page errors in session 2', pageErrors.length === 0, pageErrors.slice(0, 5));
  fs.writeFileSync(path.join(r.artifactDir, 'timings.json'), JSON.stringify(timings, null, 2) + '\n');
  await app.close();
});
