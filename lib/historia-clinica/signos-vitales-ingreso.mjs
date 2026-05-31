/**
 * Signos vitales al ingreso — texto derivado del monitoreo (Estado actual).
 */

function trim(s) {
  return String(s || '').trim();
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const SOPORTE_SUFFIX = {
  'Aire ambiente': 'AA',
  'Puntillas nasales': 'LN',
  'Alto flujo': 'AF',
  'VM no invasiva': 'VMNI',
};

/**
 * @param {{ vitals?: Record<string, unknown>, alteredAt?: Record<string, string>, glucometrias?: Array<{ value?: unknown, time?: string }>, bombaInsulina?: Array<{ value?: number, units?: number, time?: string }> } | null | undefined} snapshot
 * @param {{ soporte?: unknown } | null | undefined} [estadoClinico]
 * @returns {boolean}
 */
export function signosVitalesSnapshotHasData(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const v = snapshot.vitals && typeof snapshot.vitals === 'object' ? snapshot.vitals : {};
  const keys = ['tas', 'tad', 'fc', 'fr', 'temp', 'sat', 'tempPeak'];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (v[k] != null && v[k] !== '') return true;
  }
  if (Array.isArray(snapshot.glucometrias) && snapshot.glucometrias.length) return true;
  if (Array.isArray(snapshot.bombaInsulina) && snapshot.bombaInsulina.length) return true;
  return false;
}

/**
 * @param {{ vitals?: Record<string, unknown>, alteredAt?: Record<string, string>, glucometrias?: Array<{ value?: unknown, time?: string }>, bombaInsulina?: Array<{ value?: number, units?: number, time?: string }> } | null | undefined} snapshot
 * @param {{ soporte?: unknown } | null | undefined} [estadoClinico]
 * @returns {string}
 */
export function formatSignosVitalesIngresoFromSnapshot(snapshot, estadoClinico) {
  if (!signosVitalesSnapshotHasData(snapshot)) return '';
  const v = snapshot && snapshot.vitals && typeof snapshot.vitals === 'object' ? snapshot.vitals : {};
  const alt =
    snapshot && snapshot.alteredAt && typeof snapshot.alteredAt === 'object' ? snapshot.alteredAt : {};
  const parts = [];

  const temp = num(v.temp);
  if (temp != null) {
    let line = 'TEMP ' + temp + ' °C';
    if (alt.temp) line += ' @ ' + alt.temp;
    const peak = num(v.tempPeak);
    if (peak != null) {
      line += ' (PICO ' + peak + ' °C';
      if (alt.tempPeak) line += ' @ ' + alt.tempPeak;
      line += ')';
    }
    parts.push(line);
  }

  const fc = num(v.fc);
  if (fc != null) parts.push('FC ' + fc + ' LPM');

  const fr = num(v.fr);
  if (fr != null) parts.push('FR ' + fr + ' RPM');

  const sat = num(v.sat);
  if (sat != null) {
    let satLine = 'SAT ' + sat + '%';
    const soporteKey =
      estadoClinico && estadoClinico.soporte != null ? String(estadoClinico.soporte).trim() : '';
    const soporteShort = SOPORTE_SUFFIX[soporteKey];
    if (soporteShort) satLine += ' ' + soporteShort;
    parts.push(satLine);
  }

  const tas = num(v.tas);
  const tad = num(v.tad);
  if (tas != null || tad != null) {
    parts.push('TA ' + (tas != null ? tas : '—') + '/' + (tad != null ? tad : '—') + ' MMHG');
  }

  const glu = Array.isArray(snapshot && snapshot.glucometrias) ? snapshot.glucometrias : [];
  if (glu.length) {
    parts.push(
      'DXT ' +
        glu
          .map(function (g) {
            const val = g && g.value != null ? String(g.value) : '';
            const time = g && g.time ? String(g.time) : '';
            return val + (time ? '@' + time : '');
          })
          .filter(Boolean)
          .join(', ') +
        ' MG/DL'
    );
  }

  const bomba = Array.isArray(snapshot && snapshot.bombaInsulina) ? snapshot.bombaInsulina : [];
  if (bomba.length) {
    parts.push(
      'BOMBA ' +
        bomba
          .map(function (b) {
            if (!b || typeof b !== 'object') return '';
            const val = num(b.value);
            if (val == null) return '';
            const units = num(b.units);
            const time = b.time ? String(b.time) : '';
            let s = String(val);
            if (units != null && units > 0) s += ' U/h ' + units;
            if (time) s += '@' + time;
            return s;
          })
          .filter(Boolean)
          .join(', ')
    );
  }

  return parts.join(' · ').toUpperCase();
}

/**
 * @param {Record<string, unknown> | null | undefined} data
 * @param {{ signosVitalesIngresoFromMonitoreo?: string } | null | undefined} [ctx]
 * @returns {string}
 */
export function resolveSignosVitalesIngresoBody(data, ctx) {
  const fromMon = ctx && trim(ctx.signosVitalesIngresoFromMonitoreo);
  if (fromMon) return fromMon;
  return trim(data && data.signosVitalesIngreso);
}
