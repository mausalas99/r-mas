import { describe, it, beforeEach, afterEach } from 'node:test';
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
const { openLabPhotoImport } = await import('./lab-photo-import.mjs');

var MODAL_HTML =
  '<div id="lab-photo-review-modal" hidden>' +
  '<input id="lab-photo-fecha" type="date" />' +
  '<input id="lab-photo-hora" type="time" />' +
  '<div id="lab-photo-review-rows"></div>' +
  '</div>';

describe('lab-photo-import openLabPhotoImport', () => {
  var toasts;
  var originalElectronAPI;

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
    originalElectronAPI = window.electronAPI;
  });

  afterEach(() => {
    if (typeof document === 'undefined') return;
    window.electronAPI = originalElectronAPI;
  });

  it('opens the review modal with rows parsed from the OCR text', async () => {
    if (typeof document === 'undefined') return;
    window.electronAPI = {
      ocrLabPhoto: async function () {
        return { ok: true, text: 'HEMOGLOBINA 15.2 g/dL 13.7 - 17.5', confidence: 80, fileName: 'foto.jpg' };
      },
    };
    await openLabPhotoImport();
    var modal = document.getElementById('lab-photo-review-modal');
    assert.equal(modal.hidden, false);
    var rows = document.querySelectorAll('.lab-photo-review-row');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].querySelector('.lab-photo-row-field').value, 'BH::Hb');
  });

  it('does nothing when the user cancels the file dialog', async () => {
    if (typeof document === 'undefined') return;
    window.electronAPI = {
      ocrLabPhoto: async function () {
        return { canceled: true };
      },
    };
    await openLabPhotoImport();
    assert.equal(document.getElementById('lab-photo-review-modal').hidden, true);
    assert.equal(toasts.length, 1); // only the initial "Leyendo imagen…" toast
  });

  it('shows an error toast when OCR fails, without opening the modal', async () => {
    if (typeof document === 'undefined') return;
    window.electronAPI = {
      ocrLabPhoto: async function () {
        return { ok: false, error: 'No se pudo leer el archivo' };
      },
    };
    await openLabPhotoImport();
    assert.equal(document.getElementById('lab-photo-review-modal').hidden, true);
    assert.ok(toasts.some(function (t) { return t.type === 'error' && t.msg === 'No se pudo leer el archivo'; }));
  });

  it('shows a low-confidence toast and does not open the modal', async () => {
    if (typeof document === 'undefined') return;
    window.electronAPI = {
      ocrLabPhoto: async function () {
        return { ok: true, text: 'algo borroso', confidence: 10, fileName: 'foto.jpg' };
      },
    };
    await openLabPhotoImport();
    assert.equal(document.getElementById('lab-photo-review-modal').hidden, true);
    assert.ok(toasts.some(function (t) { return /no se pudo leer la imagen con claridad/i.test(t.msg); }));
  });

  it('shows a no-rows-recognized toast when nothing parses', async () => {
    if (typeof document === 'undefined') return;
    window.electronAPI = {
      ocrLabPhoto: async function () {
        return { ok: true, text: 'sin numeros aqui', confidence: 90, fileName: 'foto.jpg' };
      },
    };
    await openLabPhotoImport();
    assert.equal(document.getElementById('lab-photo-review-modal').hidden, true);
    assert.ok(toasts.some(function (t) { return /no se reconocieron estudios/i.test(t.msg); }));
  });

  it('shows an error when no patient is selected', async () => {
    if (typeof document === 'undefined') return;
    registerLabPanelRuntime({
      getActiveId: function () {
        return null;
      },
    });
    window.electronAPI = { ocrLabPhoto: async function () { return { ok: true, text: '', confidence: 90 }; } };
    await openLabPhotoImport();
    assert.ok(toasts.some(function (t) { return t.type === 'error'; }));
    assert.equal(document.getElementById('lab-photo-review-modal').hidden, true);
  });
});
