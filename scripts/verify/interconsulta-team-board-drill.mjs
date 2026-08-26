import { gotoInterconsulta10b } from './interconsulta-10b.mjs';

/** Click the one demo patient card in the board, verify the drill-down into Resumen. */
export default async function (page) {
  await gotoInterconsulta10b(page);
  await page.click('#ic-board-mount .patient-card[data-patient-id]');
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    boardHidden: document.getElementById('ic-board-mount')?.hidden,
    backBtnHidden: document.querySelector('[data-wb-ic-back]')?.hidden,
    patientViewDisplay: getComputedStyle(document.getElementById('patient-view')).display,
  }));
  console.log('drill state:', JSON.stringify(state));
}
