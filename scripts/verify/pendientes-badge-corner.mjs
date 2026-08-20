import { setupDemo } from './goto-demo.mjs';

export default async function (page) {
  await setupDemo(page);
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await page.evaluate(() => { document.getElementById('apptab-nota')?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const el = document.getElementById('exp-group-row');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
}
