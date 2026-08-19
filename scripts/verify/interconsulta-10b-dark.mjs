import { gotoInterconsulta10b } from './interconsulta-10b.mjs';

export default async function (page) {
  await gotoInterconsulta10b(page);
  await page.evaluate(() => {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
  }).catch(() => {});
  await page.waitForTimeout(500);
}
