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

export function syncPatientListIndicator(listEl) {
  ensurePatientListIndicator(listEl);
}
