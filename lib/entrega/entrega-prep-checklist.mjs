/**
 * Pure rules for Entrega prep checklist (CP6).
 * Signals only — no AI diagnosis. What’s incomplete for handoff.
 */

/**
 * @typedef {'hc'|'ea'|'pendientes'|'cultivos'} EntregaPrepGap
 */

/**
 * @typedef {'hc'|'ea'|'pendientes'|'cultivos'} EntregaPrepCta
 */

/**
 * @typedef {{
 *   id: string,
 *   nombre?: string,
 *   cuarto?: string,
 *   cama?: string,
 * }} EntregaPrepPatient
 */

/**
 * @typedef {{
 *   id: string,
 *   nombre: string,
 *   hint: string,
 *   gaps: EntregaPrepGap[],
 *   overdueTodoCount: number,
 *   dueProcedimientoCount: number,
 *   cultivoFollowUpCount: number,
 *   primaryCta: EntregaPrepCta,
 * }} EntregaPrepRow
 */

/**
 * @param {Date} [d]
 * @returns {string} YYYY-MM-DD local
 */
export function formatLocalTodayKey(d) {
  var date = d instanceof Date ? d : new Date();
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate())
  );
}

/**
 * @param {string|null|undefined} iso
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isSavedAtLocalToday(iso, now) {
  var raw = String(iso || '').trim();
  if (!raw) return false;
  var d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return formatLocalTodayKey(d) === formatLocalTodayKey(now instanceof Date ? now : new Date());
}

/**
 * HC “draft / incomplete” when motivo and padecimiento are both empty.
 * @param {{ motivoConsulta?: string, padecimientoActual?: string }|null|undefined} hcData
 * @returns {boolean} true = gap (needs HC)
 */
export function needsHcDraft(hcData) {
  if (!hcData || typeof hcData !== 'object') return true;
  var motivo = String(hcData.motivoConsulta || '').trim();
  var pad = String(hcData.padecimientoActual || '').trim();
  return !motivo && !pad;
}

/**
 * EA not saved for today (or never saved).
 * @param {{ text?: string, savedAt?: string|null }|null|undefined} textoGuardado
 * @param {Date} [now]
 * @returns {boolean} true = gap
 */
export function needsEaSaved(textoGuardado, now) {
  if (!textoGuardado || typeof textoGuardado !== 'object') return true;
  var savedAt = textoGuardado.savedAt;
  if (!isSavedAtLocalToday(savedAt, now)) return true;
  return !String(textoGuardado.text || '').trim();
}

/**
 * @param {unknown[]} todos
 * @param {Date} [now]
 * @returns {number}
 */
export function countOverdueTodos(todos, now) {
  var ref = now instanceof Date ? now : new Date();
  var n = 0;
  (todos || []).forEach(function (t) {
    if (!t || t.completed) return;
    var dueRaw = t.dueDate;
    if (dueRaw == null || dueRaw === '') return;
    var due = dueRaw instanceof Date ? dueRaw : new Date(dueRaw);
    if (Number.isNaN(due.getTime())) return;
    if (due.getTime() < ref.getTime()) n += 1;
  });
  return n;
}

/**
 * Active entrega procedimientos whose scheduledAt is in the past.
 * @param {unknown[]} items listActiveProcedimientos-style items
 * @param {Date} [now]
 * @returns {number}
 */
export function countDueProcedimientos(items, now) {
  var ref = now instanceof Date ? now : new Date();
  var n = 0;
  (items || []).forEach(function (it) {
    if (!it || it.completedAt) return;
    var raw = it.scheduledAt;
    if (raw == null || raw === '') return;
    var d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    if (d.getTime() < ref.getTime()) n += 1;
  });
  return n;
}

/**
 * Positive cultivo without antibiograma / marked pendiente.
 * @param {{ negativo?: boolean, resistencias?: string, organismo?: string }|null|undefined} row
 * @returns {boolean}
 */
export function cultivoNeedsFollowUp(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.negativo) return false;
  var org = String(row.organismo || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  if (!org || org === '—' || org === '-') return false;
  if (/PENDIENTE/.test(org)) return true;
  var res = String(row.resistencias || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!res || res === '—' || res === '-') return true;
  return false;
}

/**
 * @param {unknown[]} rows
 * @returns {number}
 */
export function countCultivosNeedingFollowUp(rows) {
  var n = 0;
  (rows || []).forEach(function (r) {
    if (cultivoNeedsFollowUp(r)) n += 1;
  });
  return n;
}

/**
 * @param {EntregaPrepGap[]} gaps
 * @returns {EntregaPrepCta}
 */
export function primaryCtaForGaps(gaps) {
  var list = gaps || [];
  if (list.indexOf('pendientes') !== -1) return 'pendientes';
  if (list.indexOf('ea') !== -1) return 'ea';
  if (list.indexOf('hc') !== -1) return 'hc';
  return 'cultivos';
}

/**
 * @param {EntregaPrepGap[]} gaps
 * @param {{ overdueTodoCount?: number, dueProcedimientoCount?: number, cultivoFollowUpCount?: number }} [counts]
 * @returns {string}
 */
export function entregaPrepStatusLine(gaps, counts) {
  var c = counts || {};
  var parts = [];
  (gaps || []).forEach(function (g) {
    if (g === 'hc') parts.push('HC incompleta');
    if (g === 'ea') parts.push('EA sin guardar hoy');
    if (g === 'pendientes') {
      var overdue = Number(c.overdueTodoCount) || 0;
      var procs = Number(c.dueProcedimientoCount) || 0;
      var total = overdue + procs;
      if (total === 1) parts.push('1 pendiente vencido');
      else parts.push(total + ' pendientes vencidos');
    }
    if (g === 'cultivos') {
      var n = Number(c.cultivoFollowUpCount) || 0;
      if (n === 1) parts.push('1 cultivo sin seguimiento');
      else parts.push(n + ' cultivos sin seguimiento');
    }
  });
  return parts.join(' · ');
}

/**
 * @param {EntregaPrepCta} cta
 * @returns {string}
 */
export function entregaPrepPrimaryActionLabel(cta) {
  if (cta === 'hc') return 'Abrir historia';
  if (cta === 'ea') return 'Abrir estado actual';
  if (cta === 'pendientes') return 'Abrir pendientes';
  return 'Abrir cultivos';
}

/**
 * @param {EntregaPrepPatient[]} patients
 * @param {{
 *   hcByPatient?: Record<string, { motivoConsulta?: string, padecimientoActual?: string }|null>,
 *   eaByPatient?: Record<string, { text?: string, savedAt?: string|null }|null>,
 *   todosByPatient?: Record<string, unknown[]>,
 *   procedimientosByPatient?: Record<string, unknown[]>,
 *   cultivosByPatient?: Record<string, unknown[]>,
 *   now?: Date,
 * }} [opts]
 * @returns {EntregaPrepRow[]}
 */
export function buildEntregaPrepRows(patients, opts) {
  var o = opts || {};
  var now = o.now instanceof Date ? o.now : new Date();
  var hcByPatient = o.hcByPatient || {};
  var eaByPatient = o.eaByPatient || {};
  var todosByPatient = o.todosByPatient || {};
  var procedimientosByPatient = o.procedimientosByPatient || {};
  var cultivosByPatient = o.cultivosByPatient || {};

  var rows = [];
  (patients || []).forEach(function (p) {
    if (!p || p.id == null || !String(p.id)) return;
    var id = String(p.id);
    var overdueTodoCount = countOverdueTodos(todosByPatient[id], now);
    var dueProcedimientoCount = countDueProcedimientos(procedimientosByPatient[id], now);
    var cultivoFollowUpCount = countCultivosNeedingFollowUp(cultivosByPatient[id]);
    var gaps = [];
    if (needsHcDraft(hcByPatient[id])) gaps.push('hc');
    if (needsEaSaved(eaByPatient[id], now)) gaps.push('ea');
    if (overdueTodoCount > 0 || dueProcedimientoCount > 0) gaps.push('pendientes');
    if (cultivoFollowUpCount > 0) gaps.push('cultivos');
    if (!gaps.length) return;
    rows.push({
      id: id,
      nombre: String(p.nombre || '').trim() || 'Sin nombre',
      hint: bedHint(p),
      gaps: gaps,
      overdueTodoCount: overdueTodoCount,
      dueProcedimientoCount: dueProcedimientoCount,
      cultivoFollowUpCount: cultivoFollowUpCount,
      primaryCta: primaryCtaForGaps(gaps),
    });
  });

  rows.sort(function (a, b) {
    var score = function (r) {
      return (
        (r.gaps.indexOf('pendientes') !== -1 ? 8 : 0) +
        (r.gaps.indexOf('ea') !== -1 ? 4 : 0) +
        (r.gaps.indexOf('hc') !== -1 ? 2 : 0) +
        (r.gaps.indexOf('cultivos') !== -1 ? 1 : 0)
      );
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
