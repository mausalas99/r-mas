#!/usr/bin/env node
/* global document */
/**
 * E2E: Interconsulta «Seguimiento» pill (consultInfo.triage) on the consult band, and
 * the team board sort (VPO, Críticos, IC, Seguimiento, no group last).
 * Fresh profile, synthetic DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - the band has no Seguimiento select, or the wrong choices, or the old
 *     Pendiente / En curso / Resuelta pill is still there
 *   - picking a group does not save to patient.consultInfo.triage
 *   - a later band edit (Motivo) drops the group
 *   - the board does not move the grouped patient ahead of ungrouped ones
 *   - an uncaught page error
 *
 * Artifact: e2e-artifacts/interconsulta-triage/<run-id>/ (report.json + screenshots).
 *
 *   node scripts/e2e/interconsulta-triage.e2e.mjs
 */
import { createRun, onboardLocalOnly, closeToasts, goArea } from './harness.mjs';

const r = createRun('interconsulta-triage');
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
  await board.locator('.ic-card').first().waitFor({ state: 'visible' });
  return board;
}

/** Card ids, in screen order, of the first card group that holds `id`. */
function groupOrder(page, id) {
  return page.evaluate((pid) => {
    const card = document.querySelector('#ic-board-mount .ic-card[data-patient-id="' + pid + '"]');
    const grid = card && card.closest('.ic-row__cards, .sv-grid');
    return grid ? Array.from(grid.querySelectorAll('.ic-card')).map((c) => c.getAttribute('data-patient-id')) : [];
  }, id);
}

await r.finish('Interconsulta Seguimiento: band select saves triage, board sorts by it', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await setMode(page, 'interconsulta');
  // ⌥⌘⇧I seeds the synthetic interconsulta demo patients onto the board.
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press('Meta+Alt+Shift+KeyI');
  await page.waitForTimeout(600);
  await showBoard(page);

  // A card group with 2+ patients; take its LAST card.
  const target = await page.evaluate(() => {
    for (const grid of document.querySelectorAll('#ic-board-mount .ic-row__cards, #ic-board-mount .sv-grid')) {
      const cards = grid.querySelectorAll('.ic-card');
      if (cards.length > 1) return cards[cards.length - 1].getAttribute('data-patient-id');
    }
    return null;
  });
  check('board has a card group with 2+ patients', !!target, target);
  const before = await groupOrder(page, target);
  await r.shot(page, 'board-before');

  await page.locator(`#ic-board-mount .ic-card[data-patient-id="${target}"]`).first().click();
  const sel = page.locator('.ic-consult-band [data-consult-field="triage"]');
  await sel.waitFor({ state: 'visible', timeout: 8000 });
  const opts = await sel.locator('option').allTextContents();
  check('Seguimiento select has the 5 group choices in order', JSON.stringify(opts) === JSON.stringify(['Sin grupo', 'VPO', 'Críticos', 'IC', 'Seguimiento']), opts);
  check('old followUpStatus pill is gone', (await page.locator('.ic-consult-band [data-consult-field="followUpStatus"]').count()) === 0);
  await sel.selectOption('vpo');
  // A Motivo edit (not Seguimiento: that can move the card to another bucket).
  const motivo = page.locator('.ic-consult-band [data-consult-field="reason"]');
  await motivo.fill('Valoración preoperatoria DEMO');
  await motivo.press('Tab');
  await page.waitForTimeout(400);
  await r.shot(page, 'band-seguimiento-vpo');
  const kept = await page.locator('.ic-consult-band [data-consult-field="triage"]').inputValue();
  check('Seguimiento stays VPO after a Motivo edit', kept === 'vpo', kept);

  await showBoard(page);
  const after = await groupOrder(page, target);
  check('VPO patient moves to the top of its group', after[0] === target && before[0] !== target, { before, after });
  await r.shot(page, 'board-after');

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();
});
