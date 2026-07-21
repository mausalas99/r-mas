/**
 * Pure overlay merge: built-in PanelDef registry + user/LAN patches (LWW).
 */

/** @typedef {{ panelId: string, baseSectionKey?: string, sectionKey: string, mode: 'num'|'qual', gates: string[], fields: unknown[], updatedAt: number, updatedBy: string }} OverlayRecord */

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hydrateGate(g) {
  if (typeof g !== 'string') return g;
  if (/[\\^$*+?()|[\]{}]/.test(g)) return new RegExp(g, 'i');
  return new RegExp(escapeRe(g), 'i');
}

function serializeGate(g) {
  if (typeof g === 'string') return g;
  if (g instanceof RegExp) return g.source;
  return String(g);
}

function hydrateField(f) {
  if (!f) return f;
  if (f.patterns) {
    return {
      key: f.key,
      patterns: (f.patterns || []).map(hydrateGate),
    };
  }
  return { key: f.key, labels: (f.labels || []).slice() };
}

function cloneDef(def) {
  return {
    sectionKey: def.sectionKey,
    mode: def.mode,
    gates: (def.gates || []).slice(),
    fields: (def.fields || []).map(function (f) {
      if (f.patterns) {
        return { key: f.key, patterns: f.patterns.slice() };
      }
      return { key: f.key, labels: (f.labels || []).slice() };
    }),
  };
}

function findBuiltinIndex(list, rec) {
  var baseKey = rec.baseSectionKey || rec.sectionKey;
  var mode = rec.mode || 'num';
  for (var i = 0; i < list.length; i++) {
    if (list[i].sectionKey === baseKey && list[i].mode === mode) return i;
  }
  return -1;
}

function serializeField(f) {
  if (f.patterns) {
    return {
      key: f.key,
      patterns: (f.patterns || []).map(serializeGate),
    };
  }
  return { key: f.key, labels: (f.labels || []).slice() };
}

function shouldReplaceOverlay(prev, rec) {
  var prevAt = Number(prev.updatedAt || 0);
  var recAt = Number(rec.updatedAt || 0);
  if (recAt > prevAt) return true;
  if (recAt < prevAt) return false;
  return String(rec.updatedBy || '') > String(prev.updatedBy || '');
}

export function mergeLabPanelOverlayLww(localArr, incomingArr) {
  var map = Object.create(null);
  function put(rec) {
    if (!rec || !rec.panelId) return;
    var prev = map[rec.panelId];
    if (!prev || shouldReplaceOverlay(prev, rec)) {
      map[rec.panelId] = rec;
    }
  }
  (localArr || []).forEach(put);
  (incomingArr || []).forEach(put);
  return Object.keys(map).map(function (k) { return map[k]; });
}

export function overlayRecordToPanelDef(rec) {
  var gates = (rec.gates || []).map(hydrateGate);
  var fields = (rec.fields || []).map(hydrateField);
  return { sectionKey: rec.sectionKey, mode: rec.mode || 'num', gates: gates, fields: fields };
}

export function applyOverlayToBuiltins(builtins, overlayArr) {
  var list = (builtins || []).map(cloneDef);
  (overlayArr || []).forEach(function (rec) {
    if (String(rec.panelId || '').indexOf('builtin:') === 0) {
      var idx = findBuiltinIndex(list, rec);
      if (idx >= 0) list[idx] = overlayRecordToPanelDef(rec);
      else list.push(overlayRecordToPanelDef(rec));
    } else {
      list.push(overlayRecordToPanelDef(rec));
    }
  });
  return list;
}

export function panelDefToOverlayPatch(def, meta) {
  var rec = {
    panelId: meta.panelId,
    sectionKey: def.sectionKey,
    mode: def.mode || 'num',
    gates: Array.isArray(meta.gates) ? meta.gates.slice() : (def.gates || []).map(serializeGate),
    fields: Array.isArray(meta.fields) ? meta.fields.map(function (f) {
      return f.patterns ? { key: f.key, patterns: (f.patterns || []).slice() } : { key: f.key, labels: (f.labels || []).slice() };
    }) : (def.fields || []).map(serializeField),
    updatedAt: meta.updatedAt,
    updatedBy: meta.updatedBy,
  };
  if (meta.baseSectionKey) rec.baseSectionKey = meta.baseSectionKey;
  return rec;
}
