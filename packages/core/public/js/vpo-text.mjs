/** Bloques de texto copiables para nota externa VPO. */

export const VPO_OFFICIAL_CALCULATOR_DISCLAIMER =
  'Fórmulas publicadas. Revisa los datos antes de copiar.';

/** Escalas a documentar manualmente (sin cálculo en R+). */
export const VPO_SUGGESTED_SCALES = [
  { key: 'mets', label: 'Capacidad funcional', hint: 'Capacidad funcional basal en METs.' },
  { key: 'abvd', label: 'Estado funcional ABVD', hint: 'Independiente o dependiente.' },
  { key: 'cfs', label: 'Fragilidad', hint: 'Escala clínica de fragilidad (CFS).' },
  { key: 'ahaSurg', label: 'Riesgo quirúrgico AHA/ACC 2026', hint: 'Riesgo intrínseco de la cirugía.' },
  { key: 'ahaCv', label: 'Riesgo CV perioperatorio AHA/ACC 2026', hint: 'Bajo si MACE <1%.' },
  { key: 'ahaMod', label: 'Modificadores de riesgo', hint: 'Condiciones que piden decisión en equipo.' },
  { key: 'rcri', label: 'RCRI (índice de Lee)', hint: 'Puntos, clase y riesgo.' },
  { key: 'gupta', label: 'Gupta MICA', hint: '% riesgo de IAM o paro cardiaco perioperatorio.' },
  { key: 'aub', label: 'AUB-HAS2', hint: 'Puntos y riesgo de muerte, IAM o EVC.' },
  { key: 'asa', label: 'ASA', hint: 'Clasificación del estado físico (I–V).' },
  { key: 'ariscat', label: 'ARISCAT', hint: 'Puntos y categoría de riesgo pulmonar postoperatorio.' },
  { key: 'guptaResp', label: 'Gupta insuficiencia respiratoria', hint: '% de VM >48 h o reintubación no planeada.' },
  { key: 'guptaPneu', label: 'Gupta neumonía', hint: '% de neumonía postoperatoria.' },
  { key: 'caprini', label: 'Caprini', hint: 'Puntos y categoría de riesgo tromboembólico.' },
  { key: 'stopbang', label: 'STOP-Bang', hint: 'Riesgo de apnea obstructiva del sueño.', optional: true },
  { key: 'hasbled', label: 'HAS-BLED', hint: 'Riesgo de sangrado con anticoagulación.', optional: true },
  { key: 'chads', label: 'CHA₂DS₂-VASc', hint: 'Riesgo de EVC en fibrilación auricular.', optional: true },
  { key: 'childpugh', label: 'Child-Pugh', hint: 'Puntos y clase de cirrosis.', optional: true },
  { key: 'meld', label: 'MELD', hint: 'MELD 3.0, MELD-Na y supervivencia a 90 días.', optional: true },
  { key: 'escSurg', label: 'Riesgo quirúrgico ESC 2022', hint: 'Riesgo de la cirugía por procedimiento (ESC 2022).', optional: true },
  { key: 'nrs', label: 'NRS-2002', hint: 'Riesgo nutricional.', optional: true },
  { key: 'awol', label: 'AWOL', hint: 'Tamizaje de delirio, derivado en pacientes médicos.', optional: true },
  { key: 'bridging', label: 'Puente de anticoagulación', hint: 'Riesgo trombótico y suspensión del anticoagulante.', optional: true },
  { key: 'padua', label: 'Padua', hint: 'Riesgo de TEV en paciente médico.', optional: true },
];

/**
 * @param {object} state
 * @returns {string[]}
 */
export function formatVpoScaleResultLines(state) {
  var sr = (state && state.scaleResults) || {};
  return VPO_SUGGESTED_SCALES.filter(function (s) {
    return !s.optional || String(sr[s.key] || '').trim();
  }).map(function (s) {
    var val = String(sr[s.key] || '').trim();
    if (!val) return s.label + ': —';
    return s.label + ': ' + val;
  });
}

/**
 * Líneas de valoración sin puntajes calculados en R+.
 * @param {object} state
 */
export function formatVpoDocumentationLines(state) {
  return formatVpoScaleResultLines(state);
}

export function renderEkgWithFc(ekgText, fcLpm) {
  var t = String(ekgText || '');
  var fc = String(fcLpm || '').trim();
  if (!fc) return t;
  return t.replace(/FC\s*___\s*LPM/gi, 'FC ' + fc + ' LPM');
}

/**
 * Líneas de valoración documentada (escalas ingresadas manualmente).
 * @param {object} state
 */
export function formatRiskLines(_scores, state) {
  return formatVpoDocumentationLines(state);
}

/** @param {object} parts */
export function buildVpoFullCopyText(parts) {
  var blocks = [];
  if (parts.ekgBlock) {
    blocks.push('ELECTROCARDIOGRAMA:');
    blocks.push('');
    blocks.push(parts.ekgBlock);
    blocks.push('');
  }
  if (parts.rxBlock) {
    blocks.push('RADIOGRAFÍA DE TÓRAX:');
    blocks.push('');
    blocks.push(parts.rxBlock);
    blocks.push('');
  }
  if (parts.diagnosticosBlock) {
    blocks.push('DIAGNÓSTICOS:');
    blocks.push('');
    blocks.push(parts.diagnosticosBlock);
    blocks.push('');
  }
  if (parts.valoracionBlock) {
    blocks.push('VALORACIÓN PREOPERATORIA:');
    blocks.push('');
    blocks.push(parts.valoracionBlock);
  }
  return blocks.join('\n').trim();
}

/** @param {Array<{ nombreDisplay: string, notaEditable: string }>} farmacos */
export function buildFarmacosCopyText(farmacos) {
  return (farmacos || [])
    .map(function (f) {
      return '- ' + (f.nombreDisplay || '') + ': ' + (f.notaEditable || f.sugerencia || '');
    })
    .join('\n');
}
