import { setupDemo } from './goto-demo.mjs';

export default async function (page) {
  await setupDemo(page);
  const info = await page.evaluate(() => {
    const mount = document.getElementById('patient-dashboard-mount') || document.querySelector('[id*="dashboard"]');
    const rect = mount?.getBoundingClientRect();
    const cs = mount ? getComputedStyle(mount) : null;
    const parentChain = [];
    let el = mount;
    while (el && parentChain.length < 6) {
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      parentChain.push({ tag: el.tagName, id: el.id, cls: el.className, w: r.width, h: r.height, display: c.display, opacity: c.opacity, visibility: c.visibility });
      el = el.parentElement;
    }
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      mountRect: rect ? { w: rect.width, h: rect.height, top: rect.top, left: rect.left } : null,
      mountOpacity: cs?.opacity,
      mountDisplay: cs?.display,
      parentChain,
    };
  });
  console.log(JSON.stringify(info, null, 2));
}
