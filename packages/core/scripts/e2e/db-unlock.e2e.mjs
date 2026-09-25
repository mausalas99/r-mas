#!/usr/bin/env node
/* global getComputedStyle */
/**
 * E2E: local DB unlock (master password + recovery code), driven through the
 * real Electron app on a fresh throwaway userData.
 *
 * Finding (confirmed by reading the app, not by importing modules to fake a
 * check): every item in lib/db/crypto.test.mjs is UNREACHABLE from the UI in
 * the current app.
 *
 *   - `openChangeMasterPasswordModal()` (public/js/features/db-unlock-change-pass.mjs:38-40)
 *     is a no-op stub — the body is a single comment: Master password removed,
 *     DB unlocks automatically on this device. There is no button anywhere
 *     that calls it with a working implementation.
 *   - `syncDbSecuritySectionUi()` (same file, :86-95) unconditionally hides
 *     `#settings-accordion-db-security` — the Ajustes section that would host
 *     any "set a master password" entry is force-hidden.
 *   - The recovery/unlock overlay (`presentDbUnlockGate`,
 *     public/js/features/db-unlock-boot.mjs:60-68) is only invoked when
 *     `status.dbFileExists && status.hasKdfSalt` — i.e. only for an install
 *     that ALREADY has a passphrase-derived key on disk. A fresh install
 *     (this harness's throwaway userData, and any real fresh install today)
 *     unlocks automatically via OS safeStorage (`dbAutoUnlock` /
 *     `tryAutoUnlockDb`) before that gate is ever reached, and never writes a
 *     kdf_salt. `generateRecoveryCode()` / `setupRecoveryKey()`
 *     (lib/db/db-manager-auth-unlock-flows.mjs) only run from
 *     `unlockWithPassphraseImpl`, which nothing in the UI calls today.
 *
 * So a brand-new install never shows the overlay, never generates a recovery
 * code, and there is no live control to opt into one. This is a real,
 * confirmed app finding — flagged to the owner, not silently patched, since
 * fixing it means deciding whether/how to bring back an explicit master
 * password UI (a product call, not a 1-line root-cause fix).
 *
 * The checks below drive the real app to CONFIRM this (auto-unlock with no
 * prompt, no reachable "set a master password" control) rather than assume
 * it from reading source alone.
 *
 * Artifact: e2e-artifacts/db-unlock/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:db-unlock
 */
import { createRun, onboardLocalOnly, pasteAndSave } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const P1 = { exp: '7000456-7', name: 'DEMO DB UNLOCK', room: '512' };

const r = createRun('db-unlock');
const { check } = r;

await r.finish('DB unlock: auto-unlock confirmed, master-password UI confirmed UNREACHABLE', async () => {
  const { app, page, pageErrors } = await r.launch();

  // ── Fresh install: DB opens with no unlock prompt at all ────────────────
  const overlay = page.locator('#rpc-db-unlock-overlay');
  check(
    'fresh install: no unlock overlay ever becomes visible (auto-unlock via safeStorage)',
    await overlay.evaluate((el) => getComputedStyle(el).display === 'none').catch(() => true)
  );
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  // Real clinical write (a lab paste creates + persists a patient) with zero
  // passphrase prompts — proves the encrypted DB is fully usable, not just
  // "no overlay flashed".
  const doc0 =
    header(P1, 'Sep 24 2026 8:00AM') + 'BIOMETRIA HEMATICA\n' + TABLE + 'HEMOGLOBINA\tB\t13.2\tg/dL\t14.0 - 18.0\n';
  await pasteAndSave(page, doc0);
  check(
    'DB is unlocked and usable with zero passphrase prompts (a lab paste persisted a patient with no gate)',
    await page.locator(`.p-name[title*="${P1.exp}"]`).locator('visible=true').first().isVisible()
  );
  check(
    'no unlock overlay appeared after the write either',
    await overlay.evaluate((el) => getComputedStyle(el).display === 'none').catch(() => true)
  );

  // ── No live control to set a master password ────────────────────────────
  await page.locator('#btn-open-settings').click();
  const settingsDropdown = page.locator('#settings-dropdown.open, #settings-dropdown[aria-hidden="false"]');
  await settingsDropdown.first().waitFor({ timeout: 5000 }).catch(() => {});
  const settingsText = await page.locator('#settings-dropdown').innerText().catch(() => '');
  check(
    'UNREACHABLE — no "contraseña maestra" / DB-security entry in Ajustes today',
    !/contraseña maestra/i.test(settingsText),
    settingsText.slice(0, 400)
  );
  const dbSecuritySection = page.locator('#settings-accordion-db-security');
  check(
    'UNREACHABLE — #settings-accordion-db-security stays hidden (syncDbSecuritySectionUi forces display:none)',
    (await dbSecuritySection.count()) === 0 ||
      (await dbSecuritySection.evaluate((el) => getComputedStyle(el).display === 'none').catch(() => true))
  );

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();
});
