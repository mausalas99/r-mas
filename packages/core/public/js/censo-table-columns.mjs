/** Pesos de columnas del censo (PDF y vista previa deben coincidir). */
export const CENSO_COL_WEIGHTS = [
  { key: 'num', title: '#', weight: 20 },
  { key: 'cama', title: 'Cama', weight: 22 },
  { key: 'paciente', title: 'Paciente', weight: 70 },
  { key: 'dx', title: 'Dx', weight: 54 },
  { key: 'atb', title: 'ATB', weight: 42 },
  { key: 'meds', title: 'Meds', weight: 46 },
  { key: 'labs', title: 'Labs', weight: 138 },
  { key: 'signos', title: 'Signos / I-E-B', weight: 78 },
  { key: 'accesos', title: 'Accesos', weight: 28 },
  { key: 'cultivos', title: 'Cultivos', weight: 58 },
  { key: 'pend', title: 'Pend.', weight: 78 },
];

/** Columnas que se ocultan si ningún paciente tiene contenido. */
export const CENSO_OPTIONAL_COL_KEYS = ['accesos', 'cultivos', 'pend'];

/** Reparto del peso liberado al ocultar columnas opcionales. */
const OPTIONAL_FREED_WEIGHT_SHARE = {
  paciente: 0.35,
  labs: 0.45,
  signos: 0.12,
  dx: 0.08,
};

/**
 * @param {string} value
 * @returns {boolean}
 */
export function censoCellHasContent(value) {
  var s = String(value || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean)
    .join(' ')
    .trim();
  return !!s && s !== '—';
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} key
 * @returns {string}
 */
export function censoRowColumnText(row, key) {
  if (!row) return '';
  if (key === 'pend') return String(row.pendientes || '').trim();
  if (key === 'paciente') {
    return [row.pacienteNombre, row.pacienteMeta].filter(Boolean).join('\n');
  }
  if (key === 'signos') {
    return [String(row.signosCol || row.signos || '').trim(), String(row.ioCol || '').trim()]
      .filter(Boolean)
      .join('\n');
  }
  var direct = row[key];
  if (direct) return String(direct).trim();
  var labelByKey = {
    dx: 'Diagnósticos',
    atb: 'Antibióticos',
    meds: 'Medicamentos',
    labs: 'Laboratorios',
    accesos: 'Accesos',
    cultivos: 'Cultivos',
    pend: 'Pendientes',
  };
  var label = labelByKey[key];
  if (!label) return '';
  var sec = (row.sections || []).find(function (s) {
    return s.label === label;
  });
  return sec ? sec.lines.join('\n').trim() : '';
}

/**
 * @param {Array<Record<string, unknown>>} [rows]
 * @returns {typeof CENSO_COL_WEIGHTS}
 */
export function resolveCensoColWeights(rows) {
  var optionalHidden = {};
  CENSO_OPTIONAL_COL_KEYS.forEach(function (key) {
    optionalHidden[key] = !(rows || []).some(function (row) {
      return censoCellHasContent(censoRowColumnText(row, key));
    });
  });

  var freed = 0;
  var base = CENSO_COL_WEIGHTS.filter(function (col) {
    if (optionalHidden[col.key]) {
      freed += col.weight;
      return false;
    }
    return true;
  });

  if (!freed) return base.slice();

  var recipientSum = Object.keys(OPTIONAL_FREED_WEIGHT_SHARE).reduce(function (s, key) {
    return base.some(function (col) {
      return col.key === key;
    })
      ? s + OPTIONAL_FREED_WEIGHT_SHARE[key]
      : s;
  }, 0);

  return base.map(function (col) {
    var share = OPTIONAL_FREED_WEIGHT_SHARE[col.key];
    if (!share || !recipientSum) return { key: col.key, title: col.title, weight: col.weight };
    var extra = Math.round((freed * share) / recipientSum);
    return { key: col.key, title: col.title, weight: col.weight + extra };
  });
}

/**
 * @param {typeof CENSO_COL_WEIGHTS} [weights]
 * @returns {Array<{ key: string, title: string, pct: number }>}
 */
export function censoColumnPercents(weights) {
  var source = weights && weights.length ? weights : CENSO_COL_WEIGHTS;
  var sum = source.reduce(function (s, c) {
    return s + c.weight;
  }, 0);
  var cols = source.map(function (c) {
    return {
      key: c.key,
      title: c.title,
      pct: (c.weight / sum) * 100,
    };
  });
  var total = cols.reduce(function (s, c) {
    return s + c.pct;
  }, 0);
  var drift = 100 - total;
  if (drift !== 0) cols[cols.length - 1].pct += drift;
  return cols;
}

/**
 * @returns {string} reglas col.* para vista previa HTML
 */
function censoColClass(key) {
  if (key === 'paciente') return 'pac';
  if (key === 'atb') return 'atb';
  if (key === 'meds') return 'med';
  if (key === 'labs') return 'lab';
  return key;
}

export function censoColgroupCssRules(weights) {
  return censoColumnPercents(weights)
    .map(function (c) {
      return 'col.' + censoColClass(c.key) + '{width:' + c.pct.toFixed(3) + '%}';
    })
    .join('');
}

/**
 * @param {typeof CENSO_COL_WEIGHTS} [weights]
 * @returns {string}
 */
export function censoColgroupHtml(weights) {
  return censoColumnPercents(weights)
    .map(function (c) {
      return '<col class="' + censoColClass(c.key) + '">';
    })
    .join('');
}

/**
 * @param {typeof CENSO_COL_WEIGHTS} [weights]
 * @returns {string}
 */
export function censoTheadRowHtml(weights) {
  return censoColumnPercents(weights)
    .map(function (c) {
      var bold = c.key === 'dx' || c.key === 'cama' ? ' censo-bold' : '';
      return '<th class="censo-th' + bold + '">' + c.title + '</th>';
    })
    .join('');
}
