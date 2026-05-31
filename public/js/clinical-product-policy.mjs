/**
 * Política de producto: qué superficies clínicas de orientación / sugerencias están visibles.
 * Las funciones de Manejo, laboratorio, VPO, etc. permanecen en el código; aquí solo se ocultan.
 */

/** Interruptor maestro: sin guía clínica ni sugerencias de manejo en la UI. */
export function isClinicalDecisionGuidanceHidden() {
  return true;
}

export function isManejoTabGloballyHidden() {
  return isClinicalDecisionGuidanceHidden();
}

export function areElectrolyteReplacementSuggestionsHidden() {
  return isClinicalDecisionGuidanceHidden();
}

export function areLabClinicalSuggestionsHidden() {
  return isClinicalDecisionGuidanceHidden();
}

export function isHistoriaClinicaSafetyHidden() {
  return isClinicalDecisionGuidanceHidden();
}

export function isVpoRiskCalculationDisabled() {
  return isClinicalDecisionGuidanceHidden();
}

export function isVpoPeriopMedGuidanceHidden() {
  return isClinicalDecisionGuidanceHidden();
}

/** Lista de escalas y campos de resultado siguen visibles en modo documentación. */
export function isVpoScalesGuidanceHidden() {
  return false;
}

export function isVpoDxInferenceHidden() {
  return isClinicalDecisionGuidanceHidden();
}

export function isClinicoUnlockDisabled() {
  return isClinicalDecisionGuidanceHidden();
}

/** Sin interpretación ácido-base narrativa; AG y delta-delta siguen en GASES. */
export function isAbgAnalysisHidden() {
  return isClinicalDecisionGuidanceHidden();
}
