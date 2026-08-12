/**
 * Compact proposed-edit table: remove tint + optional added row.
 */
import { escHtml } from './dom-escape.mjs';

/**
 * @param {{
 *   title?: string,
 *   columns: string[],
 *   rows: Array<{ cells: string[], removed?: boolean }>,
 *   addedRow?: { cells: string[] } | null,
 *   showAdded?: boolean,
 * }} opts
 */
export function buildDiffTableHtml(opts) {
  opts = opts || {};
  var columns = opts.columns || [];
  var rows = opts.rows || [];
  var colCount = Math.max(columns.length, 1);
  var head = columns
    .map(function (h) {
      return '<th class="ui-diff-th">' + escHtml(h) + '</th>';
    })
    .join('');
  var body = rows
    .map(function (row) {
      var out = !!row.removed;
      var cells = (row.cells || [])
        .map(function (c, i) {
          return (
            '<td class="ui-diff-td' +
            (i === 0 ? ' ui-diff-td--primary' : '') +
            '">' +
            escHtml(c) +
            '</td>'
          );
        })
        .join('');
      return (
        '<tr class="ui-diff-row' +
        (out ? ' ui-diff-row--removed' : '') +
        '">' +
        cells +
        '</tr>'
      );
    })
    .join('');
  var added = '';
  if (opts.showAdded && opts.addedRow && opts.addedRow.cells) {
    var addCells = opts.addedRow.cells
      .map(function (c, i) {
        return (
          '<td class="ui-diff-td' +
          (i === 0 ? ' ui-diff-td--primary' : '') +
          '">' +
          escHtml(c) +
          '</td>'
        );
      })
      .join('');
    added =
      '<tr class="ui-diff-row ui-diff-row--added">' + addCells + '</tr>';
  }
  var title = opts.title
    ? '<div class="ui-diff-bar"><span class="ui-diff-title">' + escHtml(opts.title) + '</span></div>'
    : '';
  return (
    '<div class="ui-diff-table-wrap">' +
    title +
    '<table class="ui-diff-table"><thead><tr>' +
    head +
    '</tr></thead><tbody>' +
    body +
    added +
    '</tbody></table></div>'
  );
}

/** Map clinical conflict field rows into diff-table grammar (remove = hot conflict on local-only). */
export function conflictRowsToDiffTable(opts) {
  opts = opts || {};
  var keys = opts.keys || [];
  var localData = opts.localData || {};
  var serverData = opts.serverData || {};
  var formatLabel = opts.formatLabel || function (k) { return k; };
  var formatValue = opts.formatValue || function (v) { return v == null ? '—' : String(v); };
  var conflictSet = new Set(opts.conflictingKeys || []);
  var rows = keys.map(function (key) {
    var hot = conflictSet.has(key) || conflictSet.has('*');
    var localVal = formatValue(localData[key], key);
    var serverVal = formatValue(serverData[key], key);
    var removed = hot && (serverData[key] === undefined || serverData[key] === null);
    return {
      cells: [formatLabel(key), localVal, serverVal],
      removed: removed,
    };
  });
  return buildDiffTableHtml({
    title: opts.title || 'Diferencias',
    columns: opts.columns || ['Campo', 'Tu intento', 'En la sala'],
    rows: rows,
    showAdded: false,
  });
}
