import { setupDemo, clickTopTab } from './goto-demo.mjs';

export default async function (page) {
  await setupDemo(page);
  await clickTopTab(page, 'Laboratorio');
  await page.waitForTimeout(600);
  const probe = await page.evaluate(async () => {
    window.openTendGroupModal('BH');
    await new Promise((r) => setTimeout(r, 600));
    window.setTendGroupTab('table');
    await new Promise((r) => setTimeout(r, 400));
    const th = document.querySelector('#tend-group-table thead th:nth-child(2)');
    const head = th.querySelector('.tend-group-col-head');
    const label = th.querySelector('.tend-group-col-toggle');
    const cs = getComputedStyle(th);
    const hs = head && getComputedStyle(head);
    const ls = label && getComputedStyle(label);
    return {
      thWhiteSpace: cs.whiteSpace,
      thOverflow: cs.overflow,
      thMaxWidth: cs.maxWidth,
      headDisplay: hs?.display,
      headOverflow: hs?.overflow,
      headPe: hs?.pointerEvents,
      labelPe: ls?.pointerEvents,
      sheets: [...document.styleSheets].map((s) => (s.href || '').split('/').pop()).filter(Boolean).slice(-8),
    };
  });
  console.log(JSON.stringify(probe, null, 2));
}
