#!/usr/bin/env node
/**
 * E2E: the SOME paste rules, driven through the real Electron app.
 * Synthetic DEMO patients and made-up expedientes only.
 *
 * Ways a SOME paste can go wrong (each one is a check below):
 *   Splitting
 *     - two reports glued with a space before "Expediente:" read as one
 *     - the patient separator is missed when typed in lowercase / with spaces
 *     - "--- PACIENTE --- extra" is wrongly taken as a separator
 *   Grouping into lab sets
 *     - two reports of the same day ≤2 h apart saved as two sets
 *     - reports from different days merged into one set
 *     - fibrinogen lost when merged with TP/TTP
 *     - reticulocytes not placed in the BH row, corrected Ret (RetC) missing
 *     - RetC chained across days from a far-away reticulocyte count (same day only)
 *     - RetC missing when Ret and Hto of one day come in two separate pastes
 *     - serial blood gases of one day merged into one set
 *     - identical blood gases saved twice
 *     - labs + first gas of the same hour not merged, anion gap missing
 *     - gas paired with the wrong lab set (not the nearest in time)
 *     - morning BH copied onto later serial gases
 *     - urinalysis (EGO) repeated in every set of the day
 *     - CSF chemistry + bacteriology (portal format) split, or wrong reading
 *   Patient safety
 *     - a paste that mixes two known patients saves anything
 *     - a foreign expediente (not in the census) blocks the known patient
 *     - a report excluded for its foreign expediente is dropped in silence
 *     - the same patient's alternate expediente suffix counted as a mix
 *     - one mixed block blocks the clean blocks of the same paste
 *     - pasting the same report twice creates a patient or a set again
 *   Preview
 *     - Cancel does not close the preview, or it opens again
 *     - the raw pasted text is not shown for review
 *     - text with no SOME report saves something
 *   Analyte parsing (procesarLabs edge cases, through the paste UI)
 *     - BUN/CR ratio is missing when both BUN and Cr are present
 *     - calcium is not corrected for albumin (cCa), or wrongly flagged in range
 *     - eGFR/anion-gap-albumin-corrected are not computed once the patient is known
 *     - section order in the rendered set is not BH → QS → ESC → GASES
 *     - troponin, serology, blood group/Coombs, stool, smear, PCT, lipid panel,
 *       or lipase reports do not parse into their own block
 *     - COAG loses TP/INR when the PDF layout is incomplete or multi-line (repo)
 *     - peritoneal/pleural citoquímico values are misread, or Light criteria
 *       (exudate/transudate) is not shown in the interpretation line
 *     - LCR bacterial etiology is not flagged from cell count/glucose/protein
 *     - ionized calcium (iCa) in a blood gas OBSERVACIONES line is missed
 *     - urinary electrolytes / creatinine clearance / platelets-with-citrate
 *       don't get their own row
 *     - a report with no reference-range column is not flagged using the
 *       report's own or the standard ranges
 *     - an antibiogram sensitivity row (e.g. VANCOMICINA S) is read as a real
 *       serum drug level (NIVEL), or hides a real level elsewhere in the report
 *     - hospital letterhead glued into a report is saved as its own chunk
 *     - "Copiar" on the lab card fails silently instead of toasting success/error
 *     - "Eliminar" on the lab card's "…" menu deletes without a destructive
 *       confirm, or the confirm accepts but leaves the set in history
 *     - "Tablas del reporte SOME" shows the wrong department's rows, or does
 *       not close
 *
 * Artifact: e2e-artifacts/lab-paste-rules/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:lab-paste-rules
 */
import {
  createRun,
  onboardLocalOnly,
  pasteAndProcess,
  closeToasts,
  visiblePatientCount,
  pasteAndSave as harnessPasteAndSave,
  openPatient as harnessOpenPatient,
} from './harness.mjs';
import { TABLE, header, fullLabs, gas } from './some-fixtures.mjs';
import { LAB_BULK_PATIENT_SEPARATOR } from '../../public/js/lab-bulk-paste.mjs';

const UNO = { exp: '7000001-1', name: 'DEMO REGLAS UNO', room: '301' };
const DOS = { exp: '7000002-2', name: 'DEMO REGLAS DOS', room: '302' };
const SEP = LAB_BULK_PATIENT_SEPARATOR;
const EGO =
  '\nURIANALISIS\nEXAMEN GENERAL DE ORINA\n' + TABLE +
  'PH\t\nA\n7.0\n5.5 - 6.5\nDENSIDAD\t\n*\n1.010\n1.005 - 1.025\nPROTEINAS\t\n*\nNEGATIVO\n' +
  'ERITROCITOS\t\n*\n0\n/CAMPO\t0-2/CAMPO\nLEUCOCITOS\t\n*\n0\n/CAMPO\t0-5/CAMPO\n';

function cbcSpaced(p, when, hb, hct) {
  return (
    header(p, when) +
    'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' +
    `HGB B ${hb} g/dL 12.20 - 18.10\nHCT B ${hct} % 37.7 - 53.7\n` +
    'MCV * 93 fL 80 - 97\nMCH * 32.4 pg 27.0 - 31.2\nWBC A 2.89 K/uL 4.00 - 11.00\n' +
    'NEU * 2.65 K/uL 2.00 - 6.90\nPLT * 172 K/uL 142.00 - 424.00\n'
  );
}

function reticulocytes(p, when) {
  return (
    header(p, when) +
    'HEMATOLOGIA\nDIFERENCIAL MANUAL\nSEGMENTADOS\n*\n95\n%\nRETICULOCITOS\n' + TABLE +
    'RETICULOCITOS\n*\n1.0\n%\t0.5 - 1.5\nFROTIS DE SANGRE PERIFERICA\nHIPOCROMIA +\n'
  );
}

function fibrinogen(p, when) {
  return header(p, when) + 'HEMATOLOGIA\nFIBRINOGENO\n' + TABLE + 'FIBRINOGENO\t\n*\n283\nmg/dL\t150 - 400\n';
}

function tpTtp(p, when) {
  return (
    header(p, when) +
    'HEMATOLOGIA\nTIEMPO DE PROTROMBINA Y TROMBOPLASTINA\n' +
    'TIEMPO DE PROTROMBINA\tA\n14.20\nSEG.\t10.25 - 13.20\nINR\t*\n1.22\n' +
    'TIEMPO DE TROMBOPLASTINA\t*\n30.9\nSEG\t29.1 - 38.4\n'
  );
}

/** CSF reports as the hospital portal sends them: every cell on its own line, blank line between. */
function csfPortal(p, when) {
  const quimica =
    header(p, when) +
    'QUIMICA CLINICA\nCITOQUIMICO DE LCR\n' + TABLE +
    'pH\n*\n8.5\nASPECTO\n*\nRECUENTO CELULAR\n*\nPOLIMORFONUCLEARES\n*\nLINFOCITOS\n*\n' +
    'TINTA CHINA\n*\nERITROCITOS\n*\nCOAGLUTINACION\n*\nGRAM\n*\n' +
    'GLUCOSA\nB\n21\nmg/dL\t45 - 80\nPROTEINAS\nA\n200\nmg/dL\t15 - 45\n' +
    'CLORURO\nB\n109.3\nmmol/L\t118.1 - 132.0\nOTROS\n*\n';
  const bacteriologia =
    header(p, when) +
    'BACTERIOLOGIA\nCITOQUIMICO LIQ. LCR\n' + TABLE +
    'LCR\n*\nASPECTO\n*\nCLARO\nRECUENTO CELULAR\n*\n215\nLEUCOCITOS/MM\n' +
    'LEUCOCITOS POLIMORFONUCLEARES\n*\n26\n%PMN\nLINFOCITOS\n*\n74\n%LINFOCITOS\n' +
    'TINTA CHINA\n*\nNEGATIVO\nERITROCITOS\n*\nAUSENTES\nCOAGLUTINACION\n*\n' +
    'GRAM\n*\nMODERADOS LEUCOCITOS\nCOMENTARIOS\n*\n';
  const portalize = (t) => t.replace(/\n/g, '\n\n');
  return portalize(quimica) + '\n\n' + portalize(bacteriologia);
}

const r = createRun('lab-paste-rules');
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

await r.finish('SOME paste rules', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();

  const pasteAndSave = (text) => harnessPasteAndSave(page, text);

  async function openPatient(p) {
    await harnessOpenPatient(page, p);
    if (!(await page.locator('#lab-history-date-select').isVisible())) await page.locator('#apptab-lab').click();
    await page.locator('#lab-history-date-select').waitFor({ state: 'visible' });
  }

  async function days() {
    return page.locator('#lab-history-date-select option').allTextContents();
  }

  /** Lab sets shown for one day, split by their "HH:MM" headers. */
  async function daySets(p, date) {
    await openPatient(p);
    const opts = await days();
    if (!opts.includes(date)) return [];
    await page.locator('#lab-history-date-select').selectOption(`day:${date}`);
    await page.waitForTimeout(400);
    const lines = (await page.locator('#lab-output-box').innerText()).split('\n');
    const sets = [];
    for (const line of lines) {
      if (/^\d{1,2}:\d{2}$/.test(line.trim())) sets.push({ hora: line.trim(), text: '' });
      else if (sets.length) sets[sets.length - 1].text += ' ' + line;
      else sets.push({ hora: '', text: line });
    }
    return sets.map((s) => ({ hora: s.hora, text: flat(s.text) }));
  }

  /** Values currently shown bold+red as out-of-range in #lab-output-box (the "*" itself is CSS-hidden there). */
  async function alteredValues() {
    return page.locator('#lab-output-box .lab-value-altered').allInnerTexts();
  }

  // ── Setup: admit UNO (2 days) and DOS through the lowercase, spaced separator ──
  const setupPreview = await (async () => {
    await pasteAndProcess(
      page,
      fullLabs(UNO, 'Jan 3 2026 9:00AM') + '\n\n' + fullLabs(UNO, 'Jan 2 2026 9:00AM') +
        '\n\n  --- paciente ---  \n\n' + fullLabs(DOS, 'Jan 3 2026 9:30AM')
    );
    const confirm = page.locator('#lab-bulk-preview-confirm');
    await confirm.waitFor({ state: 'visible' });
    const text = await page.locator('.modal-backdrop.open', { has: confirm }).innerText();
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Agregar al censo' }).first().click();
      await page.locator('#patient-registro-tunnel-confirm').click();
      await page.locator('#patient-registro-tunnel-confirm').waitFor({ state: 'hidden' });
    }
    await page.locator('.toast', { hasText: /guardad/i }).waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    return text;
  })();
  await r.shot(page, 'setup');
  check('lowercase spaced separator splits two patients', setupPreview.includes(UNO.name) && setupPreview.includes(DOS.name));
  check('both setup patients admitted', (await visiblePatientCount(page)) === 2);
  let d = await (async () => { await openPatient(UNO); return days(); })();
  check('reports from different days stay separate days', d.includes('03/01/2026') && d.includes('02/01/2026'), d);

  // ── Splitting: space before "Expediente:" ────────────────────────────────
  const glued = fullLabs(UNO, 'Jan 5 2026 8:00AM').trimEnd() + '\nLIPASA SERICA\t1244 U/L 8 - 57\n ' +
    gas(UNO, 'Jan 5 2026 1:00PM', '7.30');
  const gluedPreview = await pasteAndSave(glued);
  check('report glued after a leading-space "Expediente:" is read as its own report',
    /2\/2 reportes/.test(flat(gluedPreview)), flat(gluedPreview).slice(0, 120));

  // ── Grouping ─────────────────────────────────────────────────────────────
  await pasteAndSave(fullLabs(UNO, 'Jan 10 2026 9:42AM') + '\n\n' + fullLabs(UNO, 'Jan 10 2026 10:15AM'));
  let sets = await daySets(UNO, '10/01/2026');
  check('same day ≤2 h apart → one set', sets.length === 1, sets.map((s) => s.hora));

  await pasteAndSave(fibrinogen(UNO, 'Jan 12 2026 1:19PM') + '\n\n' + tpTtp(UNO, 'Jan 12 2026 1:05PM'));
  sets = await daySets(UNO, '12/01/2026');
  check('fibrinogen kept when merged with TP/TTP', sets.length === 1 && /Fib 283/.test(sets[0].text) && /TP 14\.2/.test(sets[0].text),
    sets.map((s) => s.text.slice(0, 160)));

  await pasteAndSave(cbcSpaced(UNO, 'Jan 14 2026 3:53AM', '8.84', '25.5') + '\n\n' + reticulocytes(UNO, 'Jan 14 2026 4:10AM'));
  sets = await daySets(UNO, '14/01/2026');
  const retSet = sets.find((s) => /Hb 8\.84/.test(s.text));
  check('reticulocytes land in the BH row with RetC 0.57', !!retSet && /Ret 1\b/.test(retSet.text) && /RetC 0\.57/.test(retSet.text),
    sets.map((s) => s.text.slice(0, 200)));
  check('RetC is read as arregenerativa', !!retSet && /arregenerativa/.test(retSet.text));

  await pasteAndSave(
    reticulocytes(UNO, 'Jan 21 2026 4:10AM') + '\n---\n' +
      cbcSpaced(UNO, 'Feb 5 2026 1:08AM', '7.97', '25.1') + '\n---\n' +
      cbcSpaced(UNO, 'Feb 14 2026 2:17AM', '8.76', '26.9')
  );
  const feb5 = await daySets(UNO, '05/02/2026');
  const feb14 = await daySets(UNO, '14/02/2026');
  check('RetC does not chain across days', feb5.length > 0 && feb14.length > 0 &&
    !feb5.some((s) => /RetC/.test(s.text)) && !feb14.some((s) => /RetC/.test(s.text)),
  { feb5: feb5.map((s) => s.text.slice(0, 120)), feb14: feb14.map((s) => s.text.slice(0, 120)) });

  // Same day, two separate pastes: RetC borrows the Hto already saved that day.
  await pasteAndSave(cbcSpaced(UNO, 'Mar 20 2026 8:00AM', '8.84', '25.5'));
  await pasteAndSave(reticulocytes(UNO, 'Mar 20 2026 11:00AM'));
  const mar20 = await daySets(UNO, '20/03/2026');
  check('RetC borrows the Hto saved earlier the same day', mar20.some((s) => /RetC 0\.57/.test(s.text)),
    mar20.map((s) => s.text.slice(0, 160)));

  await pasteAndSave(gas(UNO, 'Feb 20 2026 6:43AM', '7.39') + '\n\n' + gas(UNO, 'Feb 20 2026 7:30AM', '7.35'));
  sets = await daySets(UNO, '20/02/2026');
  check('serial gases of one day stay separate sets', sets.length === 2, sets.map((s) => s.hora));

  await pasteAndSave(gas(UNO, 'Feb 22 2026 6:43AM', '7.39') + '\n\n' + gas(UNO, 'Feb 22 2026 6:50AM', '7.39'));
  sets = await daySets(UNO, '22/02/2026');
  check('identical gases saved once', sets.length === 1, sets.map((s) => s.hora));

  await pasteAndSave(fullLabs(UNO, 'Mar 1 2026 8:00AM') + '\n\n' + gas(UNO, 'Mar 1 2026 8:15AM', '7.39'));
  sets = await daySets(UNO, '01/03/2026');
  check('labs + first gas of the hour → one set with BH, gases and anion gap',
    sets.length === 1 && /\bHb\b/.test(sets[0].text) && /\bpH\b/.test(sets[0].text) && /\bAG \d/.test(sets[0].text),
    sets.map((s) => s.text.slice(0, 220)));
  check('BUN/CR ratio computed from BUN 22 and Cr 1.35', /BUN\/CR 16\.3\b/.test(sets[0].text), sets[0].text);
  check('cCa corrects calcium for albumin (Ca 8.8, Alb 4.1 → 8.7, in range)',
    /\bcCa 8\.7\b/.test(sets[0].text) && !/\bcCa 8\.7\*/.test(sets[0].text), sets[0].text);
  check('eTFG computed once the patient (sex/age) is known', /\beTFG \d+\b/.test(sets[0].text), sets[0].text);
  check('cAG (albumin-corrected anion gap) computed alongside AG', /\bcAG \d/.test(sets[0].text), sets[0].text);
  check('section order is BH → QS → ESC → GASES', (() => {
    const t = sets[0].text;
    const iBh = t.indexOf('Hb'); const iQs = t.indexOf('BUN'); const iEsc = t.indexOf('cCa'); const iGas = t.indexOf('pH');
    return iBh >= 0 && iQs > iBh && iEsc > iQs && iGas > iEsc;
  })(), sets[0].text);

  await pasteAndSave(
    gas(UNO, 'Mar 5 2026 5:01PM', '7.39') + '\n\n' + fullLabs(UNO, 'Mar 5 2026 5:09PM') + '\n\n' + gas(UNO, 'Mar 5 2026 6:05PM', '7.41')
  );
  sets = await daySets(UNO, '05/03/2026');
  const withBh = sets.filter((s) => /\bHb\b/.test(s.text));
  const gasOnly = sets.filter((s) => !/\bHb\b/.test(s.text));
  check('gas pairs with the nearest lab set (17:0x), later gas stays apart (18:05)',
    sets.length === 2 && withBh.length === 1 && /^17:0/.test(withBh[0].hora) && gasOnly.length === 1 && gasOnly[0].hora === '18:05',
    sets.map((s) => s.hora));

  await pasteAndSave(
    fullLabs(UNO, 'Mar 7 2026 6:00AM') + '\n\n' + gas(UNO, 'Mar 7 2026 10:00AM', '7.39') + '\n\n' + gas(UNO, 'Mar 7 2026 11:30AM', '7.33')
  );
  sets = await daySets(UNO, '07/03/2026');
  const bhSets = sets.filter((s) => /\bHb\b/.test(s.text));
  check('morning BH is not copied onto later serial gases',
    sets.length === 3 && bhSets.length === 1 && bhSets[0].hora === '06:00', sets.map((s) => s.hora));

  await pasteAndSave(gas(UNO, 'Mar 9 2026 7:57AM', '7.36') + EGO + '\n\n' + gas(UNO, 'Mar 9 2026 3:28PM', '7.39') + EGO);
  sets = await daySets(UNO, '09/03/2026');
  const egoSets = sets.filter((s) => /\bEGO\b/.test(s.text));
  check('urinalysis shows once, in the first set of the day',
    sets.length === 2 && egoSets.length === 1 && egoSets[0].hora === '07:57', sets.map((s) => [s.hora, s.text.slice(0, 120)]));

  await pasteAndSave(csfPortal(UNO, 'Mar 11 2026 3:06PM'));
  sets = await daySets(UNO, '11/03/2026');
  const csf = sets.map((s) => s.text).join(' ');
  check('CSF chemistry + bacteriology (portal) → one set', sets.length === 1, sets.map((s) => s.hora));
  check('CSF values read right', ['pH 8.5', 'Leu 215', 'Glu 21', 'Prot 200', 'Cl 109.3'].every((v) => csf.includes(v)), csf.slice(0, 300));
  check('CSF reading suggests tuberculous meningitis, not viral', /Meningitis tuberculosa\?/.test(csf) && !/parcialmente tratada vs viral/.test(csf));
  await r.shot(page, 'grouping-done');

  // ── Patient safety ──────────────────────────────────────────────────────
  const before = await visiblePatientCount(page);
  await closeToasts(page);
  await pasteAndProcess(page, fullLabs(UNO, 'Apr 1 2026 9:00AM') + '\n\n' + fullLabs(DOS, 'Apr 1 2026 9:10AM'));
  const refusal = page.locator('.toast', { hasText: 'expedientes distintos' });
  await refusal.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await r.shot(page, 'mixed-known-refused');
  check('paste mixing two known patients is refused', await refusal.isVisible());
  check('refused mix saved nothing', !(await daySets(UNO, '01/04/2026')).length && !(await daySets(DOS, '01/04/2026')).length);

  await closeToasts(page);
  await pasteAndProcess(page, fullLabs(UNO, 'Apr 2 2026 9:00AM') + '\n\n--- PACIENTE --- extra\n\n' + fullLabs(DOS, 'Apr 2 2026 9:10AM'));
  await refusal.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  check('"--- PACIENTE --- extra" is not a separator (mix refused)', await refusal.isVisible());
  check('…and saved nothing', !(await daySets(UNO, '02/04/2026')).length);

  const foreign = { exp: '7999999-9', name: 'DEMO AJENO' };
  const foreignPreview = await pasteAndSave(fullLabs(UNO, 'Apr 3 2026 9:00AM') + '\n\n' + fullLabs(foreign, 'Apr 3 2026 9:05AM'));
  await r.shot(page, 'foreign');
  check('foreign expediente does not block the known patient', (await daySets(UNO, '03/04/2026')).length === 1);
  check('foreign report is shown as excluded, not dropped in silence',
    /1 reporte excluido \(otro expediente, no se guard/.test(flat(foreignPreview)), flat(foreignPreview).slice(0, 300));
  check('foreign expediente admits no patient', (await visiblePatientCount(page)) === before);

  await pasteAndSave(fullLabs(UNO, 'Apr 4 2026 9:00AM') + '\n\n' + fullLabs({ exp: '7000001-2', name: UNO.name }, 'Apr 4 2026 4:00PM'));
  check('alternate expediente suffix of the same patient is not a mix', (await daySets(UNO, '04/04/2026')).length >= 1);

  await closeToasts(page);
  await pasteAndProcess(
    page,
    fullLabs(UNO, 'Apr 5 2026 9:00AM') + '\n\n' + fullLabs(DOS, 'Apr 5 2026 9:10AM') + '\n\n' + SEP + '\n\n' + fullLabs(DOS, 'Apr 6 2026 9:00AM')
  );
  const partial = page.locator('.toast', { hasText: /resto del pegado s[ií] se proces/i });
  const partialConfirm = page.locator('#lab-bulk-preview-confirm');
  await Promise.race([
    partial.waitFor({ state: 'visible', timeout: 8000 }),
    partialConfirm.waitFor({ state: 'visible', timeout: 8000 }),
  ]).catch(() => {});
  const partialText = (await partialConfirm.isVisible())
    ? await page.locator('.modal-backdrop.open', { has: partialConfirm }).innerText()
    : '';
  if (await partialConfirm.isVisible()) await partialConfirm.click();
  await page.waitForTimeout(1500);
  await r.shot(page, 'partial-mix');
  const warnings = (await page.locator('.toast').allInnerTexts()).join(' ') + ' ' + partialText;
  check('one mixed block warns that the rest was processed', /resto del pegado s[ií] se proces/i.test(warnings), flat(warnings).slice(0, 240));
  check('the clean block of that paste is saved', (await daySets(DOS, '06/04/2026')).length === 1);
  check('the mixed block of that paste is not saved', !(await daySets(UNO, '05/04/2026')).length);

  const beforeDup = await daySets(UNO, '10/01/2026');
  await pasteAndSave(fullLabs(UNO, 'Jan 10 2026 9:42AM') + '\n\n' + fullLabs(UNO, 'Jan 10 2026 10:15AM'));
  const afterDup = await daySets(UNO, '10/01/2026');
  check('pasting the same reports again adds no set', afterDup.length === beforeDup.length, [beforeDup.length, afterDup.length]);
  check('…and no patient', (await visiblePatientCount(page)) === before);

  // ── Preview ─────────────────────────────────────────────────────────────
  await closeToasts(page);
  await pasteAndProcess(page, fullLabs(UNO, 'Apr 8 2026 9:00AM') + '\n\n' + fullLabs(UNO, 'Apr 7 2026 9:00AM'));
  const pv = page.locator('#lab-bulk-preview-confirm');
  await pv.waitFor({ state: 'visible' });
  const modal = page.locator('.modal-backdrop.open', { has: pv });
  await modal.getByText(/Ver texto/).first().click();
  check('preview shows the raw pasted text', (await modal.innerText()).includes('Expediente:'));
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await pv.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  check('Cancel closes the preview and it stays closed', !(await pv.isVisible()));
  check('cancelled preview saved nothing', !(await daySets(UNO, '08/04/2026')).length);

  await closeToasts(page);
  const daysBefore = (await days()).length;
  await pasteAndProcess(page, 'hola, esto no es un reporte de laboratorio');
  await page.waitForTimeout(1500);
  await r.shot(page, 'garbage');
  check('text with no SOME report saves nothing', (await visiblePatientCount(page)) === before && (await days()).length === daysBefore);

  // ── Analyte parsing: single-focus reports reused from the old unit fixtures,
  //    fed through the real paste UI for a fresh patient (TRES) ────────────
  const TRES = { exp: '7000003-3', name: 'DEMO REGLAS TRES', room: '303' };
  const relabel = (text, oldExp, oldName) => text.split(oldExp).join(TRES.exp).split(oldName).join(TRES.name);

  const TROPONINA = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000001\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tJul 7 2026 1:24PM\n' +
      'Sexo:\tMASCULINO\tUbicación:\tURGENCIAS ADULTOS\nEdad:\t20\tMedico:\tA QUIEN CORRESPONDA\n\n\n' +
      'BANCO DE SANGRE\n\n\nHsTnl o Troponina I (Alta\n\nEstudio\tResultado\tUnidades\tValor de Referencia\n\n' +
      'HsTnl o Troponina I (Alta Sensibilidad)\n\n2180.300\nINDETERMINADO\n\nng/L\nPositivo >= 0.00S/CO\n' +
      'Negativo <= 0.00S/CO\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );

  // A lone, unambiguous report auto-admits its patient as a stub (no room yet)
  // before any preview shows, then saves straight through like any other paste.
  await pasteAndSave(TROPONINA);
  await closeToasts(page);
  await openPatient(TRES);
  sets = await daySets(TRES, '07/07/2026');
  // Altered values are bold+red in the UI; the trailing "*" itself is CSS-hidden
  // in #lab-output-box (see labs-display.mjs renderToken / lab.css .lab-value-star),
  // so these checks match on the value, not the asterisk.
  check('troponin-only report parses into its own TROP block', sets.some((s) => /TnI 2180\.3\b/.test(s.text)),
    sets.map((s) => s.text.slice(0, 160)));

  const SEROL = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000002\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tMay 25 2026 5:07PM\n' +
      'Sexo:\tMASCULINO\tUbicación:\tMED.1\nEdad:\t50\tMedico:\tA QUIEN CORRESPONDA\n\n' +
      'BANCO DE SANGRE\n\nSerologia\n\nEstudio\tResultado\tUnidades\tValor de Referencia\n\n' +
      'Anticuerpos anti HIV1/HIV2 Combo.\n0.070\nNEGATIVO\nS/CO\nPositivo >= 0.80S/CO\n' +
      'Indeterminado >= 0.90-0.99S/CO\nNegativo <= 0.00S/CO\n\n' +
      'Anticuerpos anti virus de la Hepatitis C.\n0.170\nNEGATIVO\nS/CO\nPositivo >= 0.80S/CO\n' +
      'Indeterminado >= 0.90-0.99S/CO\nNegativo <= 0.00S/CO\n\n' +
      'Antigeno de superficie del virus de la Hepatitis B\n0.260\nNEGATIVO\nS/CO\nPositivo >= 0.80S/CO\n' +
      'Indeterminado >= 0.90-0.99S/CO\nNegativo <= 0.00S/CO\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(SEROL);
  sets = await daySets(TRES, '25/05/2026');
  check('serology compacts VIH/VHC/HBsAg with S/CO values',
    sets.some((s) => /VIH neg \(0\.07\)/.test(s.text) && /VHC neg \(0\.17\)/.test(s.text) && /HBsAg neg \(0\.26\)/.test(s.text)),
    sets.map((s) => s.text.slice(0, 160)));

  const GS = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000003\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tJul 18 2026 7:14AM\n' +
      'Sexo:\tFEMENINO\tUbicación:\tNEUROMEDICA\nEdad:\t44\tMedico:\tA QUIEN CORRESPONDA\n \n\n' +
      'BANCO DE SANGRE\n\n\nREPORTE DE GRUPO SANGUINEO RH, COOMBS DIRECTO E INDIRECTO\n\n' +
      'Estudio\tResultado\n\nGrupo Sanguineo / RH\t\nB POSITIVO\n\nCoombs Directo\t\nPOSITIVO / POSITIVO 1+\n\n' +
      'Coombs Indirecto\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(GS);
  sets = await daySets(TRES, '18/07/2026');
  check('blood group/Coombs compacts to GS B+ CD 1+, no CI without a value',
    // "\b" after a "+" is never a word boundary (both sides are non-word), so this
    // must not anchor on it — match the literal tail instead.
    sets.some((s) => /\bGS\b.*B\+/.test(s.text) && /CD 1\+/.test(s.text) && !/\bCI\b/.test(s.text)),
    sets.map((s) => s.text.slice(0, 160)));

  const HECES = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000004\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\t04/05/2026 03:06:21 p. m.\n' +
      'Sexo:\tMASCULINO\tUbicación:\tSERVICIO CLÍNICO 1\nEdad:\t58\tMedico:\tA QUIEN CORRESPONDA\n\n' +
      'PARASITOLOGIA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nFISICOQUIMICO DE HECES\n' +
      'ASPECTO\n*\n6\nTIPO 3 Y 4 G.BRISTOL\nPH\n*\n6.0\n7.0\nPROTEINAS\n*\nNEGATIVO\nNEGATIVO\n' +
      'GLUCOSA\n*\nNEGATIVO\nNEGATIVO\nLEUCOCITOS\n*\nMODERADAS\nNEGATIVO\nERITROCITOS\n*\nESCASAS\nNEGATIVO\n' +
      'GRASA\n*\nNEGATIVO\nNEGATIVO\nFIBRAS MUSCULARES\n*\nESCASAS\nNEGATIVO\n' +
      'COPROPARASITOSCOPICO INMEDIATO\n*\nNEGATIVO\nNEGATIVO\nOBSERVACIONES\n*\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(HECES);
  sets = await daySets(TRES, '04/05/2026');
  check('fisicoquímico de heces parses Asp/pH/Prot/Leu/Eri/Copro',
    sets.some((s) => /HECES/.test(s.text) && /6 TIPO 3 Y 4 G\.BRISTOL/.test(s.text) &&
      /6\.0/.test(s.text) && /MODERADAS/.test(s.text) && /ESCASAS/.test(s.text)),
    sets.map((s) => s.text.slice(0, 200)));

  const FROTIS = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000005\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tMay 5 2026 5:40AM\n' +
      'Sexo:\tFEMENINO\tUbicación:\tSERVICIO CLÍNICO 1\nEdad:\t36\tMedico:\tA QUIEN CORRESPONDA\n\n' +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'HGB\nB\n7.28\ng/dL\t12.20 - 18.10\nWBC\nA\n27.10\nK/uL\t4.00 - 11.00\nOBSERVACIONES\n*\n' +
      'DIFERENCIAL MANUAL\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nSEGMENTADOS\n*\n95\n%\n' +
      'OBSERVACIONES\n*\nFROTIS DE SANGRE PERIFERICA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'FROTIS DE SANGRE PERIFERICA\n*\nHIPOCROMIA +., ANISOCITOSIS +, PLAQUETAS NORMALES EN CANTIDAD, SE OBSERVAN MACROPLAQUETAS.\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(FROTIS);
  sets = await daySets(TRES, '05/05/2026');
  check('smear (frotis) separates red cell quality from platelet comment',
    sets.some((s) => /FROTIS/.test(s.text) && /HIPOCROMIA \+/.test(s.text) && /MACROPLAQUETAS/.test(s.text)),
    sets.map((s) => s.text.slice(0, 200)));

  await pasteAndSave(
    header(TRES, 'May 22 2026 8:00AM') +
      'ESTUDIOS ESPECIALES\nPROCALCITONINA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'PROCALCITONINA\t\n*\n0.09\nng/mL\tADULTO <0.05 ng/mL\n'
  );
  sets = await daySets(TRES, '22/05/2026');
  check('PCT flagged above the 0.05 adult threshold', sets.some((s) => /PCT 0\.09\b/.test(s.text)),
    sets.map((s) => s.text.slice(0, 160)));

  const LIPIDOS = relabel(
    'Expediente:\t7000003-3\tSolicitud:\t2600000006\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tJul 17 2026 7:29AM\n' +
      'Sexo:\tFEMENINO\tUbicación:\tCONSULTA\nEdad:\t41\tMedico:\tA QUIEN CORRESPONDA\n\n' +
      'QUIMICA CLINICA\nCOLESTEROL\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nCOLESTEROL\t\n*\n187\n' +
      'mg/dL\t130 - 200\nTRIGLICERIDOS\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nTRIGLICERIDOS\t\n*\n116\n' +
      'mg/dL\t35 - 150\nCOLESTEROL HDL\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nCOLESTEROL HDL\t\n*\n38\n' +
      'mg%\t29 - 71\nCOLESTEROL LDL\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nCOLESTEROL LDL\t\n*\n125.8\n' +
      'mg/dL\t0.0 - 130.0\nVLDL\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nVLDL\t\n*\n23.2\nmg/dL\t2.0 - 40.0\n' +
      'INDICE ATEROGENICO\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nINDICE ATEROGENICO\t\nA\n3.31\n3.22 RIESGO PROM.\n' +
      'COCIENTE COL.TOT/HDL\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nCOCIENTE COL.TOT/HDL\t\nA\n4.92\n0.00 - 3.10\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(LIPIDOS);
  sets = await daySets(TRES, '17/07/2026');
  check('extended lipid panel: COL/HDL/LDL/VLDL/TGL/IA/CTHDL',
    sets.some((s) => /COL 187/.test(s.text) && /HDL 38/.test(s.text) && /LDL 125\.8/.test(s.text) &&
      /VLDL 23\.2/.test(s.text) && /TGL 116/.test(s.text) && /IA 3\.31/.test(s.text) && /CTHDL 4\.92/.test(s.text)),
    sets.map((s) => s.text.slice(0, 240)));

  await pasteAndSave(
    relabel(
      'Expediente:\t7000003-3\tSolicitud:\t2600000007\n' +
        'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tJun 12 2026 4:29PM\n' +
        'Sexo:\tMASCULINO\tUbicación:\tEMERGENCIAS SHOCK TRAUMA SALA\nEdad:\t23\tMedico:\tA QUIEN CORRESPONDA\n \n\n' +
        'QUIMICA CLINICA\nLIPASA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nLIPASA SERICA\t\nA\n1244\nU/L\t8 - 57',
      '7000003-3', 'DEMO REGLAS TRES'
    )
  );
  sets = await daySets(TRES, '12/06/2026');
  check('lipasa-only report → LIPASA block, no CPK fabricated from "SHOCK" location',
    sets.some((s) => /LIPASA/.test(s.text) && /Lip 1244\b/.test(s.text) && !/\bCPK\b/.test(s.text)),
    sets.map((s) => s.text.slice(0, 160)));

  const COAG_BROKEN = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000008\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tJul 23 2026 5:26PM\n' +
      'HEMATOLOGIA\nTIEMPO DE PROTROMBINA Y TROMBOPLASTINA\nTIEMPO DE PROTROMBINA\nSEG.\t10.25 - 13.20\nINR\n*\n' +
      'TIEMPO DE TROMBOPLASTINA\nB\n26.8\nSEG\t29.1 - 38.4\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(COAG_BROKEN);
  sets = await daySets(TRES, '23/07/2026');
  check('COAG with an incomplete PDF layout does not steal TTP as INR or the range min as TP',
    sets.some((s) => /COAG/.test(s.text) && /TTP 26\.8/.test(s.text) && !/INR 26/.test(s.text) && !/TP 10\.25/.test(s.text)),
    sets.map((s) => s.text.slice(0, 160)));

  // A different day: pasted <2 h after COAG_BROKEN it would merge into that
  // same set (the "same day ≤2 h apart → one set" rule tested above) and its
  // TTP would win, which is not what this check is about.
  const COAG_MULTILINE = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000009\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tJul 24 2026 6:40PM\n' +
      'HEMATOLOGIA\nTIEMPO DE PROTROMBINA Y TROMBOPLASTINA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'TIEMPO DE PROTROMBINA\t\n*\n13.00\nSEG.\t10.25 - 13.20\nTESTIGO\t\n*\n11.76\nSEG\t\nINR\t\n*\n1.11\n' +
      'TIEMPO DE TROMBOPLASTINA\t\nB\n25.2\nSEG\t29.1 - 38.4\nTESTIGO\t\n*\n31.2\nSEG\t\nOBSERVACIONES\t\n*\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(COAG_MULTILINE);
  sets = await daySets(TRES, '24/07/2026');
  check('COAG multi-line (repo) layout reads TP/TTP/INR correctly',
    sets.some((s) => /TP 13\b/.test(s.text) && /TTP 25\.2/.test(s.text) && /INR 1\.11/.test(s.text)),
    sets.map((s) => s.text.slice(0, 200)));

  const PERITONEAL = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000010\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tMay 2 2026 5:11PM\n' +
      'Sexo:\tMASCULINO\tUbicación:\tSERVICIO CLÍNICO 2\nEdad:\t59\tMedico:\tA QUIEN CORRESPONDA\n \n\n' +
      'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'EXAMEN QUIMICO\t\n*\n:\nDENSIDAD\t\n*\n1.010\nPH\t\n*\n8.5\nGLUCOSA\t\n*\n949.0\nmg/dL\t\nPROTEINAS\t\n*\n300\n' +
      'mg/dL\t\nLDH\t\n*\n6\nIU/L\t\nCITOQUIMICO DE\t\n*\nLIQUIDO PERITONEAL\n\n' +
      'BACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'ASPECTO\t\n*\nCLARO\nRECUENTO\t\nA\n48\nLEUCOCITOS/MM3\t0.00 - 5.00\nPOLIMORFONUCLEARES\t\n*\nPREDOMINIO\n%\t\n' +
      'LINFOCITOS\t\n*\n%\t\nERITROCITOS\t\n*\nESCASOS\n/mm3\t\nGRAM\t\n*\nNEGATIVO\nCOMENTARIO\t\n*\nPERITONEAL\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(PERITONEAL);
  sets = await daySets(TRES, '02/05/2026');
  check('peritoneal citoquímico reads Dens/pH/Glu/Prot/LDH/Asp/Rec/PMN/Eri/Gram, no Light',
    sets.some((s) => /Liq/.test(s.text) && /1\.010/.test(s.text) && /8\.5/.test(s.text) && /949/.test(s.text) &&
      /CLARO/.test(s.text) && /PREDOMINIO/.test(s.text) && /ESCASOS/.test(s.text) && /NEGATIVO/.test(s.text) &&
      !/Light/.test(s.text)),
    sets.map((s) => s.text.slice(0, 260)));

  await pasteAndSave(
    header(TRES, 'May 20 2026 8:00AM') +
      'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'EXAMEN QUIMICO\t\n*\n:\nDENSIDAD\t\n*\n1.010\nPH\t\n*\n8.0\nGLUCOSA\t\n*\n78.0\nmg/dL\t\nPROTEINAS\t\n*\n6000\n' +
      'mg/dL\t\nLDH\t\n*\n549\nIU/L\t\nCITOQUIMICO DE\t\n*\nLÍQUIDO PLEURAL\nALBUMINA\n' +
      'Estudio\t\tResultado\tUnidades\tValor de Referencia\nALBUMINA\t\n*\n3.4\ng/dL\t3.2 - 5.5\n' +
      'LDH DESHIDROGENASA LACTICA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'LDH DESHIDROGENASA LACTICA\t\nA\n549\nUI/L\t91 - 180\nCOLESTEROL\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'COLESTEROL\t\nB\n88\nmg/dL\t130 - 200\n' +
      'BACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'ASPECTO\t\n*\nXANTOCROMICO SANGUINOLENTO\nRECUENTO\t\nA\n3,000\nLEUCOCITOS/MM3\t0.00 - 5.00\n' +
      'POLIMORFONUCLEARES\t\n*\n---\n%\t\nLINFOCITOS\t\n*\n100\n%\t\nERITROCITOS\t\n*\n5,000\n/mm3\t\n' +
      'GRAM\t\n*\nABUNDANTES LEUCOCITOS\nCOMENTARIO\t\n*\nLIQUIDO PLEURAL\n'
  );
  sets = await daySets(TRES, '20/05/2026');
  check('pleural Light criteria (LDH>2/3 ULN) flags EXUDADO in the interpretation, not the Liq line',
    sets.some((s) => /Light EXUDADO/i.test(s.text)),
    sets.map((s) => s.text.slice(0, 260)));

  await pasteAndSave(
    header(TRES, 'May 21 2026 8:00AM') +
      'QUIMICA CLINICA\nGLUCOSA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nGLUCOSA\nB\n110\nmg/dL\t70 - 110\n\n' +
      'CITOQUIMICO DE LCR\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nPH\n7.30\nASPECTO\nTURBIO\n' +
      'RECUENTO CELULAR\n2500\nLEUCOCITOS\nGLUCOSA\n25\nmg/dL\t40 - 80\nPROTEINAS\n180\nmg/dL\t15 - 45\nCLORURO\n120\n' +
      'mEq/L\t118 - 132\nGRAM\nCOCCOS GRAM POSITIVOS EN CADENAS\nTINTA CHINA\nNEGATIVO\n\nBACTERIOLOGIA\n'
  );
  sets = await daySets(TRES, '21/05/2026');
  check('LCR with 2500 leukocytes + gram-positive cocci flags bacterial meningitis',
    sets.some((s) => /Leu 2500/.test(s.text) && /Meningitis bacteriana/i.test(s.text)),
    sets.map((s) => s.text.slice(0, 260)));

  await pasteAndSave(
    header(TRES, 'May 7 2026 6:43AM') +
      'GASOMETRIAS\nGASOMETRIA VENOSA PARCIAL\n' + TABLE +
      'PH\t*\t7.39\t\t7.32 - 7.43\npCO2\tB\t35\tmmHg\t40 - 45\npO2\tA\t60\tmmHg\tN/A\nLactato\tB\t0.7\tmmol/L\t0.9 - 1.9\n' +
      'HCO3\tB\t21.2\tmmol/L\t24.0 - 30.0\nEX. BASE\tB\t-3.4\tmmol/L\t-2.0 - 2.0\nSAT 02\tA\t90\t%\t0 - 0\n' +
      'OBSERVACIONES\t*\tCa++ IONIZADO: 0.92 mmol/L\t&\n'
  );
  sets = await daySets(TRES, '07/05/2026');
  check('ionized calcium (iCa) from a gas OBSERVACIONES line is captured',
    sets.some((s) => /iCa 0\.92\b/.test(s.text)), sets.map((s) => s.text.slice(0, 200)));

  const EGO_EU = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000011\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tMay 5 2026 8:29PM\n' +
      'Sexo:\tMASCULINO\tUbicación:\tSERVICIO CLÍNICO 2\nEdad:\t81\tMedico:\tA QUIEN CORRESPONDA\n\n' +
      'URIANALISIS\nEXAMEN GENERAL DE ORINA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nPH\t\nA\n7.0\n5.5 - 6.5\n' +
      'DENSIDAD\t\n*\n1.010\n1.005 - 1.025\nPROTEINAS\t\n*\nNEGATIVO\nERITROCITOS\t\n*\n0\n/CAMPO\t0-2/CAMPO\n' +
      'LEUCOCITOS\t\n*\n0\n/CAMPO\t0-5/CAMPO\nCELULAS EPITELIALES\t\n*\nESCASAS\nAUSENTES\n' +
      'SODIO EN ORINA\n*\n40\n135 - 145\nPOTASIO EN ORINA\n*\n20\nCLORO EN ORINA: 90\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(EGO_EU);
  sets = await daySets(TRES, '05/05/2026');
  check('urinary electrolytes get their own EU row, separate from EGO', sets.some((s) => /EU.*Na 40 K 20 Cl 90/.test(s.text)),
    sets.map((s) => [s.hora, s.text.slice(0, 200)]));

  const DEPURACION = relabel(
    '\nExpediente:\t7000003-3\tSolicitud:\t2600000012\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tSep 9 2026 12:57PM\n' +
      'Sexo:\tMASCULINO\tUbicación:\tMEDICINA INTERNA 1\nEdad:\t75\tMedico:\tA QUIEN CORRESPONDA\n\n' +
      'QUIMICA CLINICA\nDEPURACION DE CREATININA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'VOLUMEN EN ORINA\t\nA\n100\nmls.\tN/A\nTIEMPO\t\nA\n1440\nmin.\tN/A\nDEPURACION DE CREATININA\t\nB\n0.98\n' +
      'ml/min.\t72.00 - 141.00\nCREATININA SERICA\t\nA\n5.8\nmg/dL\t0.6 - 1.4\nCREATININA EN ORINA\t\n*\n82.36\n\n' +
      'URIANALISIS\nCUANTIFICACION PROTEINAS EN ORINA 12 O 24 HRS\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'VOLUMEN DE ORINA\t\nA\n100\nml\tN/A\nRESULTADO\t\nA\n0.09\ngr/vol\tNEGATIVO\nOBSERVACIONES\t\n*\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(DEPURACION);
  sets = await daySets(TRES, '09/09/2026');
  check('creatinine clearance (DepCr) and 24h proteinuria (Prot24h) get their own rows',
    sets.some((s) => /DepCr/.test(s.text) && /0\.98/.test(s.text) && /5\.8/.test(s.text)) &&
      sets.some((s) => /Prot24h/.test(s.text)),
    sets.map((s) => s.text.slice(0, 220)));

  await pasteAndSave(
    relabel(
      '\nExpediente:\t7000003-3\nNombre:\tDEMO REGLAS TRES\tFecha Registro:\tMay 17 2026 12:22PM\n' +
        'HEMATOLOGIA\nPLAQUETAS CON CITRATO\nCUENTA DE PLAQUETAS\t\n*\n14\nK/UL\t\n',
      '7000003-3', 'DEMO REGLAS TRES'
    )
  );
  sets = await daySets(TRES, '17/05/2026');
  check('platelets-with-citrate (PltCit) parses out of a bare count line', sets.some((s) => /PltCit/.test(s.text)),
    sets.map((s) => s.text.slice(0, 160)));

  const SOME_RAUL = relabel(
    'Expediente:\t7000003-3\tSolicitud:\t2600000013\n' +
      'Nombre:\tDEMO REGLAS TRES\tFecha Registro:\tMay 18 2026 3:24AM\n' +
      'Sexo:\tMASCULINO\tUbicación:\tNEUROMEDICA\nEdad:\t70\tMedico:\tA QUIEN CORRESPONDA\n\n' +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nHGB\t\n*\n12.40\n' +
      'g/dL\t12.20 - 18.10\nHCT\t\n*\n39.8\n%\t37.7 - 53.7\nWBC\t\nA\n19.60\nK/uL\t4.00 - 11.00\n' +
      'CREATININA EN SANGRE\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nCREATININA EN SANGRE\t\nA\n6.0\n' +
      'mg/dL\t0.6 - 1.4\nSODIO\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nSODIO\t\nB\n133.6\nmmol/L\t135.0 - 145.0\n',
    '7000003-3', 'DEMO REGLAS TRES'
  );
  await pasteAndSave(SOME_RAUL);
  sets = await daySets(TRES, '18/05/2026');
  const raulSets = sets; // captured now: later pastes reuse `sets` for their own days
  const VANCO =
    header(TRES, 'May 24 2026 8:00AM') +
    'BACTERIOLOGIA\nHEMOCULTIVO\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nMICROORGANISMO\n*\n' +
    'Enterococcus faecalis\nCUENTA\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nVANCOMICINA\n2\tS\nAMPICILINA\n<=2\tS\n' +
    'QUIMICA CLINICA\nDIGOXINA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nDIGOXINA\t\n*\n1.8\nng/mL\t0.8 - 2.0\n';
  await pasteAndSave(VANCO);
  sets = await daySets(TRES, '24/05/2026');
  check('a VANCOMICINA sensitivity row in a BACTERIOLOGIA antibiogram does not fabricate a NIVEL, a real level elsewhere still shows',
    sets.some((s) => /NIVEL/.test(s.text) && /Dig 1\.8/.test(s.text) && !/Vanco/.test(s.text)),
    sets.map((s) => s.text.slice(0, 200)));

  // "Tablas del reporte SOME" button → per-department table view of the same paste.
  await page.locator('#lab-some-tables-btn').click();
  const someTablesBody = page.locator('#lab-some-tables-modal-body');
  await someTablesBody.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const someTablesText = await someTablesBody.innerText().catch(() => '');
  check('"Tablas del reporte SOME" shows the BACTERIOLOGIA and QUIMICA CLINICA departments as tables',
    /Enterococcus faecalis/.test(someTablesText) && /VANCOMICINA/.test(someTablesText) && /DIGOXINA/.test(someTablesText),
    someTablesText.slice(0, 400));
  await page.locator('#lab-some-tables-backdrop [data-wb-close]').click();
  await page.locator('#lab-some-tables-backdrop').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  check('"Tablas del reporte SOME" closes on the × button',
    !(await page.locator('#lab-some-tables-backdrop').isVisible()));

  const LETTERHEAD =
    'Sistema SOME UNIVERSIDAD AUTONOMA DE NUEVO LEON MOP-HU-647-07-RC-040 ' +
    'FACULTAD DE MEDICINA Y HOSPITAL UNIVERSITARIO "DR. JOSE ELEUTERIO GONZALEZ" ' +
    'AV. MADERO Y AV. GONZALITOS, COL. MITRAS CENTRO, MONTERREY, N.L. CP. 64460 ' +
    'REPORTE DE RESULTADOS DE LABORATORIO Campo 12234309 Labo -647* DJEG 64460 UANL -647* Feme 1';
  await pasteAndSave(
    header(TRES, 'May 25 2026 8:00AM') +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
      'HGB\tB\t9.10\tg/dL\t12.20 - 18.10\n' + LETTERHEAD + '\n'
  );
  sets = await daySets(TRES, '25/05/2026');
  check('hospital letterhead glued into a report is not saved as its own lab chunk',
    sets.some((s) => /Hb 9\.1/.test(s.text)) && !sets.some((s) => /UNIVERSIDAD AUTONOMA|MITRAS CENTRO/.test(s.text)),
    sets.map((s) => s.text.slice(0, 260)));

  // "Copiar" floating button → labLinesToClipboardPayload → success toast.
  await openPatient(TRES);
  await page.locator('#lab-copy-fab').click();
  const copiedToast = page.locator('.toast', { hasText: 'Labs copiados al portapapeles' });
  await copiedToast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  check('"Copiar" on the lab card copies the current results and toasts success', await copiedToast.isVisible());
  await closeToasts(page);

  await daySets(TRES, '18/05/2026'); // back to RAUL's day so the DOM read below matches raulSets
  const raulAltered = await alteredValues();
  check('a report with no ref-range column is flagged using its own embedded ranges (Na, Cr out of range)',
    raulSets.some((s) => /Hb 12\.4/.test(s.text)) && raulSets.some((s) => /Cr 6\b/.test(s.text)) &&
      raulSets.some((s) => /Na 133\.6/.test(s.text)) && raulAltered.includes('133.6') && raulAltered.includes('6'),
    { raulSets: raulSets.map((s) => s.text.slice(0, 220)), raulAltered });

  // "Eliminar" in the lab card's "…" more-menu → destructive confirm → the set is
  // actually gone from the day list (TROPONINA, 07/07/2026, is the only set that day).
  await daySets(TRES, '07/07/2026');
  await page.locator('#lab-output-section .lab-output-more-btn').click();
  await page.locator('#lab-output-section [data-onclick-2="deleteSelectedLabHistorySet"]').click();
  const delConfirmOk = page.locator('[data-wb-confirm-ok]');
  await delConfirmOk.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const delConfirmTitle = (await page.locator('.wb-confirm-title').innerText().catch(() => '')) || '';
  await delConfirmOk.click();
  await page.waitForTimeout(300);
  const daysAfterDelete = await days();
  check('"Eliminar" on the lab card asks a destructive confirm, then removes that set from history',
    /Eliminar este conjunto/.test(delConfirmTitle) && !daysAfterDelete.includes('07/07/2026'),
    { delConfirmTitle, daysAfterDelete });

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();

  function check(label, ok, detail) {
    r.check(label, ok, detail);
  }
});
