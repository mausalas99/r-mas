import {
  buildCensoPreviewBodyHtml,
  buildCensoPreviewDocumentHtml,
} from './censo-preview-html-render.mjs';
import { drawCensoPreviewModal, drawCensoColumnChips } from './censo-preview-html-view.jsx';
import { CENSO_COL_WEIGHTS, applyCensoCellEdit, resolveCensoColWeights } from './censo-table-columns.mjs';

/**
 * Vista previa HTML del censo (tabla compacta, alineada al PDF).
 * @param {{ header?: Record<string, any>, rows?: Array<Record<string, unknown>> }} payload
 * @param {{ editable?: boolean }} [opts]
 * @returns {string}
 */
export function renderCensoPreviewHtml(payload, opts) {
  var header = payload.header || {};
  var rows = payload.rows || [];
  var weights = resolveCensoColWeights(rows, header.hiddenCols);
  return buildCensoPreviewDocumentHtml(
    header,
    buildCensoPreviewBodyHtml(rows, weights, !!(opts && opts.editable)),
    rows
  );
}

var HIDDEN_COLS_KEY = 'censoHiddenCols';

/** Columnas ocultas por el usuario (se recuerdan entre censos). */
export function loadCensoHiddenCols() {
  try {
    var v = JSON.parse(localStorage.getItem(HIDDEN_COLS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveCensoHiddenCols(hidden) {
  try {
    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify(hidden));
  } catch {
    /* noop */
  }
}

/** @type {{ payload: any, onGenerate?: (payload: any, btn: HTMLElement | null) => void } | null} */
var current = null;

function previewFrame() {
  return /** @type {HTMLIFrameElement | null} */ (document.getElementById('censo-preview-frame'));
}

/** Pasa lo editado en las celdas a payload.rows (antes de re-dibujar, generar o imprimir). */
function commitPreviewEdits() {
  var doc = previewFrame()?.contentDocument;
  if (!doc || !current) return;
  doc.querySelectorAll('td[data-k]').forEach(function (td) {
    var text = td.innerText.trim();
    if (text === (td.dataset.orig || '')) return;
    var row = current.payload.rows[Number(td.dataset.r)];
    if (row) applyCensoCellEdit(row, td.dataset.k, text);
  });
}

function renderPreviewFrame() {
  var frame = previewFrame();
  if (!frame || !current) return;
  var scrollY = frame.contentWindow ? frame.contentWindow.scrollY : 0;
  frame.onload = function () {
    frame.contentWindow?.scrollTo(0, scrollY);
    frame.contentDocument?.addEventListener('click', function (e) {
      // El iframe tiene su propio Element: no usar instanceof.
      var btn = e.target && e.target.closest ? e.target.closest('.censo-cult-toggle') : null;
      var row = btn && current ? current.payload.rows[Number(btn.dataset.r)] : null;
      if (!row) return;
      commitPreviewEdits();
      row.cultivosHidden = !row.cultivosHidden;
      renderPreviewFrame();
    });
    frame.contentDocument?.querySelectorAll('td[data-k]').forEach(function (td) {
      td.dataset.orig = td.innerText.trim();
    });
  };
  frame.srcdoc = renderCensoPreviewHtml(current.payload, { editable: true });
}

if (typeof document !== 'undefined') {
  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.censoCol) return;
    var box = input.closest('.censo-col-chips');
    var hidden = Array.from(box ? box.querySelectorAll('input[data-censo-col]') : [])
      .filter(function (el) {
        return !el.checked;
      })
      .map(function (el) {
        return el.dataset.censoCol;
      });
    saveCensoHiddenCols(hidden);
    if (current && box && box.id === 'censo-preview-cols') {
      commitPreviewEdits();
      current.payload.header = Object.assign({}, current.payload.header, { hiddenCols: hidden });
      renderPreviewFrame();
    }
  });
}

function ensureCensoPreviewModal() {
  var existing = document.getElementById('censo-preview-backdrop');
  if (existing) return existing;
  var backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop censo-preview-backdrop';
  backdrop.id = 'censo-preview-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  drawCensoPreviewModal(backdrop);
  document.body.appendChild(backdrop);

  if (!ensureCensoPreviewModal._wired) {
    ensureCensoPreviewModal._wired = true;
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeCensoPreviewModal();
    });
    document.getElementById('censo-preview-close')?.addEventListener('click', closeCensoPreviewModal);
    document.getElementById('censo-preview-print')?.addEventListener('click', function () {
      try {
        previewFrame()?.contentWindow?.print();
      } catch {
        /* noop */
      }
    });
    document.getElementById('censo-preview-generate')?.addEventListener('click', function (e) {
      if (!current || !current.onGenerate) return;
      commitPreviewEdits();
      current.onGenerate(current.payload, /** @type {HTMLElement} */ (e.currentTarget));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var el = document.getElementById('censo-preview-backdrop');
      if (el?.classList.contains('open')) closeCensoPreviewModal();
    });
  }

  return backdrop;
}

export function closeCensoPreviewModal() {
  var backdrop = document.getElementById('censo-preview-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('censo-preview-open');
  var frame = previewFrame();
  if (frame) frame.removeAttribute('srcdoc');
  current = null;
}

/**
 * Vista previa dentro de la app (sin ventanas emergentes). Celdas editables;
 * "Generar PDF" llama a onGenerate con el payload ya editado.
 * @param {{ header?: Record<string, any>, rows?: Array<Record<string, unknown>> }} payload
 * @param {{ onGenerate?: (payload: any, btn: HTMLElement | null) => void }} [opts]
 * @returns {boolean}
 */
export function openCensoPreviewInApp(payload, opts) {
  var backdrop = ensureCensoPreviewModal();
  if (!previewFrame()) return false;
  current = { payload: payload, onGenerate: opts && opts.onGenerate };
  var cols = document.getElementById('censo-preview-cols');
  // Casillas "Columnas" (marcada = visible). Se leen con el listener de arriba.
  if (cols) {
    drawCensoColumnChips(cols, CENSO_COL_WEIGHTS.filter(function (c) {
      return c.key !== 'num';
    }), loadCensoHiddenCols());
  }
  var gen = document.getElementById('censo-preview-generate');
  if (gen) gen.hidden = !current.onGenerate;
  renderPreviewFrame();
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('censo-preview-open');
  return true;
}
