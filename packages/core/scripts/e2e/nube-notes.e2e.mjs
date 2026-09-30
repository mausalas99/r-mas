#!/usr/bin/env node
/* global document */
/**
 * E2E: Nota de evolución + Indicaciones sync between two desktop devices through
 * Nube, driven through the real Electron app against a LOCAL copy of the real sync
 * Worker (`wrangler dev --local`, fresh D1 per run). Never touches the real Worker.
 * Synthetic DEMO patient and made-up expediente only. Last write wins by updatedAt.
 *
 * Ways it can go wrong (each one is a check below):
 *   A → B
 *     - a note or indicaciones typed on A never reaches B (never pushed: no clock)
 *   Both edit (last write wins)
 *     - B edits after it pulled A's note, and A keeps its older text
 *     - a field B did not touch is lost when A's newer edit arrives
 *   Server
 *     - the Worker stores the note text readable
 *   Restart
 *     - B restarts and the note is gone or empty (a partial pull wipes it)
 *   Too big
 *     - a note over 96 KB is cut down and sent anyway, or blocks the small notes,
 *       or the Conexión sheet does not say why it stays on this device
 *   Throughout
 *     - an uncaught page error on either device
 *
 * Artifact: e2e-artifacts/nube-notes/<run-id>/ (report.json, screenshots).
 *
 *   npm run e2e:nube-notes
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, openPatient, goArea, waitForBoot } from './harness.mjs';
import { startWorker, nubeDevices, onboardNube, d1Query, patientVisible, until, BASE, openNubePanel } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';

// STAGING_URL=https://rplus-sync-staging.<acct>.workers.dev runs the same scenario on staging (never live).
const STAGING = String(process.env.STAGING_URL || '').replace(/\/$/, '');
if (STAGING && !/staging/i.test(STAGING)) { console.error('STAGING_URL host must contain "staging".'); process.exit(1); }
if (STAGING) process.env.R_PLUS_CLOUD_SYNC_URL = STAGING;
const SALA = STAGING ? process.env.STAGING_SALA || 'Torre HU' : 'Sala 1';

const tag = Date.now().toString(36).slice(-6);
const USER_A = { username: `demo_na_${tag}`, name: 'Dr. Demo Notas Alfa', ...(STAGING ? { sala: SALA } : {}) };
const USER_B = { username: `demo_nb_${tag}`, name: 'Dra. Demo Notas Bravo', ...(STAGING ? { sala: SALA } : {}) };
// A fresh expediente per run: staging rooms keep earlier runs' patients.
const P1 = { exp: `8${String(Date.now()).slice(-6)}-1`, name: 'DEMO NOTAS UNO', room: '311' };
const TEAM = `EQUIPO DEMO NOTAS ${tag.toUpperCase()}`; // the app upper-cases team names
const NOTE_A = 'DEMO EVOLUCION ESCRITA EN A';
const NOTE_B = 'DEMO EVOLUCION CORREGIDA EN B';
const INTERROG = 'DEMO INTERROGATORIO SOLO DE A';
const DIETA_A = 'DEMO DIETA BLANDA DE A';
const MED_A = 'DEMO PARACETAMOL DE A';
const CUID_A = 'DEMO CUIDADOS DE A';


const r = createRun('nube-notes');
const { check } = r;
const launchDevice = nubeDevices(r);

/** Header mode switch: notes and indicaciones live in Interconsulta. */
async function setMode(page, mode) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const btn = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
  await btn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await btn.click();
  await page.waitForTimeout(600);
  await closeToasts(page);
}

/** Interconsulta has no side list: Resumen › «← Tablero», then the patient's card on the board. */
async function pickPatient(page, p) {
  await waitForBoot(page);
  await closeToasts(page);
  const board = page.locator('#ic-board-mount');
  if (!(await board.isVisible())) {
    await goArea(page, 'nota');
    await board.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  }
  if (!(await board.isVisible())) {
    await page.locator('.exp-group-pill[data-group="paciente"]').click();
    await page.locator('[data-ic-back-to-board]').click();
  }
  await board.locator('.p-name').first().waitFor({ state: 'visible' });
  await openPatient(page, p);
}

/** Interconsulta › Clínico › section ('notas' | 'indica'). */
async function goClinico(page, section) {
  await closeToasts(page);
  await goArea(page, 'nota');
  const sec = page.locator(`.exp-group-section[data-section="${section}"]`);
  await page.locator('.exp-group-pill[data-group="clinico"]').hover({ timeout: 5000 }).catch(() => {});
  await sec.click();
  await page.locator(section === 'notas' ? '#btn-gen' : '#btn-gen-ind').waitFor({ state: 'visible' });
}

const noteField = (page, arg) => page.locator(`#note-form [data-oninput-args='["${arg}"]']`);
const indField = (page, arg) => page.locator(`#indica-form [data-oninput-args='["${arg}"]']`);
const noteValue = async (page, arg) => {
  await goClinico(page, 'notas');
  return noteField(page, arg).inputValue().catch(() => '');
};
const indValue = async (page, arg) => {
  await goClinico(page, 'indica');
  return indField(page, arg).inputValue().catch(() => '');
};
/** Blur like a real click away, so the value commits and the pull may repaint. */
const settle = (page) => page.evaluate(() => document.activeElement?.blur?.()).then(() => page.waitForTimeout(400));

await r.finish('Nube notes: nota + indicaciones sync, last write wins, restart, over 96 KB', async () => {
  check(STAGING ? 'staging Worker answers /ping' : 'local Worker answers /ping', STAGING ? (await fetch(`${STAGING}/api/sync/v1/ping`)).ok : await startWorker(), STAGING || BASE);

  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, USER_A);
  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, USER_B);

  // Same team, so B receives A's patient.
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill(TEAM);
  await A.page.locator('#clinical-team-create-sala').selectOption(SALA).catch(() => {});
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();
  if (STAGING) await B.page.waitForTimeout(10000); // A's team takes a moment to publish on staging
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  // Staging keeps teams from earlier runs: join this run's team only.
  const joinBtn = B.page.locator('div:has(.clinical-teams-join-btn)', { hasText: TEAM }).last().locator('.clinical-teams-join-btn').first();
  check('B: sees A\'s team through Nube', await until(() => joinBtn.isVisible(), 20000));
  await joinBtn.click();
  for (const d of [A, B]) {
    await closeToasts(d.page);
    await d.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await d.page.keyboard.press('Escape');
    await dismissLearnHub(d.page);
    await goArea(d.page, 'lab');
  }

  await pasteAndSave(A.page, fullLabs(P1, 'Sep 29 2026 8:00AM'));
  await openPatient(A.page, P1);
  check('B: P1 arrives', await until(() => patientVisible(B.page, P1), STAGING ? 120000 : 45000));
  await openPatient(B.page, P1);
  await setMode(A.page, 'interconsulta');
  await setMode(B.page, 'interconsulta');
  await pickPatient(A.page, P1);
  await pickPatient(B.page, P1);

  // B opens Indicaciones first: it makes its own empty doc (no edit clock) and sits there.
  await goClinico(B.page, 'indica');
  await indField(B.page, 'dieta').waitFor({ state: 'visible' });

  // ── A writes a note + indicaciones → B sees them ───────────────────────
  await goClinico(A.page, 'notas');
  await noteField(A.page, 'evolucion').fill(NOTE_A);
  await noteField(A.page, 'interrogatorio').fill(INTERROG);
  await settle(A.page);
  await goClinico(A.page, 'indica');
  await indField(A.page, 'dieta').fill(DIETA_A);
  await settle(A.page);
  await r.shot(A.page, 'a-wrote');
  // B still sits on Indicaciones: no click, the pull must repaint it.
  let seen = {};
  const indOnScreen = await until(async () => (await indField(B.page, 'dieta').inputValue().catch(() => '')) === DIETA_A, STAGING ? 100000 : 30000, 1000);
  check('B: indicaciones repaint while B sits on that tab (no click)', indOnScreen);
  // Sit on the tab like a user: no clicks while waiting, the pull must repaint it.
  await goClinico(B.page, 'notas');
  const arrived = await until(async () => {
    seen = { evolucion: await noteField(B.page, 'evolucion').inputValue().catch(() => '') };
    return seen.evolucion === NOTE_A;
  }, 60000, 1000);
  // indicaciones is its own op: it can land a poll after the note.
  await until(async () => (seen.dieta = await indValue(B.page, 'dieta')) === DIETA_A, STAGING ? 100000 : 30000, 1500);
  const arrivedAll = arrived && seen.dieta === DIETA_A;
  check('B: the note and the indicaciones written on A arrive', arrivedAll, seen);
  await r.shot(B.page, 'b-received');
  check('B: Nota then Indicaciones shows the dieta', (await indValue(B.page, 'dieta')) === DIETA_A);

  // B keeps tapping the Indicaciones tab it is already on (every tap cancels a pending repaint)
  // while A adds medicamentos: the new text must still reach the screen.
  await goClinico(A.page, 'indica');
  await indField(A.page, 'medicamentos').fill(MED_A);
  await settle(A.page);
  await B.page.evaluate(() => {
    window.__tapInd = setInterval(() => document.querySelector('.exp-group-section[data-section="indica"]')?.click(), 100);
  });
  const medOnScreen = await until(async () => (await indField(B.page, 'medicamentos').inputValue().catch(() => '')) === MED_A, STAGING ? 100000 : 30000, 1000);
  await B.page.evaluate(() => clearInterval(window.__tapInd));
  check('B: indicaciones repaint while B keeps tapping the same tab', medOnScreen);

  // B has a field open (focused) when A's edit lands: no repaint under the cursor, but once B
  // leaves the field the new text must show without any tab click.
  await goClinico(B.page, 'indica');
  await indField(B.page, 'medicos').click();
  await goClinico(A.page, 'indica');
  await indField(A.page, 'cuidados').fill(CUID_A);
  await settle(A.page);
  await B.page.waitForTimeout(STAGING ? 30000 : 12000); // let the pull land while the field is open
  await settle(B.page);
  const cuidOnScreen = await until(async () => (await indField(B.page, 'cuidados').inputValue().catch(() => '')) === CUID_A, STAGING ? 100000 : 30000, 1000);
  check('B: indicaciones repaint once B leaves a focused field (no click)', cuidOnScreen);

  // ── B edits later → A ends with B's text (last write wins) ─────────────
  await goClinico(B.page, 'notas');
  await noteField(B.page, 'evolucion').fill(NOTE_B);
  await settle(B.page);
  let onA = {};
  await goClinico(A.page, 'notas');
  const won = await until(async () => {
    onA = {
      evolucion: await noteField(A.page, 'evolucion').inputValue().catch(() => ''),
      interrogatorio: await noteField(A.page, 'interrogatorio').inputValue().catch(() => ''),
    };
    return onA.evolucion === NOTE_B;
  }, 60000, 1000);
  check('A: B\'s later edit replaces A\'s older text (last write wins)', won, onA);
  check('A: the whole note came over, B\'s copy still holds A\'s interrogatorio', onA.interrogatorio === INTERROG, onA);
  await r.shot(A.page, 'a-after-b-edit');

  // ── The Worker never holds the text readable ──────────────────────────
  if (!STAGING) {
    const dump = d1Query('SELECT * FROM room_state; SELECT * FROM mutations;');
    const leaks = [NOTE_A, NOTE_B, INTERROG, DIETA_A].filter((w) => dump.includes(w));
    check('Worker: no note or indicaciones text stored readable', leaks.length === 0, leaks);
  }

  // ── Restart B: the note stays after the first pull ─────────────────────
  await B.app.close();
  const B2 = await launchDevice('b', 3792);
  await until(() => B2.page.locator('.topbar-area-btn').isVisible(), 30000);
  await dismissLearnHub(B2.page);
  await B2.page.waitForTimeout(6000); // first pull after boot: a partial payload must not wipe the note
  if (!(await B2.page.locator('#ic-board-mount').isVisible().catch(() => false))) await setMode(B2.page, 'interconsulta');
  await pickPatient(B2.page, P1);
  const afterRestart = { evolucion: await noteValue(B2.page, 'evolucion'), interrogatorio: await noteValue(B2.page, 'interrogatorio'), dieta: await indValue(B2.page, 'dieta') };
  check('B restarted: note, interrogatorio and indicaciones are all still there',
    afterRestart.evolucion === NOTE_B && afterRestart.interrogatorio === INTERROG && afterRestart.dieta === DIETA_A, afterRestart);

  // ── Over 96 KB: stays on A, says why, small notes keep syncing ────────
  await goClinico(A.page, 'notas');
  await noteField(A.page, 'interrogatorio').fill('x'.repeat(100 * 1024));
  await settle(A.page);
  await A.page.waitForTimeout(3000);
  await noteField(A.page, 'evolucion').fill(`${NOTE_B} 2`);
  await settle(A.page);
  await openNubePanel(A.page);
  const sheet = await A.page.locator('.cloud-sync-hero').first().innerText().catch(() => '');
  check('A: Conexión says «Pendiente» with the 96 KB reason', /Pendiente/.test(sheet) && /96 KB/.test(sheet), sheet.slice(0, 300));
  await A.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  const b2Interrog = await noteValue(B2.page, 'interrogatorio');
  check('B: the oversize note was not sent cut down (B keeps the earlier interrogatorio)', b2Interrog === INTERROG, b2Interrog.length);

  check('no uncaught page errors on A or B', !A.pageErrors.length && !B.pageErrors.length && !B2.pageErrors.length,
    [...A.pageErrors, ...B.pageErrors, ...B2.pageErrors].slice(0, 5));
  await A.app.close();
  await B2.app.close();
});
