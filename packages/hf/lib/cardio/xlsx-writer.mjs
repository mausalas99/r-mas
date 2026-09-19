/**
 * Minimal .xlsx writer (raw OOXML via JSZip — already a project dependency).
 * Avoids the `xlsx` npm package: its last npm release carries unpatched
 * high-severity CVEs (prototype pollution, ReDoS); SheetJS ships fixes only
 * from its own CDN, not npm.
 */
import JSZip from 'jszip';

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;
const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function colName(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = COL_LETTERS[rem] + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function escXml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cellXml(value, rowIndex, colIndex, headerStyle) {
  const ref = colName(colIndex) + rowIndex;
  const s = headerStyle ? ' s="1"' : '';
  const str = value == null ? '' : String(value);
  if (str === '') return `<c r="${ref}"${s}/>`;
  if (!headerStyle && NUMERIC_RE.test(str)) {
    return `<c r="${ref}"${s}><v>${str}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escXml(str)}</t></is></c>`;
}

function sheetXml(headers, rows) {
  const lines = [`<row r="1">${headers.map((h, i) => cellXml(h, 1, i, true)).join('')}</row>`];
  rows.forEach((row, r) => {
    const rowNum = r + 2;
    lines.push(`<row r="${rowNum}">${row.map((v, i) => cellXml(v, rowNum, i, false)).join('')}</row>`);
  });
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<sheetData>${lines.join('')}</sheetData>` +
    '</worksheet>'
  );
}

/**
 * @param {{ name: string, headers: string[], rows: (string|number)[][] }[]} sheets
 * @returns {Promise<Uint8Array>}
 */
export async function buildXlsxWorkbook(sheets) {
  const list = sheets.length ? sheets : [{ name: 'Hoja1', headers: [], rows: [] }];
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      list
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join('') +
      '</Types>'
  );

  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'
  );

  zip.file(
    'xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets>${list
        .map((sheet, i) => `<sheet name="${escXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets>` +
      '</workbook>'
  );

  zip.file(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      list
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        )
        .join('') +
      `<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>'
  );

  zip.file(
    'xl/styles.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
      '<borders count="1"><border/></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" xfId="0"/><xf numFmtId="0" fontId="1" xfId="0" applyFont="1"/></cellXfs>' +
      '</styleSheet>'
  );

  list.forEach((sheet, i) => {
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sheet.headers, sheet.rows));
  });

  return zip.generateAsync({ type: 'uint8array' });
}
