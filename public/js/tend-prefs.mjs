const LS_SERIES_COLORS = 'rpc-tend-series-colors';
const LS_GROUP_VISIBLE = 'rpc-tend-group-visible';
const LS_GROUP_TABLE_HIDDEN = 'rpc-tend-group-table-hidden';
const LS_GROUP_PANEL_ORDER = 'rpc-tend-group-panel-order';
const LS_GROUP_PANEL_HIDDEN = 'rpc-tend-group-panel-hidden';

export const DEFAULT_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16'
];

function readJson(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    var o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : fallback;
  } catch (_e) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_e) {}
}

export function seriesColorKey(sectionKey, fieldKey) {
  return String(sectionKey) + '|' + String(fieldKey);
}

export function readSeriesColor(sectionKey, fieldKey) {
  var map = readJson(LS_SERIES_COLORS, {});
  return map[seriesColorKey(sectionKey, fieldKey)] || null;
}

export function writeSeriesColor(sectionKey, fieldKey, hex) {
  var map = readJson(LS_SERIES_COLORS, {});
  map[seriesColorKey(sectionKey, fieldKey)] = String(hex);
  writeJson(LS_SERIES_COLORS, map);
}

function groupKey(patientId, sectionKey) {
  return String(patientId) + '|' + String(sectionKey);
}

export function readGroupVisibleFields(patientId, sectionKey) {
  var map = readJson(LS_GROUP_VISIBLE, {});
  var arr = map[groupKey(patientId, sectionKey)];
  return Array.isArray(arr) ? arr.slice() : null;
}

export function writeGroupVisibleFields(patientId, sectionKey, fieldKeys) {
  var map = readJson(LS_GROUP_VISIBLE, {});
  map[groupKey(patientId, sectionKey)] = (fieldKeys || []).slice();
  writeJson(LS_GROUP_VISIBLE, map);
}

export function readGroupTableHidden(patientId, sectionKey) {
  var map = readJson(LS_GROUP_TABLE_HIDDEN, {});
  var entry = map[groupKey(patientId, sectionKey)];
  if (!entry || typeof entry !== 'object') return { rows: [], cols: [] };
  return {
    rows: Array.isArray(entry.rows) ? entry.rows.slice() : [],
    cols: Array.isArray(entry.cols) ? entry.cols.slice() : []
  };
}

export function writeGroupTableHidden(patientId, sectionKey, hidden) {
  var map = readJson(LS_GROUP_TABLE_HIDDEN, {});
  map[groupKey(patientId, sectionKey)] = {
    rows: Array.isArray(hidden && hidden.rows) ? hidden.rows.slice() : [],
    cols: Array.isArray(hidden && hidden.cols) ? hidden.cols.slice() : []
  };
  writeJson(LS_GROUP_TABLE_HIDDEN, map);
}

export function readGroupPanelOrder(patientId, sectionKey) {
  var map = readJson(LS_GROUP_PANEL_ORDER, {});
  var arr = map[groupKey(patientId, sectionKey)];
  return Array.isArray(arr) ? arr.slice() : null;
}

export function writeGroupPanelOrder(patientId, sectionKey, familyKeys) {
  var map = readJson(LS_GROUP_PANEL_ORDER, {});
  map[groupKey(patientId, sectionKey)] = (familyKeys || []).slice();
  writeJson(LS_GROUP_PANEL_ORDER, map);
}

export function readGroupPanelHidden(patientId, sectionKey) {
  var map = readJson(LS_GROUP_PANEL_HIDDEN, {});
  var arr = map[groupKey(patientId, sectionKey)];
  return Array.isArray(arr) ? arr.slice() : [];
}

export function writeGroupPanelHidden(patientId, sectionKey, familyKeys) {
  var map = readJson(LS_GROUP_PANEL_HIDDEN, {});
  map[groupKey(patientId, sectionKey)] = (familyKeys || []).slice();
  writeJson(LS_GROUP_PANEL_HIDDEN, map);
}

export function defaultSeriesColor(index) {
  var i = Number(index);
  if (!isFinite(i) || i < 0) i = 0;
  return DEFAULT_COLORS[i % DEFAULT_COLORS.length];
}
