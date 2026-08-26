import { gotoInterconsulta10b } from './interconsulta-10b.mjs';

/** Click a card to drill in, then click "← Tablero" to confirm it returns to the board. */
export default async function (page) {
  await gotoInterconsulta10b(page);
  await page.click('#ic-board-mount .patient-card[data-patient-id]');
  await page.waitForTimeout(400);
  await page.click('[data-wb-ic-back]');
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => ({
    boardHidden: document.getElementById('ic-board-mount')?.hidden,
    backBtnHidden: document.querySelector('[data-wb-ic-back]')?.hidden,
    patientViewDisplay: getComputedStyle(document.getElementById('patient-view')).display,
  }));
  console.log('back state:', JSON.stringify(state));
}
