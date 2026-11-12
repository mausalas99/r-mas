import { clinicalUserActivityHistoryEntries } from '../../../../lib/clinical-user-activity.mjs';

/**
 * @param {{ handle: string, displayName?: string, history: Array<{ at?: string, source?: string }> }} opts
 */
export async function showEquiposActivityHistoryModal(opts) {
  const { drawEquiposHistoryModal } = await import('./cloud-sync-overlays-view.jsx');
  const overlay = drawEquiposHistoryModal(opts);
  if (!overlay) return;
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
 * What a row's «Historial» button shows, or null when there is no activity to list.
 * @param {string} handle
 * @param {string} displayName
 * @param {Array<{ at?: string, source?: string }>|null|undefined} history
 */
export function equiposRowHistoryButton(handle, displayName, history) {
  const list = Array.isArray(history) ? history : [];
  const { total } = clinicalUserActivityHistoryEntries(list, 1);
  if (!total) return null;
  return { handle, display: displayName, json: JSON.stringify(list), total };
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
