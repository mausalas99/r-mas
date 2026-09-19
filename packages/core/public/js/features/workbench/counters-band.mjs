/**
 * Workbench kit — counters band (band 2 of the 4-band pattern).
 * README: max 3 cells, white bg, `border-right: 1px solid rgba(28,28,30,0.08)`
 * between cells. Each cell has a 10px uppercase label + 13px figure. An "alert"
 * cell variant uses `--color-alert-tint-strong` background + `--shadow-counter-alert`.
 * Optional 5px teal progress bar using the existing `progress-sweep-fill` sweep.
 */
import { escHtml } from '../../dom-escape.mjs';

/**
 * @typedef {{
 *   label: string,
 *   figure: string,
 *   detail?: string,
 *   tone?: 'default'|'alert',
 *   progress?: { percent: number },
 * }} CounterCell
 */

/** @param {CounterCell} cell */
export function buildCounterCellHtml(cell) {
  const { label = '', figure = '', detail = '', tone = 'default', progress } = cell || {};
  const isAlert = tone === 'alert';

  const cellClasses = ['wb-counter-cell'];
  if (isAlert) cellClasses.push('wb-counter-cell--alert');

  const labelClass = isAlert ? 'wb-counter-label wb-counter-label--alert' : 'wb-counter-label';
  const detailHtml = detail
    ? `<span class="wb-counter-detail${isAlert ? ' wb-counter-detail--alert' : ''}"> · ${escHtml(detail)}</span>`
    : '';
  const percent = progress ? Math.max(0, Math.min(100, Number(progress.percent) || 0)) : null;
  const progressHtml =
    percent === null
      ? ''
      : '<div class="wb-counter-progress">' +
        `<div class="wb-counter-progress-fill progress-sweep-fill" style="width:${percent}%"></div>` +
        '</div>';

  return (
    `<div class="${cellClasses.join(' ')}">` +
    '<div class="wb-counter-text">' +
    `<span class="${labelClass}">${escHtml(label)}</span>` +
    `<span class="wb-counter-figure">${escHtml(figure)}${detailHtml}</span>` +
    '</div>' +
    progressHtml +
    '</div>'
  );
}

/**
 * @param {CounterCell[]} cells max 3 — the mockup never shows more than three.
 * @returns {string}
 */
export function buildCountersBandHtml(cells) {
  const list = Array.isArray(cells) ? cells : [];
  if (list.length > 3) {
    throw new Error('wb-counters-band: max 3 cells');
  }
  return `<div class="wb-counters-band">${list.map(buildCounterCellHtml).join('')}</div>`;
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {CounterCell[]} cells
 */
export function mountCountersBand(container, cells) {
  if (!container) return undefined;
  container.innerHTML = buildCountersBandHtml(cells);
  return container;
}
