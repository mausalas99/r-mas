import { esc, escAttr } from '../../dom-escape.mjs';
import { clinicalUserActivityHistoryEntries } from '../../../../lib/clinical-user-activity.mjs';

/**
 * @param {Array<{ at?: string, source?: string }>|null|undefined} history
 * @param {number} [maxPoints]
 * @returns {string}
 */
export function equiposActivityHistoryListHtml(history, maxPoints = 999) {
  const { entries, more } = clinicalUserActivityHistoryEntries(history, maxPoints);
  if (!entries.length) {
    return '<p class="cloud-sync-equipos-history-empty">Sin actividad registrada.</p>';
  }
  const items = entries
    .map((ev) => {
      const timeHtml = ev.atLabel
        ? '<time class="cloud-sync-admin-equipos-history-at" datetime="' +
          esc(ev.at) +
          '">' +
          esc(ev.atLabel) +
          '</time>'
        : '';
      return (
        '<li class="cloud-sync-admin-equipos-history-item">' +
        '<span class="cloud-sync-admin-equipos-history-source">' +
        esc(ev.source) +
        '</span>' +
        timeHtml +
        '</li>'
      );
    })
    .join('');
  const moreHtml = more
    ? '<li class="cloud-sync-admin-equipos-history-more">+' + more + ' más en el servidor</li>'
    : '';
  return (
    '<ul class="cloud-sync-admin-equipos-history-list cloud-sync-equipos-history-modal-list">' +
    items +
    moreHtml +
    '</ul>'
  );
}

/**
 * @param {{ handle: string, displayName?: string, history: Array<{ at?: string, source?: string }> }} opts
 * @returns {string}
 */
export function equiposActivityHistoryModalMarkup(opts) {
  const handle = String(opts?.handle || '').trim();
  const displayName = String(opts?.displayName || '').trim();
  const subtitle = displayName ? '@' + handle + ' · ' + displayName : '@' + handle;
  return (
    '<div class="lab-conflict-backdrop" data-equipos-activity-history-modal>' +
    '<div class="lab-conflict-modal cloud-sync-equipos-history-modal material-glass ui-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="equipos-activity-history-title">' +
    '<div class="cloud-sync-equipos-history-modal-head">' +
    '<h3 id="equipos-activity-history-title">Historial de actividad</h3>' +
    '<p class="cloud-sync-equipos-history-modal-sub">' +
    esc(subtitle) +
    '</p></div>' +
    equiposActivityHistoryListHtml(opts?.history) +
    '<div class="cloud-sync-equipos-history-modal-foot">' +
    '<button type="button" class="cloud-sync-btn" data-equipos-history-close>Cerrar</button>' +
    '</div></div></div>'
  );
}

/**
 * @param {{ handle: string, displayName?: string, history: Array<{ at?: string, source?: string }> }} opts
 */
export function showEquiposActivityHistoryModal(opts) {
  const host = document.createElement('div');
  host.innerHTML = equiposActivityHistoryModalMarkup(opts);
  const overlay = host.firstElementChild;
  if (!(overlay instanceof HTMLElement)) return;
  document.body.appendChild(overlay);
  wireEquiposActivityHistoryModal(overlay);
}

/** @param {HTMLElement} overlay */
function wireEquiposActivityHistoryModal(overlay) {
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
  }
  function onKeydown(ev) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
    }
  }
  overlay.querySelector('[data-equipos-history-close]')?.addEventListener('click', close);
  overlay.addEventListener('click', function (ev) {
    if (ev.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);
}

/**
 * Compact row trigger for admin Equipos history modal.
 * @param {string} handle
 * @param {string} displayName
 * @param {Array<{ at?: string, source?: string }>|null|undefined} history
 * @returns {string}
 */
export function equiposRowHistoryButtonHtml(handle, displayName, history) {
  const list = Array.isArray(history) ? history : [];
  const { total } = clinicalUserActivityHistoryEntries(list, 1);
  if (!total) return '';
  return (
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact cloud-sync-admin-equipos-history-btn" ' +
    'data-admin-action="equipos-activity-history" ' +
    'data-equipos-handle="' +
    escAttr(handle) +
    '" data-equipos-display="' +
    escAttr(displayName) +
    '" data-equipos-history="' +
    escAttr(JSON.stringify(list)) +
    '">Historial<span class="cloud-sync-admin-equipos-history-count">' +
    total +
    '</span></button>'
  );
}

/**
 * @param {Element} btn
 * @returns {boolean}
 */
export function openEquiposActivityHistoryFromButton(btn) {
  const historyRaw = btn.getAttribute('data-equipos-history');
  let history = [];
  if (historyRaw) {
    try {
      const parsed = JSON.parse(historyRaw);
      if (Array.isArray(parsed)) history = parsed;
    } catch {
      history = [];
    }
  }
  showEquiposActivityHistoryModal({
    handle: btn.getAttribute('data-equipos-handle') || '',
    displayName: btn.getAttribute('data-equipos-display') || '',
    history,
  });
  return true;
}
