import { escHtml } from '../dom-escape.mjs';
import { applyAguaInyectableSuggestion } from '../med-receta-parse.mjs';

var VIAS = ['VIA ORAL', 'VIA SUBCUTANEA', 'VIA INTRAVENOSA', 'VIA INTRAMUSCULAR', 'VIA SUBLINGUAL', 'VIA TOPICA', 'VIA RECTAL'];

function viaOptionsHtml(selected) {
  var list = selected && VIAS.indexOf(selected) === -1 ? [selected].concat(VIAS) : VIAS;
  return list
    .map(function (v) {
      return '<option value="' + escHtml(v) + '"' + (v === selected ? ' selected' : '') + '>' + escHtml(v) + '</option>';
    })
    .join('');
}

function sentenceCase(t) {
  var s = String(t || '').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function rowHtml(a, i) {
  var via = a.viaRaw || a.item.viaRaw;
  var id = 'agua-iny-name-' + i;
  return (
    '<li class="wb-row agua-iny-row" data-row="' + i + '">' +
    '<label class="rpc-switch"><input type="checkbox" class="rpc-switch-input" role="switch" data-f="add" checked aria-labelledby="' + id + '">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label>' +
    '<input class="agua-iny-in agua-iny-in--name" id="' + id + '" data-f="nombre" aria-label="Medicamento" value="' + escHtml(a.farmaco) + '">' +
    '<input class="agua-iny-in agua-iny-in--dose" data-f="dosis" aria-label="Dosis" placeholder="Falta dosis" value="' + escHtml(a.dosis) + '">' +
    '<select class="agua-iny-in" data-f="via" aria-label="Vía">' + viaOptionsHtml(via) + '</select>' +
    '<p class="agua-iny-some">SOME: ' + escHtml(sentenceCase(a.texto)) + '</p>' +
    '</li>'
  );
}

function fieldVal(row, f) {
  var el = row.querySelector('[data-f="' + f + '"]');
  return f === 'add' ? el.checked : String(el.value || '').trim().toUpperCase();
}

/** Row states + live count, so the user sees exactly what will be saved. */
function refresh(backdrop) {
  var rows = backdrop.querySelectorAll('[data-row]');
  var n = 0;
  rows.forEach(function (row) {
    var add = fieldVal(row, 'add');
    if (add && fieldVal(row, 'nombre')) n += 1;
    row.classList.toggle('is-off', !add);
    row.classList.toggle('is-nodose', add && !fieldVal(row, 'dosis'));
    row.querySelectorAll('.agua-iny-in').forEach(function (el) { el.disabled = !add; });
  });
  backdrop.querySelector('[data-count]').textContent = n + ' de ' + rows.length + ' se agregarán';
  var save = backdrop.querySelector('[data-save]');
  save.textContent = n ? 'Agregar ' + n : 'Agregar';
  save.disabled = !n;
}

/**
 * Editable review of AGUA INYECTABLE rows whose drug we could not read.
 * Checked rows with a name become that drug; the rest stay as agua inyectable.
 * @param {Array<ReturnType<typeof import('../med-receta-parse.mjs').aguaInyectableMissHint>>} alerts
 * @returns {Promise<void>}
 */
export function reviewAguaInyectableAlerts(alerts) {
  return new Promise(function (resolve) {
    if (!alerts.length || typeof document === 'undefined') {
      resolve();
      return;
    }
    var backdrop = document.createElement('div');
    backdrop.className = 'wb-scrim';
    backdrop.innerHTML =
      '<div class="wb-confirm-modal agua-iny-modal" role="dialog" aria-modal="true" aria-labelledby="agua-iny-title">' +
      '<div class="wb-confirm-body">' +
      '<span class="wb-confirm-title" id="agua-iny-title">Medicamentos dentro de agua inyectable</span>' +
      '<span class="wb-confirm-message">SOME no los tiene en catálogo. Revisa nombre, dosis y vía de cada uno.</span>' +
      '</div>' +
      '<div class="agua-iny-table">' +
      '<div class="wb-table-colhead agua-iny-grid" aria-hidden="true"><span>Agregar</span><span>Medicamento</span><span>Dosis</span><span>Vía</span></div>' +
      '<ul class="agua-iny-list">' + alerts.map(rowHtml).join('') + '</ul>' +
      '</div>' +
      '<div class="wb-confirm-footer wb-confirm-footer--rail">' +
      '<span class="agua-iny-count" data-count></span>' +
      '<div class="wb-confirm-footer-actions">' +
      '<button type="button" class="wb-btn wb-btn-secondary" data-cancel>Omitir todos</button>' +
      '<button type="button" class="wb-btn wb-btn-primary" data-save>Agregar</button>' +
      '</div></div></div>';

    function finish(save) {
      document.removeEventListener('keydown', onKey);
      if (save) {
        backdrop.querySelectorAll('[data-row]').forEach(function (row) {
          var val = function (f) { return fieldVal(row, f); };
          if (!val('add') || !val('nombre')) return;
          applyAguaInyectableSuggestion(alerts[Number(row.getAttribute('data-row'))].item, {
            nombre: val('nombre'),
            dosis: val('dosis'),
            via: val('via'),
          });
        });
      }
      backdrop.remove();
      resolve();
    }
    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(false);
      }
    }
    backdrop.querySelector('[data-save]').addEventListener('click', function () { finish(true); });
    backdrop.querySelector('[data-cancel]').addEventListener('click', function () { finish(false); });
    backdrop.addEventListener('input', function () { refresh(backdrop); });
    backdrop.addEventListener('change', function () { refresh(backdrop); });
    refresh(backdrop);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add('wb-scrim--open'); });
    var first = backdrop.querySelector('[data-f="nombre"]');
    if (first) first.focus();
  });
}
