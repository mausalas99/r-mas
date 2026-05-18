/**
 * Export helpers for tendencias group table (TSV + PNG).
 */

export function buildTableTsv(model) {
  if (!model || !model.columns || !model.rows) return '';
  var visibleCols = model.columns.filter(function (c) {
    return !c.hidden;
  });
  var lines = [];
  lines.push(
    ['Analito']
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

/**
 * Dibuja la tabla en canvas (fiable en Electron; sin foreignObject).
 * @param {object} model — mismo formato que buildTableTsv
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

  var SCALE = 2;
  var TITLE_H = 22;
  var MARGIN = 12;
  var CELL_PAD = 8;
  var ROW_H = 22;
  var HEADER_H = 26;
  var font = '11px Arial,sans-serif';
  var fontBold = 'bold 11px Arial,sans-serif';
  var fontTitle = 'bold 10px Arial,sans-serif';

  var probe = document.createElement('canvas').getContext('2d');
  var labelColW = Math.max(
    100,
    measureTextWidth(probe, 'Analito', fontBold) + CELL_PAD * 2
  );
  visibleRows.forEach(function (row) {
    labelColW = Math.max(
      labelColW,
      measureTextWidth(probe, row.label || '', font) + CELL_PAD * 2
    );
  });
  labelColW = Math.min(labelColW, 220);

  var colWidths = visibleCols.map(function (col) {
    var w = measureTextWidth(probe, col.header || '', fontBold) + CELL_PAD * 2;
    visibleRows.forEach(function (row) {
      var cell = row.cells[model.columns.indexOf(col)];
      if (!cell) return;
      w = Math.max(w, measureTextWidth(probe, cell.text || '', font) + CELL_PAD * 2);
    });
    return Math.min(Math.max(w, 56), 120);
  });

  var tableW = labelColW + colWidths.reduce(function (a, b) {
    return a + b;
  }, 0);
  var tableH = HEADER_H + visibleRows.length * ROW_H;
  var cw = tableW + MARGIN * 2;
  var ch = tableH + TITLE_H + MARGIN * 2;

  var canvas = document.createElement('canvas');
  canvas.width = cw * SCALE;
  canvas.height = ch * SCALE;
  var ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);

  ctx.font = fontTitle;
  ctx.fillStyle = '#9ca3af';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(title || 'Tabla').toUpperCase(), MARGIN, MARGIN);

  var ox = MARGIN;
  var oy = MARGIN + TITLE_H;

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;

  function strokeCell(x, y, w, h) {
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // Header row
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(ox, oy, tableW, HEADER_H);
  ctx.font = fontBold;
  ctx.fillStyle = '#6b7280';
  ctx.textBaseline = 'middle';
  var hx = ox;
  strokeCell(hx, oy, labelColW, HEADER_H);
  ctx.fillText(
    truncateToWidth(ctx, 'Analito', labelColW - CELL_PAD * 2, fontBold),
    hx + CELL_PAD,
    oy + HEADER_H / 2
  );
  hx += labelColW;
  for (var ci = 0; ci < visibleCols.length; ci++) {
    strokeCell(hx, oy, colWidths[ci], HEADER_H);
    ctx.fillText(
      truncateToWidth(ctx, visibleCols[ci].header || '', colWidths[ci] - CELL_PAD * 2, fontBold),
      hx + CELL_PAD,
      oy + HEADER_H / 2
    );
    hx += colWidths[ci];
  }

  // Body
  ctx.font = font;
  for (var ri = 0; ri < visibleRows.length; ri++) {
    var row = visibleRows[ri];
    var ry = oy + HEADER_H + ri * ROW_H;
    var cx = ox;
    strokeCell(cx, ry, labelColW, ROW_H);
    ctx.fillStyle = '#111827';
    ctx.fillText(
      truncateToWidth(ctx, row.label || '', labelColW - CELL_PAD * 2, font),
      cx + CELL_PAD,
      ry + ROW_H / 2
    );
    cx += labelColW;
    for (var cj = 0; cj < visibleCols.length; cj++) {
      var colIdx = model.columns.indexOf(visibleCols[cj]);
      var cell = row.cells[colIdx];
      var cellText = cell && cell.text != null ? String(cell.text) : '—';
      strokeCell(cx, ry, colWidths[cj], ROW_H);
      ctx.fillStyle = cell && cell.abnormal ? '#dc2626' : '#111827';
      if (cell && cell.abnormal) ctx.font = 'bold 11px Arial,sans-serif';
      ctx.fillText(
        truncateToWidth(ctx, cellText, colWidths[cj] - CELL_PAD * 2, ctx.font),
        cx + CELL_PAD,
        ry + ROW_H / 2
      );
      ctx.font = font;
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
  for (var i = 1; i < ths.length; i++) {
    var th = ths[i];
    if (th.classList.contains('is-hidden')) continue;
    columns.push({
      header: (th.textContent || '').replace(/\s+/g, ' ').trim(),
      hidden: false
    });
  }
  tableEl.querySelectorAll('tbody tr').forEach(function (tr) {
    if (tr.classList.contains('is-hidden')) return;
    var tds = tr.querySelectorAll('td');
    if (!tds.length) return;
    var label = (tds[0].textContent || '').replace(/\s+/g, ' ').trim();
    var cells = [];
    for (var j = 1; j < tds.length; j++) {
      if (tds[j].classList.contains('is-hidden')) continue;
      cells.push({
        text: (tds[j].textContent || '').trim(),
        abnormal: tds[j].classList.contains('tend-abnormal')
      });
    }
    rows.push({ label: label, hidden: false, cells: cells });
  });
  return { columns: columns, rows: rows };
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
