#!/usr/bin/env node
/* global document */
/**
 * E2E: an R1 leads sala teams; one R2 joins two of them and stays in both.
 * Local Nube Worker only, DEMO users only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - an R1 cannot create a team and become its leader
 *   - the R2 joining a second team of the same sala drops the first one
 *   - the R2 panel does not show both teams as «Estás en», or the letter differs
 *   - a Nube pull drops the R2's second team
 *   - an uncaught page error
 */
import { createRun, closeToasts } from './harness.mjs';
import { startWorker, nubeDevices, onboardNube, openNubeView, until } from './nube-worker.mjs';

const tag = Date.now().toString(36).slice(-6);
const R1 = { username: `demo_r1_${tag}`, name: 'Dra. Demo Líder', rank: 'R1' };
const R2 = { username: `demo_r2_${tag}`, name: 'Dr. Demo Día', rank: 'R2' };
const TEAMS = ['EQUIPO DEMO UNO', 'EQUIPO DEMO DOS'];

const r = createRun('r2-two-teams');
const { check } = r;
const launchDevice = nubeDevices(r);

await r.finish('R1 leads teams; R2 joins two of them', async () => {
  check('local Worker answers /ping', await startWorker());

  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, R1);
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  for (const name of TEAMS) {
    await A.page.locator('#btn-clinical-team-create-open').click();
    await until(() => A.page.locator('#clinical-team-create-panel[open]').isVisible(), 4000);
    await A.page.locator('#clinical-team-create-name').fill(name);
    await A.page.locator('#clinical-team-create-form [type="submit"]').click();
    await A.page.waitForTimeout(1500);
    await closeToasts(A.page);
  }
  const mine = await A.page.evaluate(() => document.body.innerText);
  check('R1 created both teams and sees them', TEAMS.every((t) => mine.includes(t)));

  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, R2);
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const join = B.page.getByRole('button', { name: 'Unirme' });
  check('R2 sees the R1 teams through Nube', await until(async () => (await join.count()) >= 2, 25000));
  const openEquipo = async () => {
    await openNubeView(B.page, 'equipo');
    await B.page.waitForTimeout(1500);
  };
  for (let i = 0; i < 2; i += 1) {
    const btn = B.page.getByRole('button', { name: 'Unirme' });
    const ok = await until(async () => (await btn.count()) >= 1, 15000);
    check(`R2 still sees a team to join (${i + 1})`, ok);
    if (!ok) break;
    await btn.first().click();
    await B.page.waitForTimeout(600);
    await B.page.waitForTimeout(2000);
    await closeToasts(B.page);
    await openEquipo();
  }
  await r.shot(B.page, 'r2-two-teams');
  const text = await B.page.evaluate(() => document.querySelector('.cloud-sync-equipo-embed').innerText.replace(/\s+/g, ' '));
  check('R2 is «Estás en» both teams', (text.match(/Estás en/g) || []).length === 2 && TEAMS.every((t) => text.includes(t)), text.slice(0, 500));
  check('R2 keeps one letter in both teams', (text.match(/Ciclo R2 · A/g) || []).length === 2);
  check('no uncaught page errors', r.pageErrors?.length ? false : true);
});
