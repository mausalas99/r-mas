import fieldSpecs from './catalogs/genero-field-specs.json' with { type: 'json' };
import { HC_INTERROGADO_NEGADO } from './defaults.mjs';
import {
  formatMedicamentoLine,
  normalizeMedicamentosList,
} from './medicamento-entry.mjs';

const NEGADO_FIELD = HC_INTERROGADO_NEGADO.toLowerCase();

function trim(s) {
  return String(s || '').trim();
}

/**
 * @param {string | null | undefined} sexo
 * @returns {'male' | 'female'}
 */
export function generoSexBucket(sexo) {
  return String(sexo || '').toUpperCase() === 'M' ? 'male' : 'female';
}

/**
 * @param {string | null | undefined} sexo
 * @returns {Array<{ id: string, label: string, kind: string, fullWidth?: boolean }>}
 */
export function generoFieldSpecsForSex(sexo) {
  const bucket = generoSexBucket(sexo);
  return (fieldSpecs[bucket] || fieldSpecs.female).slice();
}

/**
 * @param {string | null | undefined} sexo
 * @returns {Record<string, string>}
 */
export function generoCatalogForSex(sexo) {
  const out = {};
  generoFieldSpecsForSex(sexo).forEach(function (spec) {
    out[spec.id] = spec.label;
  });
  return out;
}

function defaultFieldValue() {
  return {};
}

/**
 * @param {string | null | undefined} sexo
 */
export function defaultGeneroBlock(sexo) {
  /** @type {Record<string, { negado: boolean }>} */
  const out = {};
  generoFieldSpecsForSex(sexo).forEach(function (spec) {
    out[spec.id] = defaultFieldValue();
  });
  return out;
}

function isLegacyGeneroShape(genero) {
  return (
    Array.isArray(genero.checks) ||
    genero.descripcion != null ||
    genero.negado != null
  );
}

function parseGpacString(s) {
  const m = String(s).match(/G\s*(\d+).*?P\s*(\d+).*?A\s*(\d+).*?C\s*(\d+)/i);
  if (!m) return null;
  return { g: m[1], p: m[2], a: m[3], c: m[4] };
}

/**
 * @param {{ kind: string }} spec
 * @param {object} val
 */
export function generoFieldHasContent(spec, val) {
  if (!val || typeof val !== 'object' || val.negado === true) return false;
  switch (spec.kind) {
    case 'age':
      return trim(val.edad) !== '';
    case 'fum':
      return trim(val.fum) !== '' || trim(val.ciclo) !== '';
    case 'gpac':
      return (
        ['g', 'p', 'a', 'c'].some(function (k) {
          return trim(val[k]) !== '';
        }) || trim(val.detalle) !== ''
      );
    case 'medications':
      return normalizeMedicamentosList(val.medicamentos).some(function (m) {
        return formatMedicamentoLine(m);
      });
    case 'medication':
      return trim(val.medicacion) !== '';
    case 'detail':
      return trim(val.detalle) !== '';
    default:
      return trim(val.detalle) !== '';
  }
}

/**
 * @param {{ kind: string }} spec
 * @param {unknown} raw
 */
function normalizeFieldValue(spec, raw) {
  if (raw == null || raw === '') return defaultFieldValue();
  if (typeof raw === 'string') {
    const s = trim(raw);
    if (!s || s.toLowerCase() === NEGADO_FIELD) return defaultFieldValue();
    switch (spec.kind) {
      case 'age':
        return { edad: s.replace(/\s*años?\s*/gi, '').trim() };
      case 'gpac': {
        const parsed = parseGpacString(s);
        if (parsed) return parsed;
        return { detalle: s };
      }
      case 'fum':
        return { fum: s };
      case 'medications':
        return { medicamentos: normalizeMedicamentosList(s) };
      case 'medication':
        return { medicamentos: normalizeMedicamentosList(s) };
      default:
        return { detalle: s };
    }
  }
  if (typeof raw !== 'object') return defaultFieldValue();
  if (raw.negado === true && !generoFieldHasContent(spec, raw)) return defaultFieldValue();
  /** @type {Record<string, string>} */
  const out = {};
  if (spec.kind === 'age') {
    if (trim(raw.edad) !== '') out.edad = trim(raw.edad);
  } else if (spec.kind === 'fum') {
    if (trim(raw.fum) !== '') out.fum = trim(raw.fum);
    if (trim(raw.ciclo) !== '') out.ciclo = trim(raw.ciclo);
  } else if (spec.kind === 'gpac') {
    ['g', 'p', 'a', 'c'].forEach(function (k) {
      if (trim(raw[k]) !== '') out[k] = trim(raw[k]);
    });
    if (trim(raw.detalle) !== '') out.detalle = trim(raw.detalle);
  } else if (spec.kind === 'medications' || spec.kind === 'medication') {
    const meds = normalizeMedicamentosList(raw.medicamentos || raw.medicacion || raw);
    if (meds.length) return { medicamentos: meds };
  } else if (trim(raw.detalle) !== '') {
    out.detalle = trim(raw.detalle);
  }
  if (!Object.keys(out).length) return defaultFieldValue();
  return out;
}

/**
 * @param {object | null | undefined} genero
 * @param {string | null | undefined} sexo
 */
export function normalizeGeneroBlock(genero, sexo) {
  const specs = generoFieldSpecsForSex(sexo);
  const out = defaultGeneroBlock(sexo);
  if (!genero || typeof genero !== 'object') return out;

  if (isLegacyGeneroShape(genero)) {
    const checks = Array.isArray(genero.checks) ? genero.checks : [];
    const detail = trim(genero.descripcion);
    const isGenericDetail =
      !detail ||
      detail.toLowerCase() === HC_INTERROGADO_NEGADO.toLowerCase() ||
      detail.toLowerCase().endsWith(': ' + NEGADO_FIELD);
    specs.forEach(function (spec) {
      if (checks.indexOf(spec.id) >= 0 && detail && !isGenericDetail) {
        out[spec.id] = normalizeFieldValue(spec, detail);
      }
    });
    return out;
  }

  specs.forEach(function (spec) {
    if (genero[spec.id] != null) {
      out[spec.id] = normalizeFieldValue(spec, genero[spec.id]);
    }
  });
  return out;
}

/**
 * @param {{ id: string, label: string, kind: string }} spec
 * @param {object} val
 */
export function formatGeneroFieldLine(spec, val) {
  if (!generoFieldHasContent(spec, val)) return '';
  switch (spec.kind) {
    case 'age':
      return spec.label + ': ' + trim(val.edad) + ' años';
    case 'fum': {
      const parts = [];
      if (trim(val.fum)) parts.push('FUM ' + trim(val.fum));
      if (trim(val.ciclo)) parts.push(trim(val.ciclo));
      return spec.label + ': ' + parts.join('; ');
    }
    case 'gpac': {
      if (trim(val.detalle)) return spec.label + ': ' + trim(val.detalle);
      const g = trim(val.g) || '0';
      const p = trim(val.p) || '0';
      const a = trim(val.a) || '0';
      const c = trim(val.c) || '0';
      return (
        spec.label +
        ': G' +
        g +
        ' P' +
        p +
        ' A' +
        a +
        ' C' +
        c
      );
    }
    case 'medications':
    case 'medication': {
      const meds = normalizeMedicamentosList(val.medicamentos);
      const lines = meds.map(formatMedicamentoLine).filter(Boolean);
      if (!lines.length) return '';
      return spec.label + ':\n' + lines.map(function (l) {
        return '• ' + l;
      }).join('\n');
    }
    case 'detail':
      return spec.label + ': ' + trim(val.detalle);
    default:
      return '';
  }
}

/**
 * @param {object | null | undefined} genero
 * @param {string | null | undefined} sexo
 */
export function formatGeneroSection(genero, sexo) {
  const specs = generoFieldSpecsForSex(sexo);
  const block = normalizeGeneroBlock(genero, sexo);
  const lines = specs
    .map(function (spec) {
      return formatGeneroFieldLine(spec, block[spec.id]);
    })
    .filter(Boolean);

  if (!lines.length) {
    return (
      specs
        .map(function (s) {
          return s.label;
        })
        .join(', ') +
      ': ' +
      NEGADO_FIELD
    );
  }

  return lines.join('\n');
}
