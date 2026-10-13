#!/usr/bin/env node
/* global document */
/**
 * E2E: Interconsulta response timer. Board card "Recibida" → running time →
 * "Respondida" → final time; header average; band time fields; triage tag.
 * Fresh profile, synthetic DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - a card has no Recibida button, or no triage tag when a group is set
 *   - Recibida does not save consultInfo.receivedAt, or no running time shows
 *   - Respondida does not save answeredAt, or the time keeps running
 *   - the header shows no average after one answered IC
 *   - the band time fields are missing, or editing one does not save
 *   - editing the band drops the timer keys
 *   - an uncaught page error
 *
 * Artifact: e2e-artifacts/interconsulta-timer/<run-id>/ (report.json + screenshots).
 *
 *   node scripts/e2e/interconsulta-timer.e2e.mjs
 */
import { createRun, onboardLocalOnly, closeToasts, goArea } from './harness.mjs';

const r = createRun('interconsulta-timer');
const { check } = r;

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

async function showBoard(page) {
  const board = page.locator('#ic-board-mount');
  if (!(await board.isVisible())) {
    await goArea(page, 'nota');
    await board.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  }
  if (!(await board.isVisible())) {
    await page.locator('.exp-group-pill[data-group="paciente"]').click();
    await page.locator('[data-ic-back-to-board]').click();
  }
  await board.locator('.ic-line:not(.ic-line--assign)').first().waitFor({ state: 'visible' });
  return board;
}

await r.finish('Interconsulta timer: Recibida, running time, Respondida, average, band times', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await setMode(page, 'interconsulta');
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press('Meta+Alt+Shift+KeyI');
  await page.waitForTimeout(600);
  const board = await showBoard(page);

  // Give the first card a group so the tag shows, through the band.
  const id = await board.locator('.ic-line:not(.ic-line--assign)').first().getAttribute('data-patient-id');
  await board.locator(`.ic-line[data-patient-id="${id}"]`).first().click();
  await page.locator('.ic-consult-band [data-consult-field="triage"]').selectOption('ic');
  await page.waitForTimeout(300);
  const timeFields = await page.locator('.ic-consult-band [data-consult-time]').count();
  check('band has Recibida + Respondida time fields', timeFields === 2, timeFields);
  await showBoard(page);

  const wrap = board.locator(`.ic-line[data-patient-id="${id}"]`).first();
  const tag = (await wrap.locator('.ic-tag').first().textContent().catch(() => '')) || '';
  check('card shows the IC tag', tag.trim().toUpperCase() === 'IC', tag);
  check('card starts with a Recibida button', (await wrap.locator('[data-ic-timer="start"]').count()) === 1);
  await r.shot(page, 'board-before');

  await wrap.locator('[data-ic-timer="start"]').click();
  await page.waitForTimeout(300);
  const wrap2 = board.locator(`.ic-line[data-patient-id="${id}"]`).first();
  const running = (await wrap2.locator('.ic-timer__t').textContent().catch(() => '')) || '';
  check('Recibida shows a running time', /^0 min$/.test(running.trim()), running);
  check('card now has a Respondida button', (await wrap2.locator('[data-ic-timer="stop"]').count()) === 1);
  await r.shot(page, 'board-running');

  await wrap2.locator('[data-ic-timer="stop"]').click();
  await page.waitForTimeout(300);
  const wrap3 = board.locator(`.ic-line[data-patient-id="${id}"]`).first();
  check('Respondida freezes the time', (await wrap3.locator('.ic-timer__t.is-done').count()) === 1);
  check('no buttons left on an answered card', (await wrap3.locator('[data-ic-timer]').count()) === 0);
  const stats = (await board.locator('.ic-stats').textContent().catch(() => '')) || '';
  check('header shows the 7-day average', /Promedio 7 días\s*0 min/.test(stats), stats);
  await r.shot(page, 'board-answered');

  // Band: both times show, editing one saves and keeps the other.
  await board.locator(`.ic-line[data-patient-id="${id}"]`).first().click();
  const rec = page.locator('.ic-consult-band [data-consult-time="receivedAt"]');
  await rec.waitFor({ state: 'visible', timeout: 8000 });
  check('band shows the Recibida time', /^\d{2}:\d{2}$/.test(await rec.inputValue()));
  await rec.fill('08:15');
  await rec.press('Tab');
  await page.waitForTimeout(300);
  const saved = await page.evaluate(() => {
    const el = document.querySelector('.ic-consult-band [data-consult-time="receivedAt"]');
    return el ? el.value : null;
  });
  check('edited Recibida time stays after re-paint', saved === '08:15', saved);
  const ans = await page.locator('.ic-consult-band [data-consult-time="answeredAt"]').inputValue();
  check('Respondida time kept after editing Recibida', /^\d{2}:\d{2}$/.test(ans), ans);
  await r.shot(page, 'band-times');

  // Known follow-up: "Es seguimiento" on a fresh card removes the timer and the band time fields.
  await showBoard(page);
  const other = await board.locator('.ic-line:not(.ic-line--assign):not([data-patient-id="' + id + '"])').first().getAttribute('data-patient-id');
  const ow = board.locator(`.ic-line[data-patient-id="${other}"]`).first();
  await ow.locator('[data-ic-timer="followup"]').click();
  await page.waitForTimeout(300);
  const ow2 = board.locator(`.ic-line[data-patient-id="${other}"]`).first();
  check('Es seguimiento removes the timer from the card', (await ow2.locator('[data-ic-timer]').count()) === 0);
  const ftag = (await ow2.locator('.ic-line__triage').first().textContent().catch(() => '')) || '';
  check('card now shows the Seguimiento tag', ftag.trim().toUpperCase() === 'SEGUIMIENTO', ftag);
  await board.locator(`.ic-line[data-patient-id="${other}"]`).first().click();
  await page.locator('.ic-consult-band [data-consult-field="triage"]').waitFor({ state: 'visible', timeout: 8000 });
  check('band hides the time fields for a follow-up', (await page.locator('.ic-consult-band [data-consult-time]').count()) === 0);
  await page.locator('.ic-consult-band [data-consult-field="triage"]').selectOption('ic');
  await page.waitForTimeout(300);
  check('band shows the time fields again off Seguimiento', (await page.locator('.ic-consult-band [data-consult-time]').count()) === 2);

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();
});
