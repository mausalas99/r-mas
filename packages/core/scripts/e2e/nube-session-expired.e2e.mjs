#!/usr/bin/env node
/**
 * Live check on the STAGING Worker (never the real one), throwaway profile:
 * a device with an expired Nube token opens on the Nube login form.
 *   STAGING_URL=https://rplus-sync-staging.<acct>.workers.dev node scripts/e2e/nube-session-expired.e2e.mjs
 * Steps: sign up → spoil the stored token → reload → the Nube panel opens by
 * itself, the dead token is gone, the login fields are empty.
 */
import { createRun, dismissLearnHub, closeToasts } from './harness.mjs';
import { nubeDevices, onboardNube, until } from './nube-worker.mjs';

const STAGING = String(globalThis.process.env.STAGING_URL || '').replace(/\/$/, '');
if (!/staging/i.test(STAGING)) { globalThis.console.error('Set STAGING_URL (host must contain "staging").'); globalThis.process.exit(1); }
globalThis.process.env.R_PLUS_CLOUD_SYNC_URL = STAGING;

const tag = Date.now().toString(36).slice(-6);
const USER = { username: `demo_x_${tag}`, name: 'Dr. Demo Expira', sala: globalThis.process.env.STAGING_SALA || 'Sala 2' };
const TOKEN_KEY = 'rpc-cloud-sync-token';

const r = createRun('nube-session-expired');
const { check } = r;
const launchDevice = nubeDevices(r);

await r.finish('Expired Nube session opens the login panel', async () => {
  const A = await launchDevice('a', 3793);
  const { page } = A;
  await onboardNube(page, USER);
  await closeToasts(page);
  await page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  await dismissLearnHub(page);
  const hasToken = () => page.evaluate((k) => !!(globalThis.localStorage.getItem(k) || globalThis.sessionStorage.getItem(k)), TOKEN_KEY);
  check('signed in: token stored', await until(hasToken, 15000));
  check('panel closed before expiry', !(await page.evaluate(() => globalThis.document.body.classList.contains('connection-dropdown-open'))));
  await r.shot(page, '1-signed-in');

  // Spoil the token everywhere the app reads it, including the Recuérdame copy on disk.
  await page.evaluate(async (k) => {
    globalThis.localStorage.setItem(k, 'expired-demo-token');
    globalThis.sessionStorage.setItem(k, 'expired-demo-token');
    const api = globalThis.electronAPI;
    const snap = api.cloudSyncRememberGetSync?.();
    if (snap?.token) await api.cloudSyncRememberSet({ ...snap, remember: true, token: 'expired-demo-token' });
  }, TOKEN_KEY);
  await page.reload();
  const opened = await until(() => page.evaluate(() => globalThis.document.body.classList.contains('connection-dropdown-open')), 40000);
  check('Nube panel opened by itself', opened);
  check('dead token removed', !(await hasToken()));
  await page.waitForTimeout(1500);
  await r.shot(page, '2-login-panel');
  const fields = await page.evaluate(() => [...globalThis.document.querySelectorAll('#connection-dropdown input[id^="cloud-sync-login"]')]
    .filter((i) => i.offsetParent && i.type !== 'hidden' && i.type !== 'checkbox')
    .map((i) => ({ id: i.id, type: i.type, empty: !i.value })));
  check('login fields shown and empty', fields.length > 0 && fields.every((f) => f.empty), fields);
  check('no red expiry bar on the main app', await page.evaluate(() => !globalThis.document.getElementById('nube-session-banner')));
});
