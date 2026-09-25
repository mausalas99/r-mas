#!/usr/bin/env node
/**
 * E2E stress: worst-case input through the real app. Synthetic DEMO patients
 * and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - an odd name (1 kB long, emoji, NFD accents, RTL, quotes, HTML) crashes
 *     the paste, is dropped, or runs as HTML in the sidebar
 *   - a name with SQL-ish text breaks the DB write
 *   - 60 patients make each paste noticeably slower (last 10 vs first 10)
 *   - a 400-row report with junk values ("<0.01", "1,234.5", "", "NEG")
 *     freezes the UI or throws
 *   - an odd patient's Resumen / Laboratorio tab throws when opened
 *   - patients do not survive a restart at that volume
 *   - any page error
 *
 * Artifact: e2e-artifacts/stress/<run-id>/ (report.json + screenshots).
 *
 *   node scripts/e2e/stress.e2e.mjs
 */
import { createRun, onboardLocalOnly, openPatient, pasteAndSave, pasteAndProcess, closeToasts, until, dismissLearnHub } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const d = new Date();
const TODAY = (h) => `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${h}:05AM`;
const bh = (hgb) => 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + `HGB\t\tA\t${hgb}\tg/dL\t12.20 - 18.10\n`;

const ODD = [
  ['long 1 kB', 'DEMO ' + 'LARGUISIMO '.repeat(90)],
  ['emoji', 'DEMO 😀 PACIENTE 🩺'],
  ['NFD accents', 'DEMO JOSÉ PEÑA MÜLLER'],
  ['RTL + zero-width', 'DEMO ‮OCIXEM ​ZW'],
  ['html', 'DEMO <img src=x onerror="window.__xss=1"><b>NEGRITA</b>'],
  ['quotes/sql', `DEMO O'BRIEN "EL"; DROP TABLE patients;--`],
  ['single word', 'DEMO'],
  ['greek/cjk', 'DEMO Δ ΜΑΡΊΑ 测试'],
].map(([label, name], i) => ({ label, name, exp: `70009${String(i).padStart(2, '0')}-${i}`, room: String(600 + i) }));

/** The sidebar renders ~10 cards at a time: read the "PACIENTES N" count instead. */
const listCount = async (page) =>
  Number(((await page.locator('#patient-list').innerText()).match(/PACIENTES\s*(\d+)/i) || [])[1] || -1);
/** Search the sidebar first so an off-screen patient has a card to click. */
async function openBySearch(page, p) {
  await page.locator('#patient-search').fill(p.exp);
  await page.waitForTimeout(400);
  await openPatient(page, p);
  await page.locator('#patient-search').fill('');
}

const r = createRun('stress');
const { check, shot } = r;

await r.finish('Worst-case input: odd names, volume, junk labs, restart', async () => {
  let { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);

  // ── Odd names ────────────────────────────────────────────────────────────
  for (const p of ODD) {
    const toast = await pasteAndSave(page, header(p, TODAY(1)) + bh('8.1'));
    const inList = await page.locator(`.p-name[title*="${p.exp}"]`).count();
    check(`odd name saved: ${p.label}`, inList > 0, toast.replace(/\s+/g, ' ').slice(0, 160));
  }
  await shot(page, 'odd-names-sidebar');
  check('HTML in a name does not run', !(await page.evaluate(() => globalThis.window.__xss)));
  check('HTML in a name is not rendered as a tag', (await page.locator('.p-name b, .p-name img').count()) === 0);

  for (const p of ODD) {
    const before = pageErrors.length;
    try {
      await openPatient(page, p);
      await page.locator('#apptab-lab').click();
      await page.waitForTimeout(300);
      check(`odd name opens without error: ${p.label}`, pageErrors.length === before, pageErrors.slice(before));
    } catch (e) {
      check(`odd name opens without error: ${p.label}`, false, String(e.message).split('\n')[0]);
    }
  }
  await shot(page, 'odd-name-open');

  // ── Volume: 60 patients, paste time must not climb ───────────────────────
  const times = [];
  for (let i = 0; i < 60; i++) {
    const p = { exp: `71${String(i).padStart(5, '0')}-${i % 10}`, name: `DEMO VOLUMEN ${i}` };
    const n = await listCount(page);
    const t = Date.now();
    await pasteAndProcess(page, header(p, TODAY(2)) + bh(String(7 + (i % 5))));
    await until(() => listCount(page).then((c) => c === n + 1), 20000, 50);
    times.push(Date.now() - t);
    await closeToasts(page);
  }
  const avg = (a) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
  const first = avg(times.slice(0, 10));
  const last = avg(times.slice(-10));
  const total = await listCount(page);
  await shot(page, 'volume-68');
  check('68 patients in the list', total === 68, total);
  check('paste time: last 10 ≤ 2× first 10', last <= first * 2, { firstMs: first, lastMs: last, maxMs: Math.max(...times) });

  // ── Junk 400-row report ──────────────────────────────────────────────────
  const JUNK = ['<0.01', '>1000', '1,234.5', '', 'NEGATIVO', '12..3', '1e5', '-', '0', '-4.2', '∞', 'N/A'];
  let rows = '';
  for (let i = 0; i < 400; i++) rows += `ANALITO ${i}\t\t*\t${JUNK[i % JUNK.length]}\tmg/dL\t0.5 - 1.5\n`;
  const big = { exp: '7200001-1', name: 'DEMO REPORTE GIGANTE', room: '700' };
  const t0 = Date.now();
  const before = pageErrors.length;
  await pasteAndSave(page, header(big, TODAY(3)) + 'QUIMICA CLINICA\nQUIMICA SANGUINEA\n' + TABLE + rows + bh('7.9').split(TABLE)[1]);
  const pasteMs = Date.now() - t0;
  await openBySearch(page, big);
  await page.locator('#apptab-lab').click();
  const t1 = Date.now();
  const alive = await page.evaluate(() => 1).catch(() => 0);
  await shot(page, 'junk-report');
  const shown = await page.locator('#tab-lab, main').first().innerText().catch(() => '');
  check('400-row junk report: unknown analytes kept somewhere visible', /ANALITO/i.test(shown), shown.replace(/\s+/g, ' ').slice(0, 200));
  check('400-row junk report: no page error', pageErrors.length === before, pageErrors.slice(before));
  check('400-row junk report: paste under 15 s, UI answers', pasteMs < 15000 && alive === 1, { pasteMs, pingMs: Date.now() - t1 });

  check('no page errors in session 1', pageErrors.length === 0, pageErrors);
  await app.close();

  // ── Restart ──────────────────────────────────────────────────────────────
  ({ app, page, pageErrors } = await r.launch());
  await dismissLearnHub(page);
  await page.locator('.p-name').first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const after = await listCount(page);
  await shot(page, 'after-restart');
  check('all 69 patients survive restart', after === 69, after);
  const oddBack = [];
  for (const p of ODD) {
    await page.locator('#patient-search').fill(p.exp);
    await page.waitForTimeout(300);
    oddBack.push((await page.locator(`.p-name[title*="${p.exp}"]`).count()) > 0);
  }
  check('odd-name patients survive restart', oddBack.every(Boolean), oddBack);
  check('no page errors in session 2', pageErrors.length === 0, pageErrors);
  await app.close();
});
