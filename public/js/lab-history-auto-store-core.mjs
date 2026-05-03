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

function compareLabSetIdForDedupe(a, b) {
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

/**
 * Ids a eliminar: por cada grupo de sets duplicados se conserva el de id más antiguo
 * (menor timestamp numérico o orden lexicográfico estable).
 */
export function findDuplicateLabSetIdsToRemove(sets) {
  var list = (sets || []).filter(function (s) {
    return s && s.id != null && String(s.id) !== '';
  });
  if (list.length < 2) return [];
  list = list.slice().sort(compareLabSetIdForDedupe);
  var kept = [];
  var remove = [];
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var isDup = false;
    for (var k = 0; k < kept.length; k++) {
      if (areDuplicateLabSets(s, kept[k])) {
        isDup = true;
        break;
      }
    }
    if (isDup) remove.push(String(s.id));
    else kept.push(s);
  }
  return remove;
}
