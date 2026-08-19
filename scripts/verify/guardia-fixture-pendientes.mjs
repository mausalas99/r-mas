import { setupDemo } from './goto-demo.mjs';

/**
 * Verifies the D3a/D3b pieces that don't depend on Guardia's DB-backed census
 * pull: seeds the populated-Guardia fixture (24 extra patients + pendientes),
 * stays in normal Sala mode (sidebar reads the in-memory patient list, which
 * the fixture writes to directly), selects the "Domínguez Lara" fixture
 * patient (whose pendiente is marked inProgress), and opens Pendientes so the
 * new "En curso" toggle button (D3b) is visible and active.
 */
export default async function (page) {
  await setupDemo(page);

  await page.evaluate(() => {
    document.getElementById('btn-open-learn')?.click();
  }).catch(() => {});
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    document.getElementById('btn-seed-guardia-census')?.click();
  });
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    if (typeof window.closeLearnHub === 'function') window.closeLearnHub();
  }).catch(() => {});
  await page.waitForTimeout(300);

  const selected = await page.evaluate(() => {
    if (typeof window.selectPatient === 'function') {
      window.selectPatient('pitch-gcx-03');
      return true;
    }
    return false;
  });
  await page.waitForTimeout(600);

  const switched = await page.evaluate(() => {
    if (typeof window.switchInnerTab === 'function') {
      window.switchInnerTab('todo');
      return true;
    }
    return false;
  });
  await page.waitForTimeout(600);

  console.log(JSON.stringify({ selected, switched }));
}
