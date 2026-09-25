#!/usr/bin/env node
/* global window, document, getComputedStyle */
/**
 * E2E: Listado de problemas screen — one screen at 1440×902, no vertical
 * scroll, with a busy synthetic problem list. Synthetic DEMO patient only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - a busy Activos/Inactivos list pushes the rest of the screen off-window
 *   - the flat visual language (32px inputs, text-link secondary actions,
 *     no card-in-card) regresses back to boxed cards
 *   - the two-column layout breaks (overlap, 0-width column) at 1440×902
 *   - adding/removing problems still works after the redesign
 *   - removing one row removes the wrong one (an id/index mix-up), not just
 *     "the count went down by one"
 *   - the guided tour's demo peritonitis text (A/B/C clinical blocks) gets
 *     mangled going through the real textarea (case lost, lines merged)
 *   - saved problems do not survive a real app restart (save/load round trip)
 *   - any page error during the flow
 *
 * Artifact: e2e-artifacts/listado/<run-id>/ (report.json, screenshots).
 *
 *   npm run e2e:listado
 */
import { createRun, onboardLocalOnly, pasteAndSave, openPatient } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';
import { buildTourDemoListadoProblemas, TOUR_DEMO_PERITONITIS_BLOCK } from '../../public/js/tour-demo-listado-problemas.mjs';

const A = { exp: '7000010-1', name: 'DEMO LISTADO PROBLEMAS', room: '412' };

const ACTIVOS = [
  ['12/09/2026', 'Choque séptico de origen urinario, en resolución'],
  ['12/09/2026', 'Lesión renal aguda KDIGO 2 sobre ERC'],
  ['13/09/2026', 'Fibrilación auricular de respuesta ventricular rápida'],
  ['14/09/2026', 'Neumonía adquirida en la comunidad, CURB-65 3'],
  ['15/09/2026', 'Anemia normocítica normocrómica, requiere transfusión'],
  ['16/09/2026', 'Delirium hipoactivo sobreagregado'],
];
const INACTIVOS = [
  ['10/09/2026', 'Hipoglucemia sintomática, resuelta'],
  ['11/09/2026', 'Derrame pleural derecho, drenado'],
  ['13/09/2026', 'Hiperkalemia leve, corregida'],
];
const MEDICOS = { profesor: 'Dr. Demo Profesor', r4: 'Dra. Demo R4', r2: 'Dr. Demo R2', r1a: 'Dra. Demo R1A', r1b: 'Dr. Demo R1B' };

const r = createRun('listado');
const { check } = r;

await r.finish('Listado de problemas — one screen, busy patient', async () => {
  let { app, page, pageErrors } = await r.launch();
  // Electron has no browser "viewport" to emulate — resize the real window's
  // content area so the check below matches what a user actually sees.
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.setContentSize(1440, 902);
  });
  await page.waitForTimeout(200);
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  await pasteAndSave(page, fullLabs(A, 'Jan 12 2026 8:00AM'));
  await openPatient(page, A);

  const form = page.locator('#listado-form');
  async function openListado() {
    await page.locator('#apptab-nota').click();
    await page.evaluate(() => window.switchInnerTab('listado'));
    await form.locator('.listado-layout').waitFor({ state: 'visible' });
  }
  await openListado();
  await r.shot(page, 'listado-empty');

  const emptyState = await page.evaluate(() => ({
    emptyRows: document.querySelectorAll('#listado-form .listado-empty').length,
    layout: !!document.querySelector('#listado-form .listado-layout'),
  }));
  check('empty listado is quiet: 2 empty-state rows, no leftover boxes', emptyState.emptyRows === 2 && emptyState.layout, emptyState);

  // ── New listado Fecha/Hora default to today/now ─────────────────────────
  const now0 = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  const todayDMY = `${pad2(now0.getDate())}/${pad2(now0.getMonth() + 1)}/${now0.getFullYear()}`;
  const metaDefault = await form.locator('.listado-meta-grid-2 input').evaluateAll((els) => els.map((e) => e.value));
  const [defFecha, defHora] = metaDefault;
  const [dh, dm] = (defHora || '').split(':').map(Number);
  const minutesOff = Number.isFinite(dh) ? Math.abs((dh * 60 + dm) - (now0.getHours() * 60 + now0.getMinutes())) : Infinity;
  check('a new listado defaults Fecha to today and Hora to now', defFecha === todayDMY && minutesOff <= 2, { defFecha, defHora, todayDMY });

  // addProblemaUI appends one row and re-renders the whole form (state ->
  // DOM), so each new row is queried fresh after its own click.
  const addBtn = (seccion) => form.locator(`[data-seccion-group="${seccion}"] .listado-add-row`);

  async function fillProblemas(seccion, items) {
    for (let i = 0; i < items.length; i++) {
      await addBtn(seccion).click();
      const row = form.locator(`[data-seccion-rows="${seccion}"] .listado-row`).nth(i);
      await page.evaluate(
        ({ sec, idx, fecha }) => {
          const zone = document.querySelector(`#listado-form [data-seccion-rows="${sec}"]`);
          const input = zone.querySelectorAll('.listado-row')[idx].querySelector('input');
          input.value = fecha;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('rpc-date-refresh'));
        },
        { sec: seccion, idx: i, fecha: items[i][0] }
      );
      await row.locator('textarea').fill(items[i][1]);
    }
  }
  await fillProblemas('activos', ACTIVOS);
  await fillProblemas('inactivos', INACTIVOS);

  const counts = await page.evaluate(() => ({
    activosTitle: document.querySelector('[data-seccion-group="activos"] .listado-group-title').textContent,
    inactivosTitle: document.querySelector('[data-seccion-group="inactivos"] .listado-group-title').textContent,
    activosRows: document.querySelectorAll('[data-seccion-rows="activos"] .listado-row').length,
    inactivosRows: document.querySelectorAll('[data-seccion-rows="inactivos"] .listado-row').length,
  }));
  check(
    `${ACTIVOS.length} activos + ${INACTIVOS.length} inactivos listed, titles show the count`,
    counts.activosRows === ACTIVOS.length &&
      counts.inactivosRows === INACTIVOS.length &&
      counts.activosTitle.includes(String(ACTIVOS.length)) &&
      counts.inactivosTitle.includes(String(INACTIVOS.length)),
    counts
  );

  await form.locator('.listado-meta-grid-2 input').nth(0).fill('16/09/2026');
  await form.locator('.listado-meta-grid-2 input').nth(1).fill('07:30');
  const medInputs = form.locator('.listado-medicos-grid input');
  const medKeys = ['profesor', 'r4', 'r2', 'r1a', 'r1b'];
  for (let i = 0; i < medKeys.length; i++) {
    await medInputs.nth(i).fill(MEDICOS[medKeys[i]]);
  }
  const medValues = await medInputs.evaluateAll((els) => els.map((e) => e.value));
  check('médicos (firma) fields hold what was typed', medValues.join('|') === medKeys.map((k) => MEDICOS[k]).join('|'), medValues);

  await page.waitForTimeout(200);
  await r.shot(page, 'listado-busy');

  // ── Visual language: same as the "Registrar medición" modal ────────────
  const inputHeights = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('#listado-form .listado-input, #listado-form .listado-row .rpc-date-field__trigger'));
    return els.map((e) => Math.round(e.getBoundingClientRect().height));
  });
  check('every input (textareas excepted) is 32px tall', inputHeights.length > 0 && inputHeights.every((h) => h === 32), inputHeights);

  const linkStyle = await page.evaluate(() => {
    const btn = document.getElementById('btn-quick-export-listado');
    const cs = getComputedStyle(btn);
    return { border: cs.borderStyle, bg: cs.backgroundColor, fontWeight: cs.fontWeight };
  });
  check(
    'secondary action "Salida rápida" reads as a text link: no border, no background',
    (linkStyle.border === 'none' || linkStyle.border === '') &&
      (linkStyle.bg === 'rgba(0, 0, 0, 0)' || linkStyle.bg === 'transparent'),
    linkStyle
  );

  const noCardInCard = await page.evaluate(
    () => document.querySelectorAll('#listado-form .card, #listado-form .listado-section').length
  );
  check('no leftover card-in-card boxes', noCardInCard === 0, noCardInCard);

  const cols = await page.evaluate(() => {
    const main = document.querySelector('#listado-form .listado-main').getBoundingClientRect();
    const side = document.querySelector('#listado-form .listado-side').getBoundingClientRect();
    return { main, side };
  });
  check(
    'two-column layout: main and side sit side by side, both with real width',
    cols.main.width > 400 && cols.side.width > 200 && cols.side.left >= cols.main.right - 1,
    cols
  );

  // ── One screen, no scroll ────────────────────────────────────────────────
  const fit = await page.locator('#itab-content-listado').evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  check('Listado fits one screen, no scroll', fit.scrollHeight <= fit.clientHeight + 1, fit);

  // ── Interaction still works after the redesign ──────────────────────────
  const rowTexts = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-seccion-rows="inactivos"] .listado-row textarea')).map((t) => t.value)
    );
  const beforeRemove = await page.locator('[data-seccion-rows="inactivos"] .listado-row').count();
  const beforeTexts = await rowTexts();
  await page.locator('[data-seccion-rows="inactivos"] .listado-row').first().hover();
  await page.locator('[data-seccion-rows="inactivos"] .listado-row').first().locator('.btn-remove-listado').click();
  const afterRemove = await page.locator('[data-seccion-rows="inactivos"] .listado-row').count();
  const afterTexts = await rowTexts();
  check('removing a problem still works', afterRemove === beforeRemove - 1, { beforeRemove, afterRemove });
  check(
    'removal targets the right row by id: the other rows are untouched, not just any row gone',
    afterTexts.length === beforeTexts.length - 1 && afterTexts.every((t, i) => t === beforeTexts[i + 1]),
    { beforeTexts, afterTexts }
  );

  // ── Guided-tour demo content renders through the real form intact ───────
  const tourDemo = buildTourDemoListadoProblemas('11/04/2026', '09:30');
  check(
    'tour-demo listado data: fecha set, A)/B)/C) blocks present, ≥1 inactivo',
    tourDemo.fecha === '11/04/2026' &&
      tourDemo.activos[0].descripcion === TOUR_DEMO_PERITONITIS_BLOCK &&
      /A\) CLÍNICA:/.test(tourDemo.activos[0].descripcion) &&
      /B\) EXPLORACIÓN FÍSICA:/.test(tourDemo.activos[0].descripcion) &&
      /C\) PARACLÍNICA:/.test(tourDemo.activos[0].descripcion) &&
      tourDemo.inactivos.length >= 1,
    { fecha: tourDemo.fecha, inactivos: tourDemo.inactivos.length }
  );
  await addBtn('activos').click();
  const tourRowTa = form.locator('[data-seccion-rows="activos"] .listado-row').last().locator('textarea');
  await tourRowTa.fill(TOUR_DEMO_PERITONITIS_BLOCK);
  const renderedTourText = await tourRowTa.inputValue();
  check(
    'tour-demo peritonitis block (A/B/C, uppercase) survives the real textarea unchanged',
    renderedTourText === TOUR_DEMO_PERITONITIS_BLOCK,
    renderedTourText.slice(0, 60)
  );

  // ── Restart on the same data: listado content round-trips (save/load) ───
  // Saves are debounced (PERSIST_DEBOUNCE_MS = 400ms in clinical-repo-persist.mjs);
  // give the last edit time to flush before closing.
  const snapshotRows = () =>
    page.evaluate(() => {
      const out = {};
      for (const sec of ['activos', 'inactivos']) {
        out[sec] = Array.from(document.querySelectorAll(`[data-seccion-rows="${sec}"] .listado-row`)).map((row) => ({
          fecha: row.querySelector('input')?.value || '',
          descripcion: row.querySelector('textarea')?.value || '',
        }));
      }
      return out;
    });
  const beforeRestart = await snapshotRows();
  await page.waitForTimeout(700);
  await app.close();
  ({ app, page, pageErrors } = await r.launch());
  await page.locator('#apptab-lab').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#apptab-nota').click();
  await openPatient(page, A);
  await page.evaluate(() => window.switchInnerTab('listado'));
  await page.locator('#listado-form .listado-layout').waitFor({ state: 'visible' });
  const afterRestart = await page.evaluate(() => ({
    activosRows: document.querySelectorAll('[data-seccion-rows="activos"] .listado-row').length,
    inactivosRows: document.querySelectorAll('[data-seccion-rows="inactivos"] .listado-row').length,
  }));
  check(
    'listado content round-trips through save + app restart',
    afterRestart.activosRows === ACTIVOS.length + 1 && afterRestart.inactivosRows === INACTIVOS.length - 1,
    afterRestart
  );
  const afterRestartRows = await snapshotRows();
  check(
    'restart keeps each row\'s own fecha, descripción and section, not just the counts',
    JSON.stringify(afterRestartRows) === JSON.stringify(beforeRestart),
    { beforeRestart, afterRestartRows }
  );

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
