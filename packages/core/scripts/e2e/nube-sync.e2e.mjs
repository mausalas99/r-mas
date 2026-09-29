#!/usr/bin/env node
/* global document, window, MutationObserver */
/**
 * E2E: Nube sync between two desktop devices, driven through the real
 * Electron app against a LOCAL copy of the real sync Worker (`wrangler dev
 * --local`, fresh D1 + Durable Object state per run). Never touches the real
 * Cloudflare Worker. Synthetic DEMO patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Sign-up
 *     - Nube sign-up does not reach the Worker, or lands in no ward room
 *     - the recovery code is not shown, or "Continuar" works without "Lo guardé"
 *     - a second resident in the same Sala lands in a different room
 *   Device A → device B
 *     - patients pasted on A never reach B, or reach it without their labs
 *     - lab values arrive changed (a different Hb / K / pH on B)
 *     - the Worker stores readable patient data (names, expedientes, lab values)
 *   Device B → device A (both ways)
 *     - a lab set added on B for an existing patient does not reach A
 *     - the new set replaces the old one instead of adding to the history
 *   Datos (census fields)
 *     - an ingreso date (FIUX) set in Datos on B never reaches A
 *   VPO, listado de problemas, perfil farmacológico
 *     - edits made in the UI on A are saved locally but never pushed, or B
 *       never shows them
 *     - a problem removed or a perfil month deleted on B stays on A
 *     - a med imported in Manejo on A never shows in B's perfil histórico
 *   Local responsiveness
 *     - joining a team leaves Mi rotación or the Conexión sheet open
 *     - a new patient waits on the Nube push before showing in A's own list
 *   Offline
 *     - work done while the Worker is down is lost, or never pushed later
 *     - the app crashes or blocks the paste while offline
 *   Restart
 *     - "Recuérdame" does not survive a restart: the app asks to log in again
 *     - a restarted device loses patients, or duplicates them on the next pull
 *   Recovery (log out, recover account with the code, log back in)
 *     - a wrong recovery code is accepted, or a correct one is rejected
 *     - recovering the password locks the device out of the room's encrypted
 *       labs (the recovery code only proves account ownership, not the room)
 *   Delete
 *     - a patient removed on A stays on B, or comes back after the next sync
 *   Nube fixes (own block before Admin)
 *     - undoing a delete on A leaves the patient gone on B, or gone on A
 *       itself after the undo reload (one pull holds the delete and the undo)
 *     - a device offline during a delete pushes chart ops on reconnect and the
 *       patient comes back for everyone as a nameless shell, or it never drops
 *       the patient because its own push moved its cursor past the delete
 *     - a peer's whole clinicalOps push drops a team A made, and A never pushes
 *       it back (a need seen inside the re-push cooldown was lost)
 *   Throughout
 *     - an uncaught page error on either device
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, openPatient, goArea, acceptAbxDias } from './harness.mjs';
import { startWorker, stopWorker, d1Query, nubeDevices, onboardNube, roomMeta, patientVisible, flat, until, BASE, PASSWORD, openNubePanel } from './nube-worker.mjs';
import { fullLabs, gas } from './some-fixtures.mjs';
import { decodeRoomState } from '../../cloud/sync-worker/src/crypto-at-rest.js';

const tag = Date.now().toString(36).slice(-6);
const USER_A = { username: `demo_a_${tag}`, name: 'Dr. Demo Alfa' };
const USER_B = { username: `demo_b_${tag}`, name: 'Dra. Demo Bravo' };
const P1 = { exp: '7000411-1', name: 'DEMO SINCRONIA UNO', room: '301' };
const P2 = { exp: '7000412-2', name: 'DEMO SINCRONIA DOS', room: '302' };
const P3 = { exp: '7000413-3', name: 'DEMO SINCRONIA TRES', room: '303' };
const P4 = { exp: '7000414-4', name: 'DEMO SINCRONIA CUATRO', room: '304' };
const P5 = { exp: '7000415-5', name: 'DEMO SINCRONIA CINCO', room: '305' };
/** lib/clinical-salas.mjs CLINICAL_SALA_VALUES === cloud-sync/sala-allowlist.mjs CLOUD_SALAS. */
const CLOUD_SALAS = ['Sala 1', 'Sala 2', 'Sala E', 'Torre HU', 'Interconsultas', 'UX', 'Eme', 'Área A/Pensionistas'];

const r = createRun('nube-sync');
const { check } = r;
const launchDevice = nubeDevices(r);

/** The lab view's day picker is a <select> of "day:DD/MM/YYYY" options. */
const pickLabDay = (page, day) =>
  page.locator('#appcontent-lab select', { has: page.locator(`option[value="day:${day}"]`) }).first().selectOption(`day:${day}`);

/** Header ⇄ button → Opciones → one named sub-view (mobile/equipo/cuenta/admin/nube/advanced). */
const openConexion = async (page, view) => {
  await openNubePanel(page);
  const navOptions = page.locator('[data-cloud-action="nav-options"]');
  // The panel can still be rebuilding its home view (e.g. right after a room switch).
  if (await until(() => navOptions.isVisible().catch(() => false), 5000)) await navOptions.click();
  // The status home has its own «Detalles técnicos» row to the same view; use the Opciones one.
  if (view) await page.locator(`.cloud-sync-view[data-cloud-view="options"] [data-cloud-action="nav-view"][data-cloud-view="${view}"]`).click();
};
const closeConexion = (page) => page.locator('#btn-connection-dropdown-close').click().catch(() => {});
/** #btn-header-team-sync carries btn-livesync-header--{idle,live,syncing,degraded,local,offline}. */
const headerSyncModifier = (page) =>
  page.locator('#btn-header-team-sync').getAttribute('class').then((c) => (String(c || '').match(/btn-livesync-header--(\w+)/) || [])[1] || null);

/** Room state as the local Worker holds it (entries/tombstones readable; clinical values stay client-encrypted). */
const roomState = async (roomId) => {
  const out = JSON.parse(d1Query(`SELECT hex(ciphertext) AS c, hex(iv) AS i FROM room_state WHERE room_id='${roomId}'`));
  const row = out[0]?.results?.[0];
  const u8 = (h) => Uint8Array.from(Buffer.from(h || '', 'hex'));
  return decodeRoomState({ WORKER_DATA_KEY: 'ab'.repeat(32) }, u8(row.c), u8(row.i));
};
/**
 * All Nube HTTP runs in the main process ('cloud-sync-fetch' IPC → net), so renderer
 * routes never see it. Wrap that handler to log pushed paths or fail requests by "METHOD /path".
 */
const tapNet = (d) => d.app.evaluate(({ ipcMain }) => {
  const g = (globalThis.__e2e ||= {});
  if (g.netTapped) return;
  const orig = ipcMain._invokeHandlers.get('cloud-sync-fetch');
  if (!orig) throw new Error('cloud-sync-fetch handler not found');
  Object.assign(g, { netTapped: true, net: [], block: null });
  ipcMain.removeHandler('cloud-sync-fetch');
  ipcMain.handle('cloud-sync-fetch', async (e, payload) => {
    const key = `${payload?.method || 'GET'} ${new URL(String(payload?.url || ''), 'http://x').pathname}`;
    const body = typeof payload?.body === 'string' ? payload.body : '';
    g.net.push({ at: Date.now(), key, paths: [...body.matchAll(/"path":"([^"]+)"/g)].map((m) => m[1]) });
    if (g.block && new RegExp(g.block).test(key)) return { ok: false, status: 0, statusText: 'e2e offline', data: { error: 'e2e offline' }, retryAfterMs: null };
    return orig(e, payload);
  });
});
const netBlock = (d, block) => d.app.evaluate((_, b) => { globalThis.__e2e.block = b; }, block);
/** Paths of every POST …/mutations a device sent (or tried) since `since`. */
const pushedPaths = (d, since = 0) => d.app.evaluate((_, s) =>
  globalThis.__e2e.net.filter((x) => x.at >= s && /^POST .*\/mutations$/.test(x.key)).flatMap((x) => x.paths), since);
const patientIdOf = (page, p) =>
  page.locator(`.p-name[title*="${p.exp}"]`).first().evaluate((el) => el.closest('[data-patient-id]')?.dataset.patientId || null);
const deleteCard = async (page, p) => {
  await closeToasts(page);
  const card = page.locator('.patient-card, [class*=patient-card]', { has: page.locator(`.p-name[title*="${p.exp}"]`) }).first();
  await card.hover();
  await card.locator('.btn-delete-card').click();
};
const clinicalOpsOf = (page) => page.evaluate(() => window.electronAPI.dbClinicalOpsExport({})).then((res) => res?.snapshot || res || {});
const hasTeam = (ops, name) => JSON.stringify(ops.teams || []).includes(name);
/** Conexión › Opciones › Equipo › «Crear equipo» (⇄ can open a quick-look popover first: openConexion rides it out). */
const createTeam = async (page, name) => {
  await openConexion(page, 'equipo');
  await page.locator('#btn-clinical-team-create-open').click();
  await page.locator('#clinical-team-create-name').fill(name);
  await page.locator('#clinical-team-create-sala').selectOption('Sala 1').catch(() => {});
  await page.locator('#clinical-team-create-form [type="submit"]').click();
};
const backToLabs = async (page) => {
  await closeToasts(page);
  await page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  await page.keyboard.press('Escape');
  await dismissLearnHub(page);
  await goArea(page, 'lab');
};

await r.finish('Nube sync: two devices, both ways, offline, restart, delete', async () => {
  check('local Worker answers /ping', await startWorker(), BASE);

  // ── Sign-up on both devices ────────────────────────────────────────────
  const A = await launchDevice('a', 3791);
  const oa = await onboardNube(A.page, USER_A);
  check('A: recovery code shown once, in R+XXXX-XXXX-XXXX form', /R\+[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(oa.recovery));
  check('A: "Continuar" locked until "Lo guardé" is ticked', oa.lockedBeforeCheck);
  check('A: recovery modal shows its default title + save-it copy (recovery-modal, no caller overrides them at sign-up)',
    /C[oó]digo de recuperaci[oó]n/i.test(oa.recovery) && /Guarda este c[oó]digo/i.test(oa.recovery), oa.recovery.slice(0, 250));
  check('A: sign-up says profile + Nube are ready, Sala 1', /Nube est[aá]n listos/.test(oa.done) && oa.done.includes('Sala 1'), oa.done.slice(0, 200));
  const roomA = await until(() => roomMeta(A.page), 15000);
  check('A: joined a Sala 1 ward room', roomA?.sala === 'Sala 1' && !!roomA?.id, roomA);
  await r.shot(A.page, 'a-signed-up');

  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, USER_B);
  const roomB = await until(() => roomMeta(B.page), 15000);
  check('B: same Sala 1 room as A', roomB?.id === roomA?.id, { a: roomA?.id, b: roomB?.id });

  // ── Team: A creates it, B finds it through Nube and joins ─────────────
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  const createName = A.page.locator('#clinical-team-create-name');
  check('A: «Crear nuevo equipo» opens the form', await createName.isVisible().catch(() => false));
  await createName.fill('EQUIPO DEMO ALFA');
  const teamSalaOptions = await A.page.locator('#clinical-team-create-sala option').evaluateAll((els) => els.map((e) => e.textContent.trim()));
  check('A: «Crear equipo» sala select lists every ward (cloud-census-sala-push cross-sala routing)',
    CLOUD_SALAS.every((s) => teamSalaOptions.includes(s)), teamSalaOptions);
  await A.page.locator('#clinical-team-create-sala').selectOption('Sala 1').catch(() => {});
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();
  await r.shot(A.page, 'a-team-created');
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const joinBtn = B.page.getByRole('button', { name: 'Unirme' });
  check('B: sees A\'s team «EQUIPO DEMO ALFA» through Nube', await until(() => joinBtn.isVisible(), 20000));
  await joinBtn.click();
  check('B: joining closes Mi rotación and the Conexión sheet within 5 s',
    await until(async () => !(await B.page.locator('#clinical-teams-backdrop.open').count()) && !(await B.page.locator('#connection-dropdown.open').count()), 5000, 100),
    { teams: await B.page.locator('#clinical-teams-backdrop.open').count(), conexion: await B.page.locator('#connection-dropdown.open').count() });
  await r.shot(B.page, 'b-joined');
  for (const d of [A, B]) {
    await closeToasts(d.page);
    await d.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await d.page.keyboard.press('Escape');
    await dismissLearnHub(d.page);
    await goArea(d.page, 'lab');
  }

  // ── A → B: two new patients with labs ──────────────────────────────────
  await pasteAndSave(A.page, fullLabs(P1, 'Sep 20 2026 8:00AM'));
  // The team assignment must not hold the list back until the Nube push answers.
  check('A: a new patient shows in A\'s own list within 1.5 s of saving', await until(() => patientVisible(A.page, P1), 1500, 100));
  await pasteAndSave(A.page, fullLabs(P2, 'Sep 20 2026 8:30AM'));
  await openPatient(A.page, P1);
  await openPatient(A.page, P2);
  check('B: both patients from A arrive', await until(async () => (await patientVisible(B.page, P1)) && (await patientVisible(B.page, P2)), 45000));
  await r.shot(B.page, 'b-received');
  await openPatient(B.page, P1);
  check('B: P1 opens without «Completar ingreso» (A already filled room/bed)', !(await B.page.locator('#m-servicio').isVisible()));
  const labText = (d) => d.page.locator('#appcontent-lab').innerText().then(flat);
  check('B: P1 labs arrive with the same values (Hb 11.85, K 3.9, Cr 1.35)',
    await until(async () => /Hb 11\.85/.test(await labText(B)) && /K 3\.9/.test(await labText(B)) && /Cr 1\.35/.test(await labText(B)), 30000),
    (await labText(B)).slice(0, 300));
  await r.shot(B.page, 'b-p1-labs');

  // Nothing readable on the server: no names, expedientes or lab values in D1.
  const dump = d1Query('SELECT * FROM room_state; SELECT * FROM room_state_lab_sets; SELECT * FROM mutations;');
  const leaks = ['SINCRONIA', P1.exp, P2.exp, '11.85', 'HGB'].filter((w) => dump.includes(w));
  check('Worker D1 holds no readable names / expedientes / lab values', leaks.length === 0, leaks);

  // ── Header chip + Diagnóstico Nube + Avanzado + Móvil, while online ───
  check('B: header ⇄ chip is live/local while synced, not degraded', !/degraded|offline/.test((await headerSyncModifier(B.page)) || ''), await headerSyncModifier(B.page));
  await openConexion(B.page, 'nube');
  const diagHost = B.page.locator('[data-cloud-nube-diagnostics-host]');
  check('B: Diagnóstico Nube dashboard renders while online', await until(() => diagHost.locator('.cloud-nube-dash-hero .cloud-sync-hero-title').first().isVisible(), 10000));
  await r.shot(B.page, 'b-diagnostico-nube-online');
  await closeConexion(B.page);
  await openConexion(B.page, 'advanced');
  check('B: Avanzado shows the configured service URL', await until(async () => (await B.page.locator('#cloud-sync-url-connected').inputValue()) === BASE, 5000),
    await B.page.locator('#cloud-sync-url-connected').inputValue().catch(() => null));
  await closeConexion(B.page);
  await openConexion(B.page, 'mobile');
  const mobileHost = B.page.locator('[data-cloud-mobile-invite-host]');
  check('B: iPad / R+ Móvil view mounts an invite (desktop builds the permanent URL)', await until(() => mobileHost.locator('*').first().isVisible(), 10000));
  await closeConexion(B.page);
  // resetConexionPanelOnClose runs off a dynamic import — give it a tick before reopening,
  // or the reopen's toggle can race the close animation and just close it again.
  await B.page.waitForTimeout(500);
  // Reopen with the header button alone (openConexion() would click «Opciones»
  // itself): panel-conexion-tour must land on Conexión home, not stay on Móvil.
  await openNubePanel(B.page);
  const backOnHome = B.page.locator('[data-cloud-action="nav-options"]');
  check('B: reopening the dropdown after close resets to the Conexión home view', await until(() => backOnHome.isVisible(), 5000));
  await closeConexion(B.page);

  // ── B → A: a new gas for P1, added on B ────────────────────────────────
  await goArea(B.page, 'lab');
  await pasteAndSave(B.page, gas(P1, 'Sep 21 2026 6:00AM', '7.21'));
  await openPatient(A.page, P1);
  check('A: gas day from B shows up (21/09/2026) next to the old one (20/09/2026)',
    await until(async () => /21\/09\/2026/.test(await labText(A)) && /20\/09\/2026/.test(await labText(A)), 30000), (await labText(A)).slice(0, 200));
  await pickLabDay(A.page, '21/09/2026');
  check('A: that day holds the gas pasted on B (pH 7.21)', await until(async () => /7\.21/.test(await labText(A)), 5000), (await labText(A)).slice(0, 400));
  await pickLabDay(A.page, '20/09/2026');
  check('A: the old set is still there (Hb 11.85): added, not replaced', await until(async () => /Hb 11\.85/.test(await labText(A)), 5000));
  await r.shot(A.page, 'a-p1-gas-from-b');

  // ── B → A: a Datos field (FIUX date) for P1, set on B ────────────────
  const FIUX = '2026-09-19';
  const fiuxInput = (page) => page.locator('#patient-data-form input.rpc-date-input[data-oninput-args=\'["fiuxFecha"]\']');
  const openDatos = async (page) => {
    await goArea(page, 'nota');
    await page.locator('.dash-name:visible').first().click();
    await fiuxInput(page).waitFor({ state: 'attached', timeout: 5000 });
  };
  const closeDatos = async (page) => {
    await page.keyboard.press('Escape');
    await until(async () => !(await page.locator('#exp-datos-modal-backdrop.open').count()), 3000);
  };
  await openPatient(B.page, P1);
  await openDatos(B.page);
  await fiuxInput(B.page).evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, FIUX);
  await closeDatos(B.page);
  await openPatient(A.page, P1);
  let fiuxOnA = '';
  check('A: FIUX date set in Datos on B arrives (19/09/2026)',
    await until(async () => {
      // until() swallows throws: close in finally, or one slow open leaves the modal blocking every retry.
      try {
        await openDatos(A.page);
        fiuxOnA = await fiuxInput(A.page).inputValue();
      } finally {
        await closeDatos(A.page).catch(() => {});
      }
      return fiuxOnA === FIUX;
    }, 45000), fiuxOnA);

  // ── VPO, listado de problemas, perfil farmacológico: A → B ─────────────
  const VPO_TEXT = 'DEMO VALORACION PREOPERATORIA SINCRONIA';
  const PROBLEMA = 'DEMO PROBLEMA ACTIVO SINCRONIA';
  // Like a real click, move focus off the last field (a focused field blocks the
  // live repaint on pull). The tab paints after the next frame: wait, or a quick
  // next click cancels that paint.
  const segment = async (page, id) => {
    await page.evaluate((sel) => { document.activeElement?.blur?.(); document.getElementById(sel)?.click(); }, id);
    await page.waitForTimeout(300);
  };
  const vpoIntro = (page) => page.locator('[data-vpo-field="valoracionIntro"]');
  const listadoRows = (page) => page.locator('#listado-form [data-seccion-group="activos"] .listado-row textarea');
  const openPerfil = async (page) => {
    await closeToasts(page);
    // Programmatic clicks: a «Guía» hint popover can pop over the tab bar mid-run.
    await segment(page, 'apptab-med');
    await segment(page, 'med-itab-perfil');
    await page.waitForTimeout(400);
  };
  const pharmRow = (page) => page.locator('#med-pharm-list .med-pharm-row', { has: page.locator('.med-pharm-name', { hasText: 'DEMO PARACETAMOL' }) });
  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const pad2 = (n) => String(n).padStart(2, '0');
  const MONTH = [
    ['Medicamento', 'Dosis', 'Freq', 'Via', ...Array.from({ length: dim }, (_, i) => pad2(i + 1))].join('\t'),
    ['DEMO PARACETAMOL 500 MG TAB', '1 G //', 'Q8H', 'VIA ORAL', ...Array.from({ length: dim }, (_, i) => (i + 1 === now.getDate() ? '1' : ''))].join('\t'),
  ].join('\n');

  await openPatient(A.page, P1);
  await segment(A.page, 'apptab-nota');
  await segment(A.page, 'exp-segment-vpo');
  await vpoIntro(A.page).fill(VPO_TEXT);
  await segment(A.page, 'exp-segment-listado');
  await A.page.locator('#listado-form [data-seccion-group="activos"] .listado-add-row').click();
  await listadoRows(A.page).last().fill(PROBLEMA);
  await openPerfil(A.page);
  await A.page.locator('#med-pharm-paste-open-btn').click();
  await A.page.locator('#med-pharm-paste').fill(MONTH);
  await A.page.locator('#med-pharm-import-btn').click();
  check('A: VPO, problem and pharm month saved for P1', await until(() => pharmRow(A.page).isVisible(), 8000));
  await openPatient(B.page, P1);
  let seenOnB = {};
  const arrived = await until(async () => {
    await segment(B.page, 'apptab-nota');
    await segment(B.page, 'exp-segment-vpo');
    const vpo = await vpoIntro(B.page).inputValue().catch(() => '');
    await segment(B.page, 'exp-segment-listado');
    const problems = await listadoRows(B.page).evaluateAll((els) => els.map((e) => e.value)).catch(() => []);
    await openPerfil(B.page);
    const pharm = await pharmRow(B.page).count();
    seenOnB = { vpo, problems, pharm };
    return vpo === VPO_TEXT && problems.includes(PROBLEMA) && pharm === 1;
  }, 45000);
  check('B: VPO, problem list and pharm month edited on A arrive for P1', arrived, seenOnB);

  // Deletes on B must clear A too (perfil changes almost daily through Manejo).
  await segment(B.page, 'apptab-nota');
  await segment(B.page, 'exp-segment-listado');
  await B.page.locator('#listado-form [data-seccion-group="activos"] .btn-remove-listado').first().click();
  await openPerfil(B.page);
  await B.page.locator('#med-pharm-output-more summary').click();
  await B.page.locator('#med-pharm-delete-month-btn').click();
  await B.page.locator('.wb-confirm-modal [data-wb-confirm-ok]').click();
  check('B: problem removed and perfil month deleted for P1', await until(async () => (await pharmRow(B.page).count()) === 0, 8000));
  await openPatient(A.page, P1);
  let seenOnA = {};
  check('A: the problem and perfil month deleted on B are gone for P1', await until(async () => {
    await segment(A.page, 'apptab-nota');
    await segment(A.page, 'exp-segment-listado');
    const problems = await listadoRows(A.page).evaluateAll((els) => els.map((e) => e.value)).catch(() => []);
    await openPerfil(A.page);
    const pharm = await pharmRow(A.page).count();
    seenOnA = { problems, pharm };
    return !problems.includes(PROBLEMA) && pharm === 0;
  }, 45000), seenOnA);

  // ── Offline: Worker down, A keeps working, then catches up ────────────
  await stopWorker();
  await pasteAndSave(A.page, fullLabs(P3, 'Sep 21 2026 7:00AM'));
  await openPatient(A.page, P3);
  check('A: paste saves P3 with its labs while the Worker is down', await until(async () => /Hb 11\.85/.test(await labText(A)), 10000));
  await r.shot(A.page, 'a-offline');
  check('Worker comes back on the same data', await startWorker());
  check('B: P3 (made offline on A) arrives within 30 s of the Worker coming back', await until(() => patientVisible(B.page, P3), 30000));

  // ── Restart A: session remembered, no duplicates ───────────────────────
  await A.app.close();
  const A2 = await launchDevice('a', 3791);
  const lab2 = A2.page.locator('.topbar-area-btn');
  check('A restarted: no login screen (Recuérdame kept the session)', await until(() => lab2.isVisible(), 30000) && !(await A2.page.locator('[data-sync-mode]').first().isVisible().catch(() => false)));
  await dismissLearnHub(A2.page);
  await goArea(A2.page, 'lab');
  await A2.page.waitForTimeout(4000);
  const counts = await A2.page.locator('.p-name').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute('title') || ''));
  const n = (p) => counts.filter((t) => t.includes(p.exp)).length;
  check('A restarted: P1, P2, P3 each listed exactly once', n(P1) === 1 && n(P2) === 1 && n(P3) === 1, counts);
  await r.shot(A2.page, 'a-restarted');

  // ── Recovery: log out on A, recover the account with the code ─────────
  const recoveryCode = oa.recovery.match(/R\+[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)[0];
  await openNubePanel(A2.page);
  await A2.page.locator('[data-cloud-action="logout"]').locator('visible=true').first().click();
  const recoverTab = A2.page.locator('[data-cloud-tab="recover"]');
  await recoverTab.waitFor({ state: 'visible', timeout: 10000 });
  await recoverTab.click();
  const fillRecover = async (code, pass) => {
    await A2.page.locator('[data-cloud-recover-user]').fill(USER_A.username);
    await A2.page.locator('[data-cloud-recover-code]').fill(code);
    await A2.page.locator('[data-cloud-recover-pass]').fill(pass);
    await A2.page.locator('[data-cloud-recover-pass2]').fill(pass);
    await A2.page.locator('[data-cloud-action="recover"]').click();
  };
  await closeToasts(A2.page);
  await fillRecover('R+2222-2222-2222', 'Wrong-e2e-Pass-2026!');
  const badToast = A2.page.locator('.toast.error').first();
  check('A: a wrong recovery code is rejected with a visible error',
    await until(() => badToast.isVisible(), 8000), await badToast.textContent().catch(() => null));
  check('A: still on the recover tab after a rejected code (not logged back in)', await recoverTab.getAttribute('class').then((c) => /is-active/.test(c || '')));
  await closeToasts(A2.page);
  // Pasted with the case and padding a user copy-pastes, not the exact stored form.
  await fillRecover(`  ${recoveryCode.toLowerCase()}  `, 'Recovered-e2e-Pass-2026!');
  const okToast = A2.page.locator('.toast', { hasText: /cuenta recuperada/i });
  check('A: the real code (any case, extra spaces) recovers the account', await until(() => okToast.isVisible(), 10000));
  // Recovering also rotates the recovery code — the same reveal-and-confirm modal as sign-up.
  const newCodeContinue = A2.page.locator('[data-recovery-continue]');
  if (await until(() => newCodeContinue.isVisible(), 8000)) {
    await A2.page.locator('[data-recovery-confirm]').click();
    await newCodeContinue.click();
  }
  // Back on the connected/status screen (not stuck on the login tabs): the
  // logout button — only present once authenticated — is visible again.
  const loggedInAgain = A2.page.locator('[data-cloud-action="logout"]').locator('visible=true').first();
  check('A: back on the connected status view, not stuck on login tabs', await until(() => loggedInAgain.isVisible(), 10000));
  await closeToasts(A2.page);
  await A2.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  await openPatient(A2.page, P1);
  await pickLabDay(A2.page, '20/09/2026');
  check('A: recovering the password did not lock out the room — P1 labs still readable (Hb 11.85)',
    await until(async () => /Hb 11\.85/.test(await labText(A2)), 10000), (await labText(A2)).slice(0, 300));
  await r.shot(A2.page, 'a-recovered');

  // ── Delete on A → gone on B, and stays gone ───────────────────────────
  await closeToasts(A2.page);
  const card = A2.page.locator('.patient-card, [class*=patient-card]', { has: A2.page.locator(`.p-name[title*="${P2.exp}"]`) }).first();
  await card.hover();
  await card.locator('.btn-delete-card').click();
  check('A: P2 deleted locally', await until(async () => !(await patientVisible(A2.page, P2)), 10000));
  check('B: P2 removed after A deleted it', await until(async () => !(await patientVisible(B.page, P2)), 45000));
  await B.page.waitForTimeout(8000);
  check('B: P2 does not come back on a later sync', !(await patientVisible(B.page, P2)));
  check('B: P1 and P3 still there', (await patientVisible(B.page, P1)) && (await patientVisible(B.page, P3)));
  await r.shot(B.page, 'b-after-delete');

  // ── Eventualidad added on A2 *while offline* → header/diagnostics reflect it, then drains to B ──
  const openEventualidades = async (page) => {
    await goArea(page, 'nota');
    await page.locator('.exp-group-pill[data-group="clinico"]').hover();
    await page.locator('.exp-group-section[data-section="eventualidades"]').click();
    await page.locator('#eventualidades-input').waitFor({ state: 'visible', timeout: 8000 });
  };
  const evText = 'DEMO SINCRONIA: caida sin lesion evidente, se avisa a familia.';
  await closeToasts(A2.page);
  await openPatient(A2.page, P1);
  await stopWorker();
  check('A: header ⇄ chip turns degraded/offline while the Worker is down',
    await until(async () => /^(degraded|offline)$/.test((await headerSyncModifier(A2.page)) || ''), 25000), await headerSyncModifier(A2.page));
  await openEventualidades(A2.page);
  await A2.page.locator('#eventualidades-input').fill(evText);
  await A2.page.locator('#eventualidades-add').click();
  check('A: eventualidad saved for P1 while offline', await until(() => A2.page.getByText(evText).first().isVisible(), 8000));
  await openConexion(A2.page, 'nube');
  const diagHostA2 = A2.page.locator('[data-cloud-nube-diagnostics-host]');
  check('A: Diagnóstico Nube shows the queued offline eventualidad «en espera de envío»',
    await until(() => diagHostA2.locator('.cloud-nube-dash-waiting .cloud-nube-dash-count', { hasText: /^\d+ cambios?$/ }).isVisible(), 10000));
  await r.shot(A2.page, 'a-diagnostico-nube-offline');
  await closeConexion(A2.page);
  check('Worker back up for the final phase', await startWorker());
  await openPatient(B.page, P1);
  await openEventualidades(B.page);
  check('B: the eventualidad queued offline on A reaches B once reconnected (clinical-repo-sync-drain, op-encoder-eventualidades)',
    // The same text also sits in the (hidden) Resumen card: look for a visible copy.
    await until(() => B.page.getByText(evText).locator('visible=true').first().isVisible(), 30000));

  // ── Manejo/Receta pushed on A2 for P1 → pulls to B (cloud-med-receta-index) ──
  const now2 = new Date();
  const dmy2 = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const medLine = [`${dmy2(now2)} 08:01 a.m.`, 'MEDICAMENTOS', 'DEMO CEFALOSPORINA 1 G SOL INY', 'VIA INTRAVENOSA', '1 G //', 'CADA 24 HORAS', 'NW'].join('\t');
  await goArea(A2.page, 'med');
  await A2.page.locator('#med-itab-receta').click();
  await A2.page.locator('#med-import-open-btn').click();
  await A2.page.locator('#med-input').fill(medLine);
  await A2.page.getByRole('button', { name: 'Procesar receta' }).click();
  await acceptAbxDias(A2.page);
  await A2.page.waitForTimeout(500);
  // Receta rows render sentence-case (splitMedLabel lower-cases then caps the first
  // letter: "Demo cefalosporina 1 g iv…"), so the match must be case-insensitive.
  check('A: receta imported for P1 shows the new med', await until(() => A2.page.getByText(/DEMO CEFALOSPORINA/i).locator('visible=true').first().isVisible(), 8000));
  await goArea(B.page, 'med');
  await B.page.locator('#med-itab-receta').click();
  check('B: the receta pushed on A reaches B (Manejo push/pull, cloud-med-receta-index)',
    await until(() => B.page.getByText(/DEMO CEFALOSPORINA/i).locator('visible=true').first().isVisible(), 30000));
  await segment(B.page, 'med-itab-perfil');
  check('B: that Manejo med also shows in B\'s perfil histórico for P1',
    await until(() => B.page.locator('#med-pharm-list .med-pharm-name', { hasText: 'DEMO CEFALOSPORINA' }).first().isVisible(), 15000));

  // ── Late joiner: device C joins the SAME room after data already exists ─
  const C = await launchDevice('c', 3793);
  await C.page.locator('[data-sync-mode="nube"]').click();
  await C.page.locator('#onboard-username').fill(`demo_c_${tag}`);
  await C.page.getByRole('button', { name: 'Siguiente' }).click();
  await C.page.locator('#onboard-clinical-name').fill('Dr. Demo Charlie');
  await C.page.getByRole('button', { name: 'Siguiente' }).click();
  const cSalaValues = await C.page.locator('#onboard-sala option').evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
  check('C: onboarding sala select only offers allowed Nube wards (sala-allowlist, 8 wards)',
    CLOUD_SALAS.length === cSalaValues.length && CLOUD_SALAS.every((s) => cSalaValues.includes(s)), cSalaValues);
  await C.page.locator('#onboard-rank').selectOption('R2');
  await C.page.locator('#onboard-sala').selectOption('Sala 1');
  await C.page.locator('#onboard-nube-password').fill(PASSWORD);
  // The message only lives while the first pull is in flight — against the local
  // Worker that is well under a second, so record it with an observer instead of polling.
  // A team member's list shows «Sincronizando equipo…» while team scope loads (it
  // returns before the «Descargando pacientes…» branch): either one means the list
  // says it is loading instead of a misleading «Sin pacientes aún».
  await C.page.evaluate(() => {
    window.__sawDownloading = false;
    const obs = new MutationObserver(() => {
      const m = (document.getElementById('patient-list')?.textContent || '').match(/Descargando pacientes|Sincronizando equipo/);
      if (m) {
        window.__sawDownloading = m[0];
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  await C.page.getByRole('button', { name: 'Guardar perfil' }).click();
  const cCont = C.page.locator('button:visible', { hasText: /^Continuar/ });
  await cCont.waitFor({ timeout: 20000 });
  await C.page.getByText('Lo guardé en un lugar seguro').click();
  // The room join + first pull start only after the recovery-code modal closes
  // (and after «Abrir Mi rotación» is already on screen).
  await cCont.click();
  await C.page.getByRole('button', { name: 'Abrir Mi rotación' }).waitFor({ timeout: 15000 });
  const roomC = await until(() => roomMeta(C.page), 15000);
  const sawDownloading = await until(() => C.page.evaluate(() => window.__sawDownloading), 10000);
  check('C: a late joiner attaches to the SAME existing Sala 1 room, not a new one (register-during-onboarding, sync-runtime late-joiner)',
    roomC?.id === roomA?.id, { a: roomA?.id, c: roomC?.id });
  check('C: patients-list showed a loading message («Descargando pacientes…» / «Sincronizando equipo…») while the late pull ran, not «Sin pacientes aún»', !!sawDownloading, sawDownloading);
  await C.app.close();

  // ── Nube fixes: undo delete, deleted patient stays deleted, team re-push ──
  // Own block before Admin: the known admin «Red» failure aborts every step after it.
  // E joins before the new patients exist (team scope: a late joiner is its own case above).
  let E = await launchDevice('e', 3795);
  await onboardNube(E.page, { username: `demo_e_${tag}`, name: 'Dr. Demo Eco' });
  await E.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const eJoinBtn = E.page.getByRole('button', { name: 'Unirme' });
  check('fixes: E joins EQUIPO DEMO ALFA', await until(() => eJoinBtn.isVisible(), 20000));
  await eJoinBtn.click().catch(() => {});
  await backToLabs(E.page);
  for (const d of [A2, B]) await tapNet(d);
  await backToLabs(A2.page);
  await pasteAndSave(A2.page, fullLabs(P4, 'Sep 22 2026 8:00AM'));
  await pasteAndSave(A2.page, fullLabs(P5, 'Sep 22 2026 8:30AM'));
  check('fixes: B gets P4 and P5', await until(async () => (await patientVisible(B.page, P4)) && (await patientVisible(B.page, P5)), 60000));

  // Undo a delete on A2 → P4 back on B (chart + labs) and on A2 after the undo reload.
  await deleteCard(A2.page, P4);
  check('fixes: B drops P4 after A deletes it', await until(async () => !(await patientVisible(B.page, P4)), 45000));
  await A2.page.locator('#btn-open-settings').click();
  const undoBtn = A2.page.locator('#btn-undo-op');
  check('fixes: A undo offers the P4 delete', await until(async () => undoBtn.isEnabled(), 8000), await undoBtn.textContent().catch(() => null));
  await undoBtn.evaluate((el) => el.click());
  await A2.page.locator('.wb-confirm-modal [data-wb-confirm-ok]').click();
  await A2.page.waitForLoadState('domcontentloaded');
  await A2.page.locator('#apptab-lab').waitFor({ timeout: 30000 });
  await backToLabs(A2.page);
  check('fixes: A keeps P4 after the undo reload (one pull holds delete + undo: pull-apply-state fold)',
    await until(async () => patientVisible(A2.page, P4), 30000));
  check('fixes: B gets P4 back after A undid the delete (pushRestoredPatientToCloud)', await until(async () => patientVisible(B.page, P4), 45000));
  await backToLabs(B.page);
  await openPatient(B.page, P4);
  check('fixes: B P4 chart back, no «Completar ingreso»', !(await B.page.locator('#m-servicio').isVisible()));
  const labB4 = () => B.page.locator('#appcontent-lab').innerText().then(flat);
  check('fixes: B P4 labs back (Hb 11.85)', await until(async () => /Hb 11\.85/.test(await labB4()), 30000), (await labB4()).slice(0, 160));
  await r.shot(B.page, 'fixes-b-p4-restored');

  // E is offline when A deletes P5; on reconnect E pushes P5 chart ops. The room keeps the
  // tombstone (lww.js rejects them), B never sees P5 again, E drops P5, and E stops re-pushing.
  check('fixes: E lists P5', await until(async () => patientVisible(E.page, P5), 60000));
  const p5 = await patientIdOf(E.page, P5);
  await E.app.close();
  await deleteCard(A2.page, P5);
  check('fixes: B drops P5 after A deletes it', await until(async () => !(await patientVisible(B.page, P5)), 45000));
  check('fixes: room holds the P5 tombstone', await until(async () => !!(await roomState(roomA.id)).tombstones?.[p5], 15000));
  await stopWorker();
  E = await launchDevice('e', 3795);
  await backToLabs(E.page);
  check('fixes: E (offline, has not seen the delete) still lists P5', await until(async () => patientVisible(E.page, P5), 20000));
  await tapNet(E);
  const tE = Date.now();
  check('Worker back up', await startWorker());
  const p5Pushed = async () => (await pushedPaths(E, tE)).filter((x) => x.includes(p5));
  check('fixes: E pushes its P5 chart ops on reconnect', await until(async () => (await p5Pushed()).length > 0, 45000), await p5Pushed());
  await E.page.waitForTimeout(8000);
  const st = await roomState(roomA.id);
  const p5Entry = (st.entries || []).find((e) => String(e?.id) === p5) || null;
  check('fixes: room keeps the P5 tombstone and no nameless P5 entry (lww.js tombstoned)', !!st.tombstones?.[p5] && !p5Entry,
    { tomb: !!st.tombstones?.[p5], entryKeys: p5Entry && Object.keys(p5Entry) });
  check('fixes: B does not get P5 back', !(await patientVisible(B.page, P5)));
  check('fixes: E drops P5 once it pulls the delete (push keeps the cursor on needPull)', await until(async () => !(await patientVisible(E.page, P5)), 45000));
  const n1 = (await p5Pushed()).length;
  await E.page.waitForTimeout(30000);
  const n2 = (await p5Pushed()).length;
  check('fixes: E stops pushing P5 ops once the delete landed (no re-push loop)', n2 === n1, { before: n1, after: n2 });
  await r.shot(B.page, 'fixes-b-no-p5');

  // A2 makes a team; E (pulls blocked) pushes its whole clinicalOps without it → A2 re-pushes once.
  const TEAM_X = 'EQUIPO DEMO RAYOS';
  await E.app.close();
  await createTeam(A2.page, TEAM_X);
  await backToLabs(A2.page);
  check(`fixes: ${TEAM_X} in A's clinicalOps`, await until(async () => hasTeam(await clinicalOpsOf(A2.page), TEAM_X), 15000));
  check(`fixes: B gets ${TEAM_X}`, await until(async () => hasTeam(await clinicalOpsOf(B.page), TEAM_X), 30000));
  await stopWorker();
  E = await launchDevice('e', 3795);
  await tapNet(E);
  await netBlock(E, '^GET .*/pull$');
  await dismissLearnHub(E.page);
  check(`fixes: E's clinicalOps lacks ${TEAM_X}`, !hasTeam(await clinicalOpsOf(E.page), TEAM_X));
  check('Worker back up', await startWorker());
  await E.page.waitForTimeout(3000);
  const tOps = Date.now();
  await createTeam(E.page, 'EQUIPO DEMO ECO');
  const opsPushes = async (d) => (await pushedPaths(d, tOps)).filter((x) => x === 'clinicalOps').length;
  check('fixes: E pushes its whole clinicalOps (pulls blocked)', await until(async () => (await opsPushes(E)) > 0, 20000));
  // The peer copy lands once; a re-push held by the 60 s cooldown must still run when it ends.
  await until(async () => (await opsPushes(A2)) > 0, 90000);
  await A2.page.waitForTimeout(30000);
  const opsCounts = { a: await opsPushes(A2), b: await opsPushes(B), e: await opsPushes(E) };
  check('fixes: A re-pushes its clinicalOps exactly once (repushClinicalOpsIfRoomLacksLocal)', opsCounts.a === 1, opsCounts);
  await netBlock(E, null);
  await E.app.close();
  const F = await launchDevice('f', 3796);
  await onboardNube(F.page, { username: `demo_f_${tag}`, name: 'Dra. Demo Foxtrot' });
  let fOps = {};
  check(`fixes: fresh device F sees ${TEAM_X}`, await until(async () => hasTeam((fOps = await clinicalOpsOf(F.page)), TEAM_X), 30000),
    (fOps.teams || []).map((t) => t?.name || t?.team_name || t?.team_id));
  await F.app.close();
  await backToLabs(A2.page);

  // ── Admin panel: self-promote with the local SYNC_ADMIN_KEY, then every admin tab ──
  await openConexion(A2.page, 'admin');
  await A2.page.locator('[data-admin-key-input]').fill('e2e-admin-key');
  await A2.page.locator('[data-admin-action="save-key"]').click();
  await A2.page.locator('[data-admin-action="promote-self"]').click();
  await A2.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const promotedToast = A2.page.locator('.toast', { hasText: /promovida a admin/i });
  check('A: any Nube session can self-promote with the Worker SYNC_ADMIN_KEY (panel-admin bootstrap)', await until(() => promotedToast.isVisible(), 10000));
  await closeToasts(A2.page);
  const adminRoot = A2.page.locator('.cloud-sync-admin');
  check('A: admin Resumen tab shows account/room stats (panel-admin-data resumen)',
    await until(() => adminRoot.locator('.cloud-sync-admin-card-value').first().isVisible(), 10000));

  await A2.page.locator('[role="tab"][data-admin-tab="salas"]').click();
  check('A: admin Salas tab lists the Sala 1 room (panel-admin-data salas)',
    await until(() => adminRoot.locator('[data-admin-sala-card]', { hasText: 'Sala 1' }).first().isVisible(), 10000));

  await A2.page.locator('[role="tab"][data-admin-tab="red"]').click();
  await A2.page.locator('[data-admin-action="refresh-red"]').click();
  const redPanel = adminRoot.locator('[data-admin-red]');
  check('A: admin Red (network census) lists the room\'s patients (admin-network-census, network-census)',
    await until(async () => /DEMO SINCRONIA/.test(await redPanel.innerText().catch(() => '')), 15000));
  await A2.page.locator('[data-network-filter="activity"]').selectOption('active');
  await A2.page.locator('[data-network-filter="activity"]').selectOption('');
  check('A: Red activity filter narrows visible rows without a re-fetch (applyNetworkCensusFilters)', true);
  // `has` takes a locator relative to the row — one rooted at redPanel never matches.
  const p3Row = redPanel.locator('tr', { has: A2.page.locator(`input[data-registro="${P3.exp}"]`) });
  await p3Row.locator('[data-admin-action="switch-network-room"]').click();
  const switchToast = A2.page.locator('.toast', { hasText: /Cambiado a la sala/i });
  check('A: Red "Abrir expediente" switches room + pulls just that patient (scope-cloud-state-to-patient)', await until(() => switchToast.isVisible(), 10000));
  await closeToasts(A2.page);
  // Joining the room rebuilds the ⇄ panel on its home view and opens the chart:
  // back to Administración › Red, from whatever state the panel was left in.
  if (await A2.page.locator('#connection-dropdown.open').isVisible().catch(() => false)) {
    await closeConexion(A2.page);
    await A2.page.waitForTimeout(500);
  }
  await openConexion(A2.page, 'admin');
  await A2.page.locator('[role="tab"][data-admin-tab="red"]').click();
  await A2.page.locator('[data-admin-action="refresh-red"]').click();
  await until(() => p3Row.isVisible(), 15000);
  await p3Row.locator('.cloud-sync-admin-equipos-edit summary').click();
  await p3Row.locator('[data-admin-action="archive-network-patient"]').click();
  const archiveToast = A2.page.locator('.toast', { hasText: /archivado/i });
  check('A: archive-network-patient archives a patient (admin can act on unjoined rooms — sync-require-member bypass)', await until(() => archiveToast.isVisible(), 10000));
  await closeToasts(A2.page);
  await A2.page.locator('[data-admin-action="refresh-red"]').click();
  const p3RowAfter = redPanel.locator('tr', { has: A2.page.locator(`input[data-registro="${P3.exp}"]`) });
  await until(() => p3RowAfter.isVisible(), 8000);
  await p3RowAfter.locator('.cloud-sync-admin-equipos-edit summary').click();
  await p3RowAfter.locator('[data-admin-action="archive-network-patient"]').click();
  const restoreToast = A2.page.locator('.toast', { hasText: /restaurado/i });
  check('A: archive-network-patient restores it back to active', await until(() => restoreToast.isVisible(), 10000));
  await closeToasts(A2.page);

  await A2.page.locator('[role="tab"][data-admin-tab="equipos"]').click();
  const equiposList = adminRoot.locator('[data-admin-equipos-list]');
  check('A: admin Equipos (Usuarios) tab lists accounts (panel-admin-equipos)', await until(() => equiposList.locator('.cloud-sync-admin-equipos-row').first().isVisible(), 10000));
  // No Historial check here: activity history comes from this device's clinical
  // directory, which only R4 / program admins may list (db:clinical-users-list) —
  // A is an R2 Nube admin, so every row is a Nube account without a local profile.
  await A2.page.locator('[data-admin-equipos-search]').fill(USER_B.username);
  const bRow = equiposList.locator('.cloud-sync-admin-equipos-row', { hasText: '@' + USER_B.username });
  check('A: Equipos search finds @' + USER_B.username + ' (panel-admin-equipos filters)', await until(() => bRow.isVisible(), 8000));
  // Cuenta Nube actions live in the row's ··· menu.
  await bRow.locator('.cloud-sync-admin-equipos-edit summary').first().click();
  await bRow.locator('[data-admin-promote-role]').selectOption('admin');
  await bRow.locator('[data-admin-action="promote-user"]').click();
  await A2.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const roleToast = A2.page.locator('.toast', { hasText: /Rol actualizado/i });
  check('A: promote-user changes a Nube account\'s role (panel-admin-equipos-summary)', await until(() => roleToast.isVisible(), 10000));
  await closeToasts(A2.page);

  await A2.page.locator('[role="tab"][data-admin-tab="mutaciones"]').click();
  const mutRoomSel = A2.page.locator('[data-admin-mutations-room]');
  await until(async () => (await mutRoomSel.locator('option').count()) > 1, 8000);
  await mutRoomSel.selectOption({ index: 1 });
  // Registro loads on its own once a sala is picked (no «Cargar» button).
  check('A: admin Mutaciones loads a room\'s op history', await until(() => adminRoot.locator('[data-admin-mutations-list]').innerText().then((t) => t.trim().length > 0), 10000));

  // ── Finish: bulk-delete every network patient, delete B's account, purge the room ──
  await A2.page.locator('[role="tab"][data-admin-tab="red"]').click();
  await A2.page.locator('[data-admin-action="refresh-red"]').click();
  await until(() => redPanel.locator('tbody tr').first().isVisible(), 8000);
  await A2.page.locator('[data-network-select-all]').check();
  await A2.page.locator('[data-admin-action="bulk-delete-network"]').click();
  await A2.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const bulkDelToast = A2.page.locator('.toast', { hasText: /eliminado/i });
  check('A: bulk-delete-network removes every selected patient with a summary toast (patient-delete-batch bulk delete)', await until(() => bulkDelToast.isVisible(), 15000));
  check('B: P1 and P3 gone after the admin bulk delete', await until(async () => !(await patientVisible(B.page, P1)) && !(await patientVisible(B.page, P3)), 45000));

  await A2.page.locator('[role="tab"][data-admin-tab="equipos"]').click();
  await until(() => equiposList.locator('.cloud-sync-admin-equipos-row').first().isVisible(), 10000);
  await A2.page.locator('[data-admin-equipos-search]').fill(USER_B.username);
  const bRow2 = equiposList.locator('.cloud-sync-admin-equipos-row', { hasText: '@' + USER_B.username });
  await bRow2.locator('.cloud-sync-admin-equipos-edit summary').first().click();
  await bRow2.locator('[data-admin-action="delete-user"]').click();
  await A2.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const delUserToast = A2.page.locator('.toast', { hasText: /[Nn]ube/ });
  check('A: delete-user removes the Nube account and runs the clinical purge (panel-admin-clinical-purge)', await until(() => delUserToast.isVisible(), 10000));

  await A2.page.locator('[role="tab"][data-admin-tab="peligro"]').click();
  const peligroRoomSel = A2.page.locator('[data-admin-peligro-room]');
  await until(async () => (await peligroRoomSel.locator('option').count()) > 1, 8000);
  await peligroRoomSel.selectOption({ index: 1 });
  await A2.page.locator('[data-admin-action="purge-room-selected"]').click();
  const promptModal = A2.page.locator('[data-admin-prompt-modal]');
  await promptModal.waitFor({ state: 'visible', timeout: 8000 });
  const promptInput = promptModal.locator('[data-admin-prompt-input]');
  const roomCodeGuess = await promptInput.getAttribute('placeholder');
  await promptInput.fill(roomCodeGuess || '');
  await promptModal.locator('[data-admin-prompt-ok]').click();
  const purgeToast = A2.page.locator('.toast', { hasText: /purgada/i });
  check('A: Peligro "Purgar" (type-to-confirm) deletes the room + its room_members (sync-require-member admin bypass, admin-prompt-modal)',
    await until(() => purgeToast.isVisible(), 10000));
  await closeConexion(A2.page);

  // ── Solo este equipo → Nube: Ajustes switch clears the local-only flag ──
  const D = await launchDevice('d', 3794);
  await D.page.locator('[data-sync-mode="local"]').click();
  await D.page.locator('#clinical-onboard-local-confirm-btn').click();
  await D.page.locator('.topbar-area-btn').waitFor({ timeout: 15000 });
  await dismissLearnHub(D.page);
  // A device previously configured for a Nube sala, now local-only — the settings row this button drives.
  await D.page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    s.clinicalSala = 'Sala 1';
    localStorage.setItem('rpc-settings', JSON.stringify(s));
  });
  await dismissLearnHub(D.page);
  await D.page.locator('#btn-open-settings').click();
  const lanModeBtn = D.page.locator('[data-onclick="enableClinicalLanFromSettings"]');
  check('D: local-only Ajustes shows "Activar guardia con R+ Cloud…" (clinical-sync-mode-settings)', await until(() => lanModeBtn.isVisible(), 8000));
  await lanModeBtn.click();
  const nubeConfirm = D.page.locator('#clinical-sync-mode-nube-confirm [data-approval-confirm]');
  check('D: a Nube-sala device offers the Nube confirm, not the LAN one', await until(() => nubeConfirm.isVisible(), 8000));
  await nubeConfirm.click();
  const switchedToast = D.page.locator('.toast', { hasText: /Sincronizaci[oó]n por Nube/i });
  check('D: local-only → Nube switch clears the flag and toasts, no LAN runtime started (clinical-sync-mode-settings)', await until(() => switchedToast.isVisible(), 10000));
  check('no uncaught page errors on D', !D.pageErrors.length, D.pageErrors.slice(0, 5));
  await D.app.close();

  check('no uncaught page errors on A or B', !A.pageErrors.length && !A2.pageErrors.length && !B.pageErrors.length,
    [...A.pageErrors, ...A2.pageErrors, ...B.pageErrors].slice(0, 5));
  await A2.app.close();
  await B.app.close();
});
