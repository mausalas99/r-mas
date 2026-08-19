import { setupDemo } from './goto-demo.mjs';

/**
 * Pendientes (10a) + Nuevo pendiente modal (7b) — teal-workbench rollout
 * Phase 6. Reaches the screen by REAL clicks only:
 *   Paciente tab -> the new always-visible "Pendientes" tab button
 *   (#itab-todo, wired in app-body.html this phase) -> switchInnerTab('todo').
 * Never forces the pane open via direct JS, per the plan's Gate A note that
 * this screen was previously only reachable with a forced-open workaround.
 * @param {import('playwright').Page} page
 */
export async function gotoPendientes(page) {
  await setupDemo(page);

  await page.evaluate(() => {
    document.getElementById('apptab-nota')?.click();
  }).catch(() => {});
  await page.waitForTimeout(400);

  // main.js's ready-to-show maximize() can land after screenshot.mjs's first
  // floor-size call, transiently leaving window.innerWidth at the sandbox's
  // tiny virtual display (960px) — under the >=1100px breakpoint that shows
  // #exp-group-row (desktop nav) instead of the classic <1100px tab bar.
  // Pin the Playwright viewport to the real desktop floor before clicking,
  // so this exercises the actual desktop entry point, not the narrow-window
  // fallback (screenshot.mjs's own late re-floor call wins by capture time
  // regardless, but that's too late for this script's own interactions).
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await page.waitForTimeout(200);

  // Real click on the always-visible "Pendientes" pill in the desktop
  // (>=1100px) grouped nav row (#exp-group-row) — the fix-#1 entry point.
  // Never the CSS-hidden classic #itab-todo fallback.
  const clicked = await page
    .locator('#exp-group-row .exp-group-name', { hasText: 'Pendientes' })
    .first()
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(600);

  const state = await page.evaluate(() => {
    const pillName = Array.from(document.querySelectorAll('#exp-group-row .exp-group-name'))
      .find((el) => el.textContent.trim() === 'Pendientes');
    const pill = pillName ? pillName.closest('.exp-group-pill') : null;
    const mount = document.querySelector('#itab-content-paciente .exp-pendientes-mount');
    const header = document.getElementById('exp-pendientes-header');
    const list = document.querySelector('.exp-pendientes-mount .todo-list');
    return {
      btnFound: !!pillName,
      btnActive: pill ? pill.classList.contains('is-active') : null,
      badgeText: document.getElementById('exp-pendientes-badge')?.textContent || null,
      badgeHidden: document.getElementById('exp-pendientes-badge')?.hidden ?? null,
      mountHidden: mount ? mount.hidden : null,
      headerHidden: header ? header.hidden : null,
      hasList: !!list,
      groupTitles: Array.from(document.querySelectorAll('.exp-pendientes-mount .todo-group-header')).map((h) => h.textContent.trim()),
      oldComposerPresent: !!document.querySelector('.todo-composer, .todo-add-row'),
    };
  }).catch((e) => ({ error: String(e) }));

  return { clicked, state };
}

export default async function (page) {
  const res = await gotoPendientes(page);
  console.log(JSON.stringify(res, null, 2));
}

/** Opens the 7b "Nuevo pendiente" modal via the real "+ Pendiente" button. */
export async function openNuevoPendienteModal(page) {
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('.todo-toolbar-add-btn');
    if (!btn) return false;
    btn.click();
    return true;
  }).catch(() => false);
  await page.waitForTimeout(400);
  return clicked;
}
