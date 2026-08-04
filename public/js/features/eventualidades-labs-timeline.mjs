/**
 * Timeline de interpretaciones de labs (prosa en labsText) por día.
 */
import {
  dayKeyFromIso,
  formatDayLabel,
  formatDaySubLabel,
  getEventualidadesLabsText,
} from './eventualidades-store.mjs';
import { esc } from '../dom-escape.mjs';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** @param {string} ddmm @param {Date} [now] @returns {string} */
export function dayKeyFromLabsDateHeader(ddmm, now) {
  var m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(String(ddmm || '').trim());
  if (!m) return 'unknown';
  var d = Number(m[1]);
  var mo = Number(m[2]);
  if (!Number.isFinite(d) || !Number.isFinite(mo) || d < 1 || mo < 1 || mo > 12) {
    return 'unknown';
  }
  var y;
  if (m[3]) {
    y = Number(m[3]);
    if (y < 100) y += 2000;
  } else {
    var ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
    y = ref.getFullYear();
  }
  return y + '-' + pad2(mo) + '-' + pad2(d);
}

/**
 * @param {string} line
 * @param {Date} [now]
 * @returns {{ dayKey: string, time: string, raw: string }|null}
 */
export function parseLabsTextDateHeader(line, now) {
  var t = String(line || '').trim();
  if (!t) return null;
  if (/^ANTERIOR\s*$/i.test(t)) {
    return { dayKey: 'Anterior', time: '', raw: t };
  }
  var m = /^(?:LABS\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+(\d{1,2}:\d{2})(?::\d{2})?)?\s*$/i.exec(
    t
  );
  if (!m) return null;
  return {
    dayKey: dayKeyFromLabsDateHeader(m[1], now),
    time: m[2] ? String(m[2]).slice(0, 5) : '',
    raw: t,
  };
}

/**
 * Agrupa labsText (prosa LABS DD/MM… o bloques con fecha) en días.
 * @param {string} labsText
 * @param {Date} [now]
 * @returns {Array<{ day: string, label: string, isToday: boolean, entries: Array<{ id: string, text: string, time: string, header: string }> }>}
 */
export function groupLabsTextByDay(labsText, now) {
  var ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  var lines = String(labsText || '').split(/\r?\n/);
  /** @type {Array<{ day: string, time: string, header: string, text: string, id: string }>} */
  var blocks = [];
  /** @type {{ dayKey: string, time: string, header: string, lines: string[] }|null} */
  var cur = null;

  function flush() {
    if (!cur) return;
    var body = cur.lines.join('\n').replace(/^\s+|\s+$/g, '');
    if (!body && !cur.header) {
      cur = null;
      return;
    }
    blocks.push({
      day: cur.dayKey,
      time: cur.time,
      header: cur.header,
      text: body,
      id: 'labs_' + cur.dayKey + '_' + (cur.time || 'all') + '_' + blocks.length,
    });
    cur = null;
  }

  for (var i = 0; i < lines.length; i += 1) {
    var header = parseLabsTextDateHeader(lines[i], ref);
    if (header) {
      flush();
      cur = {
        dayKey: header.dayKey,
        time: header.time,
        header: header.raw,
        lines: [],
      };
      continue;
    }
    if (!cur) {
      cur = { dayKey: 'unknown', time: '', header: '', lines: [] };
    }
    cur.lines.push(lines[i]);
  }
  flush();

  /** @type {Map<string, typeof blocks>} */
  var map = new Map();
  blocks.forEach(function (b) {
    if (!map.has(b.day)) map.set(b.day, []);
    map.get(b.day).push(b);
  });

  return [...map.entries()]
    .sort(function (a, b) {
      if (a[0] === 'Anterior' || a[0] === 'unknown') return 1;
      if (b[0] === 'Anterior' || b[0] === 'unknown') return -1;
      return String(b[0]).localeCompare(String(a[0]));
    })
    .map(function (pair) {
      var day = pair[0];
      var dayEntries = pair[1];
      return {
        day: day,
        label: day === 'Anterior' ? 'Anterior' : formatDayLabel(day, ref),
        isToday: day === dayKeyFromIso(ref.toISOString()),
        entries: dayEntries,
      };
    });
}

function renderLabsEntryCard(entry) {
  var timeBit = entry.time
    ? '<span class="ev-card__meta">' + esc(entry.time) + '</span>'
    : '';
  return (
    '<article class="ev-card ev-card--labs" data-labs-block="' +
    esc(entry.id) +
    '">' +
    '<p class="ev-card__text">' +
    esc(entry.text || entry.header || '') +
    '</p>' +
    '<footer class="ev-card__foot">' +
    (timeBit ? '<div class="ev-card__foot-meta">' + timeBit + '</div>' : '') +
    '<div class="ev-card__actions">' +
    '<button type="button" class="ev-card__delete" data-ev-labs-delete="' +
    esc(entry.id) +
    '" aria-label="Eliminar interpretación">Eliminar</button>' +
    '</div></footer>' +
    '</article>'
  );
}

function renderLabsDaySection(dayGroup, now) {
  var n = dayGroup.entries.length;
  var countLabel = n === 1 ? '1 interpretación' : n + ' interpretaciones';
  var subLabel = formatDaySubLabel(dayGroup.day, now);
  var todayClass = dayGroup.isToday ? ' ev-day--today' : '';
  var isOpen = dayGroup.isToday || n > 0;
  return (
    '<details class="ev-day' +
    todayClass +
    '"' +
    (isOpen ? ' open' : '') +
    ' data-day="' +
    esc(dayGroup.day) +
    '" data-ev-labs-day="1">' +
    '<summary class="ev-day__summary">' +
    '<span class="ev-day__chevron" aria-hidden="true"></span>' +
    '<div class="ev-day__titles">' +
    '<span class="ev-day__pill">' +
    esc(dayGroup.label) +
    '</span>' +
    (subLabel ? '<span class="ev-day__date">' + esc(subLabel) + '</span>' : '') +
    '</div>' +
    '<span class="ev-day__count">' +
    esc(countLabel) +
    '</span>' +
    '</summary>' +
    '<div class="ev-day__panel">' +
    dayGroup.entries
      .map(function (e) {
        return renderLabsEntryCard(e);
      })
      .join('') +
    '</div></details>'
  );
}

/**
 * Rebuild labsText from grouped blocks (for delete).
 * @param {ReturnType<typeof groupLabsTextByDay>} byDay
 * @returns {string}
 */
export function serializeLabsTextFromGroups(byDay) {
  var parts = [];
  (byDay || []).forEach(function (day) {
    (day.entries || []).forEach(function (e) {
      var head = String(e.header || '').trim();
      var body = String(e.text || '').trim();
      if (head) parts.push(head);
      if (body) parts.push(body);
      if (head || body) parts.push('');
    });
  });
  return parts.join('\n').replace(/\n+$/, '');
}

/**
 * @param {string} labsText
 * @param {string} blockId
 * @param {Date} [now]
 * @returns {{ labsText: string, changed: boolean }}
 */
export function removeLabsTextBlock(labsText, blockId, now) {
  var byDay = groupLabsTextByDay(labsText, now);
  var nextDays = [];
  var changed = false;
  byDay.forEach(function (day) {
    var kept = (day.entries || []).filter(function (e) {
      if (String(e.id) === String(blockId)) {
        changed = true;
        return false;
      }
      return true;
    });
    if (kept.length) nextDays.push(Object.assign({}, day, { entries: kept }));
  });
  if (!changed) return { labsText: String(labsText || ''), changed: false };
  return { labsText: serializeLabsTextFromGroups(nextDays), changed: true };
}

/**
 * @param {{ labsText?: string }|null|undefined} store
 * @param {Date} [now]
 * @returns {string} inner HTML for .ev-timeline
 */
export function renderLabsTimelineInnerHtml(store, now) {
  var ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  var byDay = groupLabsTextByDay(getEventualidadesLabsText(store), ref);
  if (!byDay.length) {
    return (
      '<p class="ev-empty">Aún no hay interpretación de labs. Llega al procesar / Actualizar labs / cola de documentación.</p>'
    );
  }
  return (
    '<div class="ev-timeline__days">' +
    byDay
      .map(function (day) {
        return renderLabsDaySection(day, ref);
      })
      .join('') +
    '</div>'
  );
}
