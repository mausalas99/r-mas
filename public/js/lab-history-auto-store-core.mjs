function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

/** Texto fuente colapsado — útil para detectar pegados repetidos. */
export function normalizedSourceText(s) {
  return normalizeText(s && s.sourceText).replace(/\s+/g, ' ');
}

export function normalizeLabLine(line) {
  return normalizeText(line).replace(/\s+/g, ' ');
}

export function normalizeLabLines(lines) {
  return (Array.isArray(lines) ? lines : []).map(normalizeLabLine).filter(Boolean);
}

/** Analitos que identifican la toma (ignora AG/cAG/Delta derivados). */
var GASO_FINGERPRINT_KEYS = {
  PH: true,
  PCO2: true,
  PO2: true,
  LACTATO: true,
  LAC: true,
  BICA: true,
  HCO3: true,
  BE: true,
};

/**
 * Extrae pares clave→valor de una línea GASES / interpretación.
 * @param {string} line
 * @returns {Record<string, string>}
 */
function parseGasometriaCoreValues(line) {
  var out = Object.create(null);
  var re =
    /\b(pH|pCO2|pO2|Lactato|Lac|Bica|HCO3|BE)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/gi;
  var m;
  while ((m = re.exec(String(line || '')))) {
    var key = String(m[1] || '')
      .toUpperCase()
      .replace('Ó', 'O');
    if (key === 'LAC') key = 'LACTATO';
    if (key === 'HCO3') key = 'BICA';
    if (!GASO_FINGERPRINT_KEYS[key]) continue;
    var num = String(m[2] || '').replace(',', '.');
    out[key] = num;
  }
  return out;
}

/**
 * Huella de gasometría: mismos valores núcleo (pH/pCO2/pO2/Lactato/Bica…) → misma clave.
 * AG/cAG/Delta no cuentan (un reporte más rico no debe crear Labs (2)).
 * Tomas seriadas con valores distintos → claves distintas.
 */
export function gasometriaFingerprintFromResLabs(resLabs) {
  var merged = Object.create(null);
  (resLabs || []).forEach(function (chunk) {
    var s = String(chunk || '').trim();
    if (!s) return;
    if (!/^GASES\b/i.test(s) && !/^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(s)) {
      return;
    }
    var vals = parseGasometriaCoreValues(s);
    Object.keys(vals).forEach(function (k) {
      merged[k] = vals[k];
    });
  });
  var keys = Object.keys(merged).sort();
  if (!keys.length) {
    // Fallback: línea completa normalizada (compat tests / formato raro).
    var parts = [];
    (resLabs || []).forEach(function (chunk) {
      var s = String(chunk || '').trim();
      if (!s) return;
      if (/^GASES\b/i.test(s) || /^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(s)) {
        parts.push(normalizeLabLine(s));
      }
    });
    if (!parts.length) return '';
    parts.sort();
    return parts.join('\x02');
  }
  return keys
    .map(function (k) {
      return k + '=' + merged[k];
    })
    .join('|');
}

export function areLabSetsEquivalent(a, b) {
  var aa = normalizeLabLines(a);
  var bb = normalizeLabLines(b);
  if (aa.length !== bb.length) return false;
  for (var i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}

function normalizeDateValue(value) {
  return normalizeText(value);
}

/** Comparación de hora a minuto (05:51 y 05:51:00 → iguales). */
function normalizeTimeValue(value) {
  var t = normalizeText(value);
  if (!t) return '';
  var m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  var hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  var mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

export function isDuplicateAgainstLatest(latest, incoming) {
  if (!latest || !incoming) return false;
  if (normalizeDateValue(latest.fecha) !== normalizeDateValue(incoming.fecha)) return false;
  if (normalizeTimeValue(latest.hora) !== normalizeTimeValue(incoming.hora)) return false;
  return areLabSetsEquivalent(latest.resLabs || [], incoming.resLabs || []);
}

/** Misma fecha, hora y líneas de labs (orden preservado). */
export function areDuplicateLabSets(a, b) {
  if (!a || !b) return false;
  if (normalizeDateValue(a.fecha) !== normalizeDateValue(b.fecha)) return false;
  if (normalizeTimeValue(a.hora) !== normalizeTimeValue(b.hora)) return false;
  return areLabSetsEquivalent(a.resLabs || [], b.resLabs || []);
}

export function compareLabSetIdForDedupe(a, b) {
  var sa = String(a.id);
  var sb = String(b.id);
  var na = parseInt(sa, 10);
  var nb = parseInt(sb, 10);
  var aNum = !isNaN(na) && String(na) === sa;
  var bNum = !isNaN(nb) && String(nb) === sb;
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  return sa.localeCompare(sb);
}

function exactSignatureForLabSet(s) {
  if (!s || s.id == null || String(s.id) === '') return null;
  var lines = normalizeLabLines(s.resLabs || []);
  return normalizeDateValue(s.fecha) + '\x01' + normalizeTimeValue(s.hora) + '\x01' + lines.join('\x02');
}

/**
 * Grupos de duplicados exactos (misma fecha, hora y líneas de resultado).
 * En cada grupo se conserva el id más antiguo (menor según compareLabSetIdForDedupe).
 */
export function findExactDuplicateLabGroups(sets) {
  var list = (sets || []).filter(function (s) {
    return s && s.id != null && String(s.id) !== '';
  });
  var bySig = Object.create(null);
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var sig = exactSignatureForLabSet(s);
    if (sig == null) continue;
    if (!bySig[sig]) bySig[sig] = [];
    bySig[sig].push(s);
  }
  var groups = [];
  Object.keys(bySig).forEach(function (sig) {
    var arr = bySig[sig];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    groups.push({
      kind: 'exact',
      keeperId: String(arr[0].id),
      removeIds: arr.slice(1).map(function (x) {
        return String(x.id);
      }),
    });
  });
  return groups;
}

/**
 * Ids a eliminar: por cada grupo de sets duplicados se conserva el de id más antiguo
 * (menor timestamp numérico o orden lexicográfico estable).
 */
export function findDuplicateLabSetIdsToRemove(sets) {
  var groups = findExactDuplicateLabGroups(sets);
  var remove = [];
  for (var i = 0; i < groups.length; i++) {
    remove = remove.concat(groups[i].removeIds);
  }
  return remove;
}

/**
 * Quita clones exactos (misma fecha, hora y líneas). Conserva el id más antiguo.
 * @returns {{ sets: object[], removedIds: string[] }}
 */
export function stripExactDuplicateLabSets(sets) {
  var list = sets || [];
  var remove = new Set(findDuplicateLabSetIdsToRemove(list));
  if (!remove.size) return { sets: list, removedIds: [] };
  var removedIds = [];
  var next = list.filter(function (s) {
    if (!s || s.id == null) return true;
    var id = String(s.id);
    if (!remove.has(id)) return true;
    removedIds.push(id);
    return false;
  });
  return { sets: next, removedIds: removedIds };
}

/**
 * Huella de analitos numéricos (sección.clave:valor). Cultivos sin números → ''.
 */
export function analyteFingerprintFromResLabs(resLabs) {
  var pairs = [];
  (resLabs || []).forEach(function (row) {
    var line = String(row == null ? '' : row)
      .split('\n')[0]
      .trim()
      .replace('\t', ' ');
    if (!line) return;
    var tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return;
    var sec = tokens[0].replace(/:$/, '').toUpperCase();
    var i = 1;
    while (i < tokens.length) {
      var tok = tokens[i];
      var next = tokens[i + 1];
      if (next !== undefined) {
        var n = parseFloat(String(next).replace('*', '').replace(',', '.'));
        if (isFinite(n)) {
          pairs.push(sec + '.' + String(tok).toUpperCase() + ':' + n);
          i += 2;
          continue;
        }
      }
      i += 1;
    }
  });
  if (!pairs.length) return '';
  pairs.sort();
  return pairs.join('|');
}

function fechaKeyForAnalyteDedupe(set) {
  return normalizeDateValue(set && set.fecha);
}

/**
 * Misma fecha + mismos valores de analito (ids/hora/formato de línea pueden diferir).
 */
export function findAnalyteDuplicateLabGroups(sets) {
  var list = (sets || []).filter(function (s) {
    return s && s.id != null && String(s.id) !== '';
  });
  var by = Object.create(null);
  list.forEach(function (s) {
    var fecha = fechaKeyForAnalyteDedupe(s);
    var fp = analyteFingerprintFromResLabs(s.resLabs || []);
    if (!fecha || !fp) return;
    var key = fecha + '\x01' + fp;
    if (!by[key]) by[key] = [];
    by[key].push(s);
  });
  var groups = [];
  Object.keys(by).forEach(function (key) {
    var arr = by[key];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    groups.push({
      kind: 'analyte',
      keeperId: String(arr[0].id),
      removeIds: arr.slice(1).map(function (x) {
        return String(x.id);
      }),
    });
  });
  return groups;
}

function applyRemoveIds(sets, removeIds) {
  var remove = new Set(removeIds || []);
  if (!remove.size) return { sets: sets || [], removedIds: [] };
  var removedIds = [];
  var next = (sets || []).filter(function (s) {
    if (!s || s.id == null) return true;
    var id = String(s.id);
    if (!remove.has(id)) return true;
    removedIds.push(id);
    return false;
  });
  return { sets: next, removedIds: removedIds };
}

/**
 * Exactos primero, luego misma fecha + mismos analitos (Nube / re-paste).
 * @returns {{ sets: object[], removedIds: string[] }}
 */
export function stripDuplicateLabSets(sets) {
  var exact = stripExactDuplicateLabSets(sets);
  var analyteIds = [];
  findAnalyteDuplicateLabGroups(exact.sets).forEach(function (g) {
    analyteIds = analyteIds.concat(g.removeIds);
  });
  var analyte = applyRemoveIds(exact.sets, analyteIds);
  return {
    sets: analyte.sets,
    removedIds: exact.removedIds.concat(analyte.removedIds),
  };
}

/**
 * Mismo informe pegado (sourceText normalizado) en varios ids del mismo paciente.
 */
export function findNormalizedSourceDuplicateGroups(sets) {
  var list = (sets || []).filter(function (s) {
    if (!s || s.id == null || String(s.id) === '') return false;
    return normalizedSourceText(s).length > 24;
  });
  var by = Object.create(null);
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var k = normalizedSourceText(s);
    if (!by[k]) by[k] = [];
    by[k].push(s);
  }
  var groups = [];
  Object.keys(by).forEach(function (k) {
    var arr = by[k];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    groups.push({
      kind: 'sourceText',
      preview: k.slice(0, 72) + (k.length > 72 ? '…' : ''),
      ids: arr.map(function (x) {
        return String(x.id);
      }),
      fechas: arr.map(function (x) {
        return normalizeDateValue(x.fecha);
      }),
    });
  });
  return groups;
}

/**
 * Misma fecha y hora declaradas pero líneas de resultado distintas (no equivalentes).
 */
export function findConflictingSameDateTimeGroups(sets) {
  var list = (sets || []).filter(function (s) {
    return s && s.id != null && String(s.id) !== '';
  });
  var by = Object.create(null);
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var k = normalizeDateValue(s.fecha) + '\x01' + normalizeTimeValue(s.hora);
    if (!by[k]) by[k] = [];
    by[k].push(s);
  }
  var out = [];
  Object.keys(by).forEach(function (k) {
    var arr = by[k];
    if (arr.length < 2) return;
    var base = arr[0];
    var allSame = arr.every(function (s) {
      return areLabSetsEquivalent(s.resLabs || [], base.resLabs || []);
    });
    if (allSame) return;
    out.push({
      kind: 'sameDateTimeDifferentLabs',
      fecha: base.fecha,
      hora: base.hora,
      ids: arr.map(function (x) {
        return String(x.id);
      }),
    });
  });
  return out;
}

/**
 * Misma fecha + hora no vacía (hora vacía no agrupa: varios tomas del día sin hora).
 */
export function findLabSetsByDateTime(sets, fecha, hora) {
  var f = normalizeDateValue(fecha);
  var h = normalizeTimeValue(hora);
  if (!f || !h) return [];
  var matches = (sets || []).filter(function (s) {
    if (!s || s.id == null || String(s.id) === '') return false;
    return normalizeDateValue(s.fecha) === f && normalizeTimeValue(s.hora) === h;
  });
  matches.sort(compareLabSetIdForDedupe);
  return matches;
}

/**
 * Un mismo estudio (SOME) suele llegar en fragmentos — Biometría se procesa antes que
 * Química Sanguínea aunque sean la misma toma. También pasa DENTRO de una sección: un
 * citoquímico de LCR reporta el recuento celular (Bacteriología) y el resto (pH/Glu/
 * Prot/Cl, Química Clínica) como bloques separados del mismo estudio. Si ningún analito
 * entrante ya tiene valor en el set existente, son complementarios: se unen sin pisar
 * nada. Si algún analito se repite con otra hora, es una toma distinta del mismo día
 * (comportamiento previo).
 */
function sectionsAreComplementary_(a, b) {
  var pa = (a && a.parsedBySection) || null;
  var pb = (b && b.parsedBySection) || null;
  if (!pa || !pb) return false;
  var keysA = Object.keys(pa).filter(function (k) {
    return pa[k] && Object.keys(pa[k]).length;
  });
  if (!keysA.length) return false;
  return keysA.every(function (k) {
    var rowB = pb[k];
    if (!rowB || !Object.keys(rowB).length) return true;
    return Object.keys(pa[k]).every(function (fk) {
      return !(fk in rowB);
    });
  });
}

/**
 * Mismo día, sin match exacto de hora, pero secciones complementarias (p. ej. Biometría
 * llegó primero y Química Sanguínea se agrega después del mismo estudio). Devuelve el set
 * más reciente de ese día que no comparta ninguna sección con lo entrante.
 */
function findComplementarySameDaySet_(existingSets, incoming) {
  var f = normalizeDateValue(incoming && incoming.fecha);
  if (!f) return null;
  var sameDay = (existingSets || []).filter(function (s) {
    return s && s.id != null && String(s.id) !== '' && normalizeDateValue(s.fecha) === f;
  });
  if (!sameDay.length) return null;
  sameDay.sort(compareLabSetIdForDedupe);
  for (var i = 0; i < sameDay.length; i++) {
    if (sectionsAreComplementary_(incoming, sameDay[i])) return sameDay[i];
  }
  return null;
}

/**
 * Grupos de sets del mismo día cuyos analitos no se pisan entre sí (mutuamente
 * complementarios), listos para fusionar en el historial YA guardado — cubre
 * fragmentos que quedaron sueltos antes de este fix (p. ej. LCR: recuento celular
 * de Bacteriología y pH/Glu/Prot/Cl de Química Clínica llegados por separado).
 * No requiere ventana horaria: dos analitos distintos nunca chocan al unirse.
 * @param {object[]} sets — con id, fecha y parsedBySection
 * @returns {string[][]} cada grupo es una lista de ids (2+) a fusionar
 */
export function findComplementaryLabHistoryMergeGroups(sets) {
  var byDay = Object.create(null);
  (sets || []).forEach(function (s) {
    if (!s || s.id == null || String(s.id) === '') return;
    var pb = s.parsedBySection;
    if (!pb || !Object.keys(pb).length) return;
    var d = normalizeDateValue(s.fecha);
    if (!d) return;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(s);
  });

  var groups = [];
  Object.keys(byDay).forEach(function (day) {
    var arr = byDay[day];
    if (arr.length < 2) return;
    var parent = arr.map(function (_, i) {
      return i;
    });
    function find(i) {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    }
    for (var i = 0; i < arr.length; i++) {
      for (var j = i + 1; j < arr.length; j++) {
        if (sectionsAreComplementary_(arr[i], arr[j]) && sectionsAreComplementary_(arr[j], arr[i])) {
          var ri = find(i);
          var rj = find(j);
          if (ri !== rj) parent[ri] = rj;
        }
      }
    }
    var byRoot = Object.create(null);
    arr.forEach(function (s, i) {
      var r = find(i);
      if (!byRoot[r]) byRoot[r] = [];
      byRoot[r].push(s);
    });
    Object.keys(byRoot).forEach(function (r) {
      var g = byRoot[r];
      if (g.length < 2) return;
      g.sort(compareLabSetIdForDedupe);
      groups.push(
        g.map(function (s) {
          return String(s.id);
        })
      );
    });
  });
  return groups;
}

/**
 * Decide skip / merge / add al importar contra historial existente.
 * @param {object[]} existingSets
 * @param {{ fecha?: string, hora?: string, resLabs?: string[] }} incoming
 * @returns {{ action: 'skip'|'merge'|'add', keeper: object|null, siblings: object[] }}
 */
export function planLabHistoryDateTimeUpsert(existingSets, incoming) {
  var fecha = incoming && incoming.fecha;
  var hora = incoming && incoming.hora;
  var matches = findLabSetsByDateTime(existingSets, fecha, hora);
  if (!matches.length) {
    var complementary = findComplementarySameDaySet_(existingSets, incoming);
    if (complementary) return { action: 'merge', keeper: complementary, siblings: [], matchKind: 'complementary' };
    return { action: 'add', keeper: null, siblings: [], matchKind: null };
  }
  var keeper = matches[0];
  var siblings = matches.slice(1);
  if (
    !siblings.length &&
    areDuplicateLabSets(keeper, {
      fecha: fecha,
      hora: hora,
      resLabs: (incoming && incoming.resLabs) || [],
    })
  ) {
    return { action: 'skip', keeper: keeper, siblings: [], matchKind: 'datetime' };
  }
  return { action: 'merge', keeper: keeper, siblings: siblings, matchKind: 'datetime' };
}
