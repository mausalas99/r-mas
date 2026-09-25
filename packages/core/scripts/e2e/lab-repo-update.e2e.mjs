#!/usr/bin/env node
/**
 * E2E: "Actualizar labs" — fetch labs for one patient or the whole team from
 * the hospital lab repository (stubbed in the main process). Synthetic DEMO
 * patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Opening
 *     (a patient with no registro cannot be made from the UI any more:
 *      "+ Agregar" asks for a registro, labs carry the expediente)
 *     - one patient with registro gets the team list instead of just dates
 *       (found: the list stayed visible — CSS display beat [hidden])
 *     - two or more team patients with registro get the dates-only window
 *   Before the run
 *     - "Ninguno" then run starts with nobody
 *     - "Solo activo" / "Todos" tick the wrong rows
 *     - Desde after Hasta is accepted
 *   The run
 *     - the repository is asked for the wrong registro or the wrong days
 *     - labs that arrive for the open patient are not saved
 *     - labs for another team patient are not saved (background)
 *     - a report for a foreign expediente is dropped silently (must go to review)
 *     - the summary counts are wrong (updated / nothing in range)
 *     - no network does not stop the run, or other patients are still asked
 *     - the sidebar queue's spinner/Detener toggle via `hidden` instead of a
 *       CSS class, moving the title row and Cerrar button mid-run
 *     - a patient name with quotes or "<...>" is not HTML-escaped in the
 *       team-row title attribute
 *   The portal client itself (real 'lab-repo-fetch' handler, fakePortal launch
 *   mode — see setPortalScript in harness.mjs), covering
 *   lib/lab-repo/{portal-client,portal-html,impresion-html,fetch-run,pdf-text}:
 *     - registro-mode switch (Drop1) and Buscar params sent to the portal
 *     - rows outside the date range are never selected (no extra fetch call)
 *     - a report embedded directly in the select response is saved
 *     - a report behind an Impresion.aspx window.open hop is saved
 *     - a report that comes back as a PDF is saved (real pdf-lib bytes)
 *     - a report whose extracted Expediente differs from the row's patient
 *       goes to review, with "<=" MIC values and the line after them intact
 *       (a naive tag-strip would delete both — see impresion-html.test.mjs)
 *     - portal "no matches" and "rows all outside range" both resolve to
 *       "sin estudios en el rango", nothing saved
 *
 * Artifact: e2e-artifacts/lab-repo-update/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:lab-repo-update
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, setPortalScript } from './harness.mjs';
import { fullLabs, gas } from './some-fixtures.mjs';
import {
  portalIndexHtml,
  portalResultsHtml,
  portalEmbeddedReportHtml,
  portalSelectOpensImpresionHtml,
  portalImpresionHtml,
  portalNoMatchesHtml,
  buildSyntheticSomePdf,
} from './fake-portal.mjs';

const A = { exp: '7000005-5', name: 'DEMO LOTE UNO', room: '305' };
// Quotes/angle brackets in the name: must come back HTML-escaped in the row's title attribute.
const B = { exp: '7000006-6', name: 'DEMO "LOTE" <DOS>', room: '306' };
const FOREIGN = { exp: '7999999-9', name: 'DEMO AJENO' };

// UI text, written with \s so it does not read like a patient header.
const PICK_ONE = /Selecciona al menos un paciente\s+con registro/;

const r = createRun('lab-repo-update');
const { check } = r;

await r.finish('Actualizar labs', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);

  const modal = page.locator('#lab-repo-batch-modal');
  const reply = (res) => app.evaluate((_e, v) => { globalThis.__e2e.repoReplies.push(v); }, res);
  const repoCalls = () => app.evaluate(() => globalThis.__e2e.repoCalls.splice(0));
  const toast = (re, timeout = 8000) =>
    page.locator('.toast', { hasText: re }).first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  const toastTexts = () => page.locator('.toast').allInnerTexts();
  async function openUpdate() {
    await closeToasts(page);
    if (!(await page.locator('#btn-lab-repo-batch').isVisible())) await page.locator('#apptab-lab').click();
    await page.locator('#lab-inner-labs-btn').click().catch(() => {});
    await page.locator('#btn-lab-repo-batch').click();
    await page.waitForTimeout(300);
  }
  async function days(p) {
    await openPatient(page, p);
    if (!(await page.locator('#lab-inner-labs-btn').isVisible())) await page.locator('#apptab-lab').click();
    await page.locator('#lab-inner-labs-btn').click().catch(() => {});
    return page.locator('#lab-history-date-select option').allTextContents();
  }
  /** Pick a day in the app's calendar like a user: open it, page back month by month, click the day. */
  async function pickDate(inputId, iso) {
    await page.locator(`.rpc-date-field:has(#${inputId}) .rpc-date-field__trigger`).click();
    const day = page.locator(`.rpc-date-popover__day[data-iso="${iso}"]`);
    for (let i = 0; i < 24 && !(await day.count()); i++) {
      await page.locator('.rpc-date-popover [data-nav="-1"]').click();
    }
    await day.click();
    await page.locator('.rpc-date-popover').waitFor({ state: 'hidden' }).catch(() => {});
  }
  async function setRange(desde, hasta) {
    await pickDate('lab-repo-batch-desde', desde);
    await pickDate('lab-repo-batch-hasta', hasta);
  }

  await page.locator('#apptab-lab').click();

  // ── A alone: dates-only window ────────────────────────────────────────────
  await pasteAndSave(page, fullLabs(A, 'Jan 10 2026 8:00AM'));
  await openPatient(page, A);
  await page.locator('#apptab-lab').click();
  await openUpdate();
  await modal.waitFor({ state: 'visible' });
  const hint1 = await page.locator('#lab-repo-batch-hint').innerText();
  check('one patient with registro → dates only', (await page.locator('#lab-repo-batch-team-block').isHidden()) &&
    hint1.includes(A.exp), hint1);
  await r.shot(page, 'single-mode');
  await setRange('2026-01-18', '2026-01-21');
  await reply({ studies: [{ text: fullLabs(A, 'Jan 20 2026 8:00AM') }], errors: [] });
  await page.locator('#lab-repo-batch-confirm').click();
  check('single run: "1 paciente actualizado"', await toast(/1 paciente actualizado/), await toastTexts());
  let calls = await repoCalls();
  const d = (iso) => new Date(iso);
  check('asked for A\'s registro, 18/01 00:00 → 21/01 end of day',
    calls.length === 1 && calls[0].registro === A.exp &&
    d(calls[0].desde).getDate() === 18 && d(calls[0].desde).getHours() === 0 &&
    d(calls[0].hasta).getDate() === 21 && d(calls[0].hasta).getHours() === 23,
  calls.map((c) => ({ registro: c.registro, desde: d(c.desde).toString(), hasta: d(c.hasta).toString() })));
  await modal.waitFor({ state: 'hidden' }).catch(() => {});
  let aDays = await days(A);
  check('A now has the 20/01 labs', aDays.includes('20/01/2026'), aDays);

  // At rest (queue visible from the run above, nothing in flight): no `hidden`
  // on the spinner or Detener — they toggle by CSS class only; spinner inactive,
  // Detener --inactive.
  const atRestSpinner = await page.locator('#lab-repo-batch-queue-spinner').evaluate((el) => ({
    hidden: el.hasAttribute('hidden'), active: el.classList.contains('lab-repo-batch-queue-spinner--active'),
  }));
  const atRestStop = await page.locator('#lab-repo-batch-queue-stop').evaluate((el) => ({
    hidden: el.hasAttribute('hidden'), inactive: el.classList.contains('lab-repo-batch-queue-stop--inactive'),
  }));
  check('sidebar queue at rest: no `hidden` on spinner or Detener; spinner inactive; Detener --inactive',
    !atRestSpinner.hidden && !atRestSpinner.active && !atRestStop.hidden && atRestStop.inactive,
    { atRestSpinner, atRestStop });

  // ── Team: A and B, both with registro ──────────────────────────────────────
  await pasteAndSave(page, fullLabs(B, 'Jan 11 2026 8:00AM'));
  await openPatient(page, A);
  await openUpdate();
  await modal.waitFor({ state: 'visible' });
  check('two with registro → team list', await page.locator('#lab-repo-batch-team-block').isVisible());
  const rowState = () =>
    page.locator('#lab-repo-batch-list .lab-repo-batch-row').evaluateAll((rows) =>
      rows.map((row) => {
        const cb = row.querySelector('.lab-repo-batch-check');
        return { text: row.innerText.replace(/\s+/g, ' ').trim(), checked: !!(cb && cb.checked), disabled: !cb || cb.disabled };
      })
    );
  let rs = await rowState();
  await r.shot(page, 'team-list');
  const rowOf = (name) => rs.find((x) => x.text.includes(name));
  check('A and B ticked by default', !!rowOf(A.name)?.checked && !!rowOf(B.name)?.checked, rs);
  const bRowTitle = await page.locator('.lab-repo-batch-row-name', { hasText: 'LOTE' }).last().getAttribute('title');
  check('name with quotes/angle brackets is HTML-escaped in the row title (no raw <DOS>)',
    bRowTitle === 'DEMO "LOTE" <DOS>' &&
    !/<DOS>/.test(await page.locator('#lab-repo-batch-list').innerHTML()), bRowTitle);
  // Queue spinner/Detener toggle by CSS class while a run is in flight, never by the `hidden` attribute.
  const queueSpinner = page.locator('#lab-repo-batch-queue-spinner');
  const queueStop = page.locator('#lab-repo-batch-queue-stop');

  await page.locator('#lab-repo-batch-select-none').click();
  await page.locator('#lab-repo-batch-confirm').click();
  check('"Ninguno" → "Selecciona al menos un paciente"', await toast(PICK_ONE));
  await page.locator('#lab-repo-batch-select-active').click();
  rs = await rowState();
  check('"Solo activo" ticks only A', !!rowOf(A.name)?.checked && !rowOf(B.name)?.checked, rs);
  await page.locator('#lab-repo-batch-select-all').click();
  rs = await rowState();
  check('"Todos" ticks A and B', !!rowOf(A.name)?.checked && !!rowOf(B.name)?.checked, rs);

  await setRange('2026-01-25', '2026-01-22');
  await closeToasts(page);
  await page.locator('#lab-repo-batch-confirm').click();
  check('Desde after Hasta is refused', await toast(/Revisa el rango de fechas/));
  check('nothing was asked yet', (await repoCalls()).length === 0);

  // Run: A → nothing in range, B → new labs (saved in the background). Hold
  // A's reply (a pending Promise the stub awaits) so the run stays mid-flight
  // long enough to probe the sidebar-queue state before it resolves — the
  // stub otherwise answers within a tick and the mid-run window is missed.
  await setRange('2026-01-22', '2026-01-25');
  await app.evaluate(() => {
    globalThis.__e2e.repoReplies.push(new Promise((res) => { globalThis.__e2e._holdA = res; }));
  });
  await reply({ studies: [{ text: fullLabs(B, 'Jan 23 2026 8:00AM') }], errors: [] });
  await closeToasts(page);
  await page.locator('#lab-repo-batch-confirm').click();
  await page.waitForTimeout(200);
  const midSpinner = await queueSpinner.evaluate((el) => el.classList.contains('lab-repo-batch-queue-spinner--active'));
  const midStop = await queueStop.evaluate((el) => ({
    hidden: el.hasAttribute('hidden'),
    inactive: el.classList.contains('lab-repo-batch-queue-stop--inactive'),
    disabled: el.disabled,
  }));
  const midLabel = await page.locator('#lab-repo-batch-queue-btn-label').innerText();
  const midMeta = await page.locator('#lab-repo-batch-queue-meta').innerText();
  const midFill = await page.locator('#lab-repo-batch-queue-fill').evaluate((el) => el.style.width);
  check('mid-run: spinner --active; Detener enabled, not --inactive; label "Actualizando"; meta starts "0 de 2 ·"; fill 0%',
    midSpinner && !midStop.hidden && !midStop.inactive && !midStop.disabled &&
    midLabel === 'Actualizando' && /^0 de 2 · /.test(midMeta) && midFill === '0%',
    { midSpinner, midStop, midLabel, midMeta, midFill });

  await app.evaluate((_e, v) => { globalThis.__e2e._holdA(v); }, { studies: [], errors: [{ message: 'no-rows-in-range' }] });
  const sum1 = await toast(/1 paciente actualizado · 1 sin estudios en el rango(?! ·)/, 15000);
  check('summary: 1 updated · 1 nothing in range', sum1, await toastTexts());

  const doneStop = await queueStop.evaluate((el) => ({
    hidden: el.hasAttribute('hidden'),
    inactive: el.classList.contains('lab-repo-batch-queue-stop--inactive'),
    disabled: el.disabled,
  }));
  const doneLabel = await page.locator('#lab-repo-batch-queue-btn-label').innerText();
  const doneMeta = await page.locator('#lab-repo-batch-queue-meta').innerText();
  const doneFill = await page.locator('#lab-repo-batch-queue-fill').evaluate((el) => el.style.width);
  check('done: label "Listo"; meta starts "2 de 2 ·"; fill 100%; Detener --inactive and disabled',
    doneLabel === 'Listo' && /^2 de 2 · /.test(doneMeta) && doneFill === '100%' && doneStop.inactive && doneStop.disabled,
    { doneLabel, doneMeta, doneFill, doneStop });
  calls = await repoCalls();
  check('asked A then B, in list order', calls.map((c) => c.registro).join(',') === `${A.exp},${B.exp}`, calls.map((c) => c.registro));
  await r.shot(page, 'team-run');
  let bDays = await days(B);
  check('B (not open) got its 23/01 labs', bDays.includes('23/01/2026'), bDays);

  // A report for a foreign expediente must go to review, not be saved.
  await openPatient(page, A);
  await openUpdate();
  await modal.waitFor({ state: 'visible' });
  await page.locator('#lab-repo-batch-select-all').click();
  await setRange('2026-01-26', '2026-01-27');
  await reply({ studies: [], errors: [] });
  await reply({ studies: [{ text: fullLabs(B, 'Jan 26 2026 8:00AM') }, { text: fullLabs(FOREIGN, 'Jan 26 2026 8:05AM') }], errors: [] });
  await closeToasts(page);
  await page.locator('#lab-repo-batch-confirm').click();
  const review = page.locator('#lab-bulk-preview-confirm');
  const reviewOpened = await review.waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
  check('foreign report → review window, "para revisar"', reviewOpened && (await toast(/para revisar/)), await toastTexts());
  await r.shot(page, 'review');
  await page.keyboard.press('Escape');
  await review.waitFor({ state: 'hidden' }).catch(() => {});
  bDays = await days(B);
  check('nothing saved for B before review', !bDays.includes('26/01/2026'), bDays);
  check('foreign patient not added', (await page.locator('.p-name', { hasText: FOREIGN.name }).count()) === 0);
  await repoCalls();

  // okReportCount 0: a study with no "Expediente:" header at all is not
  // recognized as a SOME report, so the block has zero usable reports —
  // goes to review with the "Error al parsear" badge, nothing saved.
  await openPatient(page, A);
  await openUpdate();
  await modal.waitFor({ state: 'visible' });
  await page.locator('#lab-repo-batch-select-active').click();
  await setRange('2026-01-30', '2026-01-31');
  await reply({ studies: [{ text: 'Nada que parsear aquí, sin encabezado de expediente.' }], errors: [] });
  await closeToasts(page);
  await page.locator('#lab-repo-batch-confirm').click();
  const review0 = page.locator('#lab-bulk-preview-confirm');
  const review0Opened = await review0.waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
  const review0Text = await page.locator('.modal-backdrop.open').innerText().catch(() => '');
  check('okReportCount 0: unparseable study -> review window, "Error al parsear"',
    review0Opened && /Error al parsear/.test(review0Text), review0Text);
  await page.keyboard.press('Escape');
  await review0.waitFor({ state: 'hidden' }).catch(() => {});
  await repoCalls();

  // canProcess false: a report that parses fine but for a registro with no
  // matching patient in the census — "Agregar al censo" offered, nothing saved.
  const UNREGISTERED = { exp: '7799999-9', name: 'DEMO SIN CENSO' };
  await openPatient(page, A);
  await openUpdate();
  await modal.waitFor({ state: 'visible' });
  await page.locator('#lab-repo-batch-select-active').click();
  await setRange('2026-02-01', '2026-02-02');
  await reply({ studies: [{ text: fullLabs(UNREGISTERED, 'Feb 1 2026 8:00AM') }], errors: [] });
  await closeToasts(page);
  await page.locator('#lab-repo-batch-confirm').click();
  const review1 = page.locator('#lab-bulk-preview-confirm');
  const review1Opened = await review1.waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
  const review1AddBtn = await page.locator('.lab-bulk-preview-add-btn').count();
  const review1NoPatientRow = await page.locator('.lab-bulk-preview-row--no-patient').count();
  check('canProcess false: unknown registro -> review window, "no-patient" row + Agregar al censo offered',
    review1Opened && review1NoPatientRow > 0 && review1AddBtn > 0,
    { review1Opened, review1NoPatientRow, review1AddBtn });
  await page.keyboard.press('Escape');
  await review1.waitFor({ state: 'hidden' }).catch(() => {});
  check('unregistered patient not added to census', (await page.locator('.p-name', { hasText: UNREGISTERED.name }).count()) === 0);
  await repoCalls();

  // empty study text: portal returns a study whose text is blank — filtered
  // out before any block is built, so it counts toward neither "actualizado"
  // nor "para revisar", just "sin cambios".
  await openPatient(page, A);
  await openUpdate();
  await modal.waitFor({ state: 'visible' });
  await page.locator('#lab-repo-batch-select-active').click();
  await setRange('2026-02-03', '2026-02-04');
  await reply({ studies: [{ text: '   ' }], errors: [] });
  await closeToasts(page);
  await page.locator('#lab-repo-batch-confirm').click();
  check('empty study text: blank body -> "Sin cambios en 1 paciente", no review', await toast(/Sin cambios en 1 paciente/));
  calls = await repoCalls();
  check('empty study text still asked the repository once', calls.length === 1 && calls[0].registro === A.exp, calls);

  // No network on the first patient: stop, do not ask the second.
  await openPatient(page, A);
  await openUpdate();
  await modal.waitFor({ state: 'visible' });
  await page.locator('#lab-repo-batch-select-all').click();
  await setRange('2026-01-28', '2026-01-29');
  await reply({ studies: [], errors: [{ message: 'fetch failed: ECONNREFUSED' }] });
  await closeToasts(page);
  await page.locator('#lab-repo-batch-confirm').click();
  check('no network → "revisa red hospital"', await toast(/No se pudo conectar al repositorio de laboratorio/, 15000));
  check('summary says "con error · detenido"', await toast(/1 con error.*detenido/, 15000), await toastTexts());
  calls = await repoCalls();
  check('second patient never asked', calls.length === 1, calls.map((c) => c.registro));
  await r.shot(page, 'no-network');

  // ── "Pegar varios": bulk-paste registros into "+ Agregar" → each parsed
  // registro becomes its own census entry (patient-registro-parse.test.mjs
  // covered the parser in isolation; this drives the real UI + tunnel). ─────
  const BULK1 = { exp: '7100001-1', name: 'DEMO BULK UNO' };
  const BULK2 = { exp: '7100002-2', name: 'DEMO BULK DOS' };
  await closeToasts(page);
  await page.locator('.btn-add').first().click();
  await page.locator('#modal.open').waitFor({ state: 'visible' });
  const firstRow = page.locator('#m-registro-list .m-registro-row-input').first();
  await firstRow.fill(`${BULK1.exp}\n${BULK2.exp}`);
  await page.waitForTimeout(300);
  const rowInputs = page.locator('#m-registro-list .m-registro-row-input');
  const rowValues = await rowInputs.evaluateAll((els) => els.map((el) => el.value));
  check('bulk paste: two registros in one box split into two boxes (+ trailing empty box)',
    rowValues.length === 3 && rowValues[0] === BULK1.exp && rowValues[1] === BULK2.exp && rowValues[2] === '',
    rowValues);
  await reply({ studies: [{ text: fullLabs(BULK1, 'Jan 12 2026 8:00AM') }], errors: [] });
  await reply({ studies: [{ text: fullLabs(BULK2, 'Jan 12 2026 8:00AM') }], errors: [] });
  await page.locator('.wb-modal-foot [data-onclick="savePatient"]').click();
  const confirm1 = page.locator('#patient-registro-tunnel-confirm');
  await confirm1.waitFor({ state: 'visible', timeout: 15000 });
  const confirm1Title = await page.locator('#patient-registro-tunnel-backdrop h3').innerText();
  check('bulk paste: batch confirm 1 of 2, right registro', /1 de 2/.test(confirm1Title), confirm1Title);
  await confirm1.click();
  await confirm1.waitFor({ state: 'visible', timeout: 15000 });
  const confirm2Title = await page.locator('#patient-registro-tunnel-backdrop h3').innerText();
  check('bulk paste: batch confirm 2 of 2', /2 de 2/.test(confirm2Title), confirm2Title);
  await confirm1.click();
  check('bulk paste: "2 pacientes agregados"', await toast(/2 pacientes agregados/), await toastTexts());
  await r.shot(page, 'bulk-paste');
  // Long names render shortened in .p-name, but the full name lands in its
  // title attribute (same pattern as the B-row check above).
  const bulkTitles = await page.locator('.p-name').evaluateAll((els) => els.map((el) => el.getAttribute('title') || el.textContent));
  check('bulk paste: both registros landed as separate census entries',
    bulkTitles.some((t) => t.includes(BULK1.name)) && bulkTitles.some((t) => t.includes(BULK2.name)),
    bulkTitles);
  await repoCalls();

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();

  // ── Portal client itself: fakePortal keeps the real 'lab-repo-fetch'
  // handler and stubs main-process fetch with synthetic portal pages, so
  // runLabRepoFetch / createLabRepoPortalClient run for real. ──────────────
  const P = { exp: '7500001-1', name: 'DEMO PORTAL UNO', room: '401' };
  const FOREIGN_PORTAL = { exp: '7599999-9', name: 'DEMO AJENO MIC' };
  const run2 = await r.launch({ fakePortal: true, profile: 'b' });
  await onboardLocalOnly(run2.page);
  await run2.page.locator('#apptab-lab').click();
  await pasteAndSave(run2.page, fullLabs(P, 'Jan 10 2026 8:00AM'));
  await openPatient(run2.page, P);
  await run2.page.locator('#apptab-lab').click();
  await run2.page.locator('#lab-inner-labs-btn').click().catch(() => {});
  const modal2 = run2.page.locator('#lab-repo-batch-modal');
  const portalCalls2 = () => run2.app.evaluate(() => globalThis.__e2e.portalCalls);
  const toast2 = (re, timeout = 8000) =>
    run2.page.locator('.toast', { hasText: re }).first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  async function pickDate2(inputId, iso) {
    await run2.page.locator(`.rpc-date-field:has(#${inputId}) .rpc-date-field__trigger`).click();
    const day = run2.page.locator(`.rpc-date-popover__day[data-iso="${iso}"]`);
    for (let i = 0; i < 24 && !(await day.count()); i++) {
      await run2.page.locator('.rpc-date-popover [data-nav="-1"]').click();
    }
    await day.click();
    await run2.page.locator('.rpc-date-popover').waitFor({ state: 'hidden' }).catch(() => {});
  }
  async function openUpdate2() {
    await closeToasts(run2.page);
    await run2.page.locator('#btn-lab-repo-batch').click();
    await modal2.waitFor({ state: 'visible' });
  }

  // Search: index (NOMBRE) -> Drop1 switch (REGISTRO) -> Buscar. 5 rows come
  // back: 1 outside the requested range, 4 inside — embedded-HTML, an
  // Impresion.aspx window.open hop, a PDF report, and a foreign-Expediente
  // report that must go to review with its MIC line intact.
  const rows = [
    { fecha: '2026-02-05 10:00', registro: P.exp, folio: 'FX' }, // outside range: never selected
    { fecha: '2026-01-20 08:00', registro: P.exp, folio: 'F1' }, // embedded HTML
    { fecha: '2026-01-19 08:00', registro: P.exp, folio: 'F2' }, // Impresion.aspx hop
    { fecha: '2026-01-18 08:00', registro: P.exp, folio: 'F3' }, // PDF
    { fecha: '2026-01-17 08:00', registro: P.exp, folio: 'F4' }, // foreign Expediente + MIC
  ];
  const embeddedReportText = gas(P, 'Jan 20 2026 8:00AM', '7.20');
  const impresionReportText = gas(P, 'Jan 19 2026 8:00AM', '7.21');
  const pdfReportText = gas(P, 'Jan 18 2026 8:00AM', '7.22');
  const pdfBytes = await buildSyntheticSomePdf(pdfReportText.split('\n'));
  // Same regression as impresion-html.test.mjs "keeps MIC values with an
  // unescaped '<=' prefix": a naive "<[^>]+>" tag-strip reads "<=2</td>" as
  // one tag and deletes the value along with the next tag close.
  const foreignHeader = `Expediente:\t${FOREIGN_PORTAL.exp}\tSolicitud:\t26000000\n` +
    `Nombre:\t${FOREIGN_PORTAL.name}\tFecha Registro:\tJan 17 2026 8:00AM\n\n`;
  const micHtml = '<html><body>' + foreignHeader.split('\n').join('<br>\n') +
    '<table><tr><td>AMPICILINA</td></tr>' +
    '<tr><td><=2</td><td>S</td></tr>' +
    '<tr><td>PENICILINA</td></tr>' +
    '<tr><td>8</td><td>S</td></tr></table></body></html>';

  // No portal address saved yet (the address never ships in the repo): the
  // fetch must stop before the network, say so, and open Ajustes → Laboratorio.
  await openUpdate2();
  await pickDate2('lab-repo-batch-desde', '2026-01-15');
  await pickDate2('lab-repo-batch-hasta', '2026-01-21');
  await closeToasts(run2.page);
  await run2.page.locator('#lab-repo-batch-confirm').click();
  check('portal: no address → "Falta la dirección del portal" toast',
    await toast2(/Falta la dirección del portal de laboratorio/), await run2.page.locator('.toast').allInnerTexts());
  const urlField = run2.page.locator('#settings-lab-portal-url');
  const fieldShown = await urlField.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
  check('portal: no address → Ajustes opens on the portal address field', fieldShown &&
    await run2.page.evaluate(() => globalThis.document.activeElement?.id === 'settings-lab-portal-url'));
  check('portal: no address → no network call', (await portalCalls2()).length === 0, await portalCalls2());
  await r.shot(run2.page, 'portal-address-missing');

  // Paste a synthetic address in Ajustes → Laboratorio; blur saves it.
  await urlField.fill('http://portal.invalid/laboratorio/index.aspx');
  await urlField.blur();
  check('portal: Ajustes saves the pasted address', await toast2(/Dirección del portal guardada/) &&
    await run2.page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('rpc-settings') || '{}').labPortalUrl) ===
      'http://portal.invalid/laboratorio/index.aspx');
  await r.shot(run2.page, 'portal-address-saved');
  await run2.page.keyboard.press('Escape');
  await closeToasts(run2.page);
  if (await modal2.isVisible()) await run2.page.keyboard.press('Escape');
  await modal2.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

  await openUpdate2();
  await setPortalScript(run2.app, [
    { text: portalIndexHtml({ mode: 'NOMBRE' }) },
    { text: portalIndexHtml({ mode: 'REGISTRO', viewstate: 'fixture-after-drop1' }) },
    { text: portalResultsHtml(rows) },
    { text: portalEmbeddedReportHtml(embeddedReportText) },
    { text: portalSelectOpensImpresionHtml() },
    { text: portalImpresionHtml(impresionReportText) },
    { base64: pdfBytes.toString('base64'), contentType: 'application/pdf' },
    { text: micHtml },
  ]);
  await pickDate2('lab-repo-batch-desde', '2026-01-15');
  await pickDate2('lab-repo-batch-hasta', '2026-01-21');
  await closeToasts(run2.page);
  await run2.page.locator('#lab-repo-batch-confirm').click();

  const reviewed2 = run2.page.locator('#lab-bulk-preview-confirm');
  const reviewOpened2 = await reviewed2.waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
  check('portal: foreign-Expediente report -> review window', reviewOpened2);
  await run2.page.getByText('Ver texto').click().catch(() => {});
  const previewText2 = await run2.page.locator('.modal-backdrop.open').innerText().catch(() => '');
  check('portal: 3 of 4 in-range reports accepted, 1 excluded (foreign Expediente)',
    /3\/4 reportes/.test(previewText2), previewText2.match(/Exp\..*reportes[^\n]*/)?.[0]);
  check('portal: MIC "<=2" and the following line survive the Impresion-HTML tag strip',
    /<=2\s+S/.test(previewText2) && previewText2.includes('PENICILINA') && /8\s+S/.test(previewText2),
    previewText2.slice(previewText2.indexOf('AMPICILINA'), previewText2.indexOf('AMPICILINA') + 60));
  await reviewed2.click();
  check('portal: "3 conjuntos guardados"', await toast2(/3 conjuntos guardados/), await run2.page.locator('.toast').allInnerTexts());

  const calls2 = await portalCalls2();
  check('portal: 8 fetch calls (index, Drop1, Buscar, 3 single-call reports, 1 two-call Impresion hop) — out-of-range row never selected',
    calls2.length === 8, calls2.map((c) => `${c.method} ${new URL(c.url).pathname}`));
  check('portal: registro-mode switch (Drop1=REGISTRO) then Buscar carries the same registro',
    new URLSearchParams(calls2[1].body).get('Drop1') === 'REGISTRO' &&
    new URLSearchParams(calls2[2].body).get('TextBox2') === P.exp,
    { drop1Body: calls2[1].body, buscarBody: calls2[2].body });

  await run2.page.locator('#apptab-lab').click();
  await run2.page.locator('#lab-inner-labs-btn').click().catch(() => {});
  const pDays = await run2.page.locator('#lab-history-date-select option').allTextContents();
  check('portal: embedded-HTML, Impresion-hop and PDF reports all saved (20/01, 19/01, 18/01)',
    pDays.includes('20/01/2026') && pDays.includes('19/01/2026') && pDays.includes('18/01/2026'), pDays);
  check('portal: foreign patient not added from the excluded report',
    (await run2.page.locator('.p-name', { hasText: FOREIGN_PORTAL.name }).count()) === 0);

  // fetch-run.mjs: portal search itself empty ("no-search-results") vs rows
  // returned but all outside the window ("no-rows-in-range") — both resolve
  // to the same user-facing "sin estudios en el rango", nothing saved either way.
  await openUpdate2();
  await setPortalScript(run2.app, [
    { text: portalIndexHtml({ mode: 'NOMBRE' }) },
    { text: portalIndexHtml({ mode: 'REGISTRO', viewstate: 'fixture-after-drop1' }) },
    { text: portalNoMatchesHtml() },
  ]);
  await pickDate2('lab-repo-batch-desde', '2026-01-15');
  await pickDate2('lab-repo-batch-hasta', '2026-01-21');
  await closeToasts(run2.page);
  await run2.page.locator('#lab-repo-batch-confirm').click();
  check('portal: no-search-results -> "sin estudios en el rango"', await toast2(/sin estudios en el rango/));

  await openUpdate2();
  await setPortalScript(run2.app, [
    { text: portalIndexHtml({ mode: 'NOMBRE' }) },
    { text: portalIndexHtml({ mode: 'REGISTRO', viewstate: 'fixture-after-drop1' }) },
    { text: portalResultsHtml([{ fecha: '2026-03-01 10:00', registro: P.exp, folio: 'FZ' }]) },
  ]);
  await pickDate2('lab-repo-batch-desde', '2026-01-15');
  await pickDate2('lab-repo-batch-hasta', '2026-01-21');
  await closeToasts(run2.page);
  await run2.page.locator('#lab-repo-batch-confirm').click();
  check('portal: no-rows-in-range -> "sin estudios en el rango"', await toast2(/sin estudios en el rango/));

  check('portal: no page errors', run2.pageErrors.length === 0, run2.pageErrors.slice(0, 5));
  await run2.app.close();
});
