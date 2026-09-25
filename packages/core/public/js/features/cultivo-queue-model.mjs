/**
 * Pure helpers for cultivo follow-up: positive cultures still waiting for an antibiograma.
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
} from '../tend-core.mjs';

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
 * @param {unknown} chunkText
 * @returns {boolean}
 */
export function chunkHasAntibiograma(chunkText) {
  var t = String(chunkText || '');
  if (!t.trim()) return false;
  // Formato condensado real (compactarLineasAntibiograma): "ATB R: AMP | S: MERO" —
  // el ":" viene despues del bucket (R/I/S/ESBL), no pegado a "ATB". El regex viejo
  // exigia "ATB:" literal y nunca hacia match, asi que un cultivo YA resuelto se
  // marcaba para siempre como "ATB pendiente" (bloqueaba/ensuciaba Actualizar).
  if (/^ATB\b.*:/im.test(t)) return true;
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
  // A flora-only report ("REPORTE PRELIMINAR, MICROBIOTA … AUSENTE") names no isolate: no antibiogram to wait for.
  if (/^(REPORTE\s+PRELIMINAR,?\s*)?MICROBIOTA\b/i.test(String(row.organismo || '').trim())) return false;
  if (chunkHasAntibiograma(chunkText)) return false;
  return true;
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
export function classifyCultivoFollowUps(candidates, _note, _normalizeFecha) {
  var items = [];
  (candidates || []).forEach(function (c) {
    if (!c || c.negativo) return;
    /** @type {CultivoQueueReason[]} */
    var reasons = [];
    if (cultivoNeedsAtbFollowUp(c, c.chunk)) reasons.push('atb_pendiente');
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
