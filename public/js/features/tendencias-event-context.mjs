import { esc } from '../dom-escape.mjs';
import { getPatients } from '../app-state.mjs';
import { buildTrendAxisMeta, parseFechaLabToMs } from '../tend-core.mjs';
import {
  dayKeyFromIso,
  resolveEventualidadKind,
  pickHigherPriorityKind,
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
        ctx.strokeStyle = color;
        ctx.lineWidth = compact ? 1 : 1.5;
        ctx.setLineDash(compact ? [2, 3] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, yScale.top + (compact ? 4 : 0));
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

/**
 * @param {{ indices: number[], byIndex: Map<number, object> }|null|undefined} markerMap
 * @param {string[]} labels
 */
export function buildTendDetailEventsLegendHtml(markerMap, labels) {
  if (!markerMap || !markerMap.indices.length) return '';
  const parts = markerMap.indices.map(function (idx) {
    const bucket = markerMap.byIndex.get(idx);
    const label = labels && labels[idx] != null ? labels[idx] : '';
    const kind = bucket && bucket.kind ? bucket.kind : 'otro';
    const kindLabel = EVENTUALIDAD_KIND_LABELS[kind] || 'Otro';
    const texts = (bucket && bucket.entries ? bucket.entries : [])
      .map(function (entry) {
        const entryKind = EVENTUALIDAD_KIND_LABELS[resolveEventualidadKind(entry)] || 'Otro';
        const snippet = String(entry.text || '').trim().slice(0, 60);
        return entryKind + (snippet ? ': ' + snippet : '');
      })
      .join(' · ');
    return (
      '<div class="tend-event-legend-item" data-kind="' +
      esc(kind) +
      '">' +
      '<span class="tend-event-legend-date">' +
      esc(label) +
      '</span> ' +
      '<span class="tend-event-legend-kind">' +
      esc(kindLabel) +
      '</span>' +
      (texts ? '<span class="tend-event-legend-text">' + esc(texts) + '</span>' : '') +
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
