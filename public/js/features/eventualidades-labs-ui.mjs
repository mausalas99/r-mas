/**
 * Pane de interpretación de labs dentro del dock Eventualidades.
 */
import { toClinicalHistoryText } from '../../../lib/historia-clinica/clinical-text.mjs';
import {
  getEventualidadesLabsText,
  setEventualidadesLabsText,
} from './eventualidades-store.mjs';
import { esc } from '../dom-escape.mjs';

/**
 * @param {{ labsText?: string }|null|undefined} store
 * @returns {string}
 */
export function renderEventualidadesLabsPane(store) {
  var labsValue = getEventualidadesLabsText(store);
  return (
    '<div class="ev-compose__pane-head">' +
    '<label class="ev-compose__label" for="eventualidades-labs">Interpretación de laboratorios</label>' +
    '<span class="ev-labs__hint">Procesar / Actualizar · <kbd class="ev-labs__kbd">⌘↵</kbd></span>' +
    '</div>' +
    '<textarea id="eventualidades-labs" class="ev-labs__input" rows="5" ' +
    'placeholder="BH, QS, gases… (mismo formato que Estudios consolidado)">' +
    esc(labsValue) +
    '</textarea>'
  );
}

/**
 * @param {HTMLElement} mountEl
 * @param {(store: object) => Promise<{ ok?: boolean }>} persistFn
 * @param {object} patient
 * @param {object} store
 */
export function wireEventualidadesLabsBox(mountEl, persistFn, patient, store) {
  var input = mountEl.querySelector('#eventualidades-labs');
  if (!input || input.dataset.evLabsWired === '1') return;
  input.dataset.evLabsWired = '1';
  input.style.textTransform = 'uppercase';

  var saving = false;
  var lastSaved = getEventualidadesLabsText(store);

  function readNormalized() {
    return toClinicalHistoryText(input.value).trim();
  }

  async function persistLabs() {
    if (saving) return;
    var text = readNormalized();
    if (text === lastSaved) return;
    saving = true;
    try {
      var next = setEventualidadesLabsText(store, text);
      var out = await persistFn(next);
      if (out && out.ok) {
        lastSaved = getEventualidadesLabsText(next);
        Object.assign(store, next);
        patient.eventualidades = next;
      }
    } finally {
      saving = false;
    }
  }

  input.addEventListener('input', function () {
    var start = input.selectionStart;
    var end = input.selectionEnd;
    var upper = toClinicalHistoryText(input.value);
    if (upper !== input.value) {
      input.value = upper;
      if (start != null && end != null) input.setSelectionRange(start, end);
    }
  });

  input.addEventListener('blur', function () {
    void persistLabs();
  });

  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      void persistLabs();
    }
  });
}

/**
 * Prefill / focus the labs box and reveal the labs pane.
 * @param {HTMLElement|null} mountEl
 * @param {string} text
 * @param {(mode: 'note'|'labs') => void} [setMode]
 * @returns {boolean}
 */
export function fillEventualidadesLabsInput(mountEl, text, setMode) {
  if (!mountEl) return false;
  if (typeof setMode === 'function') setMode('labs');
  var input = mountEl.querySelector('#eventualidades-labs');
  if (!input) return false;
  var t = toClinicalHistoryText(text).trim();
  if (!t) return false;
  input.value = t;
  try {
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } catch {
    /* ignore */
  }
  if (typeof input.focus === 'function') {
    try {
      input.focus();
    } catch {
      /* ignore */
    }
  }
  var dock = mountEl.querySelector('.ev-compose');
  if (dock && dock.scrollIntoView) {
    dock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  return true;
}
