function trimStr(v) {
  return String(v == null ? '' : v).trim();
}

export function parseFechaDMYFromTimestampCell(cell) {
  var t = trimStr(cell);
  var m = t.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return m ? m[1] : '';
}

export function extractDiaTratamiento(dosisRaw) {
  var t = trimStr(dosisRaw);
  var m = t.match(/\*?\s*DIA#\s*(\d+)\s*\*?/i);
  return m ? parseInt(m[1], 10) : null;
}

function stripDiaMarkersFromDosis(dosisPart) {
  return trimStr(String(dosisPart || '').replace(/\*?\s*DIA#\s*\d+\s*\*?/gi, '').replace(/\s+/g, ' '));
}

export function parseMedicationPaste(text) {
  var lines = String(text || '')
    .split(/\r?\n/)
    .map(trimStr)
    .filter(Boolean);
  var items = [];
  var fechas = [];
  var skipped = 0;
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split('\t');
    if (cols.length < 7) {
      skipped += 1;
      continue;
    }
    var tipo = trimStr(cols[1]).toUpperCase();
    if (tipo !== 'MEDICAMENTOS') {
      skipped += 1;
      continue;
    }
    var fd = parseFechaDMYFromTimestampCell(cols[0]);
    if (fd) fechas.push(fd);
    var dosisRaw = trimStr(cols[4]);
    items.push({
      id: 'med-' + Date.now().toString(36) + '-' + i + '-' + Math.random().toString(36).slice(2, 5),
      nombreRaw: trimStr(cols[2]),
      viaRaw: trimStr(cols[3]),
      dosisRaw: dosisRaw,
      frecuenciaRaw: trimStr(cols[5]),
      suspendido: false,
      diaTratamiento: extractDiaTratamiento(dosisRaw),
    });
  }
  return { items: items, fechas: fechas, skipped: skipped };
}

export function resolveFechaActualizacion(fechas, fallbackDMY) {
  var list = (fechas || []).filter(Boolean);
  if (!list.length) return trimStr(fallbackDMY) || '';
  var counts = Object.create(null);
  for (var i = 0; i < list.length; i += 1) {
    var k = list[i];
    counts[k] = (counts[k] || 0) + 1;
  }
  var best = list[0];
  var bestN = 0;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] > bestN) {
      bestN = counts[k];
      best = k;
    }
  });
  return best;
}

var ACCENT_FIRST_WORD = {
  LOSARTAN: 'LOSARTÁN',
  ONDANSETRON: 'ONDANSETRÓN',
  SENOSIDOS: 'SENÓSIDOS',
};

function applyNombreAccents(n) {
  var u = n.toUpperCase();
  for (var k in ACCENT_FIRST_WORD) {
    if (Object.prototype.hasOwnProperty.call(ACCENT_FIRST_WORD, k) && u.indexOf(k) === 0) {
      return ACCENT_FIRST_WORD[k] + n.slice(k.length);
    }
  }
  return n;
}

function normalizeSpacesPct(s) {
  return s.replace(/\s+/g, ' ').replace(/(\d)\s+%/g, '$1%');
}

function stripListaMarkers(nombre) {
  return trimStr(
    nombre
      .replace(/\s*\(\+\*\)\s*$/i, '')
      .replace(/\s*\(\*\)\s*$/i, '')
      .replace(/\s*\(\+\*\)/gi, '')
      .replace(/\s*\(\*\)/gi, '')
  );
}

function expandSolInyClause(n) {
  return n.replace(/\bSOL INY\s+(\d+(?:[.,]\d+)?)\s*ML\b/gi, function (_full, ml, _off, str) {
    var idx = arguments[arguments.length - 2];
    var before = str.slice(0, idx);
    if (/\b50\s*%/i.test(before) && String(ml).replace(',', '.') === '50') {
      return 'SOLUCIÓN INYECTABLE 50 ML';
    }
    return 'SOLUCIÓN INYECTABLE';
  }).replace(/\bSOL INY\b/gi, 'SOLUCIÓN INYECTABLE');
}

function expandNombrePresentacion(nombre) {
  var n = normalizeSpacesPct(stripListaMarkers(nombre));
  n = expandSolInyClause(n);
  n = n.replace(/\bCOMPRIMIDO\b/gi, 'TABLETA');
  n = n.replace(/\bCAPSULA\b/gi, 'CÁPSULA');
  n = n.replace(/\bCAPSULAS\b/gi, 'CÁPSULAS');
  n = n.replace(/\bJARABE\s+\d+\s*ML\b/gi, 'JARABE');
  n = n.replace(/\bGEL\s+\d+\s*ML\b/gi, 'GEL');
  var m = n.match(/^(POLIETILENGLICOL\s+3350)\s+POLVO\s+(\d+\s*G)\s*$/i);
  if (m) {
    return normalizeSpacesPct(m[1] + ' ' + m[2] + ' POLVO');
  }
  return normalizeSpacesPct(n);
}

function normalizeVia(viaRaw) {
  var v = trimStr(viaRaw).toUpperCase();
  if (v === 'VIA ORAL') return 'VÍA ORAL';
  if (v === 'VIA INTRAVENOSA') return 'VÍA INTRAVENOSA';
  if (v === 'VIA SUBCUTANEA') return 'VÍA SUBCUTÁNEA';
  return viaRaw;
}

function verbForVia(viaNorm) {
  if (viaNorm === 'VÍA ORAL') return 'TOMAR';
  if (viaNorm === 'VÍA SUBCUTÁNEA') return 'APLICAR';
  return 'ADMINISTRAR';
}

function normalizeFrecuencia(fr) {
  var t = trimStr(fr);
  t = t.replace(/\bHRS\b/gi, 'HORAS');
  t = t.replace(/\bHR\b/gi, 'HORA');
  return t;
}

function dosisBeforeSlash(dosisRaw) {
  var t = trimStr(dosisRaw);
  var idx = t.indexOf('//');
  var left = idx === -1 ? t : t.slice(0, idx);
  return stripDiaMarkersFromDosis(left);
}

function isPrnItem(item) {
  var f = trimStr(item.frecuenciaRaw).toUpperCase();
  if (f === 'PRN') return true;
  return /CRITERIO\s+PRN/i.test(item.dosisRaw || '');
}

function extractPrnTail(dosisRaw) {
  var t = trimStr(dosisRaw);
  var m = t.match(/CRITERIO\s+PRN:\s*(.+)$/i);
  return m ? trimStr(m[1]) : '';
}

function polishHypoPrnCriterion(crit) {
  var c = normalizeFrecuencia(trimStr(crit));
  c = c.replace(/\bHIPOGLUCEMIA\s*<\s*70\b/gi, 'HIPOGLUCEMIA <70 MG/DL');
  if (!/SEG[ÚU]N\s+REQUERIMIENTO/i.test(c)) {
    c = trimStr(c) + ' SEGÚN REQUERIMIENTO';
  }
  return c;
}

function extractCadaHorasFromCrit(crit) {
  var m = String(crit || '').match(/CADA\s+(\d+)\s*H(?:RS|ORAS)?/i);
  return m ? 'CADA ' + m[1] + ' HORAS' : '';
}

function instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido) {
  var verb = verbForVia(viaNorm);
  var nUp = nombreExpandido.toUpperCase();
  var isTab = /\bTABLETA\b/i.test(nombreExpandido);
  var isCap = /\bCÁPSULA\b/i.test(nombreExpandido);
  var mMg = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*MG$/i);
  var mMl = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*ML$/i);
  var mG = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);

  if (mG && verb !== 'TOMAR') {
    return verb + ' ' + mG[1].replace(',', '.') + ' G';
  }

  if (verb === 'TOMAR' && isTab && mMg) {
    return 'TOMAR 1 TABLETA (' + mMg[1].replace(',', '.') + ' MG)';
  }
  if (verb === 'TOMAR' && isCap && mMg) {
    return 'TOMAR 1 CÁPSULA (' + mMg[1].replace(',', '.') + ' MG)';
  }
  if (verb === 'TOMAR' && isTab && mG) {
    return 'TOMAR 1 TABLETA (' + mG[1].replace(',', '.') + ' G)';
  }
  if (verb === 'TOMAR' && mMl) {
    return 'TOMAR ' + mMl[1].replace(',', '.') + ' ML';
  }
  if (verb === 'TOMAR' && mG) {
    return 'TOMAR ' + mG[1].replace(',', '.') + ' G';
  }
  if (mMg) {
    return verb + ' ' + mMg[1].replace(',', '.') + ' MG';
  }
  if (mMl) {
    return verb + ' ' + mMl[1].replace(',', '.') + ' ML';
  }
  return verb + ' ' + dosisPrincipal;
}

export function formatMedicationEgresoLine(item) {
  var viaNorm = normalizeVia(item.viaRaw);
  var nombreExpandido = applyNombreAccents(expandNombrePresentacion(item.nombreRaw));
  var dosisPrincipal = dosisBeforeSlash(item.dosisRaw);
  var freqNorm = normalizeFrecuencia(item.frecuenciaRaw);
  var prn = isPrnItem(item);

  if (prn) {
    var critRaw = extractPrnTail(item.dosisRaw);
    if (!critRaw) critRaw = freqNorm;
    if (/HIPOGLUCEMIA/i.test(critRaw)) {
      var hypo = polishHypoPrnCriterion(critRaw);
      return (
        nombreExpandido +
        ' || ADMINISTRAR ' +
        dosisPrincipal +
        ' ' +
        viaNorm +
        ' ' +
        hypo +
        '.'
      );
    }
    if (/NAUSEAS|NÁUSEA/i.test(critRaw) && /VÓMITO|VOMITO/i.test(critRaw)) {
      var cadaN = extractCadaHorasFromCrit(critRaw) || normalizeFrecuencia('CADA 8 HORAS');
      return (
        nombreExpandido +
        ' || ADMINISTRAR ' +
        dosisPrincipal +
        ' ' +
        viaNorm +
        ' ' +
        cadaN +
        ' EN CASO DE NÁUSEA O VÓMITO.'
      );
    }
    var startFallback = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
    return nombreExpandido + ' || ' + startFallback + ' ' + normalizeFrecuencia(critRaw) + '.';
  }

  var instr = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
  var mid = instr + ' ' + viaNorm + ' ' + freqNorm;

  if (item.diaTratamiento != null) {
    return (
      nombreExpandido +
      ' || ' +
      mid +
      ' (DÍA ' +
      item.diaTratamiento +
      ' DE TRATAMIENTO).'
    );
  }

  return nombreExpandido + ' || ' + mid + ', SIN SUSPENDER HASTA NUEVO AVISO.';
}

export function buildMedRecetaCopyText(items) {
  var list = (items || []).filter(function (it) {
    return it && !it.suspendido;
  });
  var lines = list.map(function (it) {
    return formatMedicationEgresoLine(it);
  });
  return lines.join('\n\n');
}
