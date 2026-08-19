import { gotoNotaEvolucion } from './nota-evolucion.mjs';

export default async function (page) {
  await gotoNotaEvolucion(page);
  await page.evaluate(() => {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
  }).catch(() => {});
  await page.waitForTimeout(500);
}
