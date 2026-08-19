import { setupDemo } from './goto-demo.mjs';

/**
 * Undo toast (mockup #11a, reversible weight) — Phase 9 shared sweep.
 * Reaches the real "Listo" button on a Pendientes row by a real click
 * (Paciente tab -> Pendientes pill -> `.wb-todo-listo-btn`). Before this
 * phase the button silently toggled the todo with zero feedback and no way
 * back; it now shows the shared `showUndoToast` kit (via
 * `openConfirm({ weight: 'reversible' })`), matching mockup #11a's third
 * example ("Pendiente marcado como listo" + Deshacer).
 * @param {import('playwright').Page} page
 */
export async function gotoUndoToast(page) {
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

  const listoClicked = await page
    .locator('.wb-todo-listo-btn')
    .first()
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const toast = document.querySelector('.wb-undo-toast');
    return {
      toastPresent: !!toast,
      toastText: toast?.textContent || null,
      hasDeshacerBtn: !!toast?.querySelector('[data-wb-undo]'),
    };
  }).catch((e) => ({ error: String(e) }));

  return { pillClicked, listoClicked, state };
}

export default async function (page) {
  const res = await gotoUndoToast(page);
  console.log(JSON.stringify(res, null, 2));
}
