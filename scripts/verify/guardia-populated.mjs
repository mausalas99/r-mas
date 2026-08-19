import { setupDemo } from './goto-demo.mjs';

/**
 * Populated Guardia (6a/6b, teal-workbench rollout Phase 2): starts Modo
 * presentación, seeds the 25-patient Guardia census fixture
 * (tour-pitch-guardia-census.mjs) via the hidden dev button, switches the
 * header work mode to "guardia" (setWorkModeFromHeader — the real entry point
 * used by the app, not a text locator), and waits for the board to render.
 */
export async function gotoPopulatedGuardia(page) {
  await setupDemo(page);

  await page.evaluate(() => {
    document.getElementById('btn-open-learn')?.click();
  }).catch(() => {});
  await page.waitForTimeout(300);

  const seeded = await page.evaluate(() => {
    const btn = document.getElementById('btn-seed-guardia-census');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    if (typeof window.closeLearnHub === 'function') window.closeLearnHub();
  }).catch(() => {});
  await page.waitForTimeout(300);

  const switched = await page.evaluate(() => {
    if (typeof window.setWorkModeFromHeader === 'function') {
      window.setWorkModeFromHeader('guardia');
      return true;
    }
    return false;
  });
  await page.waitForTimeout(900);

  return { seeded, switched };
}

export default async function (page) {
  const res = await gotoPopulatedGuardia(page);
  console.log(JSON.stringify(res));
}
