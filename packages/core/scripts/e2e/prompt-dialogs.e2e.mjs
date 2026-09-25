#!/usr/bin/env node
/* global window, document */
/**
 * E2E: every flow that used window.prompt() now asks in the app's own dialog.
 * In the Electron renderer window.prompt() throws "prompt() is not supported.",
 * so these flows did nothing before. Synthetic DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - window.prompt() still gives no answer (the reason for this change)
 *   - a dialog does not open, or opens with the wrong input type
 *     (PIN and passphrase must be hidden: type="password")
 *   - Enter / buttons do not return the typed value to the flow
 *   - idle-lock PIN: mismatch or wrong current PIN is still saved
 *   - range export / sync export do not write a file
 *   - encrypted sync bundle leaks patient names in clear text
 *   - sync import: passphrase not asked, conflict choice ignored
 *     (Duplicar must add a patient, Sobrescribir must not)
 *   - range import: "Cancelar importación" still changes the list
 *   - indicaciones template: Reemplazar / Agregar al final / Cancelar
 *     do the wrong thing to the existing text
 *   - any page error during the flow
 *
 * Artifact: e2e-artifacts/prompt-dialogs/<run-id>/ (report.json, screenshots).
 *
 *   npm run e2e:prompt-dialogs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, visiblePatientCount } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const A = { exp: '7000011-1', name: 'DEMO DIALOGO UNO', room: '311' };
const B = { exp: '7000012-2', name: 'DEMO DIALOGO DOS', room: '312' };
const TEMPLATE = { id: 'e2e-tmpl', label: 'Plantilla E2E', dieta: 'Dieta de plantilla', cuidados: '', medicamentos: '' };
const PASS = 'demo-pass-123';

const r = createRun('prompt-dialogs');
const { check, shot } = r;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

await r.finish('prompt() callers use the in-app dialog', async () => {
  const { app, page, pageErrors } = await r.launch();
  // Blob downloads would open a native save dialog: save them to the temp dir.
  await app.evaluate(({ session }, dl) => {
    session.defaultSession.on('will-download', (_e, item) => item.setSavePath(dl + '/' + item.getFilename()));
  }, r.downloadsDir);
  await onboardLocalOnly(page);

  // A saved indicaciones template, as if made in Ajustes → Plantillas.
  // Indicaciones shows only in Interconsulta mode (switched on in step 6).
  const saveSettings = (patch) =>
    page.evaluate((p) => {
      const s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
      localStorage.setItem('rpc-settings', JSON.stringify(Object.assign(s, p)));
    }, patch);
  await saveSettings({ extraTemplates: [TEMPLATE] });
  await page.reload();
  await page.locator('#apptab-lab').waitFor({ state: 'visible' });

  await page.locator('#apptab-lab').click();
  await pasteAndSave(page, fullLabs(A, 'Jan 12 2026 8:00AM'));
  await pasteAndSave(page, fullLabs(B, 'Jan 12 2026 9:00AM'));

  const dialog = page.locator('.wb-confirm-modal[role="dialog"]');
  const input = dialog.locator('[data-wb-confirm-input]');
  const toastText = async (re) => {
    const t = page.locator('.toast', { hasText: re });
    await t.first().waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    return (await t.count()) > 0;
  };
  // Buttons live in the settings sheet; fire their click the way the sheet would.
  const pressSettingsButton = (label) => page.locator('button', { hasText: label }).first().dispatchEvent('click');
  async function answer(value, { expectType = 'text', label } = {}) {
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    const type = await input.getAttribute('type');
    if (label) check(`${label}: input type is ${expectType}`, type === expectType, type);
    const handle = await dialog.elementHandle();
    await input.fill(value);
    await input.press('Enter');
    // The next dialog may open at once: wait for THIS one to go away.
    await handle.waitForElementState('hidden', { timeout: 5000 });
  }
  async function selectInList(p) {
    await closeToasts(page);
    await page.locator('#apptab-nota').click();
    await openPatient(page, p);
    await closeToasts(page);
  }
  const dieta = page.locator('#indica-form section:has(h4:text-is("Dieta")) textarea');

  // B first, so A stays the active patient for step 6.
  await selectInList(B);
  await selectInList(A);
  const startCount = await visiblePatientCount(page);
  check('2 synthetic patients in the list', startCount === 2, startCount);

  // ── 0. The reason for the change ─────────────────────────────────────────
  const native = await page.evaluate(() => {
    try {
      return { value: window.prompt('x', 'y') };
    } catch (e) {
      return { error: String(e && e.message) };
    }
  });
  check('window.prompt() gives no answer in Electron (old flows could not work)', native.value == null, native);

  // ── 1. Idle-lock PIN ─────────────────────────────────────────────────────
  const setIdle = (v) =>
    page.evaluate((val) => {
      const sel = document.getElementById('settings-idle-lock');
      sel.value = val;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }, v);
  const pinHash = () => page.evaluate(() => localStorage.getItem('rpc-idle-lock-hash') || '');

  await setIdle('5');
  await dialog.waitFor({ state: 'visible' });
  await shot(page, 'pin-setup-dialog');
  await answer('1234', { expectType: 'password', label: 'new PIN' });
  await answer('9999', { expectType: 'password', label: 'confirm PIN' });
  check('PIN mismatch → error toast', await toastText(/no coinciden/i));
  check('PIN mismatch → nothing saved', (await pinHash()) === '');
  await closeToasts(page);

  await setIdle('5');
  await answer('1234', { expectType: 'password' });
  await answer('1234', { expectType: 'password' });
  check('PIN 1234 saved as its SHA-256', (await pinHash()) === sha256('1234'));
  check('idle lock set to 5 min', (await page.locator('#settings-idle-lock').inputValue()) === '5');
  await closeToasts(page);

  await pressSettingsButton('Cambiar PIN de bloqueo');
  await answer('0000', { expectType: 'password', label: 'current PIN' });
  check('wrong current PIN → "PIN incorrecto"', await toastText(/PIN incorrecto/i));
  check('wrong current PIN → hash unchanged', (await pinHash()) === sha256('1234'));
  await closeToasts(page);

  await pressSettingsButton('Cambiar PIN de bloqueo');
  await answer('1234', { expectType: 'password' });
  await answer('5678', { expectType: 'password' });
  await answer('5678', { expectType: 'password' });
  check('PIN changed to 5678', (await pinHash()) === sha256('5678'));
  // Turn the lock off so it cannot fire during the rest of the run.
  await setIdle('0');
  await closeToasts(page);

  // ── 2. Range export ──────────────────────────────────────────────────────
  const listDownloads = () => fs.readdirSync(r.downloadsDir);
  const waitFile = async (re) => {
    for (let i = 0; i < 50; i += 1) {
      const f = listDownloads().find((n) => re.test(n) && !n.endsWith('.crdownload'));
      if (f) return path.join(r.downloadsDir, f);
      await page.waitForTimeout(100);
    }
    return null;
  };
  await pressSettingsButton('Exportar por rango');
  await dialog.waitFor({ state: 'visible' });
  await shot(page, 'range-dialog');
  await answer('01/01/2020 - 31/12/2030', { expectType: 'text', label: 'date range' });
  const rangeFile = await waitFile(/^R-plus-rango-.*\.json$/);
  const rangePayload = rangeFile ? JSON.parse(fs.readFileSync(rangeFile, 'utf8')) : null;
  check('range export wrote a file', !!rangeFile, rangeFile && path.basename(rangeFile));
  check('range file has both patients', rangePayload && rangePayload.entries.length === 2, rangePayload && rangePayload.entries.length);
  await closeToasts(page);

  // ── 3. Encrypted sync export ─────────────────────────────────────────────
  await pressSettingsButton('Exportar paquete sync');
  await dialog.waitFor({ state: 'visible' });
  await shot(page, 'sync-passphrase-dialog');
  await answer(PASS, { expectType: 'password', label: 'export passphrase' });
  const syncFile = await waitFile(/^R-plus-sync-.*\.json$/);
  const syncRaw = syncFile ? fs.readFileSync(syncFile, 'utf8') : '';
  check('sync export wrote a file', !!syncFile, syncFile && path.basename(syncFile));
  check('sync bundle is encrypted', /"encrypted": true/.test(syncRaw));
  check('sync bundle hides patient names', syncRaw && !syncRaw.includes('DIALOGO') && !syncRaw.includes(A.exp));
  await closeToasts(page);

  // ── 4. Sync import: passphrase, then Duplicar for A, Sobrescribir for B ──
  await page.locator('#sync-bundle-file-input').setInputFiles(syncFile);
  await answer(PASS, { expectType: 'password', label: 'import passphrase' });
  await dialog.waitFor({ state: 'visible' });
  const conflict1 = await dialog.innerText();
  await shot(page, 'conflict-dialog');
  check('conflict dialog offers Sobrescribir / Duplicar / Cancelar', /Sobrescribir/.test(conflict1) && /Duplicar/.test(conflict1) && /Cancelar/.test(conflict1));
  await dialog.getByRole('button', { name: 'Duplicar' }).click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'Sobrescribir' }).click();
  check('sync import toast: 2 entries', await toastText(/Sync importado: 2/));
  // The list re-renders a moment after the toast.
  let afterSync = 0;
  for (let i = 0; i < 30 && afterSync !== 3; i += 1) {
    await page.waitForTimeout(100);
    afterSync = await visiblePatientCount(page);
  }
  check('Duplicar added 1 patient, Sobrescribir added none (2 → 3)', afterSync === 3, afterSync);
  await closeToasts(page);

  // ── 5. Range import: cancel at the first conflict ────────────────────────
  await page.locator('#range-backup-file-input').setInputFiles(rangeFile);
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByRole('button', { name: 'Cancelar importación' }).click();
  check('range import cancel → "Importación cancelada"', await toastText(/Importación cancelada/));
  const afterCancel = await visiblePatientCount(page);
  check('range import cancel → list unchanged (3)', afterCancel === 3, afterCancel);
  await closeToasts(page);

  // ── 6. Indicaciones template merge ───────────────────────────────────────
  await saveSettings({ appMode: 'interconsulta' });
  await page.reload();
  await page.locator('#apptab-nota').waitFor({ state: 'visible' });
  await page.locator('#apptab-nota').click();
  // No active patient after reload: pick A from the team board.
  await page.getByText('DEMO UNO', { exact: true }).locator('visible=true').first().click();
  await page.evaluate(() => window.switchInnerTab('indica'));
  await page.locator('#indica-form').waitFor({ state: 'visible' });
  await dieta.fill('Dieta blanda');
  const applyTemplate = async () => {
    await page.locator('#indica-extra-tmpl-select').selectOption(TEMPLATE.id);
    await page.locator('#indica-form').getByRole('button', { name: 'Aplicar' }).click();
    await dialog.waitFor({ state: 'visible' });
  };
  await applyTemplate();
  await shot(page, 'indica-merge-dialog');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  check('template Cancelar → text unchanged', (await dieta.inputValue()) === 'Dieta blanda', await dieta.inputValue());

  await applyTemplate();
  await dialog.getByRole('button', { name: 'Agregar al final' }).click();
  check('template Agregar → appended', (await dieta.inputValue()) === 'Dieta blanda\nDieta de plantilla', await dieta.inputValue());

  await applyTemplate();
  await dialog.getByRole('button', { name: 'Reemplazar' }).click();
  check('template Reemplazar → replaced', (await dieta.inputValue()) === 'Dieta de plantilla', await dieta.inputValue());
  await shot(page, 'indica-after');

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();
});
