/**
 * Lab panel overlay persistence — local per-Mac only (no LAN push/pull).
 */
import { upsertLabPanelOverlay } from '../../labs-panel-overlay-store.mjs';

/** LAN bundle overlay apply retired — overlays stay on this Mac. */
export function applyLabPanelOverlayFromBundle(_bundle) {
  /* no-op */
}

/** LAN overlay push retired — local store already persisted. */
export function enqueueLabPanelOverlayPush() {
  /* no-op */
}

/**
 * Persist overlay after teach confirm (local only).
 * @param {object} [_record]
 */
export function queueLabPanelOverlayLanSync(_record) {
  if (_record && _record.panelId) {
    upsertLabPanelOverlay(_record);
  }
}
