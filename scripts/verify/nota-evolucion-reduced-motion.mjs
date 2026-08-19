import { gotoNotaEvolucion } from './nota-evolucion.mjs';

export default async function (page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoNotaEvolucion(page);
  await page.evaluate(() => {
    const el = document.getElementById('ne-subjetivo');
    if (!el) return;
    el.value = 'Refiere mejoría.';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(1600);
  const res = await page.evaluate(() => ({
    prefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    runningAnimations: document.getAnimations ? document.getAnimations().length : 'n/a',
    toastVisible: !!document.querySelector('.toast-stack')?.textContent,
  }));
  console.log(JSON.stringify(res));
}
