import { gotoPopulatedGuardia } from './guardia-populated.mjs';

export default async function (page) {
  await gotoPopulatedGuardia(page);
  await page.evaluate(() => {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
  }).catch(() => {});
  await page.waitForTimeout(600);
}
