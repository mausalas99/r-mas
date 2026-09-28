/**
 * Fase 5 (2a/2b) — cromo de la tarjeta "Resultados" del tab Laboratorio.
 *
 * `#lab-output-box` sigue siendo construido por `lab-panel-output-helpers.mjs` (fuera de
 * alcance de esta fase — lo usa también la tarea de Movimiento/actualización masiva). Este
 * módulo NO toca ese archivo: sólo lee el DOM ya renderizado dentro de `#lab-output-box` y:
 *   1. cuenta valores totales/alterados (`.lab-row-value` / `.lab-value-altered`) para el
 *      encabezado "RESULTADOS · N ALTERADOS DE M";
 *   2. separa cada encabezado de toma ("11:44 · Toma de la mañana") en hora + etiqueta y le
 *      agrega el conteo de alterados de esa toma — el DOM base sólo trae un textContent plano.
 *
 * Se llama después de poblar la caja (ver `lab-panel-parse.mjs#renderOutput`).
 */
import { escTxt } from '../labs-display.mjs';
import { fitOneRow } from './fit-one-row.mjs';
import { isCriticalLabValue, clinicalPriorityRank } from '../labs-critical-values.mjs';

function pluralAlterados(n) {
  return n === 1 ? '1 alterado' : n + ' alterados';
}

export function updateLabResultsCardTitle(box) {
  var titleEl = document.getElementById('lab-output-title-text');
  if (!titleEl || !box) return;
  var total = Array.prototype.filter.call(box.querySelectorAll('.lab-row-value'), function (el) {
    return !el.classList.contains('lab-row-value-muted');
  }).length;
  var altered = box.querySelectorAll('.lab-value-altered').length;
  titleEl.textContent = total ? 'Resultados · ' + pluralAlterados(altered) + ' de ' + total : 'Resultados';
}

function countAlteredUntilNextGroup(headerEl) {
  var n = 0;
  var el = headerEl.nextElementSibling;
  while (el && !el.classList.contains('lab-hour-group-h')) {
    n += el.querySelectorAll('.lab-value-altered').length;
    el = el.nextElementSibling;
  }
  return n;
}

/** "11:44 · Toma de la mañana" (texto plano) → ["11:44", "Toma de la mañana"]. */
export function splitHourGroupHeaderText(text) {
  var s = String(text == null ? '' : text);
  var sepIdx = s.indexOf(' · ');
  if (sepIdx < 0) return { hora: /^\d{1,2}:\d{2}$/.test(s.trim()) ? s.trim() : '', label: sepIdx < 0 ? s.trim() : '' };
  var head = s.slice(0, sepIdx).trim();
  var rest = s.slice(sepIdx + 3).trim();
  if (/^\d{1,2}:\d{2}$/.test(head)) return { hora: head, label: rest };
  return { hora: '', label: s.trim() };
}

export function restyleLabHourGroupHeaders(box) {
  if (!box) return;
  var headers = box.querySelectorAll('.lab-hour-group-h');
  headers.forEach(function (headerEl) {
    var parts = splitHourGroupHeaderText(headerEl.textContent);
    var n = countAlteredUntilNextGroup(headerEl);
    var labelText = parts.label ? parts.label + (n ? ' · ' + pluralAlterados(n) : '') : '';
    var html = '';
    if (parts.hora) html += '<span class="lab-hour-time">' + escTxt(parts.hora) + '</span>';
    if (labelText) html += '<span class="lab-hour-label">' + escTxt(labelText) + '</span>';
    headerEl.innerHTML = html || escTxt(headerEl.textContent);
  });
}

/**
 * 8.4.3 «Alterados primero»: one line of chips (label + value) above the table.
 * One chip per analyte: with several tomas the latest hour wins.
 */
export function renderLabAlteredChips(box) {
  var host = document.getElementById('lab-altered-chips');
  if (!host || !box) return;
  var byLabel = Object.create(null);
  var order = [];
  var hour = '';
  Array.prototype.forEach.call(box.children, function (child) {
    if (child.classList.contains('lab-hour-group-h')) {
      var t = child.querySelector('.lab-hour-time');
      hour = t ? t.textContent.trim().padStart(5, '0') : hour;
      return;
    }
    child.querySelectorAll('.lab-value-altered').forEach(function (el) {
      var cell = el.closest('.lab-row-value');
      var prev = cell && cell.previousElementSibling;
      if (!prev || !prev.classList.contains('lab-row-value')) return;
      var label = prev.textContent.trim();
      var value = el.firstChild ? el.firstChild.textContent : el.textContent;
      var arrow = el.querySelector('.lab-trend-arrow');
      var seen = byLabel[label];
      if (!seen) order.push(label);
      if (!seen || hour >= seen.hour) {
        byLabel[label] = {
          hour: hour,
          value: value,
          critical: isCriticalLabValue(label, value),
          trend: arrow ? (arrow.classList.contains('lab-trend-up') ? '↑' : '↓') : '',
        };
      }
    });
  });
  // Most important first, so the ones cut by «+N más» matter least: panic
  // values, then values that moved since the last toma, then clinical order.
  var rank = function (c) {
    return c.critical ? 0 : c.trend ? 1 : 2;
  };
  order.sort(function (a, b) {
    return rank(byLabel[a]) - rank(byLabel[b]) || clinicalPriorityRank(a) - clinicalPriorityRank(b);
  });
  host.innerHTML = order.length
    ? '<span class="lab-altered-chips-lbl">Alterados</span>' +
      order
        .map(function (label) {
          var c = byLabel[label];
          return (
            '<span class="lab-altered-chip' +
            (c.critical ? ' lab-altered-chip--critical' : '') +
            '" data-fit-chip' +
            (c.critical ? ' title="Valor crítico"' : '') +
            '>' +
            escTxt(label) +
            ' <strong>' +
            escTxt(c.value) +
            (c.trend ? ' ' + c.trend : '') +
            '</strong></span>'
          );
        })
        .join('') +
      '<span class="lab-altered-chip lab-altered-chip--more" data-fit-chip-more hidden></span>'
    : '';
  host.hidden = !order.length;
  fitOneRow(host);
}

/** Llamar una vez por render, después de que `#lab-output-box` quede poblado. */
export function syncLabResultsCardChrome() {
  var box = document.getElementById('lab-output-box');
  if (!box) return;
  restyleLabHourGroupHeaders(box);
  updateLabResultsCardTitle(box);
  renderLabAlteredChips(box);
}
