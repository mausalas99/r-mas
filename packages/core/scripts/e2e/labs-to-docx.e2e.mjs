#!/usr/bin/env node
/* global document */
/**
 * E2E: SOME paste → structured labs → .docx (the R+ north star), driven through
 * the real Electron app with Playwright. Synthetic DEMO fixtures only.
 *
 * Scenario (medium-hard on purpose):
 *   1. Fresh userData → onboarding "Solo este equipo".
 *   2. Paste two patients WITHOUT the separator → app must refuse, save nothing.
 *   3. Paste again WITH the separator (Pérez = 2 days, García = 1 day) →
 *      preview shows both, admit both, 3 lab sets saved.
 *   4. Pérez keeps both lab dates. Complete his admission.
 *   5. Switch to Interconsulta, open Pérez's note, export the .docx via ⌘K.
 *   6. Open the .docx and check its content.
 *   7. Restart the app on the same userData → patients and lab dates persist.
 *
 * Artifact: e2e-artifacts/labs-to-docx/<run-id>/ with report.json, the .docx,
 * and one screenshot per step. Exit code 0 = every check passed.
 *
 *   npm run e2e:labs-to-docx
 */
import { _electron as electron } from 'playwright';
import electronPath from 'electron';
import JSZip from 'jszip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEMO_TOUR_LAB_PASTE,
  DEMO_GARCIA_LAB_REPORT,
} from '../../public/js/tour-demo-some-lab.mjs';
import { LAB_BULK_PATIENT_SEPARATOR } from '../../public/js/lab-bulk-paste.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'e2e-artifacts', 'labs-to-docx', runId);
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-ud-'));
const downloadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-dl-'));
fs.mkdirSync(artifactDir, { recursive: true });

const checks = [];
let shotN = 0;

function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + JSON.stringify(detail) : ''}`);
}

async function shot(page, label) {
  shotN += 1;
  const file = `${String(shotN).padStart(2, '0')}-${label}.png`;
  await page.screenshot({ path: path.join(artifactDir, file) });
}

async function launch() {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [repoRoot, `--user-data-dir=${userDataDir}`],
    cwd: repoRoot,
    env: {
      ...process.env,
      R_PLUS_VERIFY_MODE: '1',
      R_PLUS_USER_DATA: userDataDir,
      R_PLUS_LAN_HTTP_PORT: '3791',
    },
    timeout: 60000,
  });
  // Offline and deterministic: no hospital repository lookups, no native dialogs,
  // .docx lands in a temp "Downloads" dir.
  await app.evaluate(({ app: a, ipcMain, dialog }, dl) => {
    a.setPath('downloads', dl);
    globalThis.__e2e = { repoCalls: [], dialogs: [] };
    ipcMain.removeHandler('lab-repo-fetch');
    ipcMain.handle('lab-repo-fetch', (_e, p) => {
      globalThis.__e2e.repoCalls.push(p && p.registro);
      return { studies: [] };
    });
    dialog.showOpenDialog = async () => {
      globalThis.__e2e.dialogs.push('open');
      return { canceled: false, filePaths: [dl] };
    };
    dialog.showSaveDialog = async () => {
      globalThis.__e2e.dialogs.push('save');
      return { canceled: true };
    };
  }, downloadsDir);
  const page = await app.firstWindow();
  // Sala opens in the card view by default; these scenarios drive the sidebar.
  await page.waitForLoadState('domcontentloaded');
  const salaCards = await page.evaluate(() => { globalThis.localStorage.setItem('rplus-sala-view', 'bar'); return !!globalThis.document.body.dataset.salaView; });
  if (salaCards) await page.reload();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  return { app, page, pageErrors };
}

/** The first-run help sheet can open a moment after boot. Close it like a user. */
async function dismissLearnHub(page) {
  const hub = page.locator('#learn-hub-backdrop.open');
  await hub.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await hub.count()) {
    await page.keyboard.press('Escape');
    await hub.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}

async function closeToasts(page) {
  for (const btn of await page.locator('.toast-close').all()) await btn.click().catch(() => {});
}

async function sidebarCount(page) {
  return page.locator('.p-name').evaluateAll((els) =>
    els.filter((e) => e.getBoundingClientRect().width > 0).length
  );
}

async function pasteAndProcess(page, text) {
  if (!(await page.locator('#lab-input').isVisible())) {
    await page.locator('#btn-lab-paste').click();
    await page.locator('#lab-input').waitFor({ state: 'visible' });
  }
  await page.locator('#lab-input').fill(text);
  await page.locator('#btn-procesar').click();
}

async function docxText(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const xml = await zip.file('word/document.xml').async('string');
  return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
}

async function run() {
  // ── Boot 1: fresh install ────────────────────────────────────────────────
  let { app, page, pageErrors } = await launch();
  await page.locator('[data-sync-mode="local"]').click();
  await page.locator('#clinical-onboard-local-confirm-btn').click();
  await page.locator('#apptab-lab').waitFor({ state: 'visible' });
  await dismissLearnHub(page);
  await shot(page, 'onboarded');
  check('fresh install starts with 0 patients', (await sidebarCount(page)) === 0);

  // ── Mixed paste without separator → refused ─────────────────────────────
  await page.locator('#apptab-lab').click();
  await pasteAndProcess(page, DEMO_TOUR_LAB_PASTE + '\n\n' + DEMO_GARCIA_LAB_REPORT);
  const refusal = page.locator('.toast', { hasText: 'expedientes distintos' });
  await refusal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await shot(page, 'mixed-paste-refused');
  check('mixed paste without separator is refused', await refusal.isVisible());
  check('refused paste saved no patient', (await sidebarCount(page)) === 0);
  await closeToasts(page);

  // ── Paste with separator → preview → admit both ─────────────────────────
  await pasteAndProcess(
    page,
    DEMO_TOUR_LAB_PASTE + '\n\n' + LAB_BULK_PATIENT_SEPARATOR + '\n\n' + DEMO_GARCIA_LAB_REPORT
  );
  const preview = page.locator('#lab-bulk-preview-confirm');
  await preview.waitFor({ state: 'visible' });
  const previewText = await page.locator('.modal-backdrop.open', { has: preview }).innerText();
  await shot(page, 'preview');
  check('preview lists Pérez', previewText.includes('DEMO PÉREZ JUAN'));
  check('preview lists García', previewText.includes('DEMO GARCÍA ANA'));
  check('preview counts 3 reports', /3 reportes/.test(previewText), previewText.split('\n')[1]);

  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Agregar al censo' }).first().click();
    await page.locator('#patient-registro-tunnel-confirm').click();
    await page.locator('#patient-registro-tunnel-confirm').waitFor({ state: 'hidden' });
  }
  const saved = page.locator('.toast', { hasText: 'conjuntos guardados' });
  await saved.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await shot(page, 'both-admitted');
  check('3 lab sets saved', /3 conjuntos guardados/.test(await saved.innerText().catch(() => '')));
  check('2 patients in the list', (await sidebarCount(page)) === 2);
  const repoCalls = await app.evaluate(() => globalThis.__e2e.repoCalls);
  check('repository looked up both expedientes', repoCalls.sort().join(',') === '9000094-3,9000095-7', repoCalls);
  await closeToasts(page);

  // ── Pérez: two lab days, complete admission ─────────────────────────────
  await page.locator('.p-name', { hasText: 'DEMO JUAN' }).locator('visible=true').first().click();
  await page.locator('#m-servicio').waitFor({ state: 'visible' });
  // "&" and "<" must reach the .docx escaped, or Word refuses to open it.
  await page.locator('#m-servicio').fill('MEDICINA INTERNA & URGENCIAS <A>');
  await page.locator('#m-cuarto').fill('412');
  await page.locator('#m-cama').fill('02');
  await page.getByRole('button', { name: 'Agregar Paciente' }).click();
  await page.locator('#m-servicio').waitFor({ state: 'hidden' });
  const dates = await page.locator('#lab-history-date-select option').allTextContents();
  await shot(page, 'perez-labs');
  check('Pérez keeps both lab days', dates.includes('11/04/2026') && dates.includes('05/03/2026'), dates);

  // ── Interconsulta → note → export .docx ──────────────────────────────────
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const icBtn = page.locator('#header-mode-seg button[data-mode="interconsulta"]');
  await icBtn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400); // expand animation
  await icBtn.click();
  await page.locator('.toast', { hasText: 'Interconsulta' }).waitFor({ state: 'visible' });
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.waitForTimeout(500); // let the IC screen settle
  await shot(page, 'interconsulta');
  // With a patient already open, IC mode may skip its team board.
  const boardCard = page.getByText('DEMO JUAN', { exact: true }).locator('visible=true').first();
  if (await boardCard.isVisible().catch(() => false)) await boardCard.click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="notas"]').click();
  await page.getByRole('button', { name: 'Generar Nota (.docx)' }).waitFor({ state: 'visible' });
  await shot(page, 'note');
  const noteScroll = await page.evaluate(() => {
    const el = document.getElementById('itab-content-notas');
    return el ? { scroll: el.scrollHeight, client: el.clientHeight } : null;
  });
  check('note fits with no scrolling', !!noteScroll && noteScroll.scroll <= noteScroll.client + 1, noteScroll);
  check('no archived notes before the first export', await page.getByRole('button', { name: 'Anteriores (0)' }).isDisabled());

  await page.locator('#btn-header-cmdk').click();
  const exportItem = page.getByText('Exportar nota', { exact: true }).locator('visible=true').first();
  await exportItem.click();
  const deadline = Date.now() + 20000;
  let docs = [];
  while (Date.now() < deadline && docs.length === 0) {
    docs = fs.readdirSync(downloadsDir).filter((f) => f.endsWith('.docx'));
    if (!docs.length) await page.waitForTimeout(250);
  }
  await shot(page, 'exported');
  check('one .docx exported', docs.length === 1, docs);
  const pastBtn = page.getByRole('button', { name: 'Anteriores (1)' });
  await pastBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  check('export keeps one past copy', await pastBtn.isEnabled().catch(() => false));
  if (await pastBtn.isEnabled().catch(() => false)) {
    await pastBtn.click();
    const view = page.locator('#past-docs-backdrop .past-docs-view');
    await view.waitFor({ state: 'visible' });
    await page.waitForTimeout(400); // open animation
    await shot(page, 'past-notes');
    check('past copy opens read-only with its dates list', (await page.locator('#past-docs-backdrop .past-docs-item').count()) === 1);
    await page.keyboard.press('Escape');
    check('Escape closes the past notes view', (await page.locator('#past-docs-backdrop').count()) === 0);
  }
  const dialogs = await app.evaluate(() => globalThis.__e2e.dialogs);
  check('no native save dialog needed', !dialogs.includes('save'), dialogs);
  if (docs.length === 1) {
    const src = path.join(downloadsDir, docs[0]);
    fs.copyFileSync(src, path.join(artifactDir, docs[0]));
    const text = await docxText(src);
    fs.writeFileSync(path.join(artifactDir, 'docx-text.txt'), text);
    check('.docx file name names Pérez', /PÉREZ|PEREZ/i.test(docs[0]), docs[0]);
    check('.docx body names Pérez', text.includes('DEMO PÉREZ JUAN'));
    check('.docx has Pérez room/bed 412', text.includes('412'));
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    check('.docx is dated today', text.includes(today), today);
    check('.docx keeps "&" and "<" from user text', text.includes('&amp; URGENCIAS &lt;A&gt;'));
  }
  check('no page errors in session 1', pageErrors.length === 0, pageErrors);
  const settingsBefore = await page.evaluate(() => globalThis.localStorage.getItem('rpc-settings'));
  await app.close();

  // ── Boot 2: same userData → data persists ───────────────────────────────
  ({ app, page, pageErrors } = await launch());
  await page.locator('#apptab-lab').waitFor({ state: 'visible' });
  const onboardAgain = page.locator('#clinical-onboard-local-confirm-btn');
  await onboardAgain.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const settingsAfter = await page.evaluate(() => globalThis.localStorage.getItem('rpc-settings'));
  fs.writeFileSync(path.join(artifactDir, 'settings-before-after.json'), JSON.stringify({ settingsBefore, settingsAfter }, null, 2));
  await shot(page, 'restarted');
  const askedAgain = await onboardAgain.isVisible();
  check('restart does not repeat onboarding', !askedAgain);
  if (askedAgain) await onboardAgain.click();
  await dismissLearnHub(page);
  const juan = page.getByText('DEMO JUAN', { exact: true }).locator('visible=true').first();
  const ana = page.getByText('DEMO ANA', { exact: true }).locator('visible=true').first();
  await juan.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  check('both patients survive restart', (await juan.isVisible()) && (await ana.isVisible()));
  await juan.click();
  await page.locator('#apptab-lab').click();
  await page.locator('#lab-history-date-select').waitFor({ state: 'visible' });
  const dates2 = await page.locator('#lab-history-date-select option').allTextContents();
  check('Pérez lab days survive restart', dates2.includes('11/04/2026') && dates2.includes('05/03/2026'), dates2);
  check('no page errors in session 2', pageErrors.length === 0, pageErrors);
  await app.close();
}

let crash = null;
try {
  await run();
} catch (err) {
  crash = String(err && err.stack || err).split('\n').slice(0, 6).join('\n');
  check('scenario ran to the end', false, crash);
}

const passed = checks.filter((c) => c.ok).length;
const report = {
  scenario: 'SOME paste → structured labs → .docx',
  runId,
  passed,
  failed: checks.length - passed,
  checks,
  userDataDir,
};
fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
fs.rmSync(userDataDir, { recursive: true, force: true });
fs.rmSync(downloadsDir, { recursive: true, force: true });
console.log(`\n${passed}/${checks.length} checks passed. Artifact: ${path.relative(repoRoot, artifactDir)}`);
process.exit(report.failed === 0 ? 0 : 1);
