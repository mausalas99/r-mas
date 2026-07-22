/**
 * Pure helpers for the turn documentation queue (mi equipo).
 * Signals: labs today not caught up in note, and/or open pendientes.
 */

/**
 * @typedef {{
 *   id: string,
 *   nombre?: string,
 *   cuarto?: string,
 *   cama?: string,
 * }} DocQueuePatient
 */

/**
 * @typedef {'labs'|'pendientes'} DocQueueReason
 */

/**
 * @typedef {'labs'|'nota'|'pendientes'} DocQueueCta
 */

/**
 * @typedef {{
 *   id: string,
 *   nombre: string,
 *   hint: string,
 *   reasons: DocQueueReason[],
 *   openTodoCount: number,
 *   primaryCta: DocQueueCta,
 * }} DocQueueRow
 */

/**
 * Format a Date as DD/MM/YYYY (matches normalizeFechaLabHistory output).
 * @param {Date} [d]
 * @returns {string}
 */
export function formatLocalTodayFecha(d) {
  var date = d instanceof Date ? d : new Date();
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear();
}

/**
 * @param {unknown[]} todos
 * @returns {number}
 */
export function countOpenTodos(todos) {
  var n = 0;
  (todos || []).forEach(function (t) {
    if (t && !t.completed) n += 1;
  });
  return n;
}

/**
 * @param {unknown[]} labSets
 * @param {string} todayFecha
 * @param {(raw: unknown) => string} normalizeFecha
 * @returns {boolean}
 */
export function hasLabSetsOnFecha(labSets, todayFecha, normalizeFecha) {
  var today = String(todayFecha || '').trim();
  if (!today) return false;
  var norm =
    typeof normalizeFecha === 'function'
      ? normalizeFecha
      : function (raw) {
          return String(raw || '').trim();
        };
  return (labSets || []).some(function (set) {
    if (!set) return false;
    var f = norm(set.fecha) || String(set.fecha || '').trim();
    return f === today;
  });
}

/**
 * Labs “nuevos hoy” when note is not clearly caught up.
 * @param {{ estudios?: string, fecha?: string }|null|undefined} note
 * @param {unknown[]} labSets
 * @param {string} todayFecha
 * @param {(raw: unknown) => string} normalizeFecha
 */
export function hasNewLabsNeedingDocs(note, labSets, todayFecha, normalizeFecha) {
  if (!hasLabSetsOnFecha(labSets, todayFecha, normalizeFecha)) return false;
  var estudios = String((note && note.estudios) || '').trim();
  if (!estudios) return true;
  var noteFecha = String((note && note.fecha) || '').trim();
  var norm =
    typeof normalizeFecha === 'function'
      ? normalizeFecha
      : function (raw) {
          return String(raw || '').trim();
        };
  var noteNorm = norm(noteFecha) || noteFecha;
  return noteNorm !== String(todayFecha || '').trim();
}

/**
 * @param {DocQueueReason[]} reasons
 * @returns {DocQueueCta}
 */
export function primaryCtaForReasons(reasons) {
  var hasLabs = (reasons || []).indexOf('labs') !== -1;
  var hasPend = (reasons || []).indexOf('pendientes') !== -1;
  if (hasLabs && hasPend) return 'nota';
  if (hasLabs) return 'labs';
  return 'pendientes';
}

/**
 * @param {DocQueueReason[]} reasons
 * @returns {string}
 */
export function docQueueReasonLabels(reasons) {
  var parts = [];
  (reasons || []).forEach(function (r) {
    if (r === 'labs') parts.push('Labs hoy');
    if (r === 'pendientes') parts.push('Pendientes');
  });
  return parts.join(' · ');
}

/**
 * Plain-language status for a queue row (what still needs work).
 * @param {DocQueueReason[]} reasons
 * @param {number} openTodoCount
 * @returns {string}
 */
export function docQueueStatusLine(reasons, openTodoCount) {
  var hasLabs = (reasons || []).indexOf('labs') !== -1;
  var hasPend = (reasons || []).indexOf('pendientes') !== -1;
  var n = Number(openTodoCount) || 0;
  if (hasLabs && hasPend) {
    return (
      'Labs de hoy sin nota · ' +
      n +
      ' pendiente' +
      (n === 1 ? '' : 's') +
      ' abierto' +
      (n === 1 ? '' : 's')
    );
  }
  if (hasLabs) return 'Labs de hoy — aún no están en la nota';
  if (n === 1) return '1 pendiente abierto';
  return n + ' pendientes abiertos';
}

/**
 * @param {DocQueueCta} cta
 * @returns {string}
 */
export function docQueuePrimaryActionLabel(cta) {
  if (cta === 'labs') return 'Abrir laboratorio';
  if (cta === 'pendientes') return 'Abrir pendientes';
  return 'Abrir nota';
}

/**
 * @param {DocQueuePatient[]} patients
 * @param {{
 *   labHistoryByPatient?: Record<string, unknown[]>,
 *   notesByPatient?: Record<string, { estudios?: string, fecha?: string }>,
 *   todosByPatient?: Record<string, unknown[]>,
 *   todayFecha?: string,
 *   normalizeFecha?: (raw: unknown) => string,
 * }} [opts]
 * @returns {DocQueueRow[]}
 */
export function buildDocQueueRows(patients, opts) {
  var o = opts || {};
  var todayFecha = String(o.todayFecha || formatLocalTodayFecha()).trim();
  var normalizeFecha =
    typeof o.normalizeFecha === 'function'
      ? o.normalizeFecha
      : function (raw) {
          return String(raw || '').trim();
        };
  var labHistoryByPatient = o.labHistoryByPatient || {};
  var notesByPatient = o.notesByPatient || {};
  var todosByPatient = o.todosByPatient || {};

  var rows = [];
  (patients || []).forEach(function (p) {
    if (!p || p.id == null || !String(p.id)) return;
    var id = String(p.id);
    var openTodoCount = countOpenTodos(todosByPatient[id]);
    var reasons = [];
    if (
      hasNewLabsNeedingDocs(notesByPatient[id], labHistoryByPatient[id], todayFecha, normalizeFecha)
    ) {
      reasons.push('labs');
    }
    if (openTodoCount > 0) reasons.push('pendientes');
    if (!reasons.length) return;
    rows.push({
      id: id,
      nombre: String(p.nombre || '').trim() || 'Sin nombre',
      hint: bedHint(p),
      reasons: reasons,
      openTodoCount: openTodoCount,
      primaryCta: primaryCtaForReasons(reasons),
    });
  });

  rows.sort(function (a, b) {
    var score = function (r) {
      return (r.reasons.indexOf('labs') !== -1 ? 2 : 0) + (r.reasons.indexOf('pendientes') !== -1 ? 1 : 0);
    };
    var d = score(b) - score(a);
    if (d) return d;
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  });
  return rows;
}

function bedHint(p) {
  var cuarto = String((p && p.cuarto) || '').trim();
  var cama = String((p && p.cama) || '').trim();
  if (cuarto && cama) return cuarto + ' · ' + cama;
  return cuarto || cama || '';
}
