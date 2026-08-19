import { gotoCalendarPopover } from './calendar-11b.mjs';

export default async function (page) {
  const res = await gotoCalendarPopover(page);
  await page.evaluate(() => {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
  }).catch(() => {});
  await page.waitForTimeout(500);
  console.log(JSON.stringify(res, null, 2));
}
