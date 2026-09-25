/**
 * Selection chrome for #patient-list.
 * Gliding pill removed — active state is left ink bar + quiet wash on .patient-card.active.
 * Kept as a no-op sync so existing call sites stay valid.
 */
export function ensurePatientListIndicator(listEl) {
  if (!listEl) return null;
  var pill = listEl.querySelector(':scope > .patient-list-indicator');
  if (pill) pill.remove();
  listEl.classList.remove('patient-list--has-indicator');
  return null;
}

export function patientListIndicatorBox(listEl, cardEl) {
  if (!listEl || !cardEl) return null;
  var listRect = listEl.getBoundingClientRect();
  var cardRect = cardEl.getBoundingClientRect();
  return {
    top: cardRect.top - listRect.top + listEl.scrollTop,
    left: cardRect.left - listRect.left + (listEl.scrollLeft || 0),
    width: cardRect.width,
    height: cardRect.height,
  };
}

export function syncPatientListIndicator(listEl) {
  ensurePatientListIndicator(listEl);
}
