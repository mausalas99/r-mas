#!/usr/bin/env node
/* global window, DOMParser */
/**
 * E2E stress: worst-case input through every export — Word (nota de
 * evolución, indicaciones, listado de problemas), the census PDF (Censo and
 * pancenso) and the VPO copy. Synthetic DEMO patients and made-up
 * expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Word (.docx) — for each of nota, indicaciones, listado
 *     - no file is written (a 1 kB patient name → file name past the
 *       255-byte limit → ENAMETOOLONG)
 *     - the file does not unzip, or word/document.xml does not parse as XML
 *     - a raw control char (\u0000 \u000b \u0007) reaches document.xml → Word
 *       refuses the whole file
 *     - "&" "<" "]]>" or HTML are not escaped
 *     - "$'" / "$&" in a field pastes template XML into the document
 *     - a field is dropped or truncated (each field carries its own tag, a
 *       20 000-char interrogatorio must keep its last word)
 *     - odd chars (emoji, NFD accents, Δ ≥ →, quotes) vanish
 *     - 40 diagnoses / 40 treatments / 12 evolution lines / 40 problems:
 *       any item past the template's fixed slots is silently lost
 *     - the header keeps the template's sample área / servicio / name
     - área and servicio swap places in the header (área ≠ servicio, typed
       apart in «Datos»)
 *   Census PDF — 33 patients
 *     - the preview runs HTML from a name
 *     - no file, not a PDF (%PDF-), page count not sane
 *     - "WinAnsi cannot encode" or any error toast
 *     - pancenso with no Nube team: no clear message
 *     - «Generar PDF» does nothing the second time in a session
 *   VPO
 *     - "Copiar valoración completa" loses odd text or throws
 *   Save fails (disk full, bad folder)
 *     - two red toasts, one a false «Error de conexión»
 *   Throughout
 *     - an uncaught page error; HTML from a field runs (window.__xss)
 *
 * Artifact: e2e-artifacts/stress-exports/<run-id>/ (report.json, screenshots,
 * every exported file).
 *
 *   node scripts/e2e/stress-exports.e2e.mjs
 */
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';
import { createRun, onboardLocalOnly, openPatient, pasteAndSave, closeToasts, until } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const d = new Date();
const TODAY = (h) => `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${h}:05AM`;
const bh = (hgb) => 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + `HGB\t\tA\t${hgb}\tg/dL\t12.20 - 18.10\n`;

const LONG = 'LARGUISIMO '.repeat(90).trim();
const ODD = [
  '😀🩺',
  'JOSÉ PEÑA'.normalize('NFD'),
  '‮X ​',
  '<img src=x onerror="window.__xss=1"><b>X</b>',
  `O'BRIEN "EL"; DROP TABLE x;--`,
  'Δ ≥ ≤ µ →',
  '& < > ]]>',
  'VT\u000bBEL\u0007NUL\u0000',
  "$' $& $$",
].join(' ');
/** Must come out of every export (compared upper-case, NFC). */
const MARKERS = ['😀🩺', 'JOSÉ PEÑA', '<IMG SRC=X ONERROR', `O'BRIEN "EL"`, 'DROP TABLE', 'Δ ≥ ≤', '→', '& < > ]]>', "$' $&"];
const odd = (tag) => `${tag} ${ODD}`;
const up = (s) => String(s).normalize('NFC').toUpperCase();
const missing = (text, list) => list.filter((m) => !up(text).includes(up(m)));

// eslint-disable-next-line no-control-regex -- SOME names carry no control chars
const MAIN = { exp: '7300001-1', name: `DEMO ${ODD.replace(/[\u0000-\u001f]/g, '')} ${LONG}`, room: '801' };
const CENSUS = Array.from({ length: 32 }, (_, i) => ({
  exp: `73${String(i + 10).padStart(5, '0')}-${i % 10}`,
  name: `DEMO CENSO ${i} ${['😀', 'JOSÉ'.normalize('NFD'), 'Δ≥→', `O'BRIEN`, '& <b>', "$'", LONG][i % 7]}`,
  room: String(810 + i),
}));

const r = createRun('stress-exports');
const { check, shot } = r;

/** Wait for a new file with `ext` in the stubbed Downloads dir; copy it into the artifact. */
async function newFile(ext, since, label) {
  let file = null;
  await until(async () => {
    file = fs.readdirSync(r.downloadsDir).filter((f) => f.endsWith(ext))
      .map((f) => path.join(r.downloadsDir, f)).find((f) => fs.statSync(f).mtimeMs > since) || null;
    return !!file;
  }, 30000, 250);
  if (!file) return null;
  await new Promise((res) => setTimeout(res, 400)); // let the write finish
  fs.copyFileSync(file, path.join(r.artifactDir, `${label}${ext}`));
  return file;
}

const toastText = async (page) => (await page.locator('.toast').allInnerTexts()).join(' | ').replace(/\s+/g, ' ').slice(0, 300);

/** All the .docx checks. Returns the document text (w:t runs joined by \n). */
async function checkDocx(page, label, file, tags, markers = MARKERS) {
  check(`${label}: .docx written`, !!file, await toastText(page));
  if (!file) return '';
  const name = path.basename(file);
  check(`${label}: file name under 255 bytes, accents kept as one letter`, Buffer.byteLength(name) < 255 && !/[̀-ͯ]/.test(name), { bytes: Buffer.byteLength(name), name: name.slice(0, 80) });
  let xml = '';
  try {
    xml = await (await JSZip.loadAsync(fs.readFileSync(file))).file('word/document.xml').async('string');
    check(`${label}: unzips, has word/document.xml`, xml.length > 0, xml.length);
  } catch (e) {
    check(`${label}: unzips, has word/document.xml`, false, e.message);
    return '';
  }
  // eslint-disable-next-line no-control-regex -- the check itself
  const bad = xml.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g);
  check(`${label}: no raw control chars in document.xml`, !bad, bad && bad.map((c) => c.charCodeAt(0)));
  const parsed = await page.evaluate((x) => {
    const doc = new DOMParser().parseFromString(x, 'application/xml');
    const err = doc.getElementsByTagName('parsererror')[0];
    return { err: err ? err.textContent.slice(0, 200) : null, text: [...doc.getElementsByTagNameNS('*', 't')].map((n) => n.textContent).join('\n') };
  }, xml);
  check(`${label}: document.xml parses as XML`, !parsed.err, parsed.err);
  check(`${label}: size sane (template XML not pasted in again)`, xml.length < 3_000_000, xml.length);
  fs.writeFileSync(path.join(r.artifactDir, `${label}.txt`), parsed.text);
  if (markers.length) check(`${label}: odd chars round-trip`, missing(parsed.text, markers).length === 0, missing(parsed.text, markers));
  if (tags.length) check(`${label}: every field tag present`, missing(parsed.text, tags).length === 0, missing(parsed.text, tags));
  return parsed.text;
}

async function setMode(page, mode) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const btn = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
  await btn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400); // expand animation
  await btn.click();
  await page.waitForTimeout(600);
  await closeToasts(page);
}

async function pickPatientIc(page, p) {
  await closeToasts(page);
  if (!(await page.locator('#ic-board-mount .p-name').locator('visible=true').count())) {
    await page.locator('#apptab-nota').click();
    await page.locator('.exp-group-pill[data-group="paciente"]').click();
    await page.locator('[data-ic-back-to-board]').click();
  }
  await openPatient(page, p);
}

async function goClinico(page, section, ready) {
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover({ timeout: 5000 }).catch(() => {});
  await page.locator(`.exp-group-section[data-section="${section}"]`).click();
  await page.locator(ready).waitFor({ state: 'visible' });
}

/** Fill a list that grows by an «add row» button (re-rendered after each click). */
async function fillRows(page, list, addBtn, items) {
  for (let i = 0; i < items.length; i++) {
    if ((await page.locator(`${list} input`).count()) <= i) await page.locator(`${list} ${addBtn}`).click();
    await page.locator(`${list} input`).nth(i).fill(items[i]);
  }
}

await r.finish('Worst-case input through every export: Word x3, census PDF, VPO copy', async () => {
  const { app, page, pageErrors } = await r.launch({ lanPort: 3797 });
  await onboardLocalOnly(page);

  // ── 33 patients: one worst-case main patient + 32 for the census ───────
  const toast = await pasteAndSave(page, header(MAIN, TODAY(1)) + bh('8.1'));
  check('main patient with worst-case name saved', (await page.locator(`.p-name[title*="${MAIN.exp}"]`).count()) > 0, toast.replace(/\s+/g, ' ').slice(0, 160));
  for (const p of CENSUS) await pasteAndSave(page, header(p, TODAY(2)) + bh('9.4'));
  await closeToasts(page);

  // Admit the main patient. In Sala, área = servicio (patients-modal-fields.mjs).
  await closeToasts(page);
  await page.locator(`.p-name[title*="${MAIN.exp}"]`).locator('visible=true').first().click();
  await page.locator('#m-servicio').waitFor({ state: 'visible' });
  await page.locator('#m-servicio').fill('CARDIOLOGIA');
  await page.locator('#m-cuarto').fill(MAIN.room);
  await page.locator('#m-cama').fill('01');
  await page.getByRole('button', { name: 'Agregar Paciente' }).click();
  await page.locator('#m-servicio').waitFor({ state: 'hidden' });

  // ── Census preview + PDF ─────────────────────────────────────────────────
  await closeToasts(page);
  await page.locator('#btn-export-censo-header').click();
  await page.locator('#censo-export-preview').click();
  const frame = page.frameLocator('#censo-preview-frame');
  await frame.locator('body').waitFor({ state: 'attached' });
  await page.waitForTimeout(800);
  const previewText = await frame.locator('body').innerText().catch(() => '');
  await shot(page, 'census-preview');
  check('census preview lists all 33 patients', (previewText.match(/DEMO/g) || []).length >= 33, (previewText.match(/DEMO/g) || []).length);
  check('census preview does not run HTML from a name', !(await page.evaluate(() => window.__xss)));

  let t0 = Date.now();
  await page.locator('#censo-preview-generate').click();
  const pdf = await newFile('.pdf', t0, 'census');
  await page.waitForTimeout(300);
  const censoToast = await toastText(page);
  await shot(page, 'census-exported');
  await page.locator('#censo-preview-close').click();
  check('census: PDF written', !!pdf, censoToast);
  check('census: no WinAnsi / error toast', !/winansi|error/i.test(censoToast), censoToast);
  if (pdf) {
    const buf = fs.readFileSync(pdf);
    check('census: file starts with %PDF-', buf.subarray(0, 5).toString() === '%PDF-');
    const pages = await PDFDocument.load(buf).then((doc) => doc.getPageCount()).catch((e) => e.message);
    check('census: page count sane for 33 patients (1–66)', pages >= 1 && pages <= 66, pages);
    check('census: file name under 255 bytes', Buffer.byteLength(path.basename(pdf)) < 255, path.basename(pdf).length);
  }

  await closeToasts(page);
  await page.locator('#btn-export-censo-header').click();
  await page.locator('#censo-export-pancenso').check({ force: true });
  await page.locator('#censo-export-preview').click();
  t0 = Date.now();
  await page.locator('#censo-preview-generate').click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const panToast = await toastText(page);
  const panPdf = fs.readdirSync(r.downloadsDir).filter((f) => f.endsWith('.pdf')).map((f) => path.join(r.downloadsDir, f)).find((f) => fs.statSync(f).mtimeMs > t0);
  await shot(page, 'pancenso');
  check('pancenso: writes a PDF or says clearly why not', !!panPdf || /sin pacientes para el pancenso/i.test(panToast), panToast);
  if (await page.locator('#censo-preview-close').isVisible()) await page.locator('#censo-preview-close').click();
  if (await page.locator('#censo-export-cancel').isVisible()) await page.locator('#censo-export-cancel').click();
  await closeToasts(page);

  // ── Listado de problemas: 40 activos + 5 inactivos ──────────────────────
  await openPatient(page, MAIN);
  await page.locator('#apptab-nota').click();
  await page.evaluate(() => window.switchInnerTab('listado'));
  const form = page.locator('#listado-form');
  await form.locator('.listado-layout').waitFor({ state: 'visible' });
  for (const [sec, n] of [['activos', 40], ['inactivos', 5]]) {
    for (let i = 0; i < n; i++) {
      await form.locator(`[data-seccion-group="${sec}"] .listado-add-row`).click();
      await form.locator(`[data-seccion-rows="${sec}"] .listado-row`).nth(i).locator('textarea')
        .fill(`L-${sec.toUpperCase()}-${i + 1} ${i === 0 ? ODD + '\na) ' + LONG : 'PROBLEMA ' + (i + 1)}`);
    }
  }
  const medInputs = form.locator('.listado-medicos-grid input');
  for (let i = 0; i < (await medInputs.count()); i++) await medInputs.nth(i).fill(odd(`L-MED-${i}`));
  await shot(page, 'listado-45-problems');
  t0 = Date.now();
  await page.locator('#btn-gen-listado').click();
  const listadoText = await checkDocx(page, 'listado', await newFile('.docx', t0, 'listado'),
    ['L-ACTIVOS-1', 'L-ACTIVOS-40', 'L-INACTIVOS-5', 'L-MED-0', 'L-MED-4']);
  const lostProblems = [...Array(40).keys()].filter((i) => !listadoText.includes(`L-ACTIVOS-${i + 1} `) && !listadoText.includes(`L-ACTIVOS-${i + 1}\n`));
  check('listado: all 40 activos in the file', lostProblems.length === 0, lostProblems.map((i) => i + 1));
  await shot(page, 'listado-exported');

  // ── Interconsulta › Nota de evolución ───────────────────────────────────
  await setMode(page, 'interconsulta');
  await pickPatientIc(page, MAIN);
  await goClinico(page, 'notas', '#btn-gen');
  const field = (arg) => page.locator(`#note-form [data-oninput-args='["${arg}"]']`);
  await field('interrogatorio').fill(`N-INTERR ${ODD} ${'PALABRA '.repeat(2500)}N-INTERR-FIN`);
  await field('evolucion').fill(Array.from({ length: 12 }, (_, i) => `N-EVOL-${i + 1} ${i === 0 ? ODD : LONG}`).join('\n'));
  await field('estudios').fill(Array.from({ length: 10 }, (_, i) => `N-EST-${i + 1} ${i === 0 ? ODD : 'HB 11'}`).join('\n'));
  for (const f of ['ta', 'fr', 'fc', 'temp', 'peso']) await field(f).fill(odd(`N-${f.toUpperCase()}`));
  await field('medico').fill(odd('N-MEDICO'));
  await field('profesor').fill(odd('N-PROFESOR'));
  await fillRows(page, '#dx-list', '.btn-add-row', Array.from({ length: 40 }, (_, i) => `N-DX-${i + 1} ${i === 0 ? ODD : 'DX'}`));
  await fillRows(page, '#tx-list', '.btn-add-row', Array.from({ length: 40 }, (_, i) => `N-TX-${i + 1} ${i === 0 ? ODD : 'TX'}`));
  await shot(page, 'note-filled');
  t0 = Date.now();
  await page.locator('#btn-gen').click();
  const noteText = await checkDocx(page, 'nota', await newFile('.docx', t0, 'nota'),
    ['N-INTERR-FIN', 'N-TA', 'N-FC', 'N-MEDICO', 'N-PROFESOR', 'N-DX-40']);
  const lost = (prefix, n) => [...Array(n).keys()].map((i) => `${prefix}-${i + 1} `).filter((t) => !up(noteText).includes(t) && !up(noteText).includes(t.trim() + '\n'));
  check('nota: all 12 evolution lines in the file', lost('N-EVOL', 12).length === 0, lost('N-EVOL', 12));
  check('nota: all 10 estudios lines in the file', lost('N-EST', 10).length === 0, lost('N-EST', 10));
  check('nota: all 40 treatments in the file', lost('N-TX', 40).length === 0, lost('N-TX', 40));
  check('nota: header área/servicio filled, no template sample left', /ÁREA:\s*CARDIOLOGIA\s*SERVICIO:\s*CARDIOLOGIA/.test(noteText) && !/CIRUGÍA AB|SINTETICO/.test(noteText), noteText.match(/ÁREA:[\s\S]{0,60}/)?.[0]);
  await shot(page, 'note-exported');

  // ── Indicaciones ────────────────────────────────────────────────────────
  await goClinico(page, 'indica', '#btn-gen-ind');
  const indField = (arg) => page.locator(`#indica-form [data-oninput-args='["${arg}"]']`);
  await indField('medicos').fill(odd('I-MEDICOS'));
  await indField('dieta').fill(odd('I-DIETA'));
  await indField('cuidados').fill(`I-CUIDADOS ${LONG}`);
  await indField('estudios').fill(odd('I-ESTUDIOS'));
  await indField('medicamentos').fill(Array.from({ length: 40 }, (_, i) => `I-MED-${i + 1} ${i === 0 ? ODD : 'FARMACO 1 G IV'}`).join('\n'));
  await indField('interconsultas').fill(odd('I-IC'));
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: '+ Agregar sección' }).click();
    await page.locator('#otros-list input').nth(i).fill(`I-OTRO-${i + 1}`);
    await page.locator('#otros-list textarea').nth(i).fill(i === 0 ? ODD : 'CONTENIDO');
  }
  await shot(page, 'indicaciones-filled');
  t0 = Date.now();
  await page.locator('#btn-gen-ind').click();
  const indText = await checkDocx(page, 'indicaciones', await newFile('.docx', t0, 'indicaciones'),
    ['I-MEDICOS', 'I-DIETA', 'I-CUIDADOS', 'I-ESTUDIOS', 'I-MED-1', 'I-MED-40', 'I-IC', 'I-OTRO-1', 'I-OTRO-8']);
  check('indicaciones: header área/servicio filled, no template sample left', /CARDIOLOG/.test(indText) && !/TRAUMATOLOGIA|SINTETICO/.test(indText), indText.match(/ÁREA[\s\S]{0,60}/)?.[0]);
  await shot(page, 'indicaciones-exported');

  // ── Área ≠ servicio: typed apart in «Datos» (Sala's admit form sets área =
  // servicio, and the Interconsulta board skips that form) ─────────────────
  const AREA = { exp: '7300002-2', name: 'DEMO AREA SERVICIO', room: '802' };
  await pasteAndSave(page, header(AREA, TODAY(3)) + bh('10.2'));
  await pickPatientIc(page, AREA);
  await closeToasts(page);
  await page.locator('#btn-exp-datos-open').click();
  const datos = (key) => page.locator(`[data-oninput-args='["${key}"]']`).locator('visible=true').first();
  await datos('area').fill('MEDICINA INTERNA');
  await datos('servicio').fill('CARDIOLOGIA');
  await shot(page, 'area-servicio-datos');
  await page.keyboard.press('Escape');
  const areaRe = /ÁREA:\s*MEDICINA INTERNA\s*SERVICIO:\s*CARDIOLOGIA/;
  await goClinico(page, 'notas', '#btn-gen');
  t0 = Date.now();
  await page.locator('#btn-gen').click();
  const areaNote = await checkDocx(page, 'nota-area', await newFile('.docx', t0, 'nota-area'), [], []);
  check('nota: ÁREA: MEDICINA INTERNA / SERVICIO: CARDIOLOGIA (not swapped)', areaRe.test(areaNote), areaNote.match(/ÁREA:[\s\S]{0,60}/)?.[0]);
  await goClinico(page, 'indica', '#btn-gen-ind');
  t0 = Date.now();
  await page.locator('#btn-gen-ind').click();
  const areaInd = await checkDocx(page, 'indicaciones-area', await newFile('.docx', t0, 'indicaciones-area'), [], []);
  check('indicaciones: ÁREA: MEDICINA INTERNA / SERVICIO: CARDIOLOGIA (not swapped)', areaRe.test(areaInd), areaInd.match(/ÁREA:[\s\S]{0,60}/)?.[0]);
  await shot(page, 'area-servicio-exported');

  // ── VPO: copy the whole valoración ──────────────────────────────────────
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'VPO' }).click();
  await page.locator('#vpo-container .vpo-panel').waitFor({ state: 'visible' });
  await page.locator('[data-vpo-field="valoracionIntro"]').fill(odd('V-INTRO'));
  await page.locator('#vpo-ekg').fill(odd('V-EKG'));
  await page.locator('#vpo-rx').fill(`V-RX ${LONG}`);
  await page.locator('[data-vpo-dx-idx="0"]').fill(odd('V-DX-1'));
  await page.locator('[data-vpo-action="copy-full"]').click();
  await page.waitForTimeout(500);
  const clip = await app.evaluate(({ clipboard }) => clipboard.readText());
  fs.writeFileSync(path.join(r.artifactDir, 'vpo-copy.txt'), clip);
  await shot(page, 'vpo-copied');
  check('VPO copy: every field present', missing(clip, ['V-INTRO', 'V-EKG', 'V-RX', 'V-DX-1']).length === 0, missing(clip, ['V-INTRO', 'V-EKG', 'V-RX', 'V-DX-1']));
  check('VPO copy: odd chars round-trip', missing(clip, MARKERS).length === 0, missing(clip, MARKERS));

  // ── A failed save shows one clear error, not a second «Error de conexión» ─
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('save-exported-document');
    ipcMain.handle('save-exported-document', () => { throw new Error('DEMO disco lleno'); });
  });
  await goClinico(page, 'notas', '#btn-gen');
  await closeToasts(page);
  await page.locator('#btn-gen').click();
  await page.locator('.toast', { hasText: 'DEMO disco lleno' }).waitFor({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  const failToasts = await page.locator('.toast').allInnerTexts();
  await shot(page, 'save-failed-one-toast');
  check('failed save: one error toast naming the cause, no «Error de conexión»',
    failToasts.length === 1 && /DEMO disco lleno/.test(failToasts[0]), failToasts.map((t) => t.replace(/\s+/g, ' ').slice(0, 90)));

  check('no field ran as HTML (window.__xss)', !(await page.evaluate(() => window.__xss)));
  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();
});
