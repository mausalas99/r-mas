#!/usr/bin/env node
/* global document, window, getComputedStyle */
/**
 * E2E: VPO (Paciente → Clínico → VPO) fits one screen with no vertical
 * scroll at 1440×902, with a busy synthetic patient. Driven through the
 * real Electron app with Playwright, same pattern as estado-actual.e2e.mjs.
 * Synthetic DEMO fixtures only.
 *
 * Scenario (medium-hard, not the empty state):
 *   1. Fresh userData → admit the DEMO JUAN patient from the demo SOME lab paste.
 *   2. Interconsulta → Medicamentos → import a 5-drug SOME receta.
 *   3. Paciente → Clínico → VPO: fill FC, EKG, Rx, intro, 5 risk scales,
 *      "Pegar lista con «+»" diagnósticos split then 4 diagnósticos (typed
 *      one by one via Enter), pull fármacos from the SOME receta just imported.
 *   4. Check: the VPO pane's scroll container never grows past its
 *      viewport height at 1440×902 (no page scroll) and no page errors.
 *
 * Ways it can go wrong (each one is a check below):
 *   - "Separar por +" gives no feedback when nothing parses (no error toast,
 *     textarea not marked invalid) — the user thinks the paste worked
 *   - "Separar por +" does not split on "+", or does not clear the invalid
 *     marking once a valid paste is entered
 *   - "Copiar valoración completa" ships EKG/Rx/Diagnósticos/Valoración out
 *     of order
 *   - a risk scale left blank (no external-calculator result yet) shows a
 *     fabricated computed value instead of "—" (R+ must never compute risk
 *     scores itself)
 *
 * Artifact: e2e-artifacts/vpo/<run-id>/ with report.json and one
 * screenshot per step. Exit code 0 = every check passed.
 *
 *   npm run e2e:vpo
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
const artifactDir = path.join(repoRoot, 'e2e-artifacts', 'vpo', runId);
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

/** SOME "indicaciones" block (tab separated), dated two days ago — same shape as manejo-receta.e2e.mjs. */
const pad = (n) => String(n).padStart(2, '0');
const dmy = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const today = new Date();
const listDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
const D = dmy(listDay);
const row = (t, ...cols) => [`${D} 08:${t} a.m.`, ...cols, 'NW'].join('\t');
const SOME_MEDS = [
  row('10:01', 'MEDICAMENTOS', 'CEFTRIAXONA 1 G SOL INY (*)', 'VIA INTRAVENOSA', '1 G // *DIA# 3*', 'CADA 24 HORAS'),
  row('10:02', 'MEDICAMENTOS', 'ENOXAPARINA 40 MG SOL INY 0.4 ML (+*)', 'VIA SUBCUTANEA', '40 MG //', 'CADA 24 HORAS'),
  row('10:03', 'MEDICAMENTOS', 'LOSARTAN 50 MG COMPRIMIDO (*)', 'VIA ORAL', '50 MG //', 'CADA 24 HORAS'),
  row('10:04', 'MEDICAMENTOS', 'PARACETAMOL 1 G SOL INY 100 ML (*)', 'VIA INTRAVENOSA', '1 G //', 'CADA 8 HORAS'),
  row('10:05', 'MEDICAMENTOS', 'AMLODIPINO 5 MG COMPRIMIDO', 'VIA ORAL', '5 MG //', 'CADA 24 HORAS'),
].join('\n');

const DIAGNOSTICOS = ['HIPERTENSIÓN ARTERIAL', 'DIABETES MELLITUS TIPO 2', 'ERC ESTADIO 3', 'ANEMIA CRÓNICA'];

async function launch() {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [repoRoot, `--user-data-dir=${userDataDir}`],
    cwd: repoRoot,
    env: { ...process.env, R_PLUS_VERIFY_MODE: '1', R_PLUS_USER_DATA: userDataDir, R_PLUS_LAN_HTTP_PORT: '3793' },
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
  await page.setViewportSize({ width: 1440, height: 902 });
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

async function importSomeMeds(page) {
  await closeToasts(page);
  await page.locator('#apptab-med').click();
  await page.locator('#med-itab-receta').click();
  await page.waitForTimeout(300);
  await page.locator('#med-import-open-btn').click();
  await page.locator('#med-input').fill(SOME_MEDS);
  await page.getByRole('button', { name: 'Procesar receta' }).click();
  await page.waitForTimeout(400);
  await closeToasts(page);
}

async function openVpo(page) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const icBtn = page.locator('#header-mode-seg button[data-mode="interconsulta"]');
  await icBtn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await icBtn.click();
  const icToast = page.locator('.toast', { hasText: 'Interconsulta' });
  if (await icToast.count()) await icToast.waitFor({ state: 'visible' }).catch(() => {});
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.waitForTimeout(500);
  const boardCard = page.getByText('DEMO JUAN', { exact: true }).locator('visible=true').first();
  if (await boardCard.isVisible().catch(() => false)) await boardCard.click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'VPO' }).click();
  await page.locator('#vpo-container .vpo-panel').waitFor({ state: 'visible' });
}

async function fillBusyVpo(page) {
  await shot(page, 'vpo-empty');
  const empty = await page.evaluate(() => ({
    farmRows: document.querySelectorAll('.vpo-farm-row').length,
    dxRows: document.querySelectorAll('[data-vpo-dx-idx]').length,
  }));
  check('empty VPO shows one blank diagnóstico row and no fármacos', empty.dxRows === 1 && empty.farmRows === 0, empty);

  // Riesgo preoperatorio — Gupta left undocumented on purpose: R+ must show
  // "—" for it, never a computed percentage (formatRiskLines edge case).
  await page.locator('[data-vpo-field="valoracionIntro"]').fill('Valoración prequirúrgica: programado para colecistectomía electiva.');
  const scales = { asa: 'II', rcri: '1 punto', gupta: '', ariscat: '26 (bajo)', caprini: '3 (moderado)' };
  for (const [key, val] of Object.entries(scales)) {
    await page.locator(`[data-vpo-scale="${key}"]`).fill(val);
  }

  // EKG / Rx
  await page.locator('#vpo-fc').fill('82');
  await page.locator('#vpo-ekg').fill('RITMO SINUSAL\nFC ___ LPM\nSIN ALTERACIONES AGUDAS DE LA REPOLARIZACIÓN');
  await page.locator('#vpo-rx').fill('SIN INFILTRADOS NI CONSOLIDACIONES\nSILUETA CARDIACA NORMAL\nSIN DERRAME PLEURAL');

  // Diagnósticos: "Pegar lista con «+»" — error path (nothing parses), then
  // a paste that splits into rows. Same rows are then re-typed by the loop
  // below (Enter-walk coverage), so the two features compose on one state.
  await page.locator('.vpo-dx-paste summary').click();
  const dxPasteInput = page.locator('[data-vpo-dx-paste]');
  const dxSplitBtn = page.locator('[data-vpo-action="dx-split-plus"]');
  await dxSplitBtn.click();
  const splitErrToast = page.locator('.toast', { hasText: 'Pega diagnósticos separados por +' });
  await splitErrToast.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  check(
    'empty "Separar por +" paste → error toast, textarea marked invalid',
    (await splitErrToast.count()) > 0 && (await dxPasteInput.getAttribute('aria-invalid')) === 'true',
    await dxPasteInput.getAttribute('aria-invalid')
  );
  const invalidA11y = await page.evaluate(() => {
    const ta = document.querySelector('[data-vpo-dx-paste]');
    const id = ta && ta.getAttribute('aria-describedby');
    const msg = id ? document.getElementById(id)?.textContent : null;
    return { msg, focused: document.activeElement === ta };
  });
  check(
    'invalid "Separar por +" paste sets an aria-describedby message and focuses the textarea',
    invalidA11y.msg === 'Pega diagnósticos separados por +' && invalidA11y.focused,
    invalidA11y
  );
  await closeToasts(page);

  await dxPasteInput.fill('HTA + DM2 TIPO 2');
  await dxSplitBtn.click();
  const splitOkToast = page.locator('.toast', { hasText: 'Diagnósticos separados' });
  await splitOkToast.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  const afterSplit = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-vpo-dx-idx]')).map((el) => el.value)
  );
  check(
    '"Separar por +" splits into one row per diagnóstico and clears the invalid marking',
    afterSplit[0] === 'HTA' && afterSplit[1] === 'DM2 TIPO 2' && (await dxPasteInput.getAttribute('aria-invalid')) === null,
    afterSplit
  );
  await closeToasts(page);

  // Diagnósticos: type the first, Enter walks to the next row.
  for (let i = 0; i < DIAGNOSTICOS.length; i++) {
    const input = page.locator(`[data-vpo-dx-idx="${i}"]`);
    await input.fill(DIAGNOSTICOS[i]);
    if (i < DIAGNOSTICOS.length - 1) await input.press('Enter');
  }
  const dxCount = await page.locator('[data-vpo-dx-idx]').count();
  check('4 diagnósticos typed, Enter walks the list', dxCount === DIAGNOSTICOS.length, dxCount);

  // Fármacos: pull from the SOME receta imported in Medicamentos.
  await page.locator('[data-vpo-action="tomar-meds"]').click();
  await page.locator('.vpo-farm-row').first().waitFor({ state: 'visible' });
  const farmCount = await page.locator('.vpo-farm-row').count();
  check('fármacos pulled from SOME receta, one row per drug', farmCount === 5, farmCount);
  await page.locator('.vpo-farm-nota').first().fill('Continuar, sin ajuste perioperatorio.');

  await page.waitForTimeout(200);
}

async function run() {
  const { app, page, pageErrors } = await launch();
  await admitDemoPatient(page);
  await importSomeMeds(page);
  await openVpo(page);
  await fillBusyVpo(page);
  await shot(page, 'vpo-busy');

  const fit = await page.evaluate(() => {
    const el = document.querySelector('.exp-segment-body--clinico');
    return el ? { scroll: el.scrollHeight, client: el.clientHeight, vh: window.innerHeight } : null;
  });
  check('VPO fits one screen, no scroll', !!fit && fit.scroll <= fit.client + 1, fit);

  const style = await page.evaluate(() => {
    const title = document.querySelector('.vpo-section-title');
    const link = document.querySelector('.vpo-panel .ea-io-link');
    const input = document.querySelector('.vpo-panel input.ea-input');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const t = cs(title);
    const l = cs(link);
    const i = cs(input);
    return {
      titleUppercase: t && t.textTransform === 'uppercase',
      titleWeight: t && t.fontWeight,
      linkNoBorder: l && (l.borderStyle === 'none' || l.borderWidth === '0px'),
      linkNoBg: l && (l.backgroundColor === 'rgba(0, 0, 0, 0)' || l.backgroundColor === 'transparent'),
      inputHeight: i && i.height,
    };
  });
  check('section titles are uppercase/bold', style.titleUppercase && Number(style.titleWeight) >= 700, style);
  check('secondary actions are borderless text links', style.linkNoBorder && style.linkNoBg, style);
  check('inputs share one 32px flat height', style.inputHeight === '32px', style);

  const twoCol = await page.evaluate(() => {
    const cols = document.querySelectorAll('.vpo-col');
    if (cols.length !== 2) return null;
    return cols[0].getBoundingClientRect().left < cols[1].getBoundingClientRect().left;
  });
  check('layout is two columns at 1440px wide', twoCol === true, twoCol);

  await page.locator('[data-vpo-action="copy-full"]').click();
  const toast = page.locator('.toast', { hasText: 'copiado' });
  await toast.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  check('copiar valoración completa shows a confirmation toast', (await toast.count()) > 0, await toast.count());
  await closeToasts(page);

  const fullClip = await app.evaluate(({ clipboard }) => clipboard.readText());
  const order = [
    fullClip.indexOf('ELECTROCARDIOGRAMA:'),
    fullClip.indexOf('RADIOGRAFÍA DE TÓRAX:'),
    fullClip.indexOf('DIAGNÓSTICOS:'),
    fullClip.indexOf('VALORACIÓN PREOPERATORIA:'),
  ];
  check(
    'copied text keeps orden institucional: EKG, Rx, Diagnósticos, Valoración',
    order.every((v) => v >= 0) && order[0] < order[1] && order[1] < order[2] && order[2] < order[3],
    order
  );
  check(
    'Gupta MICA left blank shows "—", never a fabricated computed percentage',
    /Gupta MICA: —/.test(fullClip) && !/GUPTA:\s*[\d.]+%/i.test(fullClip),
    fullClip.split('\n').find((l) => /Gupta/i.test(l))
  );
  check(
    'copied text carries the ASA, RCRI, ARISCAT and Caprini lines as typed',
    /ASA: II/.test(fullClip) && /RCRI \(índice de Lee\): 1 punto/.test(fullClip) &&
      /ARISCAT: 26 \(bajo\)/.test(fullClip) && /Caprini: 3 \(moderado\)/.test(fullClip),
    fullClip.split('\n').filter((l) => /ASA|RCRI|ARISCAT|Caprini/i.test(l))
  );
  check(
    'no fabricated «LEE: N PUNTOS» summary line (R+ never computes it)',
    !/LEE:\s*\d+\s*PUNTOS/i.test(fullClip),
    fullClip.split('\n').filter((l) => /LEE/i.test(l))
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
const report = { scenario: 'VPO busy patient, one screen no scroll', runId, passed, failed: checks.length - passed, checks };
fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.rmSync(userDataDir, { recursive: true, force: true });
console.log(`\n${passed}/${checks.length} checks passed. Artifact: ${path.relative(repoRoot, artifactDir)}`);
process.exit(report.failed === 0 ? 0 : 1);
