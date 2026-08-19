import { gotoPendienteDeleteConfirm } from './confirm-11a-pendiente-delete.mjs';

export default async function (page) {
  const res = await gotoPendienteDeleteConfirm(page);
  await page.evaluate(() => {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
  }).catch(() => {});
  await page.waitForTimeout(500);
  console.log(JSON.stringify(res, null, 2));
}
