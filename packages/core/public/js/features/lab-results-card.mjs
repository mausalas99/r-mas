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
import { sortLabHistoryChronological, normalizeFechaLabHistory, normalizeHoraLabHistory } from '../tend-core.mjs';
import { dayKeyFromLabSet } from '../lab-history-format.mjs';
import { rt } from './lab-panel-runtime-state.mjs';

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

/** Newest-first lab sets of a patient. */
function patientLabHistory(pid) {
  return sortLabHistoryChronological(
    rt.ensureParsedLabHistoryCached ? rt.ensureParsedLabHistoryCached(pid) : rt.ensureParsedLabHistory(pid, { readOnly: true })
  );
}

/**
 * 8.4.4 «J1» late state: next to the name, an amber line when the patient has labs
 * but none from today («Aún no hay labs de hoy · último 27/09 · 06:05»). Nothing on a
 * normal day: the time is already in the day's header.
 */
export function renderLabLateStatus() {
  var el = document.getElementById('lab-late-status');
  if (!el) return;
  el.hidden = true;
  var pid = rt.getActiveId();
  if (!pid) return;
  var last = patientLabHistory(pid).find(function (set) {
    return set && set.resLabs && set.resLabs.length;
  });
  if (!last) return;
  var now = new Date();
  if (dayKeyFromLabSet(last) === now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()) return;
  var fecha = normalizeFechaLabHistory(last.fecha) || '';
  if (!/^\d{2}\/\d{2}/.test(fecha)) return;
  var hora = String(normalizeHoraLabHistory(last.hora) || '').trim().slice(0, 5);
  el.textContent = 'Aún no hay labs de hoy · último ' + fecha.slice(0, 5) + (hora ? ' · ' + hora : '');
  el.hidden = false;
}

/**
 * Search box (Resultados): mark the searched study name in the selected day. Text only — copy reads stored data, never this DOM.
 */
var searchQuery = '';

export function setLabSearchQuery(q) {
  searchQuery = String(q || '').trim();
  highlightLabSearch();
}

export function highlightLabSearch() {
  var root = document.getElementById('lab-output-box');
  if (!root) return;
  root.querySelectorAll('mark.lab-hit').forEach(function (m) {
    m.replaceWith(document.createTextNode(m.textContent));
  });
  root.normalize();
  if (!searchQuery) return;
  var re = new RegExp('(^|[^A-Za-z0-9])(' + searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[A-Za-z0-9]*)', 'gi');
  var first = null;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(function (node) {
    var text = node.nodeValue;
    var frag = null;
    var last = 0;
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      frag = frag || document.createDocumentFragment();
      var start = m.index + m[1].length;
      frag.appendChild(document.createTextNode(text.slice(last, start)));
      var mark = document.createElement('mark');
      mark.className = 'lab-hit';
      mark.textContent = m[2];
      frag.appendChild(mark);
      first = first || mark;
      last = start + m[2].length;
    }
    if (!frag) return;
    frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });
  if (first) first.scrollIntoView({ block: 'nearest' });
}
