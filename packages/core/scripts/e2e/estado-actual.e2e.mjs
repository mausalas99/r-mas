#!/usr/bin/env node
/* global document, window, getComputedStyle */
/**
 * E2E: Estado actual with a busy synthetic patient, driven through the real
 * Electron app with Playwright. Synthetic DEMO fixtures only.
 *
 * Scenario (medium-hard on purpose):
 *   1. Fresh userData → admit DEMO PÉREZ JUAN from the demo SOME lab paste.
 *   2. Interconsulta → Clínico › Estado actual.
 *   3. Add 8 medications across 6 categories by hand.
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
import { createA11yRecorder } from './harness.mjs';
import { DEMO_TOUR_LAB_PASTE, DEMO_GARCIA_LAB_REPORT } from '../../public/js/tour-demo-some-lab.mjs';
import { LAB_BULK_PATIENT_SEPARATOR } from '../../public/js/lab-bulk-paste.mjs';
import { quietHints, goArea, pasteAndSave } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'e2e-artifacts', 'estado-actual', runId);
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-ud-'));
fs.mkdirSync(artifactDir, { recursive: true });

const checks = [];
let shotN = 0;
const a11y = createA11yRecorder('estado-actual');

function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + JSON.stringify(detail) : ''}`);
}

async function shot(page, label) {
  shotN += 1;
  await page.screenshot({ path: path.join(artifactDir, `${String(shotN).padStart(2, '0')}-${label}.png`) });
  await a11y.scan(page, label);
}

const MEDS = [
  ['abx', 'CEFTRIAXONA 1 G IV C/24 H'],
  ['antihta', 'LOSARTÁN 50 MG VO C/12 H'],
  ['antihta', 'AMLODIPINO 5 MG VO C/24 H'],
  ['diureticos', 'FUROSEMIDA 40 MG IV C/12 H'],
  ['antitromboticos', 'ENOXAPARINA 40 MG SC C/24 H'],
  ['analgesia', 'PARACETAMOL 1 G IV C/8 H'],
  ['nm', 'INSULINA GLARGINA 10 UI SC C/24 H'],
  ['nm', 'ACIDO FOLICO 5 MG VO C/24 H'],
];
const ACUTE_CATS = ['abx', 'antitromboticos', 'analgesia'];
const CHRONIC_CATS = ['antihta', 'diureticos', 'nm'];

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
  await quietHints(page);
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
  await page.locator('.topbar-area-btn').waitFor({ state: 'visible' });
  const hub = page.locator('#learn-hub-backdrop.open');
  await hub.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await hub.count()) await page.keyboard.press('Escape');
  await goArea(page, 'lab');
  if (!(await page.locator('#lab-input').isVisible())) {
    await page.locator('#lab-bar-more > summary').click(); await page.locator('#btn-lab-paste').click();
  }
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
  await goArea(page, 'nota');
  await page.waitForTimeout(500);
  const boardCard = page.locator('.ic-card .sv-name', { hasText: 'DEMO PÉREZ JUAN' }).locator('visible=true').first();
  if (await boardCard.isVisible().catch(() => false)) await boardCard.click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
}

/** Sala is the default mode after admitting a patient: no note to send to. */
async function checkSalaActionBar(page) {
  await closeToasts(page);
  await goArea(page, 'nota');
  await page.waitForTimeout(400);
  const boardCard = page.locator('.ic-card .sv-name', { hasText: 'DEMO PÉREZ JUAN' }).locator('visible=true').first();
  if (await boardCard.isVisible().catch(() => false)) await boardCard.click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  const bar = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('.estado-actual-panel button')).map((b) => b.textContent.trim());
    return { registro: texts.includes('Registro manual'), enviar: texts.includes('Enviar a nota') };
  });
  check('sala mode action bar: solo Registro manual, sin Enviar a nota', bar.registro && !bar.enviar, bar);
  const barTexts = await page.evaluate(() => Array.from(document.querySelectorAll('.estado-actual-panel button')).map((b) => b.textContent.trim()));
  check('sala mode action bar: no Guardar, no Copiar indicaciones', !barTexts.some((t) => /^Guardar\b|Copiar indicaciones/.test(t)), barTexts);
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

/** Acute categories in the left column, chronic on the right; name / dose split; NM subgroups. */
async function checkMedGrid(page) {
  const colOf = (cat) => page.locator(`[data-ea-med-cat="${cat}"]`).evaluate((el) => el.closest('[data-ea-med-col]')?.getAttribute('data-ea-med-col'));
  const acute = await Promise.all(ACUTE_CATS.map(colOf));
  const chronic = await Promise.all(CHRONIC_CATS.map(colOf));
  check('abx / antitrombóticos / analgesia sit in the left (acute) med column', acute.every((c) => c === '0'), acute);
  check('antihta / diuréticos / NM sit in the right (chronic) med column', chronic.every((c) => c === '1'), chronic);
  const ceftri = page.locator('[data-ea-med-cat="abx"] .ea-med-item-text', { hasText: 'CEFTRIAXONA' }).first();
  const split = {
    name: (await ceftri.locator('.ea-med-item-name').innerText().catch(() => '')).trim(),
    dose: (await ceftri.locator('.ea-med-item-dose').innerText().catch(() => '')).trim(),
  };
  check('CEFTRIAXONA row splits drug name and dose', split.name === 'CEFTRIAXONA' && /^1 G IV C\/24 H/.test(split.dose), split);
  // The panel never folds a group by a title click and hides the preview with CSS,
  // so fold it programmatically and read the preview text it would show.
  const preview = await page.locator('[data-ea-med-cat="antihta"]').evaluate((el) => {
    el.open = false;
    const text = el.querySelector('.ea-med-cat-preview')?.textContent || '';
    el.open = true;
    return text;
  });
  check('folded group preview lists drug names only, no doses', /LOSARTÁN/.test(preview) && /AMLODIPINO/.test(preview) && !/\d|MG|VO/.test(preview), preview);
  const subcats = await page.locator('[data-ea-med-cat="nm"] .ea-med-subcat-title').allInnerTexts();
  check('NM group: Antidiabéticos subgroup, then an NM row for the rest', subcats.map((t) => t.trim().toUpperCase()).join('|') === 'ANTIDIABÉTICOS|NM', subcats);
  const nmRest = await page.locator('[data-ea-med-cat="nm"] .ea-med-subcat--otros').innerText().catch(() => '');
  check('ACIDO FOLICO sits under the NM row, not Antidiabéticos', /ACIDO FOLICO/.test(nmRest) && !/INSULINA/.test(nmRest), nmRest);
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
  check(
    'extra glucometría time picker also offers 12:00 and 20:00 and never 00:00',
    extraGluOptions.includes('12:00') && extraGluOptions.includes('20:00') && !extraGluOptions.includes('00:00'),
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
  // The side panel scrolls its body when busy; the footer with «Registrar» must stay on screen.
  const footIn = await page.evaluate(() => {
    const b = document.querySelector('#ea-registro-backdrop .ea-registro-submit');
    const r = b && b.getBoundingClientRect();
    return !!r && r.bottom <= window.innerHeight && r.top >= 0;
  });
  check('busy registro: body scrolls inside the panel, Registrar stays on screen', footIn, fit);
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


async function section(name, fn) {
  try {
    await fn();
  } catch (err) {
    check(`${name}: ran to the end`, false, String((err && err.message) || err).split('\n').slice(0, 3).join(' | '));
  }
}
const dmOf = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
async function submitRegistro(page, form) {
  await page.locator('.ea-registro-submit').click();
  await form.waitFor({ state: 'hidden' });
  await closeToasts(page);
}
async function openVitalModal(page, key) {
  const modal = page.locator('#ea-vital-history-backdrop.open');
  await page.locator(`#ea-snapshot [data-ea-vital-history="${key}"]`).click();
  await modal.waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  return modal;
}
async function closeVitalModal(page) {
  await page.keyboard.press('Escape');
  await page.locator('#ea-vital-history-backdrop.open').waitFor({ state: 'hidden' });
}

/** Historial: registro after an edit, a row from an earlier day, T/A pairing, first FC entry, Eliminar. */
async function historialExtras(page) {
  const rowsN = () => page.locator('.ea-historial-row').count();
  const n0 = await rowsN();
  let form = await openRegistro(page);
  const tasEmpty = (await form.locator('[data-ea-vital="tas"][data-ea-layer-idx="0"]').inputValue()) === '';
  await setRecordedAt(page, 0);
  await fillVital(form, 'tas', [111]);
  await submitRegistro(page, form);
  const txt = await page.locator('#ea-historial').innerText();
  check(
    'a new registro after an edit starts empty and adds its own row; the edited row stays',
    tasEmpty && (await rowsN()) === n0 + 1 && /TAS 155/.test(txt) && /TAS 111/.test(txt),
    { tasEmpty, n0, n1: await rowsN() }
  );
  const old = new Date(Date.now() - 48 * 3600e3);
  form = await openRegistro(page);
  await setRecordedAt(page, 48);
  await fillVital(form, 'tas', [118]);
  await fillVital(form, 'tad', [72]);
  await fillVital(form, 'fc', [70]);
  await submitRegistro(page, form);
  const oldRow = page.locator('.ea-historial-row', { hasText: 'TAS 118' }).first();
  const oldText = await oldRow.innerText();
  check(
    'a historial row from an earlier day is labelled with that day, not today',
    oldText.includes(dmOf(old)) && !oldText.includes(dmOf(new Date())),
    oldText.slice(0, 60)
  );
  let modal = await openVitalModal(page, 'fc');
  const fcValues = await modal.locator('.ea-vital-history-value').allInnerTexts();
  const fcStamps = await modal.locator('.ea-vital-history-stamp').allInnerTexts();
  check(
    'FC history: the first (oldest) entry is the earlier-day reading with its date',
    fcValues.at(-1)?.trim() === '70' && fcStamps.at(-1)?.trim() === dmOf(old),
    { fcValues, fcStamps }
  );
  await closeVitalModal(page);
  modal = await openVitalModal(page, 'bp');
  const bp = (await modal.locator('.ea-vital-history-value').allInnerTexts()).map((t) => t.replace(/\s+/g, ''));
  check(
    'T/A history pairs TAS with the TAD of the same reading (each layer and each registro)',
    ['155/95', '132/84', '128/78', '118/72'].every((p) => bp.includes(p)) && bp.every((v) => v.includes('/')),
    bp
  );
  await closeVitalModal(page);
  const n1 = await rowsN();
  await oldRow.locator('[data-onclick="eliminarEstadoActualMedicion"]').click();
  await page.waitForTimeout(300);
  check(
    'Eliminar removes that historial row only',
    (await rowsN()) === n1 - 1 && !/TAS 118/.test(await page.locator('#ea-historial').innerText()),
    { n1, after: await rowsN() }
  );
}

/** Registros with 3 NC turns, altered Temp, then 3 quantified turns and a custom source round trip. */
async function turnsRegistros(page) {
  let form = await openRegistro(page);
  await setRecordedAt(page, 0.15);
  await fillVital(form, 'tas', [130]);
  await fillVital(form, 'tad', [80]);
  await fillVital(form, 'temp', [39.2]);
  const box = form.locator('.ea-vital-box:has([data-ea-vital="temp"][data-ea-layer-idx="0"])');
  const recHm = (await form.locator('#ea-recorded-at').inputValue()).slice(11, 16);
  const altTime = await box.locator('[data-ea-altered]').inputValue();
  check(
    'altered Temp: the chip is flagged and its clock defaults to the registro time',
    (await box.evaluate((el) => el.classList.contains('ea-vital-box--altered'))) && (recHm === '00:00' || altTime === recHm),
    { recHm, altTime }
  );
  for (const t of ['t1', 't2', 't3']) {
    await form.locator(`#ea-io-ing-${t}`).fill('500');
    await form.locator(`#ea-io-egr-${t}`).fill('NC');
  }
  await submitRegistro(page, form);
  const snap = () => page.locator('#ea-snapshot').innerText();
  const s1 = await snap();
  check('3 NC output turns read DIURESIS NC', /DIURESIS NC/.test(s1), s1.slice(s1.indexOf('Egresos'), s1.indexOf('Egresos') + 60));
  const labels = (await page.locator('#ea-snapshot .ea-snapshot-row-label').allInnerTexts()).map((t) => t.trim());
  check('snapshot labels: T/A, FC, Temp and SatO₂', ['T/A', 'FC', 'Temp', 'SatO₂'].every((l) => labels.includes(l)), labels);
  const altRow = await page.locator('#ea-snapshot .ea-snapshot-row--altered').allInnerTexts();
  check('altered Temp is flagged in the snapshot', altRow.some((t) => /Temp/.test(t) && /39\.2/.test(t)), altRow);
  const taStamp = await page
    .locator('#ea-snapshot .ea-snapshot-row', { has: page.locator('.ea-snapshot-row-label', { hasText: /^T\/A$/ }) })
    .locator('.ea-snapshot-row-stamp')
    .innerText();
  check('T/A row carries no stamp when its reading is from today', taStamp.trim() === '', taStamp);

  form = await openRegistro(page);
  await setRecordedAt(page, 0.07);
  for (const [t, v] of [['t1', '300'], ['t2', '400'], ['t3', '500']]) {
    await form.locator(`#ea-io-ing-${t}`).fill('100');
    await form.locator(`#ea-io-egr-${t}`).fill(v);
  }
  await form.locator('#ea-add-io-extra').selectOption('__custom__');
  const custom = form.locator('[data-ea-io-extra-row]').last();
  await custom.locator('[data-ea-io-extra-custom]').fill('Sonda nasogástrica');
  await custom.locator('[data-ea-io-extra-value]').fill('250');
  await submitRegistro(page, form);
  const s2 = await snap();
  check('3 quantified output turns add up in one DIURESIS line', /DIURESIS[^\n]*1200/.test(s2), s2.slice(s2.indexOf('Egresos'), s2.indexOf('Egresos') + 90));
  const row = page.locator('.ea-historial-row', { hasText: /sonda nasog/i }).first();
  check('custom source is saved in the historial', (await row.count()) === 1, (await page.locator('#ea-historial').innerText()).slice(0, 200));
  const n = await page.locator('.ea-historial-row').count();
  await row.locator('[data-onclick="editarEstadoActualMedicion"]').click();
  form = page.locator('#ea-form');
  await form.waitFor({ state: 'visible' });
  const c2 = form.locator('[data-ea-io-extra-row]').last();
  const rt = { name: await c2.locator('[data-ea-io-extra-custom]').inputValue(), value: await c2.locator('[data-ea-io-extra-value]').inputValue(), kindHidden: await c2.locator('[data-ea-io-extra-kind]').isHidden() };
  check('editing restores the custom source name and value', rt.name === 'Sonda nasogástrica' && rt.value === '250' && rt.kindHidden, rt);
  await submitRegistro(page, form);
  check('re-saving keeps the custom source and adds no row', (await page.locator('.ea-historial-row').count()) === n && /sonda nasog/i.test(await page.locator('#ea-historial').innerText()));
}

/** Registro Tab spine, Enter on glucometría, HD reminder banner and "No se realizó hoy". */
async function keyboardAndHd(page) {
  const form = await openRegistro(page);
  const desc = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return '';
      const da = Array.from(el.attributes).map((a) => a.name).find((n) => n.startsWith('data-ea-') && n !== 'data-ea-layer-idx');
      return el.id || da || el.tagName;
    });
  await form.locator('#ea-recorded-at').focus();
  const seen = [await desc()];
  for (let i = 0; i < 22; i++) {
    await page.keyboard.press('Tab');
    seen.push(await desc());
  }
  const skip = ['data-ea-vital-add', 'data-ea-altered', 'data-ea-glu-altered', 'data-ea-glu-remove', 'ea-add-glu', 'ea-bomba-enabled', 'data-ea-io-turno-nc'];
  const ids = ['ea-recorded-at', 'data-ea-vital', 'ea-io-ing-t1', 'ea-io-ing-t2', 'ea-io-ing-t3', 'ea-io-egr-t1', 'ea-io-egr-t2', 'ea-io-egr-t3', 'ea-io-evac'];
  const idx = ids.map((i) => seen.indexOf(i));
  check(
    'Tab walks vitals, then glucometrías, then the six turn inputs and evacuaciones, skipping +1, Alterada, NC and remove',
    idx.every((v) => v >= 0) && idx.slice(2).every((v, i, a) => i === 0 || v > a[i - 1]) && !seen.some((d) => skip.includes(d)) && seen.filter((d) => d === 'data-ea-vital').length === 6 && seen.filter((d) => d === 'data-ea-glu-value').length === 3,
    seen
  );
  const glus = form.locator('[data-ea-glu-value]');
  await glus.nth(0).focus();
  await page.keyboard.press('Enter');
  const enterIdx = await page.evaluate(() => Array.from(document.querySelectorAll('[data-ea-glu-value]')).indexOf(document.activeElement));
  check('Enter on a glucometría value moves to the next glucometría', enterIdx === 1, enterIdx);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).locator('visible=true').first().click();
  await form.waitFor({ state: 'hidden' });

  // HD reminder needs the open pendiente «Procedimiento: HEMODIALISIS».
  await closeToasts(page);
  await page.locator('button:visible', { hasText: /^\s*Pendientes\s*$/ }).first().click();
  await page.locator('.todo-toolbar-add-btn:visible').click();
  const m = page.locator('.wb-todo-add-modal');
  await m.locator('.wb-todo-add-text').fill('Procedimiento: HEMODIALISIS');
  await m.locator('[data-wb-todo-add-ok]').click();
  await m.waitFor({ state: 'detached' });
  const pendTexts = await page.locator('.todo-text-input:visible').evaluateAll((els) => els.map((e) => e.value));
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  await page.waitForTimeout(1500);
  await openRegistro(page);
  const banner = page.locator('.ea-registro-hint--hemodialisis');
  const shown = (await banner.count()) === 1;
  check('HD reminder banner shows while a HEMODIALISIS pendiente is open', shown, { shown, pendTexts });
  if (shown) {
    await banner.locator('[data-ea-hemodialisis-no-fue]').click();
    await page.waitForTimeout(300);
    check('«No se realizó hoy» hides the banner', (await page.locator('.ea-registro-hint--hemodialisis').count()) === 0);
  }
  await page.getByRole('button', { name: 'Cancelar', exact: true }).locator('visible=true').first().click();
}

async function addMed(page, cat, text) {
  const block = page.locator(`[data-ea-med-cat="${cat}"]`);
  if (!(await block.count())) {
    await page.locator('[data-ea-med-pick-category]').selectOption(cat);
    await block.waitFor({ state: 'visible' });
  }
  await block.locator(`[data-ea-med-manual-toggle="${cat}"]`).click();
  await block.locator(`[data-ea-med-manual-input="${cat}"]`).fill(text);
  await block.locator(`[data-ea-med-manual-save="${cat}"]`).click();
  await page.waitForTimeout(200);
}
async function setEc(page, key, val) {
  const el = page.locator(`[data-ea-ec="${key}"]`);
  if (el.evaluate((e) => e.tagName) && (await el.evaluate((e) => e.tagName)) === 'SELECT') await el.selectOption(val);
  else {
    await el.fill(String(val), { timeout: 4000 }).catch((e) => { throw new Error('setEc ' + key + ': ' + e.message.slice(0, 80)); });
    await el.press('Tab');
  }
  await page.waitForTimeout(150);
}
async function copyEa(page, app) {
  await app.evaluate(({ clipboard }) => clipboard.clear());
  await page.locator('#ea-copy-fab').click();
  await page.waitForTimeout(300);
  return app.evaluate(({ clipboard }) => ({ text: clipboard.readText(), html: clipboard.readHTML() }));
}

/** Med splits, duplicate add, remove, escaping, diet and ventilatory variants: all read from the copied text. */
async function copyVariants(page, app) {
  for (const [cat, t] of [
    ['analgesia', 'BUPRENORFINA 10 MG IM C/12 H'],
    ['analgesia', 'METAMIZOL 1 G IV C/8 H'],
    ['analgesia', 'ONDANSETRON 8 MG IV C/8 H'],
    ['analgesia', 'KETOROLACO 30 MG IV C/8 H <5 DIAS'],
    ['nm', 'METFORMINA 850 MG VO C/12 H'],
    ['abx', 'CEFTRIAXONA 1 G IV C/24 H'],
  ]) await addMed(page, cat, t);
  const cef = await page.locator('[data-ea-med-cat="abx"] .ea-med-item-text', { hasText: 'CEFTRIAXONA' }).count();
  check('adding the same medication twice keeps one row', cef === 1, cef);
  const titles = await page.locator('[data-ea-med-cat="analgesia"] [title]').evaluateAll((els) => els.map((e) => e.getAttribute('title')));
  check('a "<" in a medication is shown as text, tooltips are not double-escaped', (await page.locator('[data-ea-med-cat="analgesia"]').innerText()).includes('<5 DIAS') && !titles.some((t) => /&lt;|&amp;/.test(t || '')), titles);
  const c = await copyEa(page, app);
  const T = c.text;
  check('note copy: BUPRENORFINA stays under ANALGESIA', /ANALGESIA: [^|\n]*BUPRENORFINA/.test(T) && !/ANTIPIRETICOS: [^|\n]*BUPRENORFINA/.test(T), T.match(/ANALGESIA:[^|\n]*/)?.[0]);
  check('note copy: METAMIZOL joins PARACETAMOL under ANALGESIA / ANTIPIRETICOS', /ANALGESIA \/ ANTIPIRETICOS: [^|\n]*PARACETAMOL[^|\n]*METAMIZOL/.test(T), T.match(/ANTIPIRETICOS:[^|\n]*/)?.[0]);
  check('note copy: ONDANSETRON has its own ANTIEMETICOS clause', /ANTIEMETICOS: ONDANSETRON/.test(T) && !/ANALGESIA: [^|\n]*ONDANSETRON/.test(T), T.match(/ANTIEMETICOS:[^|\n]*/)?.[0]);
  check('note copy: the NM antidiabético METFORMINA is grouped with INSULINA, not with the other NM meds', /METFORMINA/.test(T) && !/ACIDO FOLICO[^|\n]*METFORMINA|METFORMINA[^|\n]*ACIDO FOLICO/.test(T), (await page.locator('[data-ea-med-cat="nm"]').innerText()).slice(0, 400));
  check('copy escapes "<" in the HTML but keeps it in the plain text', /&lt;5 DIAS/.test(c.html || '') && T.includes('<5 DIAS'), (c.html || '').match(/.{20}&lt;5.{5}/)?.[0]);
  const lines = T.split('\n');
  check('copy HTML bolds zone labels and meds, but not every line', /<strong>/.test(c.html) && lines.some((l) => l.trim() && !/\*\*/.test(l)) && lines.length > 3, (c.html || '').slice(0, 200));
  // × remove
  const nAna = await page.locator('[data-ea-med-cat="analgesia"] [data-ea-med-remove]').count();
  await page.locator('[data-ea-med-cat="analgesia"] .ea-med-item', { hasText: 'KETOROLACO' }).locator('[data-ea-med-remove]').click();
  await page.waitForTimeout(200);
  check('× removes that medication only', (await page.locator('[data-ea-med-cat="analgesia"] [data-ea-med-remove]').count()) === nAna - 1 && !(await page.locator('[data-ea-med-cat="analgesia"]').innerText()).includes('KETOROLACO'), nAna);

  // Diet variants.
  const diet = async (dieta, extra) => {
    await setEc(page, 'dieta', dieta);
    for (const [k, v] of Object.entries(extra || {})) await setEc(page, k, v);
    return (await copyEa(page, app)).text;
  };
  check('diet AYUNO reads DIETA AYUNO', /DIETA AYUNO/.test(await diet('AYUNO')));
  check('diet SUPLEMENTO reads DIETA SUPLEMENTO', /DIETA SUPLEMENTO/.test(await diet('SUPLEMENTO')));
  const par = await diet('PARENTERAL', { kcal: '1200' });
  check('diet PARENTERAL carries its kcal', /DIETA PARENTERAL \(1200 KCAL\)/.test(par), par.match(/DIETA PARENTERAL[^|\n]*/)?.[0]);
  const noProt = await diet('BLANDA PICADA', { kcalKg: '25', kcal: '1750', proteinG: '' });
  check('calórica diet without protein has no protein clause', /DIETA BLANDA PICADA CALCULADA A 25 KCAL\/KG \(1750 KCAL\)/.test(noProt) && !/PROTEINA/.test(noProt), noProt.match(/DIETA[^|\n]*/)?.[0]);

  // Ventilatory supports.
  const vent = async (soporte, fields) => {
    await setEc(page, 'soporte', soporte);
    for (const [k, v] of Object.entries(fields)) await setEc(page, k, v);
    return (await copyEa(page, app)).text;
  };
  let v = await vent('Mascarilla reservorio', { soporteLitros: '10' });
  check('soporte: mascarilla con reservorio a 10 L/min', /CON RESERVORIO A 10 L\/MIN/.test(v), v.match(/POR MASCARILLA[^|\n]*/)?.[0]);
  v = await vent('Alto flujo', { soporteFlujoLmin: '40', soporteFio2: '60' });
  check('soporte: alto flujo with flow and FiO2', /POR ALTO FLUJO 40 L\/MIN FI O2 60%/.test(v), v.slice(0, 1500));
  check('soporte: alto flujo shows the SpO₂/FiO₂ hint in the copy', /SpO₂\/FiO₂/.test(v), v.match(/\[[^\]]*\]/g));
  v = await vent('VMNI', { vmPsoporte: '10', vmPeep: '5', soporteFio2: '50' });
  check('soporte: VMNI with PS and EPAP', /CON VMNI PS 10 EPAP 5 FI O2 50%/.test(v), v.match(/CON VMNI[^|\n]*/)?.[0]);
  v = await vent('Ventilación mecánica', { vmModo: 'VCV', vmVt: '450', vmPeep: '8', soporteFio2: '40', vmFlujo: '60' });
  check('soporte: ventilación mecánica VCV with VT, PEEP, FiO2 and flow', /CON VENTILACIÓN MECÁNICA VCV VT 450 ML PEEP 8 FI O2 40% FLUJO 60 L\/MIN/.test(v), v.match(/CON VENTILACI[^|\n]*/)?.[0]);
  v = await vent('Traqueostomía', { soporteFio2: '35' });
  check('soporte: traqueostomía with FiO2', /CON TRAQUEOSTOMÍA FI O2 35%/.test(v), v.match(/CON TRAQUEOS[^|\n]*/)?.[0]);
  v = await vent('Aire ambiente', {});
  check('soporte: aire ambiente reads AL AIRE AMBIENTE', /AL AIRE AMBIENTE/.test(v));
}

/** Registro → Pegar monitoreo: vitals with unit variants. */
async function pasteMonitoreo(page) {
  const form = await openRegistro(page);
  const paste = async (text) => {
    if (!(await page.locator('#ea-paste-input').isVisible())) await page.locator('.ea-registro-paste-btn').click();
    await page.locator('#ea-paste-input').fill(text);
    return (await page.locator('#ea-paste-preview').innerText()).trim();
  };
  let prev = await paste('T 36.5\nFC 88 LPM\nFR 18 RPM\nSAT 96%\nTA 120/70 MMHG\nDXT 145 MG/DL');
  check('Pegar monitoreo: preview lists FC, FR, SatO₂ and T/A with their units', /FC 88 LPM/.test(prev) && /FR 18 RPM/.test(prev) && /SATURACION 96%/.test(prev) && /TA 120\/70 MMHG/.test(prev) && /DXT 145/.test(prev), prev);
  prev = await paste('FC: 92 lpm\nFR: 20 rpm\nTA: 110/60 mmHg');
  check('Pegar monitoreo: lower-case unit suffixes (lpm, rpm, mmHg) are dropped from the values', /FC 92 LPM/.test(prev) && /FR 20 RPM/.test(prev) && /TA 110\/60 MMHG/.test(prev), prev);
  prev = await paste('hola esto no es monitoreo');
  check('Pegar monitoreo: text with no vitals gets an error preview', /NO SE RECONOCI|SIN CAMPOS/i.test(prev), prev);
  await page.locator('#ea-paste-input').fill('FC 92 LPM\nTA 110/60 MMHG');
  await page.locator('#ea-paste-backdrop [data-onclick="confirmEstadoActualPaste"]').click();
  await page.waitForTimeout(300);
  const applied = {
    fc: await form.locator('[data-ea-vital="fc"][data-ea-layer-idx="0"]').inputValue(),
    tas: await form.locator('[data-ea-vital="tas"][data-ea-layer-idx="0"]').inputValue(),
    tad: await form.locator('[data-ea-vital="tad"][data-ea-layer-idx="0"]').inputValue(),
  };
  check('Pegar monitoreo: confirming fills the registro form', applied.fc === '92' && applied.tas === '110' && applied.tad === '60', applied);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).locator('visible=true').first().click();
  await form.waitFor({ state: 'hidden' });
}

async function pasteInto(page, text) {
  if (!(await page.locator('#ea-paste-input').isVisible())) await page.locator('.ea-registro-paste-btn').click();
  await page.locator('#ea-paste-input').fill(text);
  return (await page.locator('#ea-paste-preview').innerText()).trim();
}
async function pasteApply(page, text) {
  await pasteInto(page, text);
  await page.locator('#ea-paste-backdrop [data-onclick="confirmEstadoActualPaste"]').click();
  await page.waitForTimeout(300);
}
const cancelRegistro = async (page) => {
  await page.getByRole('button', { name: 'Cancelar', exact: true }).locator('visible=true').first().click();
  await page.locator('#ea-form').waitFor({ state: 'hidden' });
};

/** Altered marks flip exactly at the RANGES thresholds; glucometría altered reaches Gráficas. */
async function rangesThresholds(page) {
  let form = await openRegistro(page);
  await setRecordedAt(page, 0.3);
  const altered = async (key) => {
    const v = await form.locator(`.ea-vital-box:has([data-ea-vital="${key}"][data-ea-layer-idx="0"])`).evaluate((el) => el.classList.contains('ea-vital-box--altered'));
    return v;
  };
  const put = (key, v) => form.locator(`[data-ea-vital="${key}"][data-ea-layer-idx="0"]`).fill(String(v));
  const probe = async (key, values) => {
    const out = [];
    for (const v of values) { await put(key, v); out.push(await altered(key)); }
    return out;
  };
  check('empty vital is never altered', !(await altered('fc')));
  const fr = await probe('fr', [12, 20, 21, 28, 11]);
  check('FR alters above 20 and below 12, not at the limits', fr.join() === 'false,false,true,true,true', fr);
  const temp = await probe('temp', [37.5, 37.6, 36, 35.9]);
  check('Temp alters above 37.5 and below 36.0, not at the limits', temp.join() === 'false,true,false,true', temp);
  const sat = await probe('sat', [94, 93]);
  check('SatO₂ alters below 94, not at 94', sat.join() === 'false,true', sat);
  await put('tas', 88); await put('tad', 70);
  const a1 = [await altered('tas'), await altered('tad')];
  await put('tas', 120); await put('tad', 52);
  const a2 = [await altered('tas'), await altered('tad')];
  await put('tas', 140); await put('tad', 90);
  const a3 = [await altered('tas'), await altered('tad')];
  check('TAS and TAD alter separately (88/70, 120/52) and not at 140/90', a1.join() === 'true,false' && a2.join() === 'false,true' && a3.join() === 'false,false', { a1, a2, a3 });
  await put('tas', 130); await put('tad', 80);
  const rows = form.locator('.ea-glu-row');
  const g0 = rows.nth(0); const g1 = rows.nth(1);
  await g0.locator('[data-ea-glu-value]').fill('110');
  await g1.locator('[data-ea-glu-value]').fill('110');
  await g0.locator('[data-ea-glu-altered]').evaluate((el) => el.click());
  const cls = async (r) => r.evaluate((el) => el.classList.contains('ea-glu-row--altered'));
  check('glucometría is altered only when its Alterada box is ticked', (await cls(g0)) && !(await cls(g1)), { g0: await cls(g0), g1: await cls(g1) });
  await g0.locator('[data-ea-glu-altered]').evaluate((el) => el.click());
  await g0.locator('[data-ea-glu-value]').fill('65');
  await g1.locator('[data-ea-glu-value]').fill('200');
  await rows.nth(2).locator('[data-ea-glu-value]').fill('110');
  await submitRegistro(page, form);
  await page.locator('#ea-charts-summary').click();
  await page.locator('#ea-charts-backdrop.open').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.locator('#ea-charts-controls [data-ea-tab="glu"]').click();
  await page.waitForTimeout(300);
  const mount = page.locator('#ea-charts-modal-mount');
  const out = await mount.locator('.ea-charts-dot--out').count();
  const inr = await mount.locator('.ea-charts-dot:not(.ea-charts-dot--out)').count();
  check('Gráficas glucometrías: 65 and 200 are out of range, 110 is not', out >= 2 && inr >= 1, { out, inr });
  await page.keyboard.press('Escape');
  await page.locator('#ea-charts-backdrop.open').waitFor({ state: 'hidden' });
  check('UNREACHABLE isBpHypotensive / isHemodynamicallyUnstable: no caller outside estado-actual-ranges.mjs and its tests, so no UI path shows them', true, 'dead code; delete or wire up');
}

/** Ventilatory calculator hints and values from the soporte fields. */
async function ventHints(page) {
  const hints = async (soporte, fields) => {
    await setEc(page, 'soporte', soporte);
    for (const [k, v] of Object.entries(fields)) await setEc(page, k, v);
    // The hint list only re-renders when the soporte changes (not per field edit): bounce the selector like a user.
    await setEc(page, 'soporte', 'Aire ambiente');
    await setEc(page, 'soporte', soporte);
    return (await page.locator('[data-ea-soporte-calc]').innerText().catch(() => '')).replace(/\s+/g, ' ');
  };
  let h = await hints('Ventilación mecánica', { soporteFio2: '60', vmPeep: '10', vmPmeseta: '32', vmVt: '560' });
  check('VM hints: driving pressure 22 with strain alert', /Driving pressure 22 cmH₂O/.test(h) && /Driving pressure ≥15/.test(h), h);
  check('VM hints: P meseta ≥30 is flagged as non-protective', /P meseta ≥30: ventilación no protectora/.test(h), h);
  check('VM hints: SpO₂/FiO₂ from the latest SatO₂ and the FiO₂', /SpO₂\/FiO₂ 158(?!\d)/.test(h) && /SpO₂\/FiO₂ <315: sospecha SIRA/.test(h), h);
  check('VM hints: Tobin RRS shows in VM', /Tobin RRS \d/.test(h), h);
  check('VM hints: VT ml/kg is shown when the patient has a weight, and gets a range note', !/VT [\d.]+ ml\/kg/.test(h) || /VT (>8|6–8|≤6)/.test(h), h);
  h = await hints('Alto flujo', { soporteFlujoLmin: '50', soporteFio2: '70' });
  check('HFNC hints: ROX value and FiO₂ >60% intubation alert', /ROX \d/.test(h) && /FiO₂ >60% en alto flujo: valorar intubación/.test(h), h);
  check('HFNC hints: no Tobin RRS', !/Tobin/.test(h), h);
  h = await hints('Puntillas nasales', { soporteLitros: '2' });
  check('nasal cannula shows no ROX or driving-pressure hint', !/ROX|Driving/.test(h), h);
  await setEc(page, 'soporte', 'Aire ambiente');
}

/** Pegar monitoreo: I/O lines, UF, SAT tails, balance edge cases, a full block and the saved I/O clause. */
async function pasteIo(page, app) {
  let form = await openRegistro(page);
  let prev = await pasteInto(page, 'I: 645 CC\nE: DIURESIS NO CUANTIFICADA, DRENAJE 50 CC, NEFRO IZQ 20 CC\nEVAC: NC');
  check('Pegar: egresos line splits into diuresis NC, drenaje and nefrostomía izquierda', /DIURESIS NC/.test(prev) && /DRENAJE 50 CC/.test(prev) && /NEFROSTOM[ÍI]A IZQUIERDA 20 CC/.test(prev) && !/NO CUANTIFICADA/.test(prev), prev);
  check('Pegar: EVAC NC and ingresos read in the preview', /EVAC NC/.test(prev) && /645 CC/.test(prev), prev);
  prev = await pasteInto(page, 'E: DIURESIS 300 CC, ULTRAFILTRADO 3500 ML');
  check('Pegar: ULTRAFILTRADO is its own egress part', /DIURESIS 300 CC/.test(prev) && /ULTRAFILTRADO 3500/.test(prev), prev);
  prev = await pasteInto(page, 'E: UF 2800');
  check('Pegar: short «UF 2800» reads as ULTRAFILTRADO', /ULTRAFILTRADO 2800/.test(prev), prev);
  prev = await pasteInto(page, 'SAT: 97% AL AIRE AMBIENTE');
  check('Pegar: SAT with «AL AIRE AMBIENTE» shows the support', /SATURACION 97%.*AIRE AMBIENTE/i.test(prev), prev);
  prev = await pasteInto(page, 'SAT: 93% TQT');
  check('Pegar: SAT with «TQT» shows traqueostomía', /SATURACION 93%.*TRAQUEOSTOM/i.test(prev), prev);
  const bal = async (text) => {
    await pasteApply(page, text);
    return (await form.locator('#ea-io-bal-t1').innerText()).trim();
  };
  const b1 = await bal('I: 645 CC\nE: DIURESIS NO CUANTIFICADA, DRENAJE 50 CC');
  const b2 = await bal('I: 645 CC\nE: NC');
  const b3 = await bal('I: 645 CC\nE: DIURESIS 300 CC, DRENAJE 50 CC');
  const b4 = await bal('I: NC\nE: DIURESIS 300 CC');
  const b5 = await bal('I: 500\nE: DIURESIS 300 CC, ULTRAFILTRADO 3500 ML');
  check('balance edge cases: NC diuresis + drenaje counts the drenaje, all-NC and NC ingresos give NC, UF adds to egress', [b1, b2, b3, b4, b5].join('|') === '+595|NC|+295|NC|-3300', { b1, b2, b3, b4, b5 });
  await cancelRegistro(page);

  form = await openRegistro(page);
  await pasteApply(page, 'T°: 38.7 °C\nFC: 113 LPM\nFR: 19 RPM\nTA: 140/60 MMHG\nDXT: 198, 174, 101, 252 MG/DL\nSAT: 97% AL AIRE AMBIENTE\nI: 2,815 CC\nE: NO CUANTIFICADA\nB: NC\nEVAC: NO REPORTADAS');
  const v = (k) => form.locator(`[data-ea-vital="${k}"][data-ea-layer-idx="0"]`).inputValue();
  const got = { temp: await v('temp'), fc: await v('fc'), fr: await v('fr'), tas: await v('tas'), tad: await v('tad'), sat: await v('sat') };
  const glus = await form.locator('[data-ea-glu-value]').evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
  const io = { ing: await form.locator('#ea-io-ing-t1').inputValue(), egr: await form.locator('#ea-io-egr-t1').inputValue(), evac: await form.locator('#ea-io-evac').inputValue(), bal: (await form.locator('#ea-io-bal-t1').innerText()).trim() };
  check('Pegar: a full vitals block fills every vital, four glucometrías, I/E/EVAC and keeps balance NC', got.temp === '38.7' && got.fc === '113' && got.fr === '19' && got.tas === '140' && got.tad === '60' && got.sat === '97' && glus.join() === '198,174,101,252' && io.ing === '2815' && /NC|NO CUANT/i.test(io.egr) && io.evac === 'NC' && io.bal === 'NC', { got, glus, io });
  const soporte = await page.locator('[data-ea-ec="soporte"]').inputValue();
  check('Pegar: the SAT tail «AL AIRE AMBIENTE» sets the soporte in the panel', soporte === 'Aire ambiente', soporte);
  await cancelRegistro(page);

  const T = (await copyEa(page, app)).text;
  check('copied I/O reads as one clause: INGRESOS, DIURESIS (sum, 3T), custom source, EVACUACIONES, BALANCE', /INGRESOS 300 CC, DIURESIS \(1200, 3T\), SONDA NASOGÁSTRICA 250 CC, EVACUACIONES 3, BALANCE -1150 CC/.test(T), T.match(/INGRESOS[^|\n]*/)?.[0]);
}

/** Pegar monitoreo: reordered lines, @HH:MM times, SATURACION with a space before %, and the ORIENTADO EN ___ guard. */
async function pasteParser(page) {
  let form = await openRegistro(page);
  const v = (k) => form.locator(`[data-ea-vital="${k}"][data-ea-layer-idx="0"]`).inputValue();
  const prevReorder = (await pasteInto(page, 'E: NC\nI: 500\nTA: 120/80\nT°: 37.2 °C 08:15\nDXT: 110@07:00, 95')).replace(/\s+/g, ' ');
  await page.locator('#ea-paste-backdrop [data-onclick="confirmEstadoActualPaste"]').click();
  await page.waitForTimeout(300);
  const glus = await form.locator('.ea-glu-row').evaluateAll((rows) =>
    rows.map((r) => ({ v: r.querySelector('[data-ea-glu-value]')?.value || '', t: r.querySelector('[data-ea-glu-time]')?.value || '' })).filter((g) => g.v)
  );
  const ing = await form.locator('#ea-io-ing-t1').inputValue();
  check(
    'Pegar: lines in a different order still fill I, TA, Temp and DXT',
    ing === '500' && (await v('tas')) === '120' && (await v('tad')) === '80' && (await v('temp')) === '37.2' && glus.map((g) => g.v).join() === '110,95',
    { ing, glus }
  );
  check('Pegar: «110@07:00» shows its time in the preview, a bare value gets none', /110 MG\/DL @ ?07:00|110@07:00|07:00/.test(prevReorder) && !/95 MG\/DL @/.test(prevReorder), prevReorder);
  check('Pegar: «T°: 37.2 °C 08:15» keeps its 08:15 time in the preview', /08:15/.test(prevReorder), prevReorder);
  await cancelRegistro(page);

  form = await openRegistro(page);
  const prev = await pasteInto(page, 'SATURACION: 95 %');
  check('Pegar: «SATURACION: 95 %» (space before %) is read as SatO₂ 95', /SATURACION 95%/.test(prev), prev);
  await pasteApply(page, 'SATURACION: 95 %');
  check('Pegar: «SATURACION: 95 %» fills SatO₂', (await v('sat')) === '95', await v('sat'));
  await cancelRegistro(page);

  form = await openRegistro(page);
  const guard = await pasteInto(page, 'T°: 36 °C\nN: FOUR .../16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ___ ESFERAS, ALERTA\nI: 500 CC');
  check('Pegar: «ORIENTADO EN ___ ESFERAS» is not read as an egresos line', /500 CC/.test(guard) && !/DIURESIS|EGRES/i.test(guard) && /LÍNEA NO RECONOCIDA/.test(guard), guard);
  await pasteApply(page, 'T°: 36 °C\nN: FOUR .../16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ___ ESFERAS, ALERTA\nI: 500 CC');
  const egr = await form.locator('#ea-io-egr-t1').inputValue();
  check('Pegar: the ORIENTADO line leaves the egresos cell empty', egr === '', egr);
  await cancelRegistro(page);
}

/** I/O turn totals (sumIoTurnos) and the evacuaciones text, read from the registro and the copy. */
async function ioTotals(page, app) {
  const form = await openRegistro(page);
  await setRecordedAt(page, 0.2);
  const set = (id, val) => form.locator(id).fill(val);
  const total = async (id) => (await form.locator(id).innerText()).replace(/\s+/g, ' ').trim();
  await set('#ea-io-ing-t1', '200'); await set('#ea-io-ing-t2', 'NC'); await set('#ea-io-ing-t3', '500');
  const t1 = await total('#ea-io-ing-total');
  await set('#ea-io-ing-t2', '');
  const t2 = await total('#ea-io-ing-total');
  await set('#ea-io-ing-t1', 'NC'); await set('#ea-io-ing-t3', '');
  const t3 = await total('#ea-io-ing-total');
  check('turn totals: NC turns are skipped and counted out (700), an empty turn counts like NC, all NC gives NC', t1 === '700' && t2 === '700' && t3 === 'NC', { t1, t2, t3 });
  await set('#ea-io-egr-t1', 'DIURESIS 300 CC, DRENAJE 50 CC'); await set('#ea-io-egr-t2', 'DIURESIS NC');
  const e1 = await total('#ea-io-egr-total');
  check('turn totals: a turn with two egress parts adds them (350), an NC turn is skipped', e1 === '350', e1);
  await set('#ea-io-ing-t1', '300');
  await set('#ea-io-evac', 'MELENA');
  await fillVital(form, 'fc', [80]);
  await submitRegistro(page, form);
  const T = (await copyEa(page, app)).text;
  check('copied text: a word evacuación is upper-cased with no CC', /EVACUACIONES MELENA(?! CC)/i.test(T), T.match(/EVACUACIONES[^\n,]*/i)?.[0]);
}

/** PICO of the temperature: the earlier of two Temp layers, only from 38 °C. */
async function tempPeak(page, app) {
  const reg = async (vals) => {
    const form = await openRegistro(page);
    await setRecordedAt(page, 0.1);
    await fillVital(form, 'temp', vals);
    await submitRegistro(page, form);
    return (await copyEa(page, app)).text;
  };
  let T = await reg([38.6, 37.1]);
  check('copied Temp documents a PICO from 38 °C', /TEMPERATURA 37\.1 °C \(PICO 38\.6 °C/.test(T), T.match(/TEMPERATURA[^\n]*/)?.[0]);
  T = await reg([37.9, 37.2]);
  check('copied Temp has no PICO below 38 °C', /TEMPERATURA 37\.2 °C/.test(T) && !/PICO/.test(T), T.match(/TEMPERATURA[^\n]*/)?.[0]);
  check('UNREACHABLE buildAlteredAtDefaults: only the Interno app (lib/interno/interno-vitals.mjs) calls it, no Estado actual UI path', true, 'keep old test');
}

/** With an arterial gasometría the ventilatory hints use PaFi and its SIRA / prono alerts. */
async function ventPafi(page) {
  const d = new Date(Date.now() - 30 * 60e3);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const when = `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const report =
    header({ exp: '9000095-7', name: 'DEMO PÉREZ JUAN' }, when) +
    'GASOMETRIAS\nGASOMETRIA ARTERIAL COMPLETA\n' + TABLE +
    'PH\t*\t7.36\t\t7.35 - 7.45\n' +
    'pCO2\t*\t40\tmmHg\t35 - 45\n' +
    'pO2\tB\t55\tmmHg\t80 - 100\n' +
    'HCO3\t*\t23\tmmol/L\t22.0 - 26.0\n';
  await goArea(page, 'lab');
  await pasteAndSave(page, report);
  await goArea(page, 'nota');
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  await setEc(page, 'soporte', 'Ventilación mecánica');
  await setEc(page, 'soporteFio2', '60');
  await setEc(page, 'soporte', 'Aire ambiente');
  await setEc(page, 'soporte', 'Ventilación mecánica');
  const h = (await page.locator('[data-ea-soporte-calc]').innerText().catch(() => '')).replace(/\s+/g, ' ');
  check('VM hints with an arterial gas: PaFi 92 with SIRA severo, prono and <100 alerts', /PaFi 92 \(SIRA severo\)/.test(h) && /PaFi <150: valorar prono/.test(h) && /PaFi <100: SIRA severo/.test(h), h);
  await setEc(page, 'soporte', 'Aire ambiente');
}

async function run() {
  const { app, page, pageErrors } = await launch();
  await admitDemoPatient(page);
  await checkSalaActionBar(page);
  await openEstadoActual(page);
  await shot(page, 'estado-actual-empty');
  check(
    'empty Signos vitales title carries no date stamp',
    (await page.locator('#ea-snapshot .ea-snapshot-zone-stamp').count()) === 0,
    await page.locator('#ea-snapshot .ea-snapshot-zone-title').first().innerText()
  );

  await addMeds(page);
  const medCount = await page.locator('.ea-estado-clinico .ea-med-item-list [data-ea-med-remove]').count();
  check('8 medications listed in 6 categories', medCount === 8 && (await page.locator('[data-ea-med-cat]').count()) === 6, medCount);
  await checkMedGrid(page);

  const medsShown = () => page.locator('.ea-estado-clinico [data-ea-med-remove]').count();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="notas"]').click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  check('medications survive leaving the screen', (await medsShown()) === 8, await medsShown());

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
  check('medications survive a registro', (await medsShown()) === 8, await medsShown());
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
  // Readings are from 3 h ago and now: all today unless the run is right after midnight.
  if (new Date().getHours() >= 4) {
    const now = new Date();
    const dm = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const zoneStamp = (await page.locator('#ea-snapshot .ea-snapshot-zone-stamp').allInnerTexts()).map((t) => t.trim());
    check('Signos vitales title carries today\'s dd/mm', zoneStamp.length === 1 && zoneStamp[0] === dm, { zoneStamp, dm });
    const rowStamps = await page.locator('#ea-snapshot .ea-snapshot-row-stamp:not(.ea-snapshot-row-stamp--empty)').allInnerTexts();
    check('no per-row date stamp when every reading is today', rowStamps.length === 0, rowStamps);
  }
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

  // Historial starts folded so the panel fits one screen; open it like a user would.
  const histFolded = !(await page.locator('#ea-historial').evaluate((el) => el.open));
  check('historial starts folded', histFolded);
  if (histFolded) await page.locator('#ea-historial > summary').click();
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
  await page.locator('.exp-group-section[data-section="notas"]').click();
  await page.waitForTimeout(200);
  check('copy FAB hides outside Estado actual', await fab.isHidden());
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  check('copy FAB is visible again after returning to Estado actual', await fab.isVisible());
  check('html carries ea-copy-fab-active on Estado actual', await page.evaluate(() => document.documentElement.classList.contains('ea-copy-fab-active')));
  check('copied Estado actual HTML uses <br> line breaks and the text uses newlines', /<br\s*\/?>/.test(clip.html || '') && /\n/.test(clip.text), { br: /<br/.test(clip.html || ''), nl: /\n/.test(clip.text) });

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
  const noteInputs = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map((i) => i.value));
  check(
    'Enviar a nota fills the note vitals (TA and FC of the newest registro)',
    noteInputs.some((v) => /128\s*\/\s*78/.test(v)) && noteInputs.some((v) => v.trim() === '88'),
    noteInputs.filter(Boolean).slice(0, 12)
  );
  check('the note evolución was replaced: it holds the Estado actual clauses', /VASOPRESORES: NINGUNO/.test(noteText));
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
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });

  const chartsBtn = page.locator('#ea-charts-summary');
  await chartsBtn.click();
  const chartsModal = page.locator('#ea-charts-backdrop.open');
  await chartsModal.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await shot(page, 'graficas-signos');
  const chartsMount = page.locator('#ea-charts-modal-mount');
  const plots = await chartsMount.locator('.ea-charts-row-plot').evaluateAll((els) => els.map((e) => e.dataset.eaPlot));
  const groups = await chartsMount.locator('.ea-charts-group-label').allInnerTexts();
  check('Gráficas: one row per sign, grouped Hemodinámico / Respiratorio / Metabólico',
    plots.join() === 'ta,fc,fr,sat,temp' && groups.map((g) => g.toUpperCase()).join() === 'HEMODINÁMICO,RESPIRATORIO,METABÓLICO', { plots, groups });
  check('Gráficas: «Últimas 5» is the default period',
    (await page.locator('#ea-charts-controls [data-ea-range="last5"]').getAttribute('aria-selected')) === 'true');
  check('Gráficas: at rest each row shows «Último · <fecha>»',
    (await chartsMount.locator('.ea-charts-row-when').allInnerTexts()).every((t) => /^Último · \d\d\/\d\d/.test(t)));
  const ticks = await chartsMount.locator('.ea-charts-axis-tick').evaluateAll((els) =>
    els.map((e) => ({ day: e.querySelector('strong').textContent, hour: e.querySelector('span').textContent })));
  const days = ticks.map((t) => t.day).filter(Boolean);
  check('Gráficas: X axis writes each day once, hours only on a day with >1 reading',
    // Readings sit hours before «now», so shortly after midnight they span two days: then each day has one reading and no hour.
    ticks.length >= 2 && new Set(days).size === days.length && ticks.every((t) => (days.length === 1 || !t.hour) ? (days.length > 1 || /^\d\d:\d\d$/.test(t.hour)) : /^\d\d:\d\d$/.test(t.hour)), ticks);
  await chartsMount.locator('[data-ea-hit-plot="ta"][data-ea-hit="0"]').hover();
  const guides = await chartsMount.locator('.ea-charts-guide').evaluateAll((els) => els.map((e) => (e.hidden ? 'hidden' : e.style.left)));
  const whenFc = await chartsMount.locator('.ea-charts-row').nth(1).locator('.ea-charts-row-when').innerText();
  check('Gráficas: hovering T/A moves one crosshair across every row and the axis',
    guides.length === 6 && new Set(guides).size === 1 && guides[0] !== 'hidden' && !/^Último/.test(whenFc), { guides, whenFc });
  await shot(page, 'graficas-crosshair');
  const fonts = await page.evaluate(() => [getComputedStyle(document.getElementById('ea-charts-title')).fontFamily, getComputedStyle(document.body).fontFamily]);
  check('Gráficas: title uses the body font', fonts[0] === fonts[1], fonts);
  for (const [tab, label] of [['glu', 'glucometrias'], ['bal', 'balance']]) {
    const btn = page.locator(`#ea-charts-controls [data-ea-tab="${tab}"]`);
    if (await btn.isDisabled()) continue;
    await btn.click();
    await page.waitForTimeout(200);
    await shot(page, 'graficas-' + label);
  }
  check('Gráficas: Balance hídrico shows 3 cards, mirrored bars and the running total',
    (await chartsMount.locator('.ea-charts-bal-card').count()) === 3 &&
      (await chartsMount.locator('.ea-charts-bal-bar--in').count()) >= 1 &&
      (await chartsMount.locator('.ea-charts-bal-bar--out').count()) >= 1 &&
      (await chartsMount.locator('.ea-charts-bal-cum-line').count()) === 1);
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

  // Team copy shortcut (Cmd/Ctrl+Shift+C on Estado actual).
  await app.evaluate(({ clipboard }) => clipboard.clear());
  await page.locator('#ea-snapshot').click({ position: { x: 4, y: 4 } });
  await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+Shift+C`);
  await page.waitForTimeout(500);
  const teamToast = await page.locator('.toast').allInnerTexts();
  const teamClip = await app.evaluate(({ clipboard }) => clipboard.readText());
  check(
    'Cmd/Ctrl+Shift+C on Estado actual answers with a toast and copies without ** markers',
    teamToast.some((t) => /Estado actual copiado|No hay estado actual/.test(t)) && !/\*\*/.test(teamClip),
    { teamToast, teamClip: teamClip.slice(0, 80) }
  );

  await section('historial extras', () => historialExtras(page));
  await section('turns registros', () => turnsRegistros(page));
  await section('keyboard and HD', () => keyboardAndHd(page));
  await section('copy variants', () => copyVariants(page, app));
  await section('paste monitoreo', () => pasteMonitoreo(page));
  await section('ranges thresholds', () => rangesThresholds(page));
  await section('ventilatory hints', () => ventHints(page));
  await section('paste I/O', () => pasteIo(page, app));
  await section('paste parser', () => pasteParser(page));
  await section('I/O totals', () => ioTotals(page, app));
  await section('temp peak', () => tempPeak(page, app));
  await section('ventilatory PaFi', () => ventPafi(page));

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

const a11yCheck = a11y.verdict();
if (a11yCheck) check(a11yCheck.name, a11yCheck.ok, a11yCheck.detail);
const passed = checks.filter((c) => c.ok).length;
const report = { scenario: 'Estado actual busy patient + turn events', runId, passed, failed: checks.length - passed, checks };
fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.rmSync(userDataDir, { recursive: true, force: true });
console.log(`\n${passed}/${checks.length} checks passed. Artifact: ${path.relative(repoRoot, artifactDir)}`);
process.exit(report.failed === 0 ? 0 : 1);
