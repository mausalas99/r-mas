function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

export function normalizeLabLine(line) {
  return normalizeText(line).replace(/\s+/g, ' ');
}

export function normalizeLabLines(lines) {
  return (Array.isArray(lines) ? lines : []).map(normalizeLabLine).filter(Boolean);
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

function normalizeTimeValue(value) {
  return normalizeText(value);
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
