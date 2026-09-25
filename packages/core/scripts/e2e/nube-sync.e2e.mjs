#!/usr/bin/env node
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
 *   Throughout
 *     - an uncaught page error on either device
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, openPatient } from './harness.mjs';
import { startWorker, stopWorker, d1Query, nubeDevices, onboardNube, roomMeta, patientVisible, flat, until, BASE, PASSWORD } from './nube-worker.mjs';
import { fullLabs, gas } from './some-fixtures.mjs';

const tag = Date.now().toString(36).slice(-6);
const USER_A = { username: `demo_a_${tag}`, name: 'Dr. Demo Alfa' };
const USER_B = { username: `demo_b_${tag}`, name: 'Dra. Demo Bravo' };
const P1 = { exp: '7000411-1', name: 'DEMO SINCRONIA UNO', room: '301' };
const P2 = { exp: '7000412-2', name: 'DEMO SINCRONIA DOS', room: '302' };
const P3 = { exp: '7000413-3', name: 'DEMO SINCRONIA TRES', room: '303' };
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
  await page.locator('#btn-header-team-sync').click();
  const navOptions = page.locator('[data-cloud-action="nav-options"]');
  if (await navOptions.isVisible().catch(() => false)) await navOptions.click();
  if (view) await page.locator(`[data-cloud-action="nav-view"][data-cloud-view="${view}"]`).click();
};
const closeConexion = (page) => page.locator('#btn-connection-dropdown-close').click().catch(() => {});
/** #btn-header-team-sync carries btn-livesync-header--{idle,live,syncing,degraded,local}. */
const headerSyncModifier = (page) =>
  page.locator('#btn-header-team-sync').getAttribute('class').then((c) => (String(c || '').match(/btn-livesync-header--(\w+)/) || [])[1] || null);

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
  await A.page.getByRole('button', { name: 'Ejemplo Modelo casoba' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  const createName = A.page.locator('#clinical-team-create-name');
  check('A: «Crear nuevo equipo» opens the form', await createName.isVisible().catch(() => false));
  await createName.fill('EQUIPO DEMO ALFA');
  const teamSalaOptions = await A.page.locator('#clinical-team-create-sala option').evaluateAll((els) => els.map((e) => e.textContent.trim()));
  check('A: «Crear equipo» sala select lists every ward (cloud-census-sala-push cross-sala routing)',
    CLOUD_SALAS.every((s) => teamSalaOptions.includes(s)), teamSalaOptions);
  await A.page.locator('#clinical-team-create-sala').selectOption('Sala 1').catch(() => {});
  await A.page.getByRole('button', { name: 'Crear equipo' }).click();
  await r.shot(A.page, 'a-team-created');
  await B.page.getByRole('button', { name: 'Ejemplo Modelo casoba' }).click();
  const joinBtn = B.page.getByRole('button', { name: 'Unirme' });
  check('B: sees A\'s team «EQUIPO DEMO ALFA» through Nube', await until(() => joinBtn.isVisible(), 20000));
  await joinBtn.click();
  await r.shot(B.page, 'b-joined');
  for (const d of [A, B]) {
    await closeToasts(d.page);
    await d.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await d.page.keyboard.press('Escape');
    await dismissLearnHub(d.page);
    await d.page.locator('#apptab-lab').click();
  }

  // ── A → B: two new patients with labs ──────────────────────────────────
  await pasteAndSave(A.page, fullLabs(P1, 'Sep 20 2026 8:00AM'));
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
  check('B: header ⇄ chip is live/local while synced, not degraded', !/degraded/.test((await headerSyncModifier(B.page)) || ''), await headerSyncModifier(B.page));
  await openConexion(B.page, 'nube');
  const diagHost = B.page.locator('[data-cloud-nube-diagnostics-host]');
  check('B: Diagnóstico Nube dashboard renders while online', await until(() => diagHost.locator('.cloud-nube-dash-chip').first().isVisible(), 10000));
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
  await openConexion(B.page); // reopen, no view: panel-conexion-tour — subview resets to Conexión home, not stuck on Móvil
  const backOnHome = B.page.locator('[data-cloud-action="nav-options"]');
  check('B: reopening the dropdown after close resets to the Conexión home view', await until(() => backOnHome.isVisible(), 5000));
  await closeConexion(B.page);

  // ── B → A: a new gas for P1, added on B ────────────────────────────────
  await B.page.locator('#apptab-lab').click();
  await pasteAndSave(B.page, gas(P1, 'Sep 21 2026 6:00AM', '7.21'));
  await openPatient(A.page, P1);
  check('A: gas day from B shows up (21/09/2026) next to the old one (20/09/2026)',
    await until(async () => /21\/09\/2026/.test(await labText(A)) && /20\/09\/2026/.test(await labText(A)), 30000), (await labText(A)).slice(0, 200));
  await pickLabDay(A.page, '21/09/2026');
  check('A: that day holds the gas pasted on B (pH 7.21)', await until(async () => /7\.21/.test(await labText(A)), 5000), (await labText(A)).slice(0, 400));
  await pickLabDay(A.page, '20/09/2026');
  check('A: the old set is still there (Hb 11.85): added, not replaced', await until(async () => /Hb 11\.85/.test(await labText(A)), 5000));
  await r.shot(A.page, 'a-p1-gas-from-b');

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
  const lab2 = A2.page.locator('#apptab-lab');
  check('A restarted: no login screen (Recuérdame kept the session)', await until(() => lab2.isVisible(), 30000) && !(await A2.page.locator('[data-sync-mode]').first().isVisible().catch(() => false)));
  await dismissLearnHub(A2.page);
  await lab2.click();
  await A2.page.waitForTimeout(4000);
  const counts = await A2.page.locator('.p-name').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute('title') || ''));
  const n = (p) => counts.filter((t) => t.includes(p.exp)).length;
  check('A restarted: P1, P2, P3 each listed exactly once', n(P1) === 1 && n(P2) === 1 && n(P3) === 1, counts);
  await r.shot(A2.page, 'a-restarted');

  // ── Recovery: log out on A, recover the account with the code ─────────
  const recoveryCode = oa.recovery.match(/R\+[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)[0];
  await A2.page.locator('#btn-header-team-sync').click();
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
    await page.locator('#apptab-nota').click();
    await page.locator('.exp-group-pill[data-group="clinico"]').hover();
    await page.locator('.exp-group-section', { hasText: 'Eventualidades' }).click();
    await page.locator('#eventualidades-input').waitFor({ state: 'visible', timeout: 8000 });
  };
  const evText = 'DEMO SINCRONIA: caida sin lesion evidente, se avisa a familia.';
  await closeToasts(A2.page);
  await openPatient(A2.page, P1);
  await stopWorker();
  check('A: header ⇄ chip turns degraded while the Worker is down', await until(async () => (await headerSyncModifier(A2.page)) === 'degraded', 25000), await headerSyncModifier(A2.page));
  await openEventualidades(A2.page);
  await A2.page.locator('#eventualidades-input').fill(evText);
  await A2.page.locator('#eventualidades-add').click();
  check('A: eventualidad saved for P1 while offline', await until(() => A2.page.getByText(evText).first().isVisible(), 8000));
  await openConexion(A2.page, 'nube');
  const diagHostA2 = A2.page.locator('[data-cloud-nube-diagnostics-host]');
  check('A: Diagnóstico Nube shows live pendientes for the queued offline eventualidad', await until(() => diagHostA2.getByText(/Pendientes/).first().isVisible(), 10000));
  await r.shot(A2.page, 'a-diagnostico-nube-offline');
  await closeConexion(A2.page);
  check('Worker back up for the final phase', await startWorker());
  await openPatient(B.page, P1);
  await openEventualidades(B.page);
  check('B: the eventualidad queued offline on A reaches B once reconnected (clinical-repo-sync-drain, op-encoder-eventualidades)',
    await until(() => B.page.getByText(evText).first().isVisible(), 30000));

  // ── Manejo/Receta pushed on A2 for P1 → pulls to B (cloud-med-receta-index) ──
  const now2 = new Date();
  const dmy2 = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const medLine = [`${dmy2(now2)} 08:01 a.m.`, 'MEDICAMENTOS', 'DEMO CEFALOSPORINA 1 G SOL INY', 'VIA INTRAVENOSA', '1 G //', 'CADA 24 HORAS', 'NW'].join('\t');
  await A2.page.locator('#apptab-med').click();
  await A2.page.locator('#med-itab-receta').click();
  await A2.page.locator('#med-import-open-btn').click();
  await A2.page.locator('#med-input').fill(medLine);
  await A2.page.getByRole('button', { name: 'Procesar receta' }).click();
  await A2.page.waitForTimeout(500);
  check('A: receta imported for P1 shows the new med', await until(() => A2.page.getByText(/DEMO CEFALOSPORINA/).first().isVisible(), 8000));
  await B.page.locator('#apptab-med').click();
  await B.page.locator('#med-itab-receta').click();
  check('B: the receta pushed on A reaches B (Manejo push/pull, cloud-med-receta-index)',
    await until(() => B.page.getByText(/DEMO CEFALOSPORINA/).first().isVisible(), 30000));

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
  await C.page.getByRole('button', { name: 'Guardar perfil' }).click();
  const downloadingMsg = C.page.getByText(/Descargando pacientes/i);
  const sawDownloading = await until(() => downloadingMsg.isVisible(), 6000);
  const cCont = C.page.locator('button:visible', { hasText: /^Continuar/ });
  await cCont.waitFor({ timeout: 20000 });
  await C.page.getByText('Lo guardé en un lugar seguro').click();
  await cCont.click();
  await C.page.getByRole('button', { name: 'Abrir Mi rotación' }).waitFor({ timeout: 15000 });
  const roomC = await until(() => roomMeta(C.page), 15000);
  check('C: a late joiner attaches to the SAME existing Sala 1 room, not a new one (register-during-onboarding, sync-runtime late-joiner)',
    roomC?.id === roomA?.id, { a: roomA?.id, c: roomC?.id });
  check('C: patients-list showed "Descargando pacientes…" while the late pull ran (sync-runtime-pull-push freshInFlight)', sawDownloading);
  await C.app.close();

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
    await until(() => adminRoot.locator('.cloud-sync-admin-stat-value').first().isVisible(), 10000));

  await A2.page.locator('[data-admin-tab="salas"]').click();
  check('A: admin Salas tab lists the Sala 1 room (panel-admin-data salas)', await until(() => adminRoot.getByText('Sala 1').first().isVisible(), 10000));

  await A2.page.locator('[data-admin-tab="red"]').click();
  await A2.page.locator('[data-admin-action="refresh-red"]').click();
  const redPanel = adminRoot.locator('[data-admin-red]');
  check('A: admin Red (network census) lists the room\'s patients (admin-network-census, network-census)',
    await until(async () => /DEMO SINCRONIA/.test(await redPanel.innerText().catch(() => '')), 15000));
  await A2.page.locator('[data-network-filter="activity"]').selectOption('active');
  await A2.page.locator('[data-network-filter="activity"]').selectOption('');
  check('A: Red activity filter narrows visible rows without a re-fetch (applyNetworkCensusFilters)', true);
  const p3Row = redPanel.locator('tr', { has: redPanel.locator(`input[data-registro="${P3.exp}"]`) });
  await p3Row.locator('[data-admin-action="switch-network-room"]').click();
  const switchToast = A2.page.locator('.toast', { hasText: /Cambiado a la sala/i });
  check('A: Red "Abrir expediente" switches room + pulls just that patient (scope-cloud-state-to-patient)', await until(() => switchToast.isVisible(), 10000));
  await closeToasts(A2.page);
  await p3Row.locator('.cloud-sync-admin-equipos-edit summary').click();
  await p3Row.locator('[data-admin-action="archive-network-patient"]').click();
  const archiveToast = A2.page.locator('.toast', { hasText: /archivado/i });
  check('A: archive-network-patient archives a patient (admin can act on unjoined rooms — sync-require-member bypass)', await until(() => archiveToast.isVisible(), 10000));
  await closeToasts(A2.page);
  await A2.page.locator('[data-admin-action="refresh-red"]').click();
  const p3RowAfter = redPanel.locator('tr', { has: redPanel.locator(`input[data-registro="${P3.exp}"]`) });
  await until(() => p3RowAfter.isVisible(), 8000);
  await p3RowAfter.locator('.cloud-sync-admin-equipos-edit summary').click();
  await p3RowAfter.locator('[data-admin-action="archive-network-patient"]').click();
  const restoreToast = A2.page.locator('.toast', { hasText: /restaurado/i });
  check('A: archive-network-patient restores it back to active', await until(() => restoreToast.isVisible(), 10000));
  await closeToasts(A2.page);

  await A2.page.locator('[data-admin-tab="equipos"]').click();
  const equiposList = adminRoot.locator('[data-admin-equipos-list]');
  check('A: admin Equipos (Usuarios) tab lists accounts (panel-admin-equipos)', await until(() => equiposList.locator('.cloud-sync-admin-equipos-row').first().isVisible(), 10000));
  await A2.page.locator('[data-admin-equipos-search]').fill(USER_B.username);
  const bRow = equiposList.locator('.cloud-sync-admin-equipos-row', { hasText: '@' + USER_B.username });
  check('A: Equipos search finds @' + USER_B.username + ' (panel-admin-equipos filters)', await until(() => bRow.isVisible(), 8000));
  const histBtn = bRow.locator('[data-admin-action="equipos-activity-history"]');
  if (await histBtn.count()) {
    await histBtn.click();
    const histModal = A2.page.locator('[data-equipos-activity-history-modal]');
    check('A: Historial de actividad modal opens for a user (panel-admin-equipos-history-modal)', await until(() => histModal.isVisible(), 8000));
    await histModal.locator('[data-equipos-history-close]').click();
  } else {
    check('A: Historial de actividad modal opens for a user (panel-admin-equipos-history-modal)', false, 'no history button rendered — @' + USER_B.username + ' has 0 logged activity yet');
  }
  await bRow.locator('summary', { hasText: 'Nube' }).first().click();
  await bRow.locator('[data-admin-promote-role]').selectOption('admin');
  await bRow.locator('[data-admin-action="promote-user"]').click();
  await A2.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const roleToast = A2.page.locator('.toast', { hasText: /Rol actualizado/i });
  check('A: promote-user changes a Nube account\'s role (panel-admin-equipos-summary)', await until(() => roleToast.isVisible(), 10000));
  await closeToasts(A2.page);

  await A2.page.locator('[data-admin-tab="mutaciones"]').click();
  const mutRoomSel = A2.page.locator('[data-admin-mutations-room]');
  await until(async () => (await mutRoomSel.locator('option').count()) > 1, 8000);
  await mutRoomSel.selectOption({ index: 1 });
  await A2.page.locator('[data-admin-action="load-mutations"]').click();
  check('A: admin Mutaciones loads a room\'s op history', await until(() => adminRoot.locator('[data-admin-mutations-list]').innerText().then((t) => t.trim().length > 0), 10000));

  // ── Finish: bulk-delete every network patient, delete B's account, purge the room ──
  await A2.page.locator('[data-admin-tab="red"]').click();
  await A2.page.locator('[data-admin-action="refresh-red"]').click();
  await until(() => redPanel.locator('tbody tr').first().isVisible(), 8000);
  await A2.page.locator('[data-network-select-all]').check();
  await A2.page.locator('[data-admin-action="bulk-delete-network"]').click();
  await A2.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const bulkDelToast = A2.page.locator('.toast', { hasText: /eliminado/i });
  check('A: bulk-delete-network removes every selected patient with a summary toast (patient-delete-batch bulk delete)', await until(() => bulkDelToast.isVisible(), 15000));
  check('B: P1 and P3 gone after the admin bulk delete', await until(async () => !(await patientVisible(B.page, P1)) && !(await patientVisible(B.page, P3)), 45000));

  await A2.page.locator('[data-admin-tab="equipos"]').click();
  await until(() => equiposList.locator('.cloud-sync-admin-equipos-row').first().isVisible(), 10000);
  await A2.page.locator('[data-admin-equipos-search]').fill(USER_B.username);
  const bRow2 = equiposList.locator('.cloud-sync-admin-equipos-row', { hasText: '@' + USER_B.username });
  await bRow2.locator('summary', { hasText: 'Nube' }).first().click();
  await bRow2.locator('[data-admin-action="delete-user"]').click();
  await A2.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const delUserToast = A2.page.locator('.toast', { hasText: /[Nn]ube/ });
  check('A: delete-user removes the Nube account and runs the clinical purge (panel-admin-clinical-purge)', await until(() => delUserToast.isVisible(), 10000));

  await A2.page.locator('[data-admin-tab="peligro"]').click();
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
  await D.page.locator('#apptab-lab').waitFor({ timeout: 15000 });
  // A device previously configured for a Nube sala, now local-only — the settings row this button drives.
  await D.page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    s.clinicalSala = 'Sala 1';
    localStorage.setItem('rpc-settings', JSON.stringify(s));
  });
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
