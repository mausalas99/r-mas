import { setupDemo } from './goto-demo.mjs';

/**
 * Confirmaciones (11a), destructive weight — Phase 9 shared sweep.
 * Reaches the real "Eliminar pendiente" destructive confirm by real clicks
 * only: Paciente tab -> the Pendientes pill (Phase 6 entry point) -> the
 * real "x" delete button on a Pendientes row (`.wb-todo-del-btn`, wired in
 * todos-list-render.mjs). Before this phase, that button called
 * `deleteTodo()` directly with no confirm at all; it now opens the shared
 * `openConfirm({ weight: 'destructive' })` kit modal, matching mockup
 * #11a's first (destructive) example.
 * @param {import('playwright').Page} page
 */
export async function gotoPendienteDeleteConfirm(page) {
  await setupDemo(page);
  await page.evaluate(() => document.getElementById('apptab-nota')?.click()).catch(() => {});
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await page.waitForTimeout(200);

  const pillClicked = await page
    .locator('#exp-group-row .exp-group-name', { hasText: 'Pendientes' })
    .first()
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(600);

  const delClicked = await page
    .locator('.wb-todo-del-btn')
    .first()
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => ({
    modalPresent: !!document.querySelector('[data-wb-confirm-backdrop]'),
    modalOpen: !!document.querySelector('.wb-scrim--open'),
    weightClass: document.querySelector('.wb-confirm-modal')?.className || null,
    title: document.querySelector('.wb-confirm-title')?.textContent || null,
    message: document.querySelector('.wb-confirm-message')?.textContent || null,
    confirmBtnText: document.querySelector('[data-wb-confirm-ok]')?.textContent || null,
    confirmBtnClass: document.querySelector('[data-wb-confirm-ok]')?.className || null,
    cancelBtnText: document.querySelector('[data-wb-confirm-cancel]')?.textContent || null,
  })).catch((e) => ({ error: String(e) }));

  return { pillClicked, delClicked, state };
}

export default async function (page) {
  const res = await gotoPendienteDeleteConfirm(page);
  console.log(JSON.stringify(res, null, 2));
}
