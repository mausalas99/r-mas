#!/usr/bin/env node
/**
 * E2E: «Unirse por código» brings the room's history. Two devices on a LOCAL
 * copy of the sync Worker, synthetic DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - joining by code stores the room's current revision before any pull, so
 *     the first pull asks "since now" and a patient added while this device
 *     was out of the room never arrives
 *   - the boot-time ensure-turn does the same with the stored revision, so a
 *     patient added while this device was closed never arrives after restart
 *   - joining a team runs ensure-turn (ensureTurnRoomAfterTeamJoin →
 *     applyEnsureTurnSuccess), which jumped the stored revision to the
 *     server's and skipped every op not pulled yet: a device that is behind
 *     when it joins never gets them
 *
 * Artifact: e2e-artifacts/nube-join-code/<run-id>/ (report.json + screenshots).
 *
 *   node scripts/e2e/nube-join-code.e2e.mjs
 */
import { createRun, closeToasts, dismissLearnHub, pasteAndSave, goArea } from './harness.mjs';
import { startWorker, stopWorker, nubeDevices, onboardNube, roomMeta, patientVisible, until, BASE, openNubePanel } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';

const tag = Date.now().toString(36).slice(-6);
const USER_A = { username: `demo_ja_${tag}`, name: 'Dr. Demo Alfa' };
const USER_B = { username: `demo_jb_${tag}`, name: 'Dra. Demo Bravo' };
const P1 = { exp: '7000421-1', name: 'DEMO CODIGO UNO', room: '311' };
const P2 = { exp: '7000422-2', name: 'DEMO CODIGO DOS', room: '312' };
const P3 = { exp: '7000423-3', name: 'DEMO CODIGO TRES', room: '313' };

const r = createRun('nube-join-code');
const { check } = r;
const launchDevice = nubeDevices(r);

await r.finish('Nube: join by code pulls what happened while away', async () => {
  check('local Worker answers /ping', await startWorker(), BASE);
  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, USER_A);
  const room = await until(() => roomMeta(A.page), 15000);
  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, USER_B);
  check('B: same Sala 1 room as A', (await until(() => roomMeta(B.page), 15000))?.id === room?.id);
  // Same team, same as nube-sync: A creates it, B joins it.
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO CODIGO');
  await A.page.locator('#clinical-team-create-sala').selectOption('Sala 1').catch(() => {});
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const joinTeam = B.page.getByRole('button', { name: 'Unirme' });
  await until(() => joinTeam.isVisible(), 20000);

  // Put B behind: hold its pulls (main-process Nube fetch) and its live socket,
  // then A adds P1. B joins the team while it has not pulled P1 yet.
  await B.app.evaluate(({ ipcMain, session }) => {
    const orig = ipcMain._invokeHandlers.get('cloud-sync-fetch');
    globalThis.__e2eNet = { hold: true, ensureTurns: 0 };
    ipcMain.removeHandler('cloud-sync-fetch');
    ipcMain.handle('cloud-sync-fetch', (e, p) => {
      const url = String(p?.url || '');
      if (url.includes('/rooms/ensure-turn')) globalThis.__e2eNet.ensureTurns++;
      if (globalThis.__e2eNet.hold && url.includes('/pull?')) return { ok: false, status: 0, statusText: 'e2e: pull held', data: {} };
      return orig(e, p);
    });
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['ws://*/*', 'wss://*/*'] }, (_d, cb) => cb({ cancel: globalThis.__e2eNet.hold }));
  });
  await stopWorker(); // drops B's open socket; the hold keeps it from coming back
  await startWorker();
  await A.page.keyboard.press('Escape');
  await closeToasts(A.page);
  await A.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  await dismissLearnHub(A.page);
  await goArea(A.page, 'lab');
  await pasteAndSave(A.page, fullLabs(P1, 'Sep 20 2026 8:00AM'));
  await until(async () => /--(idle|live)\b/.test((await A.page.locator('#btn-header-team-sync').getAttribute('class')) || ''), 20000);
  await A.page.waitForTimeout(2000);
  check('B: P1 is not there while B is held (setup)', !(await patientVisible(B.page, P1)));
  await joinTeam.click();
  check('B: joining the team runs ensure-turn (ensureTurnRoomAfterTeamJoin → applyEnsureTurnSuccess)',
    await until(() => B.app.evaluate(() => globalThis.__e2eNet.ensureTurns > 0), 15000));
  await B.page.waitForTimeout(2000);
  await B.app.evaluate(() => { globalThis.__e2eNet.hold = false; });
  for (const d of [A, B]) {
    await closeToasts(d.page);
    await d.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await d.page.keyboard.press('Escape');
    await dismissLearnHub(d.page);
    await goArea(d.page, 'lab');
  }

  check('B: P1, added while B was behind, arrives after the team-join ensure-turn', await until(() => patientVisible(B.page, P1), 60000));

  // B leaves the room; A adds P2 while B is out.
  await closeToasts(B.page);
  await openNubePanel(B.page);
  const leave = B.page.locator('#connection-dropdown [data-cloud-action="leave-room"]');
  if (!(await leave.isVisible().catch(() => false))) await B.page.locator('#connection-dropdown [data-cloud-action="nav-options"]').click();
  await leave.click();
  check('B: «Salir de la sala» leaves', await until(() => B.page.locator('.toast', { hasText: /Saliste de la sala/ }).isVisible(), 10000));
  await pasteAndSave(A.page, fullLabs(P2, 'Sep 20 2026 8:30AM'));
  // Let A's push land before B comes back, so P2 sits below the room's revision.
  await until(async () => /--(idle|live)\b/.test((await A.page.locator('#btn-header-team-sync').getAttribute('class')) || ''), 20000);
  await A.page.waitForTimeout(2000);

  // B rejoins with the room code.
  const joinCode = B.page.locator('#connection-dropdown [data-cloud-join-code]').locator('visible=true').first();
  await joinCode.waitFor({ state: 'visible', timeout: 10000 });
  await closeToasts(B.page);
  await joinCode.fill(room.code);
  await B.page.locator('#connection-dropdown [data-cloud-action="join-room"]').locator('visible=true').first().click();
  check('B: «Unirse» by code joins', await until(() => B.page.locator('.toast', { hasText: /Unido a la sala/ }).isVisible(), 10000));
  await B.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  check('B: P2, added while B was out, arrives after joining by code', await until(() => patientVisible(B.page, P2), 30000));
  await r.shot(B.page, 'b-after-join');
  check('B: P1 is still there', await patientVisible(B.page, P1));

  // ── Restart: boot's ensure-turn must not skip what B added while A was closed ──
  const aErrors = [...A.pageErrors];
  await A.app.close();
  await pasteAndSave(B.page, fullLabs(P3, 'Sep 20 2026 9:00AM'));
  await until(async () => /--(idle|live)\b/.test((await B.page.locator('#btn-header-team-sync').getAttribute('class')) || ''), 20000);
  await B.page.waitForTimeout(2000);
  const A2 = await launchDevice('a', 3791);
  await A2.page.locator('#apptab-lab').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(A2.page);
  await goArea(A2.page, 'lab');
  check('A restarted: P3, added on B while A was closed, arrives', await until(() => patientVisible(A2.page, P3), 30000));
  await r.shot(A2.page, 'a-after-restart');

  check('no uncaught page errors', !aErrors.length && !A2.pageErrors.length && !B.pageErrors.length, [...aErrors, ...A2.pageErrors, ...B.pageErrors].slice(0, 5));
  await A2.app.close();
  await B.app.close();
});
