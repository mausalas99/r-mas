/**
 * Censo PDF compacto — tabla landscape (1–2 páginas para ~7–15 pacientes).
 * @typedef {{ num: string, cama: string, pacienteNombre: string, pacienteMeta?: string, dx?: string, meds?: string, signos?: string, labs?: string, accesos?: string, cultivos?: string, accCult?: string, pendientes?: string, sections?: { label: string, lines: string[] }[] }} CensoRow
 * @typedef {{ servicio?: string, mes?: string, fecha?: string, equipo?: string, rows?: CensoRow[] }} CensoPayload
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { parseCamaCellForCenso, formatCamaCellLabel } from './public/js/censo-build.mjs';

const PAGE_W = 1008;
const PAGE_H = 612;
const MARGIN = 24;
/** Bloque título + subtítulo (debe coincidir con drawPageHeader). */
const DOC_HEADER_H = 40;
const FOOTER_H = 10;
const TABLE_HEAD_H = 20;
const FONT = 8;
const FONT_HEAD = 8.5;
const FONT_TITLE = 10;
const LINE_H = 8.2;
const ROW_PAD = 2;

const COLORS = {
  ink: rgb(0.12, 0.14, 0.18),
  muted: rgb(0.42, 0.44, 0.48),
  rule: rgb(0.78, 0.8, 0.84),
  head: rgb(0.92, 0.94, 0.96),
  zebra: rgb(0.97, 0.98, 0.99),
  accent: rgb(0.15, 0.35, 0.55),
  white: rgb(1, 1, 1),
};

/** Pesos relativos de columnas (se escalan al ancho útil de la hoja). */
const COL_WEIGHTS = [
  { key: 'num', title: '#', weight: 8 },
  { key: 'cama', title: 'Cama', weight: 18 },
  { key: 'paciente', title: 'Paciente', weight: 44 },
  { key: 'dx', title: 'Dx', weight: 68 },
  { key: 'meds', title: 'ATB / Meds', weight: 56 },
  { key: 'labs', title: 'Labs', weight: 276 },
  { key: 'accesos', title: 'Accesos', weight: 32 },
  { key: 'cultivos', title: 'Cultivos', weight: 68 },
  { key: 'pend', title: 'Pend.', weight: 130 },
];

/** Centrado horizontal en cuerpo de tabla. */
const CENTER_COLS = { num: true, cama: true, paciente: true, dx: true, meds: true };
/** Alineado arriba (labs multilínea en filas altas). */
const TOP_ALIGN_COLS = { labs: true };
/** Diagnósticos y cama en negrita. */
const BOLD_COLS = { dx: true, cama: true };

/**
 * pdf-lib StandardFonts (WinAnsi) no admiten \\n ni controles en drawText.
 * @param {string} text
 * @returns {string}
 */
function pdfSafeLine(text) {
  return String(text || '')
    .replace(/[\r\n\f\v\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {string} text
 * @param {object} options
 */
function safeDrawText(page, text, options) {
  var t = pdfSafeLine(text);
  if (!t) return;
  page.drawText(t, options);
}

/**
 * @returns {{ cols: { key: string, title: string, w: number, maxLines: number }[], tableW: number, contentW: number }}
 */
function tableLayout() {
  var contentW = PAGE_W - MARGIN * 2;
  var weightSum = COL_WEIGHTS.reduce(function (s, c) {
    return s + c.weight;
  }, 0);
  var cols = COL_WEIGHTS.map(function (col) {
    return {
      key: col.key,
      title: col.title,
      w: Math.round((col.weight / weightSum) * contentW),
    };
  });
  var tableW = cols.reduce(function (s, c) {
    return s + c.w;
  }, 0);
  var drift = contentW - tableW;
  if (drift !== 0) cols[cols.length - 1].w += drift;
  return { cols: cols, tableW: contentW, contentW: contentW };
}

/**
 * @param {import('pdf-lib').PDFFont} font
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} fontSize
 * @returns {string[]}
 */
function wrapText(font, text, maxWidth, fontSize) {
  var words = String(text || '')
    .replace(/\r/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return [''];
  var lines = [];
  var line = '';
  words.forEach(function (word) {
    var test = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        var chunk = '';
        for (var i = 0; i < word.length; i++) {
          var next = chunk + word[i];
          if (font.widthOfTextAtSize(next, fontSize) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = word[i];
          } else {
            chunk = next;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/**
 * @param {import('pdf-lib').PDFFont} font
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} [maxLines] — sin límite si es ≤ 0
 * @returns {string[]}
 */
function wrapCell(font, text, maxWidth, maxLines) {
  var raw = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  if (!raw.length) return ['—'];
  var lines = [];
  raw.forEach(function (block) {
    wrapText(font, pdfSafeLine(block), maxWidth, FONT).forEach(function (ln) {
      lines.push(pdfSafeLine(ln));
    });
  });
  if (!lines.length) return ['—'];
  if (maxLines > 0 && lines.length > maxLines) {
    var cut = lines.slice(0, maxLines);
    var last = cut[maxLines - 1];
    cut[maxLines - 1] =
      last.length > 3 && last.slice(-1) !== '…' ? last.slice(0, Math.max(1, last.length - 2)) + '…' : last;
    return cut;
  }
  return lines;
}

/**
 * @param {import('pdf-lib').PDFFont} font
 * @param {string} line
 * @param {number} maxWidth
 * @param {number} fontSize
 */
function fitLineToWidth(font, line, maxWidth, fontSize) {
  var s = pdfSafeLine(line);
  if (!s || font.widthOfTextAtSize(s, fontSize) <= maxWidth) return s || '—';
  var ell = '…';
  var max = s.length;
  while (max > 0 && font.widthOfTextAtSize(s.slice(0, max) + ell, fontSize) > maxWidth) {
    max -= 1;
  }
  return max > 0 ? s.slice(0, max) + ell : ell;
}

/**
 * @param {CensoRow} row
 * @returns {Record<string, string>}
 */
function formatPacienteCellText(row) {
  var lines = [String(row.pacienteNombre || '—').trim() || '—'];
  var meta = String(row.pacienteMeta || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  meta.forEach(function (l) {
    lines.push(l);
  });
  return lines.join('\n');
}

function rowCells(row) {
  var pac = formatPacienteCellText(row);
  var accesos = row.accesos || pickSection(row, 'Accesos');
  var cultivos = row.cultivos || pickSection(row, 'Cultivos');
  if (!accesos && !cultivos && row.accCult) {
    accesos = row.accCult;
  }
  var pend = row.pendientes || pickSection(row, 'Pendientes');
  var signos = row.signos || pickSection(row, 'Signos / Estado actual');
  if (signos) pend = signos + (pend && pend !== '—' ? '\n' + pend : '');

  return {
    num: String(row.num || ''),
    cama: String(row.cama || '—'),
    paciente: pac,
    dx: row.dx || pickSection(row, 'Diagnósticos'),
    meds: row.meds || pickSection(row, 'ATB / Medicamentos'),
    labs: row.labs || pickSection(row, 'Laboratorios'),
    accesos: accesos,
    cultivos: cultivos,
    pend: pend,
  };
}

/**
 * @param {CensoRow} row
 * @param {string} label
 */
function pickSection(row, label) {
  var sec = (row.sections || []).find(function (s) {
    return s.label === label;
  });
  return sec ? sec.lines.join('\n') : '';
}

/**
 * @param {number} rowH
 * @returns {number}
 */
function maxLinesInRow(rowH) {
  return Math.max(1, Math.floor((rowH - ROW_PAD * 2) / LINE_H));
}

/**
 * @param {import('pdf-lib').PDFFont} font
 * @param {string} text
 * @param {number} innerW
 * @param {number} rowH
 * @returns {string[]}
 */
function cellLines(font, fontBold, text, innerW, rowH, colKey) {
  var measureFont = BOLD_COLS[colKey] ? fontBold : font;
  return wrapCell(measureFont, text, innerW, maxLinesInRow(rowH));
}

/**
 * Líneas envueltas sin truncar (para medir altura de fila).
 * @param {import('pdf-lib').PDFFont} font
 * @param {import('pdf-lib').PDFFont} fontBold
 * @param {string} text
 * @param {number} innerW
 * @param {string} colKey
 */
function cellLinesUnbounded(font, fontBold, text, innerW, colKey) {
  var measureFont = BOLD_COLS[colKey] ? fontBold : font;
  return wrapCell(measureFont, text, innerW, 0);
}

/**
 * @param {number} lineCount
 * @returns {number}
 */
function rowHeightForLineCount(lineCount) {
  return ROW_PAD * 2 + Math.max(1, lineCount) * LINE_H;
}

/**
 * @param {import('pdf-lib').PDFFont} font
 * @param {import('pdf-lib').PDFFont} fontBold
 * @param {CensoRow} row
 * @param {{ cols: { key: string, w: number }[] }} layout
 * @returns {number}
 */
function measureRowLineCount(font, fontBold, row, layout) {
  var cells = rowCells(row);
  var maxLines = 1;
  layout.cols.forEach(function (col) {
    if (col.key === 'cama') return;
    var innerW = col.w - 6;
    var count = cellLinesUnbounded(font, fontBold, cells[col.key] || '', innerW, col.key).length;
    if (count > maxLines) maxLines = count;
  });
  return maxLines;
}

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {number} yTop
 * @param {import('pdf-lib').PDFFont} font
 * @param {import('pdf-lib').PDFFont} fontBold
 */
function drawColumnGuides(page, x, yBottom, height, cols) {
  var tx = x;
  for (var i = 0; i < cols.length - 1; i++) {
    tx += cols[i].w;
    page.drawLine({
      start: { x: tx, y: yBottom },
      end: { x: tx, y: yBottom + height },
      thickness: 0.25,
      color: COLORS.rule,
    });
  }
}

/**
 * Texto vertical centrado en la celda; reduce tamaño si no cabe en la altura.
 * @param {import('pdf-lib').PDFPage} page
 * @param {string} text
 * @param {number} boxX
 * @param {number} boxY
 * @param {number} boxW
 * @param {number} boxH
 * @param {import('pdf-lib').PDFFont} f
 * @param {number} maxSize
 * @param {import('pdf-lib').Color} [color]
 */
/**
 * @param {{ minSize?: number, allowTruncate?: boolean, valign?: 'top'|'center' }} [opts]
 */
function drawTextVerticalInBox(page, text, boxX, boxY, boxW, boxH, f, maxSize, color, opts) {
  var o = opts || {};
  var minSize = o.minSize != null ? o.minSize : 6;
  var valign = o.valign === 'top' ? 'top' : 'center';
  var s = pdfSafeLine(text) || '—';
  var pad = 3;
  var maxAlong = Math.max(minSize * 2, boxH - pad * 2);
  var size = maxSize;
  while (size > minSize && f.widthOfTextAtSize(s, size) > maxAlong) {
    size -= 0.25;
  }
  if (o.allowTruncate && f.widthOfTextAtSize(s, size) > maxAlong) {
    while (s.length > 1 && f.widthOfTextAtSize(s, size) > maxAlong) {
      s = s.slice(0, -1);
    }
    if (s.length > 1 && s !== String(text || '').trim()) s += '…';
  }
  var along = f.widthOfTextAtSize(s, size);
  var thick = f.heightAtSize(size);
  var bboxW = thick;
  var bboxH = along;
  var cx = boxX + boxW / 2;
  var cy = boxY + boxH / 2;
  var x = cx - bboxW / 2;
  var y = valign === 'top' ? boxY + boxH - pad - bboxH : cy - bboxH / 2;
  safeDrawText(page, s, {
    x: x,
    y: y,
    size: size,
    font: f,
    rotate: degrees(90),
    color: color || COLORS.accent,
  });
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function drawTableHeader(page, yTop, font, fontBold, layout) {
  var x = MARGIN;
  var cols = layout.cols;
  var headTop = yTop - TABLE_HEAD_H;
  page.drawRectangle({
    x: x,
    y: headTop,
    width: layout.tableW,
    height: TABLE_HEAD_H,
    color: COLORS.head,
    borderColor: COLORS.rule,
    borderWidth: 0.5,
  });
  var tx = x;
  cols.forEach(function (col) {
    var title = col.title;
    var headY = headTop + 2;
    if (CENTER_COLS[col.key]) {
      var tw = fontBold.widthOfTextAtSize(title, FONT_HEAD);
      safeDrawText(page, title, {
        x: tx + (col.w - tw) / 2,
        y: headTop + (TABLE_HEAD_H - FONT_HEAD) / 2 + 1,
        size: FONT_HEAD,
        font: fontBold,
        color: COLORS.accent,
      });
    } else {
      safeDrawText(page, title, {
        x: tx + 2,
        y: headY,
        size: FONT_HEAD,
        font: fontBold,
        color: COLORS.accent,
      });
    }
    tx += col.w;
  });
}

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {CensoRow} row
 * @param {number} yTop
 * @param {number} rowH
 * @param {import('pdf-lib').PDFFont} font
 * @param {import('pdf-lib').PDFFont} fontBold
 * @param {boolean} zebra
 */
/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {string[]} lines
 * @param {number} tx
 * @param {number} innerW
 * @param {number} yTop
 * @param {number} rowH
 * @param {import('pdf-lib').PDFFont} font
 * @param {import('pdf-lib').PDFFont} fontBold
 * @param {string} colKey
 */
function drawCellText(page, lines, tx, colW, innerW, yTop, rowH, font, fontBold, colKey) {
  var centered = !!CENTER_COLS[colKey];
  var topAlign = !!TOP_ALIGN_COLS[colKey];
  var vCenter = centered && !topAlign;
  var useBold = !!BOLD_COLS[colKey] || colKey === 'num';
  var cellFont = useBold ? fontBold : font;
  var minY = yTop - rowH + ROW_PAD;
  var maxLines = maxLinesInRow(rowH);
  var toDraw = [];
  lines.forEach(function (ln) {
    if (toDraw.length >= maxLines) return;
    var fitted = fitLineToWidth(cellFont, ln, innerW, FONT);
    toDraw.push({
      fitted: fitted,
      textW: cellFont.widthOfTextAtSize(fitted, FONT),
    });
  });
  var blockH = toDraw.length * LINE_H;
  var innerH = rowH - ROW_PAD * 2;
  var y = topAlign || !vCenter
    ? yTop - ROW_PAD - FONT
    : yTop - ROW_PAD - (innerH - blockH) / 2 - FONT;
  toDraw.forEach(function (item) {
    if (y < minY) return;
    var x = centered ? tx + (colW - item.textW) / 2 : tx + 2;
    safeDrawText(page, item.fitted, {
      x: x,
      y: y,
      size: FONT,
      font: cellFont,
      color: colKey === 'num' ? COLORS.accent : COLORS.ink,
    });
    y -= LINE_H;
  });
}

/**
 * Cuarto y cama en vertical, bloque centrado en la celda.
 * @param {import('pdf-lib').PDFPage} page
 * @param {string} text
 * @param {number} tx
 * @param {number} colW
 * @param {number} yBottom
 * @param {number} rowH
 * @param {import('pdf-lib').PDFFont} fontBold
 */
function drawCamaCell(page, text, tx, colW, yBottom, rowH, fontBold) {
  var label = formatCamaCellLabel(parseCamaCellForCenso(text));
  var pad = 4;
  var innerH = rowH - pad * 2;
  drawTextVerticalInBox(page, label, tx, yBottom + pad, colW, innerH, fontBold, FONT, COLORS.accent, {
    minSize: 7,
    valign: 'center',
    allowTruncate: true,
  });
}

function drawTableRow(page, row, yTop, rowH, font, fontBold, zebra, layout) {
  var x = MARGIN;
  var cols = layout.cols;
  var yBottom = yTop - rowH;
  page.drawRectangle({
    x: x,
    y: yBottom,
    width: layout.tableW,
    height: rowH,
    color: zebra ? COLORS.zebra : COLORS.white,
    borderColor: COLORS.rule,
    borderWidth: 0.35,
  });
  drawColumnGuides(page, x, yBottom, rowH, cols);

  var cells = rowCells(row);
  var tx = x;
  cols.forEach(function (col) {
    if (col.key === 'cama') {
      drawCamaCell(page, cells.cama, tx, col.w, yBottom, rowH, fontBold);
      tx += col.w;
      return;
    }
    var innerW = col.w - 6;
    var lines = cellLines(font, fontBold, cells[col.key] || '', innerW, rowH, col.key);
    drawCellText(page, lines, tx, col.w, innerW, yTop, rowH, font, fontBold, col.key);
    tx += col.w;
  });
}

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {CensoPayload} data
 * @param {import('pdf-lib').PDFFont} font
 * @param {import('pdf-lib').PDFFont} fontBold
 */
function drawPageHeader(page, data, font, fontBold) {
  var titleLine = String(data.titleLine || 'Censo de Sala').trim();
  var equipoLine = String(data.equipoLine || data.equipo || '').trim();
  var mes = String(data.mes || '').trim();
  var fecha = String(data.fecha || '').trim();

  safeDrawText(page, titleLine, {
    x: MARGIN,
    y: PAGE_H - MARGIN - 2,
    size: FONT_TITLE,
    font: fontBold,
    color: COLORS.ink,
  });

  if (mes) {
    var mesW = fontBold.widthOfTextAtSize(pdfSafeLine(mes), 10);
    safeDrawText(page, mes, {
      x: PAGE_W / 2 - mesW / 2,
      y: PAGE_H - MARGIN - 3,
      size: 10,
      font: fontBold,
      color: COLORS.accent,
    });
  }

  if (fecha) {
    var fechaW = font.widthOfTextAtSize(pdfSafeLine(fecha), FONT_HEAD);
    safeDrawText(page, fecha, {
      x: PAGE_W - MARGIN - fechaW,
      y: PAGE_H - MARGIN - 2,
      size: FONT_HEAD,
      font: font,
      color: COLORS.muted,
    });
  }

  if (equipoLine) {
    safeDrawText(page, equipoLine, {
      x: MARGIN,
      y: PAGE_H - MARGIN - 16,
      size: FONT,
      font: font,
      color: COLORS.muted,
    });
  }
}

/**
 * @param {Record<string, unknown>} header
 * @returns {string}
 */
function buildEquipoLine(header) {
  if (header.equipoLine) return String(header.equipoLine).trim();
  var parts = [];
  if (header.r2) parts.push(String(header.r2));
  if (header.r1a) parts.push(String(header.r1a));
  else if (header.r1) parts.push(String(header.r1));
  if (header.r1b) parts.push(String(header.r1b));
  var maestro = header.maestro || header.profesor;
  if (maestro) parts.push(String(maestro));
  return parts.filter(Boolean).join(' · ');
}

/**
 * @param {CensoPayload & { header?: Record<string, unknown> }} raw
 * @returns {CensoPayload}
 */
function normalizePayload(raw) {
  var header = raw.header || {};
  var titleLine = String(header.titleLine || '').trim();
  if (!titleLine) {
    var ubic = String(header.ubicacion || header.torre || header.sala || '').trim();
    if (/^torre/i.test(ubic)) titleLine = 'Censo de Torre HU';
    else {
      titleLine = 'Censo de Sala';
      if (ubic) titleLine += ' ' + ubic;
    }
  }
  return {
    servicio: String(raw.servicio || header.servicio || '').trim(),
    titleLine: titleLine,
    mes: String(header.mes || raw.mes || '').trim(),
    fecha: String(header.fecha || raw.fecha || '').trim(),
    equipoLine: String(header.equipoLine || raw.equipo || buildEquipoLine(header)).trim(),
    equipo: String(header.equipoLine || raw.equipo || buildEquipoLine(header)).trim(),
    rows: raw.rows || [],
  };
}

/**
 * @returns {{ tableTop: number, tableBottom: number, availH: number }}
 */
function pageTableMetrics() {
  var tableTop = PAGE_H - MARGIN - DOC_HEADER_H;
  var tableBottom = MARGIN + FOOTER_H;
  var availH = tableTop - TABLE_HEAD_H - tableBottom;
  return { tableTop: tableTop, tableBottom: tableBottom, availH: availH };
}

/**
 * Agrupa filas en páginas: altura por contenido (labs largos → fila más alta).
 * @param {CensoRow[]} rows
 * @param {import('pdf-lib').PDFFont} font
 * @param {import('pdf-lib').PDFFont} fontBold
 * @param {{ cols: { key: string, w: number }[] }} layout
 */
function layoutRows(rows, font, fontBold, layout) {
  var metrics = pageTableMetrics();
  var availH = metrics.availH;
  var minRowH = rowHeightForLineCount(1);
  var pages = [];
  var current = null;

  function flush() {
    if (current && current.rows.length) pages.push(current);
    current = null;
  }

  (rows || []).forEach(function (row) {
    var lineCount = measureRowLineCount(font, fontBold, row, layout);
    var rowH = rowHeightForLineCount(lineCount);

    if (!current) {
      current = { rows: [], heights: [], metrics: metrics };
    } else {
      var used = current.heights.reduce(function (s, h) {
        return s + h;
      }, 0);
      if (used + rowH > availH) {
        flush();
        current = { rows: [], heights: [], metrics: metrics };
      }
    }

    current.rows.push(row);
    current.heights.push(Math.max(minRowH, rowH));
  });

  flush();
  if (!pages.length) {
    pages.push({ rows: [], heights: [], metrics: metrics });
  }
  return pages;
}

/**
 * @param {CensoPayload & { header?: Record<string, unknown> }} payload
 * @returns {Promise<Uint8Array>}
 */
export async function renderCensusPdf(payload) {
  var data = normalizePayload(payload);
  var pdfDoc = await PDFDocument.create();
  var font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  var fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  var rows = data.rows || [];
  var tbl = tableLayout();
  var layouts = layoutRows(rows, font, fontBold, tbl);

  layouts.forEach(function (layout, pageIdx) {
    var page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    var metrics = layout.metrics;
    drawPageHeader(page, data, font, fontBold);
    var y = metrics.tableTop;
    drawTableHeader(page, y, font, fontBold, tbl);
    y -= TABLE_HEAD_H;

    layout.rows.forEach(function (row, i) {
      var rowH = layout.heights[i];
      drawTableRow(page, row, y, rowH, font, fontBold, i % 2 === 1, tbl);
      y -= rowH;
    });

    var label = 'Pág. ' + (pageIdx + 1) + '/' + layouts.length;
    safeDrawText(page, label, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(pdfSafeLine(label), 6),
      y: MARGIN - 4,
      size: 6,
      font: font,
      color: COLORS.muted,
    });
  });

  return pdfDoc.save();
}

export { layoutRows, measureRowLineCount, rowHeightForLineCount, pageTableMetrics };
