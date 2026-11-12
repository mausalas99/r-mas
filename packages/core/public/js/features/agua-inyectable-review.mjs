import { applyAguaInyectableSuggestion } from '../med-receta-parse.mjs';

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
export async function reviewAguaInyectableAlerts(alerts) {
  if (!alerts.length || typeof document === 'undefined') return;
  var { drawAguaInyModal } = await import('./agua-inyectable-review-view.jsx');
  return new Promise(function (resolve) {
    var backdrop = document.createElement('div');
    backdrop.className = 'wb-scrim';
    drawAguaInyModal(backdrop, alerts);

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
