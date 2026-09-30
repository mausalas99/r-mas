#!/usr/bin/env node
/**
 * E2E: «Salir del equipo» and «Salir de la sala», real Electron app against a
 * LOCAL copy of the sync Worker (fresh D1 per run). Synthetic DEMO users only.
 * Ways it can go wrong (each one is a check below):
 *   - the team card keeps showing «Salir del equipo» after the user confirmed
 *   - «Salir de la sala» says done while the Worker still lists the user as a member
 *   - the device keeps its room after a successful leave
 */
import { createRun, dismissLearnHub, closeToasts, goArea } from './harness.mjs';
import { startWorker, d1Query, nubeDevices, onboardNube, roomMeta, until, BASE } from './nube-worker.mjs';

const tag = Date.now().toString(36).slice(-6);
const r = createRun('nube-leave');
const { check } = r;
const launchDevice = nubeDevices(r);
/** Header ⇄ → the full panel home (where «Tu sala» lives); with `view`, on into Opciones → that view. */
const openConexion = async (page, view) => {
  await page.locator('#btn-header-team-sync').click();
  const openPanel = page.locator('#nube-popover [data-nube-pop="open-panel"]');
  if (await until(() => openPanel.isVisible().catch(() => false), 3000)) await openPanel.click();
  if (!view) return;
  const navOptions = page.locator('[data-cloud-action="nav-options"]');
  if (await until(() => navOptions.isVisible().catch(() => false), 5000)) await navOptions.click();
  await page.locator(`.cloud-sync-view[data-cloud-view="options"] [data-cloud-action="nav-view"][data-cloud-view="${view}"]`).click();
};
const backToLabs = async (page) => {
  await closeToasts(page);
  await page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  await page.keyboard.press('Escape');
  await dismissLearnHub(page);
  await goArea(page, 'lab');
};

await r.finish('Nube leave: team and sala', async () => {
  check('local Worker answers /ping', await startWorker(), BASE);

  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, { username: `demo_a_${tag}`, name: 'Dr. Demo Alfa' });
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO ALFA');
  await A.page.locator('#clinical-team-create-sala').selectOption('Sala 1').catch(() => {});
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();

  const G = await launchDevice('g', 3797);
  await onboardNube(G.page, { username: `demo_g_${tag}`, name: 'Dr. Demo Golf' });
  const roomG = await until(() => roomMeta(G.page), 15000);
  const memberRows = () => JSON.parse(d1Query(`SELECT COUNT(*) AS n FROM room_members WHERE room_id='${roomG?.id}' AND user_id=(SELECT id FROM users WHERE username='demo_g_${tag}')`))[0]?.results?.[0]?.n;
  check('G is a member of the Sala 1 room before leaving', memberRows() === 1, memberRows());

  await G.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const join = G.page.getByRole('button', { name: 'Unirme' });
  check('G sees A\'s team through Nube', await until(() => join.isVisible().catch(() => false), 20000));
  await join.click();
  // Joining closes Mi rotación and the sheet by design: reopen Equipo to find the joined card.
  await backToLabs(G.page);
  await openConexion(G.page, 'equipo');
  const leaveTeam = G.page.locator('#connection-dropdown .clinical-teams-leave-btn').first();
  check('G sees «Salir del equipo» on the joined card', await until(() => leaveTeam.isVisible().catch(() => false), 15000));
  await leaveTeam.click();
  await G.page.getByRole('button', { name: 'Salir', exact: true }).click();
  check('«Salir del equipo» removes the card', await until(async () => !(await leaveTeam.isVisible().catch(() => false)), 15000));
  await r.shot(G.page, 'g-left-team');
  await backToLabs(G.page);

  const leaveRoom = G.page.locator('[data-cloud-action="leave-room"]');
  await openConexion(G.page);
  const shown = await until(() => leaveRoom.isVisible().catch(() => false), 10000);
  check('G sees «Salir de la sala»', shown);
  await leaveRoom.click();
  check('«Salir de la sala» clears the room on G', await until(async () => !(await roomMeta(G.page))?.id, 15000), await roomMeta(G.page));
  check('the Worker dropped G from the room', memberRows() === 0, memberRows());
  await r.shot(G.page, 'g-left-sala');
});
