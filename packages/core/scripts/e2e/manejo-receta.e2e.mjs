#!/usr/bin/env node
/* global window */
/**
 * E2E: Manejo (SOME medication list → turn list, discharge text, pendientes)
 * and the monthly "Perfil histórico", driven through the real Electron app.
 * Synthetic DEMO patients and a made-up SOME list only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Import
 *     - a text that is not SOME is accepted, or the refusal says nothing
 *     - the toast counts meds / diets / pendientes / omitted lines wrong
 *     - oxygen is counted as a medication instead of "apoyo (O₂)"
 *     - the 3 potassium-replacement lines show as 3 medications, not 1
 *     - DIA# does not advance with the days since the SOME list
 *     - an IV medication does not convert to its oral equivalent (dose/units)
 *     - a subcutaneous medication (ENOXAPARINA) is wrongly converted to oral
 *     - the RHZE combo (DOTBAL) shows the wrong day-of-week schedule or DIA#
 *     - SOAP auto-pick misses a category other than antibiotics (antiHTA, antitrombótico)
 *     - the "Otros" destino picker is missing a therapeutic optgroup (N/HD/HI/NM)
 *   Pendientes
 *     - the TAC order and its contrast line become 2 pendientes
 *     - "KIT PARA …" leaks into the pendiente text
 *     - a lab study (BIOMETRÍA) becomes a pendiente
 *     - importing the same list again duplicates the pendientes
 *   Turn list
 *     - "Excl." does not drop the med from the discharge text / copy
 *     - an "Otros" med ticked for SOAP is sent with no Destino
 *     - Generico a Casoav adds nothing / wrong count
 *   Discharge text
 *     - the raw "||" SOME marker leaks into the window
 *     - "Nombre + Día" loses the advanced day, or the diet line is missing
 *   Diet-only list
 *     - emptying the paste box and closing it drops the diet
 *   Perfil histórico
 *     - a non-SOME month paste is accepted
 *     - SOME rows that differ only by DIA# show as separate meds
 *     - a "not given" mark is lost after a restart
 *     - "Eliminar mes" deletes on Cancel, or keeps the month on Eliminar
 *
 * Artifact: e2e-artifacts/manejo-receta/<run-id>/ (report.json, screenshots).
 *
 *   npm run e2e:manejo-receta
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const A = { exp: '7000007-7', name: 'DEMO MANEJO UNO', room: '307' };
const B = { exp: '7000008-8', name: 'DEMO MANEJO DOS', room: '308' };
const C = { exp: '7000010-0', name: 'DEMO MANEJO TRES', room: '310' };

const pad = (n) => String(n).padStart(2, '0');
const dmy = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const today = new Date();
const listDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
const D = dmy(listDay);

/** SOME "indicaciones" block (tab separated), dated two days ago. */
const row = (t, ...cols) => [`${D} 08:${t} a.m.`, ...cols, 'NW'].join('\t');
const SOME_LIST = [
  row('10:01', 'CUIDADOS', 'CUANTIFICAR BALANCE', '', 'POR TURNO', ''),
  row('10:02', 'DIETAS', 'BLANDA PICADA ALTA EN FIBRA', '1500 KCAL + 60 GR DE PROTEINA'),
  row('10:03', 'ESTUDIOS', 'BIOMETRÍA HEMÁTICA', '', 'EN AM', 'UNICA VEZ'),
  row('10:04', 'ESTUDIOS', 'TAC TORAX SIMPLE Y CONT', '', '', 'UNICA VEZ'),
  row('10:05', 'PROCEDIMIENTO', 'TOMOGRAFIA AXIAL COMPUTERIZADA DE TORAX', '', 'CONTRASTE PARA TAC DE TORAX', ''),
  row('10:06', 'PROCEDIMIENTO', 'HEMODIALISIS', '', 'KIT PARA HEMODIALISIS', ''),
  row('10:07', 'MEDICAMENTOS', 'CEFTRIAXONA 1 G SOL INY (*)', 'VIA INTRAVENOSA', '1 G // *DIA# 3*', 'CADA 24 HORAS'),
  row('10:08', 'MEDICAMENTOS', 'ENOXAPARINA 40 MG SOL INY 0.4 ML (+*)', 'VIA SUBCUTANEA', '40 MG //', 'CADA 24 HORAS'),
  row('10:09', 'MEDICAMENTOS', 'LOSARTAN 50 MG COMPRIMIDO (*)', 'VIA ORAL', '50 MG //', 'CADA 24 HORAS'),
  row('10:10', 'MEDICAMENTOS', 'PARACETAMOL 1 G SOL INY 100 ML (*)', 'VIA INTRAVENOSA', '1 G //', 'CADA 8 HORAS'),
  row('10:11', 'MEDICAMENTOS P2', 'ONDANSETRON 8 MG SOL INY 4 ML', 'VIA INTRAVENOSA', '8 MG // CRITERIO PRN: EN CASO DE NAUSEAS', 'PRN'),
  row('10:12', 'MEDICAMENTOS P2', 'DEXTROSA 50 % SOL INY 50 ML', 'VIA INTRAVENOSA', '50 ML / VEL.INF: GLUCOSA <70', 'PRN'),
  row('10:13', 'MEDICAMENTOS', 'FARMACO NUEVO XYZ 100 MG SOL INY', 'VIA INTRAVENOSA', '100 MG //', 'CADA 24 HORAS'),
  row('10:14', 'MEDICAMENTOS', 'OXIGENO MEDICINAL GAS', 'VIA INHALATORIA', '3 L/MIN // PUNTAS NASALES', 'POR TURNO'),
  row('10:15', 'MEDICAMENTOS', 'CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)', 'VIA INTRAVENOSA', '80 MEQ', '-'),
  row('10:16', 'MEDICAMENTOS', 'FOSFATO DE POTASIO 20 MEQ SOL INY 10 ML (+)', 'VIA INTRAVENOSA', '40 MEQ', '-'),
  row('10:17', 'MEDICAMENTOS', 'HARTMANN SOL INY 1000 ML', 'VIA INTRAVENOSA', '1000 ML / VEL.INF: PARA 12 HORAS', 'UNICA VEZ'),
].join('\n');
const DIET_ONLY = row('11:00', 'DIETAS', 'AYUNO', '');

/** IV meds that must convert to oral, plus an RHZE combo (DOTBAL), for patient C. */
const IV_ORAL_LIST = [
  row('09:01', 'MEDICAMENTOS', 'DEXAMETASONA 8 MG SOL INY', 'VIA INTRAVENOSA', '8 MG //', 'CADA 24 HORAS'),
  row('09:02', 'MEDICAMENTOS', 'CIPROFLOXACINO 400 MG SOL INY', 'VIA INTRAVENOSA', '400 MG //', 'CADA 12 HORAS'),
  row('09:03', 'MEDICAMENTOS', 'KETOROLACO 30 MG SOL INY', 'VIA INTRAVENOSA', '30 MG //', 'CADA 8 HORAS'),
  row('09:04', 'MEDICAMENTOS', 'RIFAMPICINA/ISONIAZIDA/PIRAZINAMIDA/ETAMBUTOL 150/75/400/300 MG TABLETA',
    'VIA ORAL', '4 TABLETA // DAR LOS LUNES - MIE - VIE *DIA# 7*', 'CADA 24 HORAS'),
].join('\n');

const r = createRun('manejo-receta');
const { check } = r;
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

await r.finish('Manejo + Perfil histórico', async () => {
  let { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  await pasteAndSave(page, fullLabs(A, 'Jan 10 2026 8:00AM'));
  await pasteAndSave(page, fullLabs(B, 'Jan 11 2026 8:00AM'));
  await openPatient(page, B);
  await openPatient(page, A);

  const toast = (re, timeout = 8000) =>
    page.locator('.toast', { hasText: re }).first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  const toastTexts = () => page.locator('.toast').allInnerTexts();
  async function openManejo() {
    await closeToasts(page);
    await page.locator('#apptab-med').click();
    await page.locator('#med-itab-receta').click();
    await page.waitForTimeout(300);
  }
  async function importSome(text) {
    await closeToasts(page);
    await page.locator('#med-import-open-btn').click();
    await page.locator('#med-input').fill(text);
    await page.getByRole('button', { name: 'Procesar receta' }).click();
    await page.waitForTimeout(400);
  }

  // ── Import ─────────────────────────────────────────────────────────────
  await openManejo();
  check('empty Manejo tells what to do', /Importar SOME/.test(await page.locator('#med-hint').innerText()));
  await importSome('Hola, esto no es SOME\nnada que ver');
  check('non-SOME text refused', await toast(/No parece el bloque de SOME/), await toastTexts());
  await page.getByRole('button', { name: 'Cancelar' }).locator('visible=true').first().click();

  await importSome(SOME_LIST);
  await r.shot(page, 'manejo');
  check('toast counts 11 meds · 1 diet · 3 pendientes, 2 omitted (1 cuidados, 1 lab study)',
    await toast(/Manejo actualizado \(11 medicamento\(s\) · 1 dieta\(s\) · 3 pendiente\(s\)\)\. Omitidas 2 líneas \(1 cuidados, 1 estudios de laboratorio\)/),
    await toastTexts());
  const title = flat(await page.locator('#med-turno-title-text').innerText());
  const apoyo = flat(await page.locator('#med-turno-apoyo').innerText());
  check('header: 8 meds (3 potassium lines = 1) plus 1 apoyo (O₂)', title === 'Medicamentos del turno · 8' && apoyo === 'más 1 apoyo (O₂)', { title, apoyo });
  const medRow = (name) => page.locator('.med-receta-row', { has: page.locator('.med-receta-name', { hasText: name }) });
  check('potassium lines show as one row', (await page.locator('.med-receta-row--potassium-repos').count()) === 1 &&
    (await medRow('CLORURO DE POTASIO').count()) === 0);
  check('DIA# 3 two days ago shows Día 5', flat(await medRow('CEFTRIAXONA').locator('.med-receta-dia').innerText()) === 'Día 5');
  check('diet card shows the diet with kcal and protein', /BLANDA PICADA ALTA EN FIBRA.*1500 kcal.*60 g proteína/.test(flat(await page.locator('.med-receta-diet-card').innerText())));
  check('Última importación date is the SOME date', (await page.locator('#med-fecha-actualizacion').innerText()).trim() === D);
  check('teaser: 8 medicamentos · diet · O₂', flat(await page.locator('#med-egreso-preview').innerText()) === '8 medicamentos · BLANDA PICADA ALTA EN FIBRA · O₂');
  const soapOn = async (name) => medRow(name).locator('input[data-med-soap-chk]').isChecked();
  check('SOAP pre-ticked for ceftriaxona, not for PRN ondansetrón or the unknown drug',
    (await soapOn('CEFTRIAXONA')) && (await medRow('ONDANSETR').locator('input[data-med-soap-chk]').count()) === 0 && !(await soapOn('XYZ')));
  check('SOAP auto-pick also covers antiHTA (losartán) and antitrombótico (enoxaparina), not just antibiotics',
    (await soapOn('LOSART')) && (await soapOn('ENOXAPARINA')));

  // ── Pendientes ─────────────────────────────────────────────────────────
  const pendientes = async () => {
    await closeToasts(page);
    await page.locator('#apptab-nota').click();
    await page.evaluate(() => window.switchInnerTab('todo'));
    await page.waitForTimeout(500);
    return page.locator('#todo-form').evaluate((el) =>
      [...el.querySelectorAll('input[type="text"], textarea, .todo-text, [data-todo-text]')]
        .map((x) => (x.value !== undefined && x.tagName !== 'DIV' ? x.value : x.textContent).trim())
        .filter((t) => /^(Estudio|Procedimiento):/.test(t))
    ).then(async (vals) => vals.length ? vals : (await page.locator('#todo-form').innerText()).match(/(Estudio|Procedimiento): [^\n]+/g) || []);
  };
  let pend = await pendientes();
  await r.shot(page, 'pendientes');
  check('pendientes: TAC order + contrast = 1 "TAC de Torax contrastada", KIT dropped, no BIOMETRÍA',
    pend.length === 2 && pend.includes('Estudio: TAC de Torax contrastada') && pend.includes('Procedimiento: HEMODIALISIS'), pend);
  await openManejo();
  await importSome(SOME_LIST);
  check('same list again → "2 pendiente(s) ya estaban en la lista"', await toast(/2 pendiente\(s\) ya estaban en la lista, no se repitieron/), await toastTexts());
  pend = await pendientes();
  check('still 2 pendientes after the second import', pend.length === 2, pend);

  // ── Turn list: Excl., Destino, Tratamiento ──────────────────────────────
  await openManejo();
  await medRow('LOSART').locator('.med-receta-checkcell input').first().check();
  await page.waitForTimeout(300);
  await closeToasts(page);
  await page.getByRole('button', { name: 'Abrir texto de egreso' }).click();
  const egreso = page.locator('#med-egreso-modal-backdrop');
  await egreso.waitFor({ state: 'visible' });
  const lines = () => egreso.locator('#med-egreso-modal-list li').allInnerTexts();
  let full = await lines();
  await r.shot(page, 'egreso-completa');
  check('discharge text drops the Excl. med (losartán)', full.length > 0 && !full.some((l) => /LOSART/i.test(l)), full);
  check('discharge text has no raw "||" marker', !full.some((l) => l.includes('||')), full);
  check('Completa keeps ceftriaxona at DÍA 5', full.some((l) => /CEFTRIAXONA.*D[IÍ]A 5/i.test(l)), full.filter((l) => /CEFTRIAX/.test(l)));
  check('IV paracetamol converts to 2 tabletas de 500 mg in the discharge text',
    full.some((l) => /PARACETAMOL 500 MG TABLETA/.test(l) && /TOMAR 2 TABLETAS \(1 G\) V[IÍ]A ORAL/.test(l)),
    full.filter((l) => /PARACETAMOL/.test(l)));
  check('subcutaneous enoxaparina stays subcutaneous, not converted to oral',
    full.some((l) => /ENOXAPARINA 40 MG SOLUCI[OÓ]N INYECTABLE/.test(l) && /V[IÍ]A SUBCUT[AÁ]NEA/.test(l)),
    full.filter((l) => /ENOXAPARINA/.test(l)));
  check('diet line under the list', /BLANDA PICADA ALTA EN FIBRA 1500 kcal · 60 g proteína/.test(await egreso.locator('#med-egreso-modal-summary').innerText()));
  await egreso.locator('#med-egreso-modal-tab-simple').click();
  const simple = await lines();
  check('"Nombre + Día" shows ceftriaxona (día 5)', simple.some((l) => /CEFTRIAXONA.*\(día 5\)/.test(l)), simple);
  await egreso.getByRole('button', { name: 'Copiar' }).click();
  await page.waitForTimeout(400);
  const clip = await app.evaluate(({ clipboard }) => clipboard.readText());
  check('Copiar puts the list on the clipboard, without the Excl. med', /CEFTRIAXONA/.test(clip) && !/LOSART/i.test(clip), clip.split('\n').slice(0, 4));
  await egreso.locator('#med-egreso-modal-tab-full').click();
  await egreso.getByRole('button', { name: 'Cerrar' }).click();

  await medRow('XYZ').locator('input[data-med-soap-chk]').check();
  await page.waitForTimeout(300);
  await closeToasts(page);
  await page.getByRole('button', { name: 'Inventado a Ficticio Casoap' }).click();
  check('"Otros" med with SOAP and no Destino is refused', await toast(/Elige destino para 1 medicamento\(s\) «Otros»/), await toastTexts());
  const destSelectHtml = await medRow('XYZ').locator('select.med-receta-dest').innerHTML();
  check('destino picker offers every therapeutic optgroup (N/HD/HI/NM)',
    ['label="N"', 'label="HD"', 'label="HI"', 'label="NM"'].every((g) => destSelectHtml.includes(g)) &&
    /Analg[eé]sicos/.test(destSelectHtml));
  await medRow('XYZ').locator('select.med-receta-dest').selectOption({ label: 'NM (soporte, crónicos, etc.)' });
  await page.waitForTimeout(300);
  await closeToasts(page);
  await page.getByRole('button', { name: 'Inventado a Ficticio Casoap' }).click();
  check('with a Destino it is sent to Estado Actual', await toast(/Propuesta en Estado Actual/), await toastTexts());

  await openManejo();
  await closeToasts(page);
  await page.getByRole('button', { name: 'Generico a Casoav' }).click();
  const txToast = await page.locator('.toast', { hasText: /línea\(s\) añadidas a Tratamiento/ }).first().innerText().catch(() => '');
  const txN = Number((txToast.match(/(\d+) línea/) || [])[1] || 0);
  // 7 rows carry SOAP; losartán is one of them but is Excl., so 6 lines.
  check('Generico a Casoav adds the 6 active SOAP meds (Excl. losartán left out)', txN === 6, txToast);

  // ── Diet-only list (patient B) ──────────────────────────────────────────
  await openPatient(page, B);
  await openManejo();
  await importSome(DIET_ONLY);
  check('diet-only list: "Manejo actualizado (1 dieta(s))"', await toast(/Manejo actualizado \(1 dieta\(s\)\)/), await toastTexts());
  await page.locator('#med-import-open-btn').click();
  await page.locator('#med-receta-paste-modal').getByRole('button', { name: 'Limpiar' }).click();
  await page.locator('#med-receta-paste-modal').getByRole('button', { name: 'Cancelar' }).click();
  await openPatient(page, A);
  await openPatient(page, B);
  await openManejo();
  check('emptying the paste box and closing it keeps the diet', /AYUNO/.test(await page.locator('#med-items-list').innerText().catch(() => '')));
  await r.shot(page, 'diet-only');

  // ── IV → oral conversion and RHZE combo (patient C) ───────────────────────
  await page.locator('#apptab-lab').click();
  await pasteAndSave(page, fullLabs(C, 'Jan 13 2026 8:00AM'));
  await openPatient(page, C);
  await openManejo();
  await importSome(IV_ORAL_LIST);
  check('toast counts 4 meds for patient C', await toast(/Manejo actualizado \(4 medicamento\(s\)\)/), await toastTexts());
  check('IV dexametasona shows the oral dose/units in the turn list (VO C/24H)',
    flat(await medRow('DEXAMETASONA').innerText()).includes('DEXAMETASONA 8MG VO C/24H'));
  check('IV ketorolaco converts 30mg → 10mg oral in the turn list',
    flat(await medRow('KETOROLACO').innerText()).includes('KETOROLACO 10MG VO C/8H'));
  check('RHZE combo shows as DOTBAL with the LUN-MIE-VIE schedule and its Día pill advanced (DIA# 7, 2 days ago → Día 9)',
    flat(await medRow('DOTBAL').innerText()).includes('DOTBAL 4 TABLETAS LUN-MIE-VIE') &&
    /Día 9/.test(await medRow('DOTBAL').locator('.med-receta-dia').innerText()));
  await closeToasts(page);
  await page.getByRole('button', { name: 'Abrir texto de egreso' }).click();
  const egresoC = page.locator('#med-egreso-modal-backdrop');
  await egresoC.waitFor({ state: 'visible' });
  const linesC = await egresoC.locator('#med-egreso-modal-list li').allInnerTexts();
  check('IV ciprofloxacino 400mg converts to 500mg oral tableta in the discharge text',
    linesC.some((l) => /CIPROFLOXACINO 500 MG TABLETA/.test(l)), linesC.filter((l) => /CIPROFLOXACINO/.test(l)));
  await egresoC.getByRole('button', { name: 'Cerrar' }).click();

  // ── Perfil histórico (patient A) ────────────────────────────────────────
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const days = [3, 2, 1].map((k) => Math.max(1, today.getDate() - k));
  const monthRow = (name, dosis, freq, via, marked) =>
    [name, dosis, freq, via, ...Array.from({ length: dim }, (_, i) => (marked.includes(i + 1) ? '1' : ''))].join('\t');
  const MONTH = [
    ['Medicamento', 'Dosis', 'Freq', 'Via', ...Array.from({ length: dim }, (_, i) => pad(i + 1))].join('\t'),
    monthRow('METAMIZOL SODICO 1 G SOL INY', '1 G //', 'Q8H', 'VIA INTRAVENOSA', days),
    ...days.map((d, i) => monthRow('VANCOMICINA 500 MG SOL INY 10 ML (*)', `1 G // *DIA# ${8 + i}*`, 'Q12H', 'VIA INTRAVENOSA', [d])),
  ].join('\n');
  const perfilRow = (name) => page.locator('#med-pharm-list .med-pharm-row', { has: page.locator('.med-pharm-name', { hasText: name }) });
  async function openPerfil() {
    await openManejo();
    await page.locator('#med-itab-perfil').click();
    await page.waitForTimeout(400);
  }
  async function pasteMonth(text) {
    await closeToasts(page);
    await page.locator('#med-pharm-paste-open-btn').click();
    await page.locator('#med-pharm-paste').fill(text);
    await page.locator('#med-pharm-import-btn').click();
    await page.waitForTimeout(400);
  }
  const oneModal = { locator: (sel) => page.locator('#med-pharm-modal-one').locator(sel), waitFor: (o) => page.locator('#med-pharm-modal-one').waitFor(o) };
  async function openDays(name) {
    await perfilRow(name).locator('.med-pharm-btn-dias').click();
    await oneModal.waitFor({ state: 'visible' });
    return oneModal.locator('td.day-pad.indicated');
  }
  await openPatient(page, A);
  await openPerfil();
  check('Manejo import already put ceftriaxona in this month', (await perfilRow('CEFTRIAXONA').count()) === 1);
  await pasteMonth('Medicamento\tDosis\nMETAMIZOL\t1 G');
  check('non-SOME month paste refused', await toast(/No parece un pegado SOME mensual/), await toastTexts());
  await page.keyboard.press('Escape');
  await pasteMonth(MONTH);
  check('month import: "Mes importado (2 medicamentos)"', await toast(/Mes importado \(2 medicamentos\)/), await toastTexts());
  check('3 vancomicina rows (DIA# 8, 9, 10) show as one med', (await perfilRow('VANCOMICINA').count()) === 1);
  await r.shot(page, 'perfil');
  let cells = await openDays('VANCOMICINA');
  check('vancomicina calendar marks 3 days', (await cells.count()) === 3, await cells.count());
  await cells.first().click();
  await page.waitForTimeout(300);
  check('clicking a day marks it "no administrado"', (await oneModal.locator('td.not-admin').count()) === 1);
  await r.shot(page, 'not-admin');
  await page.keyboard.press('Escape');

  // ── Restart: everything above must still be there ────────────────────────
  await app.close();
  ({ app, page, pageErrors } = await r.launch());
  await page.locator('#apptab-lab').waitFor({ state: 'visible' });
  await openPatient(page, A);
  await openManejo();
  check('after restart: A still has 8 meds, losartán still Excl.',
    flat(await page.locator('#med-turno-title-text').innerText()) === 'Medicamentos del turno · 8' &&
    (await medRow('LOSART').locator('.med-receta-checkcell input').first().isChecked()));
  await openPerfil();
  cells = await openDays('VANCOMICINA');
  check('after restart: the "no administrado" day is kept', (await oneModal.locator('td.not-admin').count()) === 1);
  await page.keyboard.press('Escape');
  await openPatient(page, B);
  await openManejo();
  check('after restart: B keeps its diet', /AYUNO/.test(await page.locator('#med-items-list').innerText().catch(() => '')));

  // ── Eliminar mes ─────────────────────────────────────────────────────────
  await openPatient(page, A);
  await openPerfil();
  const deleteMonth = async () => {
    await closeToasts(page);
    await page.locator('#med-pharm-output-more summary').click();
    await page.locator('#med-pharm-delete-month-btn').click();
    await page.locator('.wb-confirm-modal').waitFor({ state: 'visible' });
  };
  await deleteMonth();
  await page.locator('.wb-confirm-modal [data-wb-confirm-cancel]').click();
  check('Cancel keeps the month', (await perfilRow('VANCOMICINA').count()) === 1);
  await deleteMonth();
  await page.locator('.wb-confirm-modal [data-wb-confirm-ok]').click();
  check('Eliminar removes the month', (await toast(/Mes eliminado del perfil/)) && (await page.locator('#med-pharm-list .med-pharm-row').count()) === 0);
  await r.shot(page, 'month-deleted');

  await closeToasts(page);
  await openManejo();
  await page.getByRole('button', { name: 'Limpiar' }).locator('visible=true').first().click();
  check('Limpiar empties Manejo', (await toast(/Manejo actual limpiado/)) && /Importar SOME/.test(await page.locator('#med-hint').innerText()));

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
