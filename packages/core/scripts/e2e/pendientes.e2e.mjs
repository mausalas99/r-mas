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
 *     - the groups are out of order (Vencidos, Hoy, Próximos, Sin fecha, Cerrados last)
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
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, dismissLearnHub, until, goArea } from './harness.mjs';
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
const P4 = { exp: '7000604-4', name: 'DEMO PENDIENTE CUATRO', room: '504' };
const TMP = 'DEMO PENDIENTE TEMPORAL';
const EARLY = 'DEMO VENCE EN 2 DIAS';
const LATE = 'DEMO VENCE EN 3 DIAS';
const S_LOW = 'DEMO SIN FECHA BAJA';
const S_HIGH = 'DEMO SIN FECHA ALTA';
const P4_REM = 'DEMO RECORDATORIO DEL BORRADO';
const P4_PLAIN = 'DEMO PENDIENTE DEL BORRADO';
const REM = 'DEMO RECORDATORIO DE P2';
const CENSO_BAJA = 'DEMO-B1';
const CENSO_CLOSED = 'DEMO-C1';
const CENSO_M = ['DEMO-M1', 'DEMO-M2', 'DEMO-M3', 'DEMO-M4 REVISAR RESULTADO DE CULTIVO DE ORINA Y AJUSTAR ANTIBIOTICO SEGUN ANTIBIOGRAMA FINALIZADO'];
const MON_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Every text string drawn in a PDF (content streams inflated, hex strings decoded). */
function pdfText(buf) {
  let out = '';
  for (const m of buf.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    let t = m[1];
    try { t = zlib.inflateSync(Buffer.from(t, 'latin1')).toString('latin1'); } catch { /* not deflated */ }
    for (const h of t.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) out += Buffer.from(h[1], 'hex').toString('latin1') + '\n';
    for (const x of t.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) out += x[1] + '\n';
  }
  return out;
}

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
  await goArea(page, 'nota');
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
  await goArea(page, 'lab');
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
  check('primary button reads «Agregar pendiente»', (await m.locator('[data-wb-todo-add-ok]').innerText()).trim() === 'Agregar pendiente');
  await m.locator('.wb-todo-add-text').fill('   \n  ');
  await m.locator('[data-wb-todo-add-ok]').click();
  check('whitespace-only text is refused: form stays open, nothing added', (await m.isVisible()) && (await listState(page)).length === 0);
  await m.locator('.wb-todo-add-text').fill('');
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
  check('«Mañana 08:00» quick-preset chip sets the same due date the picker would (Próximos, no bell)',
    presetLabel === 'Mañana 08:00' && presetSelection === 'Mañana 08:00' &&
      /^Próximos/.test(groupOf(s, RX)?.title || '') && rxRow?.vence === 'Mañana' && !rxRow?.vence.includes('🔔') && rxRow?.enCurso === false,
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
  const order = (await listState(page)).map((g) => (g.title || '').replace(/\s*·?\s*\d+\s*$/, '').trim());
  check('groups read Vencidos, Hoy, Próximos, Sin fecha, then Cerrados last',
    order.length === 5 && JSON.stringify(order.slice(0, 4)) === JSON.stringify(['Vencidos', 'Hoy', 'Próximos', 'Sin fecha']) && /^Cerrados/.test(order[4]), order);
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
    const end = window.performance.now() + 2500;
    const tick = () => {
      for (const i of document.querySelectorAll('.todo-text-input')) if (i.getBoundingClientRect().width > 0) window.__seen.add(i.value);
      if (window.performance.now() < end) requestAnimationFrame(tick);
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
  await again.page.locator('.topbar-area-btn').waitFor({ state: 'visible', timeout: 30000 });
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
  check('restart: preset-added Rx still Próximos, Mañana', /^Próximos/.test(groupOf(s, RX)?.title || '') && rowOf(s, RX)?.vence === 'Mañana', groupOf(s, RX));
  const pg = again.page;
  const confirmPg = pg.locator('.wb-confirm-modal', { hasText: '¿Eliminar este pendiente?' });
  const day = (n, h, mi = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, h, mi);
  const dueText = (d) => {
    const ref = new Date();
    const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (d.toDateString() === ref.toDateString()) return `Hoy ${t}`;
    if (d.toDateString() === new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1).toDateString()) return `Mañana ${t}`;
    return `${d.getDate()} ${MON_ES[d.getMonth()]} ${t}`;
  };

  // ── List render: empty groups omitted, counts, one column head, closed row, destructive confirm ──
  const titles = (await listState(pg)).map((g) => g.title);
  check('empty groups are omitted (no «Sin fecha» while none is open) and headers read "Título · N"',
    !titles.some((t) => /^Sin fecha/.test(t)) && titles[0] === 'Vencidos · 1' && titles[1] === 'Hoy · 1' && titles[2] === 'Próximos · 1', titles);
  const chrome = await pg.evaluate(() => ({
    colheads: [...document.querySelectorAll('.wb-table-colhead')].filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => ({ text: e.innerText.replace(/\s+/g, ' ').trim(), group: e.closest('.todo-group')?.className })),
    listoCount: document.querySelector('.todo-group--listo .wb-todo-group-count')?.textContent,
    closedAccion: document.querySelectorAll('.todo-group--listo .wb-todo-accion').length,
    badgeText: [...document.querySelectorAll('[id^="exp-pendientes-badge"]')].map((e) => e.textContent),
  }));
  check('one column head (Prior. / Pendiente / Quién / Vence), only on the first open group',
    chrome.colheads.length === 1 && /^prior\. pendiente quién vence$/i.test(chrome.colheads[0].text) && /todo-group--vencido/.test(chrome.colheads[0].group), chrome.colheads);
  check('«Cerrados» shows its count in a separate span; closed rows have no Acción buttons',
    chrome.listoCount === '1' && chrome.closedAccion === 0, chrome);
  check('the Pendientes tab badge is a number-free dot', chrome.badgeText.every((t) => t === ''), chrome.badgeText);
  await (await row(pg, RX)).locator('.wb-todo-del-btn').click();
  check('the delete confirm is the destructive kind', await pg.locator('.wb-confirm-modal--destructive', { hasText: '¿Eliminar este pendiente?' }).isVisible());
  await confirmPg.getByRole('button', { name: 'Cancelar' }).click();
  await addPendiente(pg, { text: TMP });
  await pg.evaluate(() => {
    window.__ghost = false;
    new (document.defaultView.MutationObserver)(() => { if (document.querySelector('.row-exit')) window.__ghost = true; })
      .observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  });
  await (await row(pg, TMP)).locator('.wb-todo-del-btn').click();
  await confirmPg.getByRole('button', { name: 'Eliminar' }).click();
  await pg.waitForTimeout(1200);
  check('deleting leaves a fading ghost row before the list re-settles', await pg.evaluate(() => window.__ghost));
  const faded = await pg.evaluate(() => [...document.querySelectorAll('.wb-todo-row')].filter((e) => e.getBoundingClientRect().width > 0)
    .map((e) => ({ cls: e.className, o: document.defaultView.getComputedStyle(e).opacity })).filter((x) => x.o !== '1'));
  check('after the exit animation no row keeps a faded opacity', faded.length === 0, faded);

  // ── Due: sort inside a group, date labels, quick chips, picker reopen, preset editor ──
  const early = await addPendiente(pg, { text: EARLY, prio: 'BAJA', due: day(2, 10) });
  await addPendiente(pg, { text: LATE, prio: 'ALTA', due: day(3, 10) });
  await addPendiente(pg, { text: S_LOW, prio: 'BAJA' });
  await addPendiente(pg, { text: S_HIGH, prio: 'ALTA' });
  s = await listState(pg);
  const namesIn = (t) => (groupOf(s, t)?.rows || []).map((x) => x.text);
  check('inside «Próximos» the earlier date comes first, whatever the priority', JSON.stringify(namesIn(EARLY)) === JSON.stringify([RX, EARLY, LATE]), namesIn(EARLY));
  check('inside «Sin fecha» ALTA comes before BAJA', JSON.stringify(namesIn(S_HIGH)) === JSON.stringify([S_HIGH, S_LOW]), namesIn(S_HIGH));
  check('later date: row reads «D mes», the picker selection «D mes HH:MM»; a «Hoy» row shows just the time «23:59»',
    rowOf(s, EARLY)?.vence === dueText(day(2, 10)).replace(/ 10:00$/, '') && early.due.trim() === dueText(day(2, 10)) && /^23:59/.test(rowOf(s, HC2)?.vence || ''),
    { row: rowOf(s, EARLY)?.vence, picked: early.due, hoy: rowOf(s, HC2)?.vence });
  await pg.locator('.todo-toolbar-add-btn:visible').click();
  const mm = pg.locator('.wb-todo-add-modal');
  const chipLabels = (await mm.locator('.todo-due-preset-chip').allInnerTexts()).map((t) => t.trim());
  check('quick chips read Hoy 18:00, Mañana 08:00, En 3 h, En 24 h', JSON.stringify(chipLabels) === JSON.stringify(['Hoy 18:00', 'Mañana 08:00', 'En 3 h', 'En 24 h']), chipLabels);
  const picked = {};
  for (const id of ['hoy-18', 'en-3h', 'en-24h']) {
    await mm.locator(`.todo-due-preset-chip[data-preset="${id}"]`).click();
    picked[id] = (await mm.locator('.todo-due-selection').textContent()).trim();
  }
  const t18 = new Date();
  const h18 = t18.getHours() * 60 + t18.getMinutes() >= 18 * 60 ? 'Mañana 18:00' : 'Hoy 18:00';
  const okNear = (got, h) => [0, 60000].some((ms) => got === dueText(new Date(Date.now() - ms + h * 3600000)));
  check('«Hoy 18:00» chip (rolls to tomorrow once 18:00 has passed), «En 3 h» and «En 24 h» set now + that offset',
    picked['hoy-18'] === h18 && okNear(picked['en-3h'], 3) && okNear(picked['en-24h'], 24), picked);
  await mm.locator('[data-wb-todo-add-cancel]').click();

  await pg.locator('.todo-toolbar-add-btn:visible').click();
  await mm.locator('.todo-due-toggle').click();
  const dt = pg.locator('#todo-due-modal-datetime');
  await dt.fill(localInput(day(4, 15, 30)));
  await pg.locator('#todo-due-modal-save').click();
  await mm.locator('.todo-due-toggle').click();
  check('reopening the «Fecha límite» picker shows the date already chosen', (await dt.inputValue()) === localInput(day(4, 15, 30)), await dt.inputValue());

  // Preset editor, inside that same picker.
  const chipsIn = () => pg.locator('#todo-due-modal-presets .todo-due-preset-chip').allInnerTexts().then((a) => a.map((t) => t.trim()));
  const editBtn = pg.locator('#todo-due-edit-presets-btn');
  const editRows = pg.locator('#todo-due-modal-preset-edit-rows .todo-due-preset-edit-row');
  await editBtn.click();
  check('«Editar» opens the shortcut editor: 4 rows, button reads «Listo», «Restablecer» shown',
    (await editRows.count()) === 4 && (await editBtn.innerText()).trim() === 'Listo' && (await pg.locator('#todo-due-reset-presets-btn').isVisible()));
  await editRows.locator('.todo-due-preset-hours-input').first().fill('5');
  await editBtn.click();
  const afterHours = await chipsIn();
  check('changing a shortcut\'s hours to 5 renames its chip «En 5 h» (the label follows the value)', afterHours[2] === 'En 5 h', afterHours);
  await pg.locator('#todo-due-modal-presets .todo-due-preset-chip[data-preset="en-3h"]').click();
  check('the edited chip sets now + 5 h', okNear(dueText(new Date(await dt.inputValue())), 5), await dt.inputValue());
  await editBtn.click();
  await pg.locator('#todo-due-add-preset-offset-btn').click();
  await pg.locator('#todo-due-modal-preset-edit-rows [data-preset-id="en-24h"] .todo-due-preset-delete').click();
  await editBtn.click();
  const afterEdit = await chipsIn();
  check('adding a shortcut (En 6 h) and deleting «En 24 h» updates the chips', JSON.stringify(afterEdit) === JSON.stringify(['Hoy 18:00', 'Mañana 08:00', 'En 5 h', 'En 6 h']), afterEdit);
  await editBtn.click();
  await pg.locator('#todo-due-reset-presets-btn').click();
  await editBtn.click();
  const afterReset = await chipsIn();
  check('«Restablecer» brings back the four default shortcuts', JSON.stringify(afterReset) === JSON.stringify(['Hoy 18:00', 'Mañana 08:00', 'En 3 h', 'En 24 h']), afterReset);
  await pg.locator('#todo-due-modal-cancel').click();
  await mm.locator('[data-wb-todo-add-cancel]').click();

  // ── Reminder toast, patient delete, Exportar censo (P2 / P4) ───────────────
  await goArea(pg, 'lab');
  await pasteAndSave(pg, fullLabs(P4, 'Sep 20 2026 9:30AM'));
  await openPatient(pg, P4);
  const remDue = new Date(Date.now() + 60000);
  remDue.setSeconds(0, 0);
  if (remDue.getTime() - Date.now() < 60000) remDue.setTime(remDue.getTime() + 60000);
  await goPendientes(pg);
  await addPendiente(pg, { text: P4_REM, prio: 'BAJA', due: remDue, remind: true });
  await addPendiente(pg, { text: P4_PLAIN });
  check('P4 shows its two pendientes before it is deleted', (await listState(pg)).flatMap((g) => g.rows).length === 2);
  const p4Card = pg.locator('.patient-card', { has: pg.locator(`.p-name[title*="${P4.exp}"]`) }).first();
  await p4Card.hover();
  await p4Card.locator('.btn-delete-card').click();
  const okBtn = pg.locator('.wb-confirm-modal [data-wb-confirm-ok]');
  if (await okBtn.isVisible({ timeout: 1500 }).catch(() => false)) await okBtn.click();
  await pg.waitForTimeout(600);
  check('deleting a patient that has pendientes removes the patient', (await pg.locator(`.p-name[title*="${P4.exp}"]`).count()) === 0);

  await openPatient(pg, P2);
  await goPendientes(pg);
  await addPendiente(pg, { text: REM, prio: 'BAJA', due: remDue, remind: true });
  await addPendiente(pg, { text: CENSO_BAJA, prio: 'BAJA' });
  await addPendiente(pg, { text: CENSO_M[0] });
  await addPendiente(pg, { text: CENSO_M[1] });
  await addPendiente(pg, { text: CENSO_M[2] });
  await addPendiente(pg, { text: CENSO_M[3] });
  await addPendiente(pg, { text: CENSO_CLOSED, prio: 'ALTA' });
  await (await row(pg, CENSO_CLOSED)).locator('.wb-todo-listo-btn').click();
  await pg.waitForTimeout(500);
  await closeToasts(pg);

  await pg.locator('#btn-export-censo-header').click();
  await pg.locator('#censo-export-preview').click();
  const frame = pg.frameLocator('#censo-preview-frame');
  await frame.locator('td[data-k="dx"]').first().waitFor({ state: 'attached' });
  const pendBox = pg.locator('#censo-preview-cols input[data-censo-col="pend"]');
  if (!(await pendBox.isChecked())) await pg.locator('#censo-preview-cols label', { has: pendBox }).click();
  await pg.waitForTimeout(600);
  const cell = async (name) => (await frame.locator('tr', { hasText: name }).locator('td[data-k="pend"]').first().innerText()).trim();
  const p2Cell = await cell(P2.name);
  check('Exportar censo, P2 «Pend.»: first tier with items (MEDIA), newest three, full text; BAJA and closed ALTA left out',
    [CENSO_M[3], CENSO_M[2], CENSO_M[1]].every((t) => p2Cell.includes(t)) && !p2Cell.includes(CENSO_M[0]) && !p2Cell.includes(CENSO_BAJA) && !p2Cell.includes(REM) && !p2Cell.includes(CENSO_CLOSED), p2Cell);
  const p1Cell = await cell(P1.name);
  check('Exportar censo, P1 «Pend.»: ALTA tier wins over MEDIA/BAJA, closed ones excluded',
    p1Cell.includes(S_HIGH) && p1Cell.includes(LATE) && p1Cell.includes(TAC) && !p1Cell.includes(HC2) && !p1Cell.includes(RX) && !p1Cell.includes(IC), p1Cell);
  check('UNREACHABLE (formatPendientesForCenso all:true has no caller): the preview caps at 3 like the PDF, so no uncapped preview to see',
    p2Cell.split('\n').filter((l) => l.trim()).length === 3, p2Cell);
  const t0 = Date.now();
  await pg.locator('#censo-preview-generate').click();
  let pdfFile = null;
  await until(async () => {
    pdfFile = fs.readdirSync(r.downloadsDir).filter((f) => f.endsWith('.pdf')).map((f) => path.join(r.downloadsDir, f)).find((f) => fs.statSync(f).mtimeMs > t0) || null;
    return !!pdfFile;
  }, 30000, 250);
  await pg.waitForTimeout(500);
  const pdf = pdfFile ? pdfText(fs.readFileSync(pdfFile)) : '';
  check('PDF «Pendientes» column: the three newest MEDIA of P2, the long one whole; nothing from the excluded ones',
    !!pdfFile && pdf.includes(CENSO_M[2]) && pdf.includes(CENSO_M[1]) && pdf.includes('FINALIZADO') && pdf.includes('REVISAR') && !pdf.includes(CENSO_M[0]) && !pdf.includes(CENSO_BAJA) && !pdf.includes(CENSO_CLOSED), pdf.slice(0, 300));
  await pg.locator('#censo-preview-close').click();

  // The reminder set for the same minute: P2's toast shows, the deleted P4's never does.
  await goPendientes(pg);
  const remToast = pg.locator('.toast', { hasText: REM });
  check('«Recordarme» reminder shows the toast "Pendiente · <paciente> — <texto>" at its time',
    await remToast.first().waitFor({ state: 'visible', timeout: Math.max(5000, remDue.getTime() - Date.now() + 70000) }).then(() => true, () => false),
    await pg.locator('.toast').allInnerTexts());
  check('the toast names the patient', /Pendiente · .*DEMO PENDIENTE DOS.* — /.test(await remToast.first().innerText().catch(() => '')));
  await pg.waitForTimeout(2500);
  check('the deleted patient\'s reminder never fires (no orphan pendientes left scheduled)', (await pg.locator('.toast', { hasText: P4_REM }).count()) === 0);

  // ── Closed overdue row leaves «Vencidos» ────────────────────────────────
  await openPatient(pg, P1);
  await goPendientes(pg);
  await (await row(pg, TAC)).locator('.wb-todo-listo-btn').click();
  await pg.waitForTimeout(800);
  s = await listState(pg);
  check('closing an overdue pendiente: «Vencidos» is gone, the row sits in «Cerrados» without the red mark',
    !s.some((g) => /^Vencidos/.test(g.title)) && /^Cerrados/.test(groupOf(s, TAC)?.title || '') && !rowOf(s, TAC)?.alert, s.map((g) => g.title));
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
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();
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
    await goArea(d.page, 'lab');
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

  // ── Handoff: a teammate's pendiente shows «De @user», the Entrega chip and «Recibido» ──
  const HAND = 'DEMO PENDIENTE DE ENTREGA';
  const HAND2 = 'DEMO PENDIENTE DE ENTREGA EDITADO';
  const BOWN = 'DEMO PENDIENTE PROPIO DE B';
  const handInfo = (page) => page.evaluate(() => ({
    chip: document.querySelector('.todo-filter-chip[data-filter="handoff"] .todo-filter-count')?.textContent ?? null,
    active: document.querySelector('.todo-filter-chip.is-active')?.dataset.filter ?? null,
    empty: document.querySelector('.todo-empty:not([hidden])')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
    rows: [...document.querySelectorAll('.wb-todo-row:not(.row-exit):not(.row-exit-done)')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({
      text: e.querySelector('.todo-text-input')?.value,
      quien: e.querySelector('.wb-todo-quien')?.textContent.trim(),
      handoff: e.classList.contains('wb-todo-row--handoff'),
      ack: !!e.querySelector('.wb-todo-ack-btn'),
    })),
  }));
  const filterChip = (page, id) => page.locator(`.todo-filter-chip[data-filter="${id}"]`);
  await addPendiente(A.page, { text: HAND, prio: 'ALTA', due: day(1, 9) });
  check('the other device gets the pendiente with its due date and priority', await until(async () => {
    await goPendientes(B.page);
    const x = rowOf(await listState(B.page), HAND);
    return x?.vence === 'Mañana' && x?.prio === 'ALTA';
  }, 45000, 2000));
  await addPendiente(B.page, { text: BOWN });
  let hb = await handInfo(B.page);
  const hRow = hb.rows.find((x) => x.text === HAND);
  const bRow = hb.rows.find((x) => x.text === BOWN);
  check('B: the teammate\'s row reads «De @user», is marked handoff and offers «Recibido»; B\'s own row has none of it',
    hRow?.quien === `De @${RA.username}` && hRow?.handoff && hRow?.ack && bRow?.quien === `@${RB.username}` && !bRow?.handoff && !bRow?.ack, hb.rows);
  check('B: the «Entrega» chip counts 1', hb.chip === '1', hb.chip);
  await filterChip(B.page, 'handoff').click();
  hb = await handInfo(B.page);
  check('B: the «Entrega» filter lists only the teammate\'s pendiente', JSON.stringify(hb.rows.map((x) => x.text)) === JSON.stringify([HAND]), hb);
  await filterChip(B.page, 'all').click();
  check('A: sees B\'s pendiente as an incoming handoff, its own as not', await until(async () => {
    await goPendientes(A.page);
    const ha = await handInfo(A.page);
    return ha.chip === '1' && ha.rows.find((x) => x.text === BOWN)?.quien === `De @${RB.username}` && ha.rows.find((x) => x.text === HAND)?.quien === `@${RA.username}`;
  }, 45000, 2000));
  await filterChip(A.page, 'handoff').click();
  const ha = await handInfo(A.page);
  check('A: «Entrega» lists B\'s pendiente only', JSON.stringify(ha.rows.map((x) => x.text)) === JSON.stringify([BOWN]), ha);
  await filterChip(A.page, 'all').click();
  await (await row(B.page, HAND)).locator('.wb-todo-ack-btn').click();
  await B.page.waitForTimeout(500);
  hb = await handInfo(B.page);
  check('B: «Recibido» clears the handoff mark and the Entrega count', !hb.rows.find((x) => x.text === HAND)?.handoff && !hb.rows.find((x) => x.text === HAND)?.ack && hb.chip === '0', hb);
  await filterChip(B.page, 'handoff').click();
  hb = await handInfo(B.page);
  check('B: the empty «Entrega» filter says «Sin pendientes del turno anterior»', /Sin pendientes del turno anterior/.test(hb.empty || ''), hb.empty);
  await filterChip(B.page, 'all').click();

  // ── Merge by updatedAt across devices: the newer edit wins, due date and priority stay ──
  const inp = (await row(B.page, HAND)).locator('.todo-text-input');
  await inp.fill(HAND2);
  await inp.press('Enter');
  check('B\'s newer text edit reaches A with due date and priority kept', await until(async () => {
    await goPendientes(A.page);
    const x = rowOf(await listState(A.page), HAND2);
    return x?.vence === 'Mañana' && x?.prio === 'ALTA' && !rowOf(await listState(A.page), HAND);
  }, 45000, 2000));
  await (await row(A.page, HAND2)).locator('.wb-todo-prior').click();
  check('A\'s newer priority edit reaches B without undoing B\'s text', await until(async () => {
    await goPendientes(B.page);
    const x = rowOf(await listState(B.page), HAND2);
    return x?.prio === 'MEDIA' && x?.vence === 'Mañana';
  }, 45000, 2000));
  await A.app.close();
  await B.app.close();
  await stopWorker();
});
