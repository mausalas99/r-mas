import { normalizeDrivePaste } from './normalize.mjs';

/** @typedef {{ key: string, re: RegExp, exclusive?: boolean }} SectionMarker */

const DATE_ONLY_RE = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\s*$/;
const MONITOREO_RE = /^(N|V|HD|HI|NM)\s*:/i;

/** @type {SectionMarker[]} */
export const SECTION_MARKERS = [
  { key: 'eventualidades', re: /^EVENTUALIDADES(\s+EN ESTE INTERNAMIENTO)?\s*$/i },
  { key: 'estadoActual', re: /^ESTADO ACTUAL\b/i, exclusive: true },
  { key: 'historiaClinica', re: /^HISTORIA\s+CL[IÍ]NICA\s*$/i },
  { key: 'ficha', re: /^FICHA\s+DE\s+IDENTIFICACI[ÓO]N\s*$/i },
  { key: 'interrogatorio', re: /^INTERROGATORIO\s*$/i },
  { key: 'dx', re: /^DX\s*:?\s*$/i },
  { key: 'motivoConsulta', re: /^MOTIVO\s+DE\s+CONSULTA\s*:?\s*$/i },
  { key: 'signosVitales', re: /^SIGNOS\s+VITALES(\s+DE\s+TRIAGE)?\s*:?\s*$/i },
  { key: 'fechaIngreso', re: /^FECHA\s+DE\s+INGRESO\b/i },
  { key: 'ahf', re: /^ANTECEDENTES\s+HEREDOFAMILIARES\s*$/i },
  { key: 'apnp', re: /^ANTECEDENTES\s+PERSONALES(\s+NO\s+PATOL[ÓO]GICOS)?\s*$/i },
  { key: 'app', re: /^ANTECEDENTES\s+PERSONALES\s+PATOL[ÓO]GICOS\s*$/i },
  { key: 'ecd', re: /^ENFERMEDADES\s+CR[ÓO]NICO-?DEGENERATIVAS\s*$/i },
  { key: 'medicamentos', re: /^MEDICAMENTOS(\s+ACTUALES|\s+HABITUALES)?\s*$/i },
  { key: 'peea', re: /^(PADECIMIENTO\s+ACTUAL\s*\/\s*PEEA|PEEA)\s*$/i },
  { key: 'pendientes', re: /^PENDIENTES\s*$/i },
];

/** @type {Array<{ key: string, re: RegExp }>} */
const INLINE_SECTIONS = [
  { key: 'motivoConsulta', re: /^MOTIVO\s+DE\s+CONSULTA\s*:\s*(.+)$/i },
  { key: 'signosVitales', re: /^SIGNOS\s+VITALES(?:\s+DE\s+TRIAGE)?\s*:\s*(.+)$/i },
];

/**
 * @param {string} line
 * @returns {{ key: string, body: string } | null}
 */
function matchInlineSection(line) {
  const t = line.trim();
  for (const m of INLINE_SECTIONS) {
    const hit = m.re.exec(t);
    if (hit) return { key: m.key, body: hit[1].trim() };
  }
  return null;
}

/**
 * @param {string} line
 * @returns {{ key: string, exclusive?: boolean } | null}
 */
function matchSectionHeader(line) {
  const t = line.trim();
  if (!t) return null;
  for (const m of SECTION_MARKERS) {
    if (m.re.test(t)) return { key: m.key, exclusive: m.exclusive };
  }
  return null;
}

/**
 * @param {string} rawText
 * @returns {{
 *   headerLines: string[],
 *   sections: Record<string, string>,
 *   eventualidadesBlocks: string[],
 *   warnings: string[]
 * }}
 */
export function splitDocumentSections(rawText) {
  const text = normalizeDrivePaste(rawText);
  const lines = text.split('\n');
  /** @type {Record<string, string>} */
  const sections = {};
  /** @type {string[]} */
  const eventualidadesBlocks = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const headerLines = [];

  let currentKey = '_preamble';
  let currentLines = [];
  let inEstadoActual = false;
  let inEventualidades = false;
  let evBuffer = [];

  function flushSection() {
    const body = currentLines.join('\n').trim();
    if (currentKey === '_preamble') {
      if (body) headerLines.push(...body.split('\n'));
    } else if (currentKey === 'eventualidades') {
      if (body) evBuffer.push(body);
    } else if (!inEstadoActual && body) {
      sections[currentKey] = sections[currentKey] ? sections[currentKey] + '\n\n' + body : body;
    }
    currentLines = [];
  }

  function flushEventualidadesBlock() {
    const joined = evBuffer.filter(Boolean).join('\n\n').trim();
    if (joined) eventualidadesBlocks.push(joined);
    evBuffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (inEstadoActual && DATE_ONLY_RE.test(trimmed) && !MONITOREO_RE.test(trimmed)) {
      inEstadoActual = false;
      inEventualidades = true;
      currentKey = 'eventualidades';
      currentLines = [line];
      continue;
    }

    const inline = matchInlineSection(line);
    if (inline) {
      flushSection();
      if (inEstadoActual) inEstadoActual = false;
      if (inEventualidades) {
        flushEventualidadesBlock();
        inEventualidades = false;
      }
      sections[inline.key] = inline.body;
      currentKey = '_inline';
      currentLines = [];
      continue;
    }

    const hit = matchSectionHeader(line);
    if (hit) {
      flushSection();
      if (hit.key === 'estadoActual') {
        inEstadoActual = true;
        inEventualidades = false;
        currentKey = 'estadoActual';
        warnings.push('ESTADO ACTUAL detectado: no se importará en v1.');
        continue;
      }
      if (inEstadoActual && hit.key !== 'estadoActual') {
        inEstadoActual = false;
      }
      if (hit.key === 'eventualidades') {
        if (inEventualidades) flushEventualidadesBlock();
        inEventualidades = true;
        inEstadoActual = false;
        currentKey = 'eventualidades';
        continue;
      }
      if (inEventualidades && hit.key !== 'eventualidades') {
        flushEventualidadesBlock();
        inEventualidades = false;
      }
      currentKey = hit.key;
      continue;
    }
    if (inEstadoActual) continue;
    currentLines.push(line);
  }

  flushSection();
  if (inEventualidades) flushEventualidadesBlock();

  return { headerLines, sections, eventualidadesBlocks, warnings };
}
