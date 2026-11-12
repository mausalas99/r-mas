/**
 * Minimal .xlsx writer: one sheet per entry. Pure, no DOM. Uses jszip (already a dependency).
 * sheet: { name, columns: [{ header, width }], rows: [[value, ...], ...] }
 * Frozen bold header row, filter on the header, numbers kept as numbers.
 */
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CELL_MAX = 32000; // Excel stores at most 32767 chars per cell

// eslint-disable-next-line no-control-regex -- stripping these is the point
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

const xmlText = (v) =>
  String(v)
    .replace(CTRL, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 0 → A, 25 → Z, 26 → AA. */
export function colName(i) {
  let n = i + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Style ids, see stylesXml(): 0 plain, 1 header.
const S_PLAIN = 0;
const S_HEADER = 1;

function cellXml(value, ref, style) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  if (value == null || value === '') return '';
  const text = String(value).slice(0, CELL_MAX);
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlText(text)}</t></is></c>`;
}

function sheetXml(sheet) {
  const cols = sheet.columns;
  const lastCol = colName(cols.length - 1);
  const lastRow = sheet.rows.length + 1;
  const header = `<row r="1">${cols.map((c, i) => cellXml(c.header, colName(i) + '1', S_HEADER)).join('')}</row>`;
  const body = sheet.rows
    .map((cells, r) => {
      const xml = cells.map((v, i) => cellXml(v, colName(i) + (r + 2), S_PLAIN)).join('');
      return `<row r="${r + 2}">${xml}</row>`;
    })
    .join('');
  const widths = cols
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`)
    .join('');
  return (
    HEAD +
    `<worksheet xmlns="${NS}" xmlns:r="${NS_R}">` +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${widths}</cols>` +
    `<sheetData>${header}${body}</sheetData>` +
    `<autoFilter ref="A1:${lastCol}${lastRow}"/>` +
    '</worksheet>'
  );
}

const stylesXml = () =>
  HEAD +
  `<styleSheet xmlns="${NS}">` +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">' +
  '<alignment vertical="center" wrapText="1"/></xf></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/** Column width from header and longest value, clamped to 10–50. */
export function fitColumns(columns, rows) {
  return columns.map((header, i) => {
    let max = String(header).length;
    rows.forEach((r) => {
      const len = r[i] == null ? 0 : String(r[i]).length;
      if (len > max) max = len;
    });
    return { header, width: Math.min(50, Math.max(10, max + 2)) };
  });
}

/** @returns {Promise<Uint8Array>} the .xlsx bytes. */
export async function buildWorkbook(sheets) {
  // Loaded on demand so jszip stays out of the boot bundle.
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const overrides = sheets
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('');
  zip.file(
    '[Content_Types].xml',
    HEAD +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      overrides +
      '</Types>'
  );
  zip.file(
    '_rels/.rels',
    HEAD + `<Relationships xmlns="${NS_PKG}"><Relationship Id="rId1" Type="${NS_R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  );
  const sheetEntries = sheets
    .map((s, i) => `<sheet name="${xmlText(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  const filters = sheets
    .map((s, i) => {
      const last = colName(s.columns.length - 1);
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlText(s.name).replace(/'/g, "''")}'!$A$1:$${last}$${s.rows.length + 1}</definedName>`;
    })
    .join('');
  zip.file(
    'xl/workbook.xml',
    HEAD +
      `<workbook xmlns="${NS}" xmlns:r="${NS_R}"><sheets>${sheetEntries}</sheets>` +
      `<definedNames>${filters}</definedNames></workbook>`
  );
  const rels = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('');
  zip.file(
    'xl/_rels/workbook.xml.rels',
    HEAD +
      `<Relationships xmlns="${NS_PKG}">${rels}` +
      `<Relationship Id="rId${sheets.length + 1}" Type="${NS_R}/styles" Target="styles.xml"/></Relationships>`
  );
  zip.file('xl/styles.xml', stylesXml());
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
