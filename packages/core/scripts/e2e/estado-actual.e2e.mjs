#!/usr/bin/env node
/* global document, window */
/**
 * E2E: Estado actual with a busy synthetic patient, driven through the real
 * Electron app with Playwright. Synthetic DEMO fixtures only.
 *
 * Scenario (medium-hard on purpose):
 *   1. Fresh userData → admit DEMO PÉREZ JUAN from the demo SOME lab paste.
 *   2. Interconsulta → Clínico › Estado actual.
 *   3. Add 7 medications across 6 categories by hand.
 *   4. Registro 1 (3 h ago): stacked vitals (2 readings each), 2 glucometrías,
 *      T1/T2/T3 intake and output, UF 2000 as another source, and two turn
 *      events: T2 hemodiálisis (turn goes NC) and T3 furosemide challenge with
 *      150 mL at 2 h (no respondedor).
 *   5. Registro 2 (now): vitals only.
 *   6. Turno card opens the per-turn balance; events show per turn.
 *   7. Historial lists both rows; "Enviar a nota" carries the events.
 *   8. Sala mode, custom I/O source, glu Tab order, copy FAB, vital history
 *      modal and Gráficas — see "Ways it can go wrong" below.
 *
 * Ways it can go wrong (each one is a check below):
 *   - Sala mode shows "Enviar a nota" (Sala has no note to send to)
 *   - the copy-estado-actual FAB is invisible on Estado actual, or stays
 *     visible after leaving the screen
 *   - copying Estado actual leaves raw ** markers in the clipboard text, or
 *     drops the bold from the copied HTML
 *   - Tab from a glucometría value jumps to "+1"/Alterada instead of the
 *     next glucometría
 *   - a custom (free-text) I/O source does not swap the dropdown for a name
 *     field, or its label/value round-trip is wrong
 *   - the "2 of 3 turns quantified" diuresis note collapses wrong, or leaks
 *     a placeholder instead of NC
 *   - a vital's history modal is missing entries, or doesn't badge the
 *     current reading
 *   - Gráficas de monitoreo doesn't open, or errors, once there is enough
 *     history
 *
 * Artifact: e2e-artifacts/estado-actual/<run-id>/ with report.json and one
 * screenshot per step. Exit code 0 = every check passed.
 *
 *   npm run e2e:estado-actual
 */
import { _electron as electron } from 'playwright';
import electronPath from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_TOUR_LAB_PASTE, DEMO_GARCIA_LAB_REPORT } from '../../public/js/tour-demo-some-lab.mjs';
import { LAB_BULK_PATIENT_SEPARATOR } from '../../public/js/lab-bulk-paste.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'e2e-artifacts', 'estado-actual', runId);
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-ud-'));
fs.mkdirSync(artifactDir, { recursive: true });

const checks = [];
let shotN = 0;

function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + JSON.stringify(detail) : ''}`);
}

async function shot(page, label) {
  shotN += 1;
  await page.screenshot({ path: path.join(artifactDir, `${String(shotN).padStart(2, '0')}-${label}.png`) });
}

const MEDS = [
  ['abx', 'CEFTRIAXONA 1 G IV C/24 H'],
  ['antihta', 'LOSARTÁN 50 MG VO C/12 H'],
  ['antihta', 'AMLODIPINO 5 MG VO C/24 H'],
  ['diureticos', 'FUROSEMIDA 40 MG IV C/12 H'],
  ['antitromboticos', 'ENOXAPARINA 40 MG SC C/24 H'],
  ['analgesia', 'PARACETAMOL 1 G IV C/8 H'],
  ['nm', 'INSULINA GLARGINA 10 UI SC C/24 H'],
];

async function launch() {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [repoRoot, `--user-data-dir=${userDataDir}`],
    cwd: repoRoot,
    env: { ...process.env, R_PLUS_VERIFY_MODE: '1', R_PLUS_USER_DATA: userDataDir, R_PLUS_LAN_HTTP_PORT: '3792' },
    timeout: 60000,
  });
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('lab-repo-fetch');
    ipcMain.handle('lab-repo-fetch', () => ({ studies: [] }));
  });
  const page = await app.firstWindow();
  // Sala opens in the card view by default; these scenarios drive the sidebar.
  await page.waitForLoadState('domcontentloaded');
  const salaCards = await page.evaluate(() => { globalThis.localStorage.setItem('rplus-sala-view', 'bar'); return !!globalThis.document.body.dataset.salaView; });
  if (salaCards) await page.reload();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  return { app, page, pageErrors };
}

async function closeToasts(page) {
  for (const btn of await page.locator('.toast-close').all()) await btn.click().catch(() => {});
}

async function admitDemoPatient(page) {
  await page.locator('[data-sync-mode="local"]').click();
  await page.locator('#clinical-onboard-local-confirm-btn').click();
  await page.locator('#apptab-lab').waitFor({ state: 'visible' });
  const hub = page.locator('#learn-hub-backdrop.open');
  await hub.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await hub.count()) await page.keyboard.press('Escape');
  await page.locator('#apptab-lab').click();
  if (!(await page.locator('#lab-input').isVisible())) await page.locator('#btn-lab-paste').click();
  await page
    .locator('#lab-input')
    .fill(DEMO_TOUR_LAB_PASTE + '\n\n' + LAB_BULK_PATIENT_SEPARATOR + '\n\n' + DEMO_GARCIA_LAB_REPORT);
  await page.locator('#btn-procesar').click();
  await page.locator('#lab-bulk-preview-confirm').waitFor({ state: 'visible' });
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Agregar al censo' }).first().click();
    await page.locator('#patient-registro-tunnel-confirm').click();
    await page.locator('#patient-registro-tunnel-confirm').waitFor({ state: 'hidden' });
  }
  await closeToasts(page);
  await page.locator('.p-name', { hasText: 'DEMO JUAN' }).locator('visible=true').first().click();
  await page.locator('#m-servicio').waitFor({ state: 'visible' });
  await page.locator('#m-servicio').fill('MEDICINA INTERNA');
  await page.locator('#m-cuarto').fill('412');
  await page.locator('#m-cama').fill('02');
  await page.getByRole('button', { name: 'Agregar Paciente' }).click();
  await page.locator('#m-servicio').waitFor({ state: 'hidden' });
}

async function openEstadoActual(page) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const icBtn = page.locator('#header-mode-seg button[data-mode="interconsulta"]');
  await icBtn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await icBtn.click();
  await page.locator('.toast', { hasText: 'Interconsulta' }).waitFor({ state: 'visible' });
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.waitForTimeout(500);
  const boardCard = page.getByText('DEMO JUAN', { exact: true }).locator('visible=true').first();
  if (await boardCard.isVisible().catch(() => false)) await boardCard.click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
}

/** Sala is the default mode after admitting a patient: no note to send to. */
async function checkSalaActionBar(page) {
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.waitForTimeout(400);
  const boardCard = page.getByText('DEMO JUAN', { exact: true }).locator('visible=true').first();
  if (await boardCard.isVisible().catch(() => false)) await boardCard.click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  const bar = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('.estado-actual-panel button')).map((b) => b.textContent.trim());
    return { registro: texts.includes('Registro manual'), enviar: texts.includes('Enviar a nota') };
  });
  check('sala mode action bar: solo Registro manual, sin Enviar a nota', bar.registro && !bar.enviar, bar);
}

async function addMeds(page) {
  for (const [cat, text] of MEDS) {
    const block = page.locator(`[data-ea-med-cat="${cat}"]`);
    if (!(await block.count())) {
      await page.locator('[data-ea-med-pick-category]').selectOption(cat);
      await block.waitFor({ state: 'visible' });
    }
    await block.locator(`[data-ea-med-manual-toggle="${cat}"]`).click();
    await block.locator(`[data-ea-med-manual-input="${cat}"]`).fill(text);
    await block.locator(`[data-ea-med-manual-save="${cat}"]`).click();
    await page.locator(`[data-ea-med-cat="${cat}"]`, { hasText: text }).waitFor({ state: 'visible' });
  }
}

/** Sets the registro clinical time to `hoursAgo` hours before now. */
async function setRecordedAt(page, hoursAgo) {
  await page.evaluate((h) => {
    const d = new Date(Date.now() - h * 3600e3);
    const pad = (n) => String(n).padStart(2, '0');
    const el = document.getElementById('ea-recorded-at');
    el.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('rpc-datetime-sync'));
  }, hoursAgo);
}

async function fillVital(form, key, values) {
  for (let i = 0; i < values.length; i++) {
    if (i > 0) await form.locator(`[data-ea-vital-add="${key}"]`).click();
    await form.locator(`[data-ea-vital="${key}"][data-ea-layer-idx="${i}"]`).fill(String(values[i]));
  }
}

async function openRegistro(page) {
  await page.getByRole('button', { name: 'Registro manual' }).click();
  const form = page.locator('#ea-form');
  await form.waitFor({ state: 'visible' });
  return form;
}

async function busyRegistro(page) {
  const form = await openRegistro(page);
  await shot(page, 'registro-empty');
  const empty = await page.evaluate(() => ({
    totals: ['ea-io-ing-total', 'ea-io-egr-total', 'ea-balance-turno-live'].map((id) => document.getElementById(id).textContent),
    rows: document.querySelectorAll('[data-ea-io-extra-row]').length,
  }));
  check(
    'empty registro is quiet: dashes, no unused rows',
    empty.totals.every((t) => t === '—') && empty.rows === 0,
    empty
  );
  await setRecordedAt(page, 3);
  await fillVital(form, 'tas', [150, 132]);
  await fillVital(form, 'tad', [95, 84]);
  await fillVital(form, 'fc', [112, 94]);
  await fillVital(form, 'fr', [24, 20]);
  await fillVital(form, 'temp', [38.4, 37.2]);
  await fillVital(form, 'sat', [89, 94]);
  const glus = form.locator('[data-ea-glu-value]');
  await glus.nth(0).fill('182');
  await glus.nth(1).fill('146');
  await glus.nth(0).focus();
  await page.keyboard.press('Tab');
  const gluTabTarget = await page.evaluate(() => {
    const el = document.activeElement;
    return { hasGluValue: el.hasAttribute('data-ea-glu-value'), hasAltered: el.hasAttribute('data-ea-glu-altered') };
  });
  check(
    'Tab from first glucometría goes to the second glucometría, not +1/Alterada',
    gluTabTarget.hasGluValue && !gluTabTarget.hasAltered,
    gluTabTarget
  );
  // Extra glucometría row: probed and removed, same as the custom I/O source above.
  await form.locator('#ea-add-glu').click();
  const extraGlu = form.locator('[data-ea-glu-time]').last();
  const extraGluOptions = await extraGlu.locator('option').allTextContents();
  check(
    'extra glucometría time picker offers only the 4h slots, not the standard times',
    extraGluOptions.includes('04:00') && !extraGluOptions.includes('08:00') && !extraGluOptions.includes('16:00'),
    extraGluOptions
  );
  await form.locator('[data-ea-glu-remove]').last().click();
  for (const [id, v] of [['ing-t1', '800'], ['ing-t2', '600'], ['ing-t3', '700'], ['egr-t1', '400'], ['egr-t3', '150']]) {
    await form.locator(`#ea-io-${id}`).fill(v);
  }
  await form.locator('#ea-add-io-extra').selectOption('ultrafiltrado');
  const extra = form.locator('[data-ea-io-extra-row]').last();
  check(
    'picking a source adds its row and resets the picker',
    (await extra.locator('[data-ea-io-extra-kind]').inputValue()) === 'ultrafiltrado' &&
      (await form.locator('#ea-add-io-extra').inputValue()) === ''
  );
  await extra.locator('[data-ea-io-extra-value]').fill('2000');
  // Custom source: probed and removed in place, so it never joins the balance
  // this scenario later asserts on — only the dropdown/name-field swap matters here.
  await form.locator('#ea-add-io-extra').selectOption('__custom__');
  const extraCustom = form.locator('[data-ea-io-extra-row]').last();
  check(
    'a custom source swaps the dropdown for a name field',
    (await extraCustom.locator('[data-ea-io-extra-kind]').isHidden()) &&
      (await extraCustom.locator('[data-ea-io-extra-custom]').isVisible())
  );
  await extraCustom.locator('[data-ea-io-extra-custom]').fill('Sonda nasogástrica');
  await extraCustom.locator('[data-ea-io-extra-remove]').click();

  await form.locator('#ea-io-evac').fill('3');
  await form.locator('[data-ea-io-event-add]').selectOption('hemodialisis');
  const hd = form.locator('[data-ea-io-event-row]').last();
  check('hemodiálisis asks no detail', await hd.locator('[data-ea-io-event-detail]').isHidden());
  await hd.locator('[data-ea-io-event-turno]').selectOption('t2');
  await hd.locator('[data-ea-io-event-ml]').fill('2000');
  check('hemodiálisis marks the empty T2 output as NC', (await form.locator('#ea-io-egr-t2').inputValue()) === 'NC');

  await form.locator('[data-ea-io-event-add]').selectOption('furosemida');
  const fst = form.locator('[data-ea-io-event-row]').last();
  await fst.locator('[data-ea-io-event-turno]').selectOption('t3');
  check(
    'furosemide challenge asks for the 2 h urine',
    (await fst.locator('[data-ea-io-event-ml]').getAttribute('placeholder')) === 'mL en 2 h'
  );
  await fst.locator('[data-ea-io-event-detail]').fill('80');
  await fst.locator('[data-ea-io-event-ml]').fill('150');
  const fit = await page.evaluate(() => {
    const el = document.querySelector('.ea-registro-form-scroll');
    return { scroll: el.scrollHeight, client: el.clientHeight, vh: window.innerHeight };
  });
  check('busy registro fits on one screen, no scroll', fit.scroll <= fit.client + 1, fit);
  const table = await page.evaluate(() => ({
    bal: ['t1', 't2', 't3'].map((t) => document.getElementById('ea-io-bal-' + t).textContent),
    total: document.getElementById('ea-balance-turno-live').textContent,
  }));
  check(
    'balance table shows each turn and the total',
    table.bal.join('|') === '+400|NC|+550' && /-450/.test(table.total),
    table
  );
  await shot(page, 'registro-busy');
  await page.locator('.ea-registro-submit').click();
  await form.waitFor({ state: 'hidden' });
  await closeToasts(page);
}

async function vitalsOnlyRegistro(page) {
  const form = await openRegistro(page);
  await setRecordedAt(page, 0);
  await fillVital(form, 'tas', [128]);
  await fillVital(form, 'tad', [78]);
  await fillVital(form, 'fc', [88]);
  await fillVital(form, 'sat', [95]);
  await page.locator('.ea-registro-submit').click();
  await form.waitFor({ state: 'hidden' });
  await closeToasts(page);
}

async function bombaRegistro(page) {
  const form = await openRegistro(page);
  await setRecordedAt(page, 0);
  await form.locator('label.rpc-switch:has(#ea-bomba-enabled)').click();
  await form.locator('[data-ea-bomba-time]').first().focus();
  await page.keyboard.type('14');
  await page.keyboard.press('Enter');
  for (const [glu, units] of [['180', '2'], ['165', '1.5'], ['150', '1']]) {
    await page.keyboard.type(glu);
    await page.keyboard.press('Enter');
    await page.keyboard.type(units);
    await page.keyboard.press('Enter');
  }
  const times = await form.locator('[data-ea-bomba-time]').evaluateAll((els) => els.map((el) => el.value));
  check('bomba: Enter walks the row, next row starts one hour later', times.join(' ') === '14:00 15:00 16:00 17:00', times);
  await form.locator('[data-ea-bomba-remove]').last().click();
  await shot(page, 'registro-bomba');
  await page.locator('.ea-registro-submit').click();
  await form.waitFor({ state: 'hidden' });
  await closeToasts(page);
  const hist = await page.locator('#ea-historial').innerText();
  check('bomba readings are saved with their hours', /180/.test(hist) && /165/.test(hist) && /150/.test(hist) && /16:00/.test(hist), hist.slice(0, 300));
}

async function run() {
  const { app, page, pageErrors } = await launch();
  await admitDemoPatient(page);
  await checkSalaActionBar(page);
  await openEstadoActual(page);
  await shot(page, 'estado-actual-empty');

  await addMeds(page);
  const medCount = await page.locator('.ea-estado-clinico .ea-med-item-list [data-ea-med-remove]').count();
  check('7 medications listed in 6 categories', medCount === 7 && (await page.locator('[data-ea-med-cat]').count()) === 6, medCount);

  const medsShown = () => page.locator('.ea-estado-clinico [data-ea-med-remove]').count();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Nota de evolución' }).click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  check('medications survive leaving the screen', (await medsShown()) === 7, await medsShown());

  await page.locator('[data-ea-ec="dieta"]').fill('BLANDA PICADA');
  await page.locator('[data-ea-ec="kcalKg"]').fill('25');
  await page.locator('[data-ea-ec="kcal"]').fill('1750');
  await page.locator('[data-ea-ec="proteinG"]').fill('70');
  await page.locator('[data-ea-ec="proteinG"]').press('Tab');
  await page.locator('[data-ea-ec="soporte"]').selectOption('Puntillas nasales');
  await page.locator('[data-ea-ec="soporteLitros"]').fill('2');
  await page.locator('[data-ea-ec="soporteLitros"]').press('Tab');
  await page.waitForTimeout(200);

  await busyRegistro(page);
  check('medications survive a registro', (await medsShown()) === 7, await medsShown());
  await vitalsOnlyRegistro(page);
  await page.waitForTimeout(400);
  await shot(page, 'estado-actual-busy');

  const pageFit = await page.evaluate(() => {
    const over = [];
    for (let el = document.querySelector('#ea-snapshot'); el; el = el.parentElement) {
      const oy = window.getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) over.push(el.className + ' ' + (el.scrollHeight - el.clientHeight));
    }
    return { overflowPx: over, docOver: document.documentElement.scrollHeight - window.innerHeight };
  });
  check('busy Estado actual fits one screen, no scroll', !pageFit.overflowPx.length && pageFit.docOver <= 1, pageFit);
  const strip = await page.locator('#ea-snapshot').boundingBox();
  check('snapshot strip stays short', !!strip && strip.height < 220, strip && Math.round(strip.height));
  const snap = await page.locator('#ea-snapshot').innerText();
  check('latest T/A is the newest registro', snap.includes('128/78'), snap.split('\n').slice(0, 6));
  check('a vitals-only registro keeps the last balance', /Ingresos\s+2100 CC/.test(snap) && /Turno\s*›?\s*●?\s*-450 CC/.test(snap), snap.slice(snap.indexOf('Ingresos')));
  check('2 of 3 quantified turns collapse into one DIURESIS line, no NC leaks in', /DIURESIS\s*\(?550/.test(snap) || /DIURESIS.*550.*2T/.test(snap), snap.slice(snap.indexOf('Egresos'), snap.indexOf('Egresos') + 80));
  check('Turno card flags turn events', (await page.locator('.ea-turno-event-dot').count()) === 1);

  await page.locator('[data-onclick="openEaTurnosBalanceModal"]').click();
  const modal = page.locator('#ea-vital-history-backdrop.open');
  await modal.waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await shot(page, 'balance-por-turno');
  const rows = await modal.locator('.ea-turnos-table tbody tr').allInnerTexts();
  check('balance splits into T1, T2, T3', rows.length === 3, rows);
  check('T1 balance is +400', /^T1\s+800\s+400\s+\+400/.test(rows[0] || ''), rows[0]);
  check('T2 is NC with its hemodiálisis event', /NC/.test(rows[1] || '') && /HEMODIÁLISIS, UF 2000 ML/.test(rows[1] || ''), rows[1]);
  check('T3 shows the furosemide verdict', /80 MG → 150 ML\/2 H \(NO RESPONDEDOR\)/.test(rows[2] || ''), rows[2]);
  await page.keyboard.press('Escape');
  await modal.waitFor({ state: 'hidden' });

  await page.locator('#ea-snapshot [data-ea-vital-history="fc"]').click();
  await modal.waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  const fcEntries = await modal.locator('.ea-vital-history-metric').allInnerTexts();
  const fcBadges = await modal.locator('.ea-vital-history-badge').allInnerTexts();
  check(
    'FC history modal lists every reading with the current one badged',
    fcEntries.length >= 3 && fcBadges.some((b) => /actual/i.test(b)),
    { fcEntries, fcBadges }
  );
  await page.keyboard.press('Escape');
  await modal.waitFor({ state: 'hidden' });

  await page.locator('#ea-snapshot [data-ea-vital-history="bp"]').click();
  await modal.waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  const bpEntries = await modal.locator('.ea-vital-history-metric').allInnerTexts();
  check('T/A history modal pairs TAS/TAD into rows', bpEntries.length >= 2, bpEntries);
  await page.keyboard.press('Escape');
  await modal.waitFor({ state: 'hidden' });

  const hist = await page.locator('#ea-historial').innerText();
  check('historial lists both registros', (await page.locator('.ea-historial-row').count()) === 2);
  check('historial keeps the turn events', hist.includes('T3 RETO DE FUROSEMIDA'), hist.slice(0, 300));

  await page.evaluate(() => {
    window.__e2eClipboardHtml = null;
  });
  const fab = page.locator('#ea-copy-fab');
  check('copy FAB is visible on Estado actual with an active patient', await fab.isVisible());
  await fab.click();
  await page.waitForTimeout(300);
  const clip = await app.evaluate(({ clipboard }) => ({ text: clipboard.readText(), html: clipboard.readHTML() }));
  check(
    'copying Estado actual strips ** markers from the plain text and bolds them in the HTML',
    !!clip.text && !/\*\*/.test(clip.text) && /<strong>/.test(clip.html || ''),
    { text: clip.text.slice(0, 80), html: (clip.html || '').slice(0, 120) }
  );
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Nota de evolución' }).click();
  await page.waitForTimeout(200);
  check('copy FAB hides outside Estado actual', await fab.isHidden());
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });

  await page.getByRole('button', { name: 'Enviar a nota' }).click();
  // The note already holds the template, so the app asks before replacing it.
  const replace = page.getByRole('button', { name: 'Reemplazar', exact: true });
  await replace.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await replace.isVisible().catch(() => false)) await replace.click();
  await page.waitForTimeout(800);
  await shot(page, 'enviar-a-nota');
  const noteText = await page.evaluate(() =>
    Array.from(document.querySelectorAll('textarea')).map((t) => t.value).join('\n')
  );
  check('note text carries the turn events', /EVENTOS: T2 HEMODIÁLISIS;/.test(noteText) && !/UF 2000 ML/.test(noteText) && /EVACUACIONES 3\b/.test(noteText), noteText.match(/INGRESOS[^\n]*/)?.[0]);
  check(
    'note text groups meds by clause: unions with commas, empty required clauses read NINGUNO',
    /ANTIHIPERTENSIVOS: LOSARTÁN 50 MG VO C\/12 H, AMLODIPINO 5 MG VO C\/24 H/.test(noteText) &&
      /DIURÉTICOS: FUROSEMIDA 40 MG IV C\/12 H/.test(noteText) &&
      /ANTIBIOTICOTERAPIA: CEFTRIAXONA 1 G IV C\/24 H/.test(noteText) &&
      /TROMBOPROFILAXIS: ENOXAPARINA 40 MG SC C\/24 H/.test(noteText) &&
      /VASOPRESORES: NINGUNO/.test(noteText),
    noteText
  );
  check('note text carries the 2-of-3-quantified diuresis line', /DIURESIS \(550, 2T\)/.test(noteText), noteText.match(/DIURESIS[^,]*/)?.[0]);
  check('note text carries both glucometrías, comma-joined', /GLUCOMETRÍAS CAPILARES \(182, 146 MG\/DL\)/.test(noteText));
  check(
    'note text has the calórica diet clause with protein',
    /DIETA BLANDA PICADA CALCULADA A 25 KCAL\/KG \(1750 KCAL\) \+ 70 GR PROTEINA/.test(noteText),
    noteText.match(/DIETA[^|]*/)?.[0]
  );
  check(
    'note text splits PARACETAMOL into antipiréticos and INSULINA into its own clause',
    /ANALGESIA \/ ANTIPIRETICOS: PARACETAMOL 1 G IV C\/8 H/.test(noteText) && /INSULINA: INSULINA GLARGINA 10 UI SC C\/24 H/.test(noteText)
  );
  check(
    'note text carries the ventilatory support clause instead of "al aire ambiente"',
    /POR PUNTILLAS NASALES A 2 L\/MIN/.test(noteText) && !/AL AIRE AMBIENTE/.test(noteText),
    noteText.match(/V:[^|]*/)?.[0]
  );
  await closeToasts(page);
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });

  const chartsBtn = page.locator('#ea-charts-summary');
  await chartsBtn.click();
  const chartsModal = page.locator('#ea-charts-backdrop.open');
  await chartsModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await shot(page, 'graficas-monitoreo');
  check('Gráficas de monitoreo opens with a rendered canvas', await page.locator('#ea-charts-canvas').isVisible());
  await page.keyboard.press('Escape');
  await chartsModal.waitFor({ state: 'hidden' });

  await bombaRegistro(page);

  const editRow = page.locator('.ea-historial-row', { hasText: 'TAS 150' }).first();
  await editRow.locator('[data-onclick="editarEstadoActualMedicion"]').click();
  const editForm = page.locator('#ea-form');
  await editForm.waitFor({ state: 'visible' });
  const editTas = editForm.locator('[data-ea-vital="tas"][data-ea-layer-idx="0"]');
  check('editing a historial row preloads its saved TAS', (await editTas.inputValue()) === '150', await editTas.inputValue());
  await editTas.fill('155');
  const histRowsBefore = await page.locator('.ea-historial-row').count();
  await page.locator('.ea-registro-submit').click();
  await editForm.waitFor({ state: 'hidden' });
  await closeToasts(page);
  const histRowsAfter = await page.locator('.ea-historial-row').count();
  const histTextAfter = await page.locator('#ea-historial').innerText();
  check(
    'editing replaces the row in place, no duplicate row added',
    histRowsAfter === histRowsBefore && /TAS 155/.test(histTextAfter),
    { histRowsBefore, histRowsAfter }
  );

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();
}

let crash = null;
try {
  await run();
} catch (err) {
  crash = String((err && err.stack) || err).split('\n').slice(0, 6).join('\n');
  check('scenario ran to the end', false, crash);
}

const passed = checks.filter((c) => c.ok).length;
const report = { scenario: 'Estado actual busy patient + turn events', runId, passed, failed: checks.length - passed, checks };
fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.rmSync(userDataDir, { recursive: true, force: true });
console.log(`\n${passed}/${checks.length} checks passed. Artifact: ${path.relative(repoRoot, artifactDir)}`);
process.exit(report.failed === 0 ? 0 : 1);
