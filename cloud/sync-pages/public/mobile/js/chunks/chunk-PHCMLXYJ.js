import {
  clusterByDayTipoAndTimeWindow,
  dayKeyFromLabSet,
  dedupeConsolidatedLabRows,
  isMergeAcrossOccurrencesSectionKey,
  labRowRichnessScore,
  labRowSectionKey,
  labTimestampMsFromFechaHora,
  primaryTipoForLabSet,
  resLabsHasGasometria
} from "/mobile/js/chunks/chunk-UQG34TEA.js";
import {
  extractElectrolytesFromResLabs,
  looksLikeSomeLabReport,
  normalizeHoraLabHistory,
  reprocessLabResultLines_
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/lab-history-day-view.mjs
var LAB_HISTORY_DAY_VALUE_PREFIX = "day:";
function daySelectValue(dayKey) {
  return LAB_HISTORY_DAY_VALUE_PREFIX + String(dayKey || "");
}
function parseDaySelectValue(value) {
  var s = String(value == null ? "" : value);
  if (s.indexOf(LAB_HISTORY_DAY_VALUE_PREFIX) === 0) {
    return s.slice(LAB_HISTORY_DAY_VALUE_PREFIX.length);
  }
  return "";
}
function horaKey(set) {
  var h = normalizeHoraLabHistory(set && set.hora);
  return h ? String(h).trim().slice(0, 5) : "";
}
function clusterHoraLabel(sets) {
  var horas = [];
  (sets || []).forEach(function(set) {
    var h = horaKey(set);
    if (h && horas.indexOf(h) === -1) horas.push(h);
  });
  horas.sort();
  if (!horas.length) return "";
  if (horas.length === 1) return horas[0];
  return horas[0] + "\u2013" + horas[horas.length - 1];
}
function clusterTipoLabel(sets) {
  var tipos = /* @__PURE__ */ Object.create(null);
  (sets || []).forEach(function(set) {
    tipos[primaryTipoForLabSet(set && set.resLabs) || "labs"] = true;
  });
  var keys = Object.keys(tipos);
  if (keys.length === 1 && keys[0] === "cultivo") return "Cultivo";
  if (keys.length === 1 && keys[0] === "mixed") return "Mixto";
  if (keys.indexOf("cultivo") >= 0 && keys.length > 1) return "Mixto";
  return "Labs";
}
function mergeClusterBhExtras(sets) {
  var out = {};
  (sets || []).forEach(function(set) {
    var extras = set && set.bhExtras;
    if (!extras || typeof extras !== "object") return;
    Object.keys(extras).forEach(function(k) {
      out[k] = extras[k];
    });
  });
  return out;
}
function mergeClusterRefs(sets) {
  var out = {};
  (sets || []).forEach(function(set) {
    var refs = set && set.refsBySection;
    if (!refs || typeof refs !== "object") return;
    Object.keys(refs).forEach(function(k) {
      out[k] = refs[k];
    });
  });
  return out;
}
function mergeClusterSourceText(sets) {
  var parts = [];
  (sets || []).forEach(function(set) {
    var src = String(set && set.sourceText || "").trim();
    if (src && parts.indexOf(src) === -1) parts.push(src);
  });
  return parts.join("\n\n---\n\n");
}
function mergeClusterResLabs(sets) {
  var merged = [];
  var tipo = "labs";
  (sets || []).forEach(function(set) {
    var rows = set && set.resLabs || [];
    if (!rows.length) return;
    if (!merged.length) tipo = primaryTipoForLabSet(rows) || "labs";
    if (merged.length) merged.push("");
    merged = merged.concat(rows);
  });
  return dedupeConsolidatedLabRows(merged, tipo === "mixed" ? "labs" : tipo);
}
function isRepeatablePerDaySectionKey_(key) {
  return key === "GASES";
}
function reconcileSingletonSectionsAcrossDay_(groups) {
  var bestByKey = /* @__PURE__ */ Object.create(null);
  groups.forEach(function(g, gi) {
    (g.resLabs || []).forEach(function(row) {
      var key = labRowSectionKey(row);
      if (!key || isMergeAcrossOccurrencesSectionKey(key) || isRepeatablePerDaySectionKey_(key)) return;
      var score = labRowRichnessScore(row);
      var prev = bestByKey[key];
      if (!prev || score > prev.score) bestByKey[key] = { row, groupIdx: gi, score };
    });
  });
  Object.keys(bestByKey).forEach(function(key) {
    var winnerGroupIdx = bestByKey[key].groupIdx;
    groups.forEach(function(g, gi) {
      if (gi === winnerGroupIdx) return;
      g.resLabs = (g.resLabs || []).filter(function(row) {
        return labRowSectionKey(row) !== key;
      });
    });
  });
}
function dayElectrolyteFallback_(sets) {
  var best = null;
  (sets || []).forEach(function(set) {
    var e = extractElectrolytesFromResLabs(set && set.resLabs || []);
    if (e.na == null && e.cl == null) return;
    var ms = labTimestampMsFromFechaHora(set && set.fecha, set && set.hora);
    if (ms == null) return;
    if (!best || ms < best.ms) best = { ms, electrolytes: e };
  });
  return best ? best.electrolytes : null;
}
function backfillGasoAnionGapAcrossDay_(groups, sets) {
  var fallback = dayElectrolyteFallback_(sets);
  if (!fallback) return;
  groups.forEach(function(g) {
    if (!resLabsHasGasometria(g.resLabs)) return;
    g.resLabs = reprocessLabResultLines_(g.resLabs, { fallbackElectrolytes: fallback });
  });
}
function newestMs(sets) {
  var best = -Infinity;
  (sets || []).forEach(function(set) {
    var ms = labTimestampMsFromFechaHora(set && set.fecha, set && set.hora);
    if (ms != null && ms > best) best = ms;
  });
  return best;
}
function clusterDayLabSets(sets) {
  var list = (sets || []).filter(function(set) {
    return set && set.resLabs && set.resLabs.length;
  });
  if (!list.length) return [];
  var clusters = clusterByDayTipoAndTimeWindow(
    list,
    dayKeyFromLabSet,
    function(set) {
      return primaryTipoForLabSet(set.resLabs);
    },
    function(set) {
      return labTimestampMsFromFechaHora(set.fecha, set.hora);
    },
    function(set) {
      return resLabsHasGasometria(set.resLabs);
    }
  );
  var used = /* @__PURE__ */ new Set();
  clusters.forEach(function(cluster) {
    cluster.forEach(function(set) {
      used.add(set);
    });
  });
  var leftover = list.filter(function(set) {
    return !used.has(set);
  });
  if (leftover.length) clusters.push(leftover);
  var groups = clusters.map(function(cluster) {
    return {
      hora: clusterHoraLabel(cluster),
      tipoLabel: clusterTipoLabel(cluster),
      sets: cluster,
      resLabs: mergeClusterResLabs(cluster),
      sourceText: mergeClusterSourceText(cluster),
      bhExtras: mergeClusterBhExtras(cluster),
      refsBySection: mergeClusterRefs(cluster)
    };
  });
  backfillGasoAnionGapAcrossDay_(groups, list);
  reconcileSingletonSectionsAcrossDay_(groups);
  groups.sort(function(a, b) {
    return newestMs(b.sets) - newestMs(a.sets);
  });
  return groups.filter(function(g) {
    return g.resLabs && g.resLabs.length;
  });
}
function pickLabworkGroup(groups) {
  var list = groups || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].tipoLabel !== "Cultivo" && list[i].resLabs && list[i].resLabs.length) {
      return list[i];
    }
  }
  return list[0] || null;
}
function pickSomeSourceText(groups) {
  var list = groups || [];
  var i;
  for (i = 0; i < list.length; i++) {
    var some = String(list[i] && list[i].sourceText || "").trim();
    if (some && looksLikeSomeLabReport(some)) return some;
  }
  for (i = 0; i < list.length; i++) {
    var any = String(list[i] && list[i].sourceText || "").trim();
    if (any) return any;
  }
  return "";
}
function buildDayOutputPayload(day) {
  var sets = (day && day.rows ? day.rows : []).map(function(row) {
    return row.set;
  });
  var view = buildDayLabView(sets);
  if (!view.groups.length) return null;
  var newest = view.groups[0];
  var labwork = pickLabworkGroup(view.groups) || newest;
  return {
    view,
    newest,
    labwork,
    result: {
      fecha: view.fecha || newest.sets[0] && newest.sets[0].fecha || "",
      resLabs: labwork.resLabs,
      sourceText: pickSomeSourceText(view.groups) || labwork.sourceText || newest.sourceText,
      bhExtras: labwork.bhExtras,
      refsBySection: labwork.refsBySection
    }
  };
}
function buildDayLabView(sets) {
  var list = sets || [];
  var groups = clusterDayLabSets(list);
  var fecha = "";
  if (list[0] && list[0].fecha) fecha = String(list[0].fecha);
  return { groups, fecha };
}
function findDayForHistoryRef(days, ref, idFn) {
  var list = days || [];
  if (!list.length) return null;
  var dayKey = parseDaySelectValue(ref);
  if (dayKey) {
    return list.find(function(d) {
      return d.dayKey === dayKey;
    }) || null;
  }
  for (var i = 0; i < list.length; i++) {
    var found = list[i].rows.some(function(row) {
      return idFn(row.set, row.idx) === ref;
    });
    if (found) return list[i];
  }
  return null;
}
function resolveSelectedDayKey(days, prefer, idFn) {
  var list = days || [];
  if (!list.length) return "";
  if (prefer) {
    var fromPrefer = parseDaySelectValue(prefer);
    if (fromPrefer && list.some(function(d) {
      return d.dayKey === fromPrefer;
    })) {
      return fromPrefer;
    }
    var hit = findDayForHistoryRef(list, prefer, idFn);
    if (hit) return hit.dayKey;
  }
  return list[0].dayKey;
}
function filterOutDaySets(stored, day) {
  var remove = new Set(
    (day && day.rows ? day.rows : []).map(function(row) {
      return row.set;
    })
  );
  var removeIds = /* @__PURE__ */ Object.create(null);
  remove.forEach(function(set) {
    if (set && set.id != null && String(set.id).trim() !== "") {
      removeIds[String(set.id)] = true;
    }
  });
  return (stored || []).filter(function(s) {
    if (remove.has(s)) return false;
    return !(s && s.id != null && removeIds[String(s.id)]);
  });
}
function buildLabHistoryDayOptionsHtml(days, selectedDayKey) {
  return (days || []).map(function(day) {
    var key = day && day.dayKey != null ? String(day.dayKey) : "";
    var value = daySelectValue(key);
    return '<option value="' + esc(value) + '"' + (key === selectedDayKey ? " selected" : "") + ">" + esc(key || "Anterior") + "</option>";
  }).join("");
}

export {
  daySelectValue,
  buildDayOutputPayload,
  findDayForHistoryRef,
  resolveSelectedDayKey,
  filterOutDaySets,
  buildLabHistoryDayOptionsHtml
};
//# sourceMappingURL=/js/chunks/chunk-PHCMLXYJ.js.map
