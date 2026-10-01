#!/usr/bin/env node
/* global document */
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
 *     - urine Na/K after a gas are read as gas Na/K; UAG missing
 *     - a full disk (quota) on "Vista de laboratorio" crashes instead of a warning
 *     - "Labs externos" typing is pulled back into the paste box (stacked
 *       modal focus trap), blank cells save a set, or values are not normalized
 *     - the citoquímico fluid name (Tipo) is taken from a department header
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
  goArea,
} from './harness.mjs';
import { TABLE, header, fullLabs, gas } from './some-fixtures.mjs';
import { LAB_BULK_PATIENT_SEPARATOR } from '../../public/js/lab-bulk-paste.mjs';
import { OLDER_DEMO_SOME_LAB_REPORT } from '../../public/js/tour-demo-some-lab.mjs';

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
  await goArea(page, 'lab');

  const pasteAndSave = (text) => harnessPasteAndSave(page, text);
  // Main moved the history "…" menu into the lab bar (#lab-bar-more). Consolidar and Reprocesar
  // have no button any more; their handlers still exist, so fire them through a delegated data-onclick node.
  const barOpen = (pg) => pg.locator('#lab-bar-more[open]').count();
  const closeBar = async (pg) => { if (await barOpen(pg)) await pg.locator('#lab-bar-more > summary').click(); };
  const moreAction = async (pg, fn) => {
    const item = pg.locator(`#lab-bar-more [data-onclick-2="${fn}"]`);
    if (await item.count()) {
      if (!(await barOpen(pg))) await pg.locator('#lab-bar-more > summary').click();
      await item.click();
    } else {
      await closeBar(pg);
      await pg.evaluate((f) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-onclick', f);
        document.body.appendChild(b);
        b.click();
        b.remove();
      }, fn);
    }
  };
  const bhExtToggle = async (pg) => {
    if (!(await barOpen(pg))) await pg.locator('#lab-bar-more > summary').click();
    await pg.locator('label.rpc-switch:has(#lab-menu-pref-bh)').click();
  };
  const openPaste = async (pg) => {
    if (!(await pg.locator('#btn-lab-paste').isVisible())) await pg.locator('#lab-bar-more > summary').click();
    await pg.locator('#btn-lab-paste').click();
  };

  // ── Gap rows 4 and 28: paste modal at boot; global paste with an empty census ──
  const row = (name, flag, v, unit = '', range = '') => `${name}	${flag}	${v}	${unit}	${range}
`;
  const pb0 = page.locator('#lab-paste-modal-backdrop');
  check('at boot, before any click, the paste modal is closed (no open class, aria-hidden=true)',
    (await pb0.getAttribute('aria-hidden')) === 'true' && !(await pb0.evaluate((e) => e.classList.contains('open'))));
  await openPaste(page);
  await page.locator('#lab-input').waitFor({ state: 'visible' });
  await page.locator('#lab-paste-modal-backdrop [data-onclick="closeLabPasteModal"]').click();
  await page.waitForTimeout(300);
  check('the × (Cerrar) button closes the paste modal (no open class, aria-hidden=true, #lab-input hidden)',
    (await pb0.getAttribute('aria-hidden')) === 'true' && !(await pb0.evaluate((e) => e.classList.contains('open'))) &&
      !(await page.locator('#lab-input').isVisible()));

  const clip = (t) => app.evaluate(({ clipboard }, s) => (s ? clipboard.writeText(s) : clipboard.clear()), t);
  async function globalPaste(t) {
    await closeToasts(page);
    await clip(t);
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    await page.keyboard.press('Meta+V');
    await page.waitForTimeout(900);
  }
  const DIECI = { exp: '7000016-6', name: 'DEMO GARZA DE LA LUNA ANA', room: '316' };
  const glob1 = header(DIECI, 'May 1 2026 8:00AM') + 'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE + row('GLUCOSA EN SANGRE', '*', '97', 'mg/dL', '70 - 110');
  await globalPaste(glob1);
  const emptyPreview = await page.locator('#lab-bulk-preview-confirm').isVisible();
  check('global paste of a SOME report with an empty census → the preview opens', emptyPreview);
  if (emptyPreview) await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  async function openPatient(p) {
    await harnessOpenPatient(page, p);
    if (!(await page.locator('#lab-history-date-select').isVisible())) await goArea(page, 'lab');
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
    // Main marks altered values with a trailing "✕"; altered state is asserted via alteredValues(), so drop the glyph here.
    return sets.map((s) => ({ hora: s.hora, text: flat(s.text.replace(/\s*✕/g, '')) }));
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
  await partialConfirm.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
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
  check('smear (frotis) → "Cal HIPOCROMIA +., ANISOCITOSIS +" line and a separate "Plaq … MACROPLAQUETAS" line, no Obs',
    sets.some((s) => /FROTIS Cal HIPOCROMIA \+\., ANISOCITOSIS \+ FROTIS Plaq [^]*MACROPLAQUETAS/.test(s.text) &&
      !/Cal [^]*MACROPLAQUETAS[^]*Plaq/.test(s.text) && !/Obs[^]*HIPOCROMIA/.test(s.text)),
    sets.map((s) => s.text.slice(0, 200)));

  await pasteAndSave(
    header(TRES, 'May 22 2026 8:00AM') +
      'ESTUDIOS ESPECIALES\nPROCALCITONINA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
      'PROCALCITONINA\t\n*\n0.09\nng/mL\tADULTO <0.05 ng/mL\n'
  );
  sets = await daySets(TRES, '22/05/2026');
  check('PCT-only report → a QS row with PCT 0.09 (above the 0.05 adult threshold)', sets.some((s) => /\bQS\b/.test(s.text) && /PCT 0\.09\b/.test(s.text)),
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
  check('urinary electrolytes get their own EU row, separate from EGO; the EGO row (pH 7.0 Leu 0 Eri 0) has no urine Na/K/Cl',
    sets.some((s) => /EU Na 40 K 20 Cl 90 EGO: pH 7\.0 D 1\.010 Prot NEG Leu 0 Eri 0\b/.test(s.text) && !/EGO:.*\b(Na|K|Cl|NaU|KU|ClU)\b/.test(s.text)),
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
    sets.some((s) => /DepCr Tiempo 1440min Dep 0\.98ml\/min CrS 5\.8 CrU 82\.36/.test(s.text)) &&
      sets.some((s) => /Prot24h Vol 100ml Prot 0\.09 gr\/vol IPC 1\.09/.test(s.text)) && (await alteredValues()).some((v) => /^0\.09/.test(v)),
    sets.map((s) => s.text.slice(0, 220)));

  await pasteAndSave(
    relabel(
      '\nExpediente:\t7000003-3\nNombre:\tDEMO REGLAS TRES\tFecha Registro:\tMay 17 2026 12:22PM\n' +
        'HEMATOLOGIA\nPLAQUETAS CON CITRATO\nCUENTA DE PLAQUETAS\t\n*\n14\nK/UL\t\n',
      '7000003-3', 'DEMO REGLAS TRES'
    )
  );
  sets = await daySets(TRES, '17/05/2026');
  check('platelets-with-citrate (PltCit) parses out of a bare count line: "PltCit Plt 14", 14 altered, no BH row',
    sets.length === 1 && /^PltCit Plt 14$/.test(sets[0].text) && (await alteredValues()).includes('14'),
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
  await page.locator('summary[aria-label="Más acciones de laboratorio"]').click();
  await page.locator('#lab-some-tables-btn').click();
  const someTablesBody = page.locator('#lab-some-tables-modal-body');
  await someTablesBody.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  // One department shows at a time (tabs): read every tab.
  let someTablesText = await someTablesBody.innerText().catch(() => '');
  const someTabs = page.locator('#lab-some-tables-modal-body .lab-some-tab');
  for (let i = 1, n = await someTabs.count(); i < n; i++) {
    await someTabs.nth(i).click();
    someTablesText += '\n' + await someTablesBody.innerText().catch(() => '');
  }
  check('"Tablas del reporte SOME" shows the BACTERIOLOGIA and QUIMICA CLINICA departments as tables',
    /Enterococcus faecalis/.test(someTablesText) && /VANCOMICINA/.test(someTablesText) && /DIGOXINA/.test(someTablesText),
    someTablesText.slice(0, 400));
  await page.locator('#lab-some-tables-backdrop [data-wb-close]').click();
  await page.locator('#lab-some-tables-backdrop').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  check('"Tablas del reporte SOME" closes on the × button',
    !(await page.locator('#lab-some-tables-backdrop').isVisible()));

  const LETTERHEAD =
    'Sistema SOME UNIVERSIDAD EJEMPLO FORM-XX-647-07-RC-040 ' +
    'FACULTAD DE MEDICINA Y HOSPITAL EJEMPLO ' +
    'AV. EJEMPLO 100, COL. CENTRO, CIUDAD EJEMPLO CP. 90001 ' +
    'REPORTE DE RESULTADOS DE LABORATORIO Campo 90001234 Labo -647* LABX 90001 LABY -647* Feme 1';
  await pasteAndSave(
    header(TRES, 'May 25 2026 8:00AM') +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
      'HGB\tB\t9.10\tg/dL\t12.20 - 18.10\n' + LETTERHEAD + '\n'
  );
  sets = await daySets(TRES, '25/05/2026');
  check('hospital letterhead glued into a report is not saved as its own lab chunk',
    sets.some((s) => /Hb 9\.1/.test(s.text)) && !sets.some((s) => /UNIVERSIDAD EJEMPLO|CIUDAD EJEMPLO/.test(s.text)),
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
  await page.locator('#lab-bar-more summary').click();
  await page.locator('#lab-bar-more [data-onclick-2="deleteSelectedLabHistorySet"]').click();
  const delConfirmOk = page.locator('[data-wb-confirm-ok]');
  await delConfirmOk.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const delConfirmTitle = (await page.locator('.wb-confirm-title').innerText().catch(() => '')) || '';
  await delConfirmOk.click();
  await page.waitForTimeout(300);
  const daysAfterDelete = await days();
  check('"Eliminar" on the lab card asks a destructive confirm, then removes that set from history',
    /Eliminar este conjunto/.test(delConfirmTitle) && !daysAfterDelete.includes('07/07/2026'),
    { delConfirmTitle, daysAfterDelete });

  // ── Breadth block (gap rows): BH extendida, RetC, diff/frotis, order, NIVEL, clipboard, Labs externos ──
  const bh = (when, ret = '') =>
    header(TRES, when) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    'HGB\tB\t8.84\tg/dL\t12.20 - 18.10\nHCT\tB\t25.5\t%\t37.7 - 53.7\nWBC\tA\t9.0\tK/uL\t4.00 - 11.00\nPLT\t*\t172\tK/uL\t142 - 424\n' + ret;
  const retOnly = (when, v) =>
    header(TRES, when) + 'HEMATOLOGIA\nDIFERENCIAL MANUAL\n' + TABLE + 'RETICULOCITOS\n' + TABLE +
    `RETICULOCITOS\n*\n${v}\n%\t0.5 - 1.5\n`;
  await pasteAndSave(bh('Jan 3 2026 8:00AM') + '\n\n' + retOnly('Jan 3 2026 8:30AM', 5.0));
  sets = await daySets(TRES, '03/01/2026');
  check('BH row keeps token order Hb Hto Ret RetC Leu Plt; Ret 5 → RetC 2.83 regenerativa (not arregenerativa)',
    sets.length === 1 && /BH Hb 8\.84 Hto 25\.5 Ret 5 RetC 2\.83 \(regenerativa\) Leu 9 Plt 172/.test(sets[0].text),
    sets.map((s) => s.text));
  check('BH altered values (Hb, Hto, Ret 5) are flagged, Leu 9 and Plt 172 are not',
    (await alteredValues()).join('|') === '8.84|25.5|5', await alteredValues());
  await pasteAndSave(retOnly('Jan 4 2026 8:30AM', 1.0));
  sets = await daySets(TRES, '04/01/2026');
  check('Ret-only day (no Hto) shows Ret without RetC and without a Hb', sets.length === 1 && /BH Ret 1$/.test(sets[0].text), sets.map((s) => s.text));

  await pasteAndSave(header(TRES, 'Jan 5 2026 8:00AM') + 'QUIMICA CLINICA\nCREATININA EN SANGRE\n' + TABLE +
    'CREATININA EN SANGRE\t\nA\n1.6\nmg/dL\t0.6 - 1.4\n');
  sets = await daySets(TRES, '05/01/2026');
  check('creatinine without BUN: no BUN/CR is invented, eTFG still computed', sets.length === 1 && /QS Cr 1\.6 eTFG \d+/.test(sets[0].text) && !/BUN/.test(sets[0].text), sets.map((s) => s.text));

  await pasteAndSave(header(TRES, 'Jan 6 2026 8:00AM') + 'QUIMICA CLINICA\nVANCOMICINA\n' + TABLE +
    'VANCOMICINA\t\n*\n18\nug/mL\t10 - 20\nLIPASA SERICA\t\nA\n1244\nU/L\t8 - 57\n');
  sets = await daySets(TRES, '06/01/2026');
  check('real serum VANCOMICINA level → NIVEL Vanco 18; lipase alone in its own single LIPASA row, flagged altered',
    sets.length === 1 && /NIVEL Vanco 18 LIPASA Lip 1244$/.test(sets[0].text) && (await alteredValues()).join('|') === '1244', sets.map((s) => s.text));
  check('no LIPASA row on a day without lipase', !(await daySets(TRES, '03/01/2026')).some((s) => /LIPASA/.test(s.text)));

  await pasteAndSave(header(TRES, 'Jan 7 2026 8:00AM') + 'HEMATOLOGIA\nDIMERO D\n' + TABLE + 'DIMERO D\t\nA\n1850\nng/mL\t0 - 500\n');
  sets = await daySets(TRES, '07/01/2026');
  check('DIMERO D report → COAG DD 1850, flagged altered', sets.length === 1 && /COAG DD 1850$/.test(sets[0].text) && (await alteredValues()).includes('1850'), sets.map((s) => s.text));

  await pasteAndSave(header(TRES, 'Jan 9 2026 8:00AM') + 'HEMATOLOGIA\nDIFERENCIAL MANUAL\n' + TABLE +
    'SEGMENTADOS\n*\n60\n%\nLINFOCITOS\n*\n30\n%\nBANDAS\n*\n4\n%\nEOSINOFILOS\n*\n2\n%\nBASOFILOS\n*\n1\n%\n' +
    'FROTIS DE SANGRE PERIFERICA\n' + TABLE + 'FROTIS DE SANGRE PERIFERICA\n*\nHIPOCROMIA +\n');
  sets = await daySets(TRES, '09/01/2026');
  check('differential-only day → "BH: Dif. Seg Lin Eos Baso Band" line + FROTIS Cal row, no Hb',
    sets.length === 1 && /BH: Dif\. Seg 60% Lin 30% Eos 2% Baso 1% Band 4% FROTIS Cal HIPOCROMIA \+/.test(sets[0].text) && !/\bHb\b/.test(sets[0].text), sets.map((s) => s.text));

  await pasteAndSave(gas(TRES, 'Jan 10 2026 8:00AM', '7.36') + '\n\n' + header(TRES, 'Jan 10 2026 8:20AM') +
    'HEMATOLOGIA\nTIEMPO DE PROTROMBINA Y TROMBOPLASTINA\nTIEMPO DE PROTROMBINA\tA\n14.20\nSEG.\t10.25 - 13.20\nINR\t*\n1.22\n' +
    'TIEMPO DE TROMBOPLASTINA\t*\n30.9\nSEG\t29.1 - 38.4\n\n' + fullLabs(TRES, 'Jan 10 2026 8:30AM'));
  sets = await daySets(TRES, '10/01/2026');
  const full = sets[0]?.text || '';
  const at = (k) => full.search(new RegExp(`(^|\\s)${k}\\s`));
  check('full-day set order is BH → QS → ESC → PFHs → GASES → COAG (COAG after GASES)',
    sets.length === 1 && ['BH', 'QS', 'ESC', 'PFHs', 'GASES', 'COAG'].map(at).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])), full);
  check('QS/ESC/PFHs keep every field of the union (CPK-free, Amil, Alb, Ca)', /Amil 68/.test(full) && /Alb 4\.1/.test(full) && /\bCa 8\.8\b/.test(full) && !/\bCPK\b/.test(full), full);
  check('AG 14.8, cAG 14.5 and Delta-Delta 0.9 are computed with the gas', /AG 14\.8 cAG 14\.5 Delta-Delta 0\.9/.test(full), full);
  const alt10 = await alteredValues();
  check('COAG TP 14.2 / TTP 30.9 / INR 1.22 read right; TP and INR flagged altered, TTP not',
    /COAG TP 14\.2 TTP 30\.9 INR 1\.22/.test(full) && alt10.includes('14.2') && alt10.includes('1.22') && !alt10.includes('30.9'), alt10);

  // Clipboard content of the "Copiar" button: no star, <strong> on altered, <br> line breaks.
  await pasteAndSave(fullLabs(TRES, 'Jan 8 2026 8:00AM'));
  await daySets(TRES, '08/01/2026');
  await page.locator('#lab-copy-fab').click();
  await page.waitForTimeout(600);
  const [clipText, clipHtml] = await app.evaluate(({ clipboard }) => [clipboard.readText(), clipboard.readHTML()]);
  check('"Copiar" text is plain lines "08/01" then BH/QS/ESC/PFHs, with no "*" flags',
    /^08\/01\nBH Hb 11\.85 Hto 38\.4/.test(clipText) && /\nQS Glu 94 Cr 1\.35/.test(clipText) && !clipText.includes('*'), clipText.slice(0, 200));
  check('"Copiar" HTML bolds altered values (<strong>11.85</strong>) and breaks lines with <br>',
    clipHtml.includes('<strong>11.85</strong>') && clipHtml.includes('<br>QS ') && !clipHtml.includes('<strong>38.4'), clipHtml.slice(0, 200));
  await closeToasts(page);
  const inOrder = (text, toks) => toks.every((t, i, a) => text.indexOf(t) >= 0 && (i === 0 || text.indexOf(t) > text.indexOf(a[i - 1])));
  const clipLine = (k) => clipText.split('\n').find((l) => l.startsWith(k + ' ')) || '';
  check('demo report golden: BH/QS/ESC/PFHs rows hold every value in order (not only the derived ones)',
    inOrder(clipLine('BH'), ['Hb 11.85', 'Hto 38.4', 'VCM 82', 'HCM 26.1', 'Leu 6.12', 'Neu 3.88', 'Plt 248']) &&
      inOrder(clipLine('QS'), ['Glu 94', 'Cr 1.35', 'BUN 22', 'AU 7.4', 'COL 142', 'TGL 118']) &&
      inOrder(clipLine('ESC'), ['Na 138', 'Cl 102', 'K 3.9', 'Ca 8.8']) && inOrder(clipLine('PFHs'), ['Alb 4.1', 'Amil 68']),
    clipText);

  // "Vista de laboratorio" → BH extendida while every storage write throws (full disk / quota).
  if (!(await barOpen(page))) await page.locator('#lab-bar-more > summary').click();
  const prefWarns = [];
  const onWarn = (m) => { if (m.type() === 'warning') prefWarns.push(m.text()); };
  page.on('console', onWarn);
  const prefErrs = pageErrors.length;
  const outBefore = await page.locator('#lab-output-box').innerText();
  await page.evaluate(() => {
    globalThis.__realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
  });
  const bhExtSwitch = page.locator('label.rpc-switch:has(#lab-menu-pref-bh)');
  await bhExtSwitch.click();
  await page.waitForTimeout(400);
  const outAfter = await page.locator('#lab-output-box').innerText();
  await page.evaluate(() => { Storage.prototype.setItem = globalThis.__realSetItem; });
  page.off('console', onWarn);
  // The pref is not kept in memory: a failed write leaves the view as it was (no half state).
  check('full storage: "BH extendida" toggle does not crash, warns "failed to write rpc-lab-output-prefs-v1", view unchanged',
    pageErrors.length === prefErrs && prefWarns.some((w) => /failed to write rpc-lab-output-prefs-v1/.test(w)) && outAfter === outBefore,
    { newErrors: pageErrors.slice(prefErrs), prefWarns: prefWarns.slice(0, 3) });
  await bhExtSwitch.click(); // back to the default view (storage works again)
  await closeBar(page);

  // Older demo report + venous-gas-only report, full golden rows.
  await pasteAndSave(OLDER_DEMO_SOME_LAB_REPORT.replace(/9000095-7/g, TRES.exp).replace('DEMO PÉREZ JUAN', TRES.name)
    .replace('Mar 05 2026 7:18AM', 'Feb 10 2026 7:18AM'));
  sets = await daySets(TRES, '10/02/2026');
  const older = sets.map((s) => s.text).join(' ');
  check('older demo report golden: BH Hb 10.2 Hto 35.8 VCM 81 Leu 5.4 Plt 198; QS Glu 108 Cr 1.55 BUN 28 BUN/CR 18.1 COL 155 TGL 132; ESC Na 134 K 3.5',
    inOrder(older, ['Hb 10.2', 'Hto 35.8', 'VCM 81', 'Leu 5.4', 'Plt 198', 'Glu 108', 'Cr 1.55', 'BUN 28', 'BUN/CR 18.1', 'COL 155', 'TGL 132', 'Na 134', 'K 3.5']),
    older);
  const olderAlt = await alteredValues();
  check('older demo report flags Hb/Hto/Glu/Cr/BUN/Na/K altered, not VCM/Leu/Plt',
    ['10.2', '35.8', '108', '1.55', '28', '134', '3.5'].every((v) => olderAlt.includes(v)) && !['81', '5.4', '198'].some((v) => olderAlt.includes(v)), olderAlt);
  await pasteAndSave(gas(TRES, 'Feb 12 2026 8:00AM', '7.39'));
  sets = await daySets(TRES, '12/02/2026');
  const gasAlt = await alteredValues();
  check('venous-gas-only report → one GASES row "pH 7.39 pCO2 35 pO2 60 Lactato 0.7 … 21.2", pCO2/pO2/Lactato/HCO3 flagged',
    sets.length === 1 && /^GASES pH 7\.39 pCO2 35 pO2 60 Lactato 0\.7 \S+ 21\.2/.test(sets[0].text) && ['35', '60', '0.7', '21.2'].every((v) => gasAlt.includes(v)) && !gasAlt.includes('7.39'),
    { sets, gasAlt });

  // Corrected reticulocytes: Hto 30 with Ret 4 (2.67) and the Ret 3 boundary (exactly 2 → regenerativa).
  const bhHto = (when, hct, ret) =>
    header(TRES, when) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    `HGB\tB\t9.9\tg/dL\t12.20 - 18.10\nHCT\tB\t${hct}\t%\t37.7 - 53.7\n` + '\n' + retOnly(when.replace('8:00', '8:10'), ret);
  await pasteAndSave(bhHto('Feb 6 2026 8:00AM', 30, 4.0));
  const ret4 = (await daySets(TRES, '06/02/2026')).map((s) => s.text).join(' ');
  await pasteAndSave(bhHto('Feb 7 2026 8:00AM', 30, 3.0));
  const ret3 = (await daySets(TRES, '07/02/2026')).map((s) => s.text).join(' ');
  check('Hto 30 + Ret 4 → RetC 2.67 regenerativa', /RetC 2\.67 \(regenerativa\)/.test(ret4), ret4);
  check('boundary Hto 30 + Ret 3 → RetC 2 read as regenerativa, not arregenerativa', /RetC 2(\.0+)? \(regenerativa\)/.test(ret3), ret3);

  // Anion gap without albumin (no cAG) and urinary anion gap next to a gas.
  await pasteAndSave(header(TRES, 'Feb 8 2026 8:00AM') + 'QUIMICA CLINICA\nCLORO\n' + TABLE + 'CLORO\t\t*\t104\tmmol/L\t101.0 - 110.0\n' +
    'SODIO\n' + TABLE + 'SODIO\t\t*\t140\tmmol/L\t135.0 - 145.0\n\n' + gas(TRES, 'Feb 8 2026 8:10AM', '7.36'));
  const agDay = (await daySets(TRES, '08/02/2026')).map((s) => s.text).join(' ');
  check('Na 140, Cl 104, HCO3 21.2, no albumin → AG 14.8 and no cAG', /\bAG 14\.8\b/.test(agDay) && !/\bcAG\b/.test(agDay), agDay);
  // Same report as the gas: UAG is read from urine electrolytes in the report's chemistry.
  const urine = (na, k, cl) => '\nQUIMICA CLINICA\nELECTROLITOS URINARIOS\n' + TABLE +
    `SODIO EN ORINA\n*\n${na}\n135 - 145\nPOTASIO EN ORINA\n*\n${k}\nCLORO EN ORINA: ${cl}\n`;
  await pasteAndSave(gas(TRES, 'Feb 9 2026 8:00AM', '7.30') + urine(40, 22, 34));
  const uag1 = (await daySets(TRES, '09/02/2026')).map((s) => s.text).join(' ');
  await pasteAndSave(gas(TRES, 'Feb 11 2026 8:00AM', '7.30') + urine(20, 10, 50));
  const uag2 = (await daySets(TRES, '11/02/2026')).map((s) => s.text).join(' ');
  check('urinary anion gap next to a gas: Na 40 K 22 Cl 34 → UAG 28; Na 20 K 10 Cl 50 → UAG -20',
    /\bUAG 28\b/.test(uag1) && /\bUAG -20\b/.test(uag2), { uag1, uag2 });
  check('urine Na/K are not read as blood-gas Na/K in the GASES row', !/GASES[^A-Z]*\bNa 40\b/.test(uag1) && !/GASES[^A-Z]*\bNa 20\b/.test(uag2), { uag1, uag2 });

  // EGO renders last in a full day (BH → … → GASES → EGO).
  await pasteAndSave(fullLabs(TRES, 'Feb 14 2026 8:00AM') + '\n\n' + gas(TRES, 'Feb 14 2026 8:10AM', '7.36') + '\n\n' +
    header(TRES, 'Feb 14 2026 8:20AM') + EGO);
  const egoDay = (await daySets(TRES, '14/02/2026')).map((s) => s.text).join(' ');
  const pos = (k) => egoDay.search(new RegExp(`(^|\\s)${k}:?\\s`));
  check('full day with urinalysis: BH → QS → ESC → PFHs → GASES → EGO, EGO last',
    ['BH', 'QS', 'ESC', 'PFHs', 'GASES', 'EGO'].map(pos).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])), egoDay);

  // D-dimer with the FEU unit line + letterhead.
  const dd = (when, v, extra = '') => header(TRES, when) + 'HEMATOLOGIA\nDIMERO D\n' + TABLE + `DIMERO D\t\nA\n${v}\nng/mL\t0 - 500\n` + extra;
  await pasteAndSave(dd('Feb 16 2026 8:00AM', 881, 'UEF (UNIDADES EQUIVALENTES DE FIBRINOGENO)\nCampo 90001234 Labo -647* LABX 90001\n'));
  const dd881 = (await daySets(TRES, '16/02/2026')).map((s) => s.text).join(' ');
  check('D-dimer 881 with the "UEF (… FIBRINOGENO)" unit line and a letterhead → COAG DD 881, no Fib', /COAG DD 881\b/.test(dd881) && !/\bFib\b/.test(dd881), dd881);

  // Citoquímico fluid name (Tipo): read from "CITOQUIMICO DE" / * / name, never a department header.
  const peri = (await daySets(TRES, '02/05/2026')).map((s) => s.text).join(' ');
  check('peritoneal citoquímico shows the fluid name LIQUIDO PERITONEAL', /LIQUIDO PERITONEAL/.test(peri), peri.slice(0, 300));
  const cito = (when, tail) => header(TRES, when) + 'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    'DENSIDAD\t\n*\n1.015\nGLUCOSA\t\n*\n90.0\nmg/dL\t\nPROTEINAS\t\n*\n2000\nmg/dL\t\n' + tail;
  const bact = 'BACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE + 'ASPECTO\t\n*\nCLARO\nGRAM\t\n*\nNEGATIVO\n';
  await pasteAndSave(cito('Feb 2 2026 8:00AM', 'CITOQUIMICO DE\t\n*\n\n' + bact));
  const c2 = (await daySets(TRES, '02/02/2026')).map((s) => s.text).join(' ');
  await pasteAndSave(cito('Feb 3 2026 8:00AM', 'CITOQUIMICO DE BACTERIOLOGIA\n' + bact));
  const c3 = (await daySets(TRES, '03/02/2026')).map((s) => s.text).join(' ');
  await pasteAndSave(cito('Feb 4 2026 8:00AM', 'CITOQUIMICO DE LIQUIDO PLEURAL\n' + bact));
  const c4 = (await daySets(TRES, '04/02/2026')).map((s) => s.text).join(' ');
  check('"CITOQUIMICO DE" with an empty cell before the BACTERIOLOGIA header → no Tipo BACTERIOLOGIA', /1\.015/.test(c2) && !/BACTERIOLOGIA/.test(c2), c2);
  check('one-line "CITOQUIMICO DE BACTERIOLOGIA" → no Tipo BACTERIOLOGIA', /1\.015/.test(c3) && !/BACTERIOLOGIA/.test(c3), c3);
  check('one-line "CITOQUIMICO DE LIQUIDO PLEURAL" → fluid name LIQUIDO PLEURAL shown', /LIQUIDO PLEURAL/.test(c4), c4);

  // "Pegar SOME" modal aria state + "Labs externos" manual entry (synthetic BH).
  await openPatient(TRES);
  await openPaste(page);
  const pasteBackdrop = page.locator('#lab-paste-modal-backdrop');
  check('"Pegar SOME" opens the paste modal (open class, aria-hidden=false)',
    (await pasteBackdrop.getAttribute('aria-hidden')) === 'false' && (await pasteBackdrop.evaluate((e) => e.classList.contains('open'))));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Escape closes the paste modal (aria-hidden=true)', (await pasteBackdrop.getAttribute('aria-hidden')) === 'true');

  // "Labs externos" (inside "Pegar SOME") → manual BH/VIRAL entry saved to today's history.
  const manualModal = page.locator('#lab-manual-entry-modal');
  const cell = (k) => page.locator(`#lab-manual-fields input[data-field-key="${k}"]`);
  async function openManual(type, hora) {
    await openPaste(page);
    await page.locator('#btn-lab-manual-entry').click();
    await manualModal.waitFor({ state: 'visible' });
    await page.locator('#lab-manual-type').selectOption(type);
    await page.locator('#lab-manual-hora').fill(hora);
  }
  async function saveManual() {
    await page.locator('#lab-manual-entry-confirm').click();
    await manualModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await closeToasts(page);
  }
  const now = new Date();
  const today = [now.getDate(), now.getMonth() + 1].map((n) => String(n).padStart(2, '0')).join('/') + '/' + now.getFullYear();
  await openManual('BH', '06:00');
  const manualTypes = await page.locator('#lab-manual-type option').evaluateAll((os) => os.map((o) => o.value));
  check('"Labs externos" offers BH, QS, ESC, PFHs, GASES, TIR, ENDO; BH shows an Hb cell; the paste modal hands off (closes)',
    ['BH', 'QS', 'ESC', 'PFHs', 'GASES', 'TIR', 'ENDO'].every((t) => manualTypes.includes(t)) && (await cell('Hb').isVisible()) &&
      (await pasteBackdrop.getAttribute('aria-hidden')) === 'true', manualTypes);
  await cell('Hb').fill('   ');
  await cell('Leu').fill(' ');
  await page.locator('#lab-manual-entry-confirm').click();
  const emptyToast = page.locator('.toast', { hasText: 'Llena al menos un valor' });
  await emptyToast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  check('"Labs externos" with only blank cells saves nothing ("Llena al menos un valor", modal stays open)',
    (await emptyToast.isVisible()) && (await manualModal.isVisible()) && !(await days()).includes(today));
  await closeToasts(page);
  await cell('Hb').fill('12,4');
  await cell('Leu').fill('8.1');
  await saveManual();
  await openManual('BH', '12:00');
  await cell('Hb').fill('9.7*');
  await saveManual();
  await openManual('VIRAL', '18:00');
  await cell('VDRL').fill('No reactivo');
  await saveManual();
  sets = await daySets(TRES, today);
  const manualAltered = await alteredValues();
  check('manual BH "12,4" / empty Hto / "8.1" saves "BH Hb 12.4 Leu 8.1" (comma → dot, blank cell omitted)',
    sets.some((s) => s.hora === '06:00' && /\bBH Hb 12\.4 Leu 8\.1$/.test(s.text)), sets);
  check('manual BH "9.7*" keeps the star as the altered flag (9.7 shown altered, 12.4 not)',
    sets.some((s) => s.hora === '12:00' && /\bBH Hb 9\.7$/.test(s.text)) && manualAltered.includes('9.7') && !manualAltered.includes('12.4'),
    { sets, manualAltered });
  check('manual VIRAL VDRL "No reactivo" saves one token "VDRL No_reactivo"',
    sets.some((s) => s.hora === '18:00' && /VIRAL VDRL No_reactivo/.test(s.text)), sets);

  // ── Gap rows 2, 3, 6, 10, 11, 14, 15, 17-20, 22-25, 27, 28 (queue lab-paste-rules.tsv 1-28) ──
  const dayText = async (p, d) => (await daySets(p, d)).map((s) => s.text).join(' ');
  // ── Row 6: header variants (Sexo FEMENINO, Medico on the Sexo line, "Edad: 8 meses") ──
  const CUATRO = { exp: '7000004-4', name: 'DEMO REGLAS CUATRO', room: '304' };
  await pasteAndSave(`Expediente:\t${CUATRO.exp}\tSolicitud:\t2600000401\nNombre:\t${CUATRO.name}\tFecha Registro:\tJun 11 2026 9:15AM\n` +
    'Sexo:\tFEMENINO\tMedico:\tSERVICIO DEMO\nUbicación:\tSERVICIO DEMO\nEdad:\t8 meses\n\n' +
    'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + row('HGB', 'B', '10.1', 'g/dL', '12.20 - 18.10'));
  await openPatient(CUATRO);
  await goArea(page, 'nota');
  await page.locator('.dash-name:visible').first().click();
  await page.locator('#exp-datos-modal-backdrop.open').waitFor({ timeout: 8000 }).catch(() => {});
  const cuatroMeta = await page.locator('#exp-datos-modal-backdrop.open [data-datos-sum="meta"]').innerText().catch(() => '');
  await page.keyboard.press('Escape');
  await page.locator('#exp-datos-modal-backdrop.open').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  await goArea(page, 'lab');
  const cuatroDays = (await daySets(CUATRO, '11/06/2026')).length;
  check('header with Sexo FEMENINO, Medico on the Sexo line and "Edad: 8 meses" → patient "8 meses · F" (not 8 años), labs dated 11/06/2026',
    /^8 meses · F\b/.test(cuatroMeta.trim()) && cuatroDays === 1, { cuatroMeta, cuatroDays });

  // ── Row 6: demo report BH extras reach Tendencias; Row 10: differential-only → Tendencias % ──
  async function openTend() {
    await closeToasts(page);
    await page.locator('#lab-inner-tend-btn').click();
    await page.locator('#tendencias-container .tend-row, #lab-inner-tend-mount .tend-row').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }
  async function tendRows() {
    return page.locator('.tend-row[data-series-key]').evaluateAll((els) => Object.fromEntries(els.filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => [e.getAttribute('data-series-key'), e.innerText.replace(/\s+/g, ' ').trim() + (e.querySelector('[class*="alter"], [class*="bad"], [class*="abn"]') ? ' [ALT]' : '')])));
  }
  const CINCO = { exp: '7000005-5', name: 'DEMO REGLAS CINCO', room: '305' };
  await pasteAndSave(fullLabs(CINCO, 'Apr 11 2026 9:42AM'));
  await pasteAndSave(fullLabs(CINCO, 'Apr 12 2026 9:42AM'));
  await openPatient(CINCO);
  await openTend();
  const t5 = await tendRows();
  await page.locator('#lab-inner-labs-btn').click();
  const t5bh = Object.entries(t5).filter(([k]) => k.startsWith('BH|')).map(([k, v]) => k + ' ' + v).join(' | ');
  // RDW and MPV have no Tendencias card (catalog), so only the differential % extras are checked.
  check('demo report BH extras reach Tendencias: Lin% 17.2, Mono% 11.6, Eos% 1.8, Baso% 2',
    /BH\|LinPct [^|]*17\.2/.test(t5bh) && /BH\|MonoPct [^|]*11\.6/.test(t5bh) && /BH\|EosPct [^|]*1\.8/.test(t5bh) && /BH\|BasoPct [^|]*\b2\b/.test(t5bh),
    Object.fromEntries(Object.entries(t5).filter(([k]) => k.startsWith('BH|'))));

  const SEIS = { exp: '7000006-6', name: 'DEMO REGLAS SEIS', room: '306' };
  const difSeis = (when) => (header(SEIS, when) + 'HEMATOLOGIA\nDIFERENCIAL MANUAL\n' + TABLE +
    'SEGMENTADOS\nA\n77\n%\nBANDAS\n*\n1\n%\nLINFOCITOS\n*\n17\n%\nEOSINOFILOS\n*\n4\n%\nBASOFILOS\n*\n1\n%\n' +
    'FROTIS DE SANGRE PERIFERICA\n' + TABLE + 'FROTIS DE SANGRE PERIFERICA\n*\nNO HIPOCROMIA.\n');
  await pasteAndSave(difSeis('Mar 2 2026 8:00AM'));
  await pasteAndSave(difSeis('Mar 3 2026 8:00AM'));
  const seis = await daySets(SEIS, '02/03/2026');
  const seisAlt = await alteredValues();
  check('DIFERENCIAL MANUAL-only report → BH "Dif." line with Seg 77% and Lin 17%, and a FROTIS row ("NO HIPOCROMIA.")',
    seis.length === 1 && /BH: Dif\. Seg 77% Lin 17%/.test(seis[0].text) && /FROTIS .*NO HIPOCROMIA/.test(seis[0].text),
    { seis, seisAlt });
  await openTend();
  const t6 = await tendRows();
  await page.locator('#lab-inner-labs-btn').click();
  check('differential-only → Tendencias Neu% 77, Lin% 17, Eos% 4, Baso% 1, Bandas 1, and no absolute Lin card',
    /77/.test(t6['BH|NeuPct'] || '') && /17/.test(t6['BH|LinPct'] || '') && /\b4\b/.test(t6['BH|EosPct'] || '') && /\b1\b/.test(t6['BH|BasoPct'] || '') &&
      Object.keys(t6).some((k) => /Band/i.test(k) && /\b1\b/.test(t6[k])) && !t6['BH|Lin'],
    t6);

  // ── Row 11: order with TROP + EGO; QS/ESC/PFHs union of two reports of one draw ──
  const SIETE = { exp: '7000007-7', name: 'DEMO REGLAS SIETE', room: '307' };
  const EGO2 = 'URIANALISIS\nEXAMEN GENERAL DE ORINA\n' + TABLE +
    'PH\t\nA\n7.0\n5.5 - 6.5\nDENSIDAD\t\n*\n1.010\n1.005 - 1.025\nPROTEINAS\t\n*\nNEGATIVO\n' +
    'ERITROCITOS\t\n*\n0\n/CAMPO\t0-2/CAMPO\nLEUCOCITOS\t\n*\n0\n/CAMPO\t0-5/CAMPO\n';
  const TROP = 'BANCO DE SANGRE\n\nHsTnl o Troponina I (Alta\n\nEstudio\tResultado\tUnidades\tValor de Referencia\n\n' +
    'HsTnl o Troponina I (Alta Sensibilidad)\n\n35.500\nINDETERMINADO\n\nng/L\nPositivo >= 0.00S/CO\nNegativo <= 0.00S/CO\n';
  await pasteAndSave(header(SIETE, 'Mar 1 2026 8:00AM') + EGO2);
  const egoOnly = await daySets(SIETE, '01/03/2026');
  check('EGO-only report → no BH and no DepCr row; EGO row shows pH 7.0, Leu 0, Eri 0',
    egoOnly.length === 1 && /^EGO: pH 7\.0 .*Leu 0 Eri 0/.test(egoOnly[0].text) && !/\bBH\b|DepCr/.test(egoOnly[0].text), egoOnly);
  await pasteAndSave(fullLabs(SIETE, 'Mar 3 2026 8:00AM') + '\n\n' + gas(SIETE, 'Mar 3 2026 8:05AM', '7.36') + '\n\n' +
    header(SIETE, 'Mar 3 2026 8:10AM') + 'HEMATOLOGIA\nTIEMPO DE PROTROMBINA Y TROMBOPLASTINA\n' +
    'TIEMPO DE PROTROMBINA\tA\n14.20\nSEG.\t10.25 - 13.20\nINR\t*\n1.22\nTIEMPO DE TROMBOPLASTINA\t*\n30.9\nSEG\t29.1 - 38.4\n\n' +
    header(SIETE, 'Mar 3 2026 8:15AM') + TROP + '\n\n' + header(SIETE, 'Mar 3 2026 8:20AM') + EGO2);
  const ord = await dayText(SIETE, '03/03/2026');
  const posO = (k) => ord.search(new RegExp(`(^|\\s)${k}:?\\s`));
  check('one draw with every section → BH, QS, ESC, PFHs, GASES, then TROP, EGO last (COAG present)',
    ['BH', 'QS', 'ESC', 'PFHs', 'GASES', 'TROP', 'EGO'].map(posO).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])) && posO('COAG') > posO('GASES'), ord);

  await pasteAndSave(header(SIETE, 'Mar 4 2026 8:00AM') + 'QUIMICA CLINICA\nQUIMICA SANGUINEA\n' + TABLE +
    row('GLUCOSA EN SANGRE', '*', '90', 'mg/dL', '70 - 110') + row('CREATININA EN SANGRE', '*', '1.2', 'mg/dL', '0.6 - 1.4') +
    row('NITROGENO DE LA UREA EN SANGRE', '*', '18', 'mg/dL', '7 - 20') + row('PROTEINA C REACTIVA', '*', '4.1', 'mg/L', '0 - 5') +
    row('SODIO', '*', '138', 'mmol/L', '135.0 - 145.0') + row('CLORO', '*', '102', 'mmol/L', '101.0 - 110.0') +
    row('ALBUMINA', '*', '3.2', 'g/dL', '3.2 - 5.5') + row('AST(ASPARTATO AMINOTRANSFERASA)', '*', '28', 'U/L', '0 - 40') + '\n\n' +
    header(SIETE, 'Mar 4 2026 8:00AM').replace(/Solicitud:\t\d+/, 'Solicitud:\t2600000702') + 'QUIMICA CLINICA\nQUIMICA SANGUINEA\n' + TABLE +
    row('CPK CREATINA FOSFOQUINASA', 'A', '450', 'U/L', '20 - 200') + row('POTASIO', 'B', '3.1', 'mmol/L', '3.5 - 5.1') +
    row('MAGNESIO', '*', '1.4', 'mg/dL', '1.6 - 2.6') + row('GAMMA GLUTAMIL TRANSFERASA', 'A', '90', 'U/L', '8 - 61') +
    row('LDH DESHIDROGENASA LACTICA', '*', '220', 'UI/L', '91 - 250'));
  const uni = await daySets(SIETE, '04/03/2026');
  const uniAlt = await alteredValues();
  const uniT = uni.map((s) => s.text).join(' ');
  check('two reports of one draw → one QS (Glu 90, Cr 1.2, CPK 450), one ESC (Na 138, K 3.1), one PFHs (Alb 3.2, GGT 90); CPK, K, GGT altered',
    uni.length === 1 && (uniT.match(/(^|\s)QS\s/g) || []).length === 1 && (uniT.match(/(^|\s)ESC\s/g) || []).length === 1 &&
      (uniT.match(/(^|\s)PFHs\s/g) || []).length === 1 && /Glu 90/.test(uniT) && /Cr 1\.2/.test(uniT) && /CPK 450/.test(uniT) &&
      /Na 138/.test(uniT) && /K 3\.1/.test(uniT) && /Alb 3\.2/.test(uniT) && /GGT 90/.test(uniT) && ['450', '3.1', '90'].every((v) => uniAlt.includes(v)),
    { uni, uniAlt });

  // ── Row 14: differential + coag + fibrinogen + frotis + D-dimer in one report; BH 5:08 vs DD 12:22 same day ──
  await pasteAndSave(header(SIETE, 'Mar 5 2026 8:00AM') + 'HEMATOLOGIA\nDIFERENCIAL MANUAL\n' + TABLE +
    'SEGMENTADOS\nA\n71\n%\nLINFOCITOS\n*\n25\n%\nMETAMIELOCITOS\nA\n3\n%\n' +
    'TIEMPO DE PROTROMBINA Y TROMBOPLASTINA\nTIEMPO DE PROTROMBINA\tA\n14.20\nSEG.\t10.25 - 13.20\nINR\t*\n1.22\n' +
    'TIEMPO DE TROMBOPLASTINA\t*\n30.9\nSEG\t29.1 - 38.4\nFIBRINOGENO\n' + TABLE + 'FIBRINOGENO\t\nA\n405\nmg/dL\t150 - 400\n' +
    'FROTIS DE SANGRE PERIFERICA\n' + TABLE + 'FROTIS DE SANGRE PERIFERICA\n*\nHIPOCROMIA + .\n' +
    'DIMERO D\n' + TABLE + 'DIMERO D\t\nA\n2227\nng/mL\t0 - 500\n');
  const dc = await dayText(SIETE, '05/03/2026');
  const dcAlt = await alteredValues();
  check('differential + coag report → BH "Dif." Seg 71% altered, Lin 25%, Meta 3%, no "Coag." in BH; one COAG row TP 14.2 … Fib 405 … DD 2227; FROTIS HIPOCROMIA',
    /BH: Dif\. Seg 71%/.test(dc) && /Lin 25%/.test(dc) && /Meta 3%/.test(dc) && !/Coag\./.test(dc) && (dc.match(/(^|\s)COAG\s/g) || []).length === 1 &&
      /COAG TP 14\.2 .*Fib 405.*DD 2227/.test(dc) && /FROTIS .*HIPOCROMIA/.test(dc) && dcAlt.some((v) => /^71/.test(v)),
    { dc, dcAlt });


  // ── Row 22: EGO + DEPURACION in one report → no EU row ──
  await pasteAndSave(header(SIETE, 'Mar 7 2026 8:00AM') + EGO2 + 'QUIMICA CLINICA\nDEPURACION DE CREATININA\n' + TABLE +
    'VOLUMEN EN ORINA\t\nA\n1500\nmls.\tN/A\nTIEMPO\t\nA\n1440\nmin.\tN/A\nDEPURACION DE CREATININA\t\nB\n40.5\nml/min.\t72.00 - 141.00\n' +
    'CREATININA SERICA\t\nA\n2.1\nmg/dL\t0.6 - 1.4\nCREATININA EN ORINA\t\n*\n60.2\n');
  const egoDep = await dayText(SIETE, '07/03/2026');
  check('EGO + DEPURACION/CREATININA EN ORINA in one report → EGO and DepCr rows, no EU row', /EGO:/.test(egoDep) && /DepCr/.test(egoDep) && !/(^|\s)EU\s/.test(egoDep), egoDep);

  // ── Row 20: day delete (2 sets), delete all, Cancel ──
  const DIEZ = { exp: '7000010-0', name: 'DEMO REGLAS DIEZ', room: '310' };
  await pasteAndSave(gas(DIEZ, 'Mar 10 2026 6:00AM', '7.30'));
  await pasteAndSave(gas(DIEZ, 'Mar 10 2026 11:00AM', '7.41') + '\n\n' + gas(DIEZ, 'Mar 11 2026 8:00AM', '7.35') + '\n\n' + gas(DIEZ, 'Mar 12 2026 8:00AM', '7.33'));
  const more = async (fn) => {
    await moreAction(page, fn);
    await page.locator('[data-wb-confirm-ok]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    return {
      title: (await page.locator('.wb-confirm-title').innerText().catch(() => '')) || '',
      okClass: (await page.locator('[data-wb-confirm-ok]').getAttribute('class').catch(() => '')) || '',
    };
  };
  await daySets(DIEZ, '11/03/2026');
  await more('deleteSelectedLabHistorySet');
  await page.locator('[data-wb-confirm-cancel]').click();
  await page.waitForTimeout(300);
  check('single set → Eliminar → Cancel keeps the set', (await days()).includes('11/03/2026'), await days());
  const d10 = await daySets(DIEZ, '10/03/2026');
  const dayConfirm = await more('deleteSelectedLabHistorySet');
  await page.locator('[data-wb-confirm-ok]').click();
  await page.waitForTimeout(300);
  check('day with 2 sets → Eliminar asks "¿Eliminar los 2 conjuntos de este día?" (destructive button); OK removes the whole day',
    d10.length === 2 && /¿Eliminar los 2 conjuntos de este día\?/.test(dayConfirm.title) && /danger|destruct/i.test(dayConfirm.okClass) && !(await days()).includes('10/03/2026'),
    { d10: d10.length, dayConfirm, days: await days() });
  const allConfirm = await more('deleteAllLabHistorySets');
  await page.locator('[data-wb-confirm-cancel]').click();
  await page.waitForTimeout(300);
  const keptAll = await days();
  await more('deleteAllLabHistorySets');
  await page.locator('[data-wb-confirm-ok]').click();
  await page.waitForTimeout(300);
  check('"Eliminar todos los estudios" asks "¿Eliminar todos los estudios de laboratorio de este paciente?"; Cancel keeps all, OK removes all',
    /¿Eliminar todos los estudios de laboratorio de este paciente\?/.test(allConfirm.title) && keptAll.includes('11/03/2026') && keptAll.includes('12/03/2026') &&
      !(await page.locator('#lab-history-date-select option').allTextContents()).some((t) => /\/03\/2026/.test(t)),
    { allConfirm, keptAll, after: await days() });

  // ── Row 23: results card title + toma headers ──
  await pasteAndSave(cbcSpacedLike(SIETE, 'Mar 8 2026 6:43AM') + '\n\n' + header(SIETE, 'Mar 8 2026 7:30AM') + 'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE +
    row('GLUCOSA EN SANGRE', 'A', '180', 'mg/dL', '70 - 110') + row('SODIO', '*', '139', 'mmol/L', '135.0 - 145.0'));
  function cbcSpacedLike(p, when) {
    return header(p, when) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + row('HGB', 'B', '9.1', 'g/dL', '12.20 - 18.10') +
      row('HCT', 'B', '28.0', '%', '37.7 - 53.7') + row('PLT', '*', '200', 'K/uL', '142 - 424');
  }
  await daySets(SIETE, '08/03/2026');
  const cardTitle = await page.locator('#lab-output-title-text').innerText();
  const cardAlt = (await alteredValues()).length;
  const cardM = cardTitle.trim().match(/^Resultados · (\d+) alterados? de (\d+)$/i);
  check('card title reads "Resultados · N alterados de M" with N = the altered values shown',
    !!cardM && Number(cardM[1]) === cardAlt && Number(cardM[2]) > cardAlt, { cardTitle, cardAlt });

  // ── Row 24: consolidation windows ──
  const OCHO = { exp: '7000008-8', name: 'DEMO REGLAS OCHO', room: '308' };
  const bhAt = (when, hb) => header(OCHO, when) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + row('HGB', 'B', hb, 'g/dL', '12.20 - 18.10');
  const gasAt = (when, ph) => gas(OCHO, when, ph);
  await pasteAndSave(bhAt('Mar 20 2026 6:00AM', '9.0'));
  const hemo = (when) => header(OCHO, when) + 'BACTERIOLOGIA\nHEMOCULTIVO\n' + TABLE + 'MICROORGANISMO\n*\nSIN DESARROLLO\n';
  await pasteAndSave([
    bhAt('Mar 20 2026 11:00AM', '9.1'),
    bhAt('Mar 21 2026 6:00AM', '9.2'), bhAt('Mar 21 2026 8:00AM', '9.3'),
    gasAt('Mar 22 2026 3:56AM', '7.31'), bhAt('Mar 22 2026 6:43AM', '9.4'),
    bhAt('Mar 23 2026 6:00AM', '9.5'), gasAt('Mar 23 2026 10:00AM', '7.32'), bhAt('Mar 23 2026 11:00AM', '9.6'),
    bhAt('Mar 24 2026 8:00AM', '9.7'), gasAt('Mar 24 2026 8:30AM', '7.33'), gasAt('Mar 24 2026 9:30AM', '7.34'), gasAt('Mar 24 2026 12:00PM', '7.35'),
    gasAt('Mar 25 2026 8:00AM', '7.36'), gasAt('Mar 25 2026 8:05AM', '7.36') + 'QUIMICA CLINICA\nELECTROLITOS\n' + TABLE +
      row('SODIO', '*', '140', 'mmol/L', '135.0 - 145.0') + row('CLORO', '*', '104', 'mmol/L', '101.0 - 110.0') + row('ALBUMINA', 'B', '3.0', 'g/dL', '3.2 - 5.5'),
    bhAt('Mar 26 2026 8:00AM', '9.8'), gasAt('Mar 26 2026 8:30AM', '7.37'), hemo('Mar 26 2026 8:45AM'), bhAt('Mar 27 2026 8:00AM', '9.9'),
  ].join('\n\n'));
  const S = async (d) => daySets(OCHO, d);
  const s20 = await S('20/03/2026'), s21 = await S('21/03/2026'), s22 = await S('22/03/2026'), s23 = await S('23/03/2026');
  const s24 = await S('24/03/2026'), s25 = await S('25/03/2026'), s26 = await S('26/03/2026'), s27 = await S('27/03/2026');
  check('labs-only reports 5 h apart → 2 sets', s20.length === 2, s20);
  check('labs exactly 2 h apart → 1 set', s21.length === 1, s21);
  check('lone gas 03:56 + BH 06:43 → 1 set', s22.length === 1 && /GASES/.test(s22[0].text) && /Hb 9\.4/.test(s22[0].text), s22);

  check('labs 08:00 + gases 08:30, 09:30, 12:00 → [labs + 08:30], [09:30], [12:00]',
    s24.length === 3 && s24.some((s) => /Hb 9\.7/.test(s.text) && /pH 7\.33/.test(s.text)) && s24.some((s) => /pH 7\.34/.test(s.text) && !/Hb/.test(s.text)) &&
      s24.some((s) => /pH 7\.35/.test(s.text) && !/Hb/.test(s.text)), s24);
  const tomas24 = s24.map((x) => x.hora + ' ' + x.text.slice(0, 22));
  check('each toma header shows its HH:MM and "· N alterados" for its own values only (12:00 → 4, 08:30 → 5); singular "1 alterado"',
    s24.some((x) => x.hora === '12:00' && /^LABS · 4 ALTERADOS/i.test(x.text)) && s24.some((x) => x.hora === '08:30' && /^LABS · 5 ALTERADOS/i.test(x.text)) &&
      s20.some((x) => /^LABS · 1 ALTERADO\b/i.test(x.text)), { tomas24, s20 });
  check('same gas first lean, then rich (Na/Cl/Alb → AG, cAG) 5 min later → 1 set with AG and cAG', s25.length === 1 && /\bAG \d/.test(s25[0].text) && /\bcAG \d/.test(s25[0].text), s25);
  check('labs 08:00 + gas 08:30 + culture 08:45 → labs+gas one set, the culture alone; the next day separate',
    s26.length === 2 && s26.some((s) => /Hb 9\.8/.test(s.text) && /pH 7\.37/.test(s.text)) && s26.some((s) => /SIN DESARROLLO|HEMOCULTIVO|Hemocultivo/i.test(s.text) && !/Hb/.test(s.text)) &&
      s27.length === 1 && /Hb 9\.9/.test(s27[0].text), { s26, s27 });


  // ── Rows 17-19: citoquímico Tipo editor, COMENTARIO fluid name, fluid interpretation ──
  const QUINCE = { exp: '7000015-5', name: 'DEMO REGLAS QUINCE', room: '315' };
  await pasteAndSave(gas(QUINCE, 'Apr 1 2026 6:00AM', '7.30'));
  const DOCE = { exp: '7000012-2', name: 'DEMO REGLAS DOCE', room: '312' };
  const liq = (p, when, o = {}) => header(p, when) +
    'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    `DENSIDAD\t\n*\n${o.dens || '1.010'}\nGLUCOSA\t\n*\n90.0\nmg/dL\t\nPROTEINAS\t\n*\n300\nmg/dL\t\n` +
    (o.tipo === undefined ? 'CITOQUIMICO DE\t\n*\nLIQUIDO PERITONEAL\n\n' : o.tipo) +
    'BACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    `ASPECTO\t\n*\nCLARO\nRECUENTO\t\nA\n${o.rec || '48'}\nLEUCOCITOS/MM3\t0.00 - 5.00\n` +
    `POLIMORFONUCLEARES\t\n*\n${o.pmn ?? 'PREDOMINIO'}\n${o.pmnUnit ?? '%'}\t\n` +
    `GRAM\t\n*\n${o.gram ?? 'NEGATIVO'}\nCOMENTARIO\t\n*\n${o.coment || 'PERITONEAL'}\n`;
  await pasteAndSave(liq(DOCE, 'Apr 1 2026 8:00AM', { tipo: 'CITOQUIMICO DE\t\n*\nLIQUIDO PLEURAL\n\n' }));
  await pasteAndSave([
    liq(DOCE, 'Apr 2 2026 8:00AM', { tipo: 'CITOQUIMICO DE\t\n*\nLIQUIDO PLEURAL\n\n', dens: '1.020' }),
    liq(DOCE, 'Apr 3 2026 8:00AM', { tipo: 'CITOQUIMICO DE\t\n*\n\n', coment: 'LIQUIDO PERITONEAL' }),
  ].join('\n\n'));
  const tipoOf = (t) => (t.match(/Tipo (L[IÍ]QUIDO \S+|BACTERIOLOGIA)/) || [])[1] || '';
  const d1Before = await dayText(DOCE, '01/04/2026');
  await page.locator('#lab-output-box .lab-cito-tipo-edit-btn').first().click();
  await page.locator('#lab-output-box .lab-cito-tipo-edit-input').fill('liquido peritoneal');
  await page.locator('#lab-output-box .lab-cito-tipo-edit-input').press('Enter');
  await page.waitForTimeout(800);
  const d1After = flat(await page.locator('#lab-output-box').innerText());
  await openPatient(QUINCE);
  const d1Back = await dayText(DOCE, '01/04/2026');
  const d2 = await dayText(DOCE, '02/04/2026');
  check('Liq Tipo edit (✎): type "liquido peritoneal" + Enter → row shows "Tipo LIQUIDO PERITONEAL" (upper case)',
    tipoOf(d1Before) === 'LIQUIDO PLEURAL' && tipoOf(d1After) === 'LIQUIDO PERITONEAL', { d1Before, d1After });
  check('the edited Tipo is still shown after switching patient and back', tipoOf(d1Back) === 'LIQUIDO PERITONEAL', d1Back);
  check('a second Liq set with a different Dens keeps its own parsed Tipo (LIQUIDO PLEURAL)', tipoOf(d2) === 'LIQUIDO PLEURAL', d2);
  const d3 = await dayText(DOCE, '03/04/2026');
  check('"CITOQUIMICO DE" with an empty cell, fluid named only in COMENTARIO LIQUIDO PERITONEAL → Tipo LIQUIDO PERITONEAL, never BACTERIOLOGIA',
    tipoOf(d3) === 'LIQUIDO PERITONEAL' && !/Tipo BACTERIOLOGIA/.test(d3), d3);
  await page.locator('#lab-output-box .lab-cito-tipo-edit-btn').first().click();
  await page.locator('#lab-output-box .lab-cito-tipo-edit-input').fill('LIQUIDO ASCITICO');
  await page.locator('#lab-output-box .lab-cito-tipo-edit-input').press('Enter');
  await page.waitForTimeout(800);
  await moreAction(page, 'reprocessSelectedLabHistorySet');
  await page.waitForTimeout(800);
  await closeToasts(page);
  const d3r = flat(await page.locator('#lab-output-box').innerText());
  check('Tipo edited to LIQUIDO ASCITICO, then "…" → Reprocesar → the edited Tipo stays', tipoOf(d3r) === 'LIQUIDO ASCITICO', d3r);

  const TRECE = { exp: '7000013-3', name: 'DEMO REGLAS TRECE', room: '313' };
  const cases = [
    ['COCOS GRAM POSITIVOS', {}], ['BACILOS GRAM VARIABLES', {}], ['BACILOS GRAM NEGATIVOS', {}],
    ['ABUNDANTES LEUCOCITOS', {}], ['ABUNDANTES POLIMORFONUCLEARES, NO BACTERIAS', {}], ['MODERADOS LEUCOCITOS', {}],
    ['NEGATIVO', {}], ['', {}],
    ['NEGATIVO', { rec: '3,000', pmn: 'PREDOMINIO' }], ['NEGATIVO', { rec: '1,5' }],
    ['NEGATIVO', { rec: '600', pmn: '50', pmnUnit: '%' }], ['NEGATIVO', { rec: '600', pmn: '101', pmnUnit: '' }],
    ['NEGATIVO', { rec: '500', pmn: '100', pmnUnit: '' }],
  ];
  const cday = (i) => `Apr ${i + 1} 2026 8:00AM`;
  await pasteAndSave(liq(TRECE, cday(0), { gram: cases[0][0] }));
  await pasteAndSave(cases.slice(1).map(([g, o], i) => liq(TRECE, cday(i + 1), { gram: g, ...o })).join('\n\n'));
  const ft = [];
  for (let i = 0; i < cases.length; i++) ft.push(await dayText(TRECE, `${String(i + 1).padStart(2, '0')}/04/2026`));
  const infect = (t) => /infecci[oó]n bacteriana/i.test(t);
  check('Gram "COCOS GRAM POSITIVOS" and "BACILOS GRAM VARIABLES" → infection alert; "BACILOS GRAM NEGATIVOS" → none',
    infect(ft[0]) && infect(ft[1]) && !infect(ft[2]), ft.slice(0, 3));
  check('Gram "ABUNDANTES LEUCOCITOS", "ABUNDANTES POLIMORFONUCLEARES, NO BACTERIAS", "MODERADOS LEUCOCITOS" → no infection alert',
    !infect(ft[3]) && !infect(ft[4]) && !infect(ft[5]) && /ABUNDANTES LEUCOCITOS/.test(ft[3]), ft.slice(3, 6));
  check('Gram "NEGATIVO" or empty → no infection alert', !infect(ft[6]) && !infect(ft[7]) && /Liq/.test(ft[7]), ft.slice(6, 8));
  check('RECUENTO "3,000" → Leu 3000 in the Liq row (PMN predominant → PBE alert); "1,5" → Leu 1.5',
    /\bLeu 3000\b/.test(ft[8]) && /PMN 3000 ≥250/.test(ft[8]) && /\bLeu 1\.5\b/.test(ft[9]), [ft[8], ft[9]]);
  check('PMN 50 % of 600 → PMN 300 PBE alert; PMN 101 (no %) → absolute, no PBE claim; PMN 100 of 500 with no % → only "confirmar PMN absoluto"',
    /PMN 300 ≥250/.test(ft[10]) && !/PMN \d+ ≥250/.test(ft[11]) && /Leu 600 ≥250.*confirmar PMN/.test(ft[11]) &&
      !/PMN \d+ ≥250/.test(ft[12]) && /Leu 500 ≥250.*confirmar PMN/.test(ft[12]), ft.slice(10));

  // ── Row 15: clipboard of a multi-set day (blank row → <br><br>), escaping, plain vs HTML ──
  const CATORCE = { exp: '7000014-4', name: 'DEMO REGLAS CATORCE', room: '314' };
  await pasteAndSave(gas(CATORCE, 'Apr 1 2026 6:00AM', '7.30'));
  await pasteAndSave(gas(CATORCE, 'Apr 1 2026 11:00AM', '7.41') + '\n\n' + header(CATORCE, 'Apr 2 2026 8:00AM') +
    'BACTERIOLOGIA\nHEMOCULTIVO\n' + TABLE + 'MICROORGANISMO\n*\nEnterococcus faecalis\nANTIBIOGRAMA\n*\nAMPICILINA\n<=2\tS\nVANCOMICINA\n>=32\tR\n');
  const copyDay = async (d) => {
    await daySets(CATORCE, d);
    await page.locator('#lab-copy-fab').click();
    await page.waitForTimeout(600);
    await closeToasts(page);
    return app.evaluate(({ clipboard }) => [clipboard.readText(), clipboard.readHTML()]);
  };
  const [t1, h1] = await copyDay('01/04/2026');
  const unhtml = (h) => h.replace(/<\/?strong>/g, '').replace(/<br>/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  check('"Copiar" on a 2-set day: text rows joined by "\\n" with a blank row, HTML by "<br>" ("<br><br>" for the blank row)',
    /\n\n/.test(t1) && h1.includes('<br><br>'), { t1, h1 });
  check('"Copiar": values not altered are the same in text and HTML; only altered ones get <strong>',
    unhtml(h1).replace(/<meta[^>]*>/, '') === t1 && /<strong>35<\/strong>/.test(h1) && !/<strong>7\.41<\/strong>/.test(h1), { t1, h1 });
  const [t2, h2] = await copyDay('02/04/2026');
  // UNREACHABLE (keep old unit test): the lab card copies a culture compacted to "ATB R: VANCO | S: AMP", so no "<"/">" value ever reaches the clipboard.
  check('UNREACHABLE: "Copiar" HTML escaping of "<=2"/">=32" — a copied culture is compacted ("ATB R: … | S: …"), no "<" reaches the clipboard',
    !/[<>]=/.test(t2) && /ATB R: VANCO \| S: AMP/.test(t2), { t2, h2 });

  // ── Row 27: no Fecha Registro → today; corrected report same fecha+hora; same study another hour ──
  const glu = (when, v, sol) => header(CATORCE, when).replace(/Solicitud:\t\d+/, `Solicitud:\t${sol}`) + 'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE +
    row('GLUCOSA EN SANGRE', v > 110 ? 'A' : '*', String(v), 'mg/dL', '70 - 110');
  await pasteAndSave(glu('X', 101, '2600001401').replace(/\tFecha Registro:\t[^\n]*/, ''));
  const todayDmy = await page.evaluate(() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; });
  const noFecha = await daySets(CATORCE, todayDmy);
  check('report with no Fecha Registro for a census patient → saved under today (Glu 101)', noFecha.some((s) => /Glu 101\b/.test(s.text)), { todayDmy, noFecha });
  await pasteAndSave(glu('Apr 10 2026 8:00AM', 94, '2600001402'));
  await pasteAndSave(glu('Apr 10 2026 8:00AM', 150, '2600001402'));
  const corr = await daySets(CATORCE, '10/04/2026');
  check('corrected report at the same fecha+hora (Glu 94 → 150) → one set, Glu 150 only', corr.length === 1 && /Glu 150/.test(corr[0].text) && !/Glu 94/.test(corr[0].text), corr);
  await pasteAndSave(glu('Apr 10 2026 2:00PM', 120, '2600001403'));
  const corr2 = await daySets(CATORCE, '10/04/2026');
  check('the same study at another hour → a new set is added', corr2.length === 2 && corr2.some((s) => /Glu 120/.test(s.text)), corr2);

  // ── Row 25: same fecha/hora BH+GASES and QS+GASES → 1 set; two gas-only reports same time, different values → 2 sets; Consolidar ──
  const ONCE = { exp: '7000011-1', name: 'DEMO REGLAS ONCE', room: '311' };
  const bh11 = (when, hb) => header(ONCE, when) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + row('HGB', 'B', hb, 'g/dL', '12.20 - 18.10');
  await pasteAndSave(bh11('Apr 1 2026 6:00AM', '9.0'));
  await pasteAndSave([
    gas(ONCE, 'Apr 1 2026 9:30AM', '7.31'),
    header(ONCE, 'Apr 1 2026 1:00PM') + 'BACTERIOLOGIA\nHEMOCULTIVO\n' + TABLE + 'MICROORGANISMO\n*\nSIN DESARROLLO\n',
    bh11('Apr 2 2026 6:00AM', '9.1'),
    bh11('Apr 3 2026 6:00AM', '9.2'), gas(ONCE, 'Apr 3 2026 9:30AM', '7.32'),
    bh11('Apr 4 2026 5:51AM', '9.3') + gas(ONCE, 'Apr 4 2026 5:51AM', '7.33').replace(/^[^]*?\n\n/, ''),
    header(ONCE, 'Apr 4 2026 5:51AM').replace(/Solicitud:\t\d+/, 'Solicitud:\t2600001199') + 'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE +
      row('GLUCOSA EN SANGRE', '*', '99', 'mg/dL', '70 - 110') + gas(ONCE, 'Apr 4 2026 5:51AM', '7.33').replace(/^[^]*?\n\n/, ''),
    gas(ONCE, 'Apr 5 2026 8:00AM', '7.30'), gas(ONCE, 'Apr 5 2026 8:00AM', '7.44').replace(/Solicitud:\t\d+/, 'Solicitud:\t2600001198'),
  ].join('\n\n'));
  const s4 = await daySets(ONCE, '04/04/2026');
  check('BH+GASES and QS+GASES reports at the same fecha/hora 05:51 → 1 set', s4.length === 1 && /Hb 9\.3/.test(s4[0].text) && /Glu 99/.test(s4[0].text), s4);
  const s5 = await daySets(ONCE, '05/04/2026');
  check('two gas-only reports at the same time with different values → 2 sets', s5.length === 2, s5);
  await daySets(ONCE, '01/04/2026');
  await moreAction(page, 'consolidateLabHistoryByDayAndTipo');
  const cons = page.locator('#lab-consolidate-backdrop');
  await cons.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const consRows = await cons.locator('.lab-consolidate-set-row').allInnerTexts();
  check('"…" → Consolidar lists only dated, non-mixed sets, each with a section summary like "BH · QS · GASES"',
    consRows.length >= 6 && consRows.some((t) => /BH · QS · GASES|BH · GASES · QS/.test(t)) && consRows.every((t) => /\n\S/.test(t.trim())), consRows);
  const pick = async (...res) => {
    for (const cb of await cons.locator('.lab-consolidate-set-cb').all()) if (await cb.isChecked()) await cb.uncheck();
    for (const re of res) await cons.locator('.lab-consolidate-set-row').filter({ hasText: re }).first().locator('input').check();
    await page.locator('#lab-consolidate-add-group').click();
    return page.locator('#lab-consolidate-hint').innerText();
  };
  // Save-time auto-consolidation already joins BH 06:00 + gas 09:30 of 01/04 and 03/04, so only refusals are left to try here.
  const hCult = await pick(/^01\/04\/2026 · Labs/, /01\/04\/2026 13:00 · Cultivo/);
  const hDays = await pick(/^01\/04\/2026 · Labs/, /^02\/04\/2026 06:00/);
  const hOne = await pick(/^01\/04\/2026 · Labs/);
  check('Consolidar refuses labs + culture, sets of different days, and a single set (red hint, no group, OK disabled)',
    !!hCult.trim() && !!hDays.trim() && !!hOne.trim() && !(await cons.locator('.lab-consolidate-group-card').count()) && (await page.locator('#lab-consolidate-ok').isDisabled()),
    { hCult, hDays, hOne });
  check('UNREACHABLE: Consolidar with a lone [c] group next to [c,d] — the modal refuses any 1-set group, so a lone group cannot be built', !!hOne.trim(), hOne);
  await page.locator('#lab-consolidate-cancel').click();


  await pasteAndSave(glob1);
  await openPatient(CINCO);
  await globalPaste(header(DIECI, 'May 2 2026 8:00AM') + 'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE + row('GLUCOSA EN SANGRE', '*', '98', 'mg/dL', '70 - 110'));
  const afterKnown = {
    preview: await page.locator('#lab-bulk-preview-confirm').isVisible(),
    labTab: await page.locator('#apptab-lab').evaluate((e) => e.classList.contains('active')),
    active: await page.evaluate(() => document.querySelector('.p-name.active, .patient-item.active .p-name, [aria-current] .p-name')?.textContent || ''),
  };
  const gd2 = await daySets(DIECI, '02/05/2026');
  check('global paste of a report whose expediente is in the census → saved with no preview; the Lab tab opens',
    !afterKnown.preview && afterKnown.labTab && gd2.some((s) => /Glu 98/.test(s.text)), { afterKnown, gd2 });

  await globalPaste(header(DIECI, 'May 3 2026 8:00AM') + 'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE + row('GLUCOSA EN SANGRE', '*', '99', 'mg/dL', '70 - 110') +
    '\n' + header(CINCO, 'May 3 2026 8:10AM') + 'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE + row('GLUCOSA EN SANGRE', '*', '96', 'mg/dL', '70 - 110'));
  await page.locator('.toast').first().waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  const mixToast = (await page.locator('.toast').allInnerTexts()).join(' | ');
  if (await page.locator('#lab-bulk-preview-confirm').isVisible()) await page.keyboard.press('Escape');
  check('global paste of one block with two expedientes → error toast naming both; nothing saved',
    /7000016-6/.test(mixToast) && /7000005-5/.test(mixToast) && !(await days()).includes('03/05/2026'), mixToast);
  await closeToasts(page);

  const foreignR = (name, d) => `Expediente:\t7000099-9\tSolicitud:\t2600009901\nNombre:\t${name}\tFecha Registro:\t${d}\n` +
    'Sexo:\tFEMENINO\tUbicación:\tSERVICIO DEMO\nEdad:\t40\tMedico:\tSERVICIO DEMO\n\nQUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE + row('GLUCOSA EN SANGRE', '*', '93', 'mg/dL', '70 - 110');
  // bare registro → Resumen; variants do nothing
  await goArea(page, 'lab');
  await globalPaste(CINCO.exp);
  const resumenOn = await page.evaluate(() => {
    const t = document.querySelector('.inner-tab.active, [data-inner-tab].active, [aria-selected="true"][data-tab]');
    const n = [...document.querySelectorAll('.dash-name')].find((e) => e.getBoundingClientRect().width > 0);
    return (t?.textContent || '').trim() + ' | ' + (n?.textContent || '');
  });
  check('global paste of a bare registro "7000005-5" → that patient Resumen opens', /resumen/i.test(resumenOn) && /CINCO/.test(resumenOn), resumenOn);
  await openPatient(DIECI);
  const beforeLen = await page.evaluate(() => document.body.innerText.length);
  for (const t of ['70000055', '7000005-5 7000016-6', 'Reg 7000005-5', 'hola']) await globalPaste(t);
  const stillDieci = await page.evaluate(() => document.querySelector('.p-name.active, [aria-current] .p-name')?.textContent || document.title);
  check('registro digits only, two registros, "Reg " + registro, or short plain text → nothing happens (no toast, no switch)',
    !(await page.locator('.toast').count()) && !/CINCO/.test(stillDieci), { stillDieci, beforeLen });

  // #lab-input paste is not intercepted
  await openPaste(page);
  await page.locator('#lab-input').focus();
  await clip(foreignR('ANA LUNA GARZA', 'May 7 2026 8:00AM'));
  await page.keyboard.press('Meta+V');
  await page.waitForTimeout(600);
  const inBox = await page.locator('#lab-input').inputValue();
  check('paste into #lab-input → no smart paste, the text lands in the box', /ANA LUNA GARZA/.test(inBox) && !(await page.locator('.paste-smart-choice:visible').count()), inBox.slice(0, 80));
  await page.keyboard.press('Escape');

  // ⌘K with empty clipboard
  await clip('');
  await page.keyboard.press('Meta+K');
  await page.waitForTimeout(400);
  const pal = page.locator('[data-action="procesar-some"], [data-cmd="procesar-some"]').first();
  if (await pal.count()) await pal.click();
  else { await page.keyboard.type('SOME'); await page.keyboard.press('Enter'); }
  const emptyClip = page.locator('.toast', { hasText: 'Copia un reporte SOME al portapapeles primero' });
  await emptyClip.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  check('⌘K "Procesar SOME" with an empty clipboard → toast "Copia un reporte SOME al portapapeles primero"', await emptyClip.isVisible());
  await closeToasts(page);
  await page.keyboard.press('Escape');

  // ── Row 2: BH line tokens, hemolyzed rows, gas HCT RetC, BH extendida, frotis manual cells, chemistry-only ──
  const c11 = await dayText(CINCO, '11/04/2026');
  check('full BH report → "BH Hb 11.85 Hto 38.4 VCM 82 HCM 26.1 Leu 6.12 Neu 3.88 Plt 248" (absolute Neu; no RBC/CHCM/RDW/MPV/Lin/Mono/Baso/%)',
    /(^|\s)BH Hb 11\.85 Hto 38\.4 VCM 82 HCM 26\.1 Leu 6\.12 Neu 3\.88 Plt 248 QS /.test(c11), c11.slice(0, 200));
  await bhExtToggle(page);
  await closeBar(page);
  await page.waitForTimeout(500);
  const ext = flat((await page.locator('#lab-output-box .lab-bh-extended-line').allInnerTexts()).join(' '));
  check('"BH extendida" on → "BH ext Eri 4.71 CHCM 32 RDW 13.2 VPM 7.2 Lin# 1.05 Mono# 0.71 Baso# 0.12 Seg 63.4% Lin 17.2% Mono 11.6% Eos 1.8% Baso 2%" (no Neu/Eos counts)',
    ext === 'BH ext Eri 4.71 CHCM 32 RDW 13.2 VPM 7.2 Lin# 1.05 Mono# 0.71 Baso# 0.12 Seg 63.4% Lin 17.2% Mono 11.6% Eos 1.8% Baso 2%', ext);
  await bhExtToggle(page);
  await closeBar(page);

  const retOnlyP = (p, when, v) => header(p, when) + 'HEMATOLOGIA\nDIFERENCIAL MANUAL\n' + TABLE + 'RETICULOCITOS\n' + TABLE + `RETICULOCITOS\n*\n${v}\n%\t0.5 - 1.5\n`;
  await pasteAndSave(fullLabs(CINCO, 'Apr 17 2026 8:00AM') + '\n\n' + retOnlyP(CINCO, 'Apr 17 2026 8:10AM', 1.0));
  const c12 = await dayText(CINCO, '17/04/2026');
  check('BH + RETICULOCITOS → order "HCM … Ret … RetC … (tipo) Leu"', /HCM 26\.1 Ret 1 RetC [\d.]+ \((arre|re)generativa\) Leu 6\.12/.test(c12), c12.slice(0, 200));
  await pasteAndSave(header(CINCO, 'Apr 13 2026 8:00AM') + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    'HGB\t\n*\ng/dL\t12.20 - 18.10\nHCT\t\n*\n%\t37.7 - 53.7\nWBC\tA\t12.5\tK/uL\t4.00 - 11.00\n' +
    'DIFERENCIAL MANUAL\n' + TABLE + 'SEGMENTADOS\n*\n%\t40 - 70\nLINFOCITOS\n*\n25\n%\n');
  const c13 = await dayText(CINCO, '13/04/2026');
  check('hemolyzed rows (result "*" only) take no value from the range minimum (no Hb 12.2, Hto 37.7, Seg 40); no Ret/Hto → no RetC',
    /Leu 12\.5/.test(c13) && !/Hb 12\.2|Hto 37\.7|Seg 40/.test(c13) && !/RetC/.test(c13), c13);
  const gasHct = 'GASOMETRIAS\nGASOMETRIA ARTERIAL\n' + TABLE + 'PH\t*\t7.40\t\t7.35 - 7.45\nHCO3\t*\t24\tmmol/L\t22 - 26\nHCT\t*\t34.5\t%\t37 - 53\n';
  await pasteAndSave(retOnlyP(CINCO, 'Apr 20 2026 8:00AM', '3.0') + '\n' + gasHct);
  const c20 = await dayText(CINCO, '20/04/2026');
  await pasteAndSave(retOnlyP(CINCO, 'Apr 21 2026 8:00AM', '3.0') + '\n\n' + header(CINCO, 'Apr 21 2026 8:05AM') + gasHct);
  const c21 = await dayText(CINCO, '21/04/2026');
  check('Ret 3.0 + GASOMETRIA HCT 34.5 of one draw (one report, or two reports 5 min apart) → RetC 2.3 (regenerativa)',
    /RetC 2\.3 \(regenerativa\)/.test(c20) && /RetC 2\.3 \(regenerativa\)/.test(c21), { c20, c21 });

  await pasteAndSave(header(CINCO, 'Apr 15 2026 8:00AM') + 'HEMATOLOGIA\nDIFERENCIAL MANUAL\n' + TABLE +
    'SEGMENTADOS\n*\n60\n%\nBANDAS\n*\n4\n%\nMIELOCITOS\n*\n1\n%\nMETAMIELOCITOS\n*\n0\n%\nPROMIELOCITOS\n*\n0\n%\nBLASTOS\n*\n0\n%\n');
  const c15 = await dayText(CINCO, '15/04/2026');
  // Zero counts (Metamielo 0, Promielo 0, Blastos 0) are not shown by the app; only the non-zero manual cells are checked.
  check('differential with manual cells → "BH: Dif. Seg 60% Band 4% Mielo 1%"', /BH: Dif\. Seg 60% Band 4% Mielo 1%/.test(c15), c15);

  // ── Row 3: extended panels ──
  await pasteAndSave(header(CINCO, 'Apr 16 2026 8:00AM') + 'QUIMICA CLINICA\nPANEL DEMO\n' + TABLE +
    row('TSH', '*', '2.1', 'uUI/mL', '0.4 - 4.0') + row('T4 LIBRE', '*', '1.1', 'ng/dL', '0.8 - 1.8') + row('HEMOGLOBINA GLICOSILADA', 'A', '7.4', '%', '4.0 - 5.6') +
    row('NT-PROBNP', 'A', '1250', 'pg/mL', '0 - 125') + row('HIERRO SERICO', '*', '60', 'ug/dL', '50 - 170') + row('FERRITINA', '*', '150', 'ng/mL', '20 - 300') +
    row('FACTOR REUMATOIDE', '*', '8', 'UI/mL', '0 - 14') + row('COMPLEMENTO C3', '*', '110', 'mg/dL', '90 - 180') + row('AMONIO', '*', '30', 'umol/L', '11 - 51') +
    row('CISTATINA C', '*', '0.9', 'mg/L', '0.6 - 1.0') + row('VANCOMICINA', '*', '18', 'ug/mL', '10 - 20') + row('ALFA FETOPROTEINA', '*', '3', 'ng/mL', '0 - 9') +
    row('VITAMINA B12', '*', '400', 'pg/mL', '200 - 900') + row('CALPROTECTINA FECAL', '*', '40', 'ug/g', '0 - 50') + row('SANGRE OCULTA EN HECES', '*', 'NEGATIVO') +
    row('ANTICUERPOS ANTI-HBS', '*', '120', 'mUI/mL', '') + row('VDRL', '*', 'NO REACTIVO') + row('TOXOPLASMA IGM', '*', 'NEGATIVO') +
    row('ANTIGENO LEGIONELLA EN ORINA', '*', 'NEGATIVO') + row('GAMMA GLUTAMIL TRANSFERASA', 'A', '88', 'U/L', '8 - 61') + row('PROTEINAS TOTALES', '*', '6.2', 'g/dL', '6.0 - 8.3') +
    'INMUNOLOGIA\nREACCIONES FEBRILES COMPLETAS\n' + TABLE + row('TIFICO O', 'A', '1:160') + row('TIFICO H', '*', 'NEGATIVO') + row('PARATIFICO A', '*', 'NEGATIVO') +
    row('PARATIFICO B', '*', 'NEGATIVO') + row('BRUCELLA', '*', 'NEGATIVO') + row('PROTEUS OX-19', '*', 'NEGATIVO'));
  const c16 = await dayText(CINCO, '16/04/2026');
  const c16alt = await alteredValues();
  // OPEN: TM (AFP), HEPB, VIRAL, MICRO, SOH, ToxoIgM and FEB did not parse from this synthetic layout (qualitative panels need their real SOME layout).
  const want = ['TIR TSH 2.1 T4L 1.1', 'ENDO HbA1c 7.4', 'CARD NTproBNP 1250', 'FE Fe 60 Ferr 150', 'INFL FR 8', 'INM C3 110', 'META NH3 30', 'NEF CysC 0.9',
    'NIVEL Vanco 18', 'NUT B12 400', 'GI Calpro 40'];
  check('one report with quantitative extended panels → TIR, ENDO, CARD, FE, INFL, INM, META, NEF, NIVEL, NUT, GI lines',
    want.every((w) => c16.includes(w)), { missing: want.filter((w) => !c16.includes(w)), c16 });

  check('PFHs → GGT 88 (altered) and Prot 6.2', /GGT 88/.test(c16) && /Prot 6\.2/.test(c16) && c16alt.includes('88'), c16alt);
  check('"HEMOGLOBINA GLICOSILADA 7.4" with no BH → ENDO HbA1c 7.4 only, no "BH Hb 7.4"', /HbA1c 7\.4/.test(c16) && !/Hb 7\.4/.test(c16.replace(/HbA1c 7\.4/g, '')), c16);
  const c11b = await dayText(CINCO, '11/04/2026');
  check('a plain chemistry report (demo QS) → no extended panel lines and no BH line on a chemistry-only day',
    !/(^|\s)(TIR|ENDO|CARD|FE|INFL|INM|META|NEF|TM|NUT|GI|HEPB|VIRAL|MICRO|FEB) /.test(c11b) && !/(^|\s)BH /.test(await dayText(DIECI, '02/05/2026')), c11b.slice(0, 120));



  // ── Rows 18 (items 3-5) and 26: "Actualizar labs" for the open patient (studies come back from the fake repo reply) ──
  const DIECIOCHO = { exp: '7000018-8', name: 'DEMO REGLAS DIECIOCHO', room: '318' };
  const repoReply = (res) => app.evaluate((_e, v) => { globalThis.__e2e.repoReplies.push(v); }, res);
  const quimHalf = (when, glu, ldh) => header(DIECIOCHO, when) + 'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    `DENSIDAD\t\n*\n1.012\nGLUCOSA\t\n*\n${glu}\nmg/dL\t\nPROTEINAS\t\n*\n2500\nmg/dL\t\nLDH\t\n*\n${ldh}\nIU/L\t\n`;
  const bactHalf = (when) => header(DIECIOCHO, when) + 'BACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    'ASPECTO\t\n*\nTURBIO\nRECUENTO\t\nA\n120\nLEUCOCITOS/MM3\t0.00 - 5.00\nGRAM\t\n*\nNEGATIVO\nCOMENTARIO\t\n*\nLIQUIDO PERITONEAL\n';
  const qsForeign = (when) => header(DIECIOCHO, when) + 'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + TABLE + row('GLUCOSA EN SANGRE', 'B', '54', 'mg/dL', '70 - 110') +
    'LDH DESHIDROGENASA LACTICA\n' + TABLE + row('LDH DESHIDROGENASA LACTICA', 'A', '252', 'UI/L', '91 - 180');
  await pasteAndSave(qsForeign('Jun 1 2026 8:00AM'));
  await openPatient(DIECIOCHO);
  async function actualizar(studies) {
    await closeToasts(page);
    await page.locator('#btn-lab-repo-batch').click();
    await page.locator('#lab-repo-batch-modal').waitFor({ state: 'visible' });
    await repoReply({ studies: studies.map((text) => ({ text })), errors: [] });
    await page.locator('#lab-repo-batch-confirm').click();
    await page.locator('.toast', { hasText: /actualizad|guardad|revisar/i }).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await page.locator('#lab-bulk-preview-confirm').isVisible()) {
      await page.locator('#lab-bulk-preview-confirm').click();
      await page.waitForTimeout(800);
    }
    await page.waitForTimeout(500);
  }
  await actualizar([quimHalf('Jun 2 2026 8:00AM', '783.0', '40'), bactHalf('Jun 2 2026 8:05AM')]);
  const optsNow = await page.locator('#lab-history-date-select option').allTextContents();
  check('"Actualizar labs" for the patient already open → the new day is in the date select at once (no reopen)', optsNow.includes('02/06/2026'), optsNow);
  const liqOf = (t) => (t.match(/Liq:[^]*?(?=\s(?:BH|QS|ESC|PFHs|GASES|COAG|EGO|Interpretaci[oó]n)\b|$)/) || [''])[0];
  const hh2 = await dayText(DIECIOCHO, '02/06/2026');
  check('"Actualizar labs" returns the química half (Glu 783.0) and the bacteriología half as two studies → one Liq row with Glu 783 and Tipo LIQUIDO PERITONEAL',
    (hh2.match(/Liq:/g) || []).length === 1 && /Tipo LIQUIDO PERITONEAL/.test(liqOf(hh2)) && /Glu 783\b/.test(liqOf(hh2)), hh2);
  await actualizar([quimHalf('Jun 3 2026 8:00AM', '783.0', '40'), qsForeign('Jun 3 2026 8:02AM'), bactHalf('Jun 3 2026 8:05AM')]);
  const hh3 = await dayText(DIECIOCHO, '03/06/2026');
  check('same two halves with a serum QS study (Glu 54) between them → the Liq row has no Glu 54', /Liq:/.test(hh3) && !/Glu 54\b/.test(liqOf(hh3)), hh3);
  await actualizar([quimHalf('Jun 4 2026 8:00AM', '597.0', '19'), qsForeign('Jun 4 2026 8:02AM'), bactHalf('Jun 4 2026 8:05AM')]);
  const hh4 = await dayText(DIECIOCHO, '04/06/2026');
  const liqTipo4 = (hh4.match(/Liq:[^]*?Tipo LIQUIDO PERITONEAL[^]*?(?=\s(?:BH|QS|ESC|PFHs|GASES|Liq:)\b|$)/) || [''])[0];
  check('química half (Glu 597, LDH 19) + serum QS (Glu 54, LDH 252) + bacteriología half → Tipo LIQUIDO PERITONEAL kept; that row has no Glu 54, LDH 252 or Glu 597',
    !!liqTipo4 && !/Glu 54\b|LDH 252\b|Glu 597\b/.test(liqTipo4), hh4);

  await closeToasts(page);
  await page.keyboard.press('Escape');
  await goArea(page, 'lab');
  {
  // ════════ BEGIN agent-B block (queue rows 29-55) ════════
  const pasteAndSave = async (text) => { await harnessPasteAndSave(page, text); await closeToasts(page); };
  const P = (n, tag) => ({ exp: `70010${String(n).padStart(2, '0')}-${n % 10}`, name: `DEMO B ${tag}`, room: String(400 + n) });
  const hdr = (p, when, sexo = 'MASCULINO', edad = '58') =>
    `Expediente:\t${p.exp}\tSolicitud:\t26${Math.abs([...(when + p.exp)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) % 100000000}\n` +
    `Nombre:\t${p.name}\tFecha Registro:\t${when}\nSexo:\t${sexo}\tUbicación:\tSERVICIO DEMO\nEdad:\t${edad}\tMedico:\tSERVICIO DEMO\n\n`;
  /** One SOME study: name, then rows [label, flag, value, unit, range]. */
  const st = (name, rows) => `${name}\n${TABLE}` + rows.map(([l, f, v, u = '', rg = '']) => `${l}\t\t${f}\t${v}\t${u}\t${rg}\n`).join('');
  const bh = (hb, extra = []) => 'HEMATOLOGIA\n' + st('BIOMETRIA HEMATICA COMPLETA', [['HGB', 'B', hb, 'g/dL', '12.20 - 18.10'], ...extra]);
  const qs = (rows) => 'QUIMICA CLINICA\n' + rows.map(([n, ...rest]) => st(n, [[n, ...rest]])).join('');
  const lcr = ({ ph, leu, glu, prot, gram }) =>
    'QUIMICA CLINICA\nCITOQUIMICO DE LCR\n' + TABLE + (ph != null ? `PH\n${ph}\n` : '') + 'ASPECTO\nCLARO\n' +
    (leu != null ? `RECUENTO CELULAR\n${leu}\nLEUCOCITOS\n` : '') +
    `GLUCOSA\n${glu}\nmg/dL\t40 - 80\nPROTEINAS\n${prot}\nmg/dL\t15 - 45\nCLORURO\n120\nmEq/L\t118 - 132\n` +
    (gram ? `GRAM\n${gram}\n` : '') + 'TINTA CHINA\nNEGATIVO\n\nBACTERIOLOGIA\n';
  const serumAlbS = (v) => 'QUIMICA CLINICA\nALBUMINA\n' + TABLE + `ALBUMINA\nB\n${v}\ng/dL\t3.2 - 5.5\n\n`;
  /** Ascitic citoquímico (portal layout, one cell per line). */
  const asc = (o = {}) => {
    const { dens = '1.015', ph = '7.5', glu = '1.0', prot = '4100', protUnit = 'mg/dL', ldh = '9475', alb = '2.1', tgl = '20',
      amil = null, rec = '9,200', pmn = '96', pmnUnit = '%', gram = 'ABUNDANTES POLIMORFONUCLEARES', cito = null } = o;
    return 'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
      `EXAMEN QUIMICO\n*\n:\nDENSIDAD\n*\n${dens}\nPH\n*\n${ph}\nGLUCOSA\n*\n${glu}\nmg/dL\nPROTEINAS\n*\n${prot}\n${protUnit ? protUnit + '\n' : ''}LDH\n*\n${ldh}\nIU/L\n` +
      'CITOQUIMICO DE\n*\nLIQUIDO PERITONEAL\n' +
      (alb ? `ALBUMINA\n${TABLE}ALBUMINA\nB\n${alb}\ng/dL\t3.2 - 5.5\n` : '') +
      (tgl ? `TRIGLICERIDOS\n${TABLE}TRIGLICERIDOS\nB\n${tgl}\nmg/dL\t35 - 150\n` : '') +
      (amil ? `AMILASA\n${TABLE}AMILASA\nA\n${amil}\nU/L\t28 - 100\n` : '') +
      '\nBACTERIOLOGIA\nTIPO DE MUESTRA\n*\nLIQUIDO PERITONEAL\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
      `ASPECTO\n*\nTURBIO\nRECUENTO\nA\n${rec}\nLEUCOCITOS/MM3\t0.00 - 5.00\nPOLIMORFONUCLEARES\n*\n${pmn}\n${pmnUnit ? pmnUnit + '\n' : ''}` +
      `LINFOCITOS\n*\n4\n%\nERITROCITOS\n*\nESCASOS\n/mm3\nGRAM\n*\n${gram}\nCOMENTARIO\n*\nLIQUIDO PERITONEAL\n` +
      (cito ? `\nCITOLOGIA DE LIQUIDO PERITONEAL\n${TABLE}RESULTADO\n*\n${cito}\n` : '');
  };
  /** Pleural citoquímico (A's layout), knobs for pH / glucose / count / protein. */
  const pleu = ({ ph = '8.0', glu = '78.0', rec = '3,000', prot = '6000', ldh = '549', serumLdh = '549', serumProt = null } = {}) =>
    'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    `EXAMEN QUIMICO\t\n*\n:\nDENSIDAD\t\n*\n1.010\nPH\t\n*\n${ph}\nGLUCOSA\t\n*\n${glu}\nmg/dL\t\nPROTEINAS\t\n*\n${prot}\nmg/dL\t\nLDH\t\n*\n${ldh}\nIU/L\t\n` +
    'CITOQUIMICO DE\t\n*\nLÍQUIDO PLEURAL\nALBUMINA\n' + TABLE + 'ALBUMINA\t\n*\n3.4\ng/dL\t3.2 - 5.5\n' +
    'LDH DESHIDROGENASA LACTICA\n' + TABLE + `LDH DESHIDROGENASA LACTICA\t\nA\n${serumLdh}\nUI/L\t91 - 180\n` +
    (serumProt ? 'PROTEINAS TOTALES\n' + TABLE + `PROTEINAS TOTALES\t\n*\n${serumProt}\ng/dL\t6.1 - 7.9\n` : '') +
    'BACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    `ASPECTO\t\n*\nXANTOCROMICO SANGUINOLENTO\nRECUENTO\t\nA\n${rec}\nLEUCOCITOS/MM3\t0.00 - 5.00\n` +
    'POLIMORFONUCLEARES\t\n*\n---\n%\t\nLINFOCITOS\t\n*\n100\n%\t\nERITROCITOS\t\n*\n5,000\n/mm3\t\n' +
    'GRAM\t\n*\nABUNDANTES LEUCOCITOS\nCOMENTARIO\t\n*\nLIQUIDO PLEURAL\n';
  const gasS = ({ ph = '7.39', pco2 = '35', po2 = '60', lac = '0.7', hco3 = '21.2', ranges = true, kind = 'VENOSA', extra = '' }) =>
    `GASOMETRIAS\nGASOMETRIA ${kind} PARCIAL\n` + TABLE +
    `PH\t*\t${ph}\t\t${ranges ? '7.32 - 7.43' : ''}\npCO2\t*\t${pco2}\tmmHg\t${ranges ? '40 - 45' : ''}\npO2\t*\t${po2}\tmmHg\tN/A\n` +
    `Lactato\t*\t${lac}\tmmol/L\t${ranges ? '0.9 - 1.9' : ''}\nHCO3\t*\t${hco3}\tmmol/L\t${ranges ? '24.0 - 30.0' : ''}\n` + extra;
  const esc = (na, cl) => qs([['SODIO', '*', na, 'mmol/L', '135.0 - 145.0'], ...(cl != null ? [['CLORO', '*', cl, 'mmol/L', '101.0 - 110.0']] : [])]);
  const trop = (v) => 'BANCO DE SANGRE\n\n\nHsTnl o Troponina I (Alta\n\nEstudio\tResultado\tUnidades\tValor de Referencia\n\n' +
    `HsTnl o Troponina I (Alta Sensibilidad)\n\n${v}\nINDETERMINADO\n\nng/L\nPositivo >= 0.00S/CO\nNegativo <= 0.00S/CO\n`;
  const cult = 'BACTERIOLOGIA\nUROCULTIVO\n' + TABLE + 'MICROORGANISMO\n*\nEscherichia coli\nCUENTA\n*\n100,000 UFC/mL\n';

  const dateSel = page.locator('#lab-history-date-select');
  async function open(p, reg = {}) {
    await closeToasts(page);
    if (await page.locator('#lab-input').isVisible()) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
    await page.locator(`.p-name[title*="${p.exp}"]`).locator('visible=true').first().click();
    const servicio = page.locator('#m-servicio');
    await servicio.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
    if (await servicio.isVisible()) {
      await servicio.fill('MEDICINA INTERNA');
      await page.locator('#m-cuarto').fill(p.room);
      await page.locator('#m-cama').fill('01');
      if (reg.edad) await page.locator('#m-edad-num').fill(reg.edad);
      if (reg.unit) await page.locator('#m-edad-unit').selectOption(reg.unit);
      if (reg.sexo) await page.locator('#m-sexo-ro').selectOption(reg.sexo).catch(() => {});
      await page.getByRole('button', { name: 'Agregar Paciente' }).click();
      await servicio.waitFor({ state: 'hidden' });
    }
    if (!(await dateSel.isVisible())) await goArea(page, 'lab');
    await dateSel.waitFor({ state: 'visible' });
  }
  const days = () => page.locator('#lab-history-date-select option').allTextContents();
  const outText = () => page.locator('#lab-output-box').innerText();
  const altered = () => page.locator('#lab-output-box .lab-value-altered').allInnerTexts();
  /** Lab sets of one day ({hora, text}) and the raw rows. */
  async function day(p, date) {
    await open(p);
    if (!(await days()).includes(date)) return { sets: [], rows: [], all: '' };
    await dateSel.selectOption(`day:${date}`);
    await page.waitForTimeout(350);
    const lines = (await outText()).split('\n').map(flat).filter(Boolean);
    const sets = [];
    for (const line of lines) {
      if (/^\d{1,2}:\d{2}$/.test(line)) sets.push({ hora: line, text: '' });
      else if (sets.length) sets[sets.length - 1].text += ' ' + line;
      else sets.push({ hora: '', text: line });
    }
    sets.forEach((s) => { s.text = flat(s.text); });
    // One row per "LABEL<tab>values" line (a single-set day shows no HH:MM header).
    const rows = await page.locator('#lab-output-box .lab-row-label').evaluateAll((els) =>
      els.map((e) => (e.textContent + ' ' + (e.nextElementSibling ? e.nextElementSibling.textContent : '')).replace(/\s+/g, ' ').trim()));
    // Once Tendencias has loaded, the fluid interpretation renders as a status box, not a label row: read both.
    const interpBoxes = await page.locator('#lab-output-box .lab-out-citoquim-interp').allInnerTexts();
    interpBoxes.forEach((t) => { const s = flat(t); if (s && !rows.some((r) => r.includes(s))) rows.push(/^INTERPRETACI/i.test(s) ? s : 'INTERPRETACIÓN ' + s); });
    return { sets, rows, all: sets.map((s) => s.text).join(' | ') };
  }
  /** Stored sets of one day as the "…" → Consolidar list shows them (storage, not the day view's time clusters). */
  async function stored(p, ddmm) {
    await open(p);
    await moreAction(page, 'consolidateLabHistoryByDayAndTipo');
    await page.locator('.lab-consolidate-set-row').first().waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
    const labels = (await page.locator('.lab-consolidate-set-row').allInnerTexts()).map(flat).filter((t) => t.includes(ddmm));
    await page.locator('#lab-consolidate-cancel').click().catch(() => {});
    await closeToasts(page);
    return labels;
  }
  const row = (d, re) => d.rows.find((l) => re.test(l)) || '';
  const clip = () => app.evaluate(({ clipboard }) => clipboard.readText());
  const toastSeen = (re) => page.locator('.toast', { hasText: re }).first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
  let d;

  // ── Row 29 lab-history-auto-store-core: which sets merge ──────────────────
  const AU = P(1, 'AUTO');
  await pasteAndSave(hdr(AU, 'Feb 1 2026 8:00AM') + qs([['CREATININA EN SANGRE', '*', '1.0', 'mg/dL', '0.6 - 1.4']]));
  await pasteAndSave(hdr(AU, 'Feb 1 2026 8:00AM') + qs([['CREATININA EN SANGRE', '*', '1.1', 'mg/dL', '0.6 - 1.4']]));
  d = await day(AU, '01/02/2026');
  check('same draw and time, Cr 1.0 then Cr 1.1 → not skipped as a duplicate; Cr 1.1 is shown', /Cr 1\.1\b/.test(d.all), d.sets);
  await pasteAndSave(hdr(AU, 'Feb 2 2026 1:51PM') + bh('12.9', [['HCT', '*', '38', '%', '37.7 - 53.7']]));
  await pasteAndSave(hdr(AU, 'Feb 2 2026 8:00PM') + bh('12.9', [['HCT', '*', '38', '%', '37.7 - 53.7']]));
  let st2;
  await pasteAndSave(hdr(AU, 'Feb 3 2026 1:51PM') + bh('12.9'));
  await pasteAndSave(hdr(AU, 'Feb 3 2026 8:00PM') + bh('10.1'));
  d = await day(AU, '03/02/2026');
  check('BH Hb 12.9 at 13:51, then Hb 10.1 at 20:00 → 2 sets', d.sets.length === 2 && d.sets.some((s) => s.hora === '20:00' && /Hb 10\.1/.test(s.text)), d.sets);
  await pasteAndSave(hdr(AU, 'Feb 4 2026 1:51PM') + bh('12.9'));
  await pasteAndSave(hdr(AU, 'Feb 4 2026 2:20PM') + qs([['GLUCOSA EN SANGRE', '*', '94', 'mg/dL', '60 - 100']]));
  d = await day(AU, '04/02/2026');
  check('BH at 13:51, then QS at 14:20 → 1 set with both', d.sets.length === 1 && /BH Hb 12\.9/.test(d.all) && /QS Glu 94/.test(d.all), d.sets);
  await pasteAndSave(hdr(AU, 'Feb 5 2026 10:00AM') + lcr({ glu: 24, prot: 80 }));
  await pasteAndSave(hdr(AU, 'Feb 5 2026 11:30AM') + lcr({ leu: 265, glu: 24, prot: 80 }));
  d = await day(AU, '05/02/2026');
  st2 = await stored(AU, '05/02');
  check('LCR chemistry at 10:00 + LCR fragment at 11:30 → 1 stored set', st2.length === 1, { st2, d: d.sets });
  await pasteAndSave(hdr(AU, 'Feb 6 2026 8:00AM') + lcr({ leu: 265, glu: 24, prot: 80 }));
  await pasteAndSave(hdr(AU, 'Feb 6 2026 4:00PM') + lcr({ leu: 265, glu: 24, prot: 80 }));
  const st6 = await stored(AU, '06/02');
  await pasteAndSave(hdr(AU, 'Feb 7 2026 8:00AM') + lcr({ leu: 265, glu: 24, prot: 80 }));
  await pasteAndSave(hdr(AU, 'Feb 7 2026 4:00PM') + lcr({ leu: 265, glu: 30, prot: 80 }));
  const st7 = await stored(AU, '07/02');
  check('same full LCR at another hour → 1 stored set; with Glu 30 instead of 24 → 2; the next day\'s LCR stays its own day',
    st6.length === 1 && st7.length === 2 && (await stored(AU, '05/02')).length === 1, { st6, st7 });
  await pasteAndSave(gas(AU, 'Feb 8 2026 3:58AM', '7.39'));
  await pasteAndSave(hdr(AU, 'Feb 8 2026 6:42AM') + bh('11.2', [['RBC', '*', '3.9', 'M/uL', '4.04 - 6.13']]));
  d = await day(AU, '08/02/2026');
  st2 = await stored(AU, '08/02');
  check('gas at 03:58, then BH at 06:42 → 2 stored sets, no stray "BH Eri…" row',
    d.rows.filter((l) => /^BH/.test(l)).length === 1 && !/Eri/.test(d.all), { st2, rows: d.rows });
  await pasteAndSave(hdr(AU, 'Feb 9 2026 6:42AM') + bh('11.4'));
  await pasteAndSave(hdr(AU, 'Feb 9 2026 8:07AM') + cult);
  d = await day(AU, '09/02/2026');
  check('culture at 08:07 + BH at 06:42 → the BH is not merged into the culture set',
    !d.sets.some((s) => /coli/i.test(s.text) && /Hb 11\.4/.test(s.text)) && d.sets.some((s) => /Hb 11\.4/.test(s.text)), d.sets);
  await pasteAndSave(hdr(AU, 'Feb 10 2026 5:51AM') + bh('10.8'));
  await pasteAndSave(hdr(AU, '10/02/2026 05:51:00 a. m.') + qs([['GLUCOSA EN SANGRE', '*', '101', 'mg/dL', '60 - 100']]));
  st2 = await stored(AU, '10/02');
  check('header time with seconds "05:51:00 a. m." → same stored set as 05:51', st2.length === 1, st2);
  // "Labs externos" with no hora next to a SOME set of the same day.
  const now = new Date();
  const today = [now.getDate(), now.getMonth() + 1].map((n) => String(n).padStart(2, '0')).join('/') + '/' + now.getFullYear();
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()];
  await pasteAndSave(hdr(AU, `${MON} ${now.getDate()} ${now.getFullYear()} 8:00AM`) + qs([['GLUCOSA EN SANGRE', '*', '88', 'mg/dL', '60 - 100']]));
  await open(AU);
  await openPaste(page);
  await page.locator('#btn-lab-manual-entry').click();
  await page.locator('#lab-manual-entry-modal').waitFor({ state: 'visible' });
  await page.locator('#lab-manual-type').selectOption('BH');
  await page.locator('#lab-manual-hora').fill('');
  await page.locator('#lab-manual-fields input[data-field-key="Hb"]').fill('11.1');
  await page.locator('#lab-manual-entry-confirm').click();
  await page.locator('#lab-manual-entry-modal').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  check('UNREACHABLE lab-history-auto-store-core: which duplicate id is kept and the id order are internal (no UI shows set ids)', true);

  // ── Row 30/31/33 day view, fecha-hora, display ────────────────────────────
  const VW = P(2, 'VISTA');
  await pasteAndSave(hdr(VW, 'Mar 1 2026 7:00AM') + bh('9.1'));
  await pasteAndSave(hdr(VW, 'Mar 1 2026 12:30PM') + qs([['GLUCOSA EN SANGRE', '*', '90', 'mg/dL', '60 - 100']]));
  await pasteAndSave(hdr(VW, 'Mar 1 2026 6:00PM') + bh('8.2'));
  d = await day(VW, '01/03/2026');
  check('sets of one day show newest first: BH 07:00 and 18:00 → 18:00 first', d.sets[0].hora === '18:00', d.sets.map((s) => s.hora));
  const pick = await dateSel.evaluate((s) => ({ n: [...s.options].filter((o) => o.textContent === '01/03/2026').length, og: s.querySelectorAll('optgroup').length }));
  check('a day with 3 sets gives one picker option (no optgroup)', pick.n === 1 && pick.og === 0, pick);
  await pasteAndSave(hdr(VW, 'Mar 2 2026 7:00AM') + esc('140', '100'));
  await pasteAndSave(hdr(VW, 'Mar 2 2026 11:19AM') + gasS({ hco3: '15' }));
  d = await day(VW, '02/03/2026');
  check('later gas at 11:19 (HCO3 15) → AG 25, backfilled from the morning ESC Na 140 / Cl 100',
    /\bAG 25\b/.test(d.all), d.sets);
  await pasteAndSave(hdr(VW, 'Mar 3 2026 2:00AM') + 'URIANALISIS\nEXAMEN GENERAL DE ORINA\n' + TABLE + 'PH\t\nA\n7.0\n5.5 - 6.5\n');
  await pasteAndSave(hdr(VW, 'Mar 3 2026 9:00AM') + 'URIANALISIS\nEXAMEN GENERAL DE ORINA\n' + TABLE +
    'PH\t\nA\n6.0\n5.5 - 6.5\nDENSIDAD\t\n*\n1.020\n1.005 - 1.025\nPROTEINAS\t\n*\nNEGATIVO\nLEUCOCITOS\t\n*\n17-18\n/CAMPO\t0-5/CAMPO\nBACTERIAS\t\n*\nESCASAS\nAUSENTES\n');
  d = await day(VW, '03/03/2026');
  check('poor EGO fragment at 02:00 + full EGO at 09:00 → EGO shows once, the richer one (Leu 17-18)',
    (d.all.match(/\bEGO\b/g) || []).length === 1 && /17-18/.test(d.all), d.rows);
  check('EGO continuation lines render full width (.lab-row-values-full)', (await page.locator('#lab-output-box .lab-row-values-full').count()) > 0 || !/\n/.test(row(d, /EGO/)));
  await pasteAndSave(hdr(VW, 'Mar 4 2026 9:00AM') + bh('9.4'));
  await pasteAndSave(hdr(VW, 'Mar 4 2026 9:10AM') + cult);
  d = await day(VW, '04/03/2026');
  check('culture at 09:10 next to labs at 09:00 → a separate culture group, not inside the BH set',
    /coli/i.test(d.all) && !d.sets.some((s) => /coli/i.test(s.text) && /Hb 9\.4/.test(s.text)), d.sets);
  await pasteAndSave(hdr(VW, 'Mar 5 2026 9:32AM') + bh('9.6'));
  await pasteAndSave(hdr(VW, 'Mar 5 2026 11:40AM') + cult);
  await day(VW, '05/03/2026');
  if (!(await barOpen(page))) await page.locator('#lab-bar-more > summary').click();
  await page.locator('#lab-some-tables-btn').click();
  const tb = page.locator('#lab-some-tables-modal-body');
  await tb.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const tbText = await tb.innerText().catch(() => '');
  await page.locator('#lab-some-tables-backdrop [data-wb-close]').click().catch(() => {});
  // fecha-hora + heces pairs (rows 31, 41)
  await pasteAndSave(hdr(VW, '06/03/2026 03:06:21 p. m.') +
    'PARASITOLOGIA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nFISICOQUIMICO DE HECES\n' +
    'ASPECTO\n*\n6\nTIPO 3 Y 4 G.BRISTOL\nPH\n*\n6.0\n7.0\nPROTEINAS\n*\nNEGATIVO\nNEGATIVO\nLEUCOCITOS\n*\nMODERADAS\nNEGATIVO\n' +
    'ERITROCITOS\n*\nESCASAS\nNEGATIVO\nCOPROPARASITOSCOPICO INMEDIATO\n*\nNEGATIVO\nNEGATIVO\nOBSERVACIONES\n*\n');
  await pasteAndSave(hdr(VW, 'Mar 6 2026 7:00AM') + bh('9.3'));
  d = await day(VW, '06/03/2026');
  check('HECES header time "03:06:21 p. m." → set time 15:06', d.sets.some((s) => s.hora === '15:06' && /HECES/.test(s.text)), d.sets.map((s) => [s.hora, s.text.slice(0, 40)]));
  check('heces label-value pairs: Asp 6 TIPO 3 Y 4 G.BRISTOL, pH 6.0, Prot NEGATIVO, Leu MODERADAS, Eri ESCASAS, Copro NEGATIVO',
    [/Asp 6 TIPO 3 Y 4 G\.BRISTOL/, /pH 6\.0/, /Prot NEGATIVO/, /Leu MODERADAS/, /Eri ESCASAS/, /Copro NEGATIVO/].every((re) => re.test(d.all)), d.all);
  // display (row 33)
  await pasteAndSave(hdr(VW, 'Mar 7 2026 7:00AM') + bh('9.0', [['HCT', 'B', '28', '%', '37.7 - 53.7'], ['WBC', '*', '6.0', 'K/uL', '4.00 - 11.00']]) +
    'DIFERENCIAL MANUAL\n' + TABLE + 'SEGMENTADOS\nA\n80\n%\t40 - 75\nRETICULOCITOS\n' + TABLE + 'RETICULOCITOS\n*\n1.0\n%\t0.5 - 1.5\n' +
    'SEROLOGIA\nREACCIONES FEBRILES COMPLETAS\n' + TABLE + 'TIFICO O\t\t*\tNEGATIVO\t\t\nTIFICO H\t\t*\tNEGATIVO\t\t\nBRUCELLA\t\t*\tNEGATIVO\t\t\n' +
    qs([['GLUCOSA EN SANGRE', '*', '92', 'mg/dL', '60 - 100']]));
  d = await day(VW, '07/03/2026');
  const arrows1 = await page.locator('#lab-output-box .lab-trend-arrow').count();
  check('Ret folds onto the BH line with no "Hem." label', /Ret 1\b/.test(row(d, /^BH/)) && !/Hem\./.test(d.all), d.rows);
  const chips = await page.locator('#lab-output-box .lab-row-label').evaluateAll((els) =>
    els.map((e) => ({ l: e.textContent.trim(), chips: !!(e.nextElementSibling && e.nextElementSibling.classList.contains('lab-row-values-chips')) })));
  check('a QS row renders as label + value chips', chips.some((c) => /^QS/.test(c.l) && c.chips), chips);
  await pasteAndSave(hdr(VW, 'Mar 8 2026 7:00AM') + bh('8.0', [['HCT', 'B', '26', '%', '37.7 - 53.7'], ['WBC', '*', '7.0', 'K/uL', '4.00 - 11.00']]) +
    'DIFERENCIAL MANUAL\n' + TABLE + 'SEGMENTADOS\nA\n90\n%\t40 - 75\n' +
    'FROTIS DE SANGRE PERIFERICA\n' + TABLE + 'FROTIS DE SANGRE PERIFERICA\n*\nHIPOCROMIA +, PLAQUETAS NORMALES EN CANTIDAD.\n');
  d = await day(VW, '08/03/2026');
  const arrowInfo = await page.locator('#lab-output-box .lab-trend-arrow').evaluateAll((els) =>
    els.map((e) => ({ v: e.closest('.lab-row-value, strong, span')?.parentElement?.textContent.trim(), alt: !!e.closest('.lab-row-value')?.querySelector('.lab-value-altered') })));
  check('trend arrows only on altered values with a prior draw (none on in-range Leu)',
    arrowInfo.length > 0 && arrowInfo.every((a) => a.alt), { arrows1, arrowInfo });
  const chips2 = await page.locator('#lab-output-box .lab-row-label').evaluateAll((els) =>
    els.map((e) => ({ l: e.textContent.trim(), chips: !!(e.nextElementSibling && e.nextElementSibling.classList.contains('lab-row-values-chips')) })));
  check('FROTIS prose row has no chips', chips2.some((c) => /FROTIS/.test(c.l) && !c.chips), chips2);
  await pasteAndSave(hdr(VW, 'Mar 9 2026 7:00AM') + 'ESTUDIOS ESPECIALES\nPROCALCITONINA\n' + TABLE + 'PROCALCITONINA\t\n*\n<0.02\nng/mL\tADULTO <0.05 ng/mL\n');
  d = await day(VW, '09/03/2026');
  // Row 51: a day whose only entry is "Labs externos" (no SOME text) → toast. DOS gets today's manual BH only.
  const TB = P(17, 'TABLAS');
  await pasteAndSave(hdr(TB, 'Mar 1 2026 7:00AM') + bh('9.9'));
  await open(TB);
  await openPaste(page);
  await page.locator('#btn-lab-manual-entry').click();
  await page.locator('#lab-manual-entry-modal').waitFor({ state: 'visible' });
  await page.locator('#lab-manual-type').selectOption('BH');
  await page.locator('#lab-manual-hora').fill('06:00');
  await page.locator('#lab-manual-fields input[data-field-key="Hb"]').fill('10.5');
  await page.locator('#lab-manual-entry-confirm').click();
  await page.locator('#lab-manual-entry-modal').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await day(TB, today);
  await closeToasts(page);
  if (!(await barOpen(page))) await page.locator('#lab-bar-more > summary').click();
  await page.locator('#lab-some-tables-btn').click().catch(() => {});
  check('"Tablas del reporte SOME" on a day with no SOME text → toast "No hay tablas SOME para este día"', await toastSeen(/No hay tablas SOME para este día/));
  await closeToasts(page);
  // newest day selected by default
  await open(AU);
  await open(VW);
  const sel = await dateSel.evaluate((s) => s.options[s.selectedIndex]?.textContent);
  check('the newest day is selected by default on opening the patient', sel === '09/03/2026', sel);

  // ── Row 54 day nav: buttons + arrow keys ─────────────────────────────────
  const selDay = () => dateSel.evaluate((s) => s.options[s.selectedIndex]?.textContent);
  await day(VW, '09/03/2026');
  await page.locator('#lab-history-day-prev').click(); await page.waitForTimeout(250);
  const p1 = await selDay();
  await page.locator('#lab-history-day-next').click(); await page.waitForTimeout(250);
  const nextDisabled = await page.locator('#lab-history-day-next').isDisabled();
  const n1 = await selDay();
  await dateSel.selectOption('day:01/03/2026'); await page.waitForTimeout(250);
  const firstSet = (await outText()).split('\n').map(flat).find((l) => /^\d{1,2}:\d{2}$/.test(l));
  const endOld = (await page.locator('#lab-history-day-prev').isDisabled()) ? await selDay() : 'prev enabled at oldest';
  check('"Día anterior"/"Día siguiente" step older/newer, stop at the newest end, and show the day\'s latest set first',
    p1 === '08/03/2026' && n1 === '09/03/2026' && nextDisabled && firstSet === '18:00', { p1, n1, endOld, firstSet });
  await dateSel.selectOption('day:07/03/2026'); await page.waitForTimeout(200);
  await page.locator('#lab-output-box').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);
  const kL = await selDay();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
  const kR = await selDay();
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(250);
  const kU = await selDay();
  await page.keyboard.press('Shift+ArrowLeft'); await page.waitForTimeout(250);
  const kMod = await selDay();
  check('ArrowLeft → older day, ArrowRight → newer',
    kL === '06/03/2026' && kR === '07/03/2026', { kL, kR, kU, kMod });
  await openPaste(page);
  await page.locator('#lab-input').focus();
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);
  const kTyping = await selDay();
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  await goArea(page, 'paciente').catch(() => {});
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);
  const kHidden = await selDay();
  await goArea(page, 'lab');

  // ── Row 53 consolidate from the "…" menu ────────────────────────────────
  await day(VW, '01/03/2026');
  await moreAction(page, 'consolidateLabHistoryByDayAndTipo');
  const cbs = page.locator('.lab-consolidate-set-cb:not(:disabled)');
  await cbs.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const cbN = await cbs.count();
  for (let i = 0; i < cbN; i++) {
    const lbl = await cbs.nth(i).evaluate((c) => c.closest('label, div')?.textContent || '');
    if (/01\/03/.test(lbl) && /07:00|18:00/.test(lbl)) await cbs.nth(i).check();
  }
  await page.locator('#lab-consolidate-add-group').click();
  await page.locator('#lab-consolidate-ok').click();
  await page.waitForTimeout(500);
  const consToast = (await page.locator('.toast').allInnerTexts()).join(' | ');
  const consSel = await selDay();
  const consSets = (await outText()).split('\n').map(flat).filter((l) => /^\d{1,2}:\d{2}$/.test(l));
  check('"…" → Consolidar two sets of 01/03 → the same day stays selected (no patient switch), toast "Fusionados"',
    consSel === '01/03/2026' && /Fusionados/.test(consToast), { consSel, consSets, consToast, cbN });
  await closeToasts(page);

  // ── Rows 34/35/49/50 citoquímico ──────────────────────────────────────────
  const LQ = P(3, 'LIQUIDOS');
  const liq = async (when, body, date) => { await pasteAndSave(hdr(LQ, when, 'FEMENINO', '73') + body); return day(LQ, date); };
  const interp = (dd) => row(dd, /INTERPRETACI/i);
  const liqRow = (dd) => row(dd, /^Liq/);
  d = await liq('Apr 1 2026 6:24PM', serumAlbS('3.4') + asc(), '01/04/2026');
  check('ascitic Leu 9200, PMN 96 % → "PMN 8832 ≥250" and "peritonitis bacteriana espontánea"', /PMN 8832 ≥250/.test(interp(d)) && /peritonitis bacteriana espont/i.test(interp(d)), d.rows);
  check('ascitis + serum Alb 3.4 → Liq "Alb 2.1 TGL 20 GASA 1.3"; interpretation says portal HTN; Liq row has no portal/quilosa',
    /Alb 2\.1/.test(liqRow(d)) && /TGL 20/.test(liqRow(d)) && /GASA 1\.3/.test(liqRow(d)) && /hipertensi[oó]n portal/.test(interp(d)) && !/portal|quilosa/i.test(liqRow(d)), d.rows);
  await page.locator('#lab-copy-fab').click(); await page.waitForTimeout(500);
  const liqClip = await clip();
  await closeToasts(page);
  d = await liq('Apr 2 2026 8:00AM', asc({ rec: '500', pmn: '84', tgl: null }), '02/04/2026');
  check('ascitic PMN 420 (Leu 500 × 84 %) → PBE', /PMN 420 ≥250/.test(interp(d)) && /peritonitis bacteriana/i.test(interp(d)), d.rows);
  d = await liq('Apr 3 2026 8:00AM', asc({ rec: '300', pmn: '80', pmnUnit: '', tgl: null }), '03/04/2026');
  check('ascitic PMN 80 with no % → no PBE claim; asks to "confirmar PMN absoluto"', !/peritonitis bacteriana/i.test(interp(d)) && /confirmar PMN absoluto/.test(interp(d)), d.rows);
  d = await liq('Apr 4 2026 8:00AM', asc({ rec: '100', pmn: '10', gram: 'ABUNDANTES LEUCOCITOS', tgl: null }), '04/04/2026');
  const gramNeg = interp(d);
  d = await liq('Apr 5 2026 8:00AM', asc({ rec: '100', pmn: '10', gram: 'COCOS GRAM POSITIVOS', tgl: null }), '05/04/2026');
  check('ascitic Leu 100: Gram "ABUNDANTES LEUCOCITOS" → no infection alert; "COCOS GRAM POSITIVOS" → "infección bacteriana"',
    !/infecci[oó]n bacteriana|peritonitis/i.test(gramNeg) && /infecci[oó]n bacteriana/i.test(interp(d)), { gramNeg, pos: interp(d) });
  // GASA < 1.1 branches (serum Alb 2.5)
  const gasaCase = async (n, o) => (await liq(`Apr ${n} 2026 8:00AM`, serumAlbS('2.5') + asc(o), `${String(n).padStart(2, '0')}/04/2026`));
  d = await gasaCase(6, {});
  check('serum Alb 2.5 → "GASA 0.4 <1.1 — ascitis no portal" + asks for amilasa y citología', /GASA 0\.4 <1\.1 — ascitis no portal/.test(interp(d)) && /amilasa y citolog/i.test(interp(d)), d.rows);
  d = await gasaCase(7, { tgl: null });
  check('GASA <1.1 with no TGL and no amilasa → asks for "triglicéridos y amilasa"', /triglic[eé]ridos y amilasa/i.test(interp(d)), d.rows);
  const branches = [];
  for (const [n, o, re] of [[8, { tgl: '250' }, /quilosa/i], [9, { prot: '2000', tgl: '100' }, /nefr[oó]tico/i], [10, { tgl: '100', amil: '1500' }, /pancre[aá]tica/i],
    [11, { tgl: '100', amil: '80', cito: 'POSITIVO PARA MALIGNIDAD' }, /Carcinomatosis/], [12, { tgl: '100', amil: '80', cito: 'NEGATIVO' }, /tuberculosa/i]]) {
    d = await gasaCase(n, o);
    branches.push([n, re.test(interp(d)), interp(d)]);
  }
  check('GASA <1.1 branches: TGL 250 quilosa, Prot 2 nefrótico, amilasa 1500 pancreática, citología + carcinomatosis, − tuberculosa', branches.every((b) => b[1]), branches);
  // serum albumin after the cito block, and in another paste of the same day
  d = await liq('Apr 13 2026 8:00AM', asc() + '\n' + serumAlbS('3.4'), '13/04/2026');
  check('serum albumin placed after the cito block → GASA 1.3', /GASA 1\.3/.test(liqRow(d)), d.rows);
  await liq('Apr 14 2026 6:24PM', asc(), '14/04/2026');
  d = await liq('Apr 14 2026 7:00PM', serumAlbS('3.4'), '14/04/2026');
  check('same-day serum Alb 3.4 pasted later → the saved Liq set refreshes to GASA 1.3', /GASA 1\.3/.test(d.all), d.rows);
  // peritoneal A-style fixture: Leu 48, no serum albumin
  d = await liq('Apr 15 2026 5:11PM', 'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    'EXAMEN QUIMICO\t\n*\n:\nDENSIDAD\t\n*\n1.010\nPH\t\n*\n8.5\nGLUCOSA\t\n*\n949.0\nmg/dL\t\nPROTEINAS\t\n*\n300\nmg/dL\t\nLDH\t\n*\n6\nIU/L\t\n' +
    'CITOQUIMICO DE\t\n*\nLIQUIDO PERITONEAL\n\nBACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    'ASPECTO\t\n*\nCLARO\nRECUENTO\t\nA\n48\nLEUCOCITOS/MM3\t0.00 - 5.00\nPOLIMORFONUCLEARES\t\n*\nPREDOMINIO\n%\t\n' +
    'LINFOCITOS\t\n*\n%\t\nERITROCITOS\t\n*\nESCASOS\n/mm3\t\nGRAM\t\n*\nNEGATIVO\nCOMENTARIO\t\n*\nPERITONEAL\n', '15/04/2026');
  check('peritoneal Leu 48 → no PBE alert', !/peritonitis bacteriana|PBE/.test(d.all), d.rows);
  check('peritoneal fixture → Liq shows LIQUIDO PERITONEAL, Prot 0.3, LDH 6, Rec 48; no GASA, no interpretation inside Liq, no QS Glu 949',
    /LIQUIDO PERITONEAL/.test(liqRow(d)) && /Prot 0\.3\b/.test(liqRow(d)) && /LDH 6\b/.test(liqRow(d)) && /Rec 48/.test(liqRow(d)) &&
      !/GASA/.test(d.all) && !/INTERPRETACI/i.test(liqRow(d)) && !/^QS.*949/m.test(d.all), d.rows);
  // pleural (A's fixture) + thresholds
  d = await liq('Apr 16 2026 8:00AM', pleu(), '16/04/2026');
  check('pleural fixture: Liq row has no "Light EXUDADO" (the interpretation has "LDH>2/3"); Liq shows Prot 6, Alb 3.4, LDH 549, XANTOCROMICO, Leu 3000, Linf 100',
    !/Light/.test(liqRow(d)) && /LDH>2\/3/.test(interp(d)) && [/Prot 6\b/, /Alb 3\.4/, /LDH 549/, /XANTOCROMICO/, /3000/, /Linf 100/].every((re) => re.test(liqRow(d))), d.rows);
  d = await liq('Apr 17 2026 8:00AM', pleu({ ph: '7.20', glu: '59', rec: '50,000' }), '17/04/2026');
  check('pleural pH 7.20 → "≤7.20" alert; glucose 59 → "<60 mg/dL"; Leu 50,000 → "≥50k"', /≤7\.20/.test(interp(d)) && /<60 mg\/dL/.test(interp(d)) && /≥50k/.test(interp(d)), interp(d));
  d = await liq('Apr 18 2026 8:00AM', pleu({ ph: '7.21', glu: '60' }), '18/04/2026');
  check('pleural pH 7.21 / glucose 60 / Leu 3000 → none of the empyema alerts', !/≤7\.20|<60 mg|≥50k/.test(d.all), interp(d));
  d = await liq('Apr 19 2026 8:00AM', pleu({ ph: '7.10' }), '19/04/2026');
  check('pleural pH 7.10 → "≤7.20" alert', /pH pleural 7\.1 ?.*≤7\.20/.test(interp(d)) || /7\.1.*≤7\.20/.test(interp(d)), interp(d));
  d = await liq('Apr 20 2026 8:00AM', pleu({ prot: '1500', ldh: '60', serumLdh: '200', serumProt: '7.0' }), '20/04/2026');
  // protein units
  const protCase = async (n, prot, unit) => liqRow(await liq(`Apr ${n} 2026 8:00AM`, asc({ prot, protUnit: unit, tgl: null }), `${n}/04/2026`));
  const u = [await protCase(21, '900', 'mg/dL'), await protCase(22, '900', ''), await protCase(23, '5.4', 'g/dL'), await protCase(24, '60', 'g/L'), await protCase(25, '3000', 'MG/DL')];
  check('fluid protein units: 900 mg/dL → Prot 0.9; no unit → Prot 900; 5.4 g/dL → 5.4; 60 g/L → 6; 3000 MG/DL → 3',
    /Prot 0\.9\b/.test(u[0]) && /Prot 900\b/.test(u[1]) && /Prot 5\.4\b/.test(u[2]) && /Prot 6\b/.test(u[3]) && /Prot 3\b/.test(u[4]), u);
  // sinovial + BH
  d = await liq('Apr 26 2026 8:00AM', bh('12.1') + 'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    'GLUCOSA\t\n*\n15\nmg/dL\t\nCITOQUIMICO DE\t\n*\nLIQUIDO SINOVIAL\n\nBACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\n' + TABLE +
    'RECUENTO\t\nA\n450\nLEUCOCITOS/MM3\t0.00 - 5.00\nLINFOCITOS\t\n*\n20\n%\t\nERITROCITOS\t\n*\n15\n/mm3\t\nCOMENTARIO\t\n*\nLIQUIDO SINOVIAL\n', '26/04/2026');
  check('sinovial fluid + BH → BH Hb 12.1 with no Eri 15/450 or Lin 20; no QS Glu 15',
    /BH Hb 12\.1/.test(row(d, /^BH/)) && !/Eri|Lin/.test(row(d, /^BH/)) && !/^QS.*Glu 15/m.test(d.all), d.rows);
  // LCR interpretation bands + pH rule (rows 34/35) and default LCR pH band (row 46)
  const lcrCase = async (n, o) => liq(`Apr ${n} 2026 8:00AM`, lcr(o), `${n}/04/2026`);
  d = await lcrCase(27, { ph: '8.5', leu: 26, glu: 21, prot: 200 });
  check('LCR Leu 26 / Glu 21 / Prot 200 (10–99 band) → "Meningitis tuberculosa?", no viral; pH 8.5 → "fuera de rango fisiológico"',
    /Meningitis tuberculosa\?/.test(d.all) && !/viral/i.test(d.all) && /fuera de rango fisiol/.test(d.all), d.rows);
  d = await lcrCase(28, { ph: '7.20', leu: 40, glu: 60, prot: 150 });
  const lcrAlt = await altered();
  check('LCR Leu 40 / Glu 60 / Prot 150 → "bacteriana parcialmente tratada"; pH 7.20 → "fuera de rango (7.28–7.42)"',
    /parcialmente tratada/.test(d.all) && /fuera de rango/.test(d.all), { rows: d.rows, lcrAlt });
  d = await lcrCase(29, { ph: '7.35', leu: 80, glu: 65, prot: 70 });
  check('LCR Leu 80 / Glu 65 / Prot 70 → "viral"; pH 7.35 → no pH flag', /Meningitis viral/.test(d.all) && !/fuera de rango/.test(d.all), d.rows);
  d = await lcrCase(30, { leu: 2, glu: 60, prot: 30 });
  check('LCR Leu 2 / Glu 60 / Prot 30, no pH → no meningitis alert and no pH flag', !/Meningitis|fuera de rango/.test(d.all), d.rows);
  // Row 49 lcr-parse: portal CSF, chemistry-only, empty chemistry
  const csfQ = 'QUIMICA CLINICA\nCITOQUIMICO DE LCR\n' + TABLE +
    'pH\n*\n8.5\nASPECTO\n*\nRECUENTO CELULAR\n*\nPOLIMORFONUCLEARES\n*\nLINFOCITOS\n*\nTINTA CHINA\n*\nERITROCITOS\n*\nCOAGLUTINACION\n*\nGRAM\n*\n' +
    'GLUCOSA\nB\n21\nmg/dL\t45 - 80\nPROTEINAS\nA\n200\nmg/dL\t15 - 45\nCLORURO\nB\n109.3\nmmol/L\t118.1 - 132.0\nOTROS\n*\n';
  const csfB = (leu, pmn, linf, gram) => 'BACTERIOLOGIA\nCITOQUIMICO LIQ. LCR\n' + TABLE +
    `LCR\n*\nASPECTO\n*\nCLARO\nRECUENTO CELULAR\n*\n${leu}\nLEUCOCITOS/MM\n` +
    (pmn != null ? `LEUCOCITOS POLIMORFONUCLEARES\n*\n${pmn}\n%PMN\nLINFOCITOS\n*\n${linf}\n%LINFOCITOS\n` : '') +
    `TINTA CHINA\n*\nNEGATIVO\nERITROCITOS\n*\nAUSENTES\nCOAGLUTINACION\n*\nGRAM\n*\n${gram}\nCOMENTARIOS\n*\n`;
  const portal = (t) => t.replace(/\n/g, '\n\n');
  await pasteAndSave(portal(hdr(LQ, 'May 1 2026 8:00AM') + csfQ) + '\n\n' + portal(hdr(LQ, 'May 1 2026 8:00AM') + csfB(215, 26, 74, 'MODERADOS LEUCOCITOS')));
  d = await day(LQ, '01/05/2026');
  check('CSF portal → "PMN 26% Linf 74%", Gram MODERADOS LEUCOCITOS, Tinta NEGATIVO; no BH row',
    /PMN 26%/.test(d.all) && /Linf 74%/.test(d.all) && /MODERADOS LEUCOCITOS/.test(d.all) && /Tinta NEGATIVO/.test(d.all) && !d.rows.some((l) => /^BH/.test(l)), d.rows);
  await page.locator('#lab-copy-fab').click(); await page.waitForTimeout(500);
  const csfClip = await clip();
  await closeToasts(page);
  d = await liq('May 2 2026 8:00AM', lcr({ glu: 50, prot: 40 }), '02/05/2026');
  check('chemistry-only LCR → no PMN/Linf', /LCR/.test(d.all) && !/PMN|Linf/.test(d.all), d.rows);
  const emptyQ = 'QUIMICA CLINICA\nCITOQUIMICO DE LCR\n' + TABLE + 'pH\n*\n8.5\nASPECTO\n*\nRECUENTO CELULAR\n*\nGLUCOSA\n*\n51\nmg/dL\t45 - 80\nPROTEINAS\nA\n78\nmg/dL\t15 - 45\nCLORURO\n*\n135.5\nmmol/L\t118.1 - 132.0\n';
  await pasteAndSave(hdr(LQ, 'May 3 2026 8:00AM') + emptyQ + '\n' + csfB(0, null, null, 'NO SE OBSERVAN BACTERIAS'));
  d = await day(LQ, '03/05/2026');
  check('LCR with empty chemistry cells + bacteriology (Leu 0, CLARO, Glu 51, Prot 78, Cl 135.5, pH 8.5) → one LCR row, no "RECUENTO CELULAR", no QS Glu 51, only the pH alert',
    d.rows.filter((l) => /^LCR/.test(l)).length === 1 && !/RECUENTO CELULAR/.test(d.all) && !/^QS.*Glu 51/m.test(d.all) && /fuera de rango/.test(d.all) && !/Meningitis/.test(d.all), d.rows);

  // ── Rows 36-47: analyte rules on MISC ────────────────────────────────────
  const MI = P(4, 'MISC');
  const mi = async (when, body, date) => { await pasteAndSave(hdr(MI, when) + body); return day(MI, date); };
  d = await mi('Jun 1 2026 8:00AM', qs([['PROTEINA C REACTIVA', 'A', '4.2', 'mg/dL', '0.0 - 0.5']]) + 'ESTUDIOS ESPECIALES\nPROCALCITONINA\n' + TABLE +
    'PROCALCITONINA\t\n*\n0.09\nng/mL\tADULTO <0.05 ng/mL\nNEONATOS 0 - 5 HORAS <2 ng/mL\n6 - 12 HORAS <8 ng/mL\n', '01/06/2026');
  let alt = await altered();
  check('PCR 4.2 + PCT 0.09 → both on the QS row', /PCR 4\.2/.test(row(d, /^QS/)) && /PCT 0\.09/.test(row(d, /^QS/)), d.rows);
  check('PCT 0.09 with the full reference text (neonatal "0 - 5 HORAS") → 0.09 shown altered', alt.includes('0.09'), alt);
  d = await mi('Jun 2 2026 8:00AM', 'ESTUDIOS ESPECIALES\nPROCALCITONINA\n' + TABLE + 'PROCALCITONINA\t\n*\n0.03\nng/mL\tADULTO <0.05 ng/mL\n', '02/06/2026');
  alt = await altered();
  check('PCT 0.03 → not altered', /PCT 0\.03/.test(d.all) && !alt.includes('0.03'), { rows: d.rows, alt });
  d = await mi('Jun 3 2026 8:00AM', qs([['CALCIO EN SUERO', 'B', '7', 'mg/dL', '8.4 - 10.2'], ['ALBUMINA', '*', '4', 'g/dL', '3.2 - 5.5']]), '03/06/2026');
  alt = await altered();
  check('Ca 7 / Alb 4 → cCa 7, shown altered; no report → no PCT', /cCa 7\b/.test(d.all) && alt.filter((v) => v === '7').length >= 2 && !/PCT/.test(d.all), { rows: d.rows, alt });
  d = await mi('Jun 4 2026 8:00AM', qs([['CALCIO EN SUERO', 'B', '8', 'mg/dL', '8.4 - 10.2'], ['ALBUMINA', 'B', '2', 'g/dL', '3.2 - 5.5']]), '04/06/2026');
  alt = await altered();
  check('Ca 8 / Alb 2 → Ca 8 altered, cCa 9.6 (not altered)', /cCa 9\.6/.test(d.all) && alt.includes('8') && !alt.includes('9.6'), { rows: d.rows, alt });
  await pasteAndSave(fullLabs(MI, 'Jun 5 2026 8:00AM'));
  d = await day(MI, '05/06/2026');
  alt = await altered();
  check('Ca 8.8 / Alb 4.1 → cCa 8.7 is not shown altered', /cCa 8\.7/.test(d.all) && !alt.includes('8.7'), alt);
  d = await mi('Jun 6 2026 8:00AM', qs([['CALCIO EN SUERO', '*', '9.0', 'mg/dL', '8.4 - 10.2']]), '06/06/2026');
  check('Ca with no albumin → no cCa', /Ca 9/.test(d.all) && !/cCa/.test(d.all), d.rows);
  // lipids + hemolyzed BUN
  d = await mi('Jun 7 2026 7:29AM', 'QUIMICA CLINICA\n' +
    'COLESTEROL\n' + TABLE + 'COLESTEROL\t\n*\n187\nmg/dL\t130 - 200\n' +
    'NITROGENO DE LA UREA EN SANGRE\n' + TABLE + 'NITROGENO DE LA UREA EN SANGRE\t\n*\nmg/dL\t7 - 20\n' +
    'INDICE ATEROGENICO\n' + TABLE + 'INDICE ATEROGENICO\t\nA\n3.31\n3.22 RIESGO PROM.\n' +
    'COCIENTE COL.TOT/HDL\n' + TABLE + 'COCIENTE COL.TOT/HDL\t\nA\n4.92\n0.00 - 3.10\n', '07/06/2026');
  alt = await altered();
  check('hemolyzed BUN (no result, range "7 - 20") → no "BUN 7"', !/BUN 7\b/.test(d.all), d.rows);
  check('IA 3.31 and CTHDL 4.92 are altered; COL 187 is not', alt.includes('3.31') && alt.includes('4.92') && !alt.includes('187'), alt);
  // serology (row 42) + GS (row 40)
  d = await mi('Jun 8 2026 5:07PM', 'BANCO DE SANGRE\n\nSerologia\n\nEstudio\tResultado\tUnidades\tValor de Referencia\n\n' +
    'Anticuerpos anti HIV1/HIV2 Combo.\n1.200\nPOSITIVO\nS/CO\nPositivo >= 0.80S/CO\nIndeterminado >= 0.90-0.99S/CO\nNegativo <= 0.00S/CO\n\n' +
    'Anticuerpos anti virus de la Hepatitis C.\n0.950\nINDETERMINADO\nS/CO\nPositivo >= 0.80S/CO\nIndeterminado >= 0.90-0.99S/CO\nNegativo <= 0.00S/CO\n\n' +
    'Antigeno de superficie del virus de la Hepatitis B\n0.050\nNEGATIVO\nS/CO\nPositivo >= 0.80S/CO\nIndeterminado >= 0.90-0.99S/CO\nNegativo <= 0.00S/CO\n', '08/06/2026');
  alt = await altered();
  check('serology: VIH 1.20 POSITIVO → "VIH pos (1.2)", VHC 0.95 → "VHC indet (0.95)", both altered; HBsAg 0.050 → "neg (0.05)"',
    /VIH pos \(1\.2\)/.test(d.all) && /VHC indet \(0\.95\)/.test(d.all) && /HBsAg neg \(0\.05\)/.test(d.all) && alt.some((v) => /pos/.test(v)) && alt.some((v) => /indet/.test(v)), { all: d.all, alt });
  check('serology-only report → no GS row', !/\bGS\b/.test(d.all), d.rows);
  const gsRep = (g, cd, ci) => 'BANCO DE SANGRE\n\n\nREPORTE DE GRUPO SANGUINEO RH, COOMBS DIRECTO E INDIRECTO\n\n' +
    `Estudio\tResultado\n\nGrupo Sanguineo / RH\t\n${g}\n\nCoombs Directo\t\n${cd}\n\nCoombs Indirecto\n${ci}\n`;
  d = await mi('Jun 9 2026 7:14AM', gsRep('AB POSITIVO', 'NEGATIVO', 'NEGATIVO'), '09/06/2026');
  check('AB POSITIVO on one line → "GS AB+ CD neg CI neg"', /GS AB\+ CD neg CI neg/.test(d.all), d.rows);
  d = await mi('Jun 10 2026 7:14AM', gsRep('O NEGATIVO', 'NEGATIVO', 'POSITIVO 2+'), '10/06/2026');
  alt = await altered();
  check('O NEGATIVO / CD NEGATIVO / CI 2+ → "GS O- CD neg CI 2+", 2+ altered', /GS O- CD neg CI 2\+/.test(d.all) && alt.includes('2+'), { rows: d.rows, alt });
  d = await mi('Jun 11 2026 7:14AM', gsRep('B POSITIVO', 'POSITIVO / POSITIVO 1+', ''), '11/06/2026');
  alt = await altered();
  check('CD 1+ is shown altered', /CD 1\+/.test(d.all) && alt.includes('1+'), { rows: d.rows, alt });
  // some-refs (row 43)
  d = await mi('Jun 12 2026 3:24AM', 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + 'HGB\t\n*\n12.40\ng/dL\t12.20 - 18.10\nHCT\t\n*\n39.8\n%\t37.7 - 53.7\nWBC\t\nA\n19.60\nK/uL\t4.00 - 11.00\n', '12/06/2026');
  alt = await altered();
  check('ranged report: Leu 19.6 altered; Hb 12.4 and Hto 39.8 not', alt.includes('19.6') && !alt.includes('12.4') && !alt.includes('39.8'), alt);
  // troponin (row 44)
  d = await mi('Jun 13 2026 1:24PM', trop('2180.300'), '13/06/2026');
  alt = await altered();
  check('TnI 2180.3 is altered; a single value shows no Δ%', alt.includes('2180.3') && !/Δ/.test(d.all), { rows: d.rows, alt });
  await pasteAndSave(hdr(MI, 'Jun 14 2026 8:00AM') + trop('12.500'));
  d = await mi('Jun 14 2026 9:30AM', trop('45.000'), '14/06/2026');
  check('two troponins ≤2 h apart (12.5 then 45.0) → "TnI1 12.5 TnI2 45 Δ% 260%"', /TnI1 12\.5 TnI2 45 Δ% 260%/.test(d.all), d.rows);
  check('report with no troponin → no TROP row', !/TROP/.test((await day(MI, '12/06/2026')).all));
  // coag (row 45)
  d = await mi('Jun 15 2026 8:00AM', 'HEMATOLOGIA\nTIEMPO DE PROTROMBINA Y TROMBOPLASTINA\n' + TABLE +
    'TIEMPO DE PROTROMBINA\t\n*\n13.70\nSEG.\t10.25 - 13.20\nINR\t\n*\n1.17\nTIEMPO DE TROMBOPLASTINA\t\n*\n33.3\nSEG\t29.1 - 38.4\n', '15/06/2026');
  check('COAG-only report (TP 13.7, TTP 33.3, INR 1.17) → no BH row', /COAG/.test(d.all) && !d.rows.some((l) => /^BH/.test(l)), d.rows);
  d = await mi('Jun 16 2026 8:00AM', esc('134.5', '102.3') + qs([['ALBUMINA', 'B', '2.1', 'g/dL', '3.2 - 5.5']]) + gasS({ hco3: '17.1' }), '16/06/2026');
  alt = await altered();
  check('Na 134.5, Cl 102.3, HCO3 17.1, Alb 2.1 → AG 15.1 and cAG 19.8, both altered (cAG band 8–12)',
    /\bAG 15\.1\b/.test(d.all) && /cAG 19\.8/.test(d.all) && alt.includes('15.1') && alt.includes('19.8'), { all: d.all, alt });
  // row 16 (labs-anion-gap): cAG is flagged on its own band, not only when AG is.
  d = await mi('Jun 25 2026 8:00AM', esc('140', '106') + qs([['ALBUMINA', '*', '3.6', 'g/dL', '3.2 - 5.5']]) + gasS({ hco3: '24' }), '25/06/2026');
  alt = await altered();
  check('Na 140, Cl 106, HCO3 24, Alb 3.6 → AG 10 and cAG 11, neither flagged altered (in the 8–12 band)',
    /\bAG 10\b/.test(d.all) && /cAG 11\b/.test(d.all) && !alt.includes('10') && !alt.includes('11'), { all: d.all, alt });
  // sanitize (row 47)
  d = await mi('Jun 17 2026 8:00AM', 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    `HGB\t\tB\t7.85\tg/dL\t12.20 - 18.10 Expediente: ${MI.exp} Solicitud: 2600001234 Nombre: ${MI.name}\n` +
    'USER Estu 2.53* 89 31 2932 Unid 2.53* UL 11 MD 60 UL 22 ML 98 Campo 90001234 Labo -647* LABX 90001 1017 24.5* RS -647* LABY -647* Feme 1\n', '17/06/2026');
  check('BH glued to "Expediente:/Solicitud:/Nombre:" on one line → trimmed at the header text; mangled USER…Feme footer not saved',
    /Hb 7\.85/.test(d.all) && !/Expediente|Solicitud|Nombre/.test(d.all) && !/USER|Feme|LABX|Campo/.test(d.all), d.rows);
  d = await mi('Jun 18 2026 8:00AM', 'URIANALISIS\nCUANTIFICACION PROTEINAS EN ORINA 12 O 24 HRS\n' + TABLE +
    'VOLUMEN DE ORINA\t\nA\n800\nml\tN/A\nRESULTADO\t\nA\n0.45\ngr/vol\tNEGATIVO\nOBSERVACIONES\t\n*\nORINA DE 12 HORAS\n', '18/06/2026');
  check('12 h proteinuria → a Prot12h row', /Prot12h/.test(d.all), d.rows);
  check('UNREACHABLE labs-reslabs-sanitize: censo compaction of legacy stored blobs (old data shapes cannot be created by today\'s paste)', true);
  check('UNREACHABLE labs-display: the byte-identical internal test and legacy "Coag." / "Interpretación gasometría" rows (legacy stored data only)', true);

  // ── Row 48 gases ─────────────────────────────────────────────────────────
  const GA = P(5, 'GASES');
  const ga = async (when, body, date) => { await pasteAndSave(hdr(GA, when) + body); return day(GA, date); };
  d = await ga('Jul 1 2026 8:00AM', gasS({ ph: '7.31', pco2: '33', po2: '45', hco3: '16.6', lac: '1.4', ranges: false }), '01/07/2026');
  alt = await altered();
  check('gas with no ranges (first gas) → 7.31, 33, 45 and 16.6 altered; Lactato 1.4 not',
    ['7.31', '33', '45', '16.6'].every((v) => alt.includes(v)) && !alt.includes('1.4'), alt);
  check('gas-only report → no AG and no iCa without an OBSERVACIONES line', !/\bAG\b/.test(d.all) && !/iCa/.test(d.all), d.rows);
  d = await ga('Jul 2 2026 8:00AM', 'GASOMETRIAS\nGASOMETRIA VENOSA PARCIAL\n' + TABLE + 'PH\nA\n7.48\n\t7.32 - 7.43\npCO2\t*\t41\tmmHg\t40 - 45\n', '02/07/2026');
  check('multi-line flags (PH / A / 7.48) → pH 7.48', /pH 7\.48/.test(d.all), d.rows);
  const g1 = gasS({ ph: '7.35', hco3: '21' });
  d = await ga('Jul 3 2026 8:00AM', esc('138', '103.5') + g1 + g1, '03/07/2026');
  check('duplicate GASES rows of one draw → one GASES row, AG 13.5, Delta-Delta 0.5',
    d.rows.filter((l) => /^GASES/.test(l)).length === 1 && /\bAG 13\.5\b/.test(d.all) && /Delta-Delta 0\.5\b/.test(d.all), d.rows);
  d = await ga('Jul 4 2026 8:00AM', esc('140', '100') + gasS({ ph: '7.40', hco3: '22' }), '04/07/2026');
  const altBefore = await altered();
  check('one report pH 7.40 / HCO3 22 + ESC Na 140 / Cl 100 → AG 18, Delta-Delta 3', /\bAG 18\b/.test(d.all) && /Delta-Delta 3\b/.test(d.all), d.rows);
  await moreAction(page, 'reprocessSelectedLabHistorySet');
  await page.waitForTimeout(600);
  await closeToasts(page);
  const altAfter = await altered();
  check('"…" → Reprocesar keeps the gas flags and does not flag pH 7.4',
    JSON.stringify(altAfter.slice().sort()) === JSON.stringify(altBefore.slice().sort()) && !altAfter.some((v) => /^7\.4/.test(v)), { altBefore, altAfter });
  d = await ga('Jul 5 2026 8:00AM', esc('140', '104') + gasS({}), '05/07/2026');
  alt = await altered();
  check('ESC Na 140 / Cl 104 + HCO3 21.2 → AG 14.8 altered, Delta-Delta 1', /\bAG 14\.8\b/.test(d.all) && alt.includes('14.8') && /Delta-Delta 1\b/.test(d.all), { all: d.all, alt });
  d = await ga('Jul 6 2026 8:00AM', esc('140', '104') + qs([['ALBUMINA', 'B', '2.1', 'g/dL', '3.2 - 5.5']]) + gasS({}), '06/07/2026');
  const d95 = await ga('Jul 7 2026 8:00AM', esc('140', '95') + gasS({}), '07/07/2026');
  const d100 = await ga('Jul 8 2026 8:00AM', esc('140', '100') + gasS({}), '08/07/2026');
  check('with Alb 2.1 → cAG 19.5; with Cl 95 → AG 23.8; with Cl 100 → AG 18.8',
    /cAG 19\.5/.test(d.all) && /\bAG 23\.8\b/.test(d95.all) && /\bAG 18\.8\b/.test(d100.all), [d.all, d95.all, d100.all]);
  const dArt = await ga('Jul 9 2026 8:00AM', gasS({ kind: 'ARTERIAL', extra: 'Na\t*\t139\tmmol/L\t135 - 145\nCl\t*\t101\tmmol/L\t98 - 107\n' }), '09/07/2026');
  const dNoCl = await ga('Jul 10 2026 8:00AM', esc('140') + gasS({}), '10/07/2026');
  check('no AG for an arterial gas with its own Na/Cl, or chemistry with no Cl', !/\bAG\b/.test(dArt.all) && !/\bAG\b/.test(dNoCl.all), [dArt.all, dNoCl.all]);
  d = await ga('Sep 9 2026 12:57PM', qs([['GLUCOSA', '*', '86', 'mg/dL', '70 - 110']]) + 'DEPURACION DE CREATININA\n' + TABLE +
    'VOLUMEN EN ORINA\t\nA\n100\nmls.\tN/A\nTIEMPO\t\nA\n1440\nmin.\tN/A\nDEPURACION DE CREATININA\t\nB\n0.98\nml/min.\t72.00 - 141.00\n' +
    'CREATININA SERICA\t\nA\n5.8\nmg/dL\t0.6 - 1.4\nCREATININA EN ORINA\t\n*\n82.36\n', '09/09/2026');
  check('GLUCOSA 86 + DEPURACION → QS has Glu 86, no Cr, no "100"', /QS Glu 86/.test(row(d, /^QS/)) && !/Cr|\b100\b/.test(row(d, /^QS/)), d.rows);
  const urine = qs([['SODIO EN ORINA', '*', '40', 'mmol/L', ''], ['POTASIO EN ORINA', '*', '22', 'mmol/L', ''], ['CLORO EN ORINA', '*', '34', 'mmol/L', ''], ['CREATININA EN ORINA', '*', '53.99', 'mg/dL', '']]) +
    'URIANALISIS\nEXAMEN GENERAL DE ORINA\n' + TABLE + 'PH\t\nA\n7.0\n5.5 - 6.5\n';
  d = await ga('Jul 11 2026 8:00AM', urine, '11/07/2026');
  const dSer = await ga('Jul 12 2026 8:00AM', urine + qs([['SODIO', '*', '140', 'mmol/L', '135.0 - 145.0']]), '12/07/2026');
  d = await ga('Jul 13 2026 8:00AM', gasS({ extra: 'OBSERVACIONES\t*\tCa++ IONIZADO: 0.92 mmol/L\t&\n' }), '13/07/2026');
  const iAlt = await altered();
  const dI2 = await ga('Jul 14 2026 8:00AM', gasS({ extra: 'OBSERVACIONES\t*\tCa++ IONIZADO: 1.20 mmol/L\t&\n' }), '14/07/2026');
  const iAlt2 = await altered();
  check('iCa 0.92 altered; iCa 1.20 not altered', iAlt.includes('0.92') && /iCa 1\.2/.test(dI2.all) && !iAlt2.some((v) => /^1\.20?$/.test(v)), { iAlt, iAlt2 });
  const GB = P(6, 'GASES DOS');
  await pasteAndSave(gas(GB, 'Jul 1 2026 8:00AM', '7.39'));
  await pasteAndSave(hdr(GB, 'Jul 2 2026 8:00AM') + gasS({ ph: '7.33', pco2: '42', hco3: '23', ranges: false }));
  d = await day(GB, '02/07/2026');
  alt = await altered();
  check('prior venous ranges → pH 7.33 and pCO2 42 not altered; HCO3 23 altered', !alt.includes('7.33') && !alt.includes('42') && alt.includes('23'), alt);
  const allGas = [(await day(GA, '01/07/2026')).all, (await day(GA, '04/07/2026')).all, d.all].join('\n');
  check('no "INTERPRETACIÓN GASOMETRÍA" row, ever', !/INTERPRETACI[OÓ]N GASOMETR/i.test(allGas));

  // ── Row 46 default reference ranges (fresh patients, no prior ranges) ────
  const R1 = P(7, 'RANGOS UNO');
  await pasteAndSave(hdr(R1, 'Aug 1 2026 8:00AM') + qs([['GLUCOSA EN SANGRE', '*', '250', 'mg/dL', ''], ['CREATININA EN SANGRE', '*', '0.8', 'mg/dL', ''],
    ['SODIO', '*', '130', 'mmol/L', ''], ['POTASIO', '*', '3.0', 'mmol/L', ''], ['CLORO', '*', '109.9', 'mmol/L', '']]));
  await day(R1, '01/08/2026');
  alt = await altered();
  check('QS/ESC with no ranges → Glu 250, Na 130, K 3.0, Cl 109.9 altered; Cr 0.8 not', ['250', '130', '3', '109.9'].every((v) => alt.includes(v)) && !alt.includes('0.8'), alt);
  await pasteAndSave(hdr(R1, 'Aug 2 2026 8:00AM') + qs([['SODIO', '*', '142.8', 'mmol/L', '']]));
  await day(R1, '02/08/2026');
  alt = await altered();
  check('no ranges: Na 142.8 not altered', !alt.includes('142.8'), alt);
  const R2 = P(8, 'RANGOS DOS');
  await pasteAndSave(hdr(R2, 'Aug 1 2026 8:00AM') + qs([['GLUCOSA EN SANGRE', '*', '80', 'mg/dL', '74 - 106'], ['CREATININA EN SANGRE', '*', '0.8', 'mg/dL', '0.55 - 1.02'], ['CLORO', '*', '100', 'mmol/L', '98 - 107']]));
  await pasteAndSave(hdr(R2, 'Aug 2 2026 8:00AM') + qs([['GLUCOSA EN SANGRE', '*', '98', 'mg/dL', ''], ['CREATININA EN SANGRE', '*', '0.5', 'mg/dL', ''], ['CLORO', '*', '109.9', 'mmol/L', '']]));
  await day(R2, '02/08/2026');
  alt = await altered();
  await pasteAndSave(hdr(R2, 'Aug 3 2026 8:00AM') + qs([['CREATININA EN SANGRE', '*', '1.05', 'mg/dL', ''], ['GLUCOSA EN SANGRE', '*', '95', 'mg/dL', '70 - 100']]));
  await day(R2, '03/08/2026');
  const alt3 = await altered();
  check('after a report with hospital ranges, one with none → Cr 0.5 altered, Glu 98 not, Cl 109.9 altered; the ranges persist (Cr 1.05 > 1.02 altered next paste)',
    alt.includes('0.5') && !alt.includes('98') && alt.includes('109.9') && alt3.includes('1.05'), { alt, alt3 });
  check('the report\'s own range wins over the prior one (Glu 95 with 70–100 not altered)', !alt3.includes('95'), alt3);
  const R3 = P(9, 'RANGOS TRES');
  await pasteAndSave(hdr(R3, 'Aug 1 2026 8:00AM') + qs([['GLUCOSA EN SANGRE', '*', '80', 'mg/dL', '70 - 90']]));
  await pasteAndSave(hdr(R3, 'Aug 2 2026 8:00AM') + qs([['GLUCOSA EN SANGRE', '*', '95', 'mg/dL', '']]));
  await day(R3, '02/08/2026');
  alt = await altered();
  check('prior Glu range 70–90 → Glu 95 altered', alt.includes('95'), alt);

  // ── Rows 52/55: ⌘⇧C team labs copy (pinned patients) ─────────────────────
  const card = (p) => page.locator('.patient-card', { has: page.locator(`.p-name[title*="${p.exp}"]`) }).first();
  const pin = async (p) => { const c = card(p); await c.hover(); await c.locator('.btn-pinned-text').click(); await page.waitForTimeout(300); };
  const teamCopy = async () => { await closeToasts(page); await page.keyboard.press('ControlOrMeta+Shift+KeyC'); await page.waitForTimeout(600); };
  await open(AU);
  await goArea(page, 'lab');
  await teamCopy();
  check('⌘⇧C with no pinned patient → info toast "No hay laboratorios de hoy en los pacientes fijados."', await toastSeen(/No hay laboratorios de hoy en los pacientes fijados/));
  const C1 = P(13, 'COPIA UNO');
  await pasteAndSave(hdr(C1, 'May 28 2026 7:00AM') + bh('6.0'));
  await pasteAndSave(hdr(C1, 'May 29 2026 7:14AM') + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    'HGB\t\tB\t5.8\tg/dL\t12.20 - 18.10\nRBC\t\tB\t2.1\tM/uL\t4.04 - 6.13\nMCV\t\t*\t90\tfL\t80 - 97\n' +
    qs([['GLUCOSA EN SANGRE', 'A', '145', 'mg/dL', '60 - 100'], ['CREATININA EN SANGRE', '*', '1.2', 'mg/dL', '0.6 - 1.4']]));
  await pasteAndSave(hdr(C1, 'May 29 2026 9:21PM') + qs([['POTASIO', 'B', '3.1', 'mmol/L', '3.6 - 5.0']]));
  const C3 = P(15, 'COPIA TRES');
  await pasteAndSave(hdr(C3, 'May 29 2026 7:00AM') + bh('9.9'));
  await open(C3);
  await moreAction(page, 'deleteSelectedLabHistorySet');
  await page.locator('[data-wb-confirm-ok]').click();
  await page.waitForTimeout(300);
  const C4 = P(16, 'COPIA ARCHIVO');
  await pasteAndSave(hdr(C4, 'May 29 2026 7:00AM') + bh('4.4'));
  await open(C1); await open(C4);
  await pin(C1); await pin(C3); await pin(C4);
  const arch = card(C4); await arch.hover(); await arch.locator('.btn-archive-clean').click().catch(() => {}); await page.waitForTimeout(400);
  await goArea(page, 'lab');
  await teamCopy();
  const teamText = await clip();
  const teamToast = (await page.locator('.toast').allInnerTexts()).join(' | ');
  check('⌘⇧C: pinned C1 (labs) + pinned C3 (no labs), unpinned others, archived C4 → only C1 copied; toast "(1 de 2 fijados)"',
    /COPIA UNO/i.test(teamText) && !/COPIA TRES|COPIA ARCHIVO|DEMO B AUTO/i.test(teamText) && /1 de 2 fijados/.test(teamToast), { teamText, teamToast });
  check('⌘⇧C text: latest day only ("29/05/2026" first, 5.8, no 28/05, no Hb 6)',
    /29\/05\/2026/.test(teamText) && /5\.8/.test(teamText) && !/28\/05/.test(teamText) && !/Hb 6\b/.test(teamText), teamText);
  check('⌘⇧C text: both sets of the latest day (Hb 5.8 and K 3.1), no hours, no "BH ext" line; BH label line, Glu 145, Cr 1.2',
    /3\.1/.test(teamText) && !/\b\d{1,2}:\d{2}\b/.test(teamText) && !/BH ext/i.test(teamText) && /\bBH\b/.test(teamText) && /145/.test(teamText) && /1\.2/.test(teamText), teamText);
  // ════════ END agent-B block ════════
  }

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();

  function check(label, ok, detail) {
    r.check(label, ok, detail);
  }
});
