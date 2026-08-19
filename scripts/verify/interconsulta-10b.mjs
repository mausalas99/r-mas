import { setupDemo } from './goto-demo.mjs';

/**
 * Interconsulta mode Resumen (screen 10b, teal-workbench rollout Phase 7):
 * starts Modo presentación (DEMO PÉREZ), switches the header work mode to
 * Interconsulta via the real entry point (`setWorkModeFromHeader`, wired
 * to `#header-mode-seg` buttons in header.html), then navigates
 * Paciente (apptab-nota) → Resumen (itab-paciente) via real element ids —
 * the exact navigation Phase 0 failed to do (it re-captured Nota de
 * evolución instead of coming back to Resumen).
 * @param {import('playwright').Page} page
 */
export async function gotoInterconsulta10b(page) {
  await setupDemo(page);

  await page.evaluate(() => {
    if (typeof window.setWorkModeFromHeader === 'function') window.setWorkModeFromHeader('interconsulta');
  }).catch(() => {});
  await page.waitForTimeout(700);

  const nav = await page.evaluate(() => {
    document.getElementById('apptab-nota')?.click();
    if (typeof window.switchConsolidatedTab === 'function') window.switchConsolidatedTab('paciente');
    document.getElementById('itab-paciente')?.click();
    return {
      hasFrame: !!document.getElementById('interconsulta-mode-frame'),
      frameHidden: document.getElementById('interconsulta-mode-frame')?.hidden,
      hasBand: !!document.getElementById('interconsulta-consult-band'),
      bandHidden: document.getElementById('interconsulta-consult-band')?.hidden,
    };
  }).catch((e) => ({ error: String(e) }));

  await page.waitForTimeout(900);
  return nav;
}

export default async function (page) {
  const res = await gotoInterconsulta10b(page);
  console.log(JSON.stringify(res));
}
