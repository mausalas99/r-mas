import { gotoInterconsulta10b } from './interconsulta-10b.mjs';

/**
 * Interconsulta navigation rework (2026-08-25 corrected model): sidebar gone,
 * team board fills the main window, card click drills into full-window Resumen.
 * @param {import('playwright').Page} page
 */
export default async function (page) {
  const res = await gotoInterconsulta10b(page);
  console.log('nav:', JSON.stringify(res));

  const boardState = await page.evaluate(() => ({
    icBoardMode: document.documentElement.classList.contains('ic-board-mode'),
    sidebarWidth: getComputedStyle(document.querySelector('aside.patient-sidebar')).width,
    boardMountHidden: document.getElementById('ic-board-mount')?.hidden,
    boardHtmlLength: document.getElementById('ic-board-mount')?.innerHTML.length || 0,
    backBtnHidden: document.querySelector('[data-wb-ic-back]')?.hidden,
    cardCount: document.querySelectorAll('#ic-board-mount .patient-card[data-patient-id]').length,
  }));
  console.log('board state:', JSON.stringify(boardState));
}
