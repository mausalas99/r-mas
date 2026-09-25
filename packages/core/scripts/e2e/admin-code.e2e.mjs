#!/usr/bin/env node
/* global window */
/**
 * E2E: program-admin code is set and changed by the owner in the app.
 * No code ships in the source; the main process stores a salted hash in the
 * real SQLCipher DB. Driven through the real Electron preload API.
 *
 * Scenario:
 *   1. Fresh install → no code saved; nothing verifies (not even empty
 *      string or null).
 *   2. Too-short code refused. First code saved (no admin exists yet).
 *   2.5. Trimmed input: whitespace stripped before storing and before
 *        verifying, both sides.
 *   3. Change: wrong current code refused, right one accepted.
 *   4. Old code no longer verifies; new code does.
 *   5. Restart the app on the same data → new code still verifies.
 *
 * Also drives the Mi rotación admin-code modal itself (clinical-teams/shared.mjs),
 * which only exists behind a Nube profile: check "Privilegios de administración"
 * → setup mode (no code yet) → «Cambiar código de administración» → change mode,
 * wrong current code and a confirm mismatch both show inline errors.
 *
 * Artifact: e2e-artifacts/admin-code/<run-id>/ with report.json.
 *
 *   npm run e2e:admin-code
 */
import { createRun, onboardLocalOnly } from './harness.mjs';
import { startWorker, stopWorker, nubeDevices, onboardNube } from './nube-worker.mjs';

const r = createRun('admin-code');
const { check } = r;

const api = (page, method, arg) =>
  page.evaluate(([m, a]) => window.electronAPI[m](a), [method, arg]);

await r.finish('Admin code set + change in app', async () => {
  let { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);

  const status0 = await api(page, 'adminCodeStatus');
  check('fresh install has no admin code', status0?.ok && status0.isSet === false, status0);
  check('nothing verifies before a code exists', (await api(page, 'adminCodeVerify', { code: 'any-guess' }))?.valid === false);
  check('nothing verifies before a code exists (empty string)', (await api(page, 'adminCodeVerify', { code: '' }))?.valid === false);
  check('nothing verifies before a code exists (null)', (await api(page, 'adminCodeVerify', { code: null }))?.valid === false);

  const short = await api(page, 'adminCodeSet', { userId: '', newCode: '12345' });
  check('short code refused', short?.ok === false && /al menos 6/.test(short.error), short);

  const first = await api(page, 'adminCodeSet', { userId: '', newCode: 'owner-code-1' });
  check('first code saved', first?.ok === true, first);
  check('status now set', (await api(page, 'adminCodeStatus'))?.isSet === true);

  // Trimmed input: stored and verified with surrounding whitespace stripped.
  const padded = await api(page, 'adminCodeSet', { userId: '', currentCode: 'owner-code-1', newCode: '  padded-code  ' });
  check('new code trims whitespace before storing', padded?.ok === true, padded);
  check('verify matches the trimmed stored code', (await api(page, 'adminCodeVerify', { code: 'padded-code' }))?.valid === true);
  check(
    'verify also trims whitespace on the input side',
    (await api(page, 'adminCodeVerify', { code: '  padded-code  ' }))?.valid === true
  );
  const restored = await api(page, 'adminCodeSet', { userId: '', currentCode: 'padded-code', newCode: 'owner-code-1' });
  check('code restored to owner-code-1 for the rest of the flow', restored?.ok === true, restored);

  const wrong = await api(page, 'adminCodeSet', { userId: '', currentCode: 'wrong', newCode: 'owner-code-2' });
  check('change with wrong current code refused', wrong?.ok === false && /actual incorrecto/.test(wrong.error), wrong);

  const change = await api(page, 'adminCodeSet', { userId: '', currentCode: 'owner-code-1', newCode: 'owner-code-2' });
  check('change with right current code accepted', change?.ok === true, change);
  check('old code no longer verifies', (await api(page, 'adminCodeVerify', { code: 'owner-code-1' }))?.valid === false);
  check('new code verifies', (await api(page, 'adminCodeVerify', { code: 'owner-code-2' }))?.valid === true);
  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();

  ({ app, page, pageErrors } = await r.launch());
  await page.waitForFunction(() => window.electronAPI?.adminCodeStatus, null, { timeout: 30000 });
  await page.waitForFunction(async () => (await window.electronAPI.adminCodeStatus())?.ok === true, null, { timeout: 30000 });
  check('code survives restart', (await api(page, 'adminCodeVerify', { code: 'owner-code-2' }))?.valid === true);
  await app.close();

  // ── Mi rotación admin-code modal (requires a Nube profile) ──────────────
  check('local Worker answers /ping', await startWorker());
  const launchDevice = nubeDevices(r);
  const tag = Date.now().toString(36).slice(-6);
  const D = await launchDevice('nube-admin', 3795);
  await onboardNube(D.page, { username: `demo_admin_${tag}`, name: 'Dra. Demo Admin', rank: 'R2' });
  await D.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const cb = D.page.locator('#clinical-profile-admin');
  await cb.waitFor({ state: 'visible' });
  check('checkbox starts unchecked', (await cb.isChecked()) === false);
  await cb.click();
  const modal = D.page.locator('#clinical-admin-code-backdrop.open');
  await modal.waitFor({ state: 'visible' });
  const setupLead = await D.page.locator('#clinical-admin-code-lead').textContent();
  check('no code yet → modal opens in setup mode', /Aún no hay código de administración/.test(setupLead), setupLead);
  check('setup mode hides the "current code" field', await D.page.locator('#clinical-admin-code-current-group').isHidden());
  await D.page.locator('#clinical-admin-code-new').fill('mi-clave-1');
  await D.page.locator('#clinical-admin-code-confirm').fill('mi-clave-1');
  await D.page.locator('#btn-clinical-admin-code-submit').click();
  await modal.waitFor({ state: 'hidden' });
  check('checkbox is checked once the code is set', await cb.isChecked());
  await D.page.getByRole('button', { name: 'Guardar perfil' }).click();
  await D.page.locator('.toast', { hasText: 'Privilegios de administración activos' }).waitFor({ timeout: 5000 });
  const changeBtn = D.page.locator('#btn-clinical-admin-code-change');
  check('«Cambiar código de administración» button appears once admin', await changeBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false));
  await changeBtn.click();
  await modal.waitFor({ state: 'visible' });
  const changeLead = await D.page.locator('#clinical-admin-code-lead').textContent();
  check('«Cambiar código» opens in change mode', /Cambia el código de administración/.test(changeLead), changeLead);
  await D.page.locator('#clinical-admin-code-input').fill('wrong-code');
  await D.page.locator('#clinical-admin-code-new').fill('mi-clave-2');
  await D.page.locator('#clinical-admin-code-confirm').fill('mi-clave-2');
  await D.page.locator('#btn-clinical-admin-code-submit').click();
  const err = D.page.locator('#clinical-admin-code-error');
  await err.waitFor({ state: 'visible', timeout: 3000 });
  check('wrong current code shows an inline error, modal stays open', /actual incorrecto/i.test(await err.textContent()) && (await modal.isVisible()), await err.textContent());
  await D.page.locator('#clinical-admin-code-input').fill('mi-clave-1');
  await D.page.locator('#clinical-admin-code-confirm').fill('mi-clave-3-does-not-match');
  await D.page.locator('#btn-clinical-admin-code-submit').click();
  await err.waitFor({ state: 'visible', timeout: 3000 });
  check('mismatched confirm shows an inline error, modal stays open', /no coinciden/i.test(await err.textContent()) && (await modal.isVisible()), await err.textContent());
  await D.page.locator('#clinical-admin-code-confirm').fill('mi-clave-2');
  await D.page.locator('#btn-clinical-admin-code-submit').click();
  await modal.waitFor({ state: 'hidden' });
  await D.page.locator('.toast', { hasText: 'Código de administración actualizado' }).waitFor({ timeout: 5000 });
  check('old code no longer verifies (UI change)', (await api(D.page, 'adminCodeVerify', { code: 'mi-clave-1' }))?.valid === false);
  check('new code verifies (UI change)', (await api(D.page, 'adminCodeVerify', { code: 'mi-clave-2' }))?.valid === true);
  await D.app.close();
  await stopWorker();
});
