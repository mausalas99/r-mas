#!/usr/bin/env node
/* global document, window, requestAnimationFrame */
/**
 * E2E speed: how fast the Laboratorio tab follows a patient switch, and
 * whether fast use (arrow keys through the census, rapid clicks, rapid area
 * changes, typing into a long note) makes the screen stutter. Synthetic DEMO
 * patients and made-up note text only.
 *
 * Census: 12 patients, each with a full SOME report and a gasometría on
 * another day, so every switch repaints a busy lab screen.
 *
 * Numbers (report.json → timings):
 *   switch → labs on screen   click on a patient until the right labs show
 *   <phase> worst input       slowest click/key until the next paint (Event Timing API)
 *   <phase> worst frame gap   longest gap between two frames (stutter you can see)
 *   <phase> long tasks        main-thread tasks over 50 ms (count / total ms)
 *   typing: keys over 16 ms   keystrokes that missed the next frame (of all typed)
 *
 * Checks are correctness only (right patient on screen, no page errors);
 * the numbers are for speed work to beat.
 *
 * Artifact: e2e-artifacts/speed/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:speed
 */
import { createRun, onboardLocalOnly, openPatient, pasteAndSave, closeToasts, goArea } from './harness.mjs';
import { fullLabs, gas } from './some-fixtures.mjs';

// pH 6.61 … 6.83, odd hundredths only (the app drops a trailing zero: 6.90 shows as 6.9).
// One per patient, never in the demo report, so it names whose labs are on screen.
const PATIENTS = Array.from({ length: 12 }, (_, i) => ({
  exp: `70002${String(i + 10)}-${i % 10}`,
  name: `DEMO VELOCIDAD ${String.fromCharCode(65 + i)}`,
  room: String(401 + i),
  ph: (6.61 + (2 * i) / 100).toFixed(2),
}));

const r = createRun('speed');

await r.finish('Patient switch and fast use stay smooth', async () => {
  const { page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await goArea(page, 'lab');
  for (const p of PATIENTS) {
    await pasteAndSave(page, fullLabs(p, 'Jan 4 2026 8:00AM'));
    await pasteAndSave(page, gas(p, 'Jan 5 2026 8:00AM', p.ph));
  }
  for (const p of PATIENTS) await openPatient(page, p);
  await closeToasts(page);
  await openPatient(page, PATIENTS[0]);
  if (!(await page.locator('#lab-output-box').isVisible())) await goArea(page, 'lab');
  await r.shot(page, 'busy-census');

  const nameLink = (p) => page.locator(`.p-name[title*="${p.exp}"]`).locator('visible=true').first();
  const phs = PATIENTS.map((p) => p.ph);
  /** ph of the patient whose labs are on screen, or null if none / more than one. */
  const shownPh = () =>
    page.evaluate((all) => {
      const text = (document.getElementById('lab-output-box') || {}).innerText || '';
      const hits = all.filter((ph) => text.includes(ph));
      return hits.length === 1 ? hits[0] : null;
    }, phs);

  // ── Switch time: click → the right labs painted ──────────────────────────
  const switchMs = [];
  let wrong = 0;
  for (let i = 1; i <= PATIENTS.length; i++) {
    const p = PATIENTS[i % PATIENTS.length];
    const handle = await nameLink(p).elementHandle();
    const ms = await page.evaluate(
      ({ el, ph }) =>
        new Promise((resolve) => {
          const t0 = performance.now();
          el.click();
          const box = () => (document.getElementById('lab-output-box') || {}).innerText || '';
          (function poll() {
            if (box().includes(ph)) requestAnimationFrame(() => resolve(performance.now() - t0));
            else if (performance.now() - t0 > 5000) resolve(-1);
            else requestAnimationFrame(poll);
          })();
        }),
      { el: handle, ph: p.ph }
    );
    if (ms < 0) wrong += 1;
    else switchMs.push(ms);
  }
  r.check('every switch shows the clicked patient’s labs', wrong === 0, { wrong });
  const sorted = [...switchMs].sort((a, b) => a - b);
  r.timings['switch → labs on screen (median)'] = Math.round(sorted[Math.floor(sorted.length / 2)] || 0);
  r.timings['switch → labs on screen (worst)'] = Math.round(sorted[sorted.length - 1] || 0);

  // ── Stutter recorder: long tasks, frame gaps, slow inputs ────────────────
  await page.evaluate(() => {
    const rec = (window.__speed = { longTasks: [], events: [], slowKeys: 0, maxGap: 0, last: 0, on: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => rec.longTasks.push(e.duration))).observe({ type: 'longtask' });
    new PerformanceObserver((l) =>
      l.getEntries().forEach((e) => {
        rec.events.push(e.duration);
        if (e.name === 'keydown') rec.slowKeys += 1;
      })
    ).observe({ type: 'event', durationThreshold: 16 });
    (function frame(t) {
      if (rec.last && rec.on) rec.maxGap = Math.max(rec.maxGap, t - rec.last);
      rec.last = t;
      requestAnimationFrame(frame);
    })(performance.now());
  });
  const resetStutter = () => page.evaluate(() => Object.assign(window.__speed, { longTasks: [], events: [], slowKeys: 0, maxGap: 0, last: 0 }));
  async function recordStutter(phase) {
    await page.waitForTimeout(600); // let the last repaint land
    const s = await page.evaluate(() => window.__speed);
    r.timings[`${phase}: worst input`] = Math.round(Math.max(0, ...s.events));
    r.timings[`${phase}: worst frame gap`] = Math.round(s.maxGap);
    r.timings[`${phase}: long tasks`] = `${s.longTasks.length} / ${Math.round(s.longTasks.reduce((a, b) => a + b, 0))} ms`;
  }

  // Arrow keys through the whole census, about as fast as a key repeat.
  await closeToasts(page);
  await nameLink(PATIENTS[0]).click();
  await page.waitForTimeout(600);
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await resetStutter();
  for (let i = 0; i < PATIENTS.length - 1; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(60);
  }
  await recordStutter('arrow keys ×11');
  r.check('arrow walk ends on one patient’s labs', (await shownPh()) !== null, { shown: await shownPh() });

  // Rapid clicks down the list, 40 ms apart; the last click must win.
  await closeToasts(page);
  await resetStutter();
  for (const p of PATIENTS) {
    await nameLink(p).click();
    await page.waitForTimeout(40);
  }
  await recordStutter('rapid clicks ×12');
  const last = PATIENTS[PATIENTS.length - 1];
  r.check('rapid clicks end on the last patient clicked', (await shownPh()) === last.ph, { want: last.ph, shown: await shownPh() });
  await r.shot(page, 'after-rapid-clicks');

  // Rapid area changes with a busy patient open.
  await closeToasts(page);
  await resetStutter();
  for (let round = 0; round < 2; round++) {
    for (const area of ['nota', 'lab', 'med', 'agenda']) await goArea(page, area);
  }
  await goArea(page, 'lab');
  await recordStutter('area changes ×9');
  r.check('back on Laboratorio shows the same patient', (await shownPh()) === last.ph, { want: last.ph, shown: await shownPh() });
  await r.shot(page, 'after-area-changes');

  // ── Typing at the end of a long Evolución, like a fast typist ────────────
  await closeToasts(page);
  await goArea(page, 'nota');
  const evolucion = page.locator(`#note-form [data-oninput-args='["evolucion"]']`);
  await evolucion.waitFor({ state: 'visible' });
  const LONG = Array.from({ length: 30 }, (_, i) => `DEMO día ${i + 1}: paciente estable, sin cambios relevantes, continúa manejo establecido y vigilancia.`).join('\n');
  await evolucion.fill(LONG);
  await evolucion.click();
  await page.keyboard.press('End');
  await page.keyboard.press('Meta+ArrowDown');
  const TYPED = ' DEMO nota agregada al final para medir la escritura en un campo largo, letra por letra, sin pausas.';
  await resetStutter();
  await page.evaluate(() => { window.__speed.keys = 0; document.addEventListener('keydown', () => window.__speed.keys++, true); });
  await page.keyboard.type(TYPED.repeat(2), { delay: 30 });
  await page.waitForTimeout(600);
  const typing = await page.evaluate(() => window.__speed);
  const typedValue = await evolucion.inputValue();
  r.check('every typed letter lands in the note', typedValue.endsWith(TYPED.repeat(2).trimEnd()), { tail: typedValue.slice(-40) });
  r.timings['typing: keys over 16 ms'] = `${typing.slowKeys} of ${typing.keys}`;
  r.timings['typing: worst key'] = Math.round(Math.max(0, ...typing.events));
  r.timings['typing: worst frame gap'] = Math.round(typing.maxGap);
  r.timings['typing: long tasks'] = `${typing.longTasks.length} / ${Math.round(typing.longTasks.reduce((a, b) => a + b, 0))} ms`;
  await r.shot(page, 'after-typing');

  r.check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3));
});
