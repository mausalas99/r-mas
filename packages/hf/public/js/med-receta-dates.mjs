import { trimStr } from './med-receta-util.mjs';

function normalizeDiaMarkerText(s) {
  return String(s == null ? '' : s)
    .replace(/\u2217/g, '*')
    .replace(/\u204E/g, '*')
    .replace(/\uFF0A/g, '*')
    .replace(/\u00B7/g, ' ');
}

export function stripDiaMarkersFromDosis(dosisPart) {
  var t = normalizeDiaMarkerText(String(dosisPart || ''));
  return trimStr(
    t.replace(/\*?\s*DIA\s*#\s*\d+\s*\*?/gi, '').replace(/\s+/g, ' ')
  );
}

export function parseFechaDMYFromTimestampCell(cell) {
  var t = trimStr(cell);
  var m = t.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return m ? m[1] : '';
}

export function extractDiaTratamiento(dosisRaw) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  var m = t.match(/DIA\s*#\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** @param {string} fechaDMY dd/mm/yyyy, optionally with a time suffix or ISO yyyy-mm-dd */
export function parseFechaDMYToLocalDate(fechaDMY) {
  var t = trimStr(fechaDMY);
  var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  var day;
  var mon;
  var y;
  if (m) {
    day = parseInt(m[1], 10);
    mon = parseInt(m[2], 10) - 1;
    y = parseInt(m[3], 10);
  } else {
    m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    y = parseInt(m[1], 10);
    mon = parseInt(m[2], 10) - 1;
    day = parseInt(m[3], 10);
  }
  if (y < 100) y += 2000;
  var d = new Date(y, mon, day);
  if (d.getFullYear() !== y || d.getMonth() !== mon || d.getDate() !== day) return null;
  return d;
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Días calendario desde fechaDMY (inclusive) hasta refDate (por defecto hoy).
 * @param {string} fechaDMY
 * @param {Date} [refDate]
 */
export function calendarDaysSinceFechaDMY(fechaDMY, refDate) {
  var start = parseFechaDMYToLocalDate(fechaDMY);
  if (!start) return 0;
  var ref = refDate ? startOfLocalDay(refDate) : startOfLocalDay(new Date());
  var diff = Math.round((ref.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

/** Suma dayOffset a cada marcador DIA n en texto SOAP (DIA, DÍA, DIA#). */
export function advanceDiaInMedSoapText(text, dayOffset) {
  var off = parseInt(dayOffset, 10);
  if (!Number.isFinite(off) || off <= 0 || text == null || !String(text).trim()) {
    return trimStr(text);
  }
  return String(text).replace(/\bD[IÍ]A\s*#?\s*(\d+)\b/gi, function (_m, n) {
    return 'DIA ' + (parseInt(n, 10) + off);
  });
}

/**
 * Antibióticos en EA: el DIA guardado es relativo a fechaActualizacion de Manejo;
 * en pantalla se avanza por días calendario transcurridos.
 * @param {string} text
 * @param {string} fechaActualizacion dd/mm/yyyy
 * @param {Date} [refDate]
 */
export function advanceAbxMedTextForManejoDate(text, fechaActualizacion, refDate) {
  var offset = calendarDaysSinceFechaDMY(fechaActualizacion, refDate);
  return advanceDiaInMedSoapText(text, offset);
}

/**
 * Día de tratamiento efectivo hoy (o refDate) respecto a fechaActualizacion de Manejo.
 * @param {number | null | undefined} baseDia
 * @param {string | null | undefined} fechaActualizacion
 * @param {Date} [refDate]
 */
export function effectiveDiaTratamiento(baseDia, fechaActualizacion, refDate) {
  if (baseDia == null || !Number.isFinite(baseDia)) return null;
  var fecha = trimStr(fechaActualizacion);
  if (!fecha) return baseDia;
  return baseDia + calendarDaysSinceFechaDMY(fecha, refDate);
}

function applyDiaToken(text, dia) {
  if (dia == null || !Number.isFinite(dia)) return text;
  if (/\bD[IÍ]A\s*#?\s*\d+\b/i.test(text)) {
    return String(text).replace(/\bD[IÍ]A\s*#?\s*\d+\b/gi, 'DIA ' + dia);
  }
  return text;
}

function recetaItemMatchesAbxLine(line, item) {
  if (!item || item.suspendido || item.diaTratamiento == null) return false;
  var token = String(item.nombreRaw || '')
    .trim()
    .split(/\s+/)[0];
  return token.length >= 4 && line.toUpperCase().indexOf(token.toUpperCase()) !== -1;
}

function recetaItemForAbxLine(line, items) {
  var list = Array.isArray(items) ? items : [];
  for (var i = 0; i < list.length; i += 1) {
    if (recetaItemMatchesAbxLine(line, list[i])) return list[i];
  }
  return null;
}

/**
 * Día efectivo en pantalla: ítem de receta (DIA#) si hay match; si no, avanza el texto SOAP.
 * @param {string} text
 * @param {string | null | undefined} fechaActualizacion
 * @param {unknown[]} [recetaItems]
 * @param {Date} [refDate]
 */
export function rewriteAbxDisplayText(text, fechaActualizacion, recetaItems, refDate) {
  var base = trimStr(text);
  if (!base) return base;
  var fecha = trimStr(fechaActualizacion);
  return base
    .split(' | ')
    .map(function (part) {
      var item = recetaItemForAbxLine(part, recetaItems);
      if (item) return applyDiaToken(part, effectiveDiaTratamiento(item.diaTratamiento, fecha, refDate));
      return fecha ? advanceAbxMedTextForManejoDate(part, fecha, refDate) : part;
    })
    .join(' | ');
}

/** Reemplaza el primer marcador DIA# en dosisRaw conservando formato (*DIA# n*). */
export function setDiaTratamientoInDosis(dosisRaw, dia) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  if (!/DIA\s*#\s*\d+/i.test(t)) return trimStr(dosisRaw);
  var n = parseInt(dia, 10);
  if (!Number.isFinite(n) || n < 1) return trimStr(dosisRaw);
  return t.replace(/(\*?\s*DIA\s*#\s*)\d+(\s*\*?)/i, function (_m, pre, post) {
    return pre + String(n) + post;
  });
}

/** Incrementa día en ítems con DIA# (no suspendidos). */
export function incrementMedItemsDiaTratamiento(items) {
  var list = Array.isArray(items) ? items : [];
  var count = 0;
  var next = list.map(function (it) {
    if (!it || it.suspendido || it.diaTratamiento == null) return it;
    var diaNext = it.diaTratamiento + 1;
    count += 1;
    return Object.assign({}, it, {
      diaTratamiento: diaNext,
      dosisRaw: setDiaTratamientoInDosis(it.dosisRaw, diaNext),
    });
  });
  return { items: next, count: count };
}
