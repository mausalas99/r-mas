/**
 * Variantes de texto clínico para pegado de monitoreo (soporte, sufijos, alias).
 */

/** @type {readonly [RegExp, string][]} */
const SOPORTE_FROM_TAIL = [
  [/VENTILACI(?:O|Ó)N\s+MEC[AÁ]NICA(?!\s+NO)/i, 'Ventilación mecánica'],
  [/VM\s+NO\s+INVASIVA|VMNI|VNI/i, 'VMNI'],
  [/TRAQUEOSTOM[ÍI]A|\bTQT\b/i, 'Traqueostomía'],
  [/ALTO\s+FLUJO|OAF\b/i, 'Alto flujo'],
  [/MASCARILLA\s+CON\s+RESERVORIO|RESERVORIO/i, 'Mascarilla reservorio'],
  [/MASCARILLA\s+SIMPLE/i, 'Mascarilla simple'],
  [/PUNTILLAS?\s+NASALES?|C[Nn]?\s*AF/i, 'Puntillas nasales'],
  [/AIRE\s+AMBIENTE|\bAA\b/i, 'Aire ambiente'],
];

/**
 * @param {string} tail Texto después del valor de SatO2
 * @returns {string | null} Valor de select «Soporte respiratorio»
 */
export function soporteFromSatTail(tail) {
  var s = String(tail || '').trim();
  if (!s) return null;
  var u = s.toUpperCase();
  for (var i = 0; i < SOPORTE_FROM_TAIL.length; i++) {
    if (SOPORTE_FROM_TAIL[i][0].test(u)) return SOPORTE_FROM_TAIL[i][1];
  }
  return null;
}

/**
 * @param {string} line
 * @returns {{ value: number, soporteHint: string | null } | null}
 */
export function parseSatLineVariants(line) {
  var m = line.match(
    /^(?:SATURACI(?:O|Ó)N(?:\s+O2)?|SAT(?:O2)?|SPO2)\s*:?\s*([\d.,]+)\s*%?\s*(.*)$/i
  );
  if (!m) return null;
  var n = Number(String(m[1]).replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return { value: n, soporteHint: soporteFromSatTail(m[2]) };
}

/**
 * Quita sufijos habituales (LPM, MMHG, etc.) del valor capturado.
 * @param {string} raw
 * @returns {string}
 */
export function stripVitalUnitSuffix(raw) {
  return String(raw || '')
    .replace(/\s*(?:LPM|RPM|X\/MIN|\/MIN|MMHG|MM\s*HG|MG\/DL|CC|ML)\s*$/i, '')
    .trim();
}

/** Rango plausible por signo: descarta ruido como "PLT 106,000" o "GLASGOW 15". */
const VITAL_RANGE = {
  tas: [40, 300],
  tad: [20, 200],
  fc: [20, 250],
  fr: [4, 70],
  temp: [30, 44],
  sat: [50, 100],
};

/** Cada entrada: signo(s), regex narrativa, grupos → valores. Primer match del texto gana. */
const NARRATIVE_VITALS = [
  [/\b(?:TA|TENSI[OÓ]N\s+ARTERIAL)\s*(?:DE\s*)?:?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i, ['tas', 'tad']],
  [/\b(?:FC|FRECUENCIA\s+CARD[IÍ]ACA)\s*(?:DE\s*)?:?\s*(\d{2,3})\b/i, ['fc']],
  [/\b(?:FR|FRECUENCIA\s+RESPIRATORIA)\s*(?:DE\s*)?:?\s*(\d{1,2})\b/i, ['fr']],
  [
    /\b(?:SATURANDO|SATURACI[OÓ]N(?:\s+DE\s+OX[IÍ]GENO|\s+O2)?|SATO2|SPO2|SO2)\s*(?:DE\s*|AL\s*)?:?\s*(\d{2,3})\s*%/i,
    ['sat'],
  ],
  [/\b(?:TEMPERATURA|TEMP)\s*(?:DE\s*)?:?\s*(\d{2}(?:[.,]\d)?)/i, ['temp']],
  [/\bAFEBRIL\b[^.|\n\d]{0,40}(\d{2}(?:[.,]\d)?)\s*°/i, ['temp']],
];

/**
 * Lee signos vitales de un estado actual en prosa ("TA 130/80 MMHG, FC DE 111 LPM…").
 * Solo llena los signos que `skip` no marca como ya leídos.
 * @param {string} text
 * @param {(key: string) => boolean} skip
 * @returns {{ vitals: Record<string, number>, soporteHint: string | null }}
 */
export function parseNarrativeVitals(text, skip) {
  var src = String(text || '');
  /** @type {Record<string, number>} */
  var vitals = {};
  var soporteHint = null;
  NARRATIVE_VITALS.forEach(function (entry) {
    var keys = entry[1];
    if (keys.some(function (k) { return vitals[k] != null || skip(k); })) return;
    var m = src.match(entry[0]);
    if (!m) return;
    var nums = keys.map(function (_, i) { return Number(String(m[i + 1]).replace(',', '.')); });
    var ok = keys.every(function (k, i) {
      return nums[i] >= VITAL_RANGE[k][0] && nums[i] <= VITAL_RANGE[k][1];
    });
    if (!ok) return;
    keys.forEach(function (k, i) { vitals[k] = nums[i]; });
    if (keys[0] === 'sat') {
      var tail = src.slice(m.index + m[0].length).split(/[.|\n;]/)[0];
      soporteHint = soporteFromSatTail(tail);
    }
  });
  return { vitals: vitals, soporteHint: soporteHint };
}
