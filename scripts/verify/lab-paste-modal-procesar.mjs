import { setupDemo } from './goto-demo.mjs';

export default async function (page) {
  await setupDemo(page);
  await page.evaluate(() => { if (typeof window.switchAppTab === 'function') window.switchAppTab('lab'); });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    if (typeof window.openLabPasteModal === 'function') window.openLabPasteModal();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const ta = document.getElementById('lab-input');
    if (ta) ta.value = 'texto que no es un reporte SOME';
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    if (typeof window.procesarReporte === 'function') window.procesarReporte();
  });
  await page.waitForTimeout(600);
}
