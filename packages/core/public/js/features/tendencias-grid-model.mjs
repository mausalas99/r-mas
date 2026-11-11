/**
 * Plain models for the Tendencias list (summary line, sections, rows) and the small updates the old DOM code
 * used to make in place: section open / closed, new numbers for the rows, a saved drag order. The view
 * (tendencias-render-view.jsx) draws these; it keeps the last model so an update is a redraw, not a DOM edit.
 */
import { tendCatalogSeriesKey, tendCardLabelParts } from './tendencias-catalog.mjs';
import { trendSparkDomId } from './tendencias-state.mjs';
import { getSetTrendValueForSeries, parseFechaLabToMs } from '../tend-core.mjs';
import { getTendSectionLabel } from './tendencias-constants.mjs';
import { tendStatusInfo, tendChangeModel, tendRangeText, previousValueFromSetsDesc } from './tendencias-insight.mjs';

export function tendRowModel(sectionKey, spec, seriesIndex) {
  var specFk = spec.fieldKey;
  var idxRow = seriesIndex[tendCatalogSeriesKey(sectionKey, specFk)];
  var latest = idxRow ? idxRow.latest : null;
  var ref = idxRow ? idxRow.ref : null;
  var labelParts = tendCardLabelParts(sectionKey, specFk);
  var prev = idxRow
    ? previousValueFromSetsDesc(idxRow.setsDescFull || idxRow.setsDesc, sectionKey, specFk, getSetTrendValueForSeries)
    : null;
  return {
    key: tendCatalogSeriesKey(sectionKey, specFk),
    abnormal: !!(idxRow && idxRow.isAbnormal),
    title: labelParts.title,
    unit: labelParts.unit,
    latest: latest,
    status: tendStatusInfo(latest, ref),
    range: tendRangeText(ref),
    change: tendChangeModel(latest, prev, ref),
    sparkId: trendSparkDomId(sectionKey, specFk),
  };
}

function countAbnormalInList(list, seriesIndex, sectionKey) {
  return list.filter(function (spec) {
    var i = seriesIndex[tendCatalogSeriesKey(sectionKey, spec.fieldKey)];
    return i && i.isAbnormal;
  }).length;
}

export function tendSectionModel(sectionKey, list, seriesIndex, expanded) {
  return {
    key: sectionKey,
    label: getTendSectionLabel(sectionKey),
    expanded: expanded,
    oor: countAbnormalInList(list, seriesIndex, sectionKey),
    rows: list.map(function (spec) {
      return tendRowModel(sectionKey, spec, seriesIndex);
    }),
  };
}

var TEND_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmtTendDay(set, withYear) {
  var ms = set ? parseFechaLabToMs(set.fecha, set.hora) : null;
  if (typeof ms !== 'number' || !isFinite(ms)) return null;
  var d = new Date(ms);
  return d.getDate() + ' ' + TEND_MES[d.getMonth()] + (withYear ? ' ' + d.getFullYear() : '');
}

export function tendSummaryModel(historyDesc, oorN, totalN) {
  return { latestDay: fmtTendDay(historyDesc[0], true), prevDay: fmtTendDay(historyDesc[1], false), oor: oorN, total: totalN };
}

/** One section opened or closed (its sparkline cells follow). */
export function gridWithSectionExpanded(model, sectionKey, expanded) {
  return Object.assign({}, model, {
    sections: model.sections.map(function (s) {
      return s.key === sectionKey ? Object.assign({}, s, { expanded: expanded }) : s;
    }),
  });
}

/** New row models by series key; null when a row is not in the grid (the caller repaints everything). */
export function gridWithRows(model, rowsByKey) {
  var present = Object.create(null);
  model.sections.forEach(function (s) {
    s.rows.forEach(function (r) {
      present[r.key] = true;
    });
  });
  var keys = Object.keys(rowsByKey);
  if (!keys.length || keys.some(function (k) { return !present[k]; })) return null;
  return Object.assign({}, model, {
    sections: model.sections.map(function (s) {
      return Object.assign({}, s, {
        rows: s.rows.map(function (r) {
          return rowsByKey[r.key] || r;
        }),
      });
    }),
  });
}

/** Rows of one section in the order the user just dragged them to (keys not listed keep their place at the end). */
export function gridWithRowOrder(model, sectionKey, keysInOrder) {
  return Object.assign({}, model, {
    sections: model.sections.map(function (s) {
      if (s.key !== sectionKey) return s;
      var byKey = Object.create(null);
      s.rows.forEach(function (r) {
        byKey[r.key] = r;
      });
      var ordered = keysInOrder.filter(function (k) { return byKey[k]; }).map(function (k) { return byKey[k]; });
      var rest = s.rows.filter(function (r) { return keysInOrder.indexOf(r.key) === -1; });
      return Object.assign({}, s, { rows: ordered.concat(rest) });
    }),
  });
}
