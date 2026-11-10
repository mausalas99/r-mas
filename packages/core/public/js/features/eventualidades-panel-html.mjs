/**
 * DOM helpers for the Eventualidades panel. The panel itself is drawn by eventualidades-panel-view.jsx.
 */

/**
 * Drop one card without remounting the compose/timeline.
 * @param {HTMLElement|null|undefined} mountEl
 * @param {string} entryId
 * @returns {boolean}
 */
export function removeEventualidadCardEl(mountEl, entryId) {
  var id = String(entryId || '').replace(/"/g, '');
  if (!mountEl || !id || typeof mountEl.querySelector !== 'function') return false;
  var card = mountEl.querySelector('[data-entry-id="' + id + '"]');
  if (!card || typeof card.remove !== 'function') return false;
  var day = typeof card.closest === 'function' ? card.closest('.ev-day') : null;
  card.remove();
  if (day && typeof day.querySelector === 'function' && !day.querySelector('[data-entry-id]')) {
    if (typeof day.remove === 'function') day.remove();
  }
  var timeline = mountEl.querySelector('.ev-timeline');
  if (
    timeline &&
    typeof timeline.querySelector === 'function' &&
    !timeline.querySelector('[data-entry-id]')
  ) {
    timeline.classList.add('ev-timeline--empty');
    timeline.innerHTML = '<p class="ev-empty">Aún no hay eventualidades. Agrégalas abajo.</p>';
  }
  return true;
}
