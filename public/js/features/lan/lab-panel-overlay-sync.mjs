/**
 * Silent LAN sync for taught lab panel overlays (room bundle labPanelOverlay).
 */
import {
  loadLabPanelOverlays,
  saveLabPanelOverlays,
  upsertLabPanelOverlay,
} from '../../labs-panel-overlay-store.mjs';
import { mergeLabPanelOverlayLww } from '../../labs-panel-overlay.mjs';

/**
 * Merge host/peer overlays into local store (LWW by panelId). Never opens teach UI.
 * @param {object|null|undefined} bundle
 */
export function applyLabPanelOverlayFromBundle(bundle) {
  var arr = bundle && Array.isArray(bundle.labPanelOverlay) ? bundle.labPanelOverlay : null;
  if (!arr) return;
  var merged = mergeLabPanelOverlayLww(loadLabPanelOverlays(), arr);
  saveLabPanelOverlays(merged);
}

/** Schedule sync-bundle push that includes the full local overlay array. */
export function enqueueLabPanelOverlayPush() {
  return import('./push.mjs')
    .then(function (push) {
      if (typeof push.scheduleLiveSyncPush === 'function') {
        push.scheduleLiveSyncPush();
      }
    })
    .catch(function () {
      /* offline / LAN not ready — local store already persisted */
    });
}

/**
 * After local upsert on teach confirm: best-effort LAN push.
 * @param {object} [_record]
 */
export function queueLabPanelOverlayLanSync(_record) {
  if (_record && _record.panelId) {
    upsertLabPanelOverlay(_record);
  }
  void enqueueLabPanelOverlayPush();
}
