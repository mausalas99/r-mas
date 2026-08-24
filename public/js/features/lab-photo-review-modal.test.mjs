import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function memoryStorage() {
  var data = {};
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem: function (k, v) {
      data[k] = String(v);
    },
    removeItem: function (k) {
      delete data[k];
    },
  };
}
globalThis.localStorage = memoryStorage();
globalThis.window = globalThis.window || {};
globalThis.window.localStorage = globalThis.localStorage;

const { registerLabPanelRuntime } = await import('./lab-panel-runtime-state.mjs');
const { getLabHistory } = await import('../app-state.mjs');
const { openLabPhotoReviewModal, closeLabPhotoReviewModal, confirmLabPhotoReview } = await import(
  './lab-photo-review-modal.mjs'
);

var MODAL_HTML =
  '<div id="lab-photo-review-modal" hidden>' +
  '<input id="lab-photo-fecha" type="date" />' +
  '<input id="lab-photo-hora" type="time" />' +
  '<div id="lab-photo-review-rows"></div>' +
  '</div>';

describe('lab-photo-review-modal confirm flow', () => {
  var toasts;

  beforeEach(() => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML = MODAL_HTML;
    toasts = [];
    Object.keys(getLabHistory()).forEach(function (k) {
      delete getLabHistory()[k];
    });
    registerLabPanelRuntime({
      getActiveId: function () {
        return 'p1';
      },
      showToast: function (msg, type) {
        toasts.push({ msg: msg, type: type });
      },
    });
  });

  it('renders one row per parsed line, pre-checked only when matched', () => {
    if (typeof document === 'undefined') return;
    openLabPhotoReviewModal(
      [
        { rawLine: 'HEMOGLOBINA 15.2 g/dL 13.7 - 17.5', rawName: 'HEMOGLOBINA', resultado: '15.2', unidades: 'g/dL', ref: '13.7 - 17.5', abnormal: false, matchedKey: 'Hb', matchedSectionKey: 'BH' },
        { rawLine: 'ALGO RARO 9.0', rawName: 'ALGO RARO', resultado: '9.0', unidades: '', ref: '', abnormal: false, matchedKey: null, matchedSectionKey: null },
      ],
      { fileName: 'foto.jpg', rawText: 'texto ocr crudo' }
    );
    var rows = document.querySelectorAll('.lab-photo-review-row');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].querySelector('.lab-photo-row-include').checked, true);
    assert.equal(rows[0].querySelector('.lab-photo-row-field').value, 'BH::Hb');
    assert.equal(rows[1].querySelector('.lab-photo-row-include').checked, false);
    assert.equal(rows[1].querySelector('.lab-photo-row-field').value, '');
  });

  it('confirm saves only checked rows with a mapped field, tagged origin foto', () => {
    if (typeof document === 'undefined') return;
    openLabPhotoReviewModal(
      [
        { rawLine: 'HEMOGLOBINA 15.2 g/dL 13.7 - 17.5', rawName: 'HEMOGLOBINA', resultado: '15.2', unidades: 'g/dL', ref: '13.7 - 17.5', abnormal: false, matchedKey: 'Hb', matchedSectionKey: 'BH' },
        { rawLine: 'GLUCOSA 95 mg/dL 70 - 100', rawName: 'GLUCOSA', resultado: '95', unidades: 'mg/dL', ref: '70 - 100', abnormal: false, matchedKey: 'Glu', matchedSectionKey: 'QS' },
      ],
      { fileName: 'foto.jpg', rawText: 'texto ocr crudo' }
    );

    // Uncheck the second row (Glucosa) — it should not be saved.
    var rows = document.querySelectorAll('.lab-photo-review-row');
    rows[1].querySelector('.lab-photo-row-include').checked = false;
    // Edit the first row's value before saving.
    rows[0].querySelector('.lab-photo-row-value').value = '15.9';

    document.getElementById('lab-photo-fecha').value = '2026-08-23';

    confirmLabPhotoReview();

    var sets = getLabHistory().p1;
    assert.equal(sets.length, 1);
    assert.equal(sets[0].origin, 'foto');
    assert.match(sets[0].resLabs.join('\n'), /BH/);
    assert.match(sets[0].resLabs.join('\n'), /15\.9/);
    assert.doesNotMatch(sets[0].resLabs.join('\n'), /QS/);
    assert.match(sets[0].sourceText, /foto\.jpg/);
    assert.ok(toasts.some(function (t) { return t.type === 'success'; }));
  });

  it('confirm without a fecha shows an error toast and saves nothing', () => {
    if (typeof document === 'undefined') return;
    openLabPhotoReviewModal(
      [{ rawLine: 'HEMOGLOBINA 15.2 g/dL', rawName: 'HEMOGLOBINA', resultado: '15.2', unidades: 'g/dL', ref: '', abnormal: false, matchedKey: 'Hb', matchedSectionKey: 'BH' }],
      {}
    );
    document.getElementById('lab-photo-fecha').value = '';
    confirmLabPhotoReview();
    assert.equal((getLabHistory().p1 || []).length, 0);
    assert.ok(toasts.some(function (t) { return t.type === 'error'; }));
  });

  it('close clears state so a stale row list is not reused', () => {
    if (typeof document === 'undefined') return;
    openLabPhotoReviewModal(
      [{ rawLine: 'HEMOGLOBINA 15.2', rawName: 'HEMOGLOBINA', resultado: '15.2', unidades: '', ref: '', abnormal: false, matchedKey: 'Hb', matchedSectionKey: 'BH' }],
      {}
    );
    closeLabPhotoReviewModal();
    assert.equal(document.getElementById('lab-photo-review-modal').hidden, true);
  });
});
