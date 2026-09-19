/** Closes the release-notes modal. Leaf module — no curated-data import, safe to import eagerly. */
var RELEASE_NOTES_SEEN_PREFIX = 'rpc-release-notes-seen-';

export function closeReleaseNotes(devForceShow) {
  var el = document.getElementById('release-notes-backdrop');
  if (!el) return;
  var v = el.getAttribute('data-version');
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  if (v && !devForceShow) {
    try { localStorage.setItem(RELEASE_NOTES_SEEN_PREFIX + v, '1'); } catch { /* localStorage unavailable */ }
  }
}
