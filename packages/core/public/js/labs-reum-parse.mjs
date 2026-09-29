/**
 * Reportes del Laboratorio Clínico para Reumatología (PDF → texto copiado).
 * Layout distinto a SOME: un estudio por bloque, resultado en la misma línea.
 * Emite líneas «SECCION\tClave valor …» como el resto de paneles extendidos:
 *   INM  C3 C4 · ANA  ANA dsDNA · ENA  SSA SSB Sm · APL  B2GP* aCL* · TB  Quantiferón
 */

function num_(s) {
  return parseFloat(String(s).replace(',', '.'));
}

/** Valor con «<»/«>» opcional; * si queda fuera de [min, max]. */
function flagNum_(op, raw, min, max) {
  var v = num_(raw);
  var out = (op || '') + raw;
  if (min == null || max == null || isNaN(v)) return out;
  var low = op === '<' ? v <= min : op === '' && v < min;
  var high = op === '>' ? v >= max : op === '' && v > max;
  return low || high ? out + '*' : out;
}

/** Con valor: «<2.0» / «>200.0*» (el * marca lo anormal). Sin valor: neg / pos*. */
function qualTok_(key, qual, raw) {
  var pos = /^POS/i.test(qual);
  var val = raw ? raw.replace(/\s+/g, '') : '';
  return key + ' ' + (val ? val + (pos ? '*' : '') : pos ? 'pos*' : 'neg');
}

var NUM_ = '\\d+(?:[.,]\\d+)?';
var QUAL_RE_ = new RegExp('\\b(POSITIVO|NEGATIVO|INDETERMINADO)\\b\\s*(1\\s*:\\s*\\d+|[<>]?\\s*' + NUM_ + ')?', 'i');

/** Primera línea que empieza con `re` → { m, rest } (rest = lo que sigue en esa línea). */
function eachLine_(lineas, re, fn) {
  lineas.forEach(function (l) {
    var m = re.exec(l);
    if (m) fn(m, l.slice(m.index + m[0].length));
  });
}

function firstLine_(lineas, re) {
  var hit = null;
  lineas.some(function (l) {
    var m = re.exec(l);
    if (m) hit = { m: m, rest: l.slice(m.index + m[0].length) };
    return !!m;
  });
  return hit;
}

/** «Positivo >200.0», «<20.0 NEGATIVO 2.3», «<1:20 POSITIVO 1:80» → { qual, val }. */
function qualVal_(rest) {
  var q = rest.match(QUAL_RE_);
  return q ? { qual: q[1], val: (q[2] || '').replace(/\s+/g, '') } : null;
}

/** «<4.0 mg/dL … 90 180», «3.5 U IgG-FL/mL (ref. 0-12)» → token con * fuera de rango. */
function numRow_(rest) {
  var m = rest.match(new RegExp('([<>]?)\\s*(' + NUM_ + ')\\s*(?:mg\\/dL|U\\s*Ig[GMA]-FL\\/mL)(.*)$', 'i'));
  if (!m) return '';
  var refs = m[3].replace(/\[.*?\]/g, ' ').match(new RegExp(NUM_, 'g')) || [];
  return flagNum_(m[1], m[2], refs.length > 1 ? num_(refs[0]) : null, refs.length > 1 ? num_(refs[1]) : null);
}

function parseInm_(lineas) {
  var toks = [];
  ['C3', 'C4'].forEach(function (k) {
    var hit = firstLine_(lineas, new RegExp('^\\s*' + k + '\\b'));
    var v = hit && numRow_(hit.rest);
    if (v) toks.push(k + ' ' + v);
  });
  return toks.length ? 'INM\t' + toks.join(' ') : '';
}

/** Un panel por familia (ANA/dsDNA · ENA · antifosfolípidos) para que cada fila se lea sola. */
function parseAuto_(lineas) {
  var ana = [];
  var ena = [];
  var apl = [];
  var hit = firstLine_(lineas, /^\s*(AC-\d+(?:\s*,\s*AC-\d+)*)\b/i);
  var titer = hit && hit.rest.match(/1\s*:\s*(\d+)/);
  if (titer) ana.push('ANA 1:' + titer[1] + '* ICAP ' + hit.m[1].replace(/\s+/g, ''));
  [
    [ana, 'dsDNA', /^\s*Anti-dsDNA(?![-\w])/i],
    [ana, 'NcX', /^\s*Anti-dsDNA-NcX/i],
    [ena, 'SSA', /^\s*Anti-SS-A\/Ro/i],
    [ena, 'SSB', /^\s*Anti[\s-]*SS-B\/La/i],
    [ena, 'Sm', /^\s*Anti-Sm\b/i],
    [apl, 'B2GP-CIA', /^\s*B2GP1\b/i],
  ].forEach(function (p) {
    var h = firstLine_(lineas, p[2]);
    var q = h && qualVal_(h.rest);
    if (q) p[0].push(qualTok_(p[1], q.qual, q.val));
  });
  eachLine_(lineas, /^\s*[ßβB]2-?\s*Glicoprote[ií]na\s*1\s*Ig([GMA])/i, function (m, rest) {
    var q = qualVal_(rest);
    if (q) apl.push(qualTok_('B2GP-' + m[1].toUpperCase(), q.qual, q.val));
  });
  eachLine_(lineas, /^\s*Cardiolipina\s*Ig([GMA])/i, function (m, rest) {
    var v = numRow_(rest);
    if (v) apl.push('aCL-' + m[1].toUpperCase() + ' ' + v);
  });
  apl.sort(function (a, b) {
    return APL_ORDER_.indexOf(a.split(' ')[0]) - APL_ORDER_.indexOf(b.split(' ')[0]);
  });
  return [
    ana.length ? 'ANA\t' + ana.join(' ') : '',
    ena.length ? 'ENA\t' + ena.join(' ') : '',
    apl.length ? 'APL\t' + apl.join(' ') : '',
  ];
}

var APL_ORDER_ = ['B2GP-G', 'B2GP-M', 'B2GP-A', 'B2GP-CIA', 'aCL-G', 'aCL-M', 'aCL-A'];

/**
 * Quantiferón: filas «Ag-TB1 … UI/mL <0.35 0.0» (valor = último número de la fila).
 * Respaldo: texto copiado con columnas desordenadas (cada valor seguido de «UI/mL»).
 */
function parseTb_(lineas, texto) {
  var toks = [];
  [['TB1', /^\s*Ag-TB1\b/i], ['TB2', /^\s*Ag-TB2\b/i], ['Mit', /^\s*Mit[oó]geno\b/i]].forEach(function (p) {
    var h = firstLine_(lineas, p[1]);
    var nums = h && h.rest.replace(/\([^)]*\)|UI\/mL/gi, ' ').match(/[<>]?\s*\d+(?:[.,]\d+)?/g);
    if (!nums || !nums.length) return;
    var val = nums[nums.length - 1].replace(/\s+/g, '');
    var ref = nums.length > 1 && /^</.test(nums[0].trim()) ? num_(nums[0].replace(/[<\s]/g, '')) : null;
    toks.push(p[0] + ' ' + flagNum_('', val, 0, ref));
  });
  var ih = firstLine_(lineas, /^\s*Interpretaci[oó]n\b/i);
  var iq = ih && ih.rest.match(/\b(NEGATIVO|POSITIVO|INDETERMINADO)\b/i);
  if (toks.length === 3 && iq) return 'TB\t' + toks.join(' ') + ' QFT ' + qftShort_(iq[1]);
  return parseTbScrambled_(texto);
}

function qftShort_(q) {
  return /^NEG/i.test(q) ? 'neg' : /^POS/i.test(q) ? 'pos*' : 'indet*';
}

function parseTbScrambled_(texto) {
  if (!/Quantifer[oó]n|Ag-TB1/i.test(texto)) return '';
  var re = /([\d.,]+)\s*UI\/mL(?:\s*<\s*([\d.,]+))?/g;
  var vals = [];
  var last = 0;
  var m;
  while (vals.length < 3 && (m = re.exec(texto))) {
    vals.push(m);
    last = re.lastIndex;
  }
  if (vals.length < 3) return '';
  var keys = ['TB1', 'TB2', 'Mit'];
  var toks = vals.map(function (v, i) {
    return keys[i] + ' ' + flagNum_('', v[1], 0, v[2] ? num_(v[2]) : null);
  });
  var q = texto.slice(last).match(/\b(NEGATIVO|POSITIVO|INDETERMINADO)\b/i);
  if (q) toks.push('QFT ' + qftShort_(q[1]));
  return 'TB\t' + toks.join(' ');
}

/** @param {string} textoBruto @returns {string[]} */
export function parseReumatologiaPanels_(textoBruto) {
  var t = String(textoBruto || '').replace(/\u00a0/g, ' ');
  if (!/Laboratorio\s+Cl[ií]nico/i.test(t)) return [];
  var lineas = t.split(/\r?\n/);
  return [parseInm_(lineas)].concat(parseAuto_(lineas), [parseTb_(lineas, t)]).filter(Boolean);
}

var PAC_RE_ = /^[ \t]*Paciente\s*:.*\bId\s*:/im;
var MESES_ = { ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06', JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12' };
var HEADER_LINE_RE_ = /^\s*(?:Servicio\s+de\s+Reumatolog[ií]a\b|Laboratorio\s+Cl[ií]nico\s*$|Paciente\s*:|M[eé]dico\s*:|C[eé]dula\s*:)/i;

function fechaDMY_(raw) {
  var m = String(raw).match(/^(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{2,4})$/);
  if (!m) return '';
  var mon = /^\d/.test(m[2]) ? m[2].padStart(2, '0') : MESES_[m[2].toUpperCase()];
  var y = m[3].length === 2 ? '20' + m[3] : m[3];
  return mon ? m[1].padStart(2, '0') + '/' + mon + '/' + y : '';
}

/**
 * Reescribe páginas «Servicio de Reumatología» al encabezado tipo SOME
 * (Expediente/Nombre/Fecha Registro) para que paste-smart, cruce con censo y
 * fecha/hora funcionen sin tocar el resto del pipeline. Páginas del mismo
 * misma persona+fecha+hora se unen en un solo reporte. Sin encabezado → texto igual.
 * El «Id» del reporte no es el expediente: si `registroPorNombre` halla a la persona
 * en el censo por nombre, se usa su registro; si no, queda el Id.
 * @param {string} texto
 * @param {(nombre: string) => string} [registroPorNombre]
 * @returns {string}
 */
export function reumToSomeShape(texto, registroPorNombre) {
  var t = String(texto || '').replace(/\u00a0/g, ' ');
  if (!PAC_RE_.test(t)) return texto;
  var groups = [];
  var byKey = Object.create(null);
  t.split(/^(?=[ \t]*Paciente\s*:.*\bId\s*:)/im).forEach(function (chunk) {
    var p = chunk.match(/^[ \t]*Paciente\s*:\s*(.*?)\s+Id\s*:[ \t]*(\S*?)[ \t]+Edad\s*:[ \t]*([^\n\r]*)/im);
    if (!p) return;
    // Fecha y Hora por separado: en el PDF pueden venir en celdas no contiguas.
    var fm = chunk.match(/\bFecha\s*:\s*(\d{1,2}[-/][A-Za-z0-9]+[-/]\d{2,4})/i);
    var hm = chunk.match(/\bHora\s*:\s*(\d{1,2}:\d{2})/i);
    var f = hm ? [null, null, hm[1]] : null;
    var fecha = fm ? fechaDMY_(fm[1]) : '';
    var reg = (registroPorNombre && registroPorNombre(p[1])) || p[2] || 'S/N';
    var key = reg + '|' + fecha + '|' + (f ? f[2] : '');
    var body = chunk
      .split(/\r?\n/)
      .filter(function (l) {
        return !HEADER_LINE_RE_.test(l);
      })
      .join('\n')
      .trim();
    if (!byKey[key]) {
      byKey[key] = {
        head:
          'Expediente: ' + reg + '\nNombre: ' + p[1] + '\nEdad: ' + p[3].trim() + '\nLaboratorio Clínico' +
          (fecha ? '\nFecha Registro: ' + fecha + (f ? ' ' + f[2] : '') : ''),
        bodies: [],
      };
      groups.push(byKey[key]);
    }
    byKey[key].bodies.push(body);
  });
  if (!groups.length) return texto;
  return groups
    .map(function (g) {
      return g.head + '\n' + g.bodies.join('\n');
    })
    .join('\n');
}
