#!/usr/bin/env node
/**
 * Live check on STAGING (never the real Worker): who the handoff can be sent to
 * when several teams share one sala. Four real Electron devices, throwaway
 * profiles, synthetic DEMO data only.
 *   STAGING_URL=https://rplus-sync-staging.<acct>.workers.dev npm run e2e:staging-entrega-targets
 * Ways it can go wrong (each one is a check below):
 *   - the R2's «Cubre» list offers R1s (it must offer R2 on call + R4s)
 *   - the R2 cannot pick the R4
 *   - an R1 in team 1 cannot hand off to the R1 on call from team 2 (cross-team, same sala)
 *   - the R1's own list drops its team peers
 *   - an uncaught page error on any device
 * Not covered here (needs more accounts / control the UI lacks): R3 and admin
 * targets, the diurno phase, the guardia_today preference, the source-team hint.
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, openPatient, repoRoot, goArea } from './harness.mjs';
import { nubeDevices, onboardNube, openNubeView, patientVisible, until } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';
import path from 'node:path';

const STAGING = String(process.env.STAGING_URL || '').replace(/\/$/, '');
if (!/staging/i.test(STAGING)) { console.error('Set STAGING_URL (host must contain "staging").'); process.exit(1); }
// nube-worker.mjs points the app at a local Worker on import; point it at staging instead.
process.env.R_PLUS_CLOUD_SYNC_URL = STAGING;

const { activeCycleLetterForDate } = await import(path.join(repoRoot, 'packages/core/lib/clinical-scope/cycle-letters.mjs'));

const SALA = process.env.STAGING_SALA || 'Torre HU'; // a sala nobody used yet on staging
const tag = Date.now().toString(36).slice(-6);
const U = {
  r2: { username: `demo_r2_${tag}`, name: 'Dr. Demo Día', rank: 'R2', sala: SALA },
  r1a: { username: `demo_r1a_${tag}`, name: 'Dra. Demo Noche A', rank: 'R1', sala: SALA },
  r1b: { username: `demo_r1b_${tag}`, name: 'Dra. Demo Noche B', rank: 'R1', sala: SALA },
  r4: { username: `demo_r4_${tag}`, name: 'Dr. Demo Cuarto', rank: 'R4', sala: SALA },
};
const P1 = { exp: '7000531-1', name: 'DEMO TARGETS UNO', room: '420' };

const r = createRun('nube-staging-entrega-targets');
const { check } = r;
const launchDevice = nubeDevices(r);

const createTeam = async (page, name) => {
  await page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await page.locator('#btn-clinical-team-create-open').click();
  await page.locator('#clinical-team-create-name').fill(name);
  await page.locator('#clinical-team-create-sala').selectOption(SALA).catch(() => {});
  await page.locator('#clinical-team-create-form [type="submit"]').click();
};
const joinTeam = async (page, teamName) => {
  await page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const row = page.locator('.clinical-teams-row, li, .clinical-team-card', { hasText: teamName }).first();
  const btn = row.getByRole('button', { name: 'Unirme' });
  await btn.waitFor({ state: 'visible', timeout: 30000 });
  await btn.click();
  await page.waitForTimeout(1500);
};
/** «Mi ciclo»: the letter that is on call today, so the sala's on-call R1 is this user. */
const setOnCall = async (page) => {
  await closeToasts(page);
  await openNubeView(page, 'equipo');
  const letter = activeCycleLetterForDate('Sala', 'R1', new Date());
  await page.locator('summary', { hasText: 'Mi ciclo en este equipo' }).first().click();
  await page.locator('select[id^="clinical-my-cycle-"]').first().selectOption(letter);
  await page.locator('.clinical-teams-my-cycle-form button[type=submit]').first().click();
  await page.waitForTimeout(4000);
};
const settle = async (d) => {
  await closeToasts(d.page);
  await d.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  await d.page.keyboard.press('Escape');
  await dismissLearnHub(d.page);
  await goArea(d.page, 'lab');
};
/** Handoff modal for P1 from this device's Guardia census; returns the «Cubre» option labels. */
async function coverOptions(page) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').click();
  await page.locator('#header-mode-seg .header-mode-seg-btn[data-mode="guardia"]').click();
  const card = page.locator('#guardia-census-grid .gct-card', { has: page.locator(`.gct-cell-name[title="${P1.name}"]`) });
  await card.waitFor({ timeout: 30000 });
  await card.click();
  const m = page.locator('#entrega-modal');
  await m.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
  const opts = await m.locator('#entrega-covering-user option').allTextContents();
  await m.locator('#btn-entrega-cancel').click();
  await m.waitFor({ state: 'hidden', timeout: 10000 });
  return opts;
}
const has = (opts, u) => opts.some((t) => t.includes(u.username));

await r.finish('Nube on staging: who a handoff can go to across teams', async () => {
  const D = {};
  let port = 3791;
  for (const k of ['r2', 'r1a', 'r1b', 'r4']) {
    D[k] = await launchDevice(k, port++);
    await onboardNube(D[k].page, U[k]);
  }
  // Team 1: R2 creates it, R1 «a» and R4 join. Team 2 (same sala): R1 «b» creates it.
  await createTeam(D.r2.page, 'EQUIPO DEMO UNO');
  await createTeam(D.r1b.page, 'EQUIPO DEMO DOS');
  await joinTeam(D.r1a.page, 'EQUIPO DEMO UNO');
  await joinTeam(D.r4.page, 'EQUIPO DEMO UNO');
  await setOnCall(D.r1a.page); // on call for team 1
  await setOnCall(D.r1b.page); // on call for team 2 (cross-team target for r1a)
  for (const k of Object.keys(D)) await settle(D[k]);

  await pasteAndSave(D.r2.page, fullLabs(P1, 'Sep 23 2026 8:00AM'));
  await openPatient(D.r2.page, P1);
  check('the patient reaches the R1 device', await until(() => patientVisible(D.r1a.page, P1), 60000));
  await until(() => patientVisible(D.r4.page, P1), 60000);

  const fromR2 = await coverOptions(D.r2.page);
  check('R2 list offers the R4', has(fromR2, U.r4), fromR2);
  check('R2 list does not offer the R1s (R2 flow: R2 on call + R4s)', !has(fromR2, U.r1a) && !has(fromR2, U.r1b), fromR2);

  const fromR1 = await coverOptions(D.r1a.page);
  check('R1 list offers the R1 on call from the OTHER team (same sala)', has(fromR1, U.r1b), fromR1);
  check('R1 list keeps the R1 own team on-call/peer entry (itself)', has(fromR1, U.r1a), fromR1);

  check('no uncaught page errors on any device', Object.values(D).every((d) => !d.pageErrors.length),
    Object.values(D).flatMap((d) => d.pageErrors).slice(0, 5));
  for (const d of Object.values(D)) await d.app.close();
});
