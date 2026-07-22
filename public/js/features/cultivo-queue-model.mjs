/**
 * Pure helpers for the cultivo follow-up queue (mi equipo).
 * Reasons: pending antibiograma, or no note covering the result.
 */
import {
  splitResLabsByTipo,
  isCultureTableHeaderLine,
  parseCultureBlockFromLineArray,
  findCultivoChunkInSet,
} from '../cultivo-block-core.mjs';
import {
  sortLabHistoryChronological,
  normalizeFechaLabHistory,
  parseFechaLabToMs,
} from '../tend-core.mjs';

/**
 * @typedef {{
 *   id: string,
 *   nombre?: string,
 *   cuarto?: string,
 *   cama?: string,
 * }} CultivoQueuePatient
 */

/**
 * @typedef {'atb_pendiente'|'sin_nota'} CultivoQueueReason
 */

/**
 * @typedef {{
 *   sitio: string,
 *   organismo: string,
 *   fecha: string,
 *   reasons: CultivoQueueReason[],
 * }} CultivoQueueItem
 */

/**
 * @typedef {{
 *   id: string,
 *   nombre: string,
 *   hint: string,
 *   reasons: CultivoQueueReason[],
 *   items: CultivoQueueItem[],
 *   primaryCta: 'cultivos',
 * }} CultivoQueueRow
 */

/**
 * @param {unknown} chunkText
 * @returns {boolean}
 */
export function chunkHasAntibiograma(chunkText) {
  var t = String(chunkText || '');
  if (!t.trim()) return false;
  if (/^ATB\b/im.test(t) && /ATB\s*:.+/i.test(t)) return true;
  var up = t.toUpperCase();
  var idx = up.indexOf('ANTIBIOGRAMA');
  if (idx === -1) return false;
  var after = t.slice(idx + 'ANTIBIOGRAMA'.length);
  if (!String(after).replace(/[\s*]+/g, '')) return false;
  return (
    /\b(SENSIBLE|RESISTENTE|INTERMED|SUSCEPTIBLE|INDETER)\b/i.test(after) ||
    /\b[SIR]\b/.test(after.toUpperCase()) ||
    /^\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s./-]{2,}\s*$/im.test(after)
  );
}

/**
 * Positive isolate without usable antibiograma (incl. preliminar vacío).
 * @param {{ negativo?: boolean }|null|undefined} row
 * @param {unknown} chunkText
 */
export function cultivoNeedsAtbFollowUp(row, chunkText) {
  if (!row || row.negativo) return false;
  if (chunkHasAntibiograma(chunkText)) return false;
  return true;
}

function upperCompact(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function noteMentionsOrganismo(blob, org) {
  if (!org || org === '—' || org === 'NEGATIVO') return false;
  if (blob.indexOf(org) !== -1) return true;
  var tok = org.split(/\s+/).filter(Boolean)[0] || '';
  return tok.length > 4 && blob.indexOf(tok) !== -1;
}

function noteMentionsSitioCultivo(blob, sitio) {
  return (
    !!sitio &&
    sitio.length > 4 &&
    blob.indexOf(sitio) !== -1 &&
    /\b(CULTIVO|UROCULTIVO|HEMOCULTIVO|ANTIBIOGRAMA|ATB)\b/.test(blob)
  );
}

/**
 * @param {unknown} noteText
 * @param {{ organismo?: string, sitio?: string }|null|undefined} item
 */
export function noteMentionsCultivo(noteText, item) {
  var blob = upperCompact(noteText);
  if (!blob) return false;
  var org = upperCompact(item && item.organismo);
  if (noteMentionsOrganismo(blob, org)) return true;
  return noteMentionsSitioCultivo(blob, upperCompact(item && item.sitio));
}

function resolveFechaNorm(normalizeFecha) {
  if (typeof normalizeFecha === 'function') return normalizeFecha;
  return function (raw) {
    return normalizeFechaLabHistory(raw) || String(raw || '').trim();
  };
}

function cultResultMs(item, cultFecha) {
  if (item && typeof item.sortKeyMs === 'number' && isFinite(item.sortKeyMs)) {
    return item.sortKeyMs;
  }
  return parseFechaLabToMs(cultFecha, '');
}

function finiteMs(ms) {
  return typeof ms === 'number' && isFinite(ms) ? ms : null;
}

function noteFechaNorm(note, norm) {
  return norm((note && note.fecha) || '') || String((note && note.fecha) || '').trim();
}

function itemFechaNorm(item, norm) {
  var f = norm((item && item.fecha) || '') || String((item && item.fecha) || '').trim();
  return f && f !== '—' ? f : '';
}

/**
 * @param {{ fecha?: string, estudios?: string, evolucion?: string }|null|undefined} note
 * @param {{ fecha?: string, organismo?: string, sitio?: string, sortKeyMs?: number }} item
 * @param {(raw: unknown) => string} [normalizeFecha]
 */
export function noteCoversCultivoResult(note, item, normalizeFecha) {
  var norm = resolveFechaNorm(normalizeFecha);
  var noteBlob = [note && note.estudios, note && note.evolucion].filter(Boolean).join('\n');
  if (noteMentionsCultivo(noteBlob, item)) return true;
  var noteFecha = noteFechaNorm(note, norm);
  var cultFecha = itemFechaNorm(item, norm);
  if (!noteFecha || !cultFecha) return false;
  var noteMs = finiteMs(parseFechaLabToMs(noteFecha, ''));
  var cultMs = finiteMs(cultResultMs(item, cultFecha));
  return noteMs != null && cultMs != null && noteMs >= cultMs;
}

/**
 * @param {CultivoQueueReason[]} reasons
 */
export function cultivoQueueReasonLabels(reasons) {
  var parts = [];
  (reasons || []).forEach(function (r) {
    if (r === 'atb_pendiente') parts.push('ATB pendiente');
    if (r === 'sin_nota') parts.push('Sin nota');
  });
  return parts.join(' · ');
}

/**
 * @param {CultivoQueueReason[]} reasons
 * @param {number} itemCount
 */
export function cultivoQueueStatusLine(reasons, itemCount) {
  var n = Number(itemCount) || 0;
  var labels = cultivoQueueReasonLabels(reasons);
  if (n <= 1) return labels || 'Seguimiento de cultivo';
  return n + ' cultivos · ' + (labels || 'seguimiento');
}

/**
 * @param {unknown[]} labHistory
 * @returns {Array<{
 *   sitio: string,
 *   organismo: string,
 *   fecha: string,
 *   negativo: boolean,
 *   sortKeyMs: number,
 *   labSetId: string,
 *   chunk: string,
 * }>}
 */
function sectionLines(sec) {
  return String(sec || '')
    .split(/\r?\n/)
    .map(function (l) {
      return l.replace(/\*+$/g, '').trim();
    })
    .filter(Boolean);
}

function splitCultivoSections(chunkEntry) {
  return String(chunkEntry || '')
    .split(/\n\n+/)
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

function candidateFecha(row, set) {
  if (row.fechaMuestra && row.fechaMuestra !== '—') return row.fechaMuestra;
  return normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || '—';
}

/**
 * @param {object} set
 * @param {string} sec
 * @param {number} seq
 * @param {Record<string, object>} setById
 */
function candidateFromSection(set, sec, seq, setById) {
  var lines = sectionLines(sec);
  if (!lines.length || !isCultureTableHeaderLine(lines[0])) return null;
  var parsed = parseCultureBlockFromLineArray(lines, set, seq);
  var row = parsed && parsed.row;
  if (!row || row.negativo) return null;
  var fullSet = setById[String(row.labSetId)] || set;
  var chunk = findCultivoChunkInSet(fullSet, row.organismo) || sec;
  return {
    sitio: String(row.sitio || '—'),
    organismo: String(row.organismo || '—'),
    fecha: candidateFecha(row, set),
    negativo: !!row.negativo,
    sortKeyMs: row.sortKeyMs != null ? row.sortKeyMs : row.sortMs || 0,
    labSetId: String(row.labSetId || ''),
    chunk: String(chunk || ''),
  };
}

export function extractCultivoFollowUpCandidates(labHistory) {
  var rows = [];
  var seq = 0;
  var setById = Object.create(null);
  sortLabHistoryChronological(labHistory || []).forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    if (set.id != null) setById[String(set.id)] = set;
    splitResLabsByTipo(set.resLabs).cultivo.forEach(function (chunkEntry) {
      splitCultivoSections(chunkEntry).forEach(function (sec) {
        var cand = candidateFromSection(set, sec, seq++, setById);
        if (cand) rows.push(cand);
      });
    });
  });
  return rows;
}

/**
 * @param {ReturnType<typeof extractCultivoFollowUpCandidates>} candidates
 * @param {{ fecha?: string, estudios?: string, evolucion?: string }|null|undefined} note
 * @param {(raw: unknown) => string} [normalizeFecha]
 * @returns {CultivoQueueItem[]}
 */
export function classifyCultivoFollowUps(candidates, note, normalizeFecha) {
  var items = [];
  (candidates || []).forEach(function (c) {
    if (!c || c.negativo) return;
    /** @type {CultivoQueueReason[]} */
    var reasons = [];
    if (cultivoNeedsAtbFollowUp(c, c.chunk)) reasons.push('atb_pendiente');
    if (!noteCoversCultivoResult(note, c, normalizeFecha)) reasons.push('sin_nota');
    if (!reasons.length) return;
    items.push({
      sitio: c.sitio,
      organismo: c.organismo,
      fecha: c.fecha,
      reasons: reasons,
    });
  });
  items.sort(function (a, b) {
    return String(b.fecha).localeCompare(String(a.fecha), 'es');
  });
  return items;
}

/**
 * @param {CultivoQueueReason[]} reasons
 * @returns {CultivoQueueReason[]}
 */
function uniqReasons(reasons) {
  var seen = Object.create(null);
  var out = [];
  (reasons || []).forEach(function (r) {
    if (!r || seen[r]) return;
    seen[r] = true;
    out.push(r);
  });
  return out;
}

function bedHint(p) {
  var cuarto = String((p && p.cuarto) || '').trim();
  var cama = String((p && p.cama) || '').trim();
  if (cuarto && cama) return cuarto + ' · ' + cama;
  return cuarto || cama || '';
}

/**
 * @param {CultivoQueuePatient[]} patients
 * @param {{
 *   labHistoryByPatient?: Record<string, unknown[]>,
 *   notesByPatient?: Record<string, { fecha?: string, estudios?: string, evolucion?: string }>,
 *   normalizeFecha?: (raw: unknown) => string,
 * }} [opts]
 * @returns {CultivoQueueRow[]}
 */
export function buildCultivoQueueRows(patients, opts) {
  var o = opts || {};
  var normalizeFecha =
    typeof o.normalizeFecha === 'function'
      ? o.normalizeFecha
      : function (raw) {
          return normalizeFechaLabHistory(raw) || String(raw || '').trim();
        };
  var labHistoryByPatient = o.labHistoryByPatient || {};
  var notesByPatient = o.notesByPatient || {};
  var rows = [];

  (patients || []).forEach(function (p) {
    if (!p || p.id == null || !String(p.id)) return;
    var id = String(p.id);
    var candidates = extractCultivoFollowUpCandidates(labHistoryByPatient[id]);
    var items = classifyCultivoFollowUps(candidates, notesByPatient[id], normalizeFecha);
    if (!items.length) return;
    var reasons = uniqReasons(
      items.reduce(function (acc, it) {
        return acc.concat(it.reasons || []);
      }, /** @type {CultivoQueueReason[]} */ ([]))
    );
    rows.push({
      id: id,
      nombre: String(p.nombre || '').trim() || 'Sin nombre',
      hint: bedHint(p),
      reasons: reasons,
      items: items,
      primaryCta: 'cultivos',
    });
  });

  rows.sort(function (a, b) {
    var score = function (r) {
      return (
        (r.reasons.indexOf('atb_pendiente') !== -1 ? 2 : 0) +
        (r.reasons.indexOf('sin_nota') !== -1 ? 1 : 0) +
        Math.min(r.items.length, 3)
      );
    };
    var d = score(b) - score(a);
    if (d) return d;
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  });
  return rows;
}
