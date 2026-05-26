/**
 * Puente historial de cultivos → contexto para sugerencias ATB en Manejo.
 */
import { parseCultivo_ } from './labs.js';
import {
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
} from './tend-core.mjs';

var CULTIVO_TIPO_LABELS = {
  hemo: 'Hemocultivo',
  uro: 'Urocultivo',
  cateter: 'Cultivo de catéter',
  gram: 'Tinción Gram',
  fungi: 'Fungicultivo',
  otro: 'Otros cultivos',
};

var MARKER_ALERTS = {
  BLEE: 'BLEE: evitar cefalosporinas 3ª gen (ceftriaxona, cefotaxima, ceftazidima salvo combinaciones documentadas)',
  ESBL: 'ESBL: evitar cefalosporinas 3ª gen salvo combinaciones documentadas',
  VRE: 'VRE: vancomicina no indicada; preferir linezolid/daptomicina según antibiograma',
  KPC: 'Carbapenemasa (KPC): evitar meropenem/imipenem; valorar ceftazidima-avibactam/colistina según nota local',
  NDM: 'Carbapenemasa (NDM): evitar meropenem/imipenem; valorar ceftazidima-avibactam/colistina según nota local',
  VIM: 'Carbapenemasa (VIM): evitar meropenem/imipenem; valorar ceftazidima-avibactam/colistina según nota local',
  IMP: 'Carbapenemasa (IMP): evitar meropenem/imipenem; valorar ceftazidima-avibactam/colistina según nota local',
  MBL: 'Metalobetalactamasa (MBL): evitar carbapenémicos según antibiograma y nota local',
  MRSA: 'MRSA: valorar oxacilina/cefazolina vs vancomicina según S',
  CRE: 'CRE: evitar carbapenémicos según mecanismo y antibiograma',
};

var MARKER_TOKEN_RE = /\b(BLEE|ESBL|VRE|KPC|NDM|VIM|IMP|MBL|MRSA|CRE)\b/gi;

function isLabSectionHeaderLine(s) {
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS)\b/i.test(String(s).trim());
}

function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (/^CULTIVO\b/i.test(t)) return true;
  if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(t)) return true;
  if (/^BACTERIOLOGIA\b/i.test(t)) return true;
  if (/^UROCULTIVO\b/i.test(t)) return true;
  if (/^HEMOCULTIVO\b/i.test(t)) return true;
  if (/^FUNGICULTIVO\b/i.test(t)) return true;
  if (/^TINCION\s+DE\s+GRAM/i.test(t)) return true;
  if (/^CATETER\b/i.test(t)) return true;
  if (/^ATB\b/i.test(t)) return true;
  if (/^Cuenta:/i.test(t)) return true;
  if (/^[•\u2022\u00B7]\s*/.test(t)) return true;
  if (/^Cultivos$/i.test(t)) return true;
  return false;
}

function splitResLabsByTipo(rows) {
  var labs = [];
  var cultivo = [];
  var inCultivo = false;
  (rows || []).forEach(function (row) {
    var raw = row == null ? '' : row;
    var s = String(raw).trim();
    if (isLabSectionHeaderLine(s)) {
      inCultivo = false;
      labs.push(raw);
      return;
    }
    if (inCultivo) {
      cultivo.push(raw);
      return;
    }
    if (isCultivoBlockStartLine(s)) {
      inCultivo = true;
      cultivo.push(raw);
      return;
    }
    labs.push(raw);
  });
  return { labs: labs, cultivo: cultivo };
}

function cultureBlockLooksNegative(left, right) {
  var L = (left + ' ' + right).toUpperCase();
  if (!String(right || '').trim()) return true;
  return /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(
    L
  );
}

function isCultureTableHeaderLine(t) {
  var s = String(t || '').trim();
  return (
    /^CULTIVO\b/i.test(s) ||
    /^(UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO)\b/i.test(s) ||
    /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(s) ||
    /^TINCION\s+DE\s+GRAM/i.test(s) ||
    /^CATETER\b/i.test(s)
  );
}

function classifyCultureTipoKeyFromHeaderLine(rawLine) {
  var s = String(rawLine || '').replace(/\s+/g, ' ').trim();
  var beforeColon = (s.split(':')[0] || s).toUpperCase();
  if (/^HEMOCULTIVO\b/.test(beforeColon)) return 'hemo';
  if (/^UROCULTIVO\b/.test(beforeColon)) return 'uro';
  if (/^FUNGICULTIVO\b/.test(beforeColon)) return 'fungi';
  if (/^TINCION(\s+DE)?\s+GRAM\b/.test(beforeColon)) return 'gram';
  if (/^CATETER\b/.test(beforeColon)) return 'cateter';
  return 'otro';
}

function normalizeChunkText(text) {
  return String(text || '').replace(/\s+/g, ' ');
}

function extractSensKeysFromRisSummary(risSummary) {
  var keys = [];
  var seen = Object.create(null);
  var re = /S:\s*([A-Z0-9/,.\s\-]+)/gi;
  var m;
  while ((m = re.exec(String(risSummary || '')))) {
    m[1]
      .split(/[,/|]/)
      .map(function (tok) {
        return tok.replace(/\s+/g, ' ').trim();
      })
      .filter(Boolean)
      .forEach(function (abbr) {
        var k = abbr.toUpperCase();
        if (!seen[k]) {
          seen[k] = 1;
          keys.push(k);
        }
      });
  }
  return keys;
}

function extractMarkersFromText(text) {
  var seen = Object.create(null);
  var out = [];
  var src = String(text || '');
  var m;
  MARKER_TOKEN_RE.lastIndex = 0;
  while ((m = MARKER_TOKEN_RE.exec(src))) {
    var token = m[1].toUpperCase();
    if (token === 'ESBL' && seen.BLEE) continue;
    if (!seen[token]) {
      seen[token] = 1;
      out.push(token);
    }
  }
  if (seen.BLEE) out = out.filter(function (t) {
    return t !== 'ESBL';
  });
  return out;
}

export function buildGlobalAlerts(markers) {
  var seen = Object.create(null);
  var alerts = [];
  (markers || []).forEach(function (mk) {
    var key = String(mk || '').toUpperCase();
    if (!key || seen[key]) return;
    seen[key] = 1;
    if (MARKER_ALERTS[key]) alerts.push(MARKER_ALERTS[key]);
    else alerts.push(key + ': revisar mecanismo de resistencia');
  });
  return alerts;
}

function parseHeaderFields(headerLine, set) {
  var line = String(headerLine || '').replace(/\s+/g, ' ').trim();
  var colon = line.indexOf(':');
  var left = colon >= 0 ? line.slice(0, colon).trim() : line;
  var right = colon >= 0 ? line.slice(colon + 1).trim() : '';
  var tipoKey = classifyCultureTipoKeyFromHeaderLine(line);
  var fecha = normalizeFechaLabHistory(set && set.fecha) || String((set && set.fecha) || '').trim() || '';
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (dm) {
    fecha = normalizeFechaLabHistory(dm[1]) || dm[1];
    sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, '').trim();
  }
  var organismo = right.replace(/\s*·\s*.*$/, '').replace(/\s+/g, ' ').trim();
  return {
    tipoLabel: CULTIVO_TIPO_LABELS[tipoKey] || CULTIVO_TIPO_LABELS.otro,
    sitio: sitio || '—',
    organismo: organismo || '—',
    fecha: fecha || '—',
  };
}

function isolateFromParsedBlock(block, set, chunkText) {
  var lines = String(block || '')
    .split(/\r?\n/)
    .map(function (l) {
      return l.replace(/\*+$/g, '').trim();
    })
    .filter(Boolean);
  if (!lines.length) return null;
  var header = lines[0];
  var colon = header.indexOf(':');
  var left = colon >= 0 ? header.slice(0, colon).trim() : header;
  var right = colon >= 0 ? header.slice(colon + 1).trim() : '';
  if (cultureBlockLooksNegative(left, right)) return null;
  var fields = parseHeaderFields(header, set);
  var risSummary = block.trim();
  var markers = extractMarkersFromText(risSummary + '\n' + String(chunkText || ''));
  return {
    tipoLabel: fields.tipoLabel,
    sitio: fields.sitio,
    organismo: fields.organismo,
    fecha: fields.fecha,
    markers: markers,
    risSummary: risSummary,
    sensKeys: extractSensKeysFromRisSummary(risSummary),
  };
}

function isolatesFromCultivoChunk(chunk, set) {
  var text = String(chunk || '').trim();
  if (!text) return [];
  var out = [];
  var sections = text
    .split(/\n\n+/)
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);

  sections.forEach(function (sec) {
    var lines = sec
      .split(/\r?\n/)
      .map(function (l) {
        return l.replace(/\*+$/g, '').trim();
      })
      .filter(Boolean);
    if (!lines.length) return;

    if (!isCultureTableHeaderLine(lines[0])) {
      var norm = normalizeChunkText(sec);
      var parsed = parseCultivo_(sec, norm);
      if (!parsed || /NEGATIVO/i.test(parsed)) return;
      parsed
        .split(/\n\n+/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean)
        .forEach(function (block) {
          var iso = isolateFromParsedBlock(block, set, sec);
          if (iso) out.push(iso);
        });
      return;
    }

    var iso = isolateFromParsedBlock(sec, set, sec);
    if (iso) out.push(iso);
  });
  return out;
}

function setAgeMs(set) {
  var fd = normalizeFechaLabHistory(set && set.fecha) || String((set && set.fecha) || '').trim();
  return parseFechaLabToMs(fd, set && set.hora);
}

function isSetWithinMaxAge(set, maxDays, referenceMs) {
  if (!maxDays || maxDays <= 0) return true;
  var setMs = setAgeMs(set);
  if (typeof setMs !== 'number' || !isFinite(setMs)) return true;
  var ref = typeof referenceMs === 'number' && isFinite(referenceMs) ? referenceMs : Date.now();
  return ref - setMs <= maxDays * 86400000;
}

function collectIsolatesFromHistory(history, opts) {
  var maxDays = opts.maxAgeDays == null ? 14 : opts.maxAgeDays;
  var referenceMs = opts.referenceMs;
  var inWindow = [];
  var allPositive = [];

  history.forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = splitResLabsByTipo(set.resLabs).cultivo;
    var setIsolates = [];
    cult.forEach(function (chunk) {
      isolatesFromCultivoChunk(chunk, set).forEach(function (iso) {
        setIsolates.push(iso);
      });
    });
    if (!setIsolates.length) return;
    allPositive = allPositive.concat(
      setIsolates.map(function (iso) {
        return { set: set, isolate: iso };
      })
    );
    if (isSetWithinMaxAge(set, maxDays, referenceMs)) {
      inWindow = inWindow.concat(setIsolates);
    }
  });

  if (inWindow.length) return inWindow;
  if (!allPositive.length) return [];

  var latestMs = -1;
  var latestSet = null;
  allPositive.forEach(function (row) {
    var ms = setAgeMs(row.set);
    if (typeof ms !== 'number' || !isFinite(ms)) return;
    if (ms >= latestMs) {
      latestMs = ms;
      latestSet = row.set;
    }
  });
  if (!latestSet) return allPositive.map(function (r) {
    return r.isolate;
  });
  return allPositive
    .filter(function (r) {
      return r.set === latestSet;
    })
    .map(function (r) {
      return r.isolate;
    });
}

/**
 * @param {Array<{ fecha?: string, hora?: string, resLabs?: unknown[] }>} labHistory
 * @param {{ maxAgeDays?: number, referenceMs?: number }} [opts]
 */
export function getCultureContextForManejo(labHistory, opts) {
  opts = opts || {};
  var history = sortLabHistoryChronological(labHistory || []);
  var isolates = collectIsolatesFromHistory(history, opts);
  var markerUnion = [];
  var markerSeen = Object.create(null);
  isolates.forEach(function (iso) {
    (iso.markers || []).forEach(function (mk) {
      var u = String(mk || '').toUpperCase();
      if (!u || markerSeen[u]) return;
      markerSeen[u] = 1;
      markerUnion.push(u);
    });
  });
  return {
    isolates: isolates,
    globalAlerts: buildGlobalAlerts(markerUnion),
    activeIsolateIndex: isolates.length ? 0 : 0,
  };
}
