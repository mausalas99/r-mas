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
 *   Turn list (grouped by destino, Manejo-B)
 *     - the unknown drug is not in «Falta destino», or «Falta destino» is not first
 *     - a «Falta destino» row offers «Nota» before it has a destino
 *     - «Cambiar destino» does not move the row to its new group
 *     - ⊘ does not drop the med from the discharge text / copy, or the
 *       «Excluidos» group is not last, or «Restaurar» does not bring it back
 *     - the potassium group row cannot be excluded / restored
 *     - names show in ALL CAPS, or the dose is not split from the name
 *     - Añadir a Tratamiento adds nothing / wrong count
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
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, quietHints, goArea, acceptAbxDias } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const A = { exp: '7000007-7', name: 'DEMO MANEJO UNO', room: '307' };
const B = { exp: '7000008-8', name: 'DEMO MANEJO DOS', room: '308' };
const C = { exp: '7000010-0', name: 'DEMO MANEJO TRES', room: '310' };

const E = { exp: '7000011-1', name: 'DEMO MANEJO CUATRO', room: '311' };

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

/** Rich list for patient E: Stanford, insulin pump / rescate / prandial, IV→oral, SOAP families, TB, potassium. */
let rowN = 0;
const rowE = (...cols) => row(pad(10 + rowN++), ...cols);
const med = (nom, via, dosis, fr) => rowE('MEDICAMENTOS', nom, via, dosis, fr);
const RICH_LIST = [
  rowE('DIETAS', 'HIPOSODICA PARA DIABETICO', '1800 KCAL'),
  med('NISTATINA 100000 UI/ML SUSPENSION 60 ML', 'VIA ORAL', '5 ML // PARA SOLUCIÓN STANFORD', 'CADA 6 HORAS'),
  med('LIDOCAINA 2 % GEL 30 G', 'VIA ORAL', '10 ML // PARA SOLUCIÓN STANFORD', 'CADA 6 HORAS'),
  med('LORATADINA 10 MG TABLETA', 'VIA ORAL', '10 MG // PARA SOLUCIÓN STANFORD *DIA# 2*', 'CADA 6 HORAS'),
  med('CLORURO DE SODIO 0.9 % SOL INY 100 ML', 'VIA INTRAVENOSA', '100 ML / VEL.INF: BOMBA EN ALGORITMO 3', 'CADA 24 HORAS'),
  med('INSULINA HUMANA RAPIDA', 'VIA INTRAVENOSA', '100 UI', '-'),
  med('INSULINA HUMANA RAPIDA', 'VIA SUBCUTANEA', '3 UI // CRITERIO PRN: EN CASO DE DESTROXTIS ENTRE 181 - 220', 'PRN'),
  med('INSULINA HUMANA RAPIDA', 'VIA SUBCUTANEA', '5 UI // CRITERIO PRN: EN CASO DE DESTROXTIS ENTRE 221 - 300', 'PRN'),
  med('INSULINA HUMANA RAPIDA', 'VIA SUBCUTANEA', '6 UI // ANTES DEL DESAYUNO', 'UNICA VEZ'),
  med('INSULINA HUMANA RAPIDA', 'VIA SUBCUTANEA', '6 UI // ANTES DE LA CENA', 'UNICA VEZ'),
  med('INSULINA GLARGINA 100 UI/ML SOL INY 3 ML', 'VIA SUBCUTANEA', '20 UI //', 'CADA 24 HORAS'),
  med('OMEPRAZOL 40 MG SOL INY', 'VIA INTRAVENOSA', '40 MG //', 'CADA 12 HORAS'),
  med('METRONIDAZOL 500 MG SOL INY 100 ML', 'VIA INTRAVENOSA', '500 MG //', 'CADA 8 HORAS'),
  med('ONDANSETRON 8 MG SOL INY 4 ML', 'VIA INTRAVENOSA', '8 MG //', 'CADA 8 HORAS'),
  med('PARACETAMOL 1 G SOL INY 100 ML (*)', 'VIA INTRAVENOSA', '1 G //', 'CADA 8 HORAS'),
  med('FUROSEMIDA 20 MG SOL INY 2 ML', 'VIA INTRAVENOSA', '40 MG //', 'CADA 12 HORAS'),
  med('MEROPENEM 1 G SOL INY (*)', 'VIA INTRAVENOSA', '1 G // *DIA# 4*', 'CADA 8 HORAS'),
  med('VANCOMICINA 500 MG SOL INY (*)', 'VIA INTRAVENOSA', '1 G // *DIA# 4*', 'CADA 12 HORAS'),
  med('AZITROMICINA 500 MG TABLETA', 'VIA ORAL', '500 MG //', 'CADA 24 HORAS'),
  med('RIFAMPICINA 300 MG CAPSULA', 'VIA ORAL', '600 MG // *DIA# 5*', 'CADA 24 HORAS'),
  med('RIFAMPICINA/ISONIAZIDA/PIRAZINAMIDA/ETAMBUTOL 150/75/400/300 MG TABLETA', 'VIA ORAL', '3 TABLETA // *DIA# 5*', 'CADA 24 HORAS'),
  med('ENALAPRIL 10 MG TABLETA', 'VIA ORAL', '10 MG //', 'CADA 12 HORAS'),
  med('AMLODIPINO 5 MG TABLETA', 'VIA ORAL', '5 MG //', 'CADA 24 HORAS'),
  med('CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)', 'VIA INTRAVENOSA', '40 MEQ', '-'),
  med('HARTMANN SOL INY 1000 ML', 'VIA INTRAVENOSA', '1000 ML / VEL.INF: 100 ML/HORA', 'UNICA VEZ'),
].join('\n');
/** Two potassium replacements with a saline carrier: the hours come from volume / rate or from "PARA X HORAS". */
const K_RATE = [
  med('CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)', 'VIA INTRAVENOSA', '80 MEQ', '-'),
  med('CLORURO DE SODIO 0.9 % SOL INY 1000 ML', 'VIA INTRAVENOSA', '1000 ML / VEL.INF: 50 ML/HORA', 'UNICA VEZ'),
].join('\n');
const K_HOURS = [
  med('CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)', 'VIA INTRAVENOSA', '40 MEQ', '-'),
  med('CLORURO DE SODIO 0.9 % SOL INY 500 ML', 'VIA INTRAVENOSA', '500 ML / VEL.INF: PARA 4 HORAS', 'UNICA VEZ'),
].join('\n');

const r = createRun('manejo-receta');
const { check } = r;
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

await r.finish('Manejo + Perfil histórico', async () => {
  let { app, page, pageErrors } = await r.launch();
  await quietHints(page);
  await onboardLocalOnly(page);
  await goArea(page, 'lab');
  await pasteAndSave(page, fullLabs(A, 'Jan 10 2026 8:00AM'));
  await pasteAndSave(page, fullLabs(B, 'Jan 11 2026 8:00AM'));
  await openPatient(page, B);
  await openPatient(page, A);

  const toast = (re, timeout = 8000) =>
    page.locator('.toast', { hasText: re }).first().waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  const toastTexts = () => page.locator('.toast').allInnerTexts();
  async function openManejo() {
    await closeToasts(page);
    await goArea(page, 'med');
    await page.locator('#med-itab-receta').click();
    await page.waitForTimeout(300);
  }
  async function importSome(text) {
    await closeToasts(page);
    await page.locator('#med-import-open-btn').click();
    await page.locator('#med-input').fill(text);
    await page.getByRole('button', { name: 'Procesar receta' }).click();
    await page.waitForTimeout(400);
    await acceptAbxDias(page);
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
  check('diet chip in the header shows the diet with kcal and protein', /BLANDA PICADA ALTA EN FIBRA.*1500 kcal.*60 g proteína/.test(flat(await page.locator('#med-diet-chip').innerText())));
  check('Última importación date is the SOME date', (await page.locator('#med-fecha-actualizacion').innerText()).trim() === D);
  const groupOf = (name) => medRow(name).evaluate((el) => el.closest('[data-med-group]').dataset.medGroup);
  const groups = () => page.locator('#med-items-list [data-med-group]').evaluateAll((els) => els.map((e) => e.dataset.medGroup));
  let g = await groups();
  check('groups: «Falta destino» first, holding the unknown drug XYZ; ceftriaxona under Antibióticos',
    g[0] === 'falta' && (await groupOf('XYZ')) === 'falta' && (await groupOf('CEFTRIAXONA')) === 'abx', g);
  check('«Falta destino» label is amber-classed and counted', /FALTA DESTINO · 1/i.test(flat(await page.locator('[data-med-group="falta"] .med-group-label').innerText())));
  check('names in sentence case, dose split out (Paracetamol · 1 g VO c/8 h)',
    flat(await medRow('PARACETAMOL').locator('.med-row-name').innerText()) === 'Paracetamol' &&
    flat(await medRow('PARACETAMOL').locator('.med-row-dose').innerText()) === '1 g VO c/8 h',
    flat(await medRow('PARACETAMOL').innerText()));
  check('PRN tag on ondansetrón, and it sits in «Solo egreso»', (await medRow('ONDANSETR').locator('.med-prn-tag').count()) === 1 && (await groupOf('ONDANSETR')) === 'solo');
  check('Egreso button is in the header', await page.locator('#med-egreso-open-btn').isVisible());
  const soapOn = async (name) => (await medRow(name).locator('[data-med-soap-chk][aria-pressed="true"]').count()) === 1;
  check('Nota pre-pressed for ceftriaxona; no Nota for PRN ondansetrón nor the «Falta destino» drug',
    (await soapOn('CEFTRIAXONA')) && (await medRow('ONDANSETR').locator('[data-med-soap-chk]').count()) === 0 &&
    (await medRow('XYZ').locator('[data-med-soap-chk]').count()) === 0);
  check('SOAP auto-pick also covers antiHTA (losartán) and antitrombótico (enoxaparina), not just antibiotics',
    (await soapOn('LOSART')) && (await soapOn('ENOXAPARINA')));

  // ── Pendientes ─────────────────────────────────────────────────────────
  const pendientes = async () => {
    await closeToasts(page);
    await goArea(page, 'nota');
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
  await medRow('LOSART').locator('.med-excl-btn').click();
  await page.waitForTimeout(300);
  g = await groups();
  check('⊘ moves losartán to «Excluidos», the last group, with «Restaurar»',
    g[g.length - 1] === 'excl' && (await groupOf('LOSART')) === 'excl' && (await medRow('LOSART').locator('.med-restore-btn').count()) === 1, g);
  const kRow = page.locator('.med-receta-row--potassium-repos');
  await kRow.locator('.med-excl-btn').click();
  await page.waitForTimeout(300);
  // An excluded K line is no longer a "reposición": each line waits in «Excluidos» on its own.
  const kExcl = (await groupOf('CLORURO DE POTASIO')) === 'excl' && (await groupOf('FOSFATO DE POTASIO')) === 'excl' && (await kRow.count()) === 0;
  for (const name of ['CLORURO DE POTASIO', 'FOSFATO DE POTASIO']) {
    await medRow(name).locator('.med-restore-btn').click();
    await page.waitForTimeout(300);
  }
  const kBack = (await kRow.count()) === 1 && (await kRow.evaluate((el) => el.closest('[data-med-group]').dataset.medGroup)) === 'repo';
  check('potassium group row: ⊘ → both lines in «Excluidos», Restaurar each → one row back in «Reposiciones»', kExcl && kBack, { kExcl, kBack });
  await medRow('PARACETAMOL').locator('[data-med-soap-chk]').click();
  await page.waitForTimeout(200);
  const notaOff = !(await soapOn('PARACETAMOL'));
  await medRow('PARACETAMOL').locator('[data-med-soap-chk]').click();
  await page.waitForTimeout(200);
  check('Nota chip toggles off and back on (same row, no re-render)', notaOff && (await soapOn('PARACETAMOL')));
  await r.shot(page, 'manejo-grupos');
  await closeToasts(page);
  await page.locator('#med-egreso-open-btn').click();
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

  const destSelectHtml = await medRow('XYZ').locator('select.med-receta-dest').innerHTML();
  check('destino picker offers every therapeutic optgroup (N/HD/HI/NM)',
    ['label="N"', 'label="HD"', 'label="HI"', 'label="NM"'].every((g) => destSelectHtml.includes(g)) &&
    /Analg[eé]sicos/.test(destSelectHtml));
  await medRow('XYZ').locator('select.med-receta-dest').selectOption({ label: 'NM (soporte, crónicos, etc.)' });
  await page.waitForTimeout(300);
  g = await groups();
  check('«Cambiar destino» moves XYZ to NM and «Falta destino» disappears', (await groupOf('XYZ')) === 'nm' && !g.includes('falta'), g);
  await medRow('XYZ').locator('[data-med-soap-chk]').click();
  await page.waitForTimeout(200);
  await closeToasts(page);
  await page.getByRole('button', { name: 'Enviar a Estado Actual' }).click();
  check('with a Destino it is sent to Estado Actual', await toast(/Propuesta en Estado Actual/), await toastTexts());

  await openManejo();
  await closeToasts(page);
  await page.getByRole('button', { name: 'Añadir a Tratamiento' }).click();
  const txToast = await page.locator('.toast', { hasText: /línea\(s\) añadidas a Tratamiento/ }).first().innerText().catch(() => '');
  const txN = Number((txToast.match(/(\d+) línea/) || [])[1] || 0);
  // 7 rows carry SOAP; losartán is one of them but is Excl., so 6 lines.
  check('Añadir a Tratamiento adds the 6 active SOAP meds (Excl. losartán left out)', txN === 6, txToast);

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
  check('emptying the paste box and closing it keeps the diet', /AYUNO/.test(await page.locator('#med-diet-chip').innerText().catch(() => '')));
  await r.shot(page, 'diet-only');

  // ── IV → oral conversion and RHZE combo (patient C) ───────────────────────
  await goArea(page, 'lab');
  await pasteAndSave(page, fullLabs(C, 'Jan 13 2026 8:00AM'));
  await openPatient(page, C);
  await openManejo();
  await importSome(IV_ORAL_LIST);
  check('toast counts 4 meds for patient C', await toast(/Manejo actualizado \(4 medicamento\(s\)\)/), await toastTexts());
  check('IV dexametasona shows the oral dose/units in the turn list (VO c/24 h)',
    flat(await medRow('DEXAMETASONA').locator('.med-row-dose').innerText()) === '8 mg VO c/24 h', flat(await medRow('DEXAMETASONA').innerText()));
  check('IV ketorolaco converts 30mg → 10mg oral in the turn list',
    flat(await medRow('KETOROLACO').locator('.med-row-dose').innerText()) === '10 mg VO c/8 h', flat(await medRow('KETOROLACO').innerText()));
  check('RHZE combo shows as DOTBAL with the LUN-MIE-VIE schedule and its Día pill advanced (DIA# 7, 2 days ago → Día 9)',
    /Dotbal/.test(flat(await medRow('DOTBAL').innerText())) && /4 tabletas lun-mie-vie/.test(flat(await medRow('DOTBAL').innerText())) &&
    /Día 9/.test(await medRow('DOTBAL').locator('.med-receta-dia').innerText()));
  await closeToasts(page);
  await page.locator('#med-egreso-open-btn').click();
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
  await page.locator('.topbar-area-btn').waitFor({ state: 'visible' });
  await openPatient(page, A);
  await openManejo();
  check('after restart: A still has 8 meds, losartán still Excl.',
    flat(await page.locator('#med-turno-title-text').innerText()) === 'Medicamentos del turno · 8' &&
    (await medRow('LOSART').locator('.med-restore-btn').count()) === 1);
  await openPerfil();
  cells = await openDays('VANCOMICINA');
  check('after restart: the "no administrado" day is kept', (await oneModal.locator('td.not-admin').count()) === 1);
  await page.keyboard.press('Escape');
  await openPatient(page, B);
  await openManejo();
  check('after restart: B keeps its diet', /AYUNO/.test(await page.locator('#med-diet-chip').innerText().catch(() => '')));

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

  // ── Long list (22 meds): dense rows, 3 columns, no scrolling ─────────────
  const LONG = ['ACIDO FOLICO 5 MG TABLETA', 'AZATIOPRINA 50 MG TABLETA', 'BENZONATATO 100 MG PERLA', 'FENAZOPIRIDINA 100 MG TABLETA',
    'HIDROXICLOROQUINA 200 MG TABLETA', 'POLIETILENGLICOL 3350 POLVO 17 G', 'PREDNISONA 20 MG TABLETA', 'SENOSIDOS A-B 8.6 MG TABLETA',
    'LOSARTAN 50 MG COMPRIMIDO', 'ATORVASTATINA 40 MG TABLETA', 'FUROSEMIDA 40 MG TABLETA', 'ENALAPRIL 10 MG TABLETA',
    'NIFEDIPINO 30 MG TABLETA', 'METFORMINA 850 MG TABLETA', 'SERTRALINA 50 MG TABLETA', 'OMEPRAZOL 20 MG CAPSULA',
    'PARACETAMOL 500 MG TABLETA', 'ONDANSETRON 8 MG TABLETA', 'AMLODIPINO 5 MG TABLETA', 'ESPIRONOLACTONA 25 MG TABLETA',
    'LEVOTIROXINA 100 MCG TABLETA', 'TAMSULOSINA 0.4 MG CAPSULA']
    .map((n, i) => row(pad(10 + i), 'MEDICAMENTOS', n, 'VIA ORAL', n.match(/[\d.]+ (?:MG|MCG|G)/)[0] + ' //', 'CADA 24 HORAS')).join('\n');
  await importSome(LONG);
  await closeToasts(page);
  const dense = await page.evaluate(() => {
    const wrap = globalThis.document.querySelector('#med-subview-receta .med-groups');
    const area = globalThis.document.getElementById('med-work-area');
    const rows = [...globalThis.document.querySelectorAll('#med-subview-receta .med-receta-row')];
    return { dense: !!wrap && wrap.classList.contains('med-groups--dense'), rows: rows.length,
      tallest: Math.max(...rows.map((x) => x.getBoundingClientRect().height)),
      fits: area.scrollHeight <= area.clientHeight + 2, scroll: area.scrollHeight, view: area.clientHeight };
  });
  check('22 meds: dense rows (≤44 px) and the list fits with no scrolling', dense.dense && dense.rows === 22 && dense.tallest <= 44 && dense.fits, dense);
  await r.shot(page, 'manejo-dense');

  // ── Rich list (patient E): Stanford, insulin, IV→oral, SOAP families, TB, EA, Medicamentos panel ──
  await goArea(page, 'lab');
  await pasteAndSave(page, fullLabs(E, 'Jan 14 2026 8:00AM'));
  await openPatient(page, E);
  await openManejo();
  await importSome(RICH_LIST);
  check('toast counts 24 meds · 1 diet for patient E', await toast(/Manejo actualizado \(24 medicamento\(s\) · 1 dieta\(s\)\)/), await toastTexts());
  await r.shot(page, 'manejo-rich');
  const rowsWith = (re) => page.locator('#med-items-list .med-receta-row', { hasText: re });
  await groups();
  check('Solución Stanford (3 marked meds) is ONE row, and the 3 parts do not show alone',
    (await rowsWith(/stanford/i).count()) === 1 && /nistatina.*lidocaina.*loratadina/i.test(flat(await rowsWith(/stanford/i).innerText())) &&
    (await page.locator('.med-receta-row', { hasText: /^Loratadina/ }).count()) === 0, flat(await rowsWith(/stanford/i).innerText()));
  check('insulin pump: one «BOMBA DE INSULINA ALGORITMO 3» row, the saline + IV insulin carriers are hidden',
    (await rowsWith(/BOMBA DE INSULINA ALGORITMO 3/i).count()) === 1 && (await rowsWith(/cloruro de sodio/i).count()) === 0 &&
    (await rowsWith(/Insulina humana/i).count()) === 0);
  check('rescate scale is one «Rescates de insulina» row; the 2 prandial doses are one «Insulina preprandial» row; glargina stays its own row',
    (await rowsWith(/Rescates de insulina/i).count()) === 1 && (await rowsWith(/Insulina preprandial/i).count()) === 1 &&
    /6 UI SC previo a comidas/i.test(flat(await rowsWith(/Insulina preprandial/i).innerText())) && (await medRow('glargina').count()) === 1);
  check('IV omeprazol, metronidazol, ondansetrón and furosemida show the oral dose in the turn list',
    (await Promise.all([['OMEPRAZOL', '40 mg VO c/12 h'], ['METRONIDAZOL', '500 mg VO c/8 h'], ['ONDANSETR', '8 mg VO c/8 h'], ['FUROSEMIDA', '40 mg VO c/12 h']]
      .map(async ([n, d]) => flat(await medRow(n).locator('.med-row-dose').innerText()) === d))).every(Boolean));
  check('IV meropenem and vancomicina stay IV, Día advanced 4 → 6',
    (await Promise.all(['MEROPENEM', 'VANCOMICINA'].map(async (n) => /IV c\/(8|12) h/.test(flat(await medRow(n).locator('.med-row-dose').innerText())) &&
      flat(await medRow(n).locator('.med-receta-dia').innerText()) === 'Día 6'))).every(Boolean));
  check('daily RHZE combo: DOTBAL «3 tabletas c/24 h», Día 7; RIFAMPICINA alone is a separate row «600 mg VO c/24 h», Día 7',
    /Dotbal/.test(flat(await medRow('DOTBAL').innerText())) && /3 tabletas c\/24 h/.test(flat(await medRow('DOTBAL').innerText())) &&
    flat(await medRow('DOTBAL').locator('.med-receta-dia').innerText()) === 'Día 7' &&
    flat(await medRow('RIFAMPICINA').first().locator('.med-row-dose').innerText()) === '600 mg VO c/24 h' &&
    (await page.locator('.med-receta-row', { hasText: /^Rifampicina/ }).count()) === 1);
  check('SOAP families: abx (metronidazol, meropenem, vancomicina, azitromicina, rifampicina, Dotbal, Stanford) in Antibióticos; enalapril + amlodipino antiHTA; furosemida diuréticos; omeprazol NM',
    (await Promise.all([['METRONIDAZOL', 'abx'], ['MEROPENEM', 'abx'], ['VANCOMICINA', 'abx'], ['AZITROMICINA', 'abx'], ['DOTBAL', 'abx'],
      ['ENALAPRIL', 'antihta'], ['AMLODIPINO', 'antihta'], ['FUROSEMIDA', 'diuretico'], ['OMEPRAZOL', 'nm'], ['PARACETAMOL', 'analgesia'], ['ONDANSETR', 'antiemeticos']]
      .map(async ([n, grp]) => (await groupOf(n)) === grp))).every(Boolean) &&
    (await page.locator('[data-med-group="abx"] .med-receta-row', { hasText: /stanford/i }).count()) === 1, await groups());
  check('every class above is pre-ticked for the Nota (SOAP chip on)',
    (await Promise.all(['METRONIDAZOL', 'MEROPENEM', 'ENALAPRIL', 'FUROSEMIDA', 'OMEPRAZOL'].map((n) => soapOn(n)))).every(Boolean));
  check('potassium replacement with no saline carrier rate: one «Reposición de potasio 40 mEq» row',
    /Reposición de potasio\s*40 mEq/.test(flat(await page.locator('.med-receta-row--potassium-repos').innerText())));

  // Discharge text for the rich list
  await closeToasts(page);
  await page.locator('#med-egreso-open-btn').click();
  const egE = page.locator('#med-egreso-modal-backdrop');
  await egE.waitFor({ state: 'visible' });
  const fullE = await egE.locator('#med-egreso-modal-list li').allInnerTexts();
  const has = (re) => fullE.some((l) => re.test(l));
  check('discharge: OMEPRAZOL → 2 cápsulas de 20 mg; METRONIDAZOL and ONDANSETRÓN → 1 TABLETA (singular)',
    has(/OMEPRAZOL 20 MG C[AÁ]PSULA: TOMAR 2 C[AÁ]PSULAS \(40 MG\) V[IÍ]A ORAL CADA 12 HORAS/) &&
    has(/METRONIDAZOL 500 MG TABLETA: TOMAR 1 TABLETA \(500 MG\) V[IÍ]A ORAL CADA 8 HORAS/) &&
    has(/ONDANSETR[OÓ]N 8 MG TABLETA: TOMAR 1 TABLETA \(8 MG\)/), fullE);
  check('discharge: paracetamol keeps the full suffix «, SIN SUSPENDER HASTA NUEVO AVISO.»',
    has(/PARACETAMOL 500 MG TABLETA: TOMAR 2 TABLETAS \(1 G\) V[IÍ]A ORAL CADA 8 HORAS, SIN SUSPENDER HASTA NUEVO AVISO\.$/), fullE.filter((l) => /PARACETAMOL/.test(l)));
  check('discharge: meropenem and vancomicina stay IV with «DÍA 6 DE TRATAMIENTO»; rifampicina and the TB combo DÍA 7; loratadina DÍA 4',
    has(/MEROPENEM.*V[IÍ]A INTRAVENOSA.*D[IÍ]A 6 DE TRATAMIENTO/) && has(/VANCOMICINA.*V[IÍ]A INTRAVENOSA.*D[IÍ]A 6 DE TRATAMIENTO/) &&
    has(/^RIFAMPICINA 300.*D[IÍ]A 7 DE TRATAMIENTO/) && has(/^RIFAMPICINA\/ISONIAZIDA.*3 TABLETA.*D[IÍ]A 7/) && has(/LORATADINA.*D[IÍ]A 4 DE TRATAMIENTO/), fullE);
  check('discharge: insulin pump line, both rescate tiers, prandial insulin and glargina appear (no raw «||»)',
    has(/^BOMBA DE INSULINA EN ALGORITMO 3$/) && has(/APLICAR 3 UI EN CASO DE DESTROXTIS ENTRE 181 - 220/) && has(/APLICAR 5 UI EN CASO DE DESTROXTIS ENTRE 221 - 300/) &&
    fullE.filter((l) => /^INSULINA HUMANA RAPIDA: APLICAR 6 UI/.test(l)).length === 2 && has(/INSULINA GLARGINA.*APLICAR 20 UI/) && !fullE.some((l) => l.includes('||')), fullE.filter((l) => /INSULINA|BOMBA/.test(l)));
  check('discharge: Stanford parts are listed one by one (component names kept)',
    has(/^NISTATINA/) && has(/^LIDOCAINA/) && has(/^LORATADINA/), fullE.slice(0, 4));
  check('diet line: «HIPOSODICA PARA DIABETICO 1800 kcal» (no protein part)', /HIPOSODICA PARA DIABETICO 1800 kcal$/.test((await egE.locator('#med-egreso-modal-summary').innerText()).trim()));
  await egE.locator('#med-egreso-modal-tab-simple').click();
  const simpleE = await egE.locator('#med-egreso-modal-list li').allInnerTexts();
  check('«Nombre + Día»: only name, and «(día N)» for dated meds (loratadina día 4, meropenem día 6); no dose text',
    simpleE.some((l) => /^LORATADINA 10 MG TABLETA \(d[ií]a 4\)$/.test(l)) && simpleE.some((l) => /^MEROPENEM.*\(d[ií]a 6\)$/.test(l)) &&
    simpleE.some((l) => /^BOMBA DE INSULINA EN ALGORITMO 3$/.test(l)) && !simpleE.some((l) => /TOMAR|CADA/.test(l)), simpleE);
  await egE.getByRole('button', { name: 'Cerrar' }).click();

  // Clínico › Medicamentos: dose grid from the SOME frequency, marks, hide
  const openMedAdmin = async () => {
    await closeToasts(page);
    await goArea(page, 'nota');
    await page.locator('.exp-group-pill[data-group="clinico"]').hover();
    await page.locator('.exp-group-section[data-section="medAdmin"]').click();
    await page.locator('#exp-pane-medAdmin .med-admin-panel').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
  };
  await openMedAdmin();
  await r.shot(page, 'med-admin');
  const adminRow = (name) => page.locator('#exp-pane-medAdmin tbody tr', { has: page.locator('.med-cell-name', { hasText: name }) }).first();
  const doseTimes = async (name) => adminRow(name).locator('td.indicated').evaluateAll((els) => els.map((e) => e.dataset.medAdminKey.split('|')[1]));
  const hdrs = await page.locator('#exp-pane-medAdmin th.day-hdr').allInnerTexts();
  check('Medicamentos grid: columns are the union of the schedules (00, 06, 08, 12, 14, 18, 22)', hdrs.join(',') === '00:00,06:00,08:00,12:00,14:00,18:00,22:00', hdrs);
  const times = { amlo: await doseTimes('AMLODIPINO'), enal: await doseTimes('ENALAPRIL'), mero: await doseTimes('MEROPENEM'), nist: await doseTimes('NISTATINA') };
  check('dose times follow the frequency: c/24 h = 06; c/12 h = 06,18; c/8 h = 06,14,22; c/6 h = 00,06,12,18',
    times.amlo.join() === '06:00' && times.enal.join() === '06:00,18:00' && times.mero.join() === '06:00,14:00,22:00' && times.nist.join() === '00:00,06:00,12:00,18:00', times);
  check('single-dose insulin rows (UNICA VEZ) sit at 08:00; the Día pill shows on dated meds',
    (await adminRow('INSULINA HUMANA').locator('td.indicated').evaluateAll((els) => els.map((e) => e.dataset.medAdminKey.split('|')[1]))).join() === '08:00' &&
    /Día 6/.test(await adminRow('MEROPENEM').innerText()));
  await adminRow('AMLODIPINO').locator('td.indicated').first().click();
  await adminRow('ENALAPRIL').locator('td.indicated').first().click();
  await page.waitForTimeout(300);
  check('clicking a dose marks it «no administrado» (aria-pressed false)',
    (await adminRow('AMLODIPINO').locator('td[aria-pressed="false"]').count()) === 1 && (await adminRow('ENALAPRIL').locator('td[aria-pressed="false"]').count()) === 1);
  await adminRow('ONDANSETRON').locator('.med-admin-hide-btn').click();
  await page.waitForTimeout(300);
  check('× hides a med from the grid', (await adminRow('ONDANSETRON').count()) === 0);
  await openPatient(page, A);
  await openPatient(page, E);
  await openMedAdmin();
  check('marks survive a patient switch', (await adminRow('AMLODIPINO').locator('td[aria-pressed="false"]').count()) === 1);

  // Estado Actual proposals, from the Manejo import
  await openManejo();
  await closeToasts(page);
  await page.getByRole('button', { name: 'Enviar a Estado Actual' }).click();
  check('list of patient E is sent to Estado Actual', await toast(/Propuesta en Estado Actual/), await toastTexts());
  await closeToasts(page);
  await goArea(page, 'nota');
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  const eaPend = (re) => page.locator('.ea-med-pending', { hasText: re });
  const eaTxt = async (re) => flat(await eaPend(re).first().innerText().catch(() => ''));
  await r.shot(page, 'ea-proposals');
  const nmTxt = await eaTxt(/BOMBA DE INSULINA/);
  check('EA NM proposal: Stanford in ONE fragment, pump, rescates, prandial, glargina, omeprazol, potassium replacement',
    /SOLUCIÓN STANFORD: NISTATINA 5ML VO C\/6H \+ LIDOCAINA 10ML VO C\/6H \+ LORATADINA 10MG VO C\/6H/.test(nmTxt) &&
    /BOMBA DE INSULINA EN ALGORITMO 3/.test(nmTxt) && /RESCATES DE INSULINA/.test(nmTxt) && /INSULINA PREPRANDIAL: 6 UI SC PREVIO A COMIDAS/.test(nmTxt) &&
    /INSULINA GLARGINA 20UI SC C\/24H/.test(nmTxt) && /OMEPRAZOL 40MG VO C\/12H/.test(nmTxt) && /REPOSICIÓN DE POTASIO 40 MEQ/.test(nmTxt), nmTxt);
  const abxTxt = await eaTxt(/MEROPENEM/);
  check('EA Antibióticos proposal: Día advanced (meropenem DIA 6, rifampicina DIA 7), Stanford parts not inside it',
    /MEROPENEM 1 G IV C\/8H DIA 6/.test(abxTxt) && /RIFAMPICINA 600MG VO C\/24H DIA 7/.test(abxTxt) && /DOTBAL 3 TABLETAS C\/24H DIA 7/.test(abxTxt) &&
    /METRONIDAZOL 500MG VO C\/8H/.test(abxTxt) && !/^.{0,80}NISTATINA/.test(abxTxt.replace(/^.*?Propuesta/, '')), abxTxt);
  const htaTxt = await eaTxt(/ENALAPRIL/);
  check('doses marked «no administrado» carry into EA: amlodipino «(NO ADMINISTRADA)», enalapril «(NO ADMINISTRADO, 06:00)»',
    /AMLODIPINO 5MG VO C\/24H \(NO ADMINISTRADA\)/.test(htaTxt) && /ENALAPRIL 10MG VO C\/12H \(NO ADMINISTRADO, 06:00\)/.test(htaTxt), htaTxt);
  check('the med hidden in the Medicamentos grid is still a proposal (ondansetrón)', (await eaPend(/ONDANSETR/).count()) >= 1);
  // Diet proposal lifecycle
  check('EA shows the SOME diet as a proposal with Confirmar / Descartar', (await page.getByRole('button', { name: 'Confirmar dieta' }).count()) === 1 &&
    /Dieta importada desde SOME/.test(await page.locator('.estado-actual-panel').innerText()));
  await page.getByRole('button', { name: 'Confirmar dieta' }).click();
  await page.waitForTimeout(400);
  check('Confirmar dieta closes the proposal', (await page.getByRole('button', { name: 'Confirmar dieta' }).count()) === 0);
  // Med proposal lifecycle: confirm, discard, reclassify
  await eaPend(/ENALAPRIL/).getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.waitForTimeout(400);
  check('Confirmar moves the antiHTA proposal into the confirmed list', (await eaPend(/ENALAPRIL/).count()) === 0 &&
    (await page.locator('.ea-estado-clinico .ea-med-item-list', { hasText: /ENALAPRIL/ }).count()) >= 1);
  await eaPend(/FUROSEMIDA/).getByRole('button', { name: 'Descartar' }).click();
  await page.waitForTimeout(400);
  check('Descartar drops the diuréticos proposal', (await eaPend(/FUROSEMIDA/).count()) === 0 &&
    (await page.locator('.ea-estado-clinico .ea-med-item-list', { hasText: /FUROSEMIDA/ }).count()) === 0);
  await eaPend(/ONDANSETR/).locator('[data-onclick="toggleEaMedReclassifyPanel"]').click();
  await eaPend(/ONDANSETR/).locator('[data-ea-med-reclassify-select]').selectOption({ label: 'Analgésicos / antipiréticos' });
  await eaPend(/ONDANSETR/).getByRole('button', { name: 'Aplicar reclasificación' }).click();
  await page.waitForTimeout(400);
  const analg = await eaTxt(/PARACETAMOL/);
  check('Reclasificar moves ondansetrón into the analgésicos proposal', /ONDANSETR/.test(analg) && /PARACETAMOL/.test(analg), analg);
  await r.shot(page, 'ea-after-actions');
  // Descartar dieta (patient B has a diet-only import)
  await openPatient(page, B);
  await openManejo();
  await closeToasts(page);
  await page.getByRole('button', { name: 'Enviar a Estado Actual' }).click().catch(() => {});
  await goArea(page, 'nota');
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section[data-section="estadoActual"]').click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  const discardBtn = page.locator('button[data-onclick="discardEaDietProposal"]');
  const hadDiet = (await discardBtn.count()) === 1;
  if (hadDiet) { await discardBtn.click(); await page.waitForTimeout(300); }
  check('Descartar dieta (patient B, AYUNO) removes the diet proposal', hadDiet && (await discardBtn.count()) === 0, { hadDiet });

  // Potassium: volume ÷ rate, and «PARA X HORAS»
  await openPatient(page, E);
  await openManejo();
  await importSome(K_RATE);
  check('potassium + saline 1000 mL at 50 mL/h → «Reposición de potasio 80 mEq a 20 horas»',
    /Reposición de potasio\s*80 mEq a 20 horas/.test(flat(await page.locator('.med-receta-row--potassium-repos').innerText().catch(() => ''))),
    flat(await page.locator('#med-items-list').innerText()).slice(0, 200));
  await importSome(K_HOURS);
  check('potassium + saline «PARA 4 HORAS» → «Reposición de potasio 40 mEq a 4 horas»',
    /Reposición de potasio\s*40 mEq a 4 horas/.test(flat(await page.locator('.med-receta-row--potassium-repos').innerText().catch(() => ''))),
    flat(await page.locator('#med-items-list').innerText()).slice(0, 200));

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
