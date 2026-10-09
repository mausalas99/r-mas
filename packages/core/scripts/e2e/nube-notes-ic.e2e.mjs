/* global document, URL, location */
/**
 * E2E: interconsulta teammates over Nube. A (sala Interconsultas) types an
 * Estado actual registro, a nota evolución and an indicación dieta on a
 * synthetic DEMO patient; B (sala Interconsultas, same team) must receive all
 * three. Estado actual is the control: if it does not arrive, the notes
 * cannot be expected to either.
 *
 * Copy of the A→B part of nube-notes.e2e.mjs, with sala 'Interconsultas' set on
 * both users. Local Worker only (no STAGING).
 *
 * Artifact: e2e-artifacts/nube-notes-ic/<run-id>/ (report.json + screenshots).
 *   node scripts/e2e/nube-notes-ic.e2e.mjs   (or: npm run e2e:nube-notes-ic)
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, openPatient, goArea, waitForBoot } from './harness.mjs';
import { startWorker, nubeDevices, onboardNube, patientVisible, roomMeta, d1Query, until, BASE } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';
import { OLDER_DEMO_SOME_LAB_REPORT } from '../../public/js/tour-demo-some-lab.mjs';

const SALA = 'Interconsultas';
const tag = Date.now().toString(36).slice(-6);
const USER_A = { username: `demo_ica_${tag}`, name: 'Dr. Demo IC Alfa', sala: SALA };
const USER_B = { username: `demo_icb_${tag}`, name: 'Dra. Demo IC Bravo', sala: SALA };
const P1 = { exp: `8${String(Date.now()).slice(-6)}-1`, name: 'DEMO NOTAS IC UNO', room: '311' };
const TEAM = `EQUIPO DEMO IC ${tag.toUpperCase()}`;
const NOTE_A = 'DEMO EVOLUCION IC ESCRITA EN A';
const DIETA_A = 'DEMO DIETA IC DE A';
const TAS_A = 151;

const r = createRun('nube-notes-ic');
const { check } = r;
const launchDevice = nubeDevices(r);

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

/** Interconsulta board → patient card (same as nube-notes.e2e.mjs pickPatient). */
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
  await board.locator('.ic-card .sv-name').first().waitFor({ state: 'visible' });
  await openPatient(page, p);
}

/** Interconsulta › Clínico › section ('notas' | 'indica' | 'estadoActual'). */
async function goClinico(page, section) {
  await closeToasts(page);
  await goArea(page, 'nota');
  await page.locator('.exp-group-pill[data-group="clinico"]').hover({ timeout: 5000 }).catch(() => {});
  await page.locator(`.exp-group-section[data-section="${section}"]`).click();
}

/** A's note for P1 via the app module (dynamic import). Null when the module is not served to the page. */
const noteOfP1 = (page, exp) => page.evaluate(async (exp) => {
  try {
    const m = await import(new URL('./js/app-state.mjs', location.href).href);
    const id = Object.entries(m.getPatients()).find(([, p]) => JSON.stringify(p).includes(exp))?.[0];
    const n = id && m.getNotes()[id];
    return n ? { id, updatedAt: n.updatedAt || '', estudios: n.estudios || '' } : null;
  } catch (e) { return { error: String(e) }; }
}, exp);
const maxRev = (roomId) => Number(JSON.parse(d1Query(`SELECT MAX(revision) AS r FROM mutations WHERE room_id='${roomId}'`))[0]?.results?.[0]?.r ?? -1);

const noteField = (page, arg) => page.locator(`#note-form [data-oninput-args='["${arg}"]']`);
const indField = (page, arg) => page.locator(`#indica-form [data-oninput-args='["${arg}"]']`);
const settle = (page) => page.evaluate(() => document.activeElement?.blur?.()).then(() => page.waitForTimeout(400));

await r.finish('Nube notes IC: estado actual + nota + indicaciones A→B (sala Interconsultas)', async () => {
  check('local Worker answers /ping', await startWorker(), BASE);

  const A = await launchDevice('a', 3801);
  await onboardNube(A.page, USER_A);
  const B = await launchDevice('b', 3802);
  await onboardNube(B.page, USER_B);

  // Same team, so B receives A's patient.
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill(TEAM);
  await A.page.locator('#clinical-team-create-sala').selectOption(SALA).catch(() => {});
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const joinBtn = B.page.locator('div:has(.clinical-teams-join-btn)', { hasText: TEAM }).last().locator('.clinical-teams-join-btn').first();
  check("B: sees A's team through Nube", await until(() => joinBtn.isVisible(), 20000));
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
  check('B: P1 arrives', await until(() => patientVisible(B.page, P1), 45000));
  await openPatient(B.page, P1);
  await setMode(A.page, 'interconsulta');
  await setMode(B.page, 'interconsulta');
  await pickPatient(A.page, P1);
  await pickPatient(B.page, P1);

  // B opens Indicaciones first and sits there.
  await goClinico(B.page, 'indica');
  await indField(B.page, 'dieta').waitFor({ state: 'visible' });

  // ── A writes estado actual + nota + indicaciones ───────────────────────
  await goClinico(A.page, 'estadoActual');
  await A.page.getByRole('button', { name: 'Registro manual' }).click();
  const form = A.page.locator('#ea-form');
  await form.waitFor({ state: 'visible' });
  await form.locator('[data-ea-vital="tas"][data-ea-layer-idx="0"]').fill(String(TAS_A));
  await A.page.locator('.ea-registro-submit').click();
  await A.page.waitForTimeout(800);
  await goClinico(A.page, 'notas');
  await noteField(A.page, 'evolucion').fill(NOTE_A);
  await settle(A.page);
  await goClinico(A.page, 'indica');
  await indField(A.page, 'dieta').fill(DIETA_A);
  await settle(A.page);
  await r.shot(A.page, 'a-wrote');

  // ── B must receive all three (estado actual first: the control) ────────
  await goClinico(B.page, 'estadoActual');
  const estadoArrived = await until(async () => (await B.page.locator('body').innerText()).includes(String(TAS_A)), 60000, 1000);
  check('B: estado actual (TAS registro from A) arrives', estadoArrived);
  await r.shot(B.page, 'b-estado');

  await goClinico(B.page, 'notas');
  const noteArrived = await until(async () => (await noteField(B.page, 'evolucion').inputValue().catch(() => '')) === NOTE_A, 60000, 1000);
  check('B: nota evolución from A arrives', noteArrived);

  await goClinico(B.page, 'indica');
  const dietaArrived = await until(async () => (await indField(B.page, 'dieta').inputValue().catch(() => '')) === DIETA_A, 60000, 1000);
  check('B: indicaciones dieta from A arrives', dietaArrived);
  await r.shot(B.page, 'b-received');

  // ── Second, different lab set for P1 (no typing in the note form) ──────
  const before = await noteOfP1(A.page, P1.exp);
  const roomId = (await roomMeta(A.page))?.id;
  const rev0 = maxRev(roomId);
  const second = OLDER_DEMO_SOME_LAB_REPORT.replace(/9000095-7/g, P1.exp)
    .replace('DEMO PÉREZ JUAN', P1.name)
    .replace(/Fecha Registro:\t[^\n]*/, 'Fecha Registro:\tSep 30 2026 8:00AM');
  await pasteAndSave(A.page, second);
  const rev1 = maxRev(roomId);
  await goClinico(A.page, 'notas');
  const newVal = await noteField(A.page, 'estudios').inputValue().catch(() => '');
  check('A: second paste changed P1 estudios', !!newVal && newVal !== (before?.estudios || ''));
  check('A: d1 mutations revision advanced after second paste', rev1 > rev0);

  await goClinico(B.page, 'notas');
  const estArrived = await until(async () => {
    const v = await noteField(B.page, 'estudios').inputValue().catch(() => '');
    return !!newVal && v === newVal;
  }, 60000, 1000);
  check('B: note Estudios auxiliares from second paste arrives', estArrived);
  await r.shot(B.page, 'b-estudios');
});
