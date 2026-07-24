export function extraer(nombres, bloque) {
  if (!bloque) return '---';
  for (var i = 0; i < nombres.length; i++) {
    var regex = new RegExp(nombres[i] + '[^0-9-]{0,60}(-?\\d+\\.?\\d*)', 'i');
    var m = bloque.match(regex);
    if (m) return m[1];
  }
  return '---';
}

export function extraerConRango(nombres, texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var idx = t.indexOf(nombre);
    if (idx === -1) continue;
    // Start AFTER the test name to avoid matching digits within it
    var start = idx + nombre.length;
    var sub = texto.substring(start, start + 220);
    var mValor = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mValor) continue;
    var valorStr = mValor[1];
    var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (!mRango) return { valor: valorStr, min: null, max: null };
    return { valor: valorStr,
             min: parseFloat(mRango[1].replace(',','.')),
             max: parseFloat(mRango[2].replace(',','.')) };
  }
  return { valor: '---', min: null, max: null };
}

/** True si el nombre del estudio (justo tras la keyword) es de orina, no sérico. */
function esContextoUrinario_(texto, idxNombre, nombreLen) {
  // Solo mirar inmediatamente después del analito (p. ej. "SODIO EN ORINA"),
  // no 90+ chars hacia adelante — eso marcaba Cl sérico como urinario cuando
  // el mismo reporte traía electrolitos de orina a continuación.
  var after = texto.substring(idxNombre + nombreLen, idxNombre + nombreLen + 48).toUpperCase();
  if (/^\s*(EN\s+ORINA|URINARIO|URINARIA)\b/.test(after)) return true;
  return false;
}

/** True si «COLESTEROL» es en realidad HDL/LDL (no total). */
function esFraccionColesterol_(texto, idxNombre, nombreLen) {
  var after = texto.substring(idxNombre + nombreLen, idxNombre + nombreLen + 16).toUpperCase();
  return /^\s*(HDL|LDL)\b/.test(after);
}

/** True si la etiqueta pertenece a EGO/sedimento urinario (no biometría hemática). */
function esContextoSedimentoOrina_(texto, idxNombre, nombreLen) {
  var w = texto.substring(idxNombre, Math.min(texto.length, idxNombre + nombreLen + 120));
  if (/\/CAMPO\b/i.test(w)) return true;
  if (/Leucocitos\/uL|Hem\/uL|E\.U\.\/dL/i.test(w)) return true;
  var head = texto.substring(Math.max(0, idxNombre - 4500), idxNombre).toUpperCase();
  if (!/URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA/.test(head)) return false;
  var lastOrina = Math.max(
    head.lastIndexOf('URIANALISIS'),
    head.lastIndexOf('EXAMEN GENERAL DE ORINA'),
    head.lastIndexOf('ANALISIS DE ORINA')
  );
  if (lastOrina === -1) return true;
  var after = head.substring(lastOrina);
  return !/BIOMETRIA\s+HEMATICA|\bHGB\b|\bWBC\b|\bRBC\s+\d|\bPLT\s+\d/i.test(after);
}

/**
 * Igual que extraerConRango pero ignora ERITROCITOS/LEUCOCITOS del sedimento urinario.
 */
export function extraerConRangoBH(nombres, texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoSedimentoOrina_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return {
        valor: valorStr,
        min: parseFloat(mRango[1].replace(',', '.')),
        max: parseFloat(mRango[2].replace(',', '.')),
      };
    }
  }
  return { valor: '---', min: null, max: null };
}

/**
 * Igual que extraerConRango pero ignora ocurrencias en contexto urinario
 * (p. ej. SODIO EN ORINA bajo QUIMICA CLINICA cuando el reporte no trae suero).
 */
export function extraerConRangoSuero(nombres, texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoUrinario_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      // «COLESTEROL» solo = total; no tomar COLESTEROL HDL / LDL.
      if (nombre === 'COLESTEROL' && esFraccionColesterol_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return { valor: valorStr,
        min: parseFloat(mRango[1].replace(',', '.')),
        max: parseFloat(mRango[2].replace(',', '.')) };
    }
  }
  return { valor: '---', min: null, max: null };
}

/**
 * Índice aterogénico SOME: valor + umbral «N RIESGO PROM.» (sin rango min-max).
 */
export function extraerIndiceAterogenico_(texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  var nombres = ['INDICE ATEROGENICO', 'ÍNDICE ATEROGÉNICO', 'INDICE ATEROGÉNICO'];
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      var sub = texto.substring(idx + nombre.length, idx + nombre.length + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      // Preferir «N RIESGO PROM.» del propio índice; el rango min-max del
      // cociente CT/HDL suele quedar en la misma ventana de 220 chars.
      var mRiesgo = sub.match(/(\d+[.,]?\d*)\s*RIESGO/);
      if (mRiesgo) {
        return {
          valor: valorStr,
          min: 0,
          max: parseFloat(mRiesgo[1].replace(',', '.')),
        };
      }
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (mRango) {
        return {
          valor: valorStr,
          min: parseFloat(mRango[1].replace(',', '.')),
          max: parseFloat(mRango[2].replace(',', '.')),
        };
      }
      return { valor: valorStr, min: null, max: null };
    }
  }
  return { valor: '---', min: null, max: null };
}

/** Fin de ventana para un renglón de coagulación SOME (evita robar el valor del siguiente estudio). */
var COAG_ROW_BOUNDARIES_ = [
  'TIEMPO DE PROTROMBINA',
  'TIEMPO DE TROMBOPLASTINA',
  'INR',
  'FIBRINOGENO',
  'FIBRINÓGENO',
  'DIMERO D',
  'D-DIMERO',
  'D DIMERO',
  'TESTIGO',
  'OBSERVACIONES',
  'FROTIS',
  'DIFERENCIAL',
  'BIOMETRIA',
];

function isCoagPanelTitleAfter_(tUpper, idx, nombreLen) {
  var after = tUpper.substring(idx + nombreLen, idx + nombreLen + 24);
  return /^\s*Y\s+TROMBO/.test(after);
}

function findCoagBoundaryPos_(tUpper, fromIdx, bound) {
  if (bound !== 'INR') return tUpper.indexOf(bound, fromIdx);
  var slice = tUpper.substring(fromIdx);
  var re = /(?:^|[^A-Z0-9])INR(?![A-Z0-9])/g;
  var m = re.exec(slice);
  if (!m) return -1;
  var at = m[0].indexOf('INR');
  return fromIdx + m.index + at;
}

function coagWindowEnd_(tUpper, fromIdx, nombre) {
  var end = Math.min(tUpper.length, fromIdx + 220);
  var nombreU = String(nombre || '').toUpperCase();
  for (var i = 0; i < COAG_ROW_BOUNDARIES_.length; i++) {
    var bound = COAG_ROW_BOUNDARIES_[i];
    if (bound === nombreU) continue;
    var pos = findCoagBoundaryPos_(tUpper, fromIdx, bound);
    if (pos > fromIdx && pos < end) end = pos;
  }
  return end;
}

function parseCoagValorRango_(sub) {
  if (!sub) return null;
  // Quitar bloque TESTIGO interno si quedó en la ventana
  var clean = String(sub).replace(/TESTIGO[\s\S]*$/i, ' ');
  var mRango = clean.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
  var min = mRango ? parseFloat(mRango[1].replace(',', '.')) : null;
  var max = mRango ? parseFloat(mRango[2].replace(',', '.')) : null;
  var rangoIdx = mRango ? clean.search(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/) : -1;
  // Solo números ANTES del rango = resultado. Si falta el resultado, no usar el mín. del rango.
  var beforeRango = rangoIdx >= 0 ? clean.substring(0, rangoIdx) : clean;
  var mValor = beforeRango.match(/(-?\d+[.,]?\d*)/);
  if (!mValor) return null;
  return { valor: mValor[1], min: min, max: max };
}

function shouldSkipCoagMatch_(tUpper, nombre, idx) {
  if (nombre === 'TIEMPO DE PROTROMBINA' && isCoagPanelTitleAfter_(tUpper, idx, nombre.length)) {
    return true;
  }
  if (nombre !== 'INR') return false;
  var before = tUpper.charAt(idx - 1) || ' ';
  var afterCh = tUpper.charAt(idx + 3) || ' ';
  return /[A-Z0-9]/.test(before) || /[A-Z0-9]/.test(afterCh);
}

function isImplausibleInr_(valorStr, maxInr) {
  var inrN = parseFloat(String(valorStr || '').replace(',', '.'));
  return isFinite(inrN) && inrN > maxInr;
}

function tryParseCoagAt_(texto, tUpper, nombre, idx, maxInr) {
  if (shouldSkipCoagMatch_(tUpper, nombre, idx)) return null;
  var subStart = idx + nombre.length;
  var parsed = parseCoagValorRango_(texto.substring(subStart, coagWindowEnd_(tUpper, subStart, nombre)));
  if (!parsed) return null;
  if (nombre === 'INR' && isImplausibleInr_(parsed.valor, maxInr)) return null;
  return parsed;
}

/**
 * Extracción de coagulación SOME: no cruza al siguiente estudio (INR≠TTP)
 * ni toma el mínimo del rango cuando falta el resultado (TP≠10.25).
 */
export function extraerConRangoCoag(nombres, texto, opts) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  var maxInr = opts && typeof opts.maxInr === 'number' ? opts.maxInr : 8;
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      var parsed = tryParseCoagAt_(texto, t, nombre, idx, maxInr);
      if (parsed) return parsed;
      start = idx + nombre.length;
    }
  }
  return { valor: '---', min: null, max: null };
}

/**
 * Como extraerConRango, pero elimina repeticiones del nombre del estudio en la
 * ventana (layout SOME) para no tomar dígitos de etiquetas tipo T4, C3, B12, CA 125.
 */
export function extraerConRangoPanel(nombres, texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var idx = t.indexOf(nombre);
    if (idx === -1) continue;
    var sub = texto.substring(idx + nombre.length, idx + nombre.length + 260);
    var stripped = sub;
    var reName = new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    stripped = stripped.replace(reName, ' ');
    var mValor = stripped.match(/(-?\d+[.,]?\d*)/);
    if (!mValor) continue;
    var valorStr = mValor[1];
    var mRango = stripped.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (!mRango) return { valor: valorStr, min: null, max: null };
    return {
      valor: valorStr,
      min: parseFloat(mRango[1].replace(',', '.')),
      max: parseFloat(mRango[2].replace(',', '.')),
    };
  }
  return { valor: '---', min: null, max: null };
}

export function marcarSegunRango(valorStr, min, max) {
  if (valorStr === '---' || valorStr == null) return valorStr;
  var v = parseFloat(String(valorStr).replace(',','.'));
  if (isNaN(v) || min == null || max == null) return valorStr;
  return (v < min || v > max) ? valorStr + '*' : valorStr;
}

export function fmt(val) {
  if (!val || val === '---') return val;
  var star = val.endsWith('*');
  var n = parseFloat((star ? val.slice(0,-1) : val).replace(',','.'));
  if (isNaN(n)) return val;
  return String(n) + (star ? '*' : '');
}

export function toNum_(v) {
  if (v === '---' || v == null) return null;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}
