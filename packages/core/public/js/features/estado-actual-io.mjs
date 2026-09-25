/**
 * Ingresos/egresos/evacuaciones — parseo, balance (suma de salidas numéricas) y texto SOAP.
 */

/**
 * Texto visible al usuario (vista previa, SOAP, balance en vivo): siempre mayúsculas.
 * @param {unknown} raw
 * @returns {string}
 */
export function toEaSalidaText(raw) {
  if (raw == null || raw === '') return '';
  return String(raw).toUpperCase();
}

/**
 * @param {number} bal
 * @returns {string}
 */
export function formatBalanceLive(bal) {
  if (!Number.isFinite(bal)) return '—';
  return (bal > 0 ? '+' : '') + bal + ' CC';
}

/**
 * @param {unknown} io
 * @returns {boolean}
 */
export function hasIoEgressDeclared(io) {
  if (!io || typeof io !== 'object') return false;
  /** @type {any} */
  var o = io;
  if (Array.isArray(o.egrParts) && o.egrParts.length) return true;
  return o.egr != null && String(o.egr).trim() !== '';
}

/**
 * @param {unknown} io
 * @returns {boolean}
 */
export function isIoIngresoNc(io) {
  if (!io || typeof io !== 'object') return false;
  /** @type {any} */
  var o = io;
  return o.ing === 'NC' || String(o.ing || '').toUpperCase() === 'NC';
}

/**
 * Egresos declarados sin total numérico (p. ej. solo DIURESIS NC), o ingresos NC.
 * @param {unknown} io
 * @returns {boolean}
 */
export function isIoBalanceNc(io) {
  if (isIoIngresoNc(io)) return true;
  return hasIoEgressDeclared(io) && ioNumericEgressTotal(io) == null;
}

/**
 * @param {unknown} ing
 * @param {unknown} io
 * @returns {string}
 */
export function formatIoBalanceDisplay(ing, io) {
  io = io || {};
  if (isIoIngresoNc(io) || ing === 'NC' || String(ing || '').toUpperCase() === 'NC') return 'NC';
  var bal = computeIoBalanceFromIngEgr(ing, io);
  if (Number.isFinite(bal)) return formatBalanceLive(bal);
  if (isIoBalanceNc(io)) return 'NC';
  return '—';
}

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseIoIngresoField(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  if (/^nc$/i.test(s) || /no\s+cuantificad/i.test(s)) return 'NC';
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  return parseIoNumber(s);
}

export function parseIoNumber(raw) {
  if (raw == null) return null;
  var s = String(raw).trim().replace(/\s/g, '').replace(/,/g, '');
  if (!s) return null;
  var n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Suma los valores de turno (T1..Tn) que son número, ignorando NC/vacíos.
 * @param {Array<unknown>} turnoValues
 * @returns {{ sum: number, count: number }}
 */
export function sumIoTurnos(turnoValues) {
  var sum = 0;
  var count = 0;
  for (var i = 0; i < turnoValues.length; i++) {
    if (isIoNumericValue(turnoValues[i])) {
      sum += Number(turnoValues[i]);
      count++;
    }
  }
  return { sum: sum, count: count };
}

/**
 * @param {{ sum: number, count: number }} totals
 * @returns {number | 'NC'} valor a guardar como io.ing/io.egr — NC cuando ningún turno se cuantificó
 */
export function ioTurnoAggregate(totals) {
  return totals && totals.count > 0 ? totals.sum : 'NC';
}

/**
 * Texto «700 CC (2T)» o «NC» para el total en vivo de un grupo de turnos.
 * @param {{ sum: number, count: number }} totals
 * @returns {string}
 */
export function formatIoTurnoTotal(totals) {
  if (!totals || totals.count === 0) return 'NC';
  return totals.sum + ' CC (' + totals.count + 'T)';
}

/**
 * Total numérico de egresos de un turno (todas sus partes), o 'NC' si no hay ninguna cuantificada.
 * @param {IoEgresoPart[]} parts
 * @returns {number | 'NC'}
 */
export function ioTurnoEgresoValue(parts) {
  if (!Array.isArray(parts) || !parts.length) return 'NC';
  var sum = 0;
  var any = false;
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] && isIoNumericValue(parts[i].value)) {
      sum += Number(parts[i].value);
      any = true;
    }
  }
  return any ? sum : 'NC';
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isIoNumericValue(v) {
  if (v == null || v === '') return false;
  if (v === 'NC' || String(v).toUpperCase() === 'NC') return false;
  var n = Number(v);
  return Number.isFinite(n);
}

/**
 * @param {unknown} raw
 * @returns {number | string | null}
 */
/**
 * @param {unknown} val
 * @returns {number | string | null}
 */
export function normalizeEvacAbbrev(val) {
  if (val == null || val === '') return val;
  var s = String(val).trim();
  if (/^nc$/i.test(s)) return 'NC';
  if (/no\s+reportad|sin\s+evacuacion|sin\s+evac\b|no\s+hubo\s+evac/i.test(s)) return 'NC';
  return val;
}

/**
 * Evacuaciones por turno → un solo valor del día: suma si todas son números,
 * NC si todas son NC, si no las lista («2, LÍQUIDAS»). null si no hay datos.
 * @param {unknown[]} raw
 * @returns {number | string | null}
 */
export function evacFromTurnos(raw) {
  var vals = (Array.isArray(raw) ? raw : []).map(parseIoEvacField).filter(function (v) { return v != null; });
  if (!vals.length) return null;
  if (vals.every(function (v) { return v === 'NC'; })) return 'NC';
  var nums = vals.filter(isIoNumericValue);
  if (nums.length === vals.length) return nums.reduce(function (a, v) { return a + Number(v); }, 0);
  return vals.filter(function (v) { return v !== 'NC'; }).map(formatEvacForText).join(', ');
}

export function parseIoEvacField(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  var abbrev = normalizeEvacAbbrev(s);
  if (abbrev === 'NC') return 'NC';
  if (/sin\s+evacuaciones/i.test(s)) return toEaSalidaText(s);
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  var n2 = parseIoNumber(s);
  if (n2 != null) return n2;
  return s.toUpperCase();
}

/**
 * NC o «no cuantificada» → siempre «NC» en datos y salida.
 * @param {unknown} val
 * @returns {unknown}
 */
export function normalizeIoNcAbbrev(val) {
  if (val == null || val === '') return val;
  if (val === 'NC' || String(val).toUpperCase() === 'NC') return 'NC';
  if (typeof val === 'string' && /no\s+cuantificad/i.test(val)) return 'NC';
  return val;
}

/**
 * @param {string} seg
 * @returns {number | string}
 */
function parseSegmentValue(seg) {
  var s = String(seg || '').trim();
  if (/^nc$/i.test(s)) return 'NC';
  if (/no\s+cuantificad/i.test(s)) return 'NC';
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  var n2 = parseIoNumber(s);
  if (n2 != null) return n2;
  return s.toUpperCase();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function splitIoSegments(text) {
  var s = String(text || '').trim();
  if (!s) return [];
  var tokens = [];
  var buf = '';
  var depth = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (ch === '(') {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      buf += ch;
      continue;
    }
    if ((ch === ',' || ch === ';') && depth === 0) {
      if (buf.trim()) tokens.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) tokens.push(buf.trim());
  return tokens;
}

/**
 * @typedef {{ kind: 'diuresis' | 'drain' | 'gastrostomy' | 'nephro' | 'ultrafiltrado' | 'thoracentesis' | 'custom', label: string, value: number | string }} IoEgresoPart
 */

/**
 * Fuentes cuantificables seleccionables como fila suelta (fuera de T1/T2/T3) en
 * el registro de estado actual — p. ej. ultrafiltrado de una hemodiálisis
 * pasada, un drenaje o una toracocentesis del día.
 * @type {Array<{ kind: 'ultrafiltrado' | 'drain' | 'thoracentesis', label: string }>}
 */
export var IO_EXTRA_SOURCE_KINDS = [
  { kind: 'ultrafiltrado', label: 'ULTRAFILTRADO' },
  { kind: 'drain', label: 'DRENAJE' },
  { kind: 'thoracentesis', label: 'TORACOCENTESIS' },
];

/** @returns {IoEgresoPart} */
function ncDiuresisPart() {
  return { kind: 'diuresis', label: 'DIURESIS', value: 'NC' };
}

/** @param {string} s @returns {IoEgresoPart} */
function classifyDiuresisSegment(s) {
  var rest = s.replace(/^(?:DIURESIS|ORINA)\s*/i, '').trim();
  var value =
    !rest || /no\s+cuantificad/i.test(rest) ? (rest ? parseSegmentValue(rest) : 'NC') : parseSegmentValue(rest);
  return { kind: 'diuresis', label: 'DIURESIS', value: value };
}

/** @param {string} s @returns {IoEgresoPart} */
function classifyDrainSegment(s) {
  var dRest = s.replace(/^DRENAJ(?:E|ES)?\s*/i, '').trim();
  return { kind: 'drain', label: 'DRENAJE', value: parseSegmentValue(dRest || s) };
}

/** @param {string} s @returns {IoEgresoPart} */
function classifyUltrafiltradoSegment(s) {
  var rest = s.replace(/^(?:ULTRAFILTRAD[OA]|ULTRAFILTRACI[OÓ]N|UF)\s*/i, '').trim();
  return { kind: 'ultrafiltrado', label: 'ULTRAFILTRADO', value: parseSegmentValue(rest || s) };
}

/** @param {string} s @returns {IoEgresoPart} */
function classifyGastrostomySegment(s) {
  var gRest = s.replace(/^GASTROSTOM(?:ÍA|IA)?\s*/i, '').trim();
  return { kind: 'gastrostomy', label: 'GASTROSTOMÍA', value: parseSegmentValue(gRest || s) };
}

/** @param {string} s @param {string} u @returns {IoEgresoPart} */
function classifyNephroSegment(s, u) {
  var side = '';
  if (/IZQ|IZQUIERDA/i.test(u)) side = 'IZQUIERDA';
  else if (/\bDER\b|DERECHA/i.test(u)) side = 'DERECHA';
  var nRest = s.replace(/^NEFRO(?:STOM(?:ÍA|IA))?/i, '').trim();
  nRest = nRest.replace(/\b(IZQ|IZQUIERDA|DER|DERECHA)\b/gi, '').trim();
  var label = side ? 'NEFROSTOMÍA ' + side : 'NEFROSTOMÍA';
  return { kind: 'nephro', label: label, value: parseSegmentValue(nRest || s) };
}

/** @param {string} s @param {string} u @returns {IoEgresoPart} */
function classifyFallbackDiuresisSegment(s, u) {
  var n = parseIoNumber(s);
  if (n != null) return { kind: 'diuresis', label: 'DIURESIS', value: n };
  if (/no\s+cuantificad/i.test(s)) return ncDiuresisPart();
  return { kind: 'diuresis', label: 'DIURESIS', value: u };
}

/**
 * @param {string} seg
 * @returns {IoEgresoPart}
 */
function classifyEgresoSegment(seg) {
  var s = String(seg || '').trim();
  var u = s.toUpperCase();
  if (/^NC$/i.test(s) || /^no\s+cuantificad/i.test(s)) return ncDiuresisPart();
  if (/^DIURESIS\b/i.test(s) || /^ORINA\b/i.test(s)) return classifyDiuresisSegment(s);
  if (/^(?:ULTRAFILTRAD[OA]|ULTRAFILTRACI[OÓ]N)\b/i.test(s) || /^UF\b/i.test(s)) {
    return classifyUltrafiltradoSegment(s);
  }
  if (/DRENAJ/i.test(u)) return classifyDrainSegment(s);
  if (/GASTROSTOM/i.test(u)) return classifyGastrostomySegment(s);
  if (/NEFRO/i.test(u)) return classifyNephroSegment(s, u);
  return classifyFallbackDiuresisSegment(s, u);
}

/**
 * @param {unknown} raw
 * @returns {IoEgresoPart[]}
 */
export function parseIoEgresoLine(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return [];
  var segments = splitIoSegments(s);
  if (!segments.length) segments = [s];
  return segments.map(classifyEgresoSegment);
}

/**
 * @param {IoEgresoPart[]} parts
 * @returns {number | string | null}
 */
export function diuresisValueFromParts(parts) {
  if (!Array.isArray(parts)) return null;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p && p.kind === 'diuresis') return p.value;
  }
  return null;
}

/**
 * @param {IoEgresoPart[]} parts
 * @returns {number}
 */
export function sumNumericEgressFromParts(parts) {
  if (!Array.isArray(parts)) return 0;
  var sum = 0;
  var any = false;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (!p) continue;
    if (isIoNumericValue(p.value)) {
      sum += Number(p.value);
      any = true;
    }
  }
  return any ? sum : 0;
}

/**
 * @param {unknown} io
 * @returns {number | null} Total cc de egresos numéricos (diuresis + drenajes + gastrostomía + nefros + ultrafiltrado)
 */
export function ioNumericEgressTotal(io) {
  if (!io || typeof io !== 'object') return null;
  /** @type {any} */
  var o = io;
  if (Array.isArray(o.egrParts) && o.egrParts.length) {
    var sum = sumNumericEgressFromParts(o.egrParts);
    return sum > 0 ? sum : null;
  }
  if (isIoNumericValue(o.egr)) return Number(o.egr);
  return null;
}

/**
 * @param {unknown} io
 * @returns {number | string | null} Solo diuresis (legacy / campo egr)
 */
export function ioDiuresisForBalance(io) {
  if (!io || typeof io !== 'object') return null;
  /** @type {any} */
  var o = io;
  if (Array.isArray(o.egrParts) && o.egrParts.length) {
    return diuresisValueFromParts(o.egrParts);
  }
  return o.egr != null && o.egr !== '' ? o.egr : null;
}

/**
 * @param {unknown} ing
 * @param {unknown} io
 * @returns {number}
 */
export function computeIoBalanceFromIngEgr(ing, io) {
  if (!isIoNumericValue(ing)) return NaN;
  var egrTotal = ioNumericEgressTotal(io);
  if (egrTotal == null) return NaN;
  return Number(ing) - egrTotal;
}

/**
 * @param {IoEgresoPart} part
 * @returns {string}
 */
export function formatEgresoPartForText(part) {
  if (!part) return '';
  var val = normalizeIoNcAbbrev(part.value);
  var valStr =
    val === 'NC'
      ? 'NC'
      : isIoNumericValue(val)
        ? String(val) + ' CC'
        : String(val).toUpperCase();
  return part.label.toUpperCase() + ' ' + valStr;
}

/**
 * Turnos de diuresis colapsados a una sola cláusula: si todos los turnos
 * vienen NC se muestra una sola vez "DIURESIS NC"; si hay turnos
 * cuantificados, se suman (los turnos NC restantes no se listan aparte). El
 * resto de egresos (drenajes, gastrostomía, etc.) se formatea sin cambios.
 * @param {IoEgresoPart[]} parts
 * @param {{ showTurnCount?: boolean }} [opts] `showTurnCount` (por defecto true)
 *   anota "(suma, NT)" para el texto de Estado Actual; en false muestra solo
 *   el total ("DIURESIS suma CC"), como en la tarjeta de Egresos.
 * @returns {string[]}
 */
/** @param {IoEgresoPart[]} parts */
function collectDiuresisParts(parts) {
  var firstDiuresisIdx = -1;
  var diuresisParts = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] && parts[i].kind === 'diuresis') {
      if (firstDiuresisIdx === -1) firstDiuresisIdx = i;
      diuresisParts.push(parts[i]);
    }
  }
  return { firstDiuresisIdx: firstDiuresisIdx, diuresisParts: diuresisParts };
}

/**
 * @param {IoEgresoPart[]} diuresisParts
 * @param {boolean} showTurnCount
 * @returns {string | null}
 */
function buildDiuresisClauseText(diuresisParts, showTurnCount) {
  if (diuresisParts.length <= 1) return null;
  var quantified = diuresisParts.filter(function (p) {
    return isIoNumericValue(p.value);
  });
  if (!quantified.length) return 'DIURESIS NC';
  var sum = quantified.reduce(function (acc, p) {
    return acc + Number(p.value);
  }, 0);
  return showTurnCount
    ? 'DIURESIS (' + sum + ', ' + quantified.length + 'T)'
    : formatEgresoPartForText({ kind: 'diuresis', label: 'DIURESIS', value: sum });
}

export function formatEgresoPartsForText(parts, opts) {
  var showTurnCount = !opts || opts.showTurnCount !== false;
  var collected = collectDiuresisParts(parts);
  var firstDiuresisIdx = collected.firstDiuresisIdx;
  var diuresisClause = buildDiuresisClauseText(collected.diuresisParts, showTurnCount);
  var out = [];
  for (var j = 0; j < parts.length; j++) {
    var p = parts[j];
    if (p && p.kind === 'diuresis' && diuresisClause != null) {
      if (j === firstDiuresisIdx) out.push(diuresisClause);
      continue;
    }
    out.push(formatEgresoPartForText(p));
  }
  return out;
}

/**
 * @param {IoEgresoPart[]} parts
 * @returns {string}
 */
export function serializeEgrPartsToFormText(parts) {
  if (!Array.isArray(parts) || !parts.length) return '';
  return parts.map(formatEgresoPartForText).join(', ');
}

/**
 * @param {unknown} egrLegacy
 * @returns {IoEgresoPart[]}
 */
export function legacyEgrToParts(egrLegacy) {
  if (egrLegacy == null || egrLegacy === '') return [];
  return parseIoEgresoLine(String(egrLegacy));
}

/**
 * @param {unknown} evac
 * @returns {string}
 */
export function formatEvacForText(evac) {
  if (evac == null || evac === '') return '___';
  var norm = normalizeEvacAbbrev(evac);
  if (norm === 'NC' || String(norm).toUpperCase() === 'NC') return 'NC';
  if (isIoNumericValue(evac)) return String(evac);
  return String(evac).toUpperCase();
}

/** @param {string[]} clauses @param {unknown} egr */
function appendLegacyEgrClause(clauses, egr) {
  var egrNorm = normalizeIoNcAbbrev(egr);
  if (isIoNumericValue(egrNorm)) clauses.push('DIURESIS ' + String(egrNorm) + ' CC');
  else if (egrNorm === 'NC') clauses.push('DIURESIS NC');
  else clauses.push(String(egrNorm).toUpperCase());
}

/** @param {string[]} clauses @param {{ egr?: unknown, egrParts?: IoEgresoPart[] }} io */
function appendEgressClauses(clauses, io) {
  var parts = Array.isArray(io.egrParts) && io.egrParts.length ? io.egrParts : legacyEgrToParts(io.egr);
  if (parts.length) {
    Array.prototype.push.apply(clauses, formatEgresoPartsForText(parts));
    return;
  }
  if (io.egr != null && io.egr !== '') appendLegacyEgrClause(clauses, io.egr);
  else clauses.push('DIURESIS ___');
}

/** @param {{ ing?: unknown, egr?: unknown, egrParts?: IoEgresoPart[] }} io @param {unknown} balanceTurno */
function resolveSoapBalanceNum(io, balanceTurno) {
  if (balanceTurno != null && balanceTurno !== '' && Number.isFinite(Number(balanceTurno))) {
    return Number(balanceTurno);
  }
  var fromIo = computeIoBalanceFromIngEgr(io.ing, io);
  return Number.isFinite(fromIo) ? fromIo : NaN;
}

/**
 * @param {{ ing?: unknown, egr?: unknown, egrParts?: IoEgresoPart[], evac?: unknown }} io
 * @param {unknown} balanceTurno
 * @returns {string}
 */
/**
 * @param {string[]} clauses
 * @param {{ turnos?: { eventos?: unknown[] } }} io
 */
function withIoTurnoEvents(clauses, io) {
  var evs = io.turnos && Array.isArray(io.turnos.eventos) ? io.turnos.eventos : [];
  // UF already written as its own source: the HD event doesn't repeat it.
  var ufs = (Array.isArray(io.egrParts) ? io.egrParts : [])
    .filter(function (p) { return p && p.kind === 'ultrafiltrado' && isIoNumericValue(p.value); })
    .map(function (p) { return Number(p.value); });
  var texts = evs
    .map(function (ev) {
      var dupUf = ev && ev.kind === 'hemodialisis' && ufs.indexOf(parseIoNumber(ev.ml)) >= 0;
      return formatIoTurnoEvent(dupUf ? Object.assign({}, ev, { ml: '' }) : ev);
    })
    .filter(Boolean);
  if (texts.length) clauses.push('EVENTOS: ' + texts.join('; '));
  return clauses.join(', ');
}

export function formatIoClauseForSoap(io, balanceTurno) {
  io = io || {};
  if (isIoIngresoNc(io)) {
    var ncClauses = ['INGRESOS NC', 'DIURESIS NC'];
    if (io.evac != null && io.evac !== '') ncClauses.push('EVACUACIONES ' + formatEvacForText(io.evac));
    ncClauses.push('BALANCE NC');
    return withIoTurnoEvents(ncClauses, io);
  }
  var clauses = ['INGRESOS ' + (io.ing != null && io.ing !== '' ? String(io.ing) : '___') + ' CC'];
  appendEgressClauses(clauses, io);
  if (io.evac != null && io.evac !== '') clauses.push('EVACUACIONES ' + formatEvacForText(io.evac));
  if (isIoBalanceNc(io)) {
    clauses.push('BALANCE NC');
    return withIoTurnoEvents(clauses, io);
  }
  var balNum = resolveSoapBalanceNum(io, balanceTurno);
  var balance = Number.isFinite(balNum) ? (balNum > 0 ? '+' : '') + balNum : '___';
  clauses.push('BALANCE ' + balance + ' CC');
  return withIoTurnoEvents(clauses, io);
}

/**
 * Eventos que explican o cambian un turno del balance. `nc`: el turno suele
 * quedar sin cuantificar (se marca NC si está vacío). Solo anotan: los volúmenes
 * que cuentan para el balance se capturan en los turnos o en «Otras fuentes».
 * @type {Array<{ kind: string, label: string, nc?: boolean, detail?: string, ml?: string }>}
 */
export var IO_TURNO_EVENT_KINDS = [
  { kind: 'hemodialisis', label: 'HEMODIÁLISIS', short: 'HD', nc: true, ml: 'UF mL' },
  { kind: 'furosemida', label: 'RETO DE FUROSEMIDA', short: 'Furosemida', detail: 'Dosis mg', ml: 'mL en 2 h' },
  { kind: 'fuera', label: 'FUERA DEL SERVICIO', short: 'Fuera', nc: true, detail: 'Estudio, quirófano…' },
  { kind: 'perdidas', label: 'PÉRDIDAS NO CUANTIFICADAS', short: 'Pérdidas', nc: true, detail: 'Vómito, diarrea, micción espontánea…' },
  { kind: 'carga', label: 'CARGA DE VOLUMEN', short: 'Carga', detail: 'Solución', ml: 'mL' },
  { kind: 'transfusion', label: 'TRANSFUSIÓN', short: 'Transfusión', detail: 'Hemoderivado', ml: 'mL' },
  { kind: 'otro', label: 'OTRO', short: 'Otro', detail: 'Qué pasó' },
];

/** Umbral del reto de furosemida (Chawla 2013): < 200 mL en 2 h predice progresión de la LRA. */
export var FUROSEMIDA_RETO_UMBRAL_ML = 200;

/**
 * @param {{ turno?: string, kind?: string, detail?: string, ml?: unknown } | null | undefined} ev
 * @returns {string} p. ej. «T2 HEMODIÁLISIS, UF 2000 ML»
 */
export function formatIoTurnoEvent(ev) {
  if (!ev || typeof ev !== 'object') return '';
  var meta = IO_TURNO_EVENT_KINDS.find(function (k) { return k.kind === ev.kind; });
  if (!meta) return '';
  var turno = ev.turno ? String(ev.turno).toUpperCase() + ' ' : '';
  var detail = ev.detail != null && String(ev.detail).trim() ? String(ev.detail).trim().toUpperCase() : '';
  var ml = parseIoNumber(ev.ml);
  if (meta.kind === 'furosemida') {
    var dose = detail ? ' ' + (/^\d+([.,]\d+)?$/.test(detail) ? detail + ' MG' : detail) : '';
    if (ml == null) return turno + meta.label + dose + ', URESIS 2 H PENDIENTE';
    var verdict = ml >= FUROSEMIDA_RETO_UMBRAL_ML ? 'RESPONDEDOR' : 'NO RESPONDEDOR';
    return turno + meta.label + dose + ' → ' + ml + ' ML/2 H (' + verdict + ')';
  }
  var out = turno + meta.label + (detail ? ' ' + detail : '');
  if (ml != null) out += ', ' + (meta.kind === 'hemodialisis' ? 'UF ' : '') + ml + ' ML';
  return out;
}

/**
 * Ingresos, egresos y balance de cada turno de un registro, con sus eventos.
 * @param {{ ingTurnos?: unknown[], egrTurnos?: unknown[], eventos?: Array<{ turno?: string }> } | null | undefined} turnos
 * @returns {Array<{ turno: string, ing: number | 'NC' | null, egr: number | 'NC' | null, bal: number | 'NC' | null, eventos: string[] }>}
 */
export function ioTurnosBreakdown(turnos) {
  var t = turnos || {};
  var ingT = Array.isArray(t.ingTurnos) ? t.ingTurnos : [];
  var egrT = Array.isArray(t.egrTurnos) ? t.egrTurnos : [];
  var evs = Array.isArray(t.eventos) ? t.eventos : [];
  return ['t1', 't2', 't3'].map(function (id, i) {
    var ingRaw = ingT[i] != null ? String(ingT[i]).trim() : '';
    var egrRaw = egrT[i] != null ? String(egrT[i]).trim() : '';
    var ing = ingRaw ? parseIoIngresoField(ingRaw) : null;
    var egr = egrRaw ? ioTurnoEgresoValue(parseIoEgresoLine(egrRaw)) : null;
    var bal =
      isIoNumericValue(ing) && isIoNumericValue(egr)
        ? Number(ing) - Number(egr)
        : ing === 'NC' || egr === 'NC'
          ? 'NC'
          : null;
    return {
      turno: id.toUpperCase(),
      ing: ing,
      egr: egr,
      bal: bal,
      eventos: evs
        .filter(function (ev) { return ev && ev.turno === id; })
        .map(function (ev) { return formatIoTurnoEvent(Object.assign({}, ev, { turno: '' })); })
        .filter(Boolean),
    };
  });
}
