import { setupDemo } from './goto-demo.mjs';

/**
 * Nota de evolución (screen 9a, teal-workbench rollout Phase 5): starts Modo
 * presentación (DEMO PÉREZ, which already carries a same-day altered-labs
 * fixture — `pitch-lab-trend-5`, dayOffset 0 — as part of the default
 * fixture set), switches the header work mode to Interconsulta
 * (`setWorkModeFromHeader` — the real entry point; the "Nota de evolución"
 * segment tab is CSS-hidden in Sala mode by design, Sala uses "Estado
 * actual" instead — confirmed via `reconcileActiveInnerForAppMode` in
 * profile-app-mode.mjs), then navigates Paciente → Clínico → Nota de
 * evolución via real element ids, never text locators.
 * @param {import('playwright').Page} page
 */
export async function gotoNotaEvolucion(page) {
  await setupDemo(page);

  await page.evaluate(() => {
    if (typeof window.setWorkModeFromHeader === 'function') window.setWorkModeFromHeader('interconsulta');
  }).catch(() => {});
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    document.getElementById('apptab-nota')?.click();
    if (typeof window.switchConsolidatedTab === 'function') window.switchConsolidatedTab('clinico');
  }).catch(() => {});
  await page.waitForTimeout(500);

  const nav = await page.evaluate(() => {
    document.getElementById('exp-segment-notas')?.click();
    return {
      hasNoteForm: !!document.getElementById('note-form'),
      hasModeFrame: !!document.querySelector('#note-form .wb-mode-frame'),
    };
  }).catch((e) => ({ error: String(e) }));

  await page.waitForTimeout(900);
  return nav;
}

export default async function (page) {
  const res = await gotoNotaEvolucion(page);
  console.log(JSON.stringify(res));
}

/** Scrolls the note's main column down so P·Plan is visible for a second screenshot. */
export async function scrollNotaPlanIntoView(page) {
  await page.evaluate(() => {
    const analisis = document.getElementById('ne-analisis');
    analisis?.scrollIntoView({ block: 'start' });
    let el = analisis;
    while (el) {
      if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight;
      el = el.parentElement;
    }
    window.scrollBy(0, 3000);
  }).catch(() => {});
  await page.waitForTimeout(300);
}
