import { esc } from '../dom-escape.mjs';
import { getPatients } from '../app-state.mjs';
import { buildTrendAxisMeta, parseFechaLabToMs } from '../tend-core.mjs';
import {
  dayKeyFromIso,
  resolveEventualidadKind,
  pickHigherPriorityKind,
  abbreviatedEventualidadLabel,
  EVENTUALIDAD_KIND_LABELS,
} from './eventualidades-store.mjs';

export const EVENT_MARKER_COLORS = {
  transfusion: 'rgba(248, 113, 113, 0.9)',
  biopsia: 'rgba(251, 191, 36, 0.95)',
  procedimiento: 'rgba(96, 165, 250, 0.95)',
  otro: 'rgba(148, 163, 184, 0.9)',
};

/** @param {object|null|undefined} set */
export function dayKeyFromLabSet(set) {
  if (!set || set.fecha === 'Anterior') return null;
  const ms = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof ms !== 'number' || !isFinite(ms)) return null;
  return dayKeyFromIso(new Date(ms).toISOString());
}

/** @param {string|null|undefined} patientId @returns {Map<string, { kind: string, entries: object[] }>} */
export function collectEventMarkersForPatient(patientId) {
  /** @type {Map<string, { kind: string, entries: object[] }>} */
  const map = new Map();
  const pid = String(patientId || '').trim();
  if (!pid) return map;
  const patient = getPatients().find(function (row) {
    return String(row.id) === pid;
  });
  const store = patient && patient.eventualidades;
  const deleted = (store && store.deletedIds) || {};
  (store && Array.isArray(store.entries) ? store.entries : []).forEach(function (entry) {
    if (!entry || deleted[entry.id]) return;
    const dayKey = dayKeyFromIso(entry.at);
    if (dayKey === 'unknown') return;
    if (!map.has(dayKey)) {
      map.set(dayKey, { kind: 'otro', entries: [] });
    }
    const bucket = map.get(dayKey);
    bucket.entries.push(entry);
    bucket.kind = pickHigherPriorityKind(bucket.kind, resolveEventualidadKind(entry));
  });
  return map;
}

/**
 * @param {{ points?: object[] }|null|undefined} axisMeta
 * @param {Map<string, { kind: string, entries: object[] }>} markersByDay
 */
export function mapEventMarkersToChartIndices(axisMeta, markersByDay) {
  /** @type {number[]} */
  const indices = [];
  /** @type {Map<number, { kind: string, entries: object[] }>} */
  const byIndex = new Map();
  const seenDays = new Set();
  (axisMeta && axisMeta.points ? axisMeta.points : []).forEach(function (point, index) {
    const dayKey = dayKeyFromLabSet(point.set);
    if (!dayKey || !markersByDay.has(dayKey) || seenDays.has(dayKey)) return;
    seenDays.add(dayKey);
    indices.push(index);
    byIndex.set(index, markersByDay.get(dayKey));
  });
  return { indices: indices, byIndex: byIndex };
}

/** @param {object[]} setsAsc @param {string|null|undefined} patientId */
export function buildEventMarkerMapForSets(setsAsc, patientId) {
  const axisMeta = buildTrendAxisMeta(setsAsc);
  const markers = collectEventMarkersForPatient(patientId);
  return mapEventMarkersToChartIndices(axisMeta, markers);
}

const EVENT_MARKER_TAG_MAX_ENTRIES = 3;

/** @param {{ kind: string, entries: object[] }|null|undefined} bucket @returns {string} */
/**
 * @param {{ kind?: string, entries?: object[] }|null|undefined} bucket
 * @param {{ max?: number }} [opts]
 * @returns {{ text: string, kind: string }[]}
 */
export function eventMarkerTagSpecs(bucket, opts) {
  const entries = (bucket && bucket.entries) || [];
  if (!entries.length) return [];
  const max = opts && opts.max != null ? opts.max : EVENT_MARKER_TAG_MAX_ENTRIES;
  const shown = entries.slice(0, max);
  const extra = entries.length - shown.length;
  const specs = shown.map(function (entry) {
    return {
      text: abbreviatedEventualidadLabel(entry),
      kind: resolveEventualidadKind(entry),
    };
  });
  if (extra > 0) specs.push({ text: '+' + extra, kind: 'otro' });
  return specs;
}

export function eventMarkerTagText(bucket) {
  const entries = (bucket && bucket.entries) || [];
  if (!entries.length) return '';
  const shown = entries.slice(0, EVENT_MARKER_TAG_MAX_ENTRIES).map(abbreviatedEventualidadLabel);
  const extra = entries.length > EVENT_MARKER_TAG_MAX_ENTRIES ? ' +' + (entries.length - EVENT_MARKER_TAG_MAX_ENTRIES) : '';
  return shown.join(' · ') + extra;
}

/**
 * @param {object|null|undefined} entry
 * @param {{ manage?: boolean }} [opts]
 * @returns {string}
 */
export function buildEventMarkerTagHtml(entry, opts) {
  const kind = resolveEventualidadKind(entry);
  const label = abbreviatedEventualidadLabel(entry);
  const full = String((entry && entry.text) || '').trim();
  const id = esc((entry && entry.id) || '');
  const title = full ? ' title="' + esc(full) + '"' : '';
  const kindClass = 'tend-event-tag tend-event-tag--' + esc(kind);
  if (!(opts && opts.manage)) {
    return '<span class="' + kindClass + '"' + title + '>' + esc(label) + '</span>';
  }
  return (
    '<span class="' +
    kindClass +
    ' tend-event-tag--manage"' +
    title +
    '>' +
    '<button type="button" class="tend-event-tag__edit" data-tend-ev-edit="' +
    id +
    '" aria-label="Editar ' +
    esc(label) +
    '">' +
    esc(label) +
    '</button>' +
    '<button type="button" class="tend-event-tag__del" data-tend-ev-delete="' +
    id +
    '" aria-label="Eliminar ' +
    esc(label) +
    '">×</button></span>'
  );
}

/**
 * @param {{ kind?: string, entries?: object[] }|null|undefined} bucket
 * @param {{ manage?: boolean, max?: number }} [opts]
 * @returns {string}
 */
export function buildEventMarkerTagsHtml(bucket, opts) {
  const entries = (bucket && bucket.entries) || [];
  if (!entries.length) return '';
  const manage = !!(opts && opts.manage);
  const max = manage ? entries.length : opts && opts.max != null ? opts.max : EVENT_MARKER_TAG_MAX_ENTRIES;
  const shown = entries.slice(0, max);
  const extra = entries.length - shown.length;
  const chips = shown.map(function (entry) {
    return buildEventMarkerTagHtml(entry, { manage: manage });
  });
  if (extra > 0) chips.push('<span class="tend-event-tag tend-event-tag--more">+' + extra + '</span>');
  return '<div class="tend-event-col-tags">' + chips.join('') + '</div>';
}

/**
 * Draws a small rounded tag centered on x, top-aligned at `top`.
 * @returns {number} total vertical space used (0 when there is no text)
 */
function drawEventMarkerTag(ctx, x, top, color, text) {
  if (!text) return 0;
  const boxH = 15;
  const paddingX = 5;
  ctx.font = '600 10px system-ui, -apple-system, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const boxW = Math.min(textWidth + paddingX * 2, 130);
  const boxX = x - boxW / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(boxX, top, boxW, boxH, 4);
  } else {
    ctx.rect(boxX, top, boxW, boxH);
  }
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, top + boxH / 2 + 0.5, boxW - 2);
  return boxH + 2;
}

/**
 * @param {{ indices: number[], byIndex: Map<number, object> }|null|undefined} markerMap
 * @param {{ compact?: boolean }} [opts]
 */
export function createTendEventMarkerPlugin(markerMap, opts) {
  const compact = !!(opts && opts.compact);
  return {
    id: 'tendEventMarkers' + (compact ? 'Compact' : 'Detail'),
    afterDatasetsDraw: function (chart) {
      if (!markerMap || !markerMap.indices || !markerMap.indices.length) return;
      const ctx = chart.ctx;
      const yScale = chart.scales.y;
      const dataMeta = chart.getDatasetMeta(0);
      if (!ctx || !yScale || !dataMeta || !dataMeta.data) return;
      markerMap.indices.forEach(function (idx) {
        const pt = dataMeta.data[idx];
        if (!pt) return;
        const bucket = markerMap.byIndex.get(idx);
        const kind = bucket && bucket.kind ? bucket.kind : 'otro';
        const color = EVENT_MARKER_COLORS[kind] || EVENT_MARKER_COLORS.otro;
        const x = pt.x;
        ctx.save();
        var lineTop = yScale.top + (compact ? 4 : 0);
        if (!compact) {
          lineTop += drawEventMarkerTag(ctx, x, yScale.top, color, eventMarkerTagText(bucket));
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = compact ? 1 : 1.5;
        ctx.setLineDash(compact ? [2, 3] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, lineTop);
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
        if (compact) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, yScale.bottom - 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    },
  };
}

/** Chart axis may append " HH:MM" when a day has two draws; event rows stay date-only. */
export function eventLegendDateLabel(label) {
  return String(label || '')
    .replace(/\s+\d{1,2}:\d{2}(?::\d{2})?$/, '')
    .trim();
}

export function buildTendDetailEventsLegendHtml(markerMap, labels) {
  if (!markerMap || !markerMap.indices.length) return '';
  const parts = markerMap.indices.map(function (idx) {
    const bucket = markerMap.byIndex.get(idx);
    const label = eventLegendDateLabel(labels && labels[idx] != null ? labels[idx] : '');
    const kind = bucket && bucket.kind ? bucket.kind : 'otro';
    return (
      '<div class="tend-event-legend-item" data-kind="' +
      esc(kind) +
      '">' +
      '<span class="tend-event-legend-date">' +
      esc(label) +
      '</span>' +
      buildEventMarkerTagsHtml(bucket, { manage: true }) +
      '</div>'
    );
  });
  return '<div class="tend-event-legend" role="list">' + parts.join('') + '</div>';
}

/** @param {number|null|undefined} index @param {object[]} setsAsc */
export function dayValueFromTrendChartIndex(index, setsAsc) {
  if (index == null || !setsAsc || !setsAsc[index]) return '';
  const dayKey = dayKeyFromLabSet(setsAsc[index]);
  return dayKey && dayKey !== 'unknown' ? dayKey : '';
}

/** @param {{ indices: number[], byIndex: Map<number, object> }|null|undefined} markerMap @param {number} dataIndex */
export function eventTooltipLinesForChartIndex(markerMap, dataIndex) {
  if (!markerMap || !markerMap.byIndex.has(dataIndex)) return [];
  const bucket = markerMap.byIndex.get(dataIndex);
  return (bucket && bucket.entries ? bucket.entries : []).map(function (entry) {
    const kindLabel = EVENTUALIDAD_KIND_LABELS[resolveEventualidadKind(entry)] || 'Otro';
    return kindLabel + ': ' + String(entry.text || '').trim();
  });
}
