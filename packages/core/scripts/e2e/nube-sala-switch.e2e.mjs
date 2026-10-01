#!/usr/bin/env node
/**
 * E2E: switching sala from the Mi perfil chips, real Electron app against a
 * LOCAL copy of the sync Worker (fresh D1 per run). Synthetic DEMO user only.
 * Ways it can go wrong (each one is a check below):
 *   - the chip only changes the screen and the profile keeps the old sala
 *   - the profile moves but the device stays in the old Nube room
 *   - the Worker does not list the user as a member of the new sala's room
 *   - the window needs scrolling at the default size
 *   - the Sala section cannot be collapsed, or forgets it after a reopen
 *   - new rotation (sala unset): no hint, the section stays collapsed, or the tap
 *     does not set the room code and start sync for the new room owner
 */
import { createRun } from './harness.mjs';
import { startWorker, stopWorker, d1Query, nubeDevices, onboardNube, roomMeta, until, workerLog, BASE } from './nube-worker.mjs';

const tag = Date.now().toString(36).slice(-6);
const r = createRun('nube-sala-switch');
const { check } = r;
const launchDevice = nubeDevices(r);
const openPerfil = (page) => page.locator('#profile-toggle-btn').evaluate((b) => b.click());

await r.finish('Nube sala switch from Mi perfil', async () => {
  check('local Worker answers /ping', await startWorker(), BASE);
  const D = await launchDevice('sala-switch', 3799);
  const username = `demo_sw_${tag}`;
  await onboardNube(D.page, { username, name: 'Dra. Demo Sala' });
  const before = await until(() => roomMeta(D.page), 15000);
  check('device starts in a Sala 1 room', before?.sala === 'Sala 1', before);

  await openPerfil(D.page);
  const chip2 = D.page.locator('#profile-modal [data-perfil-sala="Sala 2"]');
  check('Mi perfil shows the sala chips', await until(() => chip2.isVisible().catch(() => false), 10000));
  await chip2.evaluate((b) => b.click());
  check('the profile moves to Sala 2', await until(() => D.page.evaluate(() => globalThis.document.getElementById('clinical-profile-sala')?.value === 'Sala 2'), 10000));
  check('the device moves to a Sala 2 room', await until(async () => {
    const m = await roomMeta(D.page);
    return m?.sala === 'Sala 2' && m.id !== before?.id;
  }, 20000), await roomMeta(D.page));
  const after = await roomMeta(D.page);
  const rows = () => JSON.parse(d1Query(`SELECT COUNT(*) AS n FROM room_members WHERE room_id='${after?.id}' AND user_id=(SELECT id FROM users WHERE username='${username}')`))[0]?.results?.[0]?.n;
  check('the Worker lists the user in the Sala 2 room', rows() === 1, rows());
  check('the identity card shows Sala 2', await until(() => D.page.locator('#profile-modal [data-perfil-meta]').innerText().then((t) => /Sala 2/.test(t)), 5000));
  const fit = await D.page.evaluate(() => { const b = globalThis.document.querySelector('#profile-modal .wb-modal-body'); return { scroll: b.scrollHeight, client: b.clientHeight, vh: globalThis.innerHeight, vw: globalThis.innerWidth }; });
  check('Mi perfil fits one screen, no scroll', fit.scroll <= fit.client + 1, fit);
  await r.shot(D.page, 'sala-2-selected');

  const section = D.page.locator('#profile-modal details.settings-perfil-sala');
  await section.locator('summary').evaluate((s) => s.click());
  check('the Sala section collapses', await until(() => section.evaluate((d) => !d.open), 3000));
  await D.page.locator('#profile-modal [data-wb-close]').first().evaluate((b) => b.click());
  await openPerfil(D.page);
  check('the collapsed state is remembered', await until(() => section.evaluate((d) => !d.open).catch(() => false), 5000));

  // New rotation: the profile saves with no sala (the form the rotation restart leaves behind).
  await D.page.evaluate(() => {
    globalThis.document.getElementById('clinical-profile-sala').value = '';
    globalThis.document.getElementById('clinical-profile-form').requestSubmit();
  });
  const N = D;
  const hint = N.page.locator('#profile-modal [data-perfil-sala-hint]');
  check('sala unset: Mi perfil shows the pick hint', await until(() => hint.isVisible().catch(() => false), 10000), await N.page.locator('#profile-modal').innerText().catch(() => ''));
  check('sala unset: the Sala section is open despite the saved collapse', await N.page.locator('#profile-modal details.settings-perfil-sala').evaluate((d) => d.open));
  check('sala unset: the summary says Sin sala', /Sin sala/.test(await N.page.locator('#profile-modal .settings-perfil-sala-current').innerText()));
  const mark = workerLog.length;
  await N.page.locator('#profile-modal [data-perfil-sala="Sala E"]').evaluate((b) => b.click());
  const joined = await until(async () => (await roomMeta(N.page))?.sala === 'Sala E', 20000);
  const fresh = await roomMeta(N.page);
  check('the tap joins the Sala E room with its code set', joined && !!fresh?.code, fresh);
  const n = JSON.parse(d1Query(`SELECT COUNT(*) AS n FROM room_members WHERE room_id='${fresh?.id}' AND user_id=(SELECT id FROM users WHERE username='${username}')`))[0]?.results?.[0]?.n;
  check('the Worker lists the user in the Sala E room', n === 1, n);
  check('sync starts at once for the new room', await until(async () => workerLog.slice(mark).some((l) => l.includes(fresh?.id)), 20000), workerLog.slice(mark, mark + 8));
  check('the hint is gone after the pick', await until(() => hint.isVisible().then((v) => !v).catch(() => true), 10000));
  await r.shot(N.page, 'new-rotation-picked');
  await N.app.close();
  await stopWorker();
});
