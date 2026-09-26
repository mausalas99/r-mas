#!/usr/bin/env node
/* global document */
/**
 * E2E: archived patients in the Sala card view — see them, open them, restore
 * them. Driven through the real Electron app with synthetic DEMO patients.
 *
 * Ways it can go wrong (each one is a check below):
 *   - an archived patient still shows as a card
 *   - the «Archivados (N)» section is missing, or its count is wrong
 *   - the section shows when nothing is archived
 *   - «Restaurar» does not bring the card back, or restores the wrong patient
 *   - the section folds shut after a restore while others are still archived
 *   - clicking an archived name does not open that patient
 *   - the card's own archive button does not archive, or opens the patient
 *   - the restore is lost after the app restarts
 *   - an uncaught page error
 *
 * Artifact: e2e-artifacts/sala-cards-archive/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:sala-cards-archive
 */
import { createRun, onboardLocalOnly, openPatient, pasteAndSave } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const A = { exp: '7000901-1', name: 'DEMO ARCHIVO UNO', room: '601' };
const B = { exp: '7000902-2', name: 'DEMO ARCHIVO DOS', room: '602' };
const C = { exp: '7000903-3', name: 'DEMO ARCHIVO TRES', room: '603' };

const r = createRun('sala-cards-archive');
const { check, shot } = r;

await r.finish('Sala cards: see and restore archived patients', async () => {
  let { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  for (const p of [A, B, C]) {
    await pasteAndSave(page, fullLabs(p, 'Sep 25 2026 8:00AM'));
    await openPatient(page, p);
  }

  /** Archive p with the sidebar card's own archive button. */
  async function archive(p) {
    const card = page.locator('.patient-card', { has: page.locator(`.p-name[title*="${p.exp}"]`) }).first();
    // dispatchEvent, not a click at coordinates: the list re-sorts under the pointer.
    await card.locator('.btn-archive-clean').dispatchEvent('click');
    await page.locator(`.patient-card--archived .p-name[title*="${p.exp}"]`).waitFor({ state: 'attached', timeout: 5000 });
  }
  await archive(A);
  await archive(B);

  await page.locator('#btn-sala-view-cards').click();
  await page.locator('#sala-view-home .sv-grid').waitFor({ timeout: 5000 });
  const home = page.locator('#sala-view-home');
  const gridNames = () => home.locator('.sv-grid .sv-name').allInnerTexts();
  const archBtn = home.locator('.sv-home-actions [data-sv-arch]');
  const restore = (p) => home.locator('.sv-card-wrap', { hasText: p.name }).locator('.sv-card-restore').click();

  check('archived A and B are not cards; C is', JSON.stringify(await gridNames()) === JSON.stringify([C.name]), await gridNames());
  check('«Archivados 2» button shows', /Archivados\s*2/.test(await archBtn.innerText()), await archBtn.innerText());

  await archBtn.click();
  await home.locator('.sv-card.is-archived').first().waitFor({ timeout: 5000 });
  await shot(page, 'archived-view');
  const names = await gridNames();
  check('archived view shows A and B as cards, not C', names.includes(A.name) && names.includes(B.name) && !names.includes(C.name), names);

  await restore(A);
  await home.locator('.sv-grid .sv-name', { hasText: A.name }).waitFor({ state: 'detached', timeout: 5000 });
  check('Restaurar removes A; still in archived view with B', JSON.stringify(await gridNames()) === JSON.stringify([B.name]), await gridNames());

  await home.locator('.sv-card', { hasText: B.name }).click();
  await page.waitForFunction(() => !document.body.dataset.salaHome, null, { timeout: 5000 });
  const activeTitle = await page.locator('.patient-card.active .p-name').first().getAttribute('title').catch(() => '');
  check('clicking archived B opens B', String(activeTitle).includes(B.exp), activeTitle);

  await page.locator('.sv-rail-home').click();
  await home.locator('[data-sv-arch]', { hasText: 'Sala' }).click();
  await home.locator('.sv-grid .sv-name', { hasText: A.name }).waitFor({ timeout: 5000 });
  await shot(page, 'after-restore');
  const back = await gridNames();
  check('back in Sala: A and C are cards, B is not', back.includes(A.name) && back.includes(C.name) && !back.includes(B.name), back);
  check('«Archivados 1» after restore', /Archivados\s*1/.test(await archBtn.innerText()), await archBtn.innerText());

  // Archive C straight from its card; the card must not open C.
  await home.locator('.sv-card-wrap', { hasText: C.name }).locator('.sv-card-archive').click();
  await home.locator('.sv-grid .sv-name', { hasText: C.name }).waitFor({ state: 'detached', timeout: 5000 });
  check('card archive button removes C from Sala', !(await gridNames()).includes(C.name), await gridNames());
  check('card archive button does not open the patient', !!(await page.evaluate(() => document.body.dataset.salaHome)), null);

  // Restore both; the last restore drops back to Sala and hides the button.
  await archBtn.click();
  await restore(C);
  await home.locator('.sv-grid .sv-name', { hasText: C.name }).waitFor({ state: 'detached', timeout: 5000 });
  await restore(B);
  await home.locator('.sv-grid .sv-name', { hasText: A.name }).waitFor({ timeout: 5000 });
  const all = await gridNames();
  check('last restore returns to Sala with all three cards', [A, B, C].every((p) => all.includes(p.name)), all);
  check('no Archivados button when nothing is archived', (await archBtn.count()) === 0, null);

  // Archive C, restart, and make sure the state survived.
  await page.locator('[data-sv-view="bar"]').click();
  await archive(C);
  await page.waitForTimeout(2500);
  const cArchived = await page.locator('.patient-card--archived .p-name[title*="' + C.exp + '"]').count();
  check('C archived before restart', cArchived === 1, cArchived);
  await shot(page, 'before-restart');
  check('no page errors before restart', pageErrors.length === 0, pageErrors);
  await app.close();

  ({ app, page, pageErrors } = await r.launch());
  await page.locator('#btn-sala-view-cards').click();
  await page.locator('#sala-view-home .sv-grid').waitFor({ timeout: 10000 });
  const g2 = await page.locator('#sala-view-home .sv-grid .sv-name').allInnerTexts();
  check('after restart: A and B are cards, C archived', g2.includes(A.name) && g2.includes(B.name) && !g2.includes(C.name), g2);
  check('after restart: «Archivados 1»', /Archivados\s*1/.test(await page.locator('.sv-home-actions [data-sv-arch]').innerText()), null);
  await shot(page, 'after-restart');
  check('no page errors after restart', pageErrors.length === 0, pageErrors);
  await app.close();
});
