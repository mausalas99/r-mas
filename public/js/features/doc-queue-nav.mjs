/**
 * Pure nav helpers for doc-queue → Expediente targets.
 */

/**
 * @param {string} navTarget data-doc-queue-nav value
 * @param {string} [primaryCta] original row.primaryCta when known
 * @returns {'note'|null} Eventualidades pane, or null if not opening EV
 */
export function eventualidadesPaneForDocQueueNav(navTarget, primaryCta) {
  void primaryCta;
  if (String(navTarget) !== 'eventualidades') return null;
  return 'note';
}
