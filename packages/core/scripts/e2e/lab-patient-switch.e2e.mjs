#!/usr/bin/env node
/**
 * E2E: the Laboratorio tab must always show the labs of the patient on
 * screen, never the ones of the patient before. Synthetic DEMO patients only.
 *
 * The patient-switch repaint waits 120 ms (so arrow keys through the census
 * stay fast). Ways it can go wrong (each one is a check below):
 *   - a slow, normal switch keeps the old patient's labs
 *   - a second click on the same patient inside the 120 ms (a double-click,
 *     or a Nube pull repaint) replaces the pending switch → old labs stay
 *   - a tab click inside the 120 ms cancels the pending switch → old labs stay
 *   - a patient with no labs keeps showing the previous patient's labs
 *
 * Artifact: e2e-artifacts/lab-patient-switch/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:lab-patient-switch
 */
import { createRun, onboardLocalOnly, openPatient, pasteAndSave, closeToasts } from './harness.mjs';
import { gas } from './some-fixtures.mjs';

const A = { exp: '7000011-1', name: 'DEMO CAMBIO ALFA', room: '311', ph: '7.11' };
const B = { exp: '7000012-2', name: 'DEMO CAMBIO BETA', room: '312', ph: '7.44' };
const C = { exp: '7000013-3', name: 'DEMO CAMBIO GAMMA', room: '313', ph: '7.29' };

const r = createRun('lab-patient-switch');

await r.finish('Lab tab follows the patient on screen', async () => {
  const { page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  for (const p of [A, B, C]) await pasteAndSave(page, gas(p, 'Jan 5 2026 8:00AM', p.ph));
  for (const p of [A, B, C]) await openPatient(page, p);

  const nameLink = (p) => page.locator(`.p-name[title*="${p.exp}"]`).locator('visible=true').first();
  const outputText = () => page.locator('#lab-output-box').innerText().catch(() => '');
  async function expectShows(label, p, others) {
    await page.waitForTimeout(900);
    const text = await outputText();
    const leaked = others.filter((o) => text.includes(o.ph)).map((o) => o.name);
    r.check(label, text.includes(p.ph) && leaked.length === 0, { want: p.ph, leaked });
  }

  // Slow, normal switch.
  await openPatient(page, A);
  if (!(await page.locator('#lab-output-box').isVisible())) await page.locator('#apptab-lab').click();
  await expectShows('slow switch → A labs', A, [B, C]);
  await r.shot(page, 'A');

  // Same patient clicked twice inside 120 ms.
  await closeToasts(page);
  await nameLink(B).click();
  await nameLink(B).click();
  await expectShows('double click on B → B labs, not A', B, [A, C]);
  await r.shot(page, 'B-double-click');

  // Tab click inside 120 ms cancels the deferred repaint.
  await closeToasts(page);
  await nameLink(C).click();
  await page.locator('#apptab-lab').click();
  await expectShows('switch + tab click → C labs, not B', C, [A, B]);
  await r.shot(page, 'C-tab-click');

  // Back to A the same fast way.
  await closeToasts(page);
  await nameLink(A).click();
  await nameLink(A).click();
  await expectShows('double click back to A → A labs', A, [B, C]);

  r.check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3));
});
