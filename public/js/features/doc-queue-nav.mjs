/**
 * Pure nav helpers for doc-queue → Expediente targets.
 */

/**
 * @param {string} navTarget data-doc-queue-nav value
 * @param {string} [primaryCta] original row.primaryCta when known
 * @returns {'note'|'labs'|null} Eventualidades compose mode, or null if not opening EV
 */
export function eventualidadesPaneForDocQueueNav(navTarget, primaryCta) {
  if (String(navTarget) !== 'eventualidades') return null;
  if (String(primaryCta || '') === 'labs') return 'labs';
  // Sala remap: labs CTA becomes eventualidades — prefer Labs pane for lab debt.
  return 'labs';
}
