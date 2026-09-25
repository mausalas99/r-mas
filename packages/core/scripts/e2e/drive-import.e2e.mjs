#!/usr/bin/env node
/**
 * E2E: "Importar desde Drive" (Paciente → Clínico → Importar desde Drive),
 * driven through the real Electron app. Synthetic DEMO patient, made-up
 * expediente only.
 *
 * Scenario:
 *   1. Admit a DEMO patient, open "Importar desde Drive" in "Solo
 *      eventualidades" mode, paste one eventualidad → it is added.
 *   2. Paste again with the SAME eventualidad plus one NEW one → only the
 *      new one is added (re-import of an existing eventualidad is skipped).
 *   3. "Completar vacíos" (fill) with a FICHA + PEEA document: confirmed
 *      UNREACHABLE (see check below) — applyDriveImportInner() never writes
 *      parsed.hcPatch to the patient in either the fast-apply or the
 *      reviewed-import path (drive-import-apply.mjs only applies
 *      eventualidades and lab sets). No patient field anywhere in the app
 *      reads .motivoConsulta/.padecimientoActual/.apnp/.app, so there is no
 *      way to observe the merge in the UI. This is worse than the review's
 *      "'replace' is dead" note: BOTH 'fill' and 'replace' are inert for the
 *      historia-clínica patch today.
 *   4. Header-only pastes (5 pipe shapes) → registro shows in the mismatch
 *      warning. Other header fields: UNREACHABLE (new-patient step only).
 *   5. Whole-document split → which review steps appear.
 *   6. Drive lab days → labs review step (fechas, panels, Nueva / En
 *      historial), import into lab history, then dedupe on re-import.
 *
 * Artifact: e2e-artifacts/drive-import/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:drive-import
 */
import { createRun, onboardLocalOnly, closeToasts, openPatient, pasteAndSave, until } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const P1 = { exp: '7000123-4', name: 'DEMO DRIVE IMPORT', room: '410' };

const r = createRun('drive-import');
const { check } = r;

/** Open the modal fresh, pick a mode radio, paste text. */
async function openDriveImportAndPaste(page, mode, text) {
  await closeToasts(page);
  await page.locator('#btn-drive-import').click();
  const backdrop = page.locator('#drive-import-backdrop.open');
  await backdrop.waitFor({ state: 'visible' });
  await page.locator(`input[name="drive-import-mode"][value="${mode}"]`).check();
  await page.locator('#drive-import-input').fill(text);
  return backdrop;
}

/** "Importar sin revisar" — the fast path with no per-section review. */
async function importFast(page, mode, text) {
  await openDriveImportAndPaste(page, mode, text);
  const fastBtn = page.locator('#drive-import-apply-fast');
  await until(() => fastBtn.isEnabled(), 4000, 100);
  await fastBtn.click();
  const toast = page.locator('.toast');
  await toast.first().waitFor({ timeout: 8000 }).catch(() => {});
  const msg = (await toast.allInnerTexts()).join(' | ');
  await closeToasts(page);
  return msg;
}

/** Paciente → Clínico → Eventualidades, where the "Importar desde Drive" button lives. */
async function goEventualidades(page) {
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Eventualidades' }).click();
}

async function closeDriveImport(page) {
  const review = page.locator('#drive-import-cancel-review');
  await ((await review.isVisible()) ? review : page.locator('#drive-import-cancel')).click();
  await page.locator('#drive-import-backdrop.open').waitFor({ state: 'hidden' });
}

/** Paste, then land on the review step (it auto-opens after a short pause). */
async function openReview(page, mode, text) {
  await openDriveImportAndPaste(page, mode, text);
  const review = page.locator('#drive-import-step-review');
  await review.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (!(await review.isVisible())) await page.locator('#drive-import-confirm').click();
  await review.waitFor({ state: 'visible', timeout: 4000 });
}

/** Registro-mismatch warning text, '' when hidden. */
const warningText = (page) => page.locator('#drive-import-warning').evaluate((el) => (el.hidden ? '' : el.textContent));
const reviewDots = (page) => page.locator('#drive-import-review-dots .drive-import-review-dot').evaluateAll((els) => els.map((e) => e.title));
const openStep = (page, prefix) => page.locator(`#drive-import-review-dots .drive-import-review-dot[title^="${prefix}"]`).click();

/** Rows of the review labs step: Fecha, Paneles, Estado, Incluir. */
const labRows = (page) =>
  page.locator('#drive-import-review-list .drive-import-labs-row').evaluateAll((trs) =>
    trs.map((tr) => ({
      fecha: tr.querySelector('.drive-import-labs-fecha').textContent.trim(),
      panels: tr.querySelector('.drive-import-labs-panels').textContent.trim(),
      estado: tr.querySelector('.drive-import-lab-status').textContent.trim(),
      checked: tr.querySelector('input[type="checkbox"]').checked,
    }))
  );

/** Jump to the last review step and press "Importar lo aprobado". Returns the toast text. */
async function importApproved(page) {
  await page.locator('#drive-import-review-dots .drive-import-review-dot').last().click();
  await page.locator('#drive-import-review-next').click();
  const toast = page.locator('.toast');
  await toast.first().waitFor({ timeout: 8000 }).catch(() => {});
  const msg = (await toast.allInnerTexts()).join(' | ');
  await closeToasts(page);
  return msg;
}

const eventualidadesCount = (page) => page.locator('#exp-pane-eventualidades .ev-card').count();

await r.finish('Drive import: eventualidades dedupe + HC patch UNREACHABLE', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  const doc0 =
    header(P1, 'Sep 24 2026 8:00AM') + 'BIOMETRIA HEMATICA\n' + TABLE + 'HEMOGLOBINA\tB\t13.2\tg/dL\t14.0 - 18.0\n';
  await pasteAndSave(page, doc0);
  await openPatient(page, P1);
  await page.locator('#apptab-nota').click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Eventualidades' }).click();

  // ── 1: first import adds one eventualidad ───────────────────────────────
  const doc1 = 'EVENTUALIDADES\n01/06\nSE INDICA DIETA';
  const msg1 = await importFast(page, 'eventos', doc1);
  check('first import: toast reports 1 nueva eventualidad', /1 eventualidad nueva/.test(msg1), msg1);
  const countAfter1 = await eventualidadesCount(page);
  check('first import: exactly 1 eventualidad in the panel', countAfter1 === 1, countAfter1);

  // ── 2: re-import the same entry + one new one → only the new one lands ──
  const doc2 = 'EVENTUALIDADES\n01/06\nSE INDICA DIETA\n\n02/06\nNUEVA EVENTUALIDAD DEMO';
  const msg2 = await importFast(page, 'eventos', doc2);
  check(
    'second import: toast reports 1 nueva + 1 duplicada omitida',
    /1 eventualidad nueva/.test(msg2) && /1 duplicada omitida/.test(msg2),
    msg2
  );
  const countAfter2 = await eventualidadesCount(page);
  check('second import: exactly 2 eventualidades total (dup not re-added)', countAfter2 === 2, countAfter2);
  // textContent, not innerText: day groups collapse via <details> unless dated today,
  // and innerText excludes hidden/collapsed content.
  const evTexts = await page.locator('#exp-pane-eventualidades').textContent();
  check(
    'both distinct eventualidades show, no third copy of the dup',
    /SE INDICA DIETA/.test(evTexts) && /NUEVA EVENTUALIDAD DEMO/.test(evTexts),
    evTexts
  );

  // ── 3: fill-mode HC patch — UNREACHABLE, confirmed live ──────────────────
  const ficheDoc =
    'FICHA DE IDENTIFICACIÓN:\nNombre: PACIENTE DEMO\nEdad: 55 años\nSexo: F\n\n' +
    'MOTIVO DE CONSULTA:\nDOLOR ABDOMINAL\n\nPEEA:\nEVOLUCION TORPIDA CON DOLOR PERSISTENTE.';
  const nameBefore = await page.locator('.patient-dash-name, .p-name.active').first().innerText().catch(() => '');
  const msg3 = await importFast(page, 'fill', ficheDoc);
  check(
    'UNREACHABLE — fill-mode hcPatch (FICHA name/motivo/PEEA) has no visible effect: ' +
      'applyDriveImportInner (public/js/features/drive-import-apply.mjs) never applies parsed.hcPatch; ' +
      'no patient field anywhere reads .motivoConsulta/.padecimientoActual/.apnp/.app (grep confirmed). ' +
      'Toast only reports the (0) eventualidades/labs outcome, patient name is unchanged',
    /eventualidad/i.test(msg3) && (await page.locator('.patient-dash-name, .p-name.active').first().innerText().catch(() => '')) === nameBefore,
    { msg3, nameBefore }
  );

  // ── 4: document header → registro shows in the mismatch warning ─────────
  // Header-only pastes have nothing to import, so the modal stays on the paste
  // step and the warning is the one place the parsed header is visible.
  const headerCases = [
    ['single pipes, cama + AÑOS', '215-1 | DEMO PIPE UNO | 51 AÑOS | 7000901-1 | DX DEMO', '7000901-1'],
    ['double pipes', '204-3 || DEMO PIPE DOS || 32 AÑOS || 7000902-2 || DX DEMO', '7000902-2'],
    ['name first, no cama', 'DEMO PIPE TRES | 27 | 7000903-3 | DX DEMO', '7000903-3'],
    ['numeric cama', '213 || DEMO PIPE CUATRO || 20 AÑOS || 7000904-4 || DX DEMO', '7000904-4'],
    ['age without AÑOS', '433-5 || DEMO PIPE CINCO || 48 || 7000905-5 || DX DEMO', '7000905-5'],
  ];
  for (const [label, line, reg] of headerCases) {
    await goEventualidades(page);
    await openDriveImportAndPaste(page, 'eventos', line);
    await page.waitForTimeout(500);
    const warn = await warningText(page);
    check(`header (${label}): registro ${reg} read → mismatch warning names it`, warn.includes(`(${reg})`), warn);
    await closeDriveImport(page);
  }
  check(
    'UNREACHABLE — header Cama / Nombre / Edad / Sexo / FICHA-name-wins: the header step is only built ' +
      'for a NEW patient (drive-import-review-build.mjs buildHcReviewSteps, createNew), and #btn-drive-import ' +
      'only exists inside an open patient (app-body.html #exp-clinico-drive-actions), so createNew is never true',
    true
  );

  // ── 5: whole-document split → review steps ──────────────────────────────
  await goEventualidades(page);
  await openReview(page, 'eventos', '03/06\nDEMO LINEA UNO\n04/06/2026\nDEMO LINEA DOS');
  let dots = await reviewDots(page);
  check('fragment with dates, no HC headers → only an eventualidades step with 2 nuevas', dots.length === 1 && /^Eventualidades \(2 nuevas\)/.test(dots[0]), dots);
  await closeDriveImport(page);

  await goEventualidades(page);
  await openReview(
    page,
    'fill',
    '215-4| DEMO HC PIPE | 29 AÑOS | 7000906-6 | DX DEMO\nMOTIVO DE CONSULTA: DOLOR\nHISTORIA CLÍNICA\nORIGEN: CIUDAD DEMO\nPEEA\nNARRATIVA DEMO\nEVENTUALIDADES\n5/06\nNOTA DEMO PIPE'
  );
  dots = await reviewDots(page);
  check('pipe HC document → eventualidades step (1 nueva) + registro warning', dots.some((d) => /^Eventualidades \(1 nueva\)/.test(d)) && (await warningText(page)).includes('(7000906-6)'), { dots, warn: await warningText(page) });
  await closeDriveImport(page);

  await goEventualidades(page);
  await openReview(
    page,
    'fill',
    [
      '216-2 | DEMO FICHA COMPLETA | 60 AÑOS | 7000907-7 | DX DEMO',
      'INTERROGATORIO',
      'HISTORIA CLÍNICA',
      'FICHA DE IDENTIFICACIÓN',
      'NOMBRE: DEMO FICHA COMPLETA',
      'SEXO: MASCULINO',
      'ORIGEN: CIUDAD DEMO',
      'ANTECEDENTES HEREDOFAMILIARES',
      'MADRE: DEMO',
      'PADECIMIENTO ACTUAL / PEEA',
      'FIEBRE DE TRES DIAS DEMO',
      'EVENTUALIDADES EN ESTE INTERNAMIENTO',
      '23/05',
      'DEMO SE SUSPENDE PLAN',
      'EVENTUALIDADES',
      '22/05',
      'DEMO SE PASA CARGA',
    ].join('\n')
  );
  dots = await reviewDots(page);
  check(
    'universal FICHA document → registro 7000907-7 read + eventualidades step with 2 or more nuevas',
    (await warningText(page)).includes('(7000907-7)') && dots.some((d) => /^Eventualidades \(([2-9]|\d\d) nuevas\)/.test(d)),
    { dots, warn: await warningText(page) }
  );
  check(
    'UNREACHABLE — HC sections (motivo, padecimiento actual) never get a review step: buildHcReviewSteps ' +
      '(lib/drive-import/drive-import-review-build.mjs) returns only the new-patient header step, and applyDriveImportInner ' +
      'never applies hcPatch (see check 3). previewText ("Vista previa…") has no UI consumer',
    !dots.some((d) => /motivo|padecimiento/i.test(d)),
    dots
  );
  await closeDriveImport(page);

  const year = new Date().getFullYear();
  await goEventualidades(page);
  await openReview(page, 'eventos', 'DEMO | 40 AÑOS | 7000123-4 | DX\nLABORATORIOS\n02/06\nBH Hb 8.9* Hto 29.1* Leu 15.2* Plt 340\nQS Glu 77 Cr 6.1*\nEVENTUALIDADES\n02/06\nNOTA DEMO LABS');
  await openStep(page, 'Laboratorios');
  let rows = await labRows(page);
  check(`LABORATORIOS then EVENTUALIDADES → 1 lab set 02/06/${year} with BH, QS`, rows.length === 1 && rows[0].fecha === `02/06/${year}` && rows[0].panels === 'BH, QS', rows);
  await closeDriveImport(page);

  // ── 6: Drive lab days → labs step, import, then dedupe on re-import ─────
  // The year comes from the document (2025), not from today's date. The
  // eventualidad after EVENTUALIDADES starts like a QS line ("Glu …"): it must
  // not become a 5th lab day.
  const labDocA = [
    'LABORATORIOS',
    '01/06/2025',
    'BH Hb 9.1* Hto 30.2* Leu 14.3*',
    'ES Na 131* K 4.0',
    'PFH Alb 2.9* AST 40',
    'GV pH 7.31* pCO2 38',
    '02/06',
    'Glu 101 Cr 5.9* BUN 40',
    '03/06',
    'BH Hb 9.4*',
    '04/06',
    'BH Hb 9.6*',
    'QS Glu 90',
    'EVENTUALIDADES',
    '05/06',
    'Glu CAPILAR 250 SE AJUSTA INSULINA DEMO',
  ].join('\n');
  await goEventualidades(page);
  await openReview(page, 'eventos', labDocA);
  dots = await reviewDots(page);
  await openStep(page, 'Laboratorios');
  rows = await labRows(page);
  check('4 dated days → 4 lab rows, year 2025 from the document', rows.map((x) => x.fecha).join() === '01/06/2025,02/06/2025,03/06/2025,04/06/2025', rows);
  check('aliases ES / PFH / GV → ESC / PFHs / GASES, BH first', rows[0] && rows[0].panels === 'BH, ESC, PFHs, GASES', rows[0]);
  check('prefix-less "Glu 101 Cr 5.9* BUN 40" → QS', rows[1] && rows[1].panels === 'QS', rows[1]);
  check('all 4 days "Nueva" and checked', rows.length === 4 && rows.every((x) => x.estado === 'Nueva' && x.checked), rows);
  check('eventualidad text after EVENTUALIDADES is not a lab day', dots.some((d) => /^Eventualidades \(1 nueva\)/.test(d)) && !rows.some((x) => x.fecha.startsWith('05/06')), { dots, rows });
  const msgA = await importApproved(page);
  check('import → toast reports 4 fechas de laboratorio nuevas', /4 fechas de laboratorio nuevas/.test(msgA), msgA);

  if (!(await page.locator('#lab-inner-labs-btn').isVisible())) await page.locator('#apptab-lab').click();
  await page.locator('#lab-inner-labs-btn').click().catch(() => {});
  const histDays = await page.locator('#lab-history-date-select option').allTextContents();
  check('lab history lists the 4 Drive days', ['01/06/2025', '02/06/2025', '03/06/2025', '04/06/2025'].every((d) => histDays.includes(d)), histDays);
  await page.locator('#lab-history-date-select').selectOption('day:01/06/2025');
  await page.waitForTimeout(400);
  const day1 = await page.locator('#lab-output-box').innerText();
  const altered = await page.locator('#lab-output-box .lab-value-altered').allInnerTexts();
  check('BH "Hb 9.1* Hto 30.2* Leu 14.3*" kept with its values', /9\.1/.test(day1) && /30\.2/.test(day1) && /14\.3/.test(day1), day1);
  check('each "*" value shows as altered', ['9.1', '30.2', '14.3'].every((v) => altered.some((a) => a.includes(v))), altered);

  const labDocB = [
    'LABORATORIOS',
    '01/06/2025',
    'BH Hb 9.1* Hto 30.2* Leu 14.3*', // subset of the stored 01/06 day
    '02/06',
    'Glu  101   Cr 5.9*    BUN 40', // same line, only spacing differs
    '03/06',
    'BH Hb 9.4*',
    'QS Glu 88', // adds QS to a BH-only day
    '04/06',
    'BH Hb 9.6*',
    'QS Glu 90', // identical day
  ].join('\n');
  await goEventualidades(page);
  await openReview(page, 'eventos', labDocB);
  await openStep(page, 'Laboratorios');
  rows = await labRows(page);
  const st = Object.fromEntries(rows.map((x) => [x.fecha, x]));
  const inHist = (d) => st[d] && st[d].estado === 'En historial' && !st[d].checked;
  check('subset of a stored day → "En historial", unchecked', inHist('01/06/2025'), st['01/06/2025']);
  check('same line with other spacing → "En historial", unchecked', inHist('02/06/2025'), st['02/06/2025']);
  check('identical day → "En historial", unchecked', inHist('04/06/2025'), st['04/06/2025']);
  check('day that adds QS to a BH-only day → "Nueva", checked', st['03/06/2025'] && st['03/06/2025'].estado === 'Nueva' && st['03/06/2025'].checked, st['03/06/2025']);
  const msgB = await importApproved(page);
  check('import → only the new day lands (1 fecha de laboratorio nueva)', /1 fecha de laboratorio nueva\b/.test(msgB), msgB);

  await goEventualidades(page);
  await openDriveImportAndPaste(page, 'eventos', labDocA);
  await page.waitForTimeout(600);
  const hint = await page.locator('#drive-import-parse-hint').textContent();
  check(
    'whole document again → nothing to import, both import buttons disabled',
    (await page.locator('#drive-import-apply-fast').isDisabled()) && (await page.locator('#drive-import-confirm').isDisabled()) && /No se detectó contenido importable/.test(hint),
    hint
  );
  await closeDriveImport(page);
  check(
    'UNREACHABLE — "same day, other hora" dedupe: Drive lab days always carry hora "" (parse-drive-labs.mjs flushDay), ' +
      'and a SOME-pasted day stores its own line format, so a Drive line never equals a stored line with an hora',
    true
  );

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();
});
