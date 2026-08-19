import { gotoNotaEvolucion } from './nota-evolucion.mjs';

export default async function (page) {
  await gotoNotaEvolucion(page);
  await page.evaluate(() => {
    const el = document.getElementById('ne-subjetivo');
    if (!el) return;
    el.value = 'Refiere mejoría del dolor, tolera dieta.';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // Autosave debounce is 900ms.
  await page.waitForTimeout(1600);
  const res = await page.evaluate(() => {
    const toast = document.querySelector('.wb-undo-toast, [class*="undo-toast"], [class*="toast"]');
    return {
      toastFound: !!toast,
      toastClass: toast ? toast.className : null,
      toastText: toast ? toast.textContent : null,
      anyModalOpen: !!document.querySelector('.wb-scrim, .soap-modal-backdrop.open'),
    };
  });
  console.log(JSON.stringify(res));
}
