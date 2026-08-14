/**
 * Day-scoped lab history view: one picker row per calendar day, hour-window
 * groups inside the day (same rules as paste consolidation).
 */
import { esc } from './dom-escape.mjs';
import {
  clusterByDayTipoAndTimeWindow,
  labTimestampMsFromFechaHora,
} from './lab-consolidation-cluster.mjs';
import { dedupeConsolidatedLabRows } from './lab-bulk-paste.mjs';
import {
  dayKeyFromLabSet,
  primaryTipoForLabSet,
  resLabsHasGasometria,
} from './lab-history-format.mjs';
import { normalizeHoraLabHistory } from './tend-core.mjs';
import { looksLikeSomeLabReport } from './labs-report-refs.mjs';

export var LAB_HISTORY_DAY_VALUE_PREFIX = 'day:';

export function daySelectValue(dayKey) {
  return LAB_HISTORY_DAY_VALUE_PREFIX + String(dayKey || '');
}

/** @param {string} value select value or a raw set id */
export function parseDaySelectValue(value) {
  var s = String(value == null ? '' : value);
  if (s.indexOf(LAB_HISTORY_DAY_VALUE_PREFIX) === 0) {
    return s.slice(LAB_HISTORY_DAY_VALUE_PREFIX.length);
  }
  return '';
}

function horaKey(set) {
  var h = normalizeHoraLabHistory(set && set.hora);
  return h ? String(h).trim().slice(0, 5) : '';
}

function clusterHoraLabel(sets) {
  var horas = [];
  (sets || []).forEach(function (set) {
    var h = horaKey(set);
    if (h && horas.indexOf(h) === -1) horas.push(h);
  });
  horas.sort();
  if (!horas.length) return '';
  if (horas.length === 1) return horas[0];
  return horas[0] + '–' + horas[horas.length - 1];
}

function clusterTipoLabel(sets) {
  var tipos = Object.create(null);
  (sets || []).forEach(function (set) {
    tipos[primaryTipoForLabSet(set && set.resLabs) || 'labs'] = true;
  });
  var keys = Object.keys(tipos);
  if (keys.length === 1 && keys[0] === 'cultivo') return 'Cultivo';
  if (keys.length === 1 && keys[0] === 'mixed') return 'Mixto';
  if (keys.indexOf('cultivo') >= 0 && keys.length > 1) return 'Mixto';
  return 'Labs';
}

function mergeClusterBhExtras(sets) {
  var out = {};
  (sets || []).forEach(function (set) {
    var extras = set && set.bhExtras;
    if (!extras || typeof extras !== 'object') return;
    Object.keys(extras).forEach(function (k) {
      out[k] = extras[k];
    });
  });
  return out;
}

function mergeClusterRefs(sets) {
  var out = {};
  (sets || []).forEach(function (set) {
    var refs = set && set.refsBySection;
    if (!refs || typeof refs !== 'object') return;
    Object.keys(refs).forEach(function (k) {
      out[k] = refs[k];
    });
  });
  return out;
}

function mergeClusterSourceText(sets) {
  var parts = [];
  (sets || []).forEach(function (set) {
    var src = String((set && set.sourceText) || '').trim();
    if (src && parts.indexOf(src) === -1) parts.push(src);
  });
  return parts.join('\n\n---\n\n');
}

function mergeClusterResLabs(sets) {
  var merged = [];
  var tipo = 'labs';
  (sets || []).forEach(function (set) {
    var rows = (set && set.resLabs) || [];
    if (!rows.length) return;
    if (!merged.length) tipo = primaryTipoForLabSet(rows) || 'labs';
    if (merged.length) merged.push('');
    merged = merged.concat(rows);
  });
  return dedupeConsolidatedLabRows(merged, tipo === 'mixed' ? 'labs' : tipo);
}

function newestMs(sets) {
  var best = -Infinity;
  (sets || []).forEach(function (set) {
    var ms = labTimestampMsFromFechaHora(set && set.fecha, set && set.hora);
    if (ms != null && ms > best) best = ms;
  });
  return best;
}

/**
 * @param {object[]} sets one calendar day's history sets
 * @returns {Array<{ hora: string, tipoLabel: string, sets: object[], resLabs: string[], sourceText: string, bhExtras: object, refsBySection: object }>}
 */
export function clusterDayLabSets(sets) {
  var list = (sets || []).filter(function (set) {
    return set && set.resLabs && set.resLabs.length;
  });
  if (!list.length) return [];
  var clusters = clusterByDayTipoAndTimeWindow(
    list,
    dayKeyFromLabSet,
    function (set) {
      return primaryTipoForLabSet(set.resLabs);
    },
    function (set) {
      return labTimestampMsFromFechaHora(set.fecha, set.hora);
    },
    function (set) {
      return resLabsHasGasometria(set.resLabs);
    }
  );
  var used = new Set();
  clusters.forEach(function (cluster) {
    cluster.forEach(function (set) {
      used.add(set);
    });
  });
  var leftover = list.filter(function (set) {
    return !used.has(set);
  });
  if (leftover.length) clusters.push(leftover);
  var groups = clusters.map(function (cluster) {
    return {
      hora: clusterHoraLabel(cluster),
      tipoLabel: clusterTipoLabel(cluster),
      sets: cluster,
      resLabs: mergeClusterResLabs(cluster),
      sourceText: mergeClusterSourceText(cluster),
      bhExtras: mergeClusterBhExtras(cluster),
      refsBySection: mergeClusterRefs(cluster),
    };
  });
  groups.sort(function (a, b) {
    return newestMs(b.sets) - newestMs(a.sets);
  });
  return groups.filter(function (g) {
    return g.resLabs && g.resLabs.length;
  });
}

/**
 * @param {{ rows: Array<{ set: object }> }} day
 * @returns {{ view: ReturnType<typeof buildDayLabView>, newest: object, result: object } | null}
 */
export function pickLabworkGroup(groups) {
  var list = groups || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].tipoLabel !== 'Cultivo' && list[i].resLabs && list[i].resLabs.length) {
      return list[i];
    }
  }
  return list[0] || null;
}

export function pickSomeSourceText(groups) {
  var list = groups || [];
  var i;
  for (i = 0; i < list.length; i++) {
    var some = String((list[i] && list[i].sourceText) || '').trim();
    if (some && looksLikeSomeLabReport(some)) return some;
  }
  for (i = 0; i < list.length; i++) {
    var any = String((list[i] && list[i].sourceText) || '').trim();
    if (any) return any;
  }
  return '';
}

export function buildDayOutputPayload(day) {
  var sets = (day && day.rows ? day.rows : []).map(function (row) {
    return row.set;
  });
  var view = buildDayLabView(sets);
  if (!view.groups.length) return null;
  var newest = view.groups[0];
  var labwork = pickLabworkGroup(view.groups) || newest;
  return {
    view: view,
    newest: newest,
    labwork: labwork,
    result: {
      fecha: view.fecha || (newest.sets[0] && newest.sets[0].fecha) || '',
      resLabs: labwork.resLabs,
      sourceText: pickSomeSourceText(view.groups) || labwork.sourceText || newest.sourceText,
      bhExtras: labwork.bhExtras,
      refsBySection: labwork.refsBySection,
    },
  };
}

export function buildDayLabView(sets) {
  var list = sets || [];
  var groups = clusterDayLabSets(list);
  var fecha = '';
  if (list[0] && list[0].fecha) fecha = String(list[0].fecha);
  return { groups: groups, fecha: fecha };
}

/**
 * @param {Array<{ dayKey: string, rows: Array }>} days
 * @param {string} ref day:… value or a set id
 * @param {(set: object, idx: number) => string} idFn
 */
export function findDayForHistoryRef(days, ref, idFn) {
  var list = days || [];
  if (!list.length) return null;
  var dayKey = parseDaySelectValue(ref);
  if (dayKey) {
    return (
      list.find(function (d) {
        return d.dayKey === dayKey;
      }) || null
    );
  }
  for (var i = 0; i < list.length; i++) {
    var found = list[i].rows.some(function (row) {
      return idFn(row.set, row.idx) === ref;
    });
    if (found) return list[i];
  }
  return null;
}

/**
 * @param {Array<{ dayKey: string, rows: Array }>} days
 * @param {string} [prefer] day:… value or set id
 * @param {(set: object, idx: number) => string} idFn
 */
export function resolveSelectedDayKey(days, prefer, idFn) {
  var list = days || [];
  if (!list.length) return '';
  if (prefer) {
    var fromPrefer = parseDaySelectValue(prefer);
    if (
      fromPrefer &&
      list.some(function (d) {
        return d.dayKey === fromPrefer;
      })
    ) {
      return fromPrefer;
    }
    var hit = findDayForHistoryRef(list, prefer, idFn);
    if (hit) return hit.dayKey;
  }
  return list[0].dayKey;
}

/** Drop every set that belongs to the day bucket (identity or id). */
export function filterOutDaySets(stored, day) {
  var remove = new Set(
    (day && day.rows ? day.rows : []).map(function (row) {
      return row.set;
    })
  );
  var removeIds = Object.create(null);
  remove.forEach(function (set) {
    if (set && set.id != null && String(set.id).trim() !== '') {
      removeIds[String(set.id)] = true;
    }
  });
  return (stored || []).filter(function (s) {
    if (remove.has(s)) return false;
    return !(s && s.id != null && removeIds[String(s.id)]);
  });
}

export function buildLabHistoryDayOptionsHtml(days, selectedDayKey) {
  return (days || [])
    .map(function (day) {
      var key = day && day.dayKey != null ? String(day.dayKey) : '';
      var value = daySelectValue(key);
      return (
        '<option value="' +
        esc(value) +
        '"' +
        (key === selectedDayKey ? ' selected' : '') +
        '>' +
        esc(key || 'Anterior') +
        '</option>'
      );
    })
    .join('');
}
