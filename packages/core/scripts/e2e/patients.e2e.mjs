#!/usr/bin/env node
/* global document */
/**
 * E2E: the patient census in the sidebar — find, walk, pin/archive, delete one,
 * delete many, undo, restart. Driven through the real Electron app. Synthetic
 * DEMO patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Search
 *     - typing a name / registro / cuarto hides the wrong patients
 *     - clearing the box does not bring the whole census back
 *   ↑ / ↓ walk
 *     - ↓ / ↑ do not move to the next / previous visible patient, or do not wrap
 *     - arrows typed inside the search box still change the open patient
 *   Pin / archive
 *     - «Fijar» does not move the patient to the top of the census
 *     - «Archivar» leaves the patient among the active ones
 *   Delete one (×)
 *     - × removes the wrong patient, or also opens it
 *     - the toast does not say "1 paciente eliminado"
 *   Delete many
 *     - in selection mode × selects instead of deleting, and the count is wrong
 *     - «Cancelar» deletes the selection anyway, or leaves selection mode on
 *     - «Eliminar» removes patients that were not selected
 *     - the toast does not say "N pacientes eliminados"
 *   Undo (Ajustes › Deshacer última operación)
 *     - the last delete cannot be undone, or undo brings back the wrong patients
 *   Restart
 *     - deleted patients come back after a restart (tombstones lost)
 *     - kept patients, pin or archive are lost after a restart
 *   Re-admit
 *     - a registro that was deleted cannot be admitted again from a new paste
 *   Throughout
 *     - an uncaught page error
 *
 * Artifact: e2e-artifacts/patients/<run-id>/ (report.json, screenshots).
 *
 *   npm run e2e:patients
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, dismissLearnHub, until } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const P = [
  { exp: '7000801-1', name: 'DEMO CENSO ALFA', room: '801' },
  { exp: '7000802-2', name: 'DEMO CENSO BETA', room: '802' },
  { exp: '7000803-3', name: 'DEMO CENSO GAMMA', room: '803' },
  { exp: '7000804-4', name: 'DEMO CENSO DELTA', room: '804' },
  { exp: '7000805-5', name: 'DEMO CENSO EPSILON', room: '805' },
];
const [ALFA, BETA, GAMMA, DELTA, EPSILON] = P;

const r = createRun('patients');
const { check } = r;

/** Registros of the census cards the user can see, top to bottom. */
const visibleRegs = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.patient-card')]
      .filter((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0)
      .map((el) => (el.querySelector('.p-name')?.getAttribute('title') || '').match(/\d{7}-\d/)?.[0] || '?'),
  );
/** Registros in the active section (not archived), top to bottom. */
const activeRegs = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.patient-card:not(.patient-card--archived)')]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => (el.querySelector('.p-name')?.getAttribute('title') || '').match(/\d{7}-\d/)?.[0] || '?'),
  );
const allRegs = (page) =>
  page.evaluate(() => [...document.querySelectorAll('.patient-card .p-name')].map((el) => (el.getAttribute('title') || '').match(/\d{7}-\d/)?.[0] || '?'));
const activeCardReg = (page) =>
  page.evaluate(() => (document.querySelector('.patient-card.active .p-name')?.getAttribute('title') || '').match(/\d{7}-\d/)?.[0] || null);
const card = (page, p) => page.locator('.patient-card', { has: page.locator(`.p-name[title*="${p.exp}"]`) }).first();
const toast = (page, re, timeout = 8000) =>
  page.locator('.toast', { hasText: re }).first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);

async function search(page, text) {
  await page.locator('#patient-search').fill(text);
  await page.waitForTimeout(400);
  return visibleRegs(page);
}

/** Hover the card so its toolbar is live, then click a toolbar control like a user. */
async function cardAction(page, p, selector) {
  const c = card(page, p);
  await c.hover();
  await c.locator(selector).click();
  await page.waitForTimeout(400);
}

async function openAjustes(page) {
  await closeToasts(page);
  await page.locator('#btn-open-settings').click();
  // Ajustes is a tab list: «Respaldos, sync y recuperación» → its panel.
  await page.locator('#settings-nav-settings-accordion-backup-sync').click();
  await page.locator('#settings-accordion-backup-sync').waitFor({ state: 'visible', timeout: 8000 });
  await page.locator('#btn-undo-op').scrollIntoViewIfNeeded();
}

await r.finish('Patient census: search, walk, pin/archive, delete one/many, undo, restart, re-admit', async () => {
  let { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  for (const [i, p] of P.entries()) await pasteAndSave(page, fullLabs(p, `Sep 21 2026 ${8 + i}:00AM`));
  for (const p of P) await openPatient(page, p);
  const start = await visibleRegs(page);
  check('five DEMO patients in the census', P.every((p) => start.includes(p.exp)) && start.length === 5, start);

  // ── Search ────────────────────────────────────────────────────────────────
  check('search by name shows only that patient', JSON.stringify(await search(page, 'gamma')) === JSON.stringify([GAMMA.exp]));
  check('search by registro shows only that patient', JSON.stringify(await search(page, BETA.exp)) === JSON.stringify([BETA.exp]));
  const byRoom = await search(page, DELTA.room);
  check('search by cuarto shows that patient', byRoom.includes(DELTA.exp) && !byRoom.includes(ALFA.exp), byRoom);
  check('nothing matches → empty list', (await search(page, 'ZZZ-NO-EXISTE')).length === 0);
  check('clearing search brings the whole census back', (await search(page, '')).length === 5);
  await r.shot(page, 'census');

  // ── ↑ / ↓ walk ───────────────────────────────────────────────────────────
  const order = await visibleRegs(page);
  await openPatient(page, { exp: order[0] });
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await page.keyboard.press('ArrowDown');
  const afterDown = await until(async () => (await activeCardReg(page)) === order[1] && order[1], 3000);
  check('↓ opens the next patient in the census', !!afterDown, { want: order[1], got: await activeCardReg(page) });
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  const wrapped = await until(async () => (await activeCardReg(page)) === order[order.length - 1] && 1, 3000);
  check('↑ from the first patient wraps to the last', !!wrapped, { want: order[order.length - 1], got: await activeCardReg(page) });
  const beforeTyping = await activeCardReg(page);
  await page.locator('#patient-search').focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);
  check('arrows typed in the search box do not change the open patient', (await activeCardReg(page)) === beforeTyping);
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());

  // ── Pin / archive ────────────────────────────────────────────────────────
  await closeToasts(page);
  await cardAction(page, EPSILON, '.btn-pinned-text');
  const pinnedTop = await activeRegs(page);
  check('«Fijar» moves the patient to the top', pinnedTop[0] === EPSILON.exp, pinnedTop);
  await cardAction(page, DELTA, '.btn-archive-clean');
  const act = await activeRegs(page);
  check('«Archivar» takes the patient out of the active census', !act.includes(DELTA.exp) && (await allRegs(page)).includes(DELTA.exp), act);
  await r.shot(page, 'pin-archive');

  // ── Delete one (×) ───────────────────────────────────────────────────────
  await closeToasts(page);
  await openPatient(page, BETA);
  await cardAction(page, ALFA, '.btn-delete-card');
  const confirmOk = page.locator('.wb-confirm-modal [data-wb-confirm-ok]');
  if (await confirmOk.isVisible({ timeout: 1500 }).catch(() => false)) await confirmOk.click();
  check('× → "1 paciente eliminado"', await toast(page, /1 paciente eliminado/));
  const afterOne = await allRegs(page);
  check('× removed only that patient', !afterOne.includes(ALFA.exp) && afterOne.length === 4, afterOne);
  check('× did not open the deleted patient (the open one stays)', (await activeCardReg(page)) === BETA.exp, await activeCardReg(page));

  // ── Delete many ──────────────────────────────────────────────────────────
  await closeToasts(page);
  await page.locator('#btn-patient-bulk-select').click();
  check('selection mode shows the bulk bar with "0 seleccionados"',
    (await page.locator('#patient-bulk-bar').isVisible()) && /0 seleccionados/.test(await page.locator('#patient-bulk-bar-count').innerText()));
  for (const p of [BETA, GAMMA]) await card(page, p).locator('.p-name').click();
  const n2 = await page.locator('#patient-bulk-bar-count').innerText();
  check('clicking two cards selects them: "2 seleccionados"', /2 seleccionados/.test(n2), n2);
  check('selected cards are marked', await until(async () => (await page.locator('.patient-card--bulk-selected').count()) === 2, 3000));
  await page.locator('.btn-patient-bulk-cancel').click();
  await page.waitForTimeout(300);
  const afterCancel = await allRegs(page);
  check('«Cancelar» deletes nothing and leaves selection mode',
    afterCancel.length === 4 && !(await page.locator('#patient-bulk-bar').isVisible()) &&
    (await page.locator('.patient-card--bulk-selected').count()) === 0, afterCancel);

  await page.locator('#btn-patient-bulk-select').click();
  for (const p of [BETA, GAMMA]) await card(page, p).locator('.p-name').click();
  await r.shot(page, 'bulk-selected');
  await page.locator('.btn-patient-bulk-delete').click();
  if (await confirmOk.isVisible({ timeout: 1500 }).catch(() => false)) await confirmOk.click();
  check('«Eliminar» → "2 pacientes eliminados"', await toast(page, /2 pacientes eliminados/));
  const afterBulk = await allRegs(page);
  check('bulk delete removed exactly the two selected', JSON.stringify([...afterBulk].sort()) === JSON.stringify([DELTA.exp, EPSILON.exp].sort()), afterBulk);
  check('selection mode ends after deleting', !(await page.locator('#patient-bulk-bar').isVisible()));

  // ── Undo the bulk delete ─────────────────────────────────────────────────
  await openAjustes(page);
  const undoBtn = page.locator('#btn-undo-op');
  const undoLabel = await undoBtn.innerText();
  check('Ajustes offers to undo "Eliminar 2 pacientes"', /Deshacer: Eliminar 2 pacientes/.test(undoLabel), undoLabel);
  await undoBtn.click();
  const revert = page.locator('.wb-confirm-modal [data-wb-confirm-ok]');
  await revert.waitFor({ state: 'visible', timeout: 5000 });
  await Promise.all([page.waitForEvent('load', { timeout: 20000 }).catch(() => {}), revert.click()]);
  await page.locator('#patient-list').waitFor({ state: 'visible', timeout: 20000 });
  await dismissLearnHub(page);
  await page.waitForTimeout(800);
  const afterUndo = await allRegs(page);
  check('undo brings back the two deleted, not the earlier × delete',
    [BETA, GAMMA, DELTA, EPSILON].every((p) => afterUndo.includes(p.exp)) && !afterUndo.includes(ALFA.exp), afterUndo);

  // Delete GAMMA again so a tombstone is live across the restart.
  await closeToasts(page);
  await cardAction(page, GAMMA, '.btn-delete-card');
  if (await confirmOk.isVisible({ timeout: 1500 }).catch(() => false)) await confirmOk.click();
  await toast(page, /1 paciente eliminado/);
  check('no page errors before restart', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();

  // ── Restart ──────────────────────────────────────────────────────────────
  ({ app, page, pageErrors } = await r.launch());
  await page.locator('#patient-list').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(page);
  await until(async () => (await allRegs(page)).length > 0, 15000);
  const afterRestart = await allRegs(page);
  check('after restart: deleted patients stay deleted',
    !afterRestart.includes(ALFA.exp) && !afterRestart.includes(GAMMA.exp), afterRestart);
  check('after restart: kept patients are all there',
    [BETA, DELTA, EPSILON].every((p) => afterRestart.includes(p.exp)) && afterRestart.length === 3, afterRestart);
  const restartedActive = await activeRegs(page);
  check('after restart: pin and archive survive', restartedActive[0] === EPSILON.exp && !restartedActive.includes(DELTA.exp), restartedActive);
  await r.shot(page, 'after-restart');

  // ── Re-admit a deleted registro ──────────────────────────────────────────
  await page.locator('#apptab-lab').click();
  await pasteAndSave(page, fullLabs(ALFA, 'Sep 22 2026 8:00AM'));
  const readmit = await until(async () => (await allRegs(page)).includes(ALFA.exp), 8000);
  check('a deleted registro can be admitted again from a new SOME paste', !!readmit, await allRegs(page));

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
