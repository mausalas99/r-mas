#!/usr/bin/env node
/* global document, getComputedStyle */
/**
 * E2E: Agenda de procedimientos (the weekly board of scheduled procedures),
 * on two desktop devices of one team over Nube — the R2 books procedures for
 * the week, the R1 on the other computer sees them, changes one and removes
 * one, and the R2 sees both changes. Local copy of the real sync Worker only
 * (nube-worker.mjs). Synthetic DEMO patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Board
 *     - the range label is not this week (Monday to Sunday)
 *     - «Semana ant.» / «Semana sig.» go past one week back / ahead, or ⌘4 does
 *       not bring the board back to this week
 *   New procedure
 *     - the patient list is empty, or does not preselect the open patient
 *     - «Guardar» with no procedure / no place saves anyway, or closes the form
 *     - Escape saves what was typed
 *     - the chosen day or hour (custom date + hour pickers) is lost on save
 *     - the block lands on the wrong day or hour, or shows the wrong patient
 *     - a block with material + anesthesia still shows the warning mark;
 *       one without them does not
 *     - two procedures at the same hour paint on top of each other
 *   Edit
 *     - the form opens blank, or «Eliminar» is missing
 *     - a saved edit makes a second copy instead of changing the first
 *   Delete
 *     - «Cancelar» on the confirm still deletes; «Eliminar» does not delete
 *     - the delete confirm is not marked destructive, or its wording drifts
 *       from "no se puede deshacer"
 *   Grid
 *     - the hour column shows a different range than the display window,
 *       or the first/last hour labels are off by one
 *   Two devices
 *     - a procedure never reaches the other device, or arrives as
 *       «Paciente desconocido»
 *     - the other device's edit or delete never comes back
 *     - one device's sync wipes the other device's procedures
 *   Restart
 *     - the agenda is lost after the app restarts
 *   Throughout
 *     - an uncaught page error on either device
 *
 * Artifact: e2e-artifacts/agenda/<run-id>/ (report.json, screenshots, console.json).
 *
 *   npm run e2e:agenda
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, openPatient } from './harness.mjs';
import { startWorker, nubeDevices, onboardNube, patientVisible, until, BASE } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';

const tag = Date.now().toString(36).slice(-6);
const R2 = { username: `demo_ag2_${tag}`, name: 'Dr. Demo Agenda', rank: 'R2' };
const R1 = { username: `demo_ag1_${tag}`, name: 'Dra. Demo Agenda', rank: 'R1' };
const P1 = { exp: '7000611-1', name: 'DEMO AGENDA UNO', room: '511' };
const P2 = { exp: '7000612-2', name: 'DEMO AGENDA DOS', room: '512' };
const LAPA = 'DEMO COLECISTECTOMIA';
const ENDO = 'DEMO ENDOSCOPIA ALTA';
const DRENA = 'DEMO DRENAJE PLEURAL';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
const wednesday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2);
const nextFriday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 11);

const r = createRun('agenda');
const { check } = r;
const launchDevice = nubeDevices(r);

async function goAgenda(page) {
  await closeToasts(page);
  await page.locator('#apptab-agenda').click();
  await page.locator('#procedure-agenda-range').waitFor();
  await until(async () => (await page.locator('#procedure-agenda-range').textContent()).trim().length > 0, 5000);
}

/** Every block on the board, as the user sees it: day column (0 = Monday), text, lane box, warning mark. */
const blocks = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#procedure-agenda-grid-mount .rpc-proc-agenda-day-col-wrap')].flatMap((col, day) =>
      [...col.querySelectorAll('.rpc-proc-agenda-block')].map((b) => {
        const rc = b.getBoundingClientRect();
        return {
          day,
          name: b.querySelector('.rpc-proc-name')?.textContent.trim(),
          sub: b.querySelector('.rpc-proc-sub')?.textContent.trim(),
          patient: b.querySelector('.rpc-proc-pat')?.textContent.trim(),
          flag: b.classList.contains('rpc-proc-flag'),
          left: Math.round(rc.left),
          top: Math.round(rc.top),
          width: Math.round(rc.width),
        };
      }),
    ),
  );
const blockOf = (list, name) => list.filter((b) => b.name === name);

const modal = (page) => page.locator('#procedure-agenda-modal');

/** Pick a day in the custom date popover (it opens on the chosen month) and the hour/minute selects. */
async function setStart(page, date, hh, mm) {
  const m = modal(page);
  await m.locator('.rpc-date-field__trigger').click();
  const day = page.locator(`.rpc-date-popover__day[data-iso="${iso(date)}"]`);
  for (let i = 0; i < 3 && !(await day.isVisible()); i += 1) {
    await page.locator('.rpc-date-popover__nav[data-nav="1"]').click();
  }
  await day.click();
  const [hour, minute] = await m.locator('.rpc-time-picker__select').all();
  await hour.selectOption(pad(hh));
  await minute.selectOption(pad(mm));
}

/** «+ Nuevo procedimiento» → fill → Guardar. Returns the toast text. */
async function addProcedure(page, { patient, procedure, location, date, hh, mm, material = false, anesthesia = false }) {
  await closeToasts(page);
  await page.locator('#procedure-agenda-new').click();
  const m = modal(page);
  await m.locator('#pa-procedure').waitFor({ state: 'visible' });
  if (patient) await m.locator('#pa-patient').selectOption({ label: patient.name });
  await m.locator('#pa-procedure').fill(procedure);
  await m.locator('#pa-location').fill(location);
  await setStart(page, date, hh, mm);
  if (material) await m.locator('#pa-material').check();
  if (anesthesia) await m.locator('#pa-anesthesia').check();
  await m.getByRole('button', { name: 'Guardar' }).click();
  await m.locator('#pa-procedure').waitFor({ state: 'hidden' });
  return (await page.locator('.toast').allInnerTexts()).join(' | ');
}

async function openBlock(page, name) {
  await closeToasts(page);
  await page.locator('.rpc-proc-agenda-block', { has: page.locator('.rpc-proc-name', { hasText: name }) }).first().click();
  await modal(page).locator('#pa-procedure').waitFor({ state: 'visible' });
}

const formState = (page) =>
  page.evaluate(() => ({
    patient: document.getElementById('pa-patient').selectedOptions[0]?.textContent || '',
    procedure: document.getElementById('pa-procedure').value,
    location: document.getElementById('pa-location').value,
    start: document.getElementById('pa-start').value,
    material: document.getElementById('pa-material').checked,
    anesthesia: document.getElementById('pa-anesthesia').checked,
    deleteShown: getComputedStyle(document.getElementById('pa-btn-delete')).display !== 'none',
  }));

await r.finish('Agenda: week board, new/edit/delete, two devices over Nube, restart', async () => {
  check('local Worker answers /ping', await startWorker(), BASE);

  // ── Two devices, one team ─────────────────────────────────────────────
  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, R2);
  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, R1);
  await A.page.getByRole('button', { name: 'Ejemplo Modelo casoba' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO AGENDA');
  await A.page.getByRole('button', { name: 'Crear equipo' }).click();
  await B.page.getByRole('button', { name: 'Ejemplo Modelo casoba' }).click();
  const joinBtn = B.page.getByRole('button', { name: 'Unirme' });
  check('R1 sees the R2\'s team through Nube', await until(() => joinBtn.isVisible(), 20000));
  await joinBtn.click();
  await B.page.waitForTimeout(1500);
  for (const d of [A, B]) {
    await closeToasts(d.page);
    await d.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await d.page.keyboard.press('Escape');
    await dismissLearnHub(d.page);
    await d.page.locator('#apptab-lab').click();
  }

  await pasteAndSave(A.page, fullLabs(P1, 'Sep 22 2026 8:00AM'));
  await pasteAndSave(A.page, fullLabs(P2, 'Sep 22 2026 8:30AM'));
  await openPatient(A.page, P2);
  await openPatient(A.page, P1);
  check('both patients reach the R1\'s device',
    await until(async () => (await patientVisible(B.page, P1)) && (await patientVisible(B.page, P2)), 45000));

  // ── Board: this week, week limits ─────────────────────────────────────
  const { page } = A;
  await goAgenda(page);
  const range = (await page.locator('#procedure-agenda-range').textContent()).trim();
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  check('range label runs from this Monday to this Sunday',
    new RegExp(`^Lun ${monday.getDate()}\\b`).test(range) && new RegExp(`\\b${sunday.getDate()} \\S+ ${sunday.getFullYear()}$`).test(range), range);
  await page.locator('#procedure-agenda-prev').click();
  const prevDisabled = await page.locator('#procedure-agenda-prev').isDisabled();
  await page.locator('#procedure-agenda-next').click();
  await page.locator('#procedure-agenda-next').click();
  const nextDisabled = await page.locator('#procedure-agenda-next').isDisabled();
  await page.keyboard.press('Meta+4');
  check('«Semana ant.»/«Semana sig.» stop at one week; ⌘4 comes back to this week',
    prevDisabled && nextDisabled && (await page.locator('#procedure-agenda-range').textContent()).trim() === range,
    { prevDisabled, nextDisabled });

  // ── Grid: exactly the display hour window, 06:00..21:00 ────────────────
  const hourSlots = await page.locator('.rpc-proc-agenda-time-slot').allInnerTexts();
  check('hour column shows exactly the 06:00..21:00 display window (16 rows)',
    hourSlots.length === 16 && hourSlots[0] === '06:00' && hourSlots[hourSlots.length - 1] === '21:00', hourSlots);

  // ── New procedure: form rules ─────────────────────────────────────────
  await page.locator('#procedure-agenda-new').click();
  const m = modal(page);
  await m.locator('#pa-procedure').waitFor({ state: 'visible' });
  const options = await m.locator('#pa-patient option').allTextContents();
  check('patient list holds both patients and preselects the open one',
    options.includes(P1.name) && options.includes(P2.name) && (await formState(page)).patient === P1.name, { options, picked: (await formState(page)).patient });
  await m.getByRole('button', { name: 'Guardar' }).click();
  const err1 = (await m.locator('#pa-modal-error').textContent()).trim();
  await m.locator('#pa-procedure').fill(LAPA);
  await m.getByRole('button', { name: 'Guardar' }).click();
  const err2 = (await m.locator('#pa-modal-error').textContent()).trim();
  check('Guardar with no procedure / no place is refused and the form stays open',
    err1 === 'Indica el procedimiento.' && err2 === 'Indica el lugar.' && (await m.locator('#pa-procedure').isVisible()), { err1, err2 });
  await page.keyboard.press('Escape');
  await m.locator('#pa-procedure').waitFor({ state: 'hidden' });
  check('Escape closes the form and saves nothing', (await blocks(page)).length === 0, await blocks(page));

  // ── Two procedures, same Wednesday, same hour ─────────────────────────
  const toast = await addProcedure(page, { procedure: LAPA, location: 'QUIROFANO 3', date: wednesday, hh: 10, mm: 0, material: true, anesthesia: true });
  await addProcedure(page, { patient: P2, procedure: ENDO, location: 'ENDOSCOPIA', date: wednesday, hh: 10, mm: 30 });
  await r.shot(page, 'two-on-wednesday');
  let b = await blocks(page);
  const [lapa] = blockOf(b, LAPA);
  const [endo] = blockOf(b, ENDO);
  check('saved toast shows', /Procedimiento guardado/.test(toast), toast);
  check('first block: Wednesday, 10:00 · QUIROFANO 3, patient one, no warning',
    lapa?.day === 2 && lapa.sub === '10:00 · QUIROFANO 3' && lapa.patient === P1.name && !lapa.flag, lapa);
  check('second block: Wednesday, 10:30, patient two, warning (no material, no anesthesia)',
    endo?.day === 2 && endo.sub === '10:30 · ENDOSCOPIA' && endo.patient === P2.name && endo.flag, endo);
  check('same-hour blocks sit side by side, not on top of each other',
    lapa && endo && (lapa.left + lapa.width <= endo.left || endo.left + endo.width <= lapa.left), { lapa, endo });

  // ── Edit: move the endoscopy to 15:00, material + anesthesia ok ───────
  await openBlock(page, ENDO);
  const f = await formState(page);
  check('edit form opens with the saved values and «Eliminar»',
    f.patient === P2.name && f.procedure === ENDO && f.location === 'ENDOSCOPIA' && f.start === `${iso(wednesday)}T10:30` && !f.material && !f.anesthesia && f.deleteShown, f);
  await setStart(page, wednesday, 15, 0);
  await m.locator('#pa-material').check();
  await m.locator('#pa-anesthesia').check();
  await m.getByRole('button', { name: 'Guardar' }).click();
  await m.locator('#pa-procedure').waitFor({ state: 'hidden' });
  b = await blocks(page);
  const endos = blockOf(b, ENDO);
  check('edit changes the one block: 15:00, no warning, full width again',
    endos.length === 1 && endos[0].sub === '15:00 · ENDOSCOPIA' && !endos[0].flag && endos[0].width === blockOf(b, LAPA)[0]?.width && endos[0].top > blockOf(b, LAPA)[0]?.top, b);

  // ── Next week ─────────────────────────────────────────────────────────
  await addProcedure(page, { procedure: DRENA, location: 'SALA 1 CAMA 11', date: nextFriday, hh: 8, mm: 30 });
  const thisWeekNames = (await blocks(page)).map((x) => x.name);
  await page.locator('#procedure-agenda-next').click();
  const nextWeek = await blocks(page);
  check('a procedure for next Friday shows only on next week\'s board, on Friday',
    !thisWeekNames.includes(DRENA) && nextWeek.length === 1 && nextWeek[0].name === DRENA && nextWeek[0].day === 4, { thisWeekNames, nextWeek });
  await page.locator('#procedure-agenda-prev').click();

  // ── Delete: Cancelar keeps it, Eliminar removes it ────────────────────
  await openBlock(page, LAPA);
  await m.locator('#pa-btn-delete').click();
  const delConfirmTitle = (await page.locator('.wb-confirm-title').textContent()).trim();
  const delConfirmDestructive = await page.locator('.wb-confirm-modal--destructive').count();
  check('delete confirm is destructive-weighted with the exact "no se puede deshacer" copy',
    delConfirmTitle === '¿Eliminar este procedimiento de la agenda? No se puede deshacer desde aquí.' && delConfirmDestructive > 0,
    { delConfirmTitle, delConfirmDestructive });
  await page.locator('[data-wb-confirm-cancel]').click();
  await page.locator('[data-wb-confirm-cancel]').waitFor({ state: 'detached' });
  await page.keyboard.press('Escape');
  await m.locator('#pa-procedure').waitFor({ state: 'hidden' });
  check('«Cancelar» on the delete confirm keeps the procedure', blockOf(await blocks(page), LAPA).length === 1);
  await openBlock(page, LAPA);
  await m.locator('#pa-btn-delete').click();
  await page.locator('[data-wb-confirm-ok]').click();
  await m.locator('#pa-procedure').waitFor({ state: 'hidden' });
  check('«Eliminar» removes it', blockOf(await blocks(page), LAPA).length === 0, await blocks(page));
  await r.shot(page, 'r2-after-edits');

  // ── The R1's device ───────────────────────────────────────────────────
  await goAgenda(B.page);
  let bb = [];
  const arrived = await until(async () => {
    await B.page.locator('#procedure-agenda-prev').click();
    await B.page.keyboard.press('Meta+4');
    bb = await blocks(B.page);
    return blockOf(bb, ENDO).length === 1;
  }, 45000, 2000);
  await r.shot(B.page, 'r1-agenda');
  check('R1 receives the endoscopy at 15:00 with its patient name', arrived && blockOf(bb, ENDO)[0].sub === '15:00 · ENDOSCOPIA' && blockOf(bb, ENDO)[0].patient === P2.name, bb);
  check('R1 never sees the deleted procedure', blockOf(bb, LAPA).length === 0, bb);
  await B.page.locator('#procedure-agenda-next').click();
  let bNext = await blocks(B.page);
  check('R1 sees next Friday\'s drainage with its patient name', blockOf(bNext, DRENA)[0]?.patient === P1.name, bNext);

  // R1 moves the drainage to another place, and removes the endoscopy.
  await openBlock(B.page, DRENA);
  await modal(B.page).locator('#pa-location').fill('QUIROFANO 5');
  await modal(B.page).getByRole('button', { name: 'Guardar' }).click();
  await modal(B.page).locator('#pa-procedure').waitFor({ state: 'hidden' });
  await B.page.locator('#procedure-agenda-prev').click();
  await openBlock(B.page, ENDO);
  await modal(B.page).locator('#pa-btn-delete').click();
  await B.page.locator('[data-wb-confirm-ok]').click();
  await modal(B.page).locator('#pa-procedure').waitFor({ state: 'hidden' });
  bb = await blocks(B.page);
  await B.page.locator('#procedure-agenda-next').click();
  bNext = await blocks(B.page);
  check('R1\'s own edit and delete stick on the R1\'s device',
    blockOf(bb, ENDO).length === 0 && blockOf(bNext, DRENA)[0]?.sub === '08:30 · QUIROFANO 5', { bb, bNext });

  // ── Back on the R2's device ───────────────────────────────────────────
  let aNow = [];
  let aNext = [];
  const back = await until(async () => {
    await page.keyboard.press('Meta+4');
    aNow = await blocks(page);
    await page.locator('#procedure-agenda-next').click();
    aNext = await blocks(page);
    return blockOf(aNow, ENDO).length === 0 && blockOf(aNext, DRENA)[0]?.sub === '08:30 · QUIROFANO 5';
  }, 45000, 2000);
  await r.shot(page, 'r2-sees-r1-changes');
  check('R2 sees the R1\'s edit (QUIROFANO 5) and delete (endoscopy gone)', back, { aNow, aNext });
  check('neither sync wiped the drainage on the R2\'s device', blockOf(aNext, DRENA).length === 1, aNext);

  // ── Restart the R2 ────────────────────────────────────────────────────
  const errors = [...A.pageErrors, ...B.pageErrors];
  await A.app.close();
  const again = await launchDevice('a', 3791);
  await again.page.locator('#apptab-lab').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(again.page);
  await goAgenda(again.page);
  const afterNow = await blocks(again.page);
  await again.page.locator('#procedure-agenda-next').click();
  const afterNext = await blocks(again.page);
  await r.shot(again.page, 'r2-after-restart');
  check('restart: this week is empty, next Friday keeps the drainage at QUIROFANO 5',
    afterNow.length === 0 && afterNext.length === 1 && afterNext[0].sub === '08:30 · QUIROFANO 5' && afterNext[0].patient === P1.name, { afterNow, afterNext });
  check('no uncaught page errors', !errors.length && !again.pageErrors.length, [...errors, ...again.pageErrors].slice(0, 5));
  await again.app.close();
  await B.app.close();
});
