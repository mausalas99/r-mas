// Gasometría extendida (interpretación Ácido-Base auxiliar para Tendencias)
import { computeAnionGapValue_ } from './labs.js';

/** @typedef {object} GasoExtendedInput
 * @property {unknown} [pH]
 * @property {unknown} [pCO2]
 * @property {unknown} [pO2]
 * @property {unknown} [hco3]
 * @property {unknown} [na]
 * @property {unknown} [cl]
 * @property {unknown} [alb]
 * @property {unknown} [fio2]
 * @property {unknown} [ageMonths]
 */

/**
 * @param {unknown} v
 * @returns {number|null}
 */
function toFiniteNum_(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v).trim().replace(/\*/g, '').replace(',', '.');
  if (!s || s === '---') return null;
  var n = parseFloat(s);
  return isFinite(n) ? n : null;
}

/**
 * Igual que computeDeltaDeltaValue_ en labs.js (aglutina alto/nulo).
 * @param {number|null} agValue
 * @param {number|null} hco3
 * @returns {number|null}
 */
function deltaDeltaValue_(agValue, hco3) {
  if (agValue == null || hco3 == null) return null;
  var deltaHco3 = 24 - hco3;
  if (deltaHco3 <= 0) return null;
  return (agValue - 12) / deltaHco3;
}

/**
 * @param {GasoExtendedInput} input
 * @returns {{ steps: Record<string, any>, summaryLines: string[] }}
 */
export function evaluateGasoExtended(input) {
  var inp = input || {};
  var pH = toFiniteNum_(inp.pH);
  var pCO2 = toFiniteNum_(inp.pCO2);
  var pO2 = toFiniteNum_(inp.pO2);
  var hco3 = toFiniteNum_(inp.hco3);
  var na = toFiniteNum_(inp.na);
  var cl = toFiniteNum_(inp.cl);
  var alb = toFiniteNum_(inp.alb);
  var ageMonths = toFiniteNum_(inp.ageMonths);
  var fio2 = toFiniteNum_(inp.fio2);
  if (fio2 == null || !isFinite(fio2)) fio2 = 0.21;

  /** @returns {string} */
  function strLab(n) {
    if (n == null || !isFinite(n)) return '---';
    return String(n);
  }

  var agVal =
    computeAnionGapValue_(strLab(na), strLab(cl), strLab(hco3), strLab(alb)) ?? null;

  /** @type {{ label: string, interpretation: string }} */
  var phStep = { label: 'pH', interpretation: '' };
  if (pH != null) {
    if (pH < 7.35) {
      phStep.interpretation = 'Acidemia (pH < 7.35).';
    } else if (pH > 7.45) {
      phStep.interpretation = 'Alcalemia (pH > 7.45).';
    } else {
      phStep.interpretation =
        'pH dentro del rango fisiológico típico (7.35–7.45) o apenas compensado.';
    }
  } else {
    phStep.interpretation = 'Sin dato de pH para clasificar estado ácido-base.';
  }

  var metaLow = hco3 != null && hco3 < 22;
  var metaHigh = hco3 != null && hco3 > 26;
  var respLow = pCO2 != null && pCO2 < 35;
  var respHigh = pCO2 != null && pCO2 > 45;

  var winterCenter = hco3 != null ? 1.5 * hco3 + 8 : null;
  var mixedFromWinter = false;
  if (
    metaLow &&
    pCO2 != null &&
    winterCenter != null &&
    isFinite(winterCenter) &&
    hco3 != null &&
    hco3 < 22
  ) {
    if (pCO2 > winterCenter + 2) mixedFromWinter = true;
    else if (pCO2 < winterCenter - 2) mixedFromWinter = true;
  }

  /** @type {{ disorder: string, type: string }} */
  var primary = {
    disorder: 'unknown',
    type: 'none'
  };

  if (mixedFromWinter) {
    primary.disorder = 'mixed';
    if (pH != null && pH < 7.35) primary.type = 'acidosis';
    else if (pH != null && pH > 7.45) primary.type = 'alkalosis';
    else primary.type = 'acidosis';
  } else if (pH != null) {
    if (pH < 7.35) {
      if (metaLow) {
        primary.disorder = 'metabolic';
        primary.type = 'acidosis';
      } else if (respHigh) {
        primary.disorder = 'respiratory';
        primary.type = 'acidosis';
      } else {
        primary.disorder = 'mixed';
        primary.type = 'acidosis';
      }
    } else if (pH > 7.45) {
      if (metaHigh) {
        primary.disorder = 'metabolic';
        primary.type = 'alkalosis';
      } else if (respLow) {
        primary.disorder = 'respiratory';
        primary.type = 'alkalosis';
      } else {
        primary.disorder = 'mixed';
        primary.type = 'alkalosis';
      }
    } else {
      primary.disorder = 'compensated';
      if (metaLow && respLow) {
        primary.type = 'acidosis';
      } else if (metaHigh && respHigh) {
        primary.type = 'alkalosis';
      } else primary.type = 'none';
    }
  }

  /** @type {{ expectedPCO2: number|null, expectedHCO3Acute: number|null, expectedHCO3Chronic: number|null, note: string }} */
  var compensation = {
    expectedPCO2: null,
    expectedHCO3Acute: null,
    expectedHCO3Chronic: null,
    note: ''
  };

  var compParts = [];

  if (hco3 != null && metaLow && winterCenter != null && isFinite(winterCenter)) {
    compensation.expectedPCO2 =
      Math.round((winterCenter + Number.EPSILON) * 10) / 10;
    compParts.push(
      'Acidosis metabólica esperada Winter: PaCO₂ ≈ 1.5 × HCO₃⁻ + 8 (= ' +
        compensation.expectedPCO2 +
        ', margen habitual ±2 mmHg).'
    );
    if (
      metaLow &&
      pCO2 != null &&
      winterCenter != null &&
      (pCO2 > winterCenter + 2 || pCO2 < winterCenter - 2)
    ) {
      compParts.push(
        'La PaCO₂ medida discrepa del rango esperado para compensación de una acidosis metabólica única.'
      );
    }
  }

  if (pCO2 != null) {
    var deltaPCO2 = pCO2 - 40;
    compensation.expectedHCO3Acute = Math.round((24 + 0.1 * deltaPCO2 + Number.EPSILON) * 10) / 10;
    compensation.expectedHCO3Chronic =
      Math.round((24 + 0.4 * deltaPCO2 + Number.EPSILON) * 10) / 10;
    compParts.push(
      'Trastorno primario respiratorio (referencia ΔPaCO₂ frente a 40 mmHg): HCO₃⁻ esperada aguda ≈ 24 + 0.1×Δ (= ' +
        compensation.expectedHCO3Acute +
        '), crónica ≈ 24 + 0.4×Δ (= ' +
        compensation.expectedHCO3Chronic +
        ').'
    );
    if (hco3 != null) {
      if (Math.abs(hco3 - compensation.expectedHCO3Acute) < 2) {
        compParts.push('El HCO₃⁻ coincide mejor con patrón agudo (~0.1/ΔPaCO₂).');
      } else if (Math.abs(hco3 - compensation.expectedHCO3Chronic) < 2) {
        compParts.push(
          'El HCO₃⁻ coincide mejor con patrón crónico/compensatorio (~0.4/ΔPaCO₂).'
        );
      }
    }
  }

  compensation.note = compParts.length ? compParts.join(' ') : 'Sin suficientes datos para estimar compensación.';

  /** @type {{ value: number|null, interpretation: string }} */
  var anionGap = { value: agVal != null ? Math.round((agVal + Number.EPSILON) * 10) / 10 : null, interpretation: '' };

  if (agVal != null && isFinite(agVal)) {
    if (agVal < 8) anionGap.interpretation = 'Anión gap por debajo del rango usual (referencia habitual 8–12 mEq/L).';
    else if (agVal > 12) {
      anionGap.interpretation =
        'Anión gap elevado (>12): favorézcase gap en acidosis metabólica (lista amplia diferencial).';
    } else {
      anionGap.interpretation = 'Anión gap dentro del rango usual (aproximadamente 8–12).';
    }
  } else {
    anionGap.interpretation = 'No se puede calcular (falta Na, Cl u HCO₃⁻).';
  }

  var ddValue = deltaDeltaValue_(agVal, hco3);
  /** @type {{ value: number|null, interpretation: string }} */
  var deltaDelta = {
    value: ddValue != null ? Math.round((ddValue + Number.EPSILON) * 10) / 10 : null,
    interpretation: ''
  };

  if (agVal != null && agVal > 12 && ddValue != null) {
    if (ddValue < 0.8) {
      deltaDelta.interpretation =
        'Delta-delta bajo: componente hiperclorémico destacado coexistiendo con AG elevado (coexistencia plausible).';
    } else if (ddValue > 2) {
      deltaDelta.interpretation =
        'Delta-delta alto: bicarbonato menor al esperado sólo por gap (alcalosis metabólica coexistiente o otros factores).';
    } else {
      deltaDelta.interpretation = 'Delta-delta cercano al patrón de acidosis típico de gap elevado.';
    }
  } else if (agVal != null && agVal <= 12) {
    deltaDelta.interpretation = 'Sin relevancia de delta-delta habitual si el AG no está elevado.';
  } else {
    deltaDelta.interpretation = 'No disponible.';
  }

  /** @type {{ pfRatio: number|null, aaGradient: number|null, note: string }} */
  var oxygenation = { pfRatio: null, aaGradient: null, note: '' };

  /** @type {string[]} */
  var oxBits = [];

  if (pO2 != null && isFinite(pO2) && fio2 > 0) {
    oxygenation.pfRatio = Math.round((pO2 / fio2 + Number.EPSILON) * 10) / 10;
    if (oxygenation.pfRatio >= 400) {
      oxBits.push('P/F alta (usualmente mejor perfusión/tejido si FiO₂ es confiable).');
    } else if (oxygenation.pfRatio < 400 && oxygenation.pfRatio >= 300) {
      oxBits.push('P/F discretamente alterada.');
    } else if (oxygenation.pfRatio < 300 && oxygenation.pfRatio >= 200) {
      oxBits.push('P/F compatible con déficit leve/moderado de oxigenación.');
    } else if (oxygenation.pfRatio > 0) {
      oxBits.push('P/F bajo: hipoxemia significativa con la FiO₂ indicada.');
    }
    oxBits.push('P/F ≈ ' + oxygenation.pfRatio + ' (PaO₂ / FiO₂).');
  }

  if (pO2 != null && pCO2 != null && fio2 > 0 && isFinite(fio2)) {
    var RQ = 0.8;
    var PAO2approx = fio2 * (760 - 47) - pCO2 / RQ;
    oxygenation.aaGradient =
      Math.round((PAO2approx - pO2 + Number.EPSILON) * 10) / 10;

    oxBits.push(
      'Gradiente A–a simplificado (~nivel del mar; PAO₂ ≈ FiO₂×713 − PaCO₂/0.8): ≈ ' +
        oxygenation.aaGradient +
        ' mmHg.'
    );
    var ageYears = ageMonths != null ? ageMonths / 12 : null;
    if (ageYears != null && ageYears >= 18) {
      var expAa = Math.round((ageYears / 4 + 4 + Number.EPSILON) * 10) / 10;
      oxBits.push(
        'Regla práctica esperada en adultos (orientativa ~edad años/4+4): ≈ ' + expAa + ' mmHg.'
      );
    }
  }

  oxygenation.note = oxBits.join(' ');

  /** @type {string[]} */
  var summaryLines = [];
  if (phStep.interpretation)
    summaryLines.push(phStep.label + ': ' + phStep.interpretation);
  summaryLines.push(
    'Primario predominante inferido — ' +
      primary.disorder +
      (primary.type !== 'none' ? ' (' + primary.type + ')' : '')
  );
  if (compensation.note) summaryLines.push('Compensación: ' + compensation.note);
  if (anionGap.value != null) {
    summaryLines.push('Anión gap: ' + String(anionGap.value) + '. ' + anionGap.interpretation);
  }
  if (deltaDelta.value != null) summaryLines.push('Delta-delta: ' + deltaDelta.interpretation);
  if (
    oxygenation.pfRatio != null ||
      oxygenation.aaGradient != null ||
      oxygenation.note
  ) {
    summaryLines.push('Oxigenación: ' + oxygenation.note);
  }

  return {
    steps: {
      ph: phStep,
      primary: primary,
      compensation: compensation,
      anionGap: anionGap,
      deltaDelta: deltaDelta,
      oxygenation: oxygenation
    },
    summaryLines: summaryLines
  };
}
