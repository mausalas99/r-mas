/**
 * Export helpers for tendencias group table and SOME lab tables (TSV + PNG).
 */

const THEMES = {
  default: {
    labelHeader: 'Analito',
    fontSize: 11,
    rowH: 22,
    headerH: 26,
    cellPad: 8,
    labelMin: 100,
    labelMax: 220,
    colMin: 56,
    colMax: 120,
    titleAlign: 'left',
    titleSize: 10,
    zebra: false,
    outerRadius: 0,
  },
  some: {
    labelHeader: 'Estudio',
    fontSize: 12,
    rowH: 26,
    headerH: 28,
    cellPad: 10,
    labelMin: 140,
    labelMax: 520,
    colMin: [140, 110],
    colMax: [320, 360],
    titleAlign: 'center',
    titleSize: 13,
    zebra: true,
    outerRadius: 8,
  },
  'some-cito': {
    labelHeader: 'Estudio',
    fontSize: 12,
    rowH: 26,
    headerH: 28,
    cellPad: 10,
    labelMin: 140,
    labelMax: 520,
    colMin: [200],
    colMax: [420],
    titleAlign: 'center',
    titleSize: 13,
    zebra: true,
    outerRadius: 8,
  },
};

export function buildTableTsv(model) {
  if (!model || !model.columns || !model.rows) return '';
  var theme = resolveTableTheme(model);
  var visibleCols = model.columns.filter(function (c) {
    return !c.hidden;
  });
  var labelHeader = model.labelHeader || theme.labelHeader;
  var lines = [];
  lines.push(
    [labelHeader]
      .concat(
        visibleCols.map(function (c) {
          return c.header || '';
        })
      )
      .join('\t')
  );
  model.rows.forEach(function (row) {
    if (row.hidden) return;
    var cells = row.cells
      .map(function (cell, ci) {
        return { cell: cell, col: model.columns[ci] };
      })
      .filter(function (x) {
        return x.col && !x.col.hidden;
      })
      .map(function (x) {
        return x.cell && x.cell.text != null ? String(x.cell.text) : '';
      });
    lines.push([row.label || ''].concat(cells).join('\t'));
  });
  return lines.join('\n');
}

export function copyTableText(text, onDone) {
  var done = typeof onDone === 'function' ? onDone : function () {};
  var t = text == null ? '' : String(text);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(t)
      .then(function () {
        done(true);
      })
      .catch(function () {
        done(fallbackCopyText(t));
      });
    return;
  }
  done(fallbackCopyText(t));
}

function fallbackCopyText(text) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_e) {
    return false;
  }
}

function resolveTableTheme(model) {
  if (model && model.theme && THEMES[model.theme]) return THEMES[model.theme];
  if (model && model.columns && model.columns.length === 1 && /resultado/i.test(String(model.columns[0].header || ''))) {
    return THEMES['some-cito'];
  }
  if (
    model &&
    model.columns &&
    model.columns.length === 2 &&
    /resultado/i.test(String(model.columns[0].header || '')) &&
    /referencia/i.test(String(model.columns[1].header || ''))
  ) {
    return THEMES.some;
  }
  return THEMES.default;
}

function measureTextWidth(ctx, text, font) {
  ctx.font = font;
  return ctx.measureText(String(text || '')).width;
}

function truncateToWidth(ctx, text, maxW, font) {
  var t = String(text == null ? '' : text);
  if (measureTextWidth(ctx, t, font) <= maxW) return t;
  var ell = '…';
  while (t.length > 1 && measureTextWidth(ctx, t + ell, font) > maxW) {
    t = t.slice(0, -1);
  }
  return t + ell;
}

function fitCellText(ctx, text, maxW, font) {
  var t = String(text == null ? '' : text);
  if (measureTextWidth(ctx, t, font) <= maxW) return t;
  return truncateToWidth(ctx, t, maxW, font);
}

function drawRoundRect(ctx, x, y, w, h, r) {
  var radius = Math.min(r, w / 2, h / 2);
  if (radius <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function cellDisplayText(cell, theme) {
  if (!cell) return '—';
  var text = cell.text != null ? String(cell.text) : '';
  if (!text) text = '—';
  if (
    (theme === THEMES.some || theme === THEMES['some-cito']) &&
    cell.flag &&
    cell.flag !== '*' &&
    text !== '—'
  ) {
    return String(cell.flag).toUpperCase() + ' ' + text;
  }
  return text;
}

function colWidthLimits(theme, colIndex) {
  if (theme.colMin && Array.isArray(theme.colMin)) {
    return {
      min: theme.colMin[colIndex] || theme.colMin[0] || 56,
      max: (theme.colMax && theme.colMax[colIndex]) || theme.colMax[0] || 160,
    };
  }
  return { min: theme.colMin, max: theme.colMax };
}

function measureCellContentWidth(ctx, cell, theme, font, fontBold) {
  if (!cell) return measureTextWidth(ctx, '—', font);
  var text = cell.text != null ? String(cell.text) : '—';
  if (!text) text = '—';
  if (
    (theme === THEMES.some || theme === THEMES['some-cito']) &&
    cell.flag &&
    cell.flag !== '*' &&
    text !== '—'
  ) {
    var flagFont = '700 ' + theme.fontSize + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
    var valueFont = cell.abnormal ? fontBold : font;
    return (
      measureTextWidth(ctx, String(cell.flag).toUpperCase() + ' ', flagFont) +
      measureTextWidth(ctx, text, valueFont)
    );
  }
  var useFont = cell.abnormal ? fontBold : font;
  return measureTextWidth(ctx, cellDisplayText(cell, theme), useFont);
}

/**
 * Dibuja la tabla en canvas (fiable en Electron; sin foreignObject).
 * @param {object} model — columns, rows; opcional theme, labelHeader
 */
export function copyTableModelAsPng(model, title, onDone) {
  var done = typeof onDone === 'function' ? onDone : function () {};
  if (!model || !model.columns || !model.rows) {
    done(false);
    return;
  }

  var visibleCols = model.columns.filter(function (c) {
    return !c.hidden;
  });
  var visibleRows = model.rows.filter(function (r) {
    return !r.hidden;
  });
  if (!visibleCols.length || !visibleRows.length) {
    done(false);
    return;
  }

  var theme = resolveTableTheme(model);
  var labelHeader = model.labelHeader || theme.labelHeader;
  var isSome = theme === THEMES.some || theme === THEMES['some-cito'];

  var SCALE = 2;
  var MARGIN = isSome ? 16 : 12;
  var TITLE_H = isSome ? 36 : 22;
  var CELL_PAD = theme.cellPad;
  var ROW_H = theme.rowH;
  var HEADER_H = theme.headerH;
  var font = theme.fontSize + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
  var fontBold = '600 ' + font;
  var fontLabel = '600 ' + font;
  var fontTitle = (isSome ? '600 ' : 'bold ') + theme.titleSize + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
  var fontHeader = '700 ' + (isSome ? '10' : '11') + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';

  var probe = document.createElement('canvas').getContext('2d');
  var labelColW = Math.max(
    theme.labelMin,
    measureTextWidth(probe, labelHeader, fontHeader) + CELL_PAD * 2
  );
  visibleRows.forEach(function (row) {
    labelColW = Math.max(
      labelColW,
      measureTextWidth(probe, row.label || '', fontLabel) + CELL_PAD * 2
    );
  });
  if (theme.labelMax > 0) labelColW = Math.min(labelColW, theme.labelMax);

  var colWidths = visibleCols.map(function (col, ci) {
    var limits = colWidthLimits(theme, ci);
    var hdr = col.header || '';
    var w = measureTextWidth(probe, isSome ? hdr : hdr, fontHeader) + CELL_PAD * 2;
    if (isSome) {
      w = Math.max(w, measureTextWidth(probe, hdr.toUpperCase(), fontHeader) + CELL_PAD * 2);
    }
    visibleRows.forEach(function (row) {
      var cell = row.cells[model.columns.indexOf(col)];
      if (!cell) return;
      w = Math.max(
        w,
        measureCellContentWidth(probe, cell, theme, font, fontBold) + CELL_PAD * 2
      );
    });
    return Math.min(Math.max(w, limits.min), limits.max);
  });

  var tableW = labelColW + colWidths.reduce(function (a, b) {
    return a + b;
  }, 0);
  var tableH = HEADER_H + visibleRows.length * ROW_H;
  var framePad = theme.outerRadius > 0 ? 1 : 0;
  var cw = tableW + MARGIN * 2 + framePad * 2;
  var ch = tableH + TITLE_H + MARGIN * 2 + framePad * 2;

  var canvas = document.createElement('canvas');
  canvas.width = cw * SCALE;
  canvas.height = ch * SCALE;
  var ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);

  var titleText = String(title || 'Tabla').trim();
  var ox = MARGIN + framePad;
  var oy = MARGIN + framePad;

  if (theme.outerRadius > 0) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, ox - 1, oy - 1, tableW + 2, tableH + TITLE_H + 2, theme.outerRadius + 1);
    ctx.stroke();
  }

  ctx.save();
  ctx.font = fontTitle;
  ctx.fillStyle = isSome ? '#334155' : '#9ca3af';
  ctx.textAlign = theme.titleAlign;
  ctx.textBaseline = 'top';
  var titleX = theme.titleAlign === 'center' ? ox + tableW / 2 : ox;
  var titleY = oy + (isSome ? 10 : 0);
  ctx.fillText(titleText, titleX, titleY);
  if (isSome && titleText) {
    var titleW = measureTextWidth(ctx, titleText, fontTitle);
    var underlineY = titleY + theme.titleSize + 4;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(titleX - titleW / 2, underlineY);
    ctx.lineTo(titleX + titleW / 2, underlineY);
    ctx.stroke();
  }
  ctx.restore();

  oy += TITLE_H;
  var tableOx = ox;
  var tableOy = oy;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;

  function fillCell(x, y, w, h, fill) {
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    }
  }

  function strokeCell(x, y, w, h) {
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // Header row
  fillCell(tableOx, tableOy, tableW, HEADER_H, isSome ? '#f1f5f9' : '#f3f4f6');
  ctx.font = fontHeader;
  ctx.fillStyle = isSome ? '#64748b' : '#6b7280';
  var hx = tableOx;
  strokeCell(hx, tableOy, labelColW, HEADER_H);
  var headerLabel = isSome ? labelHeader.toUpperCase() : labelHeader;
  ctx.fillText(
    fitCellText(ctx, headerLabel, labelColW - CELL_PAD * 2, fontHeader),
    hx + CELL_PAD,
    tableOy + HEADER_H / 2
  );
  hx += labelColW;
  for (var ci = 0; ci < visibleCols.length; ci++) {
    strokeCell(hx, tableOy, colWidths[ci], HEADER_H);
    var hdr = visibleCols[ci].header || '';
    if (isSome) hdr = hdr.toUpperCase();
    ctx.fillText(
      fitCellText(ctx, hdr, colWidths[ci] - CELL_PAD * 2, fontHeader),
      hx + CELL_PAD,
      tableOy + HEADER_H / 2
    );
    hx += colWidths[ci];
  }

  // Body
  for (var ri = 0; ri < visibleRows.length; ri++) {
    var row = visibleRows[ri];
    var ry = tableOy + HEADER_H + ri * ROW_H;
    var zebraFill = theme.zebra && ri % 2 === 1 ? '#f8fafc' : null;
    var cx = tableOx;

    fillCell(cx, ry, labelColW, ROW_H, zebraFill);
    strokeCell(cx, ry, labelColW, ROW_H);
    ctx.font = fontLabel;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(
      fitCellText(ctx, row.label || '', labelColW - CELL_PAD * 2, fontLabel),
      cx + CELL_PAD,
      ry + ROW_H / 2
    );
    cx += labelColW;

    for (var cj = 0; cj < visibleCols.length; cj++) {
      var colIdx = model.columns.indexOf(visibleCols[cj]);
      var cell = row.cells[colIdx];
      var abnormal = !!(cell && cell.abnormal);
      var cellText = cellDisplayText(cell, theme);
      var cellFill = abnormal ? '#fef2f2' : zebraFill;

      fillCell(cx, ry, colWidths[cj], ROW_H, cellFill);
      strokeCell(cx, ry, colWidths[cj], ROW_H);

      if (isSome && cell && cell.flag && cell.flag !== '*' && cellText !== '—') {
        var flag = String(cell.flag).toUpperCase();
        var valuePart = cell.text != null ? String(cell.text) : '—';
        var flagFont =
          '700 ' + theme.fontSize + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
        ctx.font = flagFont;
        ctx.fillStyle = '#dc2626';
        var flagLabel = flag + ' ';
        var flagW = measureTextWidth(ctx, flagLabel, flagFont);
        ctx.fillText(flagLabel, cx + CELL_PAD, ry + ROW_H / 2);
        ctx.font = abnormal ? fontBold : font;
        ctx.fillStyle = abnormal ? '#dc2626' : '#0f172a';
        ctx.fillText(
          fitCellText(ctx, valuePart, colWidths[cj] - CELL_PAD * 2 - flagW, ctx.font),
          cx + CELL_PAD + flagW,
          ry + ROW_H / 2
        );
      } else {
        ctx.font = abnormal ? fontBold : font;
        ctx.fillStyle = abnormal ? '#dc2626' : isSome && cj > 0 ? '#64748b' : '#0f172a';
        ctx.fillText(
          fitCellText(ctx, cellText, colWidths[cj] - CELL_PAD * 2, ctx.font),
          cx + CELL_PAD,
          ry + ROW_H / 2
        );
      }
      cx += colWidths[cj];
    }
  }

  canvas.toBlob(function (pngBlob) {
    if (!pngBlob) {
      done(false);
      return;
    }
    writePngToClipboardOrDownload(pngBlob, title, done);
  }, 'image/png');
}

/** @deprecated Prefer copyTableModelAsPng — mantiene compatibilidad si solo hay DOM. */
export function copyTableAsPng(tableEl, title, onDone) {
  if (!tableEl) {
    var done0 = typeof onDone === 'function' ? onDone : function () {};
    done0(false);
    return;
  }
  copyTableModelAsPng(tableDomToExportModel(tableEl), title, onDone);
}

function tableDomToExportModel(tableEl) {
  var columns = [];
  var rows = [];
  var ths = tableEl.querySelectorAll('thead th');
  var labelHeader = (ths[0] && (ths[0].textContent || '').trim()) || 'Analito';
  for (var i = 1; i < ths.length; i++) {
    var th = ths[i];
    if (th.classList.contains('is-hidden')) continue;
    columns.push({
      header: (th.textContent || '').replace(/\s+/g, ' ').trim(),
      hidden: false,
    });
  }
  var groupEl = tableEl.closest('.lab-some-group');
  var variant = (groupEl && groupEl.getAttribute('data-variant')) || 'standard';
  var isSomeTable = tableEl.classList.contains('lab-some-table');
  tableEl.querySelectorAll('tbody tr').forEach(function (tr) {
    if (tr.classList.contains('is-hidden')) return;
    var tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    var label = (tds[0].textContent || '').replace(/\s+/g, ' ').trim();
    var resCell = tds[1];
    var flagEl = resCell.querySelector('.lab-some-flag');
    var cells = [
      {
        text: (resCell.textContent || '').replace(/^(A|B|CB|CA)\s+/i, '').trim(),
        abnormal:
          resCell.classList.contains('tend-abnormal') || resCell.classList.contains('lab-some-abnormal'),
        flag: flagEl ? flagEl.textContent.trim() : undefined,
      },
    ];
    if (variant !== 'cito' && tds[2]) {
      cells.push({
        text: (tds[2].textContent || '').trim(),
        abnormal: false,
      });
    }
    rows.push({ label: label, hidden: false, cells: cells });
  });
  return {
    columns: columns,
    rows: rows,
    labelHeader: labelHeader,
    theme: isSomeTable ? (variant === 'cito' ? 'some-cito' : 'some') : undefined,
  };
}

function writePngToClipboardOrDownload(pngBlob, title, done) {
  if (navigator.clipboard && window.ClipboardItem) {
    navigator.clipboard
      .write([new ClipboardItem({ 'image/png': pngBlob })])
      .then(function () {
        done(true);
      })
      .catch(function () {
        downloadPngBlob(pngBlob, title);
        done(true);
      });
    return;
  }
  downloadPngBlob(pngBlob, title);
  done(true);
}

function downloadPngBlob(pngBlob, title) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(pngBlob);
  a.download =
    String(title || 'tabla')
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase() + '.png';
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
  }, 500);
}
