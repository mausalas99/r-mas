'use strict';

/**
 * LWW merge for lab panel overlay records (by panelId).
 * Keep in sync with public/js/labs-panel-overlay.mjs → mergeLabPanelOverlayLww.
 */

function shouldReplaceOverlay(prev, rec) {
  const prevAt = Number(prev.updatedAt || 0);
  const recAt = Number(rec.updatedAt || 0);
  if (recAt > prevAt) return true;
  if (recAt < prevAt) return false;
  return String(rec.updatedBy || '') > String(prev.updatedBy || '');
}

/**
 * @param {object[]|null|undefined} localArr
 * @param {object[]|null|undefined} incomingArr
 * @returns {object[]}
 */
function mergeLabPanelOverlayLww(localArr, incomingArr) {
  const map = Object.create(null);
  function put(rec) {
    if (!rec || !rec.panelId) return;
    const prev = map[rec.panelId];
    if (!prev || shouldReplaceOverlay(prev, rec)) {
      map[rec.panelId] = rec;
    }
  }
  (localArr || []).forEach(put);
  (incomingArr || []).forEach(put);
  return Object.keys(map).map((k) => map[k]);
}

module.exports = { mergeLabPanelOverlayLww, shouldReplaceOverlay };
