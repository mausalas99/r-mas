/**
 * Shared setup: dismiss onboarding (solo este equipo), open help panel,
 * start "Modo presentación (DEMO PÉREZ)" so real-looking data renders.
 * Import and call `setupDemo(page)` before navigating to a specific screen.
 */
export async function setupDemo(page) {
  const soloEquipo = page.locator('text=Solo este equipo').first();
  if (await soloEquipo.isVisible().catch(() => false)) {
    await soloEquipo.click();
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('clinical-onboard-local-confirm-btn')?.click()).catch(() => {});
  await page.waitForTimeout(800);

  // Open help panel (book icon in header) then click the presentation-mode button directly via DOM.
  const started = await page.evaluate(() => {
    const btn = document.getElementById('btn-start-presentation');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }).catch(() => false);

  if (!started) {
    // Book icon likely toggles the help panel; try common selectors.
    const bookIcon = page.locator('[aria-label*="yuda" i], [title*="yuda" i], .icon-book, #btn-help, #btn-open-help').first();
    if (await bookIcon.isVisible().catch(() => false)) {
      await bookIcon.click();
      await page.waitForTimeout(400);
      await page.evaluate(() => document.getElementById('btn-start-presentation')?.click());
    }
  }

  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('clinical-onboard-local-confirm-btn')?.click()).catch(() => {});
  await page.waitForTimeout(1200);

  // The presentation-mode button lives inside the "Aprender R+" learn hub panel; close it.
  await page.evaluate(() => {
    if (typeof window.closeLearnHub === 'function') window.closeLearnHub();
    document.getElementById('btn-open-learn')?.setAttribute('aria-expanded', 'false');
  }).catch(() => {});
  await page.waitForTimeout(600);

  // Make sure the demo patient is actually selected/rendered.
  await page.locator('text=DEMO PÉREZ').first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

/** Click a top tab (Paciente/Laboratorio/Manejo/Agenda) by its visible text. */
export async function clickTopTab(page, label) {
  await page.locator(`.tab:has-text("${label}"), button:has-text("${label}")`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/** Click a sub-tab pill (Resumen/Clínico/Salida/Nota de evolución/...) by its visible text. */
export async function clickSubTab(page, label) {
  await page.locator(`button:has-text("${label}"), .subtab:has-text("${label}"), [role="tab"]:has-text("${label}")`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
}

export default async function (page) {
  await setupDemo(page);
}
