import { setupDemo, clickTopTab } from './goto-demo.mjs';

export default async function (page) {
  await setupDemo(page);
  await clickTopTab(page, 'Manejo');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const el = document.getElementById('med-output-section');
    if (el) el.scrollIntoView({ block: 'end' });
  });
  await page.waitForTimeout(400);
}

