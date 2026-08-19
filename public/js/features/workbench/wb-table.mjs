/**
 * Workbench kit — shared table grammar.
 * README: fixed card header (9px 16px) → fixed column-head row (7px 16px, 9.5px
 * uppercase) → scrolling body (10px 16px rows, 11px for two-line rows) → a
 * closing summary line rendered as centered ink-2 text (NOT a table row).
 * Row hover `rgba(28,28,30,0.03)`; alert-tint rows keep their tint on hover.
 * Row click opens the caller-supplied handler; in-row buttons stop propagation.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';

/**
 * @typedef {{
 *   id: string,
 *   cellsHtml: string[],
 *   alert?: boolean,
 *   twoLine?: boolean,
 * }} TableRow
 */

/** @param {{ title: string, actionsHtml?: string }} opts */
export function buildTableCardHeaderHtml({ title = '', actionsHtml = '' } = {}) {
  return (
    '<div class="wb-table-card-header">' +
    `<span class="wb-table-card-title">${escHtml(title)}</span>` +
    (actionsHtml ? `<div class="wb-table-card-actions">${actionsHtml}</div>` : '') +
    '</div>'
  );
}

/**
 * @param {string[]} columns
 * @param {string} [gridTemplate]
 */
export function buildColumnHeadHtml(columns, gridTemplate) {
  const style = gridTemplate ? ` style="grid-template-columns:${escAttr(gridTemplate)}"` : '';
  return (
    `<div class="wb-table-colhead"${style}>` +
    (columns || []).map((c) => `<span>${escHtml(c)}</span>`).join('') +
    '</div>'
  );
}

/**
 * @param {TableRow & { gridTemplate?: string }} row
 */
export function buildRowHtml({ id, cellsHtml = [], alert = false, twoLine = false, gridTemplate } = {}) {
  const classes = ['wb-row'];
  if (alert) classes.push('wb-row--alert');
  if (twoLine) classes.push('wb-row--twoline');
  const style = gridTemplate ? ` style="grid-template-columns:${escAttr(gridTemplate)}"` : '';
  return (
    `<div class="${classes.join(' ')}"${style} data-wb-row-id="${escAttr(id)}" role="button" tabindex="0">` +
    cellsHtml.map((h) => `<span class="wb-cell">${h}</span>`).join('') +
    '</div>'
  );
}

/** @param {string} text */
export function buildSummaryLineHtml(text) {
  return `<div class="wb-table-summary">${escHtml(text)}</div>`;
}

/**
 * @param {{
 *   title: string,
 *   actionsHtml?: string,
 *   columns: string[],
 *   gridTemplate?: string,
 *   rows: TableRow[],
 *   summaryLine?: string,
 * }} opts
 */
export function buildTableCardHtml({ title, actionsHtml, columns, gridTemplate, rows, summaryLine } = {}) {
  const rowsHtml = (rows || []).map((r) => buildRowHtml({ ...r, gridTemplate })).join('');
  return (
    '<div class="wb-table-card">' +
    buildTableCardHeaderHtml({ title, actionsHtml }) +
    buildColumnHeadHtml(columns || [], gridTemplate) +
    `<div class="wb-table-body">${rowsHtml}</div>` +
    (summaryLine ? buildSummaryLineHtml(summaryLine) : '') +
    '</div>'
  );
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {Parameters<typeof buildTableCardHtml>[0] & { onRowClick?: (id: string) => void }} opts
 */
export function mountTableCard(container, opts) {
  if (!container) return undefined;
  container.innerHTML = buildTableCardHtml(opts);
  const { onRowClick } = opts || {};
  if (typeof onRowClick !== 'function') return container;

  container.querySelectorAll('.wb-row[data-wb-row-id]').forEach((row) => {
    const id = row.getAttribute('data-wb-row-id');
    const open = () => onRowClick(id);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        open();
      }
    });
    // In-row buttons never bubble to the row's open-patient handler.
    row.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', (ev) => ev.stopPropagation());
    });
  });

  return container;
}
