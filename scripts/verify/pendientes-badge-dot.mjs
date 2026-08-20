import { gotoPendientes } from './pendientes-10a.mjs';

/**
 * Verifies the Pendientes tab badge (Phase 6 follow-up) is now a plain dot
 * instead of a numeric red count. Reuses the real 10a navigation entry
 * point, then reports badge markup/state for both mounted badges.
 * @param {import('playwright').Page} page
 */
export default async function (page) {
  const res = await gotoPendientes(page);

  const badgeState = await page.evaluate(() => {
    const pick = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      return {
        textContent: el.textContent,
        hidden: el.hidden,
        ariaLabel: el.getAttribute('aria-label'),
      };
    };
    return {
      grouped: pick('exp-pendientes-badge'),
      classic: pick('exp-pendientes-badge-classic'),
    };
  }).catch((e) => ({ error: String(e) }));

  console.log(JSON.stringify({ ...res, badgeState }, null, 2));
}
