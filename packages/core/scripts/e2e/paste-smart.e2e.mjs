#!/usr/bin/env node
/* global document */
/**
 * E2E: paste-anywhere and the ⌘K palette — a SOME report pasted with nothing
 * focused goes to the right census patient, and never to a different
 * expediente. Driven through the real Electron app and the real system
 * clipboard. Synthetic DEMO patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Paste anywhere
 *     - a report whose expediente is on the census asks for a confirm, or
 *       lands on the open patient instead of its own
 *     - a loose registro does not open that patient
 *     - a loose registro pasted inside a text box is hijacked (never reaches the box)
 *   Expediente not on the census
 *     - a census patient with the same name but another expediente is offered
 *       («Confirmar paciente» / «¿A qué paciente pertenece?») — found: the
 *       offer was a dead end, the pick was then refused with "Registro … no
 *       está en la lista. No se guardó" (name matching now only considers
 *       census patients with no registro yet)
 *     - the report is filed under that same-name patient anyway
 *     - the new-patient preview does not show the report's own expediente
 *   Two expedientes in one report
 *     - anything is saved, or the refusal does not name both expedientes
 *   ⌘K
 *     - typing a patient name + Enter does not open that patient
 *     - «Procesar SOME» does not read the clipboard, or files to the wrong patient
 *   Throughout
 *     - an uncaught page error
 *
 * Artifact: e2e-artifacts/paste-smart/<run-id>/ (report.json, screenshots).
 *
 *   npm run e2e:paste-smart
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, until } from './harness.mjs';
import { fullLabs, gas } from './some-fixtures.mjs';

const UNO = { exp: '7000901-1', name: 'DEMO PEGADO UNO', room: '901' };
const DOS = { exp: '7000902-2', name: 'DEMO PEGADO DOS', room: '902' };
const VEGA = { exp: '7000903-3', name: 'DEMO SOLO VEGA TOMAS', room: '903' };
const ANA = { exp: '7000904-4', name: 'DEMO ROJAS LUNA ANA', room: '904' };
const BEA = { exp: '7000905-5', name: 'DEMO ROJAS LUNA BEA', room: '905' };
const CENSUS = [UNO, DOS, VEGA, ANA, BEA];

const r = createRun('paste-smart');
const { check } = r;

const activeReg = (page) =>
  page.evaluate(() => (document.querySelector('.patient-card.active .p-name')?.getAttribute('title') || '').match(/\d{7}-\d/)?.[0] || null);
const hasDay = (days, dd) => days.some((d) => d.startsWith(`${dd}/09/2026`));

/** Lab dates for p, as the Laboratorio date picker lists them. */
async function labDays(page, p) {
  await openPatient(page, p);
  if (!(await page.locator('#lab-inner-labs-btn').isVisible())) await page.locator('#apptab-lab').click();
  await page.locator('#lab-inner-labs-btn').click().catch(() => {});
  await page.waitForTimeout(300);
  return page.locator('#lab-history-date-select option').allTextContents();
}

/** Put text on the real clipboard and press the paste shortcut with nothing focused. */
async function pasteAnywhere(app, page, text) {
  await closeToasts(page);
  await app.evaluate(({ clipboard }, t) => clipboard.writeText(t), text);
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await page.keyboard.press('ControlOrMeta+V');
  await page.waitForTimeout(600);
}

/** Confirm the lab preview if one opens (a routed paste may skip it). */
async function confirmPreviewIfAny(page) {
  const confirm = page.locator('#lab-bulk-preview-confirm');
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click();
  await page.waitForTimeout(800);
}

/** Text of the open lab preview dialog ('' if none opened). */
async function previewText(page) {
  const confirm = page.locator('#lab-bulk-preview-confirm');
  if (!(await confirm.isVisible({ timeout: 4000 }).catch(() => false))) return '';
  return (await page.locator('.modal-backdrop.open', { has: confirm }).innerText()).replace(/\s+/g, ' ');
}

/** Close the preview without saving and leave the paste box empty. */
async function cancelPreview(page) {
  if (await page.locator('#lab-bulk-preview-confirm').isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.locator('#lab-bulk-preview-confirm').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  if (await page.locator('#lab-input').isVisible().catch(() => false)) await page.locator('#lab-input').fill('');
}

await r.finish('Paste anywhere + ⌘K: route SOME to the right patient', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  for (const [i, p] of CENSUS.entries()) await pasteAndSave(page, fullLabs(p, `Sep 20 2026 ${7 + i}:00AM`));
  for (const p of CENSUS) await openPatient(page, p);

  // ── Expediente on the census → straight to its own patient ───────────────
  await openPatient(page, DOS);
  await pasteAnywhere(app, page, gas(UNO, 'Sep 21 2026 6:00AM', '7.31'));
  check('census expediente → no confirm dialog', !(await page.locator('#paste-smart-modal').isVisible().catch(() => false)));
  await confirmPreviewIfAny(page);
  check('census expediente → opens that patient, not the one that was open',
    await until(async () => (await activeReg(page)) === UNO.exp, 5000), await activeReg(page));
  const unoDays = await labDays(page, UNO);
  check('the pasted gas is on UNO\'s lab history (21/09)', hasDay(unoDays, 21), unoDays);
  const dosDays = await labDays(page, DOS);
  check('nothing leaked to DOS', !hasDay(dosDays, 21), dosDays);
  await r.shot(page, 'routed');

  // ── Loose registro → that patient ────────────────────────────────────────
  await openPatient(page, UNO);
  await pasteAnywhere(app, page, DOS.exp);
  check('a loose registro opens that patient', await until(async () => (await activeReg(page)) === DOS.exp, 5000), await activeReg(page));

  // ── A loose registro pasted inside a text box stays in the box ───────────
  await closeToasts(page);
  await app.evaluate(({ clipboard }, t) => clipboard.writeText(t), UNO.exp);
  await page.locator('#patient-search').focus();
  await page.keyboard.press('ControlOrMeta+V');
  await page.waitForTimeout(600);
  const searchVal = await page.locator('#patient-search').inputValue();
  check('a registro pasted in the search box stays in the box', searchVal === UNO.exp, searchVal);
  await page.locator('#patient-search').fill('');
  await page.waitForTimeout(300);
  check('…and does not switch patient', (await activeReg(page)) === DOS.exp, await activeReg(page));

  // ── Expediente not on the census, same name as a census patient ──────────
  const modal = page.locator('#paste-smart-modal');
  const vegaForeign = { ...VEGA, exp: '7999903-3' };
  await pasteAnywhere(app, page, gas(vegaForeign, 'Sep 23 2026 6:00AM', '7.29'));
  const offeredVega = await modal.isVisible().catch(() => false);
  check('same name, other expediente → VEGA is not offered as the owner', !offeredVega,
    offeredVega ? (await modal.innerText()).replace(/\s+/g, ' ') : null);
  const preview = await previewText(page);
  check('the new-patient preview shows the report\'s own expediente, not VEGA\'s',
    preview.includes(vegaForeign.exp) && !preview.includes(VEGA.exp), preview.slice(0, 300));
  await r.shot(page, 'unknown-expediente');
  await cancelPreview(page);
  const vegaDays = await labDays(page, VEGA);
  check('nothing filed under VEGA', !hasDay(vegaDays, 23), vegaDays);

  // Two close names (ANA / BEA) and a report for neither expediente.
  const rojas = { exp: '7999904-4', name: 'DEMO ROJAS LUNA' };
  await pasteAnywhere(app, page, gas(rojas, 'Sep 24 2026 6:00AM', '7.28'));
  const offeredRojas = await modal.isVisible().catch(() => false);
  check('close names, other expediente → no «¿A qué paciente pertenece?» dead end', !offeredRojas,
    offeredRojas ? (await modal.innerText()).replace(/\s+/g, ' ') : null);
  await cancelPreview(page);
  const beaDays = await labDays(page, BEA);
  const anaDays = await labDays(page, ANA);
  check('nothing filed under ANA or BEA', !hasDay(beaDays, 24) && !hasDay(anaDays, 24), { beaDays, anaDays });

  // ── Two expedientes glued in one report → refused ────────────────────────
  const glued = gas(UNO, 'Sep 25 2026 6:00AM', '7.27') + '\n' + gas(DOS, 'Sep 25 2026 6:00AM', '7.26');
  await pasteAnywhere(app, page, glued);
  const refusal = await page.locator('.toast').allInnerTexts();
  await cancelPreview(page);
  const unoAfter = await labDays(page, UNO);
  const dosAfter = await labDays(page, DOS);
  check('two expedientes in one report: refused naming both, nothing saved',
    !hasDay(unoAfter, 25) && !hasDay(dosAfter, 25) && refusal.some((t) => t.includes(UNO.exp) && t.includes(DOS.exp)),
    { refusal, unoAfter, dosAfter });

  // ── ⌘K ───────────────────────────────────────────────────────────────────
  await openPatient(page, UNO);
  await closeToasts(page);
  await page.locator('#btn-header-cmdk').click();
  const input = page.locator('.cmdk-input');
  await input.waitFor({ state: 'visible' });
  await input.fill('pegado dos');
  await page.waitForTimeout(250);
  await input.press('Enter');
  check('⌘K: typing a name + Enter opens that patient', await until(async () => (await activeReg(page)) === DOS.exp, 5000), await activeReg(page));

  await app.evaluate(({ clipboard }, t) => clipboard.writeText(t), gas(ANA, 'Sep 26 2026 6:00AM', '7.35'));
  await page.locator('#btn-header-cmdk').click();
  await input.waitFor({ state: 'visible' });
  await input.fill('procesar some');
  await page.waitForTimeout(250);
  await page.locator('.cmdk-item', { hasText: 'Procesar SOME' }).first().click();
  await confirmPreviewIfAny(page);
  const anaAfter = await labDays(page, ANA);
  check('⌘K «Procesar SOME» reads the clipboard and files it under the report\'s patient (ANA)', hasDay(anaAfter, 26), anaAfter);
  const dosAfterCmdk = await labDays(page, DOS);
  check('…not under the patient that was open (DOS)', !hasDay(dosAfterCmdk, 26), dosAfterCmdk);
  await r.shot(page, 'cmdk');

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
