/** Bloques de texto copiables para nota externa VPO. */

export function renderEkgWithFc(ekgText, fcLpm) {
  var t = String(ekgText || '');
  var fc = String(fcLpm || '').trim();
  if (!fc) return t;
  return t.replace(/FC\s*___\s*LPM/gi, 'FC ' + fc + ' LPM');
}

/**
 * @param {object} scores — salida de computeVpoScores
 * @param {object} state
 */
export function formatRiskLines(scores, state) {
  var lines = [];
  var ahaC = state.ahaClinico || '';
  var ahaQ = state.ahaQuirurgico || (scores.procedure && scores.procedure.ahaQuirurgico) || '';
  if (ahaC) lines.push('AHA CLÍNICO: RIESGO ' + String(ahaC).toUpperCase());
  if (ahaQ) lines.push('AHA QUIRÚRGICO: RIESGO ' + String(ahaQ).toUpperCase());
  if (scores.rcri) {
    lines.push(
      'LEE: ' + scores.rcri.points + ' PUNTOS, CLASE ' + (scores.rcri.pctClass || scores.rcri.riskLabel)
    );
  }
  if (scores.caprini) {
    lines.push(
      'CAPRINI: ' +
        scores.caprini.points +
        ' PUNTOS, RIESGO ' +
        String(scores.caprini.riskLabel || '').toUpperCase()
    );
  }
  if (scores.gupta) {
    var pct = (scores.gupta.micaPercent * 100).toFixed(1);
    lines.push(
      'GUPTA: ' +
        pct +
        '% RIESGO DE INFARTO AGUDO A MIOCARDIO INTRAOPERATORIO O <30 DÍAS POST OPERACIÓN'
    );
  }
  if (scores.ariscat) {
    lines.push(
      'ARISCAT: ' +
        scores.ariscat.points +
        ' PUNTOS, RIESGO ' +
        String(scores.ariscat.riskLabel || '').toUpperCase() +
        ', ' +
        (scores.ariscat.detailPct || '') +
        ' RIESGO.'
    );
  }
  return lines;
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
