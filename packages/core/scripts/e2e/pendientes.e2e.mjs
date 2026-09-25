#!/usr/bin/env node
/* global document, window, requestAnimationFrame */
/**
 * E2E: Pendientes (the per-patient to-do list), driven through the real
 * Electron app. Synthetic DEMO patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Add
 *     - "Agregar pendiente" with no text adds an empty row, or closes the form
 *     - Escape / Cancelar still adds the pendiente
 *     - the chosen priority or due date is lost on save
 *     - the "Fecha límite" picker opened over the add form cannot be typed in
 *     - a past due date does not land in «Vencidos», today's not in «Hoy»
 *     - «Recordarme» does not show the bell
 *     - the add form's field labels ("Qué hay que hacer", "Prioridad", "Vence") are missing
 *     - a "Fecha límite rápida" preset chip (e.g. «Mañana 08:00») sets a different
 *       date than the one written on the chip
 *     - a new pendiente starts already "En curso"
 *   Edit
 *     - the row priority chip does not cycle through all three levels in order,
 *       or reverts after a refresh
 *     - an inline text edit is lost
 *     - «En curso» does not stick, or a second click does not turn it back off
 *   Close / undo / delete
 *     - «Listo» does not move the row to «Cerrados», or Deshacer does not bring it back
 *     - the undo toast's wording or the Deshacer button is wrong
 *     - closing a pendiente that was «En curso» leaves it «En curso» in «Cerrados»
 *     - a closed row still shows a priority chip, or is not struck through
 *     - Cancel on the delete confirm still deletes; Eliminar does not delete
 *     - the row disappears the instant "x" is clicked, before the confirm resolves
 *   Scope
 *     - one patient's pendientes show on another patient
 *     - the Resumen card does not list the open pendientes
 *     - the Pendientes tab badge is wrong, or stays visible with zero open pendientes
 *   Sync
 *     - deleting a pendiente on one device leaves it alive on another (a stale
 *       cloud tombstone clock)
 *   Reminders
 *     - a «Recordarme» reminder never shows its toast, or the toast text is wrong
 *   Restart
 *     - any of the above is lost after the app restarts
 *   Throughout
 *     - an uncaught page error
 *
 * Artifact: e2e-artifacts/pendientes/<run-id>/ (report.json, screenshots).
 *
 *   npm run e2e:pendientes
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, dismissLearnHub, until } from './harness.mjs';
import { startWorker, stopWorker, nubeDevices, onboardNube, patientVisible, BASE } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';

const P1 = { exp: '7000601-1', name: 'DEMO PENDIENTE UNO', room: '501' };
const P2 = { exp: '7000602-2', name: 'DEMO PENDIENTE DOS', room: '502' };
const TAC = 'TAC DE CRANEO SIMPLE';
const IC = 'INTERCONSULTA A CARDIOLOGIA';
const HC = 'HEMOCULTIVOS X2';
const HC2 = 'HEMOCULTIVOS X2 PERIFERICOS';
const ECO = 'ECO DOPPLER DE MIEMBROS';
const RX = 'RX TORAX PORTATIL';
const DEL_SYNC = 'DEMO PENDIENTE PARA BORRAR';

const pad = (n) => String(n).padStart(2, '0');
const localInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const now = new Date();
const yesterday9 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0);
const today2359 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);

const r = createRun('pendientes');
const { check } = r;

/** Paciente → Pendientes pill. */
async function goPendientes(page) {
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.locator('button:visible', { hasText: /^\s*Pendientes\s*$/ }).first().click();
  await page.locator('.todo-toolbar-add-btn:visible').waitFor();
}

/** Every visible group with its rows, as the user sees them. */
const listState = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.todo-group')]
      .filter((g) => g.getBoundingClientRect().width > 0)
      .map((g) => ({
        title: g.querySelector('.todo-group-header')?.textContent.replace(/\s+/g, ' ').trim(),
        rows: [...g.querySelectorAll('.wb-todo-row')].map((row) => ({
          text: row.querySelector('.todo-text-input')?.value ?? row.querySelector('.wb-todo-pendiente')?.textContent.trim(),
          prio: row.querySelector('.wb-todo-prior')?.textContent.trim() || null,
          vence: row.querySelector('.wb-todo-vence')?.textContent.trim() || '',
          enCurso: row.querySelector('.wb-todo-encurso-btn')?.getAttribute('aria-pressed') === 'true',
          alert: row.classList.contains('wb-row--alert'),
        })),
      })),
  );
const groupOf = (state, text) => state.find((g) => g.rows.some((x) => x.text === text));
const rowOf = (state, text) => groupOf(state, text)?.rows.find((x) => x.text === text);
/** The open row whose text box holds `text` (input values are not in the DOM text). */
async function row(page, text) {
  await page.evaluate((t) => {
    for (const el of document.querySelectorAll('.wb-todo-row')) {
      if (el.getBoundingClientRect().width > 0 && el.querySelector('.todo-text-input')?.value === t) el.dataset.e2eRow = t;
    }
  }, text);
  return page.locator(`.wb-todo-row[data-e2e-row="${text}"]:visible`).first();
}

/** "+ Pendiente" → text, priority, optional due (picker) → Agregar. */
async function addPendiente(page, { text, prio = 'MEDIA', due = null, remind = false }) {
  await page.locator('.todo-toolbar-add-btn:visible').click();
  const m = page.locator('.wb-todo-add-modal');
  await m.locator('.wb-todo-add-text').fill(text);
  for (let i = 0; i < 3 && !new RegExp(prio, 'i').test(await m.locator('.todo-prio-label').textContent()); i += 1) {
    await m.locator('.todo-prio-chip').click();
  }
  if (due) {
    await m.locator('.todo-due-toggle').click();
    const dt = page.locator('#todo-due-modal-datetime');
    await dt.waitFor({ state: 'visible' });
    await dt.fill(localInput(due));
    if (remind) await page.locator('#todo-due-modal-remind').check();
    await page.locator('#todo-due-modal-save').click();
    await dt.waitFor({ state: 'hidden' });
  }
  const picked = { prio: await m.locator('.todo-prio-label').textContent(), due: await m.locator('.todo-due-selection').textContent() };
  await m.locator('[data-wb-todo-add-ok]').click();
  await m.waitFor({ state: 'detached' });
  return picked;
}

await r.finish('Pendientes: add, dates, priority, edit, listo/deshacer, delete, scope, restart', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  await pasteAndSave(page, fullLabs(P1, 'Sep 20 2026 8:00AM'));
  await pasteAndSave(page, fullLabs(P2, 'Sep 20 2026 8:30AM'));
  await openPatient(page, P2);
  await openPatient(page, P1);
  await goPendientes(page);
  check('P1 starts with «Sin pendientes»', await page.locator('.todo-empty:visible', { hasText: 'Sin pendientes' }).isVisible());

  // ── Add: empty text refused, Escape adds nothing ──────────────────────
  await page.locator('.todo-toolbar-add-btn:visible').click();
  const m = page.locator('.wb-todo-add-modal');
  // Rendered uppercase by CSS (innerText reflects that); the source labels are Title Case.
  const addLabels = await m.locator('.wb-todo-add-label').allInnerTexts();
  check('add form shows the three field labels', ['QUÉ HAY QUE HACER', 'PRIORIDAD', 'VENCE'].every((l) => addLabels.includes(l)), addLabels);
  await m.locator('[data-wb-todo-add-ok]').click();
  check('empty text: form stays open, nothing added', (await m.isVisible()) && (await listState(page)).length === 0);
  await page.keyboard.press('Escape');
  check('Escape closes the form', await m.waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false));

  // ── Add three with different priority / due ───────────────────────────
  const tac = await addPendiente(page, { text: TAC, prio: 'ALTA', due: yesterday9 });
  check('add form keeps ALTA + the due date picked in «Fecha límite»', /alta/i.test(tac.prio) && tac.due.trim() !== '', tac);
  await addPendiente(page, { text: IC });
  await addPendiente(page, { text: HC, prio: 'BAJA', due: today2359, remind: true });
  await page.locator('.todo-toolbar-add-btn:visible').click();
  await m.locator('.wb-todo-add-text').fill(ECO);
  await m.locator('[data-wb-todo-add-cancel]').click();
  let s = await listState(page);
  check('Cancelar adds nothing: 3 pendientes', s.flatMap((g) => g.rows).length === 3, s);
  check('TAC (due yesterday) is under «Vencidos», marked red, ALTA',
    /^Vencidos/.test(groupOf(s, TAC)?.title || '') && rowOf(s, TAC)?.alert && rowOf(s, TAC)?.prio === 'ALTA', groupOf(s, TAC));
  check('Hemocultivos (due today 23:59, Recordarme) is under «Hoy», BAJA, with the bell',
    /^Hoy/.test(groupOf(s, HC)?.title || '') && rowOf(s, HC)?.prio === 'BAJA' && rowOf(s, HC)?.vence.includes('🔔'), groupOf(s, HC));
  check('Interconsulta (no date) is under «Sin fecha», MEDIA', /^Sin fecha/.test(groupOf(s, IC)?.title || '') && rowOf(s, IC)?.prio === 'MEDIA', groupOf(s, IC));
  await r.shot(page, 'three-added');
  await addPendiente(page, { text: ECO });

  // ── "Fecha límite rápida" preset chip sets the same date the picker would ──
  await page.locator('.todo-toolbar-add-btn:visible').click();
  await m.locator('.wb-todo-add-text').fill(RX);
  const presetChip = m.locator('.todo-due-preset-chip[data-preset="manana-8"]');
  const presetLabel = (await presetChip.textContent()).trim();
  await presetChip.click();
  const presetSelection = (await m.locator('.todo-due-selection').textContent()).trim();
  await m.locator('[data-wb-todo-add-ok]').click();
  await m.waitFor({ state: 'detached' });
  s = await listState(page);
  const rxRow = rowOf(s, RX);
  // The compact row drops the trailing time for anything but "Hoy" (matches TAC's "23 sep" above);
  // the picker's own selection text keeps the full "Mañana 08:00" the preset chip promises.
  check('«Mañana 08:00» quick-preset chip sets the same due date the picker would (Sin fecha, no bell)',
    presetLabel === 'Mañana 08:00' && presetSelection === 'Mañana 08:00' &&
      /^Sin fecha/.test(groupOf(s, RX)?.title || '') && rxRow?.vence === 'Mañana' && !rxRow?.vence.includes('🔔') && rxRow?.enCurso === false,
    { presetLabel, presetSelection, group: groupOf(s, RX) });
  const rxRowClass = await page.evaluate((t) => {
    for (const el of document.querySelectorAll('.wb-row')) {
      if (el.querySelector('.todo-text-input')?.value === t) return el.className;
    }
    return '';
  }, RX);
  check('the newly added row shows a row-enter fade-in', /row-enter/.test(rxRowClass), rxRowClass);

  // ── Pendientes tab badge: open dot with aria-label while pendientes are open ──
  const badgeOpen = await page.evaluate(() => {
    for (const id of ['exp-pendientes-badge', 'exp-pendientes-badge-classic']) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().width > 0) return { id, hidden: el.hidden, ariaLabel: el.getAttribute('aria-label') };
    }
    return null;
  });
  check('Pendientes tab badge shows the open dot with an aria-label while pendientes are open',
    !!badgeOpen && !badgeOpen.hidden && badgeOpen.ariaLabel === 'Pendientes abiertos', badgeOpen);

  // ── Edit in the row: priority cycles the full alta → media → baja loop ──
  const cycle = [];
  for (let i = 0; i < 3; i += 1) {
    await (await row(page, IC)).locator('.wb-todo-prior').click();
    await page.waitForTimeout(300);
    cycle.push(rowOf(await listState(page), IC)?.prio);
  }
  check('row priority chip cycles the full MEDIA → BAJA → ALTA → MEDIA loop', JSON.stringify(cycle) === JSON.stringify(['BAJA', 'ALTA', 'MEDIA']), cycle);
  const icPrio = 'MEDIA';
  const hcInput = (await row(page, HC)).locator('.todo-text-input');
  await hcInput.fill(HC2);
  await hcInput.press('Enter');
  await (await row(page, TAC)).locator('.wb-todo-encurso-btn').click(); // on
  await page.waitForTimeout(300);
  const encursoOn = rowOf(await listState(page), TAC)?.enCurso;
  await (await row(page, TAC)).locator('.wb-todo-encurso-btn').click(); // off
  await page.waitForTimeout(300);
  const encursoOff = rowOf(await listState(page), TAC)?.enCurso;
  await (await row(page, TAC)).locator('.wb-todo-encurso-btn').click(); // on again — restart check below expects it on
  await page.waitForTimeout(400);
  s = await listState(page);
  check('inline edit renames the row', !!rowOf(s, HC2) && !rowOf(s, HC) && rowOf(s, HC2)?.enCurso === false, s.flatMap((g) => g.rows.map((x) => x.text)));
  check('«En curso» toggles on → off → on on the TAC', encursoOn === true && encursoOff === false && rowOf(s, TAC)?.enCurso === true, { encursoOn, encursoOff });

  // ── Listo → Deshacer → Listo ──────────────────────────────────────────
  await (await row(page, IC)).locator('.wb-todo-encurso-btn').click(); // «En curso» right before closing it
  await page.waitForTimeout(300);
  check('IC is «En curso» right before closing it', rowOf(await listState(page), IC)?.enCurso === true);
  await (await row(page, IC)).locator('.wb-todo-listo-btn').click();
  const undo = page.getByRole('button', { name: 'Deshacer' });
  const undoOffered = await undo.waitFor({ timeout: 5000 }).then(() => true, () => false);
  const undoToastText = undoOffered ? (await page.locator('.wb-undo-toast').innerText().catch(() => '')).replace(/\s+/g, ' ').trim() : '';
  check('«Listo» offers Deshacer with the "Pendiente marcado como listo" toast',
    undoOffered && /Pendiente marcado como listo/.test(undoToastText) && /Deshacer/.test(undoToastText), undoToastText);
  check('«Listo» moves it to «Cerrados»', await until(async () => /^Cerrados/.test(groupOf(await listState(page), IC)?.title || ''), 3000), groupOf(await listState(page), IC));
  await undo.click();
  await page.waitForTimeout(400);
  check('Deshacer brings it back open with its priority', rowOf(await listState(page), IC)?.prio === icPrio, rowOf(await listState(page), IC));
  await (await row(page, IC)).locator('.wb-todo-listo-btn').click();
  // The ghost clones the (still-open) row verbatim, so its text lives in an
  // <input value>, invisible to a plain :has-text() filter — read it directly.
  const ghost = await page.evaluate((t) => [...document.querySelectorAll('.row-exit, .row-exit-done')]
    .some((el) => (el.querySelector('.todo-text-input')?.value || el.textContent || '').includes(t)), IC);
  check('marking Listo leaves a fading ghost row before the list re-settles', ghost, ghost);
  await page.waitForTimeout(400);
  const icClosed = rowOf(await listState(page), IC);
  check('closing a pendiente that was «En curso» clears «En curso» in «Cerrados»', icClosed?.enCurso === false, icClosed);
  const closedRowInfo = await page.evaluate((t) => {
    for (const el of document.querySelectorAll('.wb-row')) {
      const span = el.querySelector('.wb-todo-pendiente--closed');
      if (span && span.textContent.trim() === t) return { hasPrior: !!el.querySelector('.wb-todo-prior'), hasClosedClass: true };
    }
    return null;
  }, IC);
  check('closed row has no priority chip and renders strikethrough text', !!closedRowInfo && closedRowInfo.hasClosedClass && !closedRowInfo.hasPrior, closedRowInfo);

  // ── Delete: Cancelar keeps, Eliminar removes ──────────────────────────
  const confirm = page.locator('.wb-confirm-modal', { hasText: '¿Eliminar este pendiente?' });
  await (await row(page, ECO)).locator('.wb-todo-del-btn').click();
  check('the row is not removed before the confirm resolves', !!rowOf(await listState(page), ECO));
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  await page.waitForTimeout(300);
  check('delete → Cancelar keeps it', !!rowOf(await listState(page), ECO));
  await (await row(page, ECO)).locator('.wb-todo-del-btn').click();
  await confirm.getByRole('button', { name: 'Eliminar' }).click();
  await page.waitForTimeout(400);
  check('delete → Eliminar removes it', !rowOf(await listState(page), ECO));
  await r.shot(page, 'after-edits');

  // ── Resumen card and scope ────────────────────────────────────────────
  await page.locator('button:visible', { hasText: /^\s*Resumen\s*$/ }).first().click();
  const card = page.locator('#patient-dashboard-mount');
  check('the «Resumen» pill leaves Pendientes and shows the summary', await card.waitFor({ timeout: 3000 }).then(() => true, () => false));
  if (!(await card.isVisible())) await page.locator('#btn-volver-al-resumen').click();
  await card.waitFor({ timeout: 5000 });
  let cardText = '';
  check('Resumen card lists the 3 open pendientes, not the closed one', await until(async () => {
    cardText = (await card.innerText()).replace(/\s+/g, ' ');
    return cardText.includes(TAC) && cardText.includes(HC2) && cardText.includes(RX) && !cardText.includes(IC);
  }, 5000), cardText.slice(cardText.indexOf('PENDIENTES'), cardText.indexOf('PENDIENTES') + 200));
  await openPatient(page, P2);
  // Sample every frame while Pendientes opens: P1's rows must never paint, not even for a moment.
  await page.evaluate(() => {
    window.__seen = new Set();
    const end = performance.now() + 2500;
    const tick = () => {
      for (const i of document.querySelectorAll('.todo-text-input')) if (i.getBoundingClientRect().width > 0) window.__seen.add(i.value);
      if (performance.now() < end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await goPendientes(page);
  await page.waitForTimeout(2600);
  const flashed = await page.evaluate(() => [...window.__seen]);
  check('opening P2\'s Pendientes never shows P1\'s rows, even briefly', flashed.length === 0, flashed);
  await r.shot(page, 'p2-pendientes');
  let p2 = null;
  check('P2 has none of P1\'s pendientes', await until(async () => (p2 = await listState(page)).length === 0, 5000), { p2, header: await page.locator('.wb-todo-add-context, h1, .patient-dash-name').allInnerTexts().catch(() => []) });
  const badgeZero = await page.evaluate(() => {
    for (const id of ['exp-pendientes-badge', 'exp-pendientes-badge-classic']) {
      const el = document.getElementById(id);
      if (el) return { id, hidden: el.hidden, ariaLabel: el.getAttribute('aria-label') };
    }
    return null;
  });
  check('Pendientes tab badge is hidden with no aria-label at zero open pendientes', !!badgeZero && badgeZero.hidden === true && badgeZero.ariaLabel === null, badgeZero);
  await openPatient(page, P1);
  await goPendientes(page);
  s = await listState(page);
  check('P1 unchanged after switching patients', s.flatMap((g) => g.rows).length === 4);
  const p1RowClasses = await page.evaluate(() => [...document.querySelectorAll('.wb-row')].map((e) => e.className));
  check('switching back to P1 does not row-enter/row-exit the whole list', p1RowClasses.every((c) => !/row-enter|row-exit/.test(c)), p1RowClasses);

  // ── Restart ───────────────────────────────────────────────────────────
  const errors = [...pageErrors];
  await app.close();
  const again = await r.launch();
  await again.page.locator('#apptab-lab').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(again.page);
  await openPatient(again.page, P1);
  await goPendientes(again.page);
  await again.page.locator('details.todo-group--listo summary').click().catch(() => {});
  s = await listState(again.page);
  await r.shot(again.page, 'after-restart');
  check('restart: TAC still Vencido, ALTA, en curso', /^Vencidos/.test(groupOf(s, TAC)?.title || '') && rowOf(s, TAC)?.prio === 'ALTA' && rowOf(s, TAC)?.enCurso, rowOf(s, TAC));
  check('restart: edited Hemocultivos still Hoy, BAJA, bell', /^Hoy/.test(groupOf(s, HC2)?.title || '') && rowOf(s, HC2)?.prio === 'BAJA' && rowOf(s, HC2)?.vence.includes('🔔'), rowOf(s, HC2));
  check('restart: Interconsulta still closed', /^Cerrados/.test(groupOf(s, IC)?.title || ''), groupOf(s, IC));
  check('restart: deleted Eco stays deleted', !rowOf(s, ECO));
  check('restart: preset-added Rx still Sin fecha, Mañana', /^Sin fecha/.test(groupOf(s, RX)?.title || '') && rowOf(s, RX)?.vence === 'Mañana', groupOf(s, RX));
  check('no uncaught page errors', !errors.length && !again.pageErrors.length, [...errors, ...again.pageErrors].slice(0, 5));
  await again.app.close();

  // ── Nube: a delete on one device tombstones the pendiente on another ────
  check('local Worker answers /ping', await startWorker(), BASE);
  const launchDevice = nubeDevices(r);
  const tag = Date.now().toString(36).slice(-6);
  const RA = { username: `demo_pa_${tag}`, name: 'Dra. Demo Pendiente', rank: 'R2' };
  const RB = { username: `demo_pb_${tag}`, name: 'Dr. Demo Pendiente', rank: 'R1' };
  const A = await launchDevice('nube-a', 3793);
  await onboardNube(A.page, RA);
  const B = await launchDevice('nube-b', 3794);
  await onboardNube(B.page, RB);
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO PENDIENTES');
  await A.page.getByRole('button', { name: 'Crear equipo' }).click();
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
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
  const P3 = { exp: '7000603-3', name: 'DEMO PENDIENTE TRES', room: '503' };
  await pasteAndSave(A.page, fullLabs(P3, 'Sep 20 2026 9:00AM'));
  await openPatient(A.page, P3);
  check('the new patient reaches the other device', await until(() => patientVisible(B.page, P3), 45000));
  await goPendientes(A.page);
  await addPendiente(A.page, { text: DEL_SYNC });
  check('the other device sees the new pendiente after sync', await until(async () => {
    await openPatient(B.page, P3);
    await goPendientes(B.page);
    return !!rowOf(await listState(B.page), DEL_SYNC);
  }, 45000, 2000));
  await (await row(A.page, DEL_SYNC)).locator('.wb-todo-del-btn').click();
  await A.page.locator('.wb-confirm-modal', { hasText: '¿Eliminar este pendiente?' }).getByRole('button', { name: 'Eliminar' }).click();
  await A.page.waitForTimeout(400);
  check('deleting device no longer shows it', !rowOf(await listState(A.page), DEL_SYNC));
  check('the other device removes the deleted pendiente too (fresh cloud tombstone clock)', await until(async () => {
    await goPendientes(B.page);
    return !rowOf(await listState(B.page), DEL_SYNC);
  }, 45000, 2000));
  await A.app.close();
  await B.app.close();
  await stopWorker();
});
