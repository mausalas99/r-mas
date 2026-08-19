import { gotoPendientes } from './pendientes-10a.mjs';

export default async function (page) {
  await gotoPendientes(page);
  await page.evaluate(() => { if (typeof window.toggleTheme === 'function') window.toggleTheme(); }).catch(() => {});
  await page.waitForTimeout(500);
}
