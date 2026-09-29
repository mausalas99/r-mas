#!/usr/bin/env node
/**
 * Live check: two real Electron devices (throwaway profiles) against the STAGING
 * Worker, never the real one. Synthetic DEMO patients only.
 *   STAGING_URL=https://rplus-sync-staging.<acct>.workers.dev node scripts/e2e/nube-staging.e2e.mjs
 * Checks: both devices sign up into one Sala 1 room, a patient pasted on A
 * reaches B, a lab set pasted on B reaches A, no uncaught page error.
 */
import { createRun, dismissLearnHub, closeToasts, goArea } from './harness.mjs';
import { nubeDevices, onboardNube, roomMeta, patientVisible, until } from './nube-worker.mjs';
import { fullLabs, gas } from './some-fixtures.mjs';
import { pasteAndSave } from './harness.mjs';

const STAGING = String(process.env.STAGING_URL || '').replace(/\/$/, '');
if (!/staging/i.test(STAGING)) { console.error('Set STAGING_URL (host must contain "staging").'); process.exit(1); }
// nube-worker.mjs points the app at a local Worker on import; point it at staging instead.
process.env.R_PLUS_CLOUD_SYNC_URL = STAGING;

// A sala nobody used yet on staging: a fresh room, no key left by an earlier run.
const SALA = process.env.STAGING_SALA || 'Torre HU';
const tag = Date.now().toString(36).slice(-6);
const USER_A = { username: `demo_a_${tag}`, name: 'Dr. Demo Alfa', sala: SALA };
const USER_B = { username: `demo_b_${tag}`, name: 'Dra. Demo Bravo', sala: SALA };
const P1 = { exp: '7000511-1', name: 'DEMO STAGING UNO', room: '401' };
const P2 = { exp: '7000512-2', name: 'DEMO STAGING DOS', room: '402' };

const r = createRun('nube-staging');
const { check } = r;
const launchDevice = nubeDevices(r);

await r.finish('Nube on staging: two devices, both ways', async () => {
  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, USER_A);
  const roomA = await until(() => roomMeta(A.page), 15000);
  check('A: joined a fresh room on staging', roomA?.sala === SALA && !!roomA?.id, roomA);
  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, USER_B);
  const roomB = await until(() => roomMeta(B.page), 15000);
  check('B: same room as A', roomB?.id === roomA?.id, { a: roomA?.id, b: roomB?.id });

  // Team gate: A creates a team, B joins it (same walk as nube-sync.e2e.mjs).
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO ALFA');
  await A.page.locator('#clinical-team-create-sala').selectOption(SALA).catch(() => {});
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const joinBtn = B.page.getByRole('button', { name: 'Unirme' });
  check('B: sees A\'s team through staging', await until(() => joinBtn.isVisible(), 30000));
  await joinBtn.click();
  for (const d of [A, B]) {
    await closeToasts(d.page);
    await d.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await d.page.keyboard.press('Escape');
    await dismissLearnHub(d.page);
    await goArea(d.page, 'lab');
  }

  await pasteAndSave(A.page, fullLabs(P1, 'Sep 20 2026 8:00AM'));
  check('B: patient from A arrives', await until(() => patientVisible(B.page, P1), 60000), P1.exp);
  await r.shot(B.page, 'b-has-p1');
  await pasteAndSave(B.page, fullLabs(P2, 'Sep 20 2026 8:30AM'));
  check('A: patient from B arrives', await until(() => patientVisible(A.page, P2), 60000), P2.exp);
  await pasteAndSave(B.page, gas(P1, 'Sep 21 2026 6:00AM', '7.21'));
  await r.shot(A.page, 'a-has-both');
});
