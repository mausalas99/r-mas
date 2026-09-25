/**
 * Workbench kit — empty state.
 * README pattern (12a): a label line, a "what is missing" line, a "when it
 * arrives" line, and one exit link. Never a bare zero as a headline figure.
 * Generalizes the first-generation `.patient-dash .empty-hint` pattern from
 * the pilot (public/styles/patient-dashboard.css) into a shared component.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';

/**
 * @param {{
 *   label: string,
 *   missing: string,
 *   whenArrives: string,
 *   exitLabel?: string,
 *   exitHref?: string,
 * }} opts
 */
export function buildEmptyStateHtml({ label, missing, whenArrives, exitLabel, exitHref } = {}) {
  const exitHtml = exitLabel
    ? `<a class="wb-empty-exit" href="${escAttr(exitHref || '#')}" data-wb-empty-exit>${escHtml(exitLabel)}</a>`
    : '';
  return (
    '<div class="wb-empty-state">' +
    `<p class="wb-empty-label">${escHtml(label || '')}</p>` +
    `<p class="wb-empty-missing">${escHtml(missing || '')}</p>` +
    `<p class="wb-empty-when">${escHtml(whenArrives || '')}</p>` +
    exitHtml +
    '</div>'
  );
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {Parameters<typeof buildEmptyStateHtml>[0] & { onExit?: () => void }} opts
 */
export function mountEmptyState(container, opts = {}) {
  if (!container) return undefined;
  container.innerHTML = buildEmptyStateHtml(opts);
  const exit = container.querySelector('[data-wb-empty-exit]');
  if (exit && typeof opts.onExit === 'function') {
    exit.addEventListener('click', (ev) => {
      ev.preventDefault();
      opts.onExit();
    });
  }
  return container;
}
