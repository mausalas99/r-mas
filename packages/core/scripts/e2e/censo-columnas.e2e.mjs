/**
 * Census preview: hide a column, edit a cell, generate the PDF from the preview.
 *
 * Medium-hard path: the edit is made first, then a column is hidden (the
 * preview re-renders), so the edit has to survive the re-render and reach the
 * PDF. Then the hidden column must stay hidden on the next export dialog and
 * in the PDF. Synthetic DEMO patients only.
 *
 * Artifact: e2e-artifacts/censo-columnas/<run-id>/ (report.json, screenshots, census.pdf).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRun, onboardLocalOnly, pasteAndSave, closeToasts, until } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const d = new Date();
const TODAY = (h) => `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${h}:05AM`;
const bh = (hgb) => 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + `HGB\t\tA\t${hgb}\tg/dL\t12.20 - 18.10\n`;
const PATIENTS = [0, 1, 2].map((i) => ({ exp: `74000${i}1-${i}`, name: `DEMO COLUMNA ${i}`, room: String(820 + i) }));
const EDIT = 'NEUMONIA EDITADA';
// Padded, with a blank line: the PDF must read NAC then EPOC, nothing between.
const DX_PADDED = '  NAC\n\n EPOC ';
// Paciente cell: first line is the name, the rest the meta line.
const PAC_EDIT = { name: 'DEMO X', meta: '45 a' };

const r = createRun('censo-columnas');
const { check, shot } = r;

/** Every text string drawn in the PDF (content streams inflated, hex strings decoded). */
function pdfText(buf) {
  const raw = buf.toString('latin1');
  let out = '';
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    let s = m[1];
    try {
      s = zlib.inflateSync(Buffer.from(s, 'latin1')).toString('latin1');
    } catch {
      /* not deflated */
    }
    for (const h of s.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) out += Buffer.from(h[1], 'hex').toString('latin1') + '\n';
    for (const t of s.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) out += t[1] + '\n';
  }
  return out;
}

async function newPdf(since) {
  let file = null;
  await until(async () => {
    file = fs.readdirSync(r.downloadsDir).filter((f) => f.endsWith('.pdf'))
      .map((f) => path.join(r.downloadsDir, f)).find((f) => fs.statSync(f).mtimeMs > since) || null;
    return !!file;
  }, 30000, 250);
  if (file) await new Promise((res) => setTimeout(res, 400));
  return file;
}

await r.finish('Census preview: hide a column, edit a cell, generate PDF from the preview', async () => {
  const { page, pageErrors } = await r.launch({ lanPort: 3798 });
  await onboardLocalOnly(page);
  for (const p of PATIENTS) await pasteAndSave(page, header(p, TODAY(3)) + bh('10.2'));
  await closeToasts(page);

  await page.locator('#btn-export-censo-header').click();
  check('export dialog has no Generar PDF button', !(await page.locator('#censo-export-modal button', { hasText: 'Generar' }).count()));
  await shot(page, 'export-dialog');
  await page.locator('#censo-export-preview').click();
  const previewCols = page.locator('#censo-preview-cols input[data-censo-col]');
  check('preview lists the column checkboxes', (await previewCols.count()) >= 9, await previewCols.count());
  check('the # column has no checkbox (cannot be hidden)', (await page.locator('#censo-preview-cols input[data-censo-col="num"]').count()) === 0);

  const frame = page.frameLocator('#censo-preview-frame');
  await frame.locator('td[data-k="dx"]').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(500);
  check('preview has Imprimir and Generar PDF', (await page.locator('#censo-preview-print').isVisible()) && (await page.locator('#censo-preview-generate').isVisible()));
  const headsBefore = await frame.locator('th').allInnerTexts();
  check('Labs column shown at first', headsBefore.some((h) => /labs/i.test(h)), headsBefore);

  // Edit first, then hide a column: the edit must survive the re-render.
  await frame.locator('td[data-k="dx"]').first().fill(EDIT);
  await frame.locator('td[data-k="dx"]').nth(1).fill(DX_PADDED);
  await frame.locator('td[data-k="paciente"]').nth(2).fill(`${PAC_EDIT.name}\n${PAC_EDIT.meta}`);
  await page.locator('#censo-preview-cols label', { has: page.locator('input[data-censo-col="labs"]') }).click();
  await page.waitForTimeout(600);
  const headsAfter = await frame.locator('th').allInnerTexts();
  check('Labs column gone after unchecking', !headsAfter.some((h) => /labs/i.test(h)), headsAfter);
  const dxAfter = await frame.locator('td[data-k="dx"]').allInnerTexts();
  check('edited Dx kept after re-render', dxAfter.some((t) => t.includes(EDIT)), dxAfter);
  check('padded Dx cell trimmed to NAC / EPOC, no blank line', (dxAfter[1] || '').trim() === 'NAC\nEPOC', dxAfter[1]);
  await shot(page, 'preview-edited');

  const t0 = Date.now();
  await page.locator('#censo-preview-generate').click();
  const pdf = await newPdf(t0);
  const toast = (await page.locator('.toast').allInnerTexts()).join(' | ');
  check('Generar PDF from the preview writes a PDF', !!pdf, toast);
  if (pdf) {
    fs.copyFileSync(pdf, path.join(r.artifactDir, 'census.pdf'));
    const text = pdfText(fs.readFileSync(pdf));
    fs.writeFileSync(path.join(r.artifactDir, 'census.txt'), text);
    check('PDF text readable (patient names found)', PATIENTS.slice(0, 2).every((p) => text.includes(p.name)), text.slice(0, 200));
    check('PDF has the edited Dx', text.includes(EDIT));
    const lines = text.split('\n').map((l) => l.trim());
    const nac = lines.indexOf('NAC');
    check('PDF Dx reads NAC then EPOC, no blank line between', nac >= 0 && lines[nac + 1] === 'EPOC', lines.slice(Math.max(0, nac - 1), nac + 3));
    check('PDF has both lines of the edited Paciente cell', lines.includes(PAC_EDIT.name) && lines.includes(PAC_EDIT.meta) && !text.includes(PATIENTS[2].name),
      lines.filter((l) => /DEMO|45 a/.test(l)));
    check('PDF has no Labs column header', !/^labs$/im.test(text));
    check('PDF still has other headers', /^dx$/im.test(text), text.match(/^[A-Za-z. /-]{2,16}$/gm));
  }
  await page.locator('#censo-preview-close').click();
  await closeToasts(page);

  await page.locator('#btn-export-censo-header').click();
  await page.locator('#censo-export-preview').click();
  await page.waitForTimeout(500);
  check('hidden column remembered next time', !(await page.locator('#censo-preview-cols input[data-censo-col="labs"]').isChecked()));
  check('remembered column hidden in the table', !(await frame.locator('th').allInnerTexts()).some((h) => /labs/i.test(h)));

  // Second pass: show Labs again and blank every Labs cell (they fall back to the
  // Laboratorios section, HGB 10.2): the value must not come back.
  await page.locator('#censo-preview-cols label', { has: page.locator('input[data-censo-col="labs"]') }).click();
  await frame.locator('td[data-k="labs"]').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(500);
  const labsBefore = await frame.locator('td[data-k="labs"]').allInnerTexts();
  check('Labs cells show HGB 10.2 again when the column is back', labsBefore.length === PATIENTS.length && labsBefore.every((t) => t.includes('10.2')), labsBefore);
  for (let i = 0; i < labsBefore.length; i++) await frame.locator('td[data-k="labs"]').nth(i).fill('');
  // Hiding another column re-renders the table from the edited rows.
  await page.locator('#censo-preview-cols label', { has: page.locator('input[data-censo-col="signos"]') }).click();
  await page.waitForTimeout(600);
  const labsBlank = await frame.locator('td[data-k="labs"]').allInnerTexts();
  check('blanked Labs cells stay blank after re-render (no section fallback)', labsBlank.length === PATIENTS.length && labsBlank.every((t) => !t.includes('10.2')), labsBlank);
  const t1 = Date.now();
  await page.locator('#censo-preview-generate').click();
  const pdf2 = await newPdf(t1);
  check('second pass writes a PDF', !!pdf2);
  if (pdf2) {
    fs.copyFileSync(pdf2, path.join(r.artifactDir, 'census-labs-blank.pdf'));
    const text2 = pdfText(fs.readFileSync(pdf2));
    fs.writeFileSync(path.join(r.artifactDir, 'census-labs-blank.txt'), text2);
    check('PDF: blanked Labs does not bring HGB 10.2 back', /^labs$/im.test(text2) && !text2.includes('10.2'), text2.split('\n').filter((l) => /10\.2|HGB/.test(l)));
  }
  await page.locator('#censo-preview-close').click();

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3));
});
