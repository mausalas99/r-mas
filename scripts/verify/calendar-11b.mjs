import { setupDemo } from './goto-demo.mjs';

/**
 * Calendario (11b) — Phase 9 shared sweep regression check. Already confirmed
 * MATCHES in Phase 0; this just re-confirms nothing regressed from the many
 * commits since. Real click only: the header date text (`#today-date`) opens
 * the popover via `openHeaderDatePopoverFromChrome()`.
 * @param {import('playwright').Page} page
 */
export async function gotoCalendarPopover(page) {
  await setupDemo(page);
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await page.waitForTimeout(200);

  const clicked = await page
    .locator('#today-date')
    .first()
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const pop = document.querySelector('.wb-date-popover');
    const ultimoPase = Array.from(pop?.querySelectorAll('button, [data-chip]') || []).find((el) =>
      /Último pase/i.test(el.textContent || '')
    );
    return {
      popoverPresent: !!pop,
      hasMonthGrid: !!pop?.querySelector('.wb-date-popover-grid, [class*="grid"]'),
      hasHoy: /Hoy/.test(pop?.textContent || ''),
      hasAyer: /Ayer/.test(pop?.textContent || ''),
      has7dias: /7 días|7 dias/.test(pop?.textContent || ''),
      ultimoPaseFound: !!ultimoPase,
      ultimoPaseDisabled: ultimoPase ? ultimoPase.disabled || ultimoPase.getAttribute('aria-disabled') === 'true' : null,
      hasDiasConLabs: /D[IÍ]AS CON LABS/i.test(pop?.textContent || ''),
    };
  }).catch((e) => ({ error: String(e) }));

  return { clicked, state };
}

export default async function (page) {
  const res = await gotoCalendarPopover(page);
  console.log(JSON.stringify(res, null, 2));
}
