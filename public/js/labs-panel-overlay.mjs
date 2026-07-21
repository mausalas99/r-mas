/**
 * Pure overlay merge: built-in PanelDef registry + user/LAN patches (LWW).
 */

/** @typedef {{ panelId: string, baseSectionKey?: string, sectionKey: string, mode: 'num'|'qual', gates: string[], fields: unknown[], updatedAt: number, updatedBy: string }} OverlayRecord */

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hydrateField(f) {
  if (!f) return f;
  if (f.patterns) {
    return {
      key: f.key,
      patterns: (f.patterns || []).map(function (p) {
        return typeof p === 'string' ? new RegExp(escapeRe(p), 'i') : p;
      }),
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

function serializeGate(g) {
  if (g instanceof RegExp) return g.source;
  return String(g);
}

function serializeField(f) {
  if (f.patterns) {
    return {
      key: f.key,
      patterns: (f.patterns || []).map(function (p) {
        return p instanceof RegExp ? p.source : String(p);
      }),
    };
  }
  return { key: f.key, labels: (f.labels || []).slice() };
}

export function mergeLabPanelOverlayLww(localArr, incomingArr) {
  var map = Object.create(null);
  function put(rec) {
    if (!rec || !rec.panelId) return;
    var prev = map[rec.panelId];
    if (!prev || Number(rec.updatedAt || 0) >= Number(prev.updatedAt || 0)) {
      map[rec.panelId] = rec;
    }
  }
  (localArr || []).forEach(put);
  (incomingArr || []).forEach(put);
  return Object.keys(map).map(function (k) { return map[k]; });
}

export function overlayRecordToPanelDef(rec) {
  var gates = (rec.gates || []).map(function (g) {
    return typeof g === 'string' ? new RegExp(escapeRe(g), 'i') : g;
  });
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
    gates: (def.gates || []).map(serializeGate),
    fields: (def.fields || []).map(serializeField),
    updatedAt: meta.updatedAt,
    updatedBy: meta.updatedBy,
  };
  if (meta.baseSectionKey) rec.baseSectionKey = meta.baseSectionKey;
  return rec;
}
