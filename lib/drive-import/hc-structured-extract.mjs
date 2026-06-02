import appConditions from '../historia-clinica/catalogs/app-conditions.json' with { type: 'json' };
import ahfConditions from '../historia-clinica/catalogs/ahf-conditions.json' with { type: 'json' };
import toxicomaniasSubstances from '../historia-clinica/catalogs/toxicomanias-substances.json' with { type: 'json' };
import { APP_DEDICATED_IDS } from '../historia-clinica/normalize-app.mjs';
import { HC_INTERROGADO_NEGADO } from '../historia-clinica/defaults.mjs';
import { syncAhfConditionsFromEntries } from '../historia-clinica/compile-ahf.mjs';
import { AHF_RELATIVES } from '../historia-clinica/ahf-relatives.mjs';

const NEGADO_RE = /^(?:INTERROGADO\s+Y\s+)?NEGAD/i;

/** @type {Record<string, RegExp[]>} */
const CONDITION_PATTERNS = {
  diabetes: [/\bDIABET(?:ES|IC[OA])\b/i, /\bDM\s*[12]\b/i, /\bDM2\b/i, /\bDM1\b/i],
  hipertension: [/\bHIPERTENS(?:I[ÓO]N|O)\b/i, /\bHTA\b/i, /\bHAS\b/i],
  enfermedadRenal: [
    /\bENFERMEDAD\s+RENAL\b/i,
    /\bERC\b/i,
    /\bIRC\b/i,
    /\bINSUFICIENCIA\s+RENAL\b/i,
    /\bNEFROPAT/i,
    /\bRI[ÑN]ON\s+POLIQU/i,
  ],
  cardiopatia: [/\bCARDIOPAT/i, /\bINSUFICIENCIA\s+CARD[IÍ]ACA\b/i, /\bICC\b/i, /\bFEVI\b/i],
  enfermedadPulmonar: [/\bEPOC\b/i, /\bENFERMEDAD\s+PULMONAR\b/i],
  cancer: [/\bNEOPLASIA\b/i, /\bC[AÁ]NCER\b/i, /\bCA\s+DE\b/i, /\bTUMOR\b/i],
  vih: [/\bVIH\b/i, /\bSIDA\b/i, /\bHIV\b/i],
  tuberculosis: [/\bTUBERCULOSIS\b/i, /\bTBC\b/i],
  hepatitis: [/\bHEPATITIS\b/i],
  parotiditis: [/\bPAROTIDITIS\b/i],
  paperas: [/\bPAPERAS\b/i],
  sarampion: [/\bSARAMPI[ÓO]N\b/i],
  varicela: [/\bVARICELA\b/i],
  rubeola: [/\bRUB[ÉE]OLA\b/i],
  neoplasia: [/\bNEOPLASIA\b/i],
  epilepsia: [/\bEPILEPS/i, /\bCONVULS/i],
  psiquiatrico: [/\bPSIQUIATR/i, /\bDEPRESI[ÓO]N\b/i, /\bESQUIZOFREN/i],
  tiroideo: [/\bTIROIDE/i, /\bHIPOTIRO/i, /\bHIPERTIRO/i],
};

/** @type {Array<{ key: string, re: RegExp }>} */
const APP_SUBSECTION_HEADERS = [
  { key: 'ecd', re: /^ENFERMEDADES\s+CR[ÓO]NICO-?DEGENERATIVAS\s*:?\s*(.*)$/i },
  { key: 'medicamentos', re: /^MEDICAMENTOS(?:\s+ACTUALES|\s+HABITUALES)?\s*:?\s*(.*)$/i },
  { key: 'transfusiones', re: /^TRANSFUSIONES\s*:?\s*(.*)$/i },
  { key: 'hospitalizaciones', re: /^HOSPITALIZACIONES\s*:?\s*(.*)$/i },
  { key: 'cirugias', re: /^CIRUG[ÍI]AS(?:\s+PREVIAS)?\s*:?\s*(.*)$/i },
  { key: 'traumaticos', re: /^(?:TRAUMATISMOS?|FRACTURAS?)\s*:?\s*(.*)$/i },
  { key: 'inmunizaciones', re: /^INMUNIZACIONES\s*:?\s*(.*)$/i },
  { key: 'alergias', re: /^ALERGIAS(?:\s+MEDICAMENTOSAS)?\s*:?\s*(.*)$/i },
  { key: 'enfermedades', re: /^ENFERMEDADES\s*:?\s*(.*)$/i },
];

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isNegatedDriveText(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  return NEGADO_RE.test(t);
}

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseAppSubsections(text) {
  /** @type {Record<string, string>} */
  const out = {};
  const lines = String(text || '').split('\n');
  let currentKey = '_body';
  /** @type {string[]} */
  let currentLines = [];

  function flush() {
    const body = currentLines.join('\n').trim();
    if (body) out[currentKey] = out[currentKey] ? out[currentKey] + '\n' + body : body;
    currentLines = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    let matched = false;
    for (const header of APP_SUBSECTION_HEADERS) {
      const hit = header.re.exec(line);
      if (hit) {
        flush();
        currentKey = header.key;
        matched = true;
        if (hit[1] && hit[1].trim()) currentLines.push(hit[1].trim());
        break;
      }
    }
    if (!matched) currentLines.push(raw);
  }
  flush();
  return out;
}

/**
 * @param {string} text
 * @param {Record<string, string>} catalog
 * @returns {Array<{ id: string, label: string }>}
 */
export function matchCatalogConditions(text, catalog) {
  const hay = String(text || '');
  if (!hay.trim() || isNegatedDriveText(hay)) return [];
  /** @type {Array<{ id: string, label: string }>} */
  const hits = [];
  const seen = new Set();

  Object.keys(catalog || {}).forEach(function (id) {
    if (APP_DEDICATED_IDS.has(id)) return;
    if (id === 'otro') return;
    const label = catalog[id];
    const patterns = CONDITION_PATTERNS[id] || [];
    const labelRe = new RegExp('\\b' + String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const matched =
      patterns.some(function (re) {
        return re.test(hay);
      }) || labelRe.test(hay);
    if (matched && !seen.has(id)) {
      seen.add(id);
      hits.push({ id, label });
    }
  });
  return hits;
}

/**
 * @param {string} text
 * @returns {Array<{ id: string, medication: string, route: string, dosage: string, frequency: string }>}
 */
export function parseMedicamentosList(text) {
  const t = String(text || '').trim();
  if (!t || isNegatedDriveText(t)) return [];
  return t
    .split(/\s*,\s*(?=[A-ZÁÉÍÓÚÑ0-9])/)
    .map(function (chunk) {
      return chunk.trim();
    })
    .filter(Boolean)
    .map(function (med, idx) {
      return {
        id: 'drv_med_' + idx,
        medication: med,
        route: '',
        dosage: '',
        frequency: '',
      };
    });
}

/**
 * @param {string} text
 * @returns {Array<{ id: string, label: string }>}
 */
function matchToxicomaniasSubstances(text) {
  const hay = String(text || '');
  if (!hay.trim() || isNegatedDriveText(hay)) return [];
  /** @type {Array<{ id: string, label: string }>} */
  const hits = [];
  Object.keys(toxicomaniasSubstances).forEach(function (id) {
    const label = toxicomaniasSubstances[id];
    const tokens = String(label)
      .split(/\s*[\/(]/)
      .map(function (part) {
        return part.trim();
      })
      .filter(function (part) {
        return part.length >= 4;
      });
    const matched = tokens.some(function (token) {
      return new RegExp('\\b' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(hay);
    });
    if (matched) hits.push({ id, label });
  });
  return hits;
}

/** @type {Record<string, string>} */
const AHF_RELATIVE_LABEL_MAP = Object.fromEntries(
  AHF_RELATIVES.map(function (rel) {
    return [rel.label.toUpperCase(), rel.id];
  }).concat([
    ['ABUELA', 'abuela_materna'],
    ['ABUELO', 'abuelo_materno'],
  ])
);

/**
 * @param {string} text
 * @returns {Array<{ id: string, conditionId: string, relativeId: string, diagnosis: string, treatment: string, vitalStatus: string }>}
 */
export function parseAhfRelativeLines(text) {
  /** @type {Array<{ id: string, conditionId: string, relativeId: string, diagnosis: string, treatment: string, vitalStatus: string }>} */
  const entries = [];
  String(text || '')
    .split('\n')
    .forEach(function (raw, lineIdx) {
      const line = raw.trim();
      const m = /^([A-ZÁÉÍÓÚÑ\s]+)\s*[:;]\s*(.+)$/i.exec(line);
      if (!m) return;
      const label = m[1].trim().toUpperCase();
      const value = m[2].trim();
      const relativeId = AHF_RELATIVE_LABEL_MAP[label];
      if (!relativeId || !value || isNegatedDriveText(value)) return;

      const vitalStatus = /FINAD|FALLECID|FALLEC/i.test(value)
        ? 'fallecido'
        : /\bVIV[OA]\b|\bSANO\b/i.test(value)
          ? 'vivo'
          : 'desconocido';

      const conditions = matchCatalogConditions(value, ahfConditions);
      if (conditions.length) {
        conditions.forEach(function (cond) {
          entries.push({
            id: 'drv_ahf_' + lineIdx + '_' + relativeId + '_' + cond.id,
            conditionId: cond.id,
            relativeId: relativeId,
            diagnosis: value,
            treatment: '',
            vitalStatus: vitalStatus,
          });
        });
        return;
      }

      entries.push({
        id: 'drv_ahf_' + lineIdx + '_' + relativeId + '_otro',
        conditionId: 'otro',
        relativeId: relativeId,
        diagnosis: value,
        treatment: '',
        vitalStatus: vitalStatus,
      });
    });
  return entries;
}

function isNegatedSubsectionBody(body) {
  const t = String(body || '').trim();
  if (!t) return true;
  if (isNegatedDriveText(t)) return true;
  const inline = /^[^:]+:\s*(.+)$/i.exec(t);
  if (inline) return isNegatedDriveText(inline[1].trim());
  return false;
}

/**
 * @param {string} key
 * @param {string} body
 * @param {HcStructuredSuggestion[]} suggestions
 * @returns {boolean}
 */
function appSubsectionShouldStrip(key, body, suggestions) {
  if (!body || !String(body).trim()) return false;
  if (isNegatedSubsectionBody(body)) return true;

  const accepted = (suggestions || []).filter(function (s) {
    return s.include !== false;
  });

  if (key === 'medicamentos') {
    return accepted.some(function (s) {
      return s.target === 'app.medicamentosActuales';
    });
  }
  if (key === 'alergias') {
    return accepted.some(function (s) {
      return s.target === 'app.alergiasNegado' || s.target === 'app.alergiaMedicamentos';
    });
  }
  if (key === 'inmunizaciones') {
    return accepted.some(function (s) {
      return s.target === 'app.inmunizaciones';
    });
  }
  if (key === 'transfusiones') {
    return accepted.some(function (s) {
      return s.target === 'app.transfusionesEntries';
    });
  }
  if (key === 'hospitalizaciones') {
    return accepted.some(function (s) {
      return s.target === 'app.hospitalizaciones';
    });
  }
  if (key === 'cirugias') {
    return accepted.some(function (s) {
      return s.target === 'app.cirugias';
    });
  }
  if (key === 'traumaticos') {
    return accepted.some(function (s) {
      return s.target === 'app.traumaticosEntries';
    });
  }
  if (key === 'ecd' || key === 'enfermedades') {
    return accepted.some(function (s) {
      return s.target === 'app.conditions';
    });
  }
  return false;
}

/**
 * @param {string} text
 * @param {HcStructuredSuggestion[]} suggestions
 * @returns {string}
 */
export function stripIntegratedAppDescription(text, suggestions) {
  const lines = String(text || '').split('\n');
  /** @type {string[]} */
  const kept = [];
  let currentKey = '_body';
  /** @type {string[]} */
  let buffer = [];

  function flush() {
    const body = buffer.join('\n').trim();
    if (!body) {
      buffer = [];
      return;
    }
    if (currentKey === '_body') {
      let remainder = body;
      if (
        (suggestions || []).some(function (s) {
          return s.include !== false && s.target === 'app.conditions';
        })
      ) {
        const condHits = matchCatalogConditions(body, appConditions);
        if (
          condHits.length &&
          condHits.every(function (cond) {
            return (suggestions || []).some(function (s) {
              return s.include !== false && s.target === 'app.conditions' && s.value === cond.id;
            });
          })
        ) {
          remainder = '';
        }
      }
      if (remainder && !appSubsectionShouldStrip('_body', remainder, suggestions)) {
        kept.push(remainder);
      }
    } else if (!appSubsectionShouldStrip(currentKey, body, suggestions)) {
      kept.push(...buffer);
    }
    buffer = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    let matched = false;
    for (const header of APP_SUBSECTION_HEADERS) {
      const hit = header.re.exec(line);
      if (hit) {
        flush();
        currentKey = header.key;
        matched = true;
        if (hit[1] && hit[1].trim()) buffer.push(raw);
        break;
      }
    }
    if (!matched) {
      if (currentKey === '_body' || buffer.length === 0) {
        buffer.push(raw);
      } else {
        flush();
        currentKey = '_body';
        buffer.push(raw);
      }
    }
  }
  flush();

  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * @param {string} text
 * @param {HcStructuredSuggestion[]} suggestions
 * @returns {string}
 */
export function stripIntegratedAhfDescription(text, suggestions) {
  const acceptedEntries = (suggestions || []).filter(function (s) {
    return s.include !== false && s.target === 'ahf.entries';
  });

  return String(text || '')
    .split('\n')
    .filter(function (raw) {
      const line = raw.trim();
      if (!line) return true;
      const m = /^([A-ZÁÉÍÓÚÑ\s]+)\s*[:;]\s*(.+)$/i.exec(line);
      if (!m) return true;
      const label = m[1].trim().toUpperCase();
      const value = m[2].trim();
      if (!AHF_RELATIVE_LABEL_MAP[label]) return true;
      if (isNegatedDriveText(value)) return false;
      if (!acceptedEntries.length) return true;
      const relativeId = AHF_RELATIVE_LABEL_MAP[label];
      return !acceptedEntries.some(function (s) {
        const row = /** @type {{ relativeId?: string, diagnosis?: string }} */ (s.value || {});
        return row.relativeId === relativeId &&
          String(row.diagnosis || '').toUpperCase() === value.toUpperCase();
      });
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @typedef {object} HcStructuredSuggestion
 * @property {string} id
 * @property {string} label
 * @property {string} target
 * @property {boolean} include
 * @property {unknown} value
 * @property {string} [sourceText]
 */

/**
 * @param {string} sectionKey
 * @param {string} text
 * @param {Record<string, string>} [sections]
 * @returns {HcStructuredSuggestion[]}
 */
export function buildHcStructuredSuggestions(sectionKey, text, sections) {
  sections = sections || {};
  /** @type {HcStructuredSuggestion[]} */
  const suggestions = [];
  const key = String(sectionKey || '');

  if (key === 'app' || key === 'ecd' || key === 'medicamentos') {
    const subs = parseAppSubsections(text);
    const diseaseText = [subs.ecd, subs.enfermedades, subs._body, text].filter(Boolean).join('\n');
    matchCatalogConditions(diseaseText, appConditions).forEach(function (cond) {
      suggestions.push({
        id: 'app_cond_' + cond.id,
        label: cond.label,
        target: 'app.conditions',
        include: true,
        value: cond.id,
        sourceText: cond.label,
      });
    });

    const medText = subs.medicamentos || (key === 'medicamentos' ? text : '');
    parseMedicamentosList(medText).forEach(function (med, idx) {
      suggestions.push({
        id: 'app_med_' + idx,
        label: 'Medicamento: ' + med.medication,
        target: 'app.medicamentosActuales',
        include: true,
        value: med,
        sourceText: med.medication,
      });
    });

    const alergiasText = subs.alergias || '';
    if (alergiasText) {
      if (isNegatedDriveText(alergiasText)) {
        suggestions.push({
          id: 'app_alergias_negado',
          label: 'Sin alergias medicamentosas conocidas',
          target: 'app.alergiasNegado',
          include: true,
          value: true,
          sourceText: alergiasText,
        });
      } else {
        alergiasText
          .split(/\s*,\s*/)
          .map(function (part) {
            return part.trim();
          })
          .filter(Boolean)
          .forEach(function (med, idx) {
            suggestions.push({
              id: 'app_alergia_' + idx,
              label: 'Alergia: ' + med,
              target: 'app.alergiaMedicamentos',
              include: true,
              value: { id: 'drv_al_' + idx, medication: med },
              sourceText: med,
            });
          });
      }
    }

    const inmunText = subs.inmunizaciones || '';
    if (inmunText && !isNegatedDriveText(inmunText)) {
      suggestions.push({
        id: 'app_inmunizaciones',
        label: 'Inmunizaciones: ' + inmunText.slice(0, 72) + (inmunText.length > 72 ? '…' : ''),
        target: 'app.inmunizaciones',
        include: true,
        value: inmunText,
        sourceText: inmunText,
      });
    }

    [
      { subKey: 'transfusiones', target: 'app.transfusionesEntries', prefix: 'Transfusión' },
      { subKey: 'hospitalizaciones', target: 'app.hospitalizaciones', prefix: 'Hospitalización' },
      { subKey: 'cirugias', target: 'app.cirugias', prefix: 'Cirugía' },
      { subKey: 'traumaticos', target: 'app.traumaticosEntries', prefix: 'Traumatismo' },
    ].forEach(function (spec) {
      const body = subs[spec.subKey] || '';
      if (!body || isNegatedDriveText(body)) return;
      suggestions.push({
        id: 'app_' + spec.subKey,
        label: spec.prefix + ': ' + body.slice(0, 72) + (body.length > 72 ? '…' : ''),
        target: spec.target,
        include: true,
        value: body,
        sourceText: body,
      });
    });
  }

  if (key === 'apnp') {
    const lines = String(text || '').split('\n');
    lines.forEach(function (raw) {
      const line = raw.trim();
      const m = /^([A-ZÁÉÍÓÚÑ0-9\s]+)\s*[:;]\s*(.+)$/i.exec(line);
      if (!m) return;
      const label = m[1].trim().toUpperCase();
      const value = m[2].trim();
      if (label === 'TABAQUISMO' && isNegatedDriveText(value)) {
        suggestions.push({
          id: 'apnp_tabaquismo_negado',
          label: 'Tabaquismo negado',
          target: 'apnp.tabaquismoDetail',
          include: true,
          value: { status: 'negado' },
          sourceText: value,
        });
      }
      if ((label === 'ETILISMO' || label === 'ALCOHOLISMO') && isNegatedDriveText(value)) {
        suggestions.push({
          id: 'apnp_alcoholismo_negado',
          label: 'Alcoholismo negado',
          target: 'apnp.alcoholismoDetail',
          include: true,
          value: { status: 'negado' },
          sourceText: value,
        });
      }
      if (label === 'TOXICOMANÍAS' || label === 'TOXICOMANIAS') {
        if (isNegatedDriveText(value)) return;
        matchToxicomaniasSubstances(value).forEach(function (sub) {
          suggestions.push({
            id: 'apnp_tox_' + sub.id,
            label: 'Toxicomanía: ' + sub.label,
            target: 'apnp.toxicomaniasEntries',
            include: true,
            value: {
              id: 'drv_tox_' + sub.id,
              substanceId: sub.id,
              customLabel: '',
              frequency: '',
              years: '',
            },
            sourceText: sub.label,
          });
        });
      }
    });
  }

  if (key === 'ahf') {
    parseAhfRelativeLines(text).forEach(function (entry) {
      const relLabel =
        (AHF_RELATIVES.find(function (r) {
          return r.id === entry.relativeId;
        }) || {}).label || entry.relativeId;
      suggestions.push({
        id: entry.id,
        label: relLabel + ': ' + String(entry.diagnosis || '').slice(0, 64),
        target: 'ahf.entries',
        include: true,
        value: entry,
        sourceText: entry.diagnosis,
      });
    });
    matchCatalogConditions(text, ahfConditions).forEach(function (cond) {
      if (
        suggestions.some(function (s) {
          return s.target === 'ahf.entries' && s.value && s.value.conditionId === cond.id;
        })
      ) {
        return;
      }
      suggestions.push({
        id: 'ahf_cond_' + cond.id,
        label: 'Antecedente familiar: ' + cond.label,
        target: 'ahf.conditions',
        include: true,
        value: cond.id,
        sourceText: cond.label,
      });
    });
  }

  if (key === 'ecd' && !suggestions.length) {
    matchCatalogConditions(text, appConditions).forEach(function (cond) {
      suggestions.push({
        id: 'app_cond_' + cond.id,
        label: cond.label,
        target: 'app.conditions',
        include: true,
        value: cond.id,
        sourceText: cond.label,
      });
    });
  }

  if (key === 'medicamentos' && !suggestions.some(function (s) {
    return s.target === 'app.medicamentosActuales';
  })) {
    parseMedicamentosList(text).forEach(function (med, idx) {
      suggestions.push({
        id: 'app_med_' + idx,
        label: 'Medicamento: ' + med.medication,
        target: 'app.medicamentosActuales',
        include: true,
        value: med,
        sourceText: med.medication,
      });
    });
  }

  return suggestions;
}

/**
 * @param {Record<string, unknown>} hcPatch
 * @param {HcStructuredSuggestion[]} suggestions
 * @returns {Record<string, unknown>}
 */
export function applyStructuredSuggestionsToHcPatch(hcPatch, suggestions) {
  const accepted = (suggestions || []).filter(function (s) {
    return s.include !== false;
  });
  const out = Object.assign({}, hcPatch || {});
  accepted.forEach(function (s) {
      const parts = String(s.target || '').split('.');
      if (parts.length !== 2) return;
      const section = parts[0];
      const field = parts[1];
      if (!out[section] || typeof out[section] !== 'object') {
        out[section] = {};
      }
      const block = /** @type {Record<string, unknown>} */ (Object.assign({}, out[section]));

      if (field === 'conditions') {
        const list = Array.isArray(block.conditions) ? block.conditions.slice() : [];
        const id = String(s.value);
        if (id && list.indexOf(id) < 0) list.push(id);
        block.conditions = list;
      } else if (field === 'medicamentosActuales') {
        const list = Array.isArray(block.medicamentosActuales) ? block.medicamentosActuales.slice() : [];
        const med = /** @type {{ medication?: string }} */ (s.value);
        if (med && med.medication && !list.some(function (row) {
          return String(row.medication || '').toUpperCase() === String(med.medication).toUpperCase();
        })) {
          list.push(s.value);
        }
        block.medicamentosActuales = list;
      } else if (field === 'alergiasNegado') {
        block.alergiasNegado = !!s.value;
        if (block.alergiasNegado) block.alergiaMedicamentos = [];
      } else if (field === 'alergiaMedicamentos') {
        block.alergiasNegado = false;
        const list = Array.isArray(block.alergiaMedicamentos) ? block.alergiaMedicamentos.slice() : [];
        const row = /** @type {{ medication?: string }} */ (s.value);
        if (row && row.medication) list.push(s.value);
        block.alergiaMedicamentos = list;
      } else if (field === 'inmunizaciones') {
        if (!String(block.inmunizaciones || '').trim()) block.inmunizaciones = String(s.value || '').trim();
      } else if (field === 'transfusionesEntries') {
        const list = Array.isArray(block.transfusionesEntries) ? block.transfusionesEntries.slice() : [];
        list.push({
          id: 'drv_tf_' + list.length,
          units: '',
          adverseReactions: String(s.value || '').trim(),
          date: null,
        });
        block.transfusionesEntries = list;
      } else if (field === 'hospitalizaciones') {
        const list = Array.isArray(block.hospitalizaciones) ? block.hospitalizaciones.slice() : [];
        list.push({
          reason: String(s.value || '').trim(),
          duration: '',
          complications: '',
          date: null,
        });
        block.hospitalizaciones = list;
      } else if (field === 'cirugias') {
        const list = Array.isArray(block.cirugias) ? block.cirugias.slice() : [];
        list.push({
          procedure: String(s.value || '').trim(),
          complications: '',
          date: null,
        });
        block.cirugias = list;
      } else if (field === 'traumaticosEntries') {
        const list = Array.isArray(block.traumaticosEntries) ? block.traumaticosEntries.slice() : [];
        list.push({
          id: 'drv_tr_' + list.length,
          description: String(s.value || '').trim(),
          date: null,
        });
        block.traumaticosEntries = list;
      } else if (field === 'tabaquismoDetail') {
        block.tabaquismoDetail = Object.assign({}, block.tabaquismoDetail || {}, s.value || {});
        block.tabaquismo = HC_INTERROGADO_NEGADO;
      } else if (field === 'alcoholismoDetail') {
        block.alcoholismoDetail = Object.assign({}, block.alcoholismoDetail || {}, s.value || {});
        block.alcoholismo = HC_INTERROGADO_NEGADO;
      } else if (field === 'toxicomaniasEntries') {
        const list = Array.isArray(block.toxicomaniasEntries) ? block.toxicomaniasEntries.slice() : [];
        const row = /** @type {{ substanceId?: string }} */ (s.value);
        if (
          row &&
          row.substanceId &&
          !list.some(function (entry) {
            return entry && entry.substanceId === row.substanceId;
          })
        ) {
          list.push(s.value);
        }
        block.toxicomaniasEntries = list;
      } else if (field === 'entries') {
        const list = Array.isArray(block.entries) ? block.entries.slice() : [];
        const row = /** @type {{ id?: string, relativeId?: string, conditionId?: string }} */ (s.value);
        if (
          row &&
          row.relativeId &&
          row.conditionId &&
          !list.some(function (entry) {
            return (
              entry &&
              entry.relativeId === row.relativeId &&
              entry.conditionId === row.conditionId &&
              String(entry.diagnosis || '').toUpperCase() === String(row.diagnosis || '').toUpperCase()
            );
          })
        ) {
          list.push(s.value);
        }
        block.entries = list;
      }

      out[section] = block;
    });

  if (out.app && typeof out.app === 'object') {
    const app = /** @type {Record<string, unknown>} */ (Object.assign({}, out.app));
    if (typeof app.descripcionDetallada === 'string') {
      app.descripcionDetallada = stripIntegratedAppDescription(app.descripcionDetallada, accepted);
    }
    out.app = app;
  }

  if (out.ahf && typeof out.ahf === 'object') {
    const ahf = /** @type {Record<string, unknown>} */ (
      syncAhfConditionsFromEntries(Object.assign({}, out.ahf))
    );
    if (typeof ahf.descripcionDetallada === 'string') {
      ahf.descripcionDetallada = stripIntegratedAhfDescription(ahf.descripcionDetallada, accepted);
    }
    out.ahf = ahf;
  }

  return out;
}

const STRUCTURED_SECTION_KEYS = ['app', 'apnp', 'ahf', 'ecd', 'medicamentos'];

/**
 * @param {Record<string, string>} sections
 * @returns {HcStructuredSuggestion[]}
 */
export function collectStructuredSuggestionsFromDriveSections(sections) {
  /** @type {HcStructuredSuggestion[]} */
  const all = [];
  STRUCTURED_SECTION_KEYS.forEach(function (key) {
    const text = String((sections || {})[key] || '').trim();
    if (!text) return;
    buildHcStructuredSuggestions(key, text, sections).forEach(function (s) {
      all.push(s);
    });
  });
  return all;
}

/**
 * @param {Record<string, unknown>} hcPatch
 * @param {Record<string, string>} sections
 * @returns {Record<string, unknown>}
 */
export function enrichHcPatchWithStructuredSuggestions(hcPatch, sections) {
  const suggestions = collectStructuredSuggestionsFromDriveSections(sections || {});
  if (!suggestions.length) return hcPatch || {};
  return applyStructuredSuggestionsToHcPatch(hcPatch || {}, suggestions);
}
