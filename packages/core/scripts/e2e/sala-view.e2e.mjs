#!/usr/bin/env node
/**
 * E2E: the patient Resumen "Labs" card — today's lab draws ("envíos") with
 * only their out-of-range values. Driven through the real Electron app with
 * synthetic DEMO patients and made-up expedientes.
 *
 * Ways it can go wrong (each one is a check below):
 *   - two draws at different hours merge, or a dense draw is not wide
 *   - an all-normal draw gets a card, or an in-range value shows as a chip
 *   - two reports at the SAME hour (different panels) show as two cards
 *   - a repeat paste of the same report doubles a chip
 *   - a worsening value has no trend arrow / delta, or the first reading of
 *     the day invents one
 *   - culture text (urocultivo, organism, antibiotics) leaks into the card
 *   - yesterday's labs show as today's
 *   - "N valores en rango" skips the all-normal draw
 *
 * Artifact: e2e-artifacts/sala-view/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:sala-view
 */
import { createRun, onboardLocalOnly, openPatient, pasteAndSave } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const A = { exp: '7000301-1', name: 'DEMO GLANCE UNO', room: '501' };
const B = { exp: '7000302-2', name: 'DEMO GLANCE DOS', room: '502' };
const C = { exp: '7000303-3', name: 'DEMO GLANCE TRES', room: '503' };
const D = { exp: '7000304-4', name: 'DEMO GLANCE CUATRO', room: '504' };

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** SOME "Fecha Registro" for today + dayOff at h:m (early hours: never in the future). */
function when(dayOff, h, m) {
  const d = new Date(Date.now() + dayOff * 86400000);
  return `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'AM' : 'PM'}`;
}
/** Same header, own Solicitud number: two reports at the same hour are two reports. */
const headerSol = (p, w, sol) => header(p, w).replace(/Solicitud:\t\d+/, `Solicitud:\t${sol}`);

const bh = (rows) => 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + rows;
const qs = (study, row) => `QUIMICA CLINICA\n${study}\n` + TABLE + row;
const gaso = (rows) => 'GASOMETRIAS\nGASOMETRIA VENOSA PARCIAL\n' + TABLE + rows;
const ttp = (flag, v) => `HEMATOLOGIA\nTIEMPO DE PROTROMBINA Y TROMBOPLASTINA\nTIEMPO DE TROMBOPLASTINA\t${flag}\n${v}\nSEG\t29.1 - 38.4\n`;
const URO =
  'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\t\n*\nMICROORGANISMO\t\n*\nKlebsiella pneumoniae\n' +
  'CUENTA DE KASS\t\n*\n25,000 UFC/mL\nANTIBIOGRAMA\t\n*\nCEFTRIAXONA\n>32\tR\nAMIKACINA\n<=2\tS\n';

const r = createRun('sala-view');
const { check, shot } = r;

await r.finish('Resumen labs card: today envíos, altered chips only', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();

  /** Open p's Resumen and read the Labs card. */
  async function labsCard(p) {
    await openPatient(page, p);
    await page.locator('#apptab-nota').click();
    await page.locator('button:visible', { hasText: /^\s*Resumen\s*$/ }).first().click().catch(() => {});
    const card = page.locator('#patient-dashboard-mount .labs-card');
    await card.waitFor({ timeout: 5000 });
    const draws = await card.locator('.draw').evaluateAll((ds) =>
      ds.map((d) => ({
        caption: (d.querySelector('.draw-head-caption') || {}).textContent || '',
        wide: d.classList.contains('is-wide'),
        cells: [...d.querySelectorAll('.draw-cell')].map((c) => ({
          label: c.querySelector('.draw-label').textContent.trim(),
          value: c.querySelector('.draw-value').textContent.trim(),
          delta: c.querySelector('.draw-delta').textContent.trim(),
        })),
      }))
    );
    return { draws, text: (await card.innerText()).replace(/\s+/g, ' ') };
  }
  const at = (draws, hhmm) => draws.find((d) => d.caption.includes('corte ' + hhmm));
  const cellWith = (draw, v) => draw && draw.cells.find((c) => c.value.startsWith(v));

  // ── A: dense draw, all-normal draw, sparse draw, yesterday's draw ────────
  await pasteAndSave(page, header(A, when(-1, 1, 0)) + bh('HGB\t\tA\t12.0\tg/dL\t12.20 - 18.10\n'));
  await pasteAndSave(
    page,
    header(A, when(0, 1, 14)) +
      bh('HGB\t\tA\t8.20\tg/dL\t12.20 - 18.10\nHCT\t\t*\t40.0\t%\t37.7 - 53.7\n') +
      qs('CREATININA EN SANGRE', 'CREATININA EN SANGRE\t\t*\t1.1\tmg/dL\t0.6 - 1.4\n') +
      gaso('PH\tB\t7.31\t\t7.32 - 7.43\npO2\tB\t62\tmmHg\t80 - 100\n')
  );
  await pasteAndSave(page, header(A, when(0, 2, 20)) + gaso('PH\t*\t7.40\t\t7.32 - 7.43\npCO2\t*\t42\tmmHg\t40 - 45\n'));
  await pasteAndSave(page, header(A, when(0, 3, 5)) + bh('HGB\t\tA\t8.00\tg/dL\t12.20 - 18.10\n'));
  const a = await labsCard(A);
  await shot(page, 'patient-a-labs-card');
  const a1 = at(a.draws, '01:14');
  // A solo-gasometría (02:20, all-normal) always pairs with the nearest same-day
  // labwork draw that has no GASES of its own — here that's 03:05 (see
  // "empareja la gaso más cercana" in lab-consolidation-cluster.mjs). The merged
  // draw's hora is blanked, not 03:05's, because the two sources disagree on
  // the minute (see "evita hora engañosa" in lab-panel-history-dedupe.mjs).
  const a3 = a.draws.find((d) => d !== a1);
  check('A: two draws, 01:14 and the 02:20+03:05 gaso/labwork pairing', a.draws.length === 2 && !!a1 && !!a3, a.draws);
  check('A: yesterday 01:00 draw is not shown as today', !at(a.draws, '01:00'), a.draws);
  check('A: dense draw (BH + QS + gases) is wide, paired draw is not', !!a1 && a1.wide && !!a3 && !a3.wide, a.draws);
  check('A: dense draw shows altered pH 7.31, not in-range Cr 1.1 / Hto 40.0', !!cellWith(a1, '7.31') && !cellWith(a1, '1.1') && !cellWith(a1, '40.0'), a1);
  check('A: no PaFi chip from the gas values', !a.draws.some((d) => d.cells.some((c) => /pafi/i.test(c.label))), a.draws);
  const hb = cellWith(a3, '8');
  check('A: chip keeps analyte + value (label, then 8 without trailing zeros or "*")', !!hb && !!hb.label && hb.label !== hb.value && !/\*/.test(hb.value), a3);
  const enRango = Number((a.text.match(/(\d+) valores en rango/) || [])[1] || 0);
  check('A: "valores en rango" counts the all-normal 02:20 draw too (Hto, Cr, pH, pCO2 → 4+)', enRango >= 4, a.text);

  // ── B: same hour, two reports → one draw; trend vs the earlier draw ──────
  await pasteAndSave(
    page,
    header(B, when(0, 1, 0)) +
      qs('POTASIO', 'POTASIO\t\t*\t3.9\tmmol/L\t3.6 - 5.0\n') +
      qs('SODIO', 'SODIO\t\t*\t138\tmmol/L\t135.0 - 145.0\n')
  );
  const bK = headerSol(B, when(0, 2, 0), '2600302201') + qs('POTASIO', 'POTASIO\t\tB\t2.9\tmmol/L\t3.6 - 5.0\n');
  await pasteAndSave(page, bK);
  await pasteAndSave(page, headerSol(B, when(0, 2, 0), '2600302202') + ttp('A', '39.3'));
  await pasteAndSave(page, bK); // repeat paste of the same report
  const b = await labsCard(B);
  await shot(page, 'patient-b-labs-card');
  const b2 = at(b.draws, '02:00');
  check('B: K report + TTP report at 02:00 → one draw with both', b.draws.length === 1 && !!cellWith(b2, '2.9') && !!cellWith(b2, '39.3'), b.draws);
  check('B: repeat paste does not double the K chip', !!b2 && b2.cells.filter((c) => c.value.startsWith('2.9')).length === 1, b2);
  check('B: all-normal 01:00 draw has no card', !at(b.draws, '01:00'), b.draws);
  const k = cellWith(b2, '2.9');
  check('B: K 2.9 vs 3.9 earlier today → delta "-1"', !!k && /-1\b/.test(k.delta), k);
  const t = cellWith(b2, '39.3');
  check('B: TTP, first reading of the day → no delta', !!t && !/\d/.test(t.delta), t);

  // ── C: only yesterday's labs ─────────────────────────────────────────────
  await pasteAndSave(page, header(C, when(-1, 1, 14)) + bh('HGB\t\tA\t8.20\tg/dL\t12.20 - 18.10\n'));
  const c = await labsCard(C);
  check('C: only yesterday → no draws, "Sin labs de hoy"', c.draws.length === 0 && /Sin labs de hoy/.test(c.text), c);

  // ── D: BH + urocultivo in one report, then a culture-only report ─────────
  await pasteAndSave(page, headerSol(D, when(0, 1, 30), '2600304401') + bh('HGB\t\tA\t8.20\tg/dL\t12.20 - 18.10\n') + URO);
  await pasteAndSave(page, headerSol(D, when(0, 2, 30), '2600304402') + URO.replace('Klebsiella pneumoniae', 'Escherichia coli'));
  const dd = await labsCard(D);
  await shot(page, 'patient-d-labs-card');
  check('D: mixed BH + culture report → its BH altered chip shows', !!cellWith(at(dd.draws, '01:30'), '8.2'), dd.draws);
  check('D: culture-only report has no card', !at(dd.draws, '02:30'), dd.draws);
  check('D: no culture text in the card (urocultivo, organism, antibiotic)', !/cultivo|klebsiella|escherichia|ceftriaxona|amikacina/i.test(dd.text), dd.text);

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();
});
