import { setupDemo } from './goto-demo.mjs';

export default async function (page) {
  await setupDemo(page);
  await page.evaluate(() => { if (typeof window.switchAppTab === 'function') window.switchAppTab('lab'); });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const el = document.getElementById('lab-input-section');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    if (typeof window.openLabPasteModal === 'function') window.openLabPasteModal();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const ta = document.getElementById('lab-input');
    if (ta) ta.value = 'Reporte de prueba pegado desde verify script';
  });
  await page.waitForTimeout(200);
}
