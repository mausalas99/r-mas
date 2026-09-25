#!/usr/bin/env node
/* global document */
/**
 * E2E: the Cultivos screen and "Actualizar" (ask the lab repository for a
 * missing antibiogram), driven through the real Electron app. Synthetic DEMO
 * culture reports (tour pitch) re-labelled to a made-up expediente.
 *
 * Ways it can go wrong (each one is a check below):
 *   Table
 *     - a report with 2 or 3 organisms shows fewer rows
 *     - the same report pasted twice shows twice
 *     - a glued study keyword ("UROCULTIVOPOR SONDA") shows glued
 *     - ESBL / carbapenemase (Carb-R) flags are lost
 *     - a negative culture is mixed into the positive rows, or not counted
 *     - the × on a culture does not remove it
 *     - the R chip panel does not open from the keyboard, or stays open after
 *     - the R/I/S chip list is not split into Resistencias/Indeterminado/
 *       Sensible, or Sensible is not sorted by CMI ascending
 *     - a PDF-extracted report with glued rows (no separators between the
 *       organism name, "ANTIBIOGRAMA" and each drug/CMI/interpretation)
 *       loses an organism or its antibiogram
 *     - "Actualizar" appends a fuller antibiogram to a culture already in
 *       history: the row keeps the earlier, ATB-less copy, or shows two rows
 *     - a preliminary report with no organism (coprocultivo, "MICROBIOTA
 *       COLIBACILAR NORMAL AUSENTE") is dropped, or its text is cut with a
 *       trailing comma
 *     - baciloscopia + cultivo de micobacterias from the same paste collapse
 *       into one row, or the sample site ("TEJIDO DE LENGUA") is lost
 *   Actualizar (repository)
 *     - a positive culture with no antibiogram is not counted as pending
 *     - the repository is asked for the wrong expediente or the wrong day
 *     - no network / nothing new / new result each show the wrong message
 *     - the antibiogram that arrives does not reach the table
 *     - the button still says "pending" after the antibiogram arrived
 *
 * Artifact: e2e-artifacts/cultivos/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:cultivos
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient } from './harness.mjs';
import { header } from './some-fixtures.mjs';
import {
  PITCH_CULTIVO_URO_SOME,
  PITCH_CULTIVO_PERITONEAL_SOME,
  PITCH_CULTIVO_ASPIRADO_1805_SOME,
  PITCH_CULTIVO_ASPIRADO_2804_SOME,
  PITCH_CULTIVO_HEMO_SOME,
} from '../../public/js/tour-pitch-cultivos-some.mjs';

const P = { exp: '7000004-4', name: 'DEMO CULTIVOS', room: '304' };
const mine = (t) => t.replace(/9000095-7/g, P.exp).replace(/DEMO PÉREZ JUAN/g, P.name);

// PDF extraction glues rows with no separators: "MICROORGANISMO*Escherichia
// coli", "ANTIBIOGRAMA*AMP/SULBACTAM16/8I" then "*AMIKACINA<=16S" per line.
const GLUED_URO_2G =
  header(P, 'May 12 2026 9:00AM') +
  [
    'BACTERIOLOGIA',
    'UROCULTIVO POR SONDA',
    'PRODUCTO*',
    'MICROORGANISMO*Escherichia coli',
    'COMENTARIO:*',
    'CUENTA DE KASS*25,000 UFC/mL',
    'ANTIBIOGRAMA*AMP/SULBACTAM16/8I',
    '*AMIKACINA<=16S',
    '*AMPICILINA>16R',
    '*',
    'MICROORGANISMO*Enterococcus faecalis',
    'COMENTARIO:*',
    'CUENTA DE KASS*+100,000 UFC/mL',
    'ANTIBIOGRAMA*AMPICILINA<=2S',
    '*NITROFURANTOINA<=32S',
    '*PENICILINA8S',
    '*',
    'MICROORGANISMO*',
    'COMENTARIO:*',
  ].join('\n');

const COPRO_PRELIM =
  header(P, 'May 13 2026 4:20PM') +
  'BACTERIOLOGIA\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'COPROCULTIVO\n' +
  'PRODUCTO\t\n*\n' +
  'TINCION DE GRAM\t\n*\n' +
  'CALIDAD DE LA MUESTRA\t\n*\n' +
  'ESTADO DE CULTIVO\t\n*\n' +
  'REPORTE PRELIMINAR, MICROBIOTA COLIBACILAR NORMAL AUSENTE\n*\n' +
  'MICROORGANISMO\t\n*\n' +
  'COMENTARIO:\t\n*\n' +
  'CUENTA\t\n*';

const MICOBACT =
  header(P, 'May 14 2026 9:37AM') +
  'MYCOBACTERIAS\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'BACILOSCOPIA DE PRODUCTOS DIVERSOS (1 MUESTRA)\n' +
  '1 MUESTRA\t\n*\n' +
  'NEGATIVO\n' +
  'OBSERVACIONES\t\n*\n' +
  'TEJIDO DE LENGUA\n' +
  'CULTIVO DE MICOBACTERIAS (POR MUESTRA)\n' +
  'SECCION DE MICOBACTERIAS\t\n*\n' +
  'REPORTE PRELIMINAR MOP-647-07-RC-052\n' +
  'CULTIVO\t\n*\n' +
  'NEGATIVO A LA FECHA.';

// "Actualizar" re-asks the repository and appends (not replaces) the same
// culture: the early copy has no antibiogram yet, the later one does.
const KLEB_EARLY =
  header(P, 'May 15 2026 8:00AM') +
  'BACTERIOLOGIA\n' +
  'UROCULTIVO POR SONDA\n' +
  'PRODUCTO\t\n*\n' +
  'MICROORGANISMO\t\n*\n' +
  'Klebsiella pneumoniae\n' +
  'CUENTA DE KASS\t\n*\n' +
  '25,000 UFC/mL\n';
const KLEB_WITH_ATB =
  header(P, 'May 15 2026 8:00AM') +
  'BACTERIOLOGIA\n' +
  'UROCULTIVO POR SONDA\n' +
  'PRODUCTO\t\n*\n' +
  'MICROORGANISMO\t\n*\n' +
  'Klebsiella pneumoniae\n' +
  'CUENTA DE KASS\t\n*\n' +
  '25,000 UFC/mL\n' +
  'ANTIBIOGRAMA\t\n*\n' +
  'CEFTRIAXONA\n>32\tR\n' +
  'CIPROFLOXACINA\n1\tI\n' +
  'GENTAMICINA\n8\tS\n' +
  'AMIKACINA\n<=2\tS\n' +
  'IMIPENEM\n<=1\tS\n' +
  'MEROPENEM\n<=1\tS\n' +
  'PIP/TAZO\n<=16\tS\n' +
  'NITROFURANTOINA\n<=32\tS\n' +
  'TRIMET/SULFA\n<=2/38\tS\n' +
  'CEFEPIMA\n8\tI\n' +
  'LEVOFLOXACINA\n<=2\tS\n' +
  'COLISTINA\n<=1\tS\n';

const URO = mine(PITCH_CULTIVO_URO_SOME);
const URO_GLUED = mine(PITCH_CULTIVO_URO_SOME)
  .replace('05/05/2026 06:16:18 p. m.', '10/05/2026 09:00:00 a. m.')
  .replace('2605050805', '2605100901')
  .replace('UROCULTIVO POR SONDA', 'UROCULTIVOPOR SONDA')
  .replace('50,000 UFC/mL', '80,000 UFC/mL');
const PERITONEAL_FINAL = mine(PITCH_CULTIVO_PERITONEAL_SOME);
const PERITONEAL_PRELIM = PERITONEAL_FINAL.slice(0, PERITONEAL_FINAL.indexOf('ANTIBIOGRAMA'));
const NEG_HEMO = mine(PITCH_CULTIVO_HEMO_SOME.split('\nBACTERIOLOGIA')[0])
  .replace('11/04/2026 08:00:00 a. m.', '20/04/2026 08:00:00 a. m.')
  .replace('2605000001', '2604200777') +
  '\nBACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nPERIFERICO DERECHO\nRESULTADO\n*\nNO HAY CRECIMIENTO A LOS 5 DIAS\n';

const r = createRun('cultivos');
const { check } = r;

await r.finish('Cultivos table + Actualizar', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();

  await pasteAndSave(page, URO); // one report, new expediente: admitted straight away
  await openPatient(page, P);
  await page.locator('#apptab-lab').click();
  await pasteAndSave(
    page,
    [URO_GLUED, mine(PITCH_CULTIVO_ASPIRADO_1805_SOME), mine(PITCH_CULTIVO_ASPIRADO_2804_SOME),
      mine(PITCH_CULTIVO_HEMO_SOME), NEG_HEMO, PERITONEAL_PRELIM].join('\n\n')
  );
  await pasteAndSave(page, mine(PITCH_CULTIVO_ASPIRADO_2804_SOME)); // the same report again

  const container = page.locator('#cultivos-table-container');
  async function openCultivos() {
    await closeToasts(page);
    if (!(await page.locator('#lab-inner-cult-btn').isVisible())) await page.locator('#apptab-lab').click();
    await page.locator('#lab-inner-cult-btn').click();
    await container.locator('.cultivos-table').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
  }
  const tableRows = () =>
    container.locator('.cultivos-table tr:not(.cultivos-section-row)').evaluateAll((trs) =>
      trs.filter((tr) => tr.querySelector('td')).map((tr) => ({
        neg: tr.classList.contains('cultivos-row-neg'),
        cells: [...tr.querySelectorAll('td')].slice(0, 4).map((td) => td.innerText.replace(/\s+/g, ' ').trim()),
      }))
    );

  await openCultivos();
  await r.shot(page, 'cultivos');
  let rows = await tableRows();
  const byDate = (d) => rows.filter((x) => x.cells[0].startsWith(d));
  check('aspirado 18/05 shows 2 organisms', byDate('18/05').length === 2, byDate('18/05'));
  check('aspirado 28/04 shows 3 organisms once (pasted twice)', byDate('28/04').length === 3, byDate('28/04'));
  const coli = rows.find((x) => /Escherichia coli/i.test(x.cells[2]));
  check('E. coli carries ESBL', !!coli && /ESBL|BLEE/i.test(coli.cells.join(' ')), coli);
  const uro = byDate('05/05')[0];
  check('carbapenemase urocultivo is flagged Carb-R', !!uro && /Carb-?R|carbapenem/i.test(uro.cells.join(' ')), uro);
  const glued = byDate('10/05')[0];
  check('glued "UROCULTIVOPOR SONDA" shows spaced', !!glued && /UROCULTIVO POR SONDA/i.test(glued.cells[1] + ' ' + (await container.innerText())) &&
    !/UROCULTIVOPOR/i.test(await container.innerText()), glued);

  const negStrip = container.locator('.cultivos-neg-strip');
  const negCount = await negStrip.locator('.cultivos-neg-count').innerText().catch(() => '');
  const negChips = await negStrip.locator('.cultivos-neg-chip').allInnerTexts().catch(() => []);
  check('negative hemocultivo is in the "Cultivos negativos" strip (1)', negCount.trim() === '1' && /20\/04/.test(negChips.join(' ')), { negCount, negChips });
  check('negative is not a positive row', !rows.some((x) => !x.neg && x.cells[0].startsWith('20/04')), byDate('20/04'));

  // Positive hemocultivo, periférico site, BLEE Pseudomonas.
  const hemoPos = byDate('11/04');
  check('positive hemocultivo (periférico izquierdo, Pseudomonas) shows one row',
    hemoPos.length === 1 && /PERIFERICO IZQUIERDO/i.test(hemoPos[0].cells[1]) &&
    /Pseudomonas/i.test(hemoPos[0].cells[2]) && /\bR\b/.test(hemoPos[0].cells[3]), hemoPos);

  // R chip panel from the keyboard.
  const chip = container.locator('.atb-chip--r').first();
  const panelOpen = () =>
    page.evaluate(() => [...document.querySelectorAll('.atb-ris-hover-panel')].some((p) => p.classList.contains('is-open')));
  await page.mouse.move(1, 1);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.waitForTimeout(300);
  const closedAtRest = !(await panelOpen());
  await chip.focus();
  await page.waitForTimeout(300);
  const openOnFocus = await panelOpen();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const openAfterEnter = await panelOpen();
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.waitForTimeout(400);
  const closedOnLeave = !(await panelOpen());
  check('R chip panel: closed at rest, opens by keyboard, closes when focus leaves',
    closedAtRest && openOnFocus && openAfterEnter && closedOnLeave, { closedAtRest, openOnFocus, openAfterEnter, closedOnLeave });
  await r.shot(page, 'atb-panel');

  // ── More real-world report shapes ─────────────────────────────────────────
  // #btn-lab-paste lives in the Labs sub-panel, hidden while Cultivos is active.
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, GLUED_URO_2G);
  await pasteAndSave(page, COPRO_PRELIM);
  await pasteAndSave(page, MICOBACT);
  await pasteAndSave(page, KLEB_EARLY);
  await openCultivos();
  rows = await tableRows();
  const glued12 = byDate('12/05');
  check('glued PDF-extraction report: both organisms show (E. coli + Enterococcus)',
    glued12.length === 2 && glued12.some((x) => /coli/i.test(x.cells[2])) && glued12.some((x) => /faecalis/i.test(x.cells[2])), glued12);
  // Drug names live in the (visibility-hidden) hover panel, so read innerHTML, not innerText.
  const coliChips = container.locator('.cultivos-atb-chips', { has: page.locator('text=AMIKACINA') }).first();
  const coliHtml = (await coliChips.count()) ? await coliChips.innerHTML() : '';
  check('glued antibiogram parses: E. coli carries AMIKACINA/AMPICILINA', /AMIKACINA/i.test(coliHtml) && /AMPICILINA/i.test(coliHtml), coliHtml.slice(0, 300));
  check('E. coli chips exclude the Enterococcus-only drugs (no NITROFURANTOINA, no PENICILINA)',
    !/NITROFURANTOINA/i.test(coliHtml) && !/PENICILINA/i.test(coliHtml), coliHtml.slice(0, 300));
  check('E. coli chips carry CMI + interp detail: AMP/SULBACTAM 16/8 I, AMIKACINA <=16 S, AMPICILINA >16 R',
    /AMP\/SULBACTAM/.test(coliHtml) && /16\/8/.test(coliHtml) && />I</.test(coliHtml) &&
    /AMIKACINA/.test(coliHtml) && /(&lt;|<)=16/.test(coliHtml) && />S</.test(coliHtml) &&
    /AMPICILINA/.test(coliHtml) && /(&gt;|>)16/.test(coliHtml) && />R</.test(coliHtml), coliHtml.slice(0, 600));

  const entChips = container.locator('.cultivos-atb-chips', { has: page.locator('text=NITROFURANTOINA') }).first();
  const entHtml = (await entChips.count()) ? await entChips.innerHTML() : '';
  check('Enterococcus chips carry CMI + interp detail: AMPICILINA <=2 S, NITROFURANTOINA <=32 S, PENICILINA 8 S',
    /AMPICILINA/.test(entHtml) && /(&lt;|<)=2\b/.test(entHtml) &&
    /NITROFURANTOINA/.test(entHtml) && /(&lt;|<)=32/.test(entHtml) &&
    /PENICILINA/.test(entHtml) && /CMI<\/span>\s*8\b/.test(entHtml), entHtml.slice(0, 600));

  // "Copiar informe completo" on the glued-PDF rows.
  async function copyFullFor(chipsLocator) {
    await closeToasts(page);
    const wrap = container.locator('.cultivos-atb-wrap', { has: chipsLocator });
    await wrap.locator('.cultivos-copy-full-btn').first().click();
    await page.waitForTimeout(200);
    return app.evaluate(({ clipboard }) => clipboard.readText());
  }
  const coliCopy = await copyFullFor(page.locator('.cultivos-atb-chips', { has: page.locator('text=AMIKACINA') }).first());
  check('"Copiar informe completo" on the glued-PDF E. coli row → "ATB R: AMP | I: AMP-SULB | S: AMIK"',
    /ATB R: AMP \| I: AMP-SULB \| S: AMIK/.test(coliCopy), coliCopy);
  const entCopy = await copyFullFor(page.locator('.cultivos-atb-chips', { has: page.locator('text=NITROFURANTOINA') }).first());
  check('"Copiar informe completo" on the glued-PDF Enterococcus row → "ATB S: AMP, NITRO, PEN"',
    /ATB S: AMP, NITRO, PEN/.test(entCopy), entCopy);

  // A preliminary coprocultivo with no MICROORGANISMO value still gets its own row
  // (COPROCULTIVO was missing from the cultivo-start lists, so the block was dropped).
  const copro13 = byDate('13/05');
  check('coprocultivo preliminar (no organism) still shows a row', copro13.length === 1, copro13);
  check('13/05 coprocultivo row: type cell (Sitio / muestra) shows COPROCULTIVO',
    copro13.length === 1 && copro13[0].cells[1] === 'COPROCULTIVO', copro13);
  check('coprocultivo text keeps MICROBIOTA COLIBACILAR NORMAL AUSENTE, no trailing comma',
    copro13.length === 1 && /MICROBIOTA COLIBACILAR NORMAL AUSENTE/i.test(copro13[0].cells.join(' ')) &&
    !/PRELIMINAR,\s*(<|$)/i.test(copro13[0].cells.join(' ')), copro13);

  const mico14 = byDate('14/05');
  const mico14Text = mico14.map((x) => x.cells.join(' ')).join(' ');
  check('baciloscopia + cultivo de micobacterias: 2 separate rows', mico14.length === 2, mico14);
  check('micobacterias sample site (TEJIDO DE LENGUA) is kept, not confused with "1 MUESTRA"',
    /TEJIDO DE LENGUA/i.test(mico14Text) && !/CULTIVO \(1 MUESTRA\)/i.test(await container.innerText()), mico14);

  const kleb15Early = byDate('15/05');
  check('Klebsiella (no antibiogram yet) shows one row', kleb15Early.length === 1, kleb15Early);

  // "Actualizar" appends the fuller antibiogram to the same culture.
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, KLEB_WITH_ATB);
  await openCultivos();
  rows = await tableRows();
  const kleb15 = byDate('15/05');
  check('after the antibiogram arrives, Klebsiella is still exactly one row', kleb15.length === 1, kleb15);
  const klebChips = container.locator('.cultivos-atb-chips', { has: page.locator('text=CEFTRIAXONA') }).first();
  const klebHtml = (await klebChips.count()) ? await klebChips.innerHTML() : '';
  check('Klebsiella row now carries the antibiogram (not the ATB-less early copy)', /CEFTRIAXONA/i.test(klebHtml), klebHtml.slice(0, 200));
  check('R/I/S chips are split into Resistencias / Indeterminado / Sensible',
    /Resistencias/.test(klebHtml) && /Indeterminado/.test(klebHtml) && /Sensible/.test(klebHtml), klebHtml.slice(0, 400));
  const idxAmik = klebHtml.indexOf('>AMIKACINA<');
  const idxGent = klebHtml.indexOf('>GENTAMICINA<');
  check('Sensible drugs sort by CMI ascending (AMIKACINA CMI 2 before GENTAMICINA CMI 8)',
    idxAmik >= 0 && idxGent >= 0 && idxAmik < idxGent, { idxAmik, idxGent });
  // `has: klebChips` matched nothing (klebChips is itself container-scoped) — anchor
  // on the same page-level locator klebChips used, like coliChips above.
  const copyBtn = container
    .locator('.cultivos-atb-wrap', { has: page.locator('text=CEFTRIAXONA') })
    .locator('.cultivos-copy-full-btn');
  await closeToasts(page);
  await copyBtn.first().click();
  const copyToast = page.locator('.toast', { hasText: /copiad/i }).first();
  check('"Copiar informe completo" confirms with a toast', await copyToast.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false));
  await r.shot(page, 'more-formats');

  // ── Actualizar: the peritoneal culture has no antibiogram yet ────────────
  const refresh = container.locator('.cultivo-refresh-repo-btn');
  const title = await refresh.getAttribute('title');
  check('button counts 1 culture with ATB pending', /para 1 cultivo con ATB pendiente/.test(title || ''), title);

  const toastText = async (re) => {
    const t = page.locator('.toast', { hasText: re }).first();
    return t.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
  };
  const reply = (res) => app.evaluate((_e, v) => { globalThis.__e2e.repoReplies.push(v); }, res);
  const press = async () => {
    await closeToasts(page);
    await refresh.click();
  };

  await reply({ studies: [], errors: [{ message: 'fetch failed: ECONNREFUSED' }] });
  await press();
  check('no network → "No se pudo conectar"', await toastText(/No se pudo conectar al repositorio de laboratorio/));
  const calls = await app.evaluate(() => globalThis.__e2e.repoCalls);
  const call = calls[calls.length - 1] || {};
  const day = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
  check('repository asked for this expediente, around 07/05', call.registro === P.exp &&
    new Date(call.desde) <= new Date('2026-05-07T23:59:59') && new Date(call.hasta) >= new Date('2026-05-07T00:00:00'),
  { registro: call.registro, desde: call.desde && day(call.desde), hasta: call.hasta && day(call.hasta) });

  await reply({ studies: [], errors: [] });
  await press();
  check('nothing new → "Sin resultados nuevos"', await toastText(/Sin resultados nuevos en esa fecha/));

  await reply({ studies: [{ text: PERITONEAL_FINAL }], errors: [] });
  await press();
  check('antibiogram arrives → "Labs actualizados"', await toastText(/Labs actualizados/));
  await page.waitForTimeout(800);
  await openCultivos();
  rows = await tableRows();
  const perit = byDate('07/05');
  await r.shot(page, 'after-refresh');
  check('peritoneal row now has its antibiogram (R chip)', perit.length === 1 && /\bR\b/.test(perit[0].cells[3]), perit);

  // Group + count: the peritoneal row sits under "Otros cultivos" and shows its Cuenta.
  const groupedRows = await container.locator('.cultivos-table tr').evaluateAll((trs) =>
    trs.reduce((acc, tr) => {
      if (tr.classList.contains('cultivos-section-row')) { acc.group = tr.textContent.trim(); return acc; }
      if (!tr.querySelector('td')) return acc;
      acc.rows.push({
        group: acc.group,
        fecha: tr.querySelectorAll('td')[0].innerText.trim(),
        cuenta: !!tr.querySelector('.cultivos-cuenta'),
        cuentaText: tr.querySelector('.cultivos-cuenta')?.innerText.trim() || '',
      });
      return acc;
    }, { group: '', rows: [] }).rows
  );
  const peritGrouped = groupedRows.find((x) => x.fecha.startsWith('07/05'));
  check('peritoneal row sits in the "Otros cultivos" group and shows its Cuenta',
    !!peritGrouped && peritGrouped.group === 'Otros cultivos' && peritGrouped.cuenta && /120,000/.test(peritGrouped.cuentaText),
    peritGrouped);

  // Sala mode censo export preview: one condensed Cultivos line, no "/2026", no full uppercase organism.
  await page.locator('#btn-export-censo-sidebar').click();
  await page.locator('#censo-export-preview').click();
  const censoFrame = page.frameLocator('#censo-preview-frame');
  await censoFrame.locator('body').waitFor({ state: 'attached' });
  const censoText = await censoFrame.locator('body').innerText();
  // Censo caps at CENSO_MAX_CULTIVO_REPORTS (3, most recent first) — by the time
  // this scenario runs, 07/05's peritoneal report has aged out; 15/05's Klebsiella
  // urocultivo is the freshest one still inside the cap.
  const cultLine = censoText.split('\n').map((l) => l.trim()).find((l) => /UROC POR SONDA/.test(l));
  check('censo preview Cultivos line: "UROC POR SONDA 15/05: K. pneumoniae · ATB … · Cuenta: …", no "/2026", no full uppercase organism',
    !!cultLine && /^UROC POR SONDA 15\/05: K\. pneumoniae/.test(cultLine) && /ATB R:/.test(cultLine) &&
    /Cuenta: 25,000 UFC\/ML/.test(cultLine) && !/\/2026/.test(cultLine) && !/KLEBSIELLA PNEUMONIAE/.test(cultLine),
    cultLine);
  await r.shot(page, 'censo-preview');
  await page.locator('#censo-preview-close').click();
  // "Vista previa" stacks the preview over the "Exportar censo" dialog without
  // closing it, so the dialog is still open (and blocking clicks) underneath.
  await page.locator('#censo-export-cancel').click();

  const title2 = await refresh.getAttribute('title');
  check('button no longer pending', /no hay cultivos con ATB pendiente/i.test(title2 || ''), title2);
  await press();
  check('pressing it anyway → "No hay cultivos con ATB pendiente"', await toastText(/No hay cultivos con ATB pendiente en este paciente/));

  // Remove the negative hemocultivo with its × (MICOBACT above also left 2 negative
  // rows in the strip, so this only checks that THIS chip is gone, not an empty strip).
  await closeToasts(page);
  const hemoNegChip = negStrip.locator('.cultivos-neg-chip', { hasText: '20/04' });
  await hemoNegChip.locator('.cultivos-row-remove-btn').click();
  const confirmOk = page.locator('.wb-confirm-modal [data-wb-confirm-ok]');
  if (await confirmOk.isVisible({ timeout: 1500 }).catch(() => false)) await confirmOk.click();
  await page.waitForTimeout(600);
  await openCultivos();
  check('× removes the negative culture', (await negStrip.locator('.cultivos-neg-chip', { hasText: '20/04' }).count()) === 0);
  await r.shot(page, 'after-remove');

  // ── More report shapes (labs-cultivo-scan / labs-cultivo-from-tests gaps) ──
  const TAB_LABEL_URO =
    header(P, 'Jun 16 2026 8:00AM') +
    'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\n\tMICROORGANISMO\t\n*\nEscherichia coli\nCOMENTARIO:\n\tCUENTA DE KASS\t\n*\n25,000 UFC/mL\n';
  const DOUBLE_LABEL_RASPADO =
    header(P, 'Jun 17 2026 8:00AM') +
    'BACTERIOLOGIA\nRASPADO CORNEAL\nPRODUCTO\nMICROORGANISMO\tMICROORGANISMO\n*\nSalmonella enterica\nCOMENTARIO:\n';
  const TINCION_NOT_SAMPLE =
    header(P, 'Jun 18 2026 8:00AM') +
    'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\n*\nTINCION DE GRAM\n*\nMICROORGANISMO\n*\nEscherichia coli\nCOMENTARIO:\n*\nCUENTA DE KASS\n*\n+100,000 UFC/mL\n';
  const HEMO_CATETER_NIAGARA =
    header(P, 'Jun 19 2026 8:00AM') +
    'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nCATETER NIAGARA\nMICROORGANISMO\n*\n';
  const CATETER_PUNTA_CVC =
    header(P, 'Jun 20 2026 8:00AM') +
    'BACTERIOLOGIA\nCATETER\nPRODUCTO\n*\nPUNTA CVC\nMICROORGANISMO\n*\nPseudomonas aeruginosa\n';
  const SECRECION_HERIDA =
    header(P, 'Jun 21 2026 8:00AM') +
    'BACTERIOLOGIA\nSECRECION DE HERIDA\nPRODUCTO\n*\nHERIDA DE TRAQUEOSTOMIA\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nANTIBIOGRAMA\n*\nCEFTAZIDIMA\n4\tS\nCIPROFLOXACINA\n<=1\tS\n';
  const NDM1_KLEB =
    header(P, 'Jun 22 2026 8:00AM') +
    'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nMICROORGANISMO\n*\nKlebsiella pneumoniae\nCOMENTARIO:\n*\nPRODUCTOR DE NDM-1\nCUENTA DE KASS\n*\n+10,000 UFC/mL\n';
  const CARBR_ACINETO =
    header(P, 'Jun 23 2026 8:00AM') +
    'BACTERIOLOGIA\nMICROORGANISMO\n*\nAcinetobacter baumannii\nCOMENTARIO:\n*\nRESISTENTE A CARBAPENEMICOS\n';
  const G1_LIKE_ASPIRADO =
    header(P, 'Jun 24 2026 8:00AM') +
    'BACTERIOLOGIA\nASPIRADO TRAQUEAL\nPRODUCTO\n*\nMICROORGANISMO\n*\nEscherichia coli\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nCEFTRIAXONA\n>32\tESBL\nAMIKACINA\n<=16\tS\n' +
    'MICROORGANISMO\n*\nAcinetobacter baumannii complex\nCUENTA\n*\n80,000 UFC/mL\nANTIBIOGRAMA\n*\nIMIPENEM\n>4\tR\nCOLISTINA\n<=2\tI\n';
  const G3_LIKE_ASPIRADO =
    header(P, 'Jun 25 2026 8:00AM') +
    'BACTERIOLOGIA\nASPIRADO TRAQUEAL\nMICROORGANISMO\n*\nEscherichia coli\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n100,000 UFC/mL\nANTIBIOGRAMA\n*\nCEFTRIAXONA\n>32\tESBL\n' +
    'MICROORGANISMO\n*\nStaphylococcus aureus\nCUENTA\n*\n20,000 UFC/mL\nANTIBIOGRAMA\n*\nPENICILINA\n>8\tBLAC\nVANCOMICINA\n1\tS\n' +
    'MICROORGANISMO\n*\nProteus mirabilis\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n100 UFC/mL\nANTIBIOGRAMA\n*\nPIP/TAZO\n<=16\tS\n';
  const G4_LIKE_PERITONEAL =
    header(P, 'Jun 26 2026 8:00AM') +
    'BACTERIOLOGIA\nLIQUIDO PERITONEAL\nPRODUCTO\n*\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nANTIBIOGRAMA\n*\nCIPROFLOXACINA\n<=1\tS\nIMIPENEM\n2\tS\n' +
    'MICROORGANISMO\n*\nCOMENTARIO:\n*\nCUENTA\n*\n';
  const CMI_SORT_URO =
    header(P, 'Jun 27 2026 8:00AM') +
    'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nMICROORGANISMO\n*\nEscherichia coli\nCUENTA DE KASS\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nCEFTAZIDIMA\n>=256\tR\nMEROPENEM\n≥64\tR\nAMIKACINA\n<=8\tS\n';
  const PRELIM_NO_DATE =
    header(P, 'Jun 28 2026 5:11PM') +
    'BACTERIOLOGIA\nASPIRADO TRAQUEAL\nESTADO DE CULTIVO\n*\nREPORTE PRELIMINAR\n*\nMICROORGANISMO\n*\nProteus mirabilis\nCUENTA\n*\n+100,000 UFC/mL\n';
  const CULTURE_THEN_BH =
    header(P, 'Jun 29 2026 8:00AM') +
    'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nMICROORGANISMO\n*\nEscherichia coli\nCUENTA DE KASS\n*\n40,000 UFC/mL\n' +
    'BH\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nHB\t*\t13.5\tg/dL\t12-16\n';
  const HEMO_POS_PAIR =
    header(P, 'Jun 30 2026 8:00AM') +
    'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nPERIFERICO IZQUIERDO\nMICROORGANISMO\n*\nStaphylococcus epidermidis\n';
  const HEMO_NEG_PAIR =
    header(P, 'Jul 1 2026 8:00AM') +
    'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nPERIFERICO IZQUIERDO\nRESULTADO\n*\nNO HAY CRECIMIENTO A LOS 5 DIAS\n';
  const G5_LIKE_PRELIM =
    header(P, 'Jul 2 2026 8:00AM') +
    'BACTERIOLOGIA\nASPIRADO TRAQUEAL\nESTADO DE CULTIVO\n*\nREPORTE PRELIMINAR\n*\n' +
    'MICROORGANISMO\n*\nAcinetobacter baumannii\nCOMENTARIO:\n*\nCUENTA\n*\n+100,000 UFC/mL\n*\n' +
    'MICROORGANISMO\n*\nProteus mirabilis\nCOMENTARIO:\n*\nCUENTA\n*\n+100,000 UFC/mL\n*\n' +
    'MICROORGANISMO\n*\nCOMENTARIO:\n*\nCUENTA\n*\n*\n' +
    'MICROORGANISMO\n*\nStenotrophomonas maltophilia\nCOMENTARIO:\n*\nCUENTA\n*\n50,000 UFC/mL\n*\n' +
    'MICROORGANISMO\n*\nCOMENTARIO:\n*\nCUENTA\n*\n*';

  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, [
    TAB_LABEL_URO, DOUBLE_LABEL_RASPADO, TINCION_NOT_SAMPLE, HEMO_CATETER_NIAGARA, CATETER_PUNTA_CVC,
    SECRECION_HERIDA, NDM1_KLEB, CARBR_ACINETO, G1_LIKE_ASPIRADO, G3_LIKE_ASPIRADO, G4_LIKE_PERITONEAL,
    CMI_SORT_URO, PRELIM_NO_DATE, CULTURE_THEN_BH, HEMO_POS_PAIR, HEMO_NEG_PAIR, G5_LIKE_PRELIM,
  ].join('\n\n'));
  await openCultivos();
  rows = await tableRows();
  const wholeText = await container.innerText();

  check('leading-tab "\\tMICROORGANISMO\\t" label: organism reads Escherichia coli, not the label',
    byDate('16/06').length === 1 && /Escherichia coli/i.test(byDate('16/06')[0].cells[2]), byDate('16/06'));
  check('glued double MICROORGANISMO label: falls through to the real germ (Salmonella enterica)',
    byDate('17/06').length === 1 && /Salmonella enterica/i.test(byDate('17/06')[0].cells[2]) &&
    !/^MICROORGANISMO/i.test(byDate('17/06')[0].cells[2] || ''), byDate('17/06'));
  check('TINCION DE GRAM is not used as the sample (sitio/tipo cell)',
    byDate('18/06').length === 1 && !/TINCION/i.test(byDate('18/06')[0].cells[1]), byDate('18/06'));
  check('HEMOCULTIVO (CATETER NIAGARA): a row with that site',
    byDate('19/06').length === 1 && /CATETER NIAGARA/i.test(byDate('19/06')[0].cells[1]), byDate('19/06'));
  check('CATETER (PUNTA CVC): a row with that site',
    byDate('20/06').length === 1 && /PUNTA CVC/i.test(byDate('20/06')[0].cells[1]), byDate('20/06'));
  check('SECRECION DE HERIDA: a row',
    byDate('21/06').length === 1 && /Pseudomonas/i.test(byDate('21/06')[0].cells[2]), byDate('21/06'));
  // The flag parser normalizes carbapenemase subtypes to their family code
  // (KPC/NDM/VIM/IMP, no "-1"/"-48" suffix) — same convention as OXA-48 → MBL family below.
  check('NDM-1 report → NDM flag', byDate('22/06').length === 1 && /\bNDM\b/i.test(byDate('22/06')[0].cells.join(' ')), byDate('22/06'));
  check('"RESISTENTE A CARBAPENEMICOS" → Carb-R flag', byDate('23/06').length === 1 && /Carb-?R/i.test(byDate('23/06')[0].cells.join(' ')), byDate('23/06'));

  const g1 = byDate('24/06');
  check('G1 aspirado: 2 organisms, BLEE only on E. coli', g1.length === 2 &&
    g1.some((x) => /coli/i.test(x.cells[2]) && /ESBL|BLEE/i.test(x.cells.join(' '))) &&
    g1.some((x) => /Acinetobacter/i.test(x.cells[2]) && !/ESBL|BLEE/i.test(x.cells.join(' '))), g1);

  const g3 = byDate('25/06');
  check('G3 aspirado: 3 organisms', g3.length === 3, g3);
  // BLAC is a per-drug interpretation code (like S/I/R), not an organism-level
  // resistance mark — it only shows in the chip's hover detail, not the row text.
  // Scope to the S. aureus row itself: PENICILINA also appears on the unrelated
  // Enterococcus row earlier in this scenario.
  const aureusRow = container.locator('.cultivos-table tr', { hasText: 'STAPHYLOCOCCUS AUREUS' });
  const aureusChips = aureusRow.locator('.cultivos-atb-chips').first();
  const aureusHtml = (await aureusChips.count()) ? await aureusChips.innerHTML() : '';
  check('G3 S. aureus PENICILINA chip carries the BLAC interpretation', /BLAC/i.test(aureusHtml), aureusHtml.slice(0, 400));

  check('G4 líquido peritoneal: one organism, empty MICROORGANISMO slot ignored',
    byDate('26/06').length === 1 && /Pseudomonas/i.test(byDate('26/06')[0].cells[2]), byDate('26/06'));

  const g5 = byDate('02/07');
  check('G5 preliminar: 3 rows (empty MICROORGANISMO slots dropped), Preliminar, no ATB',
    g5.length === 3 &&
    g5.some((x) => /Acinetobacter baumannii/i.test(x.cells[2]) && /100,000/.test(x.cells.join(' '))) &&
    g5.some((x) => /Proteus mirabilis/i.test(x.cells[2]) && /100,000/.test(x.cells.join(' '))) &&
    g5.some((x) => /Stenotrophomonas maltophilia/i.test(x.cells[2]) && /50,000/.test(x.cells.join(' '))) &&
    !g5.some((x) => /^R$|^I$|^S$/.test(x.cells[3])), g5);

  const cmiChips = container.locator('.cultivos-atb-chips', { has: page.locator('text=CEFTAZIDIMA') }).first();
  const cmiHtml = (await cmiChips.count()) ? await cmiChips.innerHTML() : '';
  const idxCaz = cmiHtml.indexOf('>CEFTAZIDIMA<');
  const idxMero = cmiHtml.indexOf('>MEROPENEM<');
  check('CMI ">=256" and "≥64" sort as numbers (R bucket: higher CMI first, CEFTAZIDIMA 256 before MEROPENEM 64)',
    idxCaz >= 0 && idxMero >= 0 && idxCaz < idxMero, { idxCaz, idxMero, sample: cmiHtml.slice(0, 400) });

  const prelim = byDate('28/06');
  let prelimCopy = '';
  if (prelim.length === 1) {
    await closeToasts(page);
    await container.locator('tr', { hasText: 'Proteus mirabilis' }).locator('.cultivos-copy-full-btn').first().click();
    await page.waitForTimeout(200);
    prelimCopy = await app.evaluate(({ clipboard }) => clipboard.readText());
  }
  check('preliminary report copy → no "· Preliminar", no date/time',
    !/Preliminar/i.test(prelimCopy) && !/28\/06\/2026|5:11/i.test(prelimCopy), prelimCopy);

  check('culture followed by BH/QS/… in one paste: the culture row holds no lab text',
    byDate('29/06').length === 1 && !/13\.5/.test(byDate('29/06')[0].cells.join(' ')) && !/13\.5/.test(wholeText.split('29/06')[1]?.split('30/06')[0] || ''),
    byDate('29/06'));

  const hemoNeg2 = byDate('01/07');
  check('adjacent negative hemocultivo (same site as a positive draw) shows "Negativo" in the Hemocultivo group',
    hemoNeg2.length === 1 && hemoNeg2[0].neg && /Negativo/i.test(hemoNeg2[0].cells[2]), hemoNeg2);

  check('Service line "SERVICIO DEMO" (header placeholder) never leaks into a cultivo row', !/SERVICIO DEMO/i.test(wholeText));

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
