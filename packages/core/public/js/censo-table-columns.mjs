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
export const CENSO_OPTIONAL_COL_KEYS = ['meds', 'accesos', 'cultivos', 'pend'];

/** Reparto del peso liberado al ocultar columnas opcionales. */
const OPTIONAL_FREED_WEIGHT_SHARE = {
  paciente: 0.35,
  labs: 0.45,
  signos: 0.12,
  dx: 0.08,
};

/** Sección de respaldo (row.sections) de cada columna. */
const CENSO_SECTION_LABEL = {
  dx: 'Diagnósticos',
  atb: 'Antibióticos',
  meds: 'Medicamentos',
  labs: 'Laboratorios',
  accesos: 'Accesos',
  cultivos: 'Cultivos',
  pend: 'Pendientes',
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
  var label = CENSO_SECTION_LABEL[key];
  if (!label) return '';
  var sec = (row.sections || []).find(function (s) {
    return s.label === label;
  });
  return sec ? sec.lines.join('\n').trim() : '';
}

/**
 * Aplica el texto editado en la vista previa a la fila, para que el PDF lo use.
 * @param {Record<string, any>} row
 * @param {string} key
 * @param {string} text
 */
export function applyCensoCellEdit(row, key, text) {
  var lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  var t = lines.join('\n');
  var dropLabels = key === 'signos' ? ['Signos / I-O', 'Signos / Estado actual'] : [CENSO_SECTION_LABEL[key]];
  row.sections = (row.sections || []).filter(function (s) {
    return dropLabels.indexOf(s.label) < 0;
  });
  if (key === 'paciente') {
    row.pacienteNombre = lines[0] || '';
    row.pacienteMeta = lines.slice(1).join('\n');
  } else if (key === 'signos') {
    row.signosCol = t;
    row.ioCol = '';
    row.signos = '';
  } else if (key === 'pend') {
    row.pendientes = t;
  } else {
    if (key === 'labs') delete row.labsDiagrams;
    if (key === 'accesos' || key === 'cultivos') row.accCult = '';
    row[key] = t;
  }
}

/**
 * @param {Array<Record<string, unknown>>} [rows]
 * @param {string[]} [hiddenKeys] columnas que el usuario ocultó
 * @returns {typeof CENSO_COL_WEIGHTS}
 */
export function resolveCensoColWeights(rows, hiddenKeys) {
  var optionalHidden = {};
  (hiddenKeys || []).forEach(function (key) {
    if (key !== 'num') optionalHidden[key] = true;
  });
  CENSO_OPTIONAL_COL_KEYS.forEach(function (key) {
    if (optionalHidden[key]) return;
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
