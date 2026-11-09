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
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, goArea, quietHints } from './harness.mjs';
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
  await quietHints(page); // the ⌘K hint bubble sits over the page toolbar under the top bar
  await onboardLocalOnly(page);
  await goArea(page, 'lab');

  await pasteAndSave(page, URO); // one report, new expediente: admitted straight away
  await openPatient(page, P);
  await goArea(page, 'lab');
  await pasteAndSave(
    page,
    [URO_GLUED, mine(PITCH_CULTIVO_ASPIRADO_1805_SOME), mine(PITCH_CULTIVO_ASPIRADO_2804_SOME),
      mine(PITCH_CULTIVO_HEMO_SOME), NEG_HEMO, PERITONEAL_PRELIM].join('\n\n')
  );
  await pasteAndSave(page, mine(PITCH_CULTIVO_ASPIRADO_2804_SOME)); // the same report again

  const container = page.locator('#cultivos-table-container');
  async function openCultivos() {
    await closeToasts(page);
    if (!(await page.locator('#lab-inner-cult-btn').isVisible())) await goArea(page, 'lab');
    await page.locator('#lab-inner-cult-btn').click();
    await container.locator('.cultivos-table').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    // Negative-only sites start folded; open every site so innerText sees all rows.
    await container.evaluate((el) => el.querySelectorAll('details').forEach((d) => { d.open = true; }));
  }
  const tableRows = () =>
    container.locator('.cultivos-table tr').evaluateAll((trs) =>
      trs.filter((tr) => tr.querySelector('td')).flatMap((tr) => {
        const clean = (el) => (el?.innerText || '').replace(/\s+/g, ' ').trim();
        const td = [...tr.querySelectorAll('td')].map(clean);
        // cells: fecha, sitio (from the site header), organismo, antibiograma. Merged twins give one entry per date.
        const fechas = (tr.dataset.fechas || '').split('|').filter(Boolean);
        return (fechas.length ? fechas : [tr.dataset.fecha || td[0]]).map((f) => ({ neg: tr.classList.contains('cultivos-row-neg'), cells: [f, clean(tr.closest('.cult-site')?.querySelector('.cult-site-title')), td[1], td[2]] }));
      })
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

  // Left and right periférico share one "Periférico · Hemocultivo" site. That site has a
  // positive (11/04), so the 20/04 negative stays in it as a negative row, not in the
  // "Sin aislamientos" fold (which only holds sites with no isolate at all).
  const hemoNeg = byDate('20/04');
  check('negative hemocultivo sits as a negative row in the periférico hemocultivo site',
    hemoNeg.length === 1 && hemoNeg[0].neg && /PERIF[EÉ]RICO · Hemocultivo/i.test(hemoNeg[0].cells[1]), hemoNeg);
  check('negative is not a positive row', !rows.some((x) => !x.neg && x.cells[0].startsWith('20/04')), byDate('20/04'));

  // Positive hemocultivo, periférico site, BLEE Pseudomonas.
  const hemoPos = byDate('11/04');
  check('positive hemocultivo (periférico izquierdo, Pseudomonas) shows one row',
    hemoPos.length === 1 && /PERIF[EÉ]RICO/i.test(hemoPos[0].cells[1]) && /IZQUIERDO/i.test(hemoPos[0].cells[2]) &&
    /Pseudomonas/i.test(hemoPos[0].cells[2]) && /\bR\b/.test(hemoPos[0].cells[3]), hemoPos);

  // No hover panel on Cultivos cards: names are already visible next to each letter.
  const hoverState = await page.evaluate(() => {
    const c = document.getElementById('cultivos-table-container');
    return {
      panels: c.querySelectorAll('.atb-ris-hover-panel').length,
      focusableChips: c.querySelectorAll('.atb-chip[tabindex]').length,
      chips: c.querySelectorAll('.atb-chip').length,
      titledChips: c.querySelectorAll('.atb-chip[title], .cult-atb-ris-names[title], .cult-atb-ris-chip-wrap[title]').length,
    };
  });
  check('Cultivos cards: R/I/S chips have no hover panel, no title',
    hoverState.chips > 0 && hoverState.panels === 0 && hoverState.titledChips === 0, hoverState);
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
  const coliChips = page.locator('tr[data-fechas*="|12/05"]').filter({ hasText: 'ESCHERICHIA COLI' }).locator('.cultivos-atb-chips').first();
  const coliHtml = (await coliChips.count()) ? await coliChips.innerHTML() : '';
  check('glued antibiogram parses: E. coli carries AMIKACINA/AMPICILINA', /AMIKACINA/i.test(coliHtml) && /AMPICILINA/i.test(coliHtml), coliHtml.slice(0, 300));
  check('E. coli chips exclude the Enterococcus-only drugs (no NITROFURANTOINA, no PENICILINA)',
    !/NITROFURANTOINA/i.test(coliHtml) && !/PENICILINA/i.test(coliHtml), coliHtml.slice(0, 300));
  check('E. coli chips show names under R / I / S: Amp/sulbactam I, Amikacina S, Ampicilina R',
    /atb-chip--i/.test(coliHtml) && /atb-chip--s/.test(coliHtml) && /atb-chip--r/.test(coliHtml) &&
    /Amp\/sulbactam/i.test(coliHtml) && /Amikacina/i.test(coliHtml) && /Ampicilina/i.test(coliHtml), coliHtml.slice(0, 600));

  const entChips = container.locator('.cultivos-atb-chips', { has: page.locator('text=NITROFURANTOINA') }).first();
  const entHtml = (await entChips.count()) ? await entChips.innerHTML() : '';
  check('Enterococcus chips show Ampicilina, Nitrofurantoina, Penicilina as sensitive',
    /Ampicilina/i.test(entHtml) && /Nitrofurantoina/i.test(entHtml) && /Penicilina/i.test(entHtml) && /atb-chip--s/.test(entHtml), entHtml.slice(0, 600));

  // "Copiar informe completo" on the glued-PDF rows.
  async function copyFullFor(row) {
    await closeToasts(page);
    await row.hover();
    await row.locator('.cultivos-copy-full-btn').first().click();
    await page.waitForTimeout(200);
    return app.evaluate(({ clipboard }) => clipboard.readText());
  }
  const coliCopy = await copyFullFor(page.locator('tr[data-fechas*="|12/05"]').filter({ hasText: 'ESCHERICHIA COLI' }).first());
  check('"Copiar informe completo" on the glued-PDF E. coli row → "ATB R: AMP | I: AMP-SULB | S: AMIK"',
    /ATB R: AMP \| I: AMP-SULB \| S: AMIK/.test(coliCopy), coliCopy);
  const entCopy = await copyFullFor(page.locator('tr', { has: page.locator('text=NITROFURANTOINA') }).first());
  check('"Copiar informe completo" on the glued-PDF Enterococcus row → "ATB S: AMP, NITRO, PEN"',
    /ATB S: AMP, NITRO, PEN/.test(entCopy), entCopy);

  // A preliminary coprocultivo with no MICROORGANISMO value still gets its own row
  // (COPROCULTIVO was missing from the cultivo-start lists, so the block was dropped).
  const copro13 = byDate('13/05');
  check('coprocultivo preliminar (no organism) still shows a row', copro13.length === 1, copro13);
  check('13/05 coprocultivo row: type cell (Sitio / muestra) shows COPROCULTIVO',
    copro13.length === 1 && /^COPROCULTIVO$/i.test(copro13[0].cells[1]), copro13);
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
  const klebChips = container.locator('tr', { hasText: 'KLEBSIELLA' }).locator('.cultivos-atb-chips').first();
  const klebHtml = (await klebChips.count()) ? await klebChips.innerHTML() : '';
  check('Klebsiella row now carries the antibiogram (not the ATB-less early copy)', /CEFTRIAXONA/i.test(klebHtml), klebHtml.slice(0, 200));
  check('R/I/S chips are split into R / I / S',
    /atb-chip--r/.test(klebHtml) && /atb-chip--i/.test(klebHtml) && /atb-chip--s/.test(klebHtml), klebHtml.slice(0, 400));
  const idxAmik = klebHtml.indexOf('Amikacina');
  const idxGent = klebHtml.indexOf('Gentamicina');
  check('Sensible names sort by CMI ascending (Amikacina CMI 2 before Gentamicina CMI 8, S shows 5 at most)',
    idxAmik >= 0 && (idxGent < 0 || idxAmik < idxGent), { idxAmik, idxGent });
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

  // ── «Sin revisar»: filas resaltadas dentro de cada tarjeta, sin banners ────
  const newRows = container.locator('tr.cult-row--new');
  const nNew = await newRows.count();
  check('new cultures: highlighted rows with «Nuevo» tag and «Visto», no big banners',
    nNew > 1 && /Nuevo/.test(await newRows.first().innerText()) &&
    (await newRows.first().locator('.cultivo-row-seen-btn').count()) === 1 &&
    (await container.locator('.cultivos-pending, .cultivos-alert').count()) === 0, nNew);
  const newHead = container.locator('.cult-site-head:has(.cult-org-tag--new)');
  check('site card header carries the «Nuevo» tag and its newest dot is ringed',
    (await newHead.count()) > 0 && (await container.locator('.cult-dot--new').count()) > 0, await newHead.count());
  check('«Marcar todo como visto» shows while cultures are pending', await container.locator('.cultivo-seen-btn').isVisible());
  await newRows.first().locator('.cultivo-row-seen-btn').click();
  check('«Visto» clears only that row', (await container.locator('tr.cult-row--new').count()) === nNew - 1, await container.locator('tr.cult-row--new').count());
  await closeToasts(page);
  await container.locator('.cultivo-seen-btn').click();
  check('after «Marcar todo»: no header tag, no ringed dot',
    (await container.locator('.cult-site-head .cult-org-tag--new, .cult-dot--new').count()) === 0);
  check('«Marcar todo como visto» → toast, no highlighted rows, button gone',
    (await toastText(/Cultivos marcados como vistos/)) &&
    (await container.locator('tr.cult-row--new').count()) === 0 &&
    (await container.locator('.cultivo-seen-btn').count()) === 0);
  await openCultivos();
  check('seen state is stored and stays cleared after re-opening',
    (await container.locator('tr.cult-row--new').count()) === 0 &&
    !!(await page.evaluate(() => localStorage.getItem('rplus.cultSeen.v1'))));

  // Group + count: the peritoneal row sits under "Líquido estéril" and shows its Cuenta.
  const groupedRows = await container.locator('.cultivos-table tr').evaluateAll((trs) =>
    trs.reduce((acc, tr) => {
      if (!tr.querySelector('td')) return acc;
      acc.rows.push({
        group: tr.closest('.cult-site')?.querySelector('.cult-site-tipo')?.textContent.trim() || '',
        fecha: tr.querySelectorAll('td')[0].innerText.trim(),
        cuenta: !!tr.querySelector('.cultivos-cuenta'),
        cuentaText: tr.querySelector('.cultivos-cuenta')?.innerText.trim() || '',
      });
      return acc;
    }, { group: '', rows: [] }).rows
  );
  const peritGrouped = groupedRows.find((x) => x.fecha.startsWith('07/05'));
  check('peritoneal row sits in the "Líquido estéril" group and shows its Cuenta',
    !!peritGrouped && peritGrouped.group === 'Líquido estéril' && peritGrouped.cuenta && /120,000/.test(peritGrouped.cuentaText),
    peritGrouped);

  // Sala mode censo export preview: one condensed Cultivos line, no "/2026", no full uppercase organism.
  await page.locator('#btn-export-censo-header').click();
  await page.locator('#censo-export-preview').click();
  const censoFrame = page.frameLocator('#censo-preview-frame');
  await censoFrame.locator('body').waitFor({ state: 'attached' });
  const censoText = await censoFrame.locator('body').innerText();
  // Censo caps at CENSO_MAX_CULTIVO_REPORTS (3, most recent first) — by the time
  // this scenario runs, 07/05's peritoneal report has aged out; 15/05's Klebsiella
  // urocultivo is the freshest one still inside the cap.
  const cultLine = censoText.split('\n').map((l) => l.trim()).find((l) => /UROC POR SONDA/.test(l));
  // The censo line is site + latest positive agent only: no ATB, no Cuenta.
  check('censo preview Cultivos line: "UROC POR SONDA 15/05: K. pneumoniae", no ATB, no Cuenta, no "/2026", no full uppercase organism',
    !!cultLine && /^UROC POR SONDA 15\/05: K\. pneumoniae$/.test(cultLine) && !/ATB|Cuenta/.test(cultLine) &&
    !/\/2026/.test(cultLine) && !/KLEBSIELLA PNEUMONIAE/.test(cultLine),
    cultLine);
  await r.shot(page, 'censo-preview');
  await closeToasts(page);
  await page.locator('#censo-preview-close').click();
  // "Vista previa" stacks the preview over the "Exportar censo" dialog without
  // closing it, so the dialog is still open (and blocking clicks) underneath.
  await page.locator('#censo-export-cancel').click();

  const title2 = await refresh.getAttribute('title');
  check('button no longer pending', /no hay cultivos con ATB pendiente/i.test(title2 || ''), title2);
  await press();
  check('pressing it anyway → "No hay cultivos con ATB pendiente"', await toastText(/No hay cultivos con ATB pendiente en este paciente/));

  // Remove the negative hemocultivo with its × (it lives in the periférico site, see above).
  await closeToasts(page);
  await container.evaluate((el) => el.querySelectorAll('details').forEach((d) => { d.open = true; }));
  const hemoNegChip = container.locator('.cult-site tr', { hasText: '20/04' });
  await hemoNegChip.locator('.cultivos-row-remove-btn').click();
  const confirmOk = page.locator('.wb-confirm-modal [data-wb-confirm-ok]');
  if (await confirmOk.isVisible({ timeout: 1500 }).catch(() => false)) await confirmOk.click();
  await page.waitForTimeout(600);
  await openCultivos();
  check('× removes the negative culture', (await container.locator('tr', { hasText: '20/04' }).count()) === 0);
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

  const AMPC_ENTEROBACTER =
    header(P, 'Jul 3 2026 8:00AM') +
    'BACTERIOLOGIA\nLIQUIDO PLEURAL\nPRODUCTO\n*\nMICROORGANISMO\n*\nEnterobacter cloacae complex\nCUENTA\n*\n30,000 UFC/mL\nANTIBIOGRAMA\n*\nAMPICILINA\n>16\tR\nCEFAZOLINA\n>16\tR\nCEFOXITINA\n>16\tR\nCEFTRIAXONA\n<=1\tS\nMEROPENEM\n<=0.25\tS\n';

  const ENTERO_S_INESPERADA =
    header(P, 'Jul 5 2026 8:00AM') +
    'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nPERIFERICO IZQUIERDO\nMICROORGANISMO\n*\nEnterococcus faecalis\nCUENTA\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nAMPICILINA\n<=2\tS\nCIPROFLOXACINA\n>4\tR\nCEFTRIAXONA\n<=1\tS\nGENTAMICINA\n<=4\tS\nVANCOMICINA\n<=1\tS\n';

  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, [
    ENTERO_S_INESPERADA, TAB_LABEL_URO, DOUBLE_LABEL_RASPADO, TINCION_NOT_SAMPLE, HEMO_CATETER_NIAGARA, CATETER_PUNTA_CVC,
    SECRECION_HERIDA, NDM1_KLEB, CARBR_ACINETO, G1_LIKE_ASPIRADO, G3_LIKE_ASPIRADO, G4_LIKE_PERITONEAL,
    CMI_SORT_URO, PRELIM_NO_DATE, CULTURE_THEN_BH, HEMO_POS_PAIR, HEMO_NEG_PAIR, G5_LIKE_PRELIM, AMPC_ENTEROBACTER,
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
  // Catheter-drawn hemocultivos group under the "CENTRAL" site; the raw sample name stays on the row.
  check('HEMOCULTIVO (CATETER NIAGARA): a row in the central site that keeps the sample name',
    byDate('19/06').length === 1 && /CENTRAL · Hemocultivo/i.test(byDate('19/06')[0].cells[1]) &&
    /CATETER NIAGARA/i.test(byDate('19/06')[0].cells[2]), byDate('19/06'));
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
  check('G3 S. aureus PENICILINA (BLAC) shows in the R names', /Penicilina/i.test(aureusHtml), aureusHtml.slice(0, 400));

  check('G4 líquido peritoneal: one organism, empty MICROORGANISMO slot ignored',
    byDate('26/06').length === 1 && /Pseudomonas/i.test(byDate('26/06')[0].cells[2]), byDate('26/06'));

  const g5 = byDate('02/07');
  check('G5 preliminar: 3 rows (empty MICROORGANISMO slots dropped), Preliminar, no ATB',
    g5.length === 3 &&
    g5.some((x) => /Acinetobacter baumannii/i.test(x.cells[2]) && /100,000/.test(x.cells.join(' '))) &&
    g5.some((x) => /Proteus mirabilis/i.test(x.cells[2]) && /100,000/.test(x.cells.join(' '))) &&
    g5.some((x) => /Stenotrophomonas maltophilia/i.test(x.cells[2]) && /50,000/.test(x.cells.join(' '))) &&
    !g5.some((x) => /^R$|^I$|^S$/.test(x.cells[3])), g5);

  const cmiRow = container.locator('tr[data-fechas*="|27/06"]').filter({ hasText: 'Escherichia coli' }).first();
  const cmiHtml = (await cmiRow.locator('.atb-chip--r ~ .cult-atb-ris-names').count())
    ? await cmiRow.locator('.atb-chip--r ~ .cult-atb-ris-names').first().innerHTML() : '';
  const idxCaz = cmiHtml.indexOf('Ceftazidima');
  const idxMero = cmiHtml.indexOf('Meropenem');
  check('CMI ">=256" and "≥64" sort as numbers, lowest first (Meropenem 64 before Ceftazidima 256), CMI shown',
    idxCaz >= 0 && idxMero >= 0 && idxMero < idxCaz && /cult-atb-mic/.test(cmiHtml), { idxCaz, idxMero, cmiHtml: cmiHtml.slice(0, 300) });

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

  // ── Copy format, flags, order, letterhead (labs-cultivo-from-tests / -atb gaps) ──
  const PERI_COPY =
    header(P, 'Aug 3 2026 8:00AM') +
    'BACTERIOLOGIA\nLIQUIDO PERITONEAL\nPRODUCTO\n*\nTINCION DE GRAM\n*\nESCASOS BACILOS GRAM NEGATIVO\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nCOMENTARIO:\n*\nCUENTA\n*\n120,000 UFC/mL\nANTIBIOGRAMA\n*\n' +
    'CEFTAZIDIMA\n>16\tR\n*\nCIPROFLOXACINA\n<=1\tS\n*\nCEFEPIMA\n16\tI\n*\nIMIPENEM\n2\tS\n*\nLEVOFLOXACINA\n<=2\tS\n*\nMEROPENEM\n<=1\tS\n*\nPIP/TAZO\n64\tS\n*\nTOBRAMICINA\n<=4\tS\n*\n';
  const POLY_URO =
    header(P, 'Aug 4 2026 8:00AM') +
    'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\n*\nMICROORGANISMO\n*\nKlebsiella pneumoniae\nCOMENTARIO:\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA DE KASS\n*\n+100,000 UFC/mL\nANTIBIOGRAMA\n*\nCEFTRIAXONA\n>32\tESBL\n*\n' +
    'MICROORGANISMO\n*\nEnterococcus faecium\nCOMENTARIO:\n*\nCUENTA DE KASS\n*\n+100,000 UFC/mL\nANTIBIOGRAMA\n*\nAMPICILINA\n>8\tR\n*\nVANCOMICINA\n<=0.5\tS\n*\n';
  const KLEB_LETTERHEAD =
    header(P, 'Aug 5 2026 8:00AM') +
    'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\n*\nMICROORGANISMO\n*\nKlebsiella pneumoniae\nCOMENTARIO:\n*\nCUENTA DE KASS\n*\n80,000 UFC/mL\nANTIBIOGRAMA\n*\n' +
    'AMP/SULBACTAM\n<=8/4\tS\n*\nAMPICILINA\n>16\tR\n*\nCEFTRIAXONA\n<=1\tS\n*\nCIPROFLOXACINA\n<=1\tS\n*\nGENTAMICINA\n<=4\tS\n*\n' +
    'USER CP1 -647* Labo -647* LABX 90001\nUSER CP1 -647 Labo -647 LABX 90001 Feme 74\n';
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, [PERI_COPY, POLY_URO, KLEB_LETTERHEAD].join('\n\n'));
  await openCultivos();
  rows = await tableRows();
  const copyOf = (d, germ) => copyFullFor(container.locator(`tr[data-fechas*="|${d}"]`).filter({ hasText: germ }).first());

  const peri03 = byDate('03/08');
  check('peritoneal row: one row, count shown, Ubicación never in the row',
    peri03.length === 1 && /120,000/.test(peri03[0].cells.join(' ')) && !/SERVICIO DEMO/i.test(peri03[0].cells.join(' ')), peri03);
  const periCopy = await copyOf('03/08', 'PSEUDOMONAS');
  const periLines = periCopy.split('\n').map((l) => l.trim()).filter(Boolean);
  check('peritoneal "Copiar informe completo": exact header, ATB R/I/S line, Cuenta; no Ubicación',
    periLines[0] === 'LIQUIDO PERITONEAL 03/08: PSEUDOMONAS AERUGINOSA' && /^ATB R: CAZ \| I: FEP \| S: CIPRO, IMI, LVX, MERO, PIP\/TAZO, TOBRA$/.test(periLines[1] || '') &&
    /^Cuenta: 120,000 UFC\/ML$/.test(periLines[2] || '') && periLines.length === 3 && !/SERVICIO DEMO|Ubicaci/i.test(periCopy), periCopy);

  const poly04 = byDate('04/08');
  check('polymicrobial urocultivo: both organisms listed (the table sorts them, source order is not shown), BLEE only on Klebsiella',
    poly04.length === 2 && poly04.some((x) => /Klebsiella/i.test(x.cells[2]) && /ESBL|BLEE/i.test(x.cells.join(' '))) &&
    poly04.some((x) => /Enterococcus faecium/i.test(x.cells[2]) && !/ESBL|BLEE/i.test(x.cells.join(' '))), poly04);
  check('Klebsiella BLEE row shows its count (+100,000)', poly04.some((x) => /Klebsiella/i.test(x.cells[2]) && /100,000/.test(x.cells[2])), poly04);
  const polyCopy = await copyOf('04/08', 'KLEBSIELLA');
  check('Klebsiella BLEE copy: ESBL and count in the clipboard', /ESBL/.test(polyCopy) && /Cuenta:.*100,000.*UFC/i.test(polyCopy), polyCopy);

  const kl05 = byDate('05/08');
  check('letterhead lines after the antibiogram never reach the row', kl05.length === 1 && !/USER|Labo|LABX|Feme/i.test(kl05[0].cells.join(' ')) && !/LABX|Feme/i.test(await container.innerText()), kl05);
  const klCopy = await copyOf('05/08', 'KLEBSIELLA');
  check('letterhead-strip copy keeps "ATB R: AMP", AMP-SULB and "Cuenta: 80,000 UFC/ML", no USER/Labo/LABX/Feme',
    /^UROCULTIVO POR SONDA 05\/08: KLEBSIELLA PNEUMONIAE$/m.test(klCopy) && /\bATB R: AMP\b/.test(klCopy) && /AMP-SULB/.test(klCopy) &&
    /^Cuenta: 80,000 UFC\/ML$/m.test(klCopy) && !/USER|Labo|LABX|Feme/i.test(klCopy) && !/\d\d:\d\d|\/2026/.test(klCopy), klCopy);

  check('micobacterias NEGATIVO texts show as negative rows ("NEGATIVO" and "NEGATIVO A LA FECHA")',
    /NEGATIVO A LA FECHA/i.test(mico14Text) && /BACILOSCOPIA[^]*NEGATIVO/i.test(mico14Text), mico14);
  const uroRis = container.locator('tr[data-fechas*="|05/05"] .cultivos-atb-chips').first();
  const uroRisHtml = (await uroRis.count()) ? await uroRis.innerHTML() : '';
  check('carbapenemase urocultivo chips: IMIPENEM listed, PIP/TAZO listed', /Imipenem/i.test(uroRisHtml) && /Pip\/tazo/i.test(uroRisHtml), uroRisHtml.slice(0, 400));

  // ── Antibiogram copies (labs-cultivo-atb gaps) ──
  const ecoli = (when, atb, extra = '') => header(P, when) +
    'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\n*\nMICROORGANISMO\n*\nEscherichia coli\nCUENTA\n*\n25,000 UFC/mL\n' + (atb ? 'ANTIBIOGRAMA\n*\n' + atb : '') + extra;
  const DUP_1 = ecoli('Aug 6 2026 8:00AM', 'AMIKACINA\n<=16\tS\n');
  const DUP_3 = ecoli('Aug 6 2026 8:00AM', 'AMIKACINA\n<=16\tS\nAMPICILINA\n>16\tR\nCEFTRIAXONA\n<=1\tS\n');
  const FIELD_LINES = ecoli('Aug 7 2026 8:00AM', 'AMIKACINA\n*\nS\n*\nAMPICILINA\n*\nR\n*\nCEFTRIAXONA\n*\n1\n*\nS\n*\n');
  const NO_ATB_URO = ecoli('Aug 8 2026 8:00AM', '');
  const HEMO_SAME_GERM = header(P, 'Aug 8 2026 9:00AM') +
    'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nPERIFERICO IZQUIERDO\nMICROORGANISMO\n*\nEscherichia coli\nCUENTA\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nCEFTAZIDIMA\n>16\tESBL\nIMIPENEM\n<=1\tS\nMEROPENEM\n<=1\tS\n';
  const drugs = (names, res) => names.map((n) => n + '\n' + res + '\n').join('');
  const LONG_ATB = ecoli('Aug 9 2026 8:00AM',
    drugs(['AMIKACINA', 'AMPICILINA', 'AMP/SULBACTAM', 'CEFTAZIDIMA', 'CIPROFLOXACINA', 'CEFTRIAXONA', 'CEFOTAXIMA', 'CEFEPIMA', 'GENTAMICINA', 'IMIPENEM', 'LEVOFLOXACINA', 'MEROPENEM', 'PIP/TAZO'], '>16\tR') +
    drugs(['AZTREONAM', 'TIGECICLINA'], '8\tI') +
    drugs(['CEFAZOLINA', 'CEFUROXIMA'], '>8\tESBL') +
    drugs(['COLISTINA', 'ERTAPENEM', 'FOSFOMICINA', 'MINOCICLINA', 'NITROFURANTOINA', 'TRIMET/SULFA', 'VANCOMICINA', 'TOBRAMICINA', 'CLINDAMICINA', 'DOXICICLINA'], '<=1\tS'));
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, DUP_1);
  await pasteAndSave(page, DUP_3);
  await pasteAndSave(page, [FIELD_LINES, NO_ATB_URO, HEMO_SAME_GERM, LONG_ATB].join('\n\n'));
  await openCultivos();
  rows = await tableRows();
  const chipsHtml = async (d, sel = '') => {
    const c = container.locator(`tr[data-fechas*="|${d}"]${sel}`).locator('.cultivos-atb-chips').first();
    return (await c.count()) ? c.innerHTML() : '';
  };
  const dup = byDate('06/08');
  const dupHtml = await chipsHtml('06/08');
  check('1-drug copy then 3-drug copy: one row carrying all 3 drugs', dup.length === 1 && /AMIKACINA/i.test(dupHtml) && /AMPICILINA/i.test(dupHtml) && /CEFTRIAXONA/i.test(dupHtml), { dup, dupHtml: dupHtml.slice(0, 200) });
  const fplHtml = await chipsHtml('07/08');
  check('field-per-line antibiogram: 3 drugs, CEFTRIAXONA S; AMPICILINA R',
    byDate('07/08').length === 1 && /AMIKACINA/i.test(fplHtml) && /AMPICILINA/i.test(fplHtml) && /CEFTRIAXONA/i.test(fplHtml) && /atb-chip--s/.test(fplHtml) && /atb-chip--r/.test(fplHtml), fplHtml.slice(0, 500));
  const noAtbUro = container.locator('tr[data-fechas*="|08/08"]').filter({ hasText: /UROCULTIVO|Escherichia/i });
  const noAtbHtml = (await noAtbUro.count()) ? await noAtbUro.first().innerHTML() : '';
  check('ATB-less urocultivo of the same germ as a hemocultivo with antibiogram: row exists, count kept',
    byDate('08/08').length >= 2 && /25,000/.test(noAtbHtml), byDate('08/08'));
  const noAtbCopy = await copyFullFor(container.locator('.cult-site', { hasText: 'UROCULTIVO POR SONDA' }).locator('tr[data-fechas*="|08/08"]').first());
  const noAtbChips = await chipsHtml('08/08', ':has(.cultivos-copy-full-btn)');
  check('ATB-less urocultivo falls back to the same germ\'s antibiogram from the other culture (CEFTAZIDIMA/MEROPENEM chips + copy has the ATB line)',
    /Meropenem/i.test(noAtbChips) && /^ATB /m.test(noAtbCopy) && /Cuenta: \d/.test(noAtbCopy), { noAtbChips: noAtbChips.slice(0, 200), noAtbCopy });
  const longCopy = await copyOf('09/08', 'ESCHERICHIA');
  const longAtbLen = (longCopy.split('\n').filter((l) => /^(ATB |I: |ESBL: |S: |R: )/.test(l.trim())).join('').length);
  check('ATB block over 220 chars keeps every wrapped line (R/I/ESBL/S) in the copy',
    longAtbLen > 220 && /^ATB R: /m.test(longCopy) && /^I: /m.test(longCopy) && /^ESBL: /m.test(longCopy) && /^S: /m.test(longCopy) && /^Cuenta: 25,000 UFC\/ML$/m.test(longCopy), longCopy);

  // ── Long wound-site names (synthetic): header, no-ATB card, single sample, negatives bar ──
  const WOUND_A =
    header(P, 'Oct 27 2026 9:00AM') +
    'BACTERIOLOGIA\nTEJIDO CUTANEO\nPRODUCTO\n*\nTEJIDO DE HERIDA TOBILLO IZQUIERDO\nMICROORGANISMO\n*\nStreptococcus dysgalactiae\nCOMENTARIO:\n*\n';
  const WOUND_B =
    header(P, 'Oct 25 2026 9:00AM') +
    'BACTERIOLOGIA\nPRODUCTOS DIVERSOS\nPRODUCTO\n*\nTEJIDO PIE IZQUIERDO\nMICROORGANISMO\n*\nStreptococcus dysgalactiae\nCOMENTARIO:\n*\n';
  const ULCERA_NEG =
    header(P, 'Nov 01 2026 9:00AM') +
    'BACTERIOLOGIA\nULCERA\nPRODUCTO\n*\nULCERA DE TOBILLO IZQUIERDO\nRESULTADO\n*\nNO HAY CRECIMIENTO A LAS 48 HORAS\n';
  const CENTRAL_NEG =
    header(P, 'Oct 31 2026 9:00AM') +
    'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nCATETER NIAGARA\nRESULTADO\n*\nNO HAY CRECIMIENTO A LOS 5 DIAS\n';
  const mrsaHemo = (when, site) =>
    header(P, when) +
    `BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\n${site}\nMICROORGANISMO\n*\nStaphylococcus aureus\nCOMENTARIO:\n*\nRESISTENTE A METICILINA (MRSA)\nCUENTA\n*\n1 frasco\nANTIBIOGRAMA\n*\n` +
    'OXACILINA\n>2\tR\nPENICILINA\n>8\tR\nERITROMICINA\n>4\tR\nVANCOMICINA\n1\tS\nLINEZOLID\n2\tS\nTRIMET/SULFA\n<=2/38\tS\nRIFAMPICINA\n<=1\tS\nGENTAMICINA\n<=1\tS\nCIPROFLOXACINA\n<=1\tS\nLEVOFLOXACINA\n<=1\tS\nDOXICICLINA\n<=1\tS\nCLINDAMICINA\n<=0.5\tS\n';
  const hemoNegAt = (when, site) =>
    header(P, when) + `BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\n${site}\nRESULTADO\n*\nNO HAY CRECIMIENTO A LOS 5 DIAS\n`;
  const CAT_HD_NEG =
    header(P, 'Oct 28 2026 9:00AM') + 'BACTERIOLOGIA\nCATETER\nPRODUCTO\n*\nCAT. HD\nRESULTADO\n*\nNO HAY CRECIMIENTO\n';
  await page.locator('#lab-inner-labs-btn').click();
  await pasteAndSave(page, [
    WOUND_A, WOUND_B, ULCERA_NEG, CENTRAL_NEG, CAT_HD_NEG,
    mrsaHemo('Oct 23 2026 8:00AM', 'PERIFERICO IZQUIERDO'), mrsaHemo('Oct 22 2026 8:05AM', 'PERIFERICO DERECHO'),
    hemoNegAt('Oct 26 2026 8:00AM', 'PERIFERICO DERECHO'), hemoNegAt('Nov 04 2026 8:00AM', 'PERIFERICO DERECHO'),
    mrsaHemo('Oct 20 2026 8:00AM', 'CATETER HD'), hemoNegAt('Oct 24 2026 8:00AM', 'CATETER HD'),
  ].join('\n\n'));
  await openCultivos();
  const woundCard = container.locator('.cult-site', { hasText: 'HERIDA TOBILLO IZQUIERDO' }).first();
  const woundHead = await woundCard.locator('.cult-site-head').evaluate((h) => {
    const t = h.querySelector('.cult-site-title');
    const d = h.querySelector('.cult-site-last');
    const hr = h.getBoundingClientRect();
    return { title: t.innerText.replace(/\s+/g, ' '), detail: h.querySelector('.cult-site-detail')?.innerText || '',
      dateOk: d.getBoundingClientRect().right <= hr.right + 1 && d.scrollWidth <= d.clientWidth + 1 && d.offsetHeight < 30, date: d.innerText };
  });
  check('long site: short title in the header, detail on its own small line, date never cut',
    !/\(/.test(woundHead.title) && /Tejido cutaneo/i.test(woundHead.title) && /tobillo izquierdo/i.test(woundHead.detail) && woundHead.dateOk, woundHead);
  check('single sample: no timeline strip repeating the date', (await woundCard.locator('.cult-site-dots').count()) === 0);
  check('no antibiogram yet: one short «Antibiograma pendiente» line', (await woundCard.locator('.cult-atb-missing').count()) === 1);
  const gap = await woundCard.evaluate((c) => {
    const row = c.querySelector('tr');
    const pb = parseFloat(row.ownerDocument.defaultView.getComputedStyle(row).paddingBottom) || 0;
    const last = [...row.querySelectorAll('*')].filter((el) => !el.closest('.cultivos-copy-full-btn, .atb-ris-hover-panel') && el.offsetParent)
      .reduce((m, el) => Math.max(m, el.getBoundingClientRect().bottom), 0);
    return Math.round(row.getBoundingClientRect().bottom - last - pb);
  });
  check('no empty block under an organism without antibiogram', gap <= 4, gap);
  const negBar = container.locator('.cultivos-neg-fold');
  const negNames = await negBar.locator('.cultivos-neg-names').allInnerTexts();
  check('«Negativos» bar: normal case, not raw capitals',
    negNames.length >= 2 && negNames.every((t) => /[a-z]/.test(t)) && negNames.some((t) => /^Cat\. HD · 28\/10$/.test(t)) && negNames.some((t) => /^Ulcera de tobillo izquierdo · 01\/11$/.test(t)), negNames);
  // ── Hierarchy: merged twins, compact negatives last, «Último» line, honest status dot ──
  const periCard = container.locator('.cult-site', { has: page.locator('tr[data-fechas*="|23/10"]') }).first();
  const peri = await periCard.evaluate((c) => {
    const trs = [...c.querySelectorAll('tr')];
    const t23 = trs.filter((t) => t.dataset.fecha.startsWith('23/10'));
    const lastPos = Math.max(...trs.map((t, i) => (t.classList.contains('cultivos-row-neg') ? -1 : i)));
    const firstNeg = trs.findIndex((t) => t.classList.contains('cultivos-row-neg'));
    const neg = c.querySelector('tr.cultivos-row-neg');
    return {
      n23: t23.length, text23: t23[0]?.innerText.replace(/\s+/g, ' ') || '',
      chips: t23[0]?.querySelectorAll('.atb-chip--r').length || 0,
      negLast: firstNeg > lastPos, negFont: neg ? neg.ownerDocument.defaultView.getComputedStyle(neg).fontSize : '', negH: neg ? Math.round(neg.getBoundingClientRect().height) : 0,
      ultimo: c.querySelector('.cult-site-ultimo')?.innerText || '', dotPos: !!c.querySelector('.cult-status-dot--pos'),
      dotTitles: c.querySelectorAll('.cult-dot[title]').length, negText: neg?.innerText.replace(/\s+/g, ' ') || '',
    };
  });
  check('twin isolates (same organism, same R/I/S) merge into one block with «2 muestras» and one antibiogram',
    peri.n23 === 1 && /2 muestras/.test(peri.text23) && peri.chips === 1 && /Perifer[ií]co izquierdo \/ Perifer[ií]co derecho/i.test(peri.text23), peri);
  check('negatives sit after the positives as one compact 13px line',
    peri.negLast && peri.negFont === '13px' && peri.negH <= 26 && /^04\/11 Negativo/.test(peri.negText), peri);
  check('header says what the latest result is, and the dot is not red when the latest is negative',
    /^Último: negativo 04\/11$/.test(peri.ultimo) && !peri.dotPos, peri);
  check('timeline dots carry no hover title (date and organism are already on the card)', peri.dotTitles === 0, peri.dotTitles);
  // Último resultado negativo: el aislamiento viejo queda plegado y su fecha lo abre.
  const periSeen = periCard.locator('tr[data-fechas*="|23/10"] .cultivo-row-seen-btn').first();
  if (await periSeen.count()) { await periSeen.click(); await page.waitForTimeout(300); }
  const periIso = periCard.locator('tr[data-fechas*="|23/10"]').first();
  const foldedAtRest = !(await periIso.isVisible());
  const dateBtn = periCard.locator('.cult-date-btn[data-cult-fecha="23/10/2026"]');
  await dateBtn.click();
  const openAfter = await periIso.isVisible();
  await dateBtn.click();
  const foldedAgain = !(await periIso.isVisible());
  check('negative-latest site: positive isolate folded, its date button opens and closes it',
    foldedAtRest && openAfter && foldedAgain, { foldedAtRest, openAfter, foldedAgain });
  // Click on the organism name folds that isolate's report.
  const orgToggle = container.locator('tr:not(.cult-row--folded) .cult-org-toggle').first();
  const atbCell = orgToggle.locator('xpath=ancestor::tr[1]').locator('.cultivos-cell-atb');
  const shownBefore = await atbCell.isVisible();
  await orgToggle.click();
  const hiddenAfter = !(await atbCell.locator('.cult-atb-ris-names').first().isVisible());
  // Plegado: las pastillas quedan y los nombres salen al pasar el cursor.
  const chipFolded = atbCell.locator('.atb-chip').first();
  const chipsStay = await chipFolded.isVisible();
  await chipFolded.hover();
  const popBox = await page.locator('.cult-atb-pop').boundingBox();
  // The names box lives in <body>, so the card cannot clip it.
  const namesOnHover = !!popBox && popBox.height > 20 && (await page.locator('body > .cult-atb-pop').count()) === 1;
  // Sticky: moving the cursor from the chip into the box keeps it open.
  await page.mouse.move(popBox.x + popBox.width / 2, popBox.y + popBox.height / 2);
  await page.waitForTimeout(500);
  const popSticky = (await page.locator('body > .cult-atb-pop').count()) === 1;
  const storedFold = await page.evaluate(() => /"[^"]+":\["[^"]+/.test(localStorage.getItem('rplus.cultCollapsed.v1') || ''));
  await orgToggle.click();
  const storedClear = await page.evaluate(() => !/\["[^"]+/.test(localStorage.getItem('rplus.cultCollapsed.v1') || ''));
  const shownAgain = await atbCell.isVisible();
  check('click on the organism name folds and unfolds its report, and remembers it', shownBefore && hiddenAfter && chipsStay && namesOnHover && popSticky && shownAgain && storedFold && storedClear, { shownBefore, hiddenAfter, chipsStay, namesOnHover, popSticky, shownAgain, storedFold, storedClear });
  const centralCard = container.locator('.cult-site', { has: page.locator('tr[data-fechas*="|20/10"]') }).first();
  check('central card: «Último: negativo 31/10» (S. aureus MRSA is the older result)',
    /^Último: negativo 31\/10$/.test(await centralCard.locator('.cult-site-ultimo').innerText()));
  // ── Resistencia por especie (EUCAST) y AmpC: Enterobacter cloacae complex ──
  const ampcRow = container.locator('tr', { hasText: 'Enterobacter cloacae' }).first();
  const ampcTxt = (await ampcRow.innerText()).replace(/\s+/g, ' ');
  check('AmpC organism: tag, «Int 3» line, ceftriaxona marked AmpC, one-line notice, no acquired R line',
    /Enterobacter cloacae complex AmpC/.test(ampcTxt) && /Int 3 Ampicilina >16 Cefazolina >16 Cefoxitina >16/.test(ampcTxt) &&
    /Ceftriaxona \u22641 AmpC/.test(ampcTxt) && /AmpC: la ceftriaxona puede fallar aunque salga S\./.test(ampcTxt) && !/(^| )R \d/.test(ampcTxt), ampcTxt);
  // ── Pista de mecanismo (EUCAST detección de mecanismos v2.0) y S inesperada (EUCAST fenotipos esperados v1.2) ──
  const mechRow = container.locator('tr[data-fechas*="|27/06"]').filter({ hasText: 'Escherichia coli' }).first();
  const mechTxt = (await mechRow.innerText()).replace(/\s+/g, ' ');
  check('E. coli ceftazidima R: open «Cribado de BLEE positivo» panel with drug, confirmation step and EUCAST 2017 source; drug marked',
    (await mechRow.locator('details.cult-mech[open]').count()) === 1 && /Cribado de BLEE positivo/.test(mechTxt) && /Ceftazidima R/.test(mechTxt) &&
    /sinergia con ácido clavulánico/.test(mechTxt) && /v2\.0, julio 2017/.test(mechTxt) && /cribado BLEE/.test(mechTxt), mechTxt);
  const noMechRow = container.locator('tr', { hasText: 'Enterobacter cloacae' }).first();
  check('Enterobacter with ceftriaxona S: no BLEE-screen panel', (await noMechRow.locator('.cult-mech').count()) === 0);
  const entRow = container.locator('tr[data-fechas*="|05/07"]').filter({ hasText: 'faecalis' }).first();
  const entTxt = (await entRow.innerText()).replace(/\s+/g, ' ');
  check('Enterococcus faecalis with ceftriaxona S + gentamicina S: both marked «inesperada», EUCAST note, aminoglycoside caveat, source',
    /Ceftriaxona[^·]*inesperada/.test(entTxt) && /Gentamicina[^·]*inesperada/.test(entTxt) && /2 antibióticos con S inesperada\. EUCAST espera R/.test(entTxt) &&
    /Solo se combina con ampicilina o vancomicina/.test(entTxt) && /Fuente: EUCAST Expected Resistant Phenotypes v1\.2/.test(entTxt) && (await entRow.locator('.cult-mech').count()) === 0, entTxt);
  await mechRow.scrollIntoViewIfNeeded();
  await r.shot(page, 'mech-light');
  await entRow.scrollIntoViewIfNeeded();
  await r.shot(page, 'ent-inesperada-light');
  await ampcRow.scrollIntoViewIfNeeded();
  await r.shot(page, 'ampc-light');
  await woundCard.scrollIntoViewIfNeeded();
  await periCard.scrollIntoViewIfNeeded();
  await r.shot(page, 'hemo-light');
  await woundCard.scrollIntoViewIfNeeded();
  await r.shot(page, 'wound-light');
  await page.locator('#theme-toggle, .theme-toggle').locator('visible=true').first().click();
  await page.mouse.move(0, 600);
  await page.waitForTimeout(400);
  await periCard.scrollIntoViewIfNeeded();
  await r.shot(page, 'hemo-dark');
  await ampcRow.scrollIntoViewIfNeeded();
  await r.shot(page, 'ampc-dark');
  await mechRow.scrollIntoViewIfNeeded();
  await r.shot(page, 'mech-dark');
  await entRow.scrollIntoViewIfNeeded();
  await r.shot(page, 'ent-inesperada-dark');
  await r.shot(page, 'wound-dark');
  await container.evaluate((el) => el.scrollIntoView());
  await r.shot(page, 'wound-dark-top');
  await page.locator('#theme-toggle, .theme-toggle').locator('visible=true').first().click();

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
