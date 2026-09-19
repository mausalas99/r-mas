/**
 * Shared shape/constants for Rx tórax, POCUS, and EKG image attachments
 * (`cardio_images` table, schema v26). Pure — no Node/browser-only APIs —
 * so it is safe to import from both main-process code (`main.js`) and the
 * renderer (`cardio-image-attach.mjs`). Actual jimp compression lives in
 * `cardio-image-compress.mjs` (main-process only, mirrors `lib/ocr/lab-photo-preprocess.mjs`).
 */

export var CARDIO_IMAGE_KINDS = ['rxTorax', 'pocus', 'ekg'];

/** Hard cap per image after compression — keeps rows well under D1's 2MB
 * row limit (see `cloud/sync-worker/src/quotas.js` labShardMaxBytes), sized
 * now so a future cloud-sync shard doesn't need a rework. */
export var MAX_IMAGE_BYTES = 1200000;

/** Soft, informational only — surfaced in the UI, nothing is blocked. */
export var USAGE_WARN_BYTES = 50 * 1024 * 1024;

export function newCardioImageId() {
  return 'ci_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** @param {number} bytes */
export function formatImageUsage(bytes) {
  var n = Number(bytes) || 0;
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

/** @param {{sizeBytes?: number}[]} records */
export function sumImageBytes(records) {
  return (Array.isArray(records) ? records : []).reduce(function (total, r) {
    return total + (Number(r && r.sizeBytes) || 0);
  }, 0);
}
