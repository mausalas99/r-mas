import { resolveLabFieldRange_ } from './labs-default-refs.mjs';

/**
 * Primer resultado numérico de `s` → { index, 1: valorStr } (forma de RegExp match), o null.
 * «1,234.5» es separador de miles (SOME usa punto decimal) → «1234.5», no 1.234.
 * «1e5» no es un resultado de laboratorio → null (antes se leía como 1).
 * «<0.01» / «> 1000» conservan el signo pegado («<0.01», «>1000»): el valor real está fuera
 * del límite de medición. `index` sigue apuntando al número.
 */
export function matchValorLab_(s) {
  s = String(s || '');
  var m = s.match(/-?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\d,])|-?\d+[.,]?\d*/);
  if (!m) return null;
  if (/^[eE][+-]?\d/.test(s.slice(m.index + m[0].length))) return null;
  var v = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(m[0]) ? m[0].replace(/,/g, '') : m[0];
  var sign = s.slice(Math.max(0, m.index - 2), m.index).match(/([<>]) ?$/);
  return { index: m.index, 1: (sign ? sign[1] : '') + v };
}

/** Número de un valor de salida («12.3», «<0.01*», «>1000») sin signo ni «*», o null. */
export function labValueNumber_(v) {
  if (v == null) return null;
  var n = parseFloat(String(v).replace(/\*/g, '').replace(/^[<>]\s*/, '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

var EXTRAER_RE_ = new Map();

export function extraer(nombres, bloque) {
  if (!bloque) return '---';
  for (var i = 0; i < nombres.length; i++) {
    var regex = EXTRAER_RE_.get(nombres[i]);
    if (!regex) {
      regex = new RegExp(nombres[i] + '[^0-9-]{0,60}(-?\\d+\\.?\\d*)', 'i');
      EXTRAER_RE_.set(nombres[i], regex);
    }
    var m = bloque.match(regex);
    if (m) return m[1];
  }
  return '---';
}

/** Nombre con espacio final -> boundary real (space/tab/newline), no solo ' ' literal.
 * Paneles como GASOMETRIA suelen separar la etiqueta del valor con tab o salto de línea,
 * no con espacio; 'HCT ' literal fallaba ahí y dejaba a RetC sin Hto aunque estuviera en el mismo reporte. */
function nombreConBoundary_(nombre) {
  var esc = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return /\s$/.test(nombre) ? esc.replace(/\s+$/, '\\s') : esc;
}

/** True si el "valor" detectado es en realidad el mínimo del rango de referencia,
 * no un resultado real (columna Resultado vacía, solo '*' — muestra hemolizada/rechazada). */
export function esValorDelRango_(mValor, mRango) {
  return !!mRango && mValor.index === mRango.index;
}

export function extraerConRango(nombres, texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var m = t.match(new RegExp(nombreConBoundary_(nombre)));
    var idx = m ? m.index : -1;
    if (idx === -1) continue;
    // Start AFTER the test name to avoid matching digits within it
    var start = idx + nombre.length;
    var sub = texto.substring(start, start + 220);
    var mValor = matchValorLab_(sub);
    if (!mValor) continue;
    var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (esValorDelRango_(mValor, mRango)) continue;
    var valorStr = mValor[1];
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

/** True si «CREATININA» es en realidad el título/fila «DEPURACION DE CREATININA» (orina de 24h, no sérica). */
function esDepuracionCreatinina_(texto, idxNombre) {
  var before = texto.substring(Math.max(0, idxNombre - 16), idxNombre).toUpperCase();
  return /DEPURACION\s+DE\s*$/.test(before);
}

var MARCAS_ORINA_ = ['URIANALISIS', 'EXAMEN GENERAL DE ORINA', 'ANALISIS DE ORINA'];

/** Posiciones [inicio, fin) de los encabezados de orina en `t` (texto en mayúsculas), una vez por llamada. */
function marcasOrina_(t) {
  var out = [];
  for (var k = 0; k < MARCAS_ORINA_.length; k++) {
    var m = MARCAS_ORINA_[k], p = t.indexOf(m);
    while (p !== -1) { out.push([p, p + m.length]); p = t.indexOf(m, p + 1); }
  }
  return out;
}

/** True si la etiqueta pertenece a EGO/sedimento urinario (no biometría hemática).
 * `t`/`marcas`: texto en mayúsculas y marcasOrina_(t), precalculados por el llamador. */
function esContextoSedimentoOrina_(texto, idxNombre, nombreLen, t, marcas) {
  var w = texto.substring(idxNombre, Math.min(texto.length, idxNombre + nombreLen + 120));
  if (/\/CAMPO\b/i.test(w)) return true;
  if (/Leucocitos\/uL|Hem\/uL|E\.U\.\/dL/i.test(w)) return true;
  var ini = Math.max(0, idxNombre - 4500);
  var lastOrina = -1, hay = false;
  for (var k = 0; k < marcas.length; k++) {
    if (marcas[k][0] >= ini && marcas[k][1] <= idxNombre) {
      hay = true;
      if (marcas[k][0] > lastOrina) lastOrina = marcas[k][0];
    }
  }
  if (!hay) return false;
  return !/BIOMETRIA\s+HEMATICA|\bHGB\b|\bWBC\b|\bRBC\s+\d|\bPLT\s+\d/i.test(t.substring(lastOrina, idxNombre));
}

/**
 * Igual que extraerConRango pero ignora ERITROCITOS/LEUCOCITOS del sedimento urinario.
 */
export function extraerConRangoBH(nombres, texto) {
  if (!texto) return { valor: '---', min: null, max: null };
  var t = texto.toUpperCase();
  var marcas = marcasOrina_(t);
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoSedimentoOrina_(texto, idx, nombre.length, t, marcas)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = matchValorLab_(sub);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (esValorDelRango_(mValor, mRango)) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
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

/** True si esta ocurrencia de `nombre` en `idx` debe ignorarse para
 * extracción sérica: contexto urinario, fracción de colesterol (HDL/LDL),
 * depuración de creatinina de 24h o HbA1c. */
function esOcurrenciaExcluidaSuero_(texto, idx, nombre) {
  if (esContextoUrinario_(texto, idx, nombre.length)) return true;
  // «COLESTEROL» solo = total; no tomar COLESTEROL HDL / LDL.
  if (nombre === 'COLESTEROL' && esFraccionColesterol_(texto, idx, nombre.length)) return true;
  // «CREATININA» dentro de «DEPURACION DE CREATININA» es de una recolección
  // de 24h, no sérica — no tomar el primer número que siga (es de otra fila).
  if (nombre === 'CREATININA' && esDepuracionCreatinina_(texto, idx)) return true;
  // «HEMOGLOBINA GLICOSILADA» es HbA1c (%), no la Hb de la BH.
  if (nombre === 'HEMOGLOBINA' && /^\s*GLICOSILADA/i.test(texto.substring(idx + nombre.length, idx + nombre.length + 16))) return true;
  return false;
}

/** Extrae {valor,min,max} desde `subStart`, o null si no hay valor numérico
 * ahí, o si el "valor" es en realidad el mínimo del rango de referencia. */
function extraerValorRangoTrasIndice_(texto, subStart) {
  var sub = texto.substring(subStart, subStart + 220);
  var mValor = matchValorLab_(sub);
  if (!mValor) return null;
  var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
  if (esValorDelRango_(mValor, mRango)) return null;
  var valorStr = mValor[1];
  if (!mRango) return { valor: valorStr, min: null, max: null };
  return {
    valor: valorStr,
    min: parseFloat(mRango[1].replace(',', '.')),
    max: parseFloat(mRango[2].replace(',', '.')),
  };
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
      if (esOcurrenciaExcluidaSuero_(texto, idx, nombre)) {
        start = idx + nombre.length;
        continue;
      }
      var resultado = extraerValorRangoTrasIndice_(texto, idx + nombre.length);
      if (!resultado) {
        start = idx + nombre.length;
        continue;
      }
      return resultado;
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
      var mValor = matchValorLab_(sub);
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
  // Membrete SOME (Campo/Labo + id) no es resultado de coagulación
  clean = clean.replace(/\b(?:Campo|Labo)\s*-?\d+/gi, ' ');
  var mRango = clean.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
  var min = mRango ? parseFloat(mRango[1].replace(',', '.')) : null;
  var max = mRango ? parseFloat(mRango[2].replace(',', '.')) : null;
  var rangoIdx = mRango ? clean.search(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/) : -1;
  // Solo números ANTES del rango = resultado. Si falta el resultado, no usar el mín. del rango.
  var beforeRango = rangoIdx >= 0 ? clean.substring(0, rangoIdx) : clean;
  var mValor = matchValorLab_(beforeRango);
  if (!mValor) return null;
  return { valor: mValor[1], min: min, max: max };
}

function isFibrinogenoNombre_(nombre) {
  return /^FIBRIN[OÓ]GENO$/.test(String(nombre || ''));
}

function isUefFibrinogenoMatch_(tUpper, idx) {
  var before = tUpper.substring(Math.max(0, idx - 48), idx);
  if (/\bUEF\b/.test(before)) return true;
  return /EQUIVALENTES\s+DE\s*$/i.test(before.trimEnd());
}

function shouldSkipCoagMatch_(tUpper, nombre, idx) {
  if (nombre === 'TIEMPO DE PROTROMBINA' && isCoagPanelTitleAfter_(tUpper, idx, nombre.length)) {
    return true;
  }
  if (isFibrinogenoNombre_(nombre) && isUefFibrinogenoMatch_(tUpper, idx)) {
    return true;
  }
  if (nombre !== 'INR') return false;
  var before = tUpper.charAt(idx - 1) || ' ';
  var afterCh = tUpper.charAt(idx + 3) || ' ';
  return /[A-Z0-9]/.test(before) || /[A-Z0-9]/.test(afterCh);
}

function isImplausibleInr_(valorStr, maxInr) {
  var inrN = labValueNumber_(valorStr);
  return inrN != null && inrN > maxInr;
}

/** Fibrinógeno >2000 mg/dL suele ser id de membrete SOME, no resultado clínico. */
function isImplausibleFib_(valorStr) {
  var fibN = labValueNumber_(valorStr);
  return fibN == null || fibN < 10 || fibN > 2000;
}

function tryParseCoagAt_(texto, tUpper, nombre, idx, maxInr) {
  if (shouldSkipCoagMatch_(tUpper, nombre, idx)) return null;
  var subStart = idx + nombre.length;
  var parsed = parseCoagValorRango_(texto.substring(subStart, coagWindowEnd_(tUpper, subStart, nombre)));
  if (!parsed) return null;
  if (nombre === 'INR' && isImplausibleInr_(parsed.valor, maxInr)) return null;
  if (isFibrinogenoNombre_(nombre) && isImplausibleFib_(parsed.valor)) return null;
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
    var mValor = matchValorLab_(stripped);
    if (!mValor) continue;
    var mRango = stripped.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (esValorDelRango_(mValor, mRango)) continue;
    var valorStr = mValor[1];
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
  var v = labValueNumber_(valorStr);
  if (v == null || min == null || max == null) return valorStr;
  return (v < min || v > max) ? valorStr + '*' : valorStr;
}

export function fmt(val) {
  if (!val || val === '---') return val;
  var star = val.endsWith('*');
  var body = star ? val.slice(0, -1) : val;
  var sign = /^[<>]/.test(body) ? body[0] : '';
  var n = parseFloat(body.slice(sign.length).replace(',', '.'));
  if (isNaN(n)) return val;
  return sign + String(n) + (star ? '*' : '');
}

/**
 * Marca valor con rango del reporte, o priorRefs, o DEFAULT_LAB_REFS / defaults.
 * @param {{ valor: string, min?: number|null, max?: number|null }} data
 * @param {string} fieldKey
 * @param {{ [field: string]: [number, number] }|null|undefined} [priorRefs]
 * @param {{ [field: string]: [number, number] }|null|undefined} [defaults]
 */
export function fmtLabRanged_(data, fieldKey, priorRefs, defaults) {
  if (!data || data.valor === '---' || data.valor == null) return data ? data.valor : '---';
  var range = resolveLabFieldRange_(data, fieldKey, priorRefs, defaults);
  if (!range) return fmt(data.valor);
  return fmt(marcarSegunRango(data.valor, range[0], range[1]));
}

/** Número para cálculos derivados (eTFG, BUN/Cr, AG…). «<x»/«>x» → null: sin valor exacto no se deriva. */
export function toNum_(v) {
  if (v === '---' || v == null) return null;
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}
